// Os logins, no painel do dono (02/10/2026).
//
// Pedido dele depois de criar a própria conta com o e-mail digitado
// errado: "eu deveria ter esse poder". Achar um login pelo e-mail, ver o
// que ele é (dona de conta, equipe, família no portal, cadastro de festa
// pendente) e corrigir sem depender de ninguém: trocar o e-mail, mandar o
// link de nova senha, reenviar a confirmação (ou confirmar sem o link),
// encerrar as sessões abertas, apagar um cadastro de festa pendente.
//
// Toda função passa por exigirSuperAdmin e grava na auditoria (que não
// se altera nem se apaga). Travas que não dependem de tela:
//   · o login do dono do sistema (SUPER_ADMIN_EMAILS) não muda por aqui;
//   · nenhum login ganha um e-mail de dono do sistema (seria entregar o
//     painel) nem um @eorganizei.com.br (é a marca das contas da casa);
//   · o e-mail novo é digitado duas vezes: um erro de digitação aqui
//     entregaria a conta a quem tem aquele endereço.

import "server-only";
import type { User } from "@supabase/supabase-js";
import { appUrl, portalBase } from "@/lib/app-url";
import { enviarConfirmacaoDaConta } from "@/lib/email-conta-da-familia";
import { enviarLinkDeConfirmacao, enviarLinkDeNovaSenha } from "@/lib/email-acesso";
import { exigirSuperAdmin, registrarAcaoAdmin, servico, type Servico } from "@/lib/supabase/admin-painel";

export type LoginDoPainel = {
  id: string;
  email: string;
  confirmado: boolean;
  criadoEm: string;
  ultimoAcesso: string | null;
  provedores: string[];
  /** a marca de portal (família, noiva, convidado da cerimonialista) */
  portal: boolean;
  banido: boolean;
  /** o cadastro de festa esperando o link do e-mail (187, desde 01/10) */
  festaPendente: { festa: string; data: string; tipo: string } | null;
  /** e-mail já confirmado (pelo painel), a festa nasce no primeiro login */
  festaNoPrimeiroLogin: { festa: string; data: string } | null;
  /** a conta de que é dono (cerimonial ou família) */
  dono: { empresaId: string; nome: string; tipo: string } | null;
  equipe: { empresaId: string; empresa: string; cargo: string; status: string }[];
  acessos: { eventId: string; evento: string; papel: string; status: string }[];
};

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_RESULTADOS = 20;
const PAGINAS_NO_MAXIMO = 20;

function emailsDoDono(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Todos os logins (o Supabase não busca por pedaço de e-mail). */
async function todosOsLogins(db: Servico): Promise<User[]> {
  const todos: User[] = [];
  for (let pagina = 1; pagina <= PAGINAS_NO_MAXIMO; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw new Error("Não foi possível ler os logins agora.");
    const lista = data?.users ?? [];
    todos.push(...lista);
    if (lista.length < 1000) break;
  }
  return todos;
}

async function loginPorId(db: Servico, id: string): Promise<User> {
  const { data, error } = await db.auth.admin.getUserById(id);
  if (error || !data?.user) throw new Error("Login não encontrado.");
  return data.user;
}

function festaPendenteDe(u: User): LoginDoPainel["festaPendente"] {
  if (u.email_confirmed_at) return null;
  const p = (u.app_metadata as { familia_pendente?: { festa?: string; data?: string; tipo?: string } } | undefined)
    ?.familia_pendente;
  return p && typeof p === "object" ? { festa: String(p.festa ?? ""), data: String(p.data ?? ""), tipo: String(p.tipo ?? "") } : null;
}

function motivoValido(motivo: string): string {
  const porque = (motivo ?? "").trim();
  if (porque.length < 3) throw new Error("Escreva o motivo.");
  if (porque.length > 500) throw new Error("O motivo passa de 500 caracteres.");
  return porque;
}

/** A conta de que o login é dono — a auditoria grava a ação nela. */
async function empresaDoDono(db: Servico, userId: string): Promise<string | null> {
  const { data } = await db.from("empresas").select("id").eq("owner_user_id", userId).limit(1).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Para onde vai o link de um login: o portal (no endereço do tipo da
 * festa, quando se sabe) ou o sistema. O tipo vem da festa pendente ou do
 * primeiro evento de que ele participa pelo portal.
 */
async function casaDoLogin(db: Servico, u: User): Promise<{ portal: boolean; base: string }> {
  const portal = u.app_metadata?.portal === true;
  if (!portal) return { portal, base: appUrl() };
  let tipo: string | null = festaPendenteDe(u)?.tipo ?? null;
  if (!tipo) {
    const { data: a } = await db.from("evento_acesso").select("event_id").eq("user_id", u.id).limit(1).maybeSingle();
    if (a?.event_id) {
      const { data: e } = await db.from("events").select("type").eq("id", a.event_id as string).maybeSingle();
      tipo = (e?.type as string | undefined) ?? null;
    }
  }
  return { portal, base: portalBase(tipo) };
}

function linkDeConfirmacao(base: string, tokenHash: string, tipo: string, destino: string): string {
  return (
    `${base}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}` +
    `&type=${encodeURIComponent(tipo)}&next=${encodeURIComponent(destino)}`
  );
}

/**
 * Encerra as sessões abertas do login (194). Sem a 194 aplicada, diz isso
 * em vez de fingir que encerrou.
 */
async function encerrarSessoes(db: Servico, userId: string): Promise<number | "sem a 194"> {
  const { data, error } = await db.rpc("encerrar_sessoes_do_login", { p_user: userId });
  if (error) {
    if (/could not find the function|does not exist|schema cache/i.test(error.message ?? "")) return "sem a 194";
    throw new Error("Não foi possível encerrar as sessões agora.");
  }
  return typeof data === "number" ? data : 0;
}

function buscadoParaPainel(
  u: User
): Pick<LoginDoPainel, "id" | "email" | "confirmado" | "criadoEm" | "ultimoAcesso" | "provedores" | "portal" | "banido" | "festaPendente" | "festaNoPrimeiroLogin"> {
  const banidoAte = (u as User & { banned_until?: string | null }).banned_until ?? null;
  const pend = (u.app_metadata as { familia_pendente?: { festa?: string; data?: string } } | undefined)?.familia_pendente;
  return {
    id: u.id,
    email: u.email ?? "",
    confirmado: !!u.email_confirmed_at,
    criadoEm: u.created_at,
    ultimoAcesso: u.last_sign_in_at ?? null,
    provedores: ((u.app_metadata?.providers as string[] | undefined) ?? []).filter(Boolean),
    portal: u.app_metadata?.portal === true,
    banido: !!banidoAte && new Date(banidoAte).getTime() > Date.now(),
    festaPendente: festaPendenteDe(u),
    festaNoPrimeiroLogin:
      u.email_confirmed_at && pend && typeof pend === "object" ? { festa: String(pend.festa ?? ""), data: String(pend.data ?? "") } : null,
  };
}

/** O que cada login é: dona de conta, equipe, acessos ao portal. */
async function comVinculos(db: Servico, achados: User[]): Promise<LoginDoPainel[]> {
  if (achados.length === 0) return [];
  const ids = achados.map((u) => u.id);
  const [{ data: empresas }, { data: equipe }, { data: acessos }] = await Promise.all([
    db.from("empresas").select("id, nome, tipo, owner_user_id").in("owner_user_id", ids),
    db.from("membros_equipe").select("user_id, empresa_id, cargo, status").in("user_id", ids),
    db.from("evento_acesso").select("user_id, event_id, papel, status").in("user_id", ids),
  ]);
  const idsEmpresa = Array.from(new Set((equipe ?? []).map((m) => m.empresa_id as string)));
  const idsEvento = Array.from(new Set((acessos ?? []).map((a) => a.event_id as string)));
  const [{ data: nomesEmpresa }, { data: eventos }] = await Promise.all([
    idsEmpresa.length ? db.from("empresas").select("id, nome").in("id", idsEmpresa) : Promise.resolve({ data: [] }),
    idsEvento.length ? db.from("events").select("id, name, type, date").in("id", idsEvento) : Promise.resolve({ data: [] }),
  ]);
  const nomeDaEmpresa = new Map((nomesEmpresa ?? []).map((e) => [e.id as string, (e.nome as string) ?? ""]));
  const nomeDoEvento = new Map(
    (eventos ?? []).map((e) => [e.id as string, `${(e.name as string) || (e.type as string)} · ${(e.date as string) ?? ""}`])
  );
  return achados.map((u) => {
    const dono = (empresas ?? []).find((e) => e.owner_user_id === u.id);
    return {
      ...buscadoParaPainel(u),
      dono: dono ? { empresaId: dono.id as string, nome: (dono.nome as string) ?? "", tipo: (dono.tipo as string) ?? "" } : null,
      equipe: (equipe ?? [])
        .filter((m) => m.user_id === u.id)
        .map((m) => ({
          empresaId: m.empresa_id as string,
          empresa: nomeDaEmpresa.get(m.empresa_id as string) ?? "",
          cargo: (m.cargo as string) ?? "",
          status: (m.status as string) ?? "",
        })),
      acessos: (acessos ?? [])
        .filter((a) => a.user_id === u.id)
        .map((a) => ({
          eventId: a.event_id as string,
          evento: nomeDoEvento.get(a.event_id as string) ?? "",
          papel: (a.papel as string) ?? "",
          status: (a.status as string) ?? "",
        })),
    };
  });
}

/**
 * Busca por pedaço do e-mail (3 letras ou mais). Abrir a lista mostra
 * e-mails de gente: fica registrado, uma linha por termo a cada 30 min (a
 * mesma busca recarrega a cada ação).
 */
export async function buscarLoginsDb(termo: string): Promise<LoginDoPainel[]> {
  const quem = await exigirSuperAdmin();
  const busca = (termo ?? "").trim().toLowerCase();
  if (busca.length < 3) return [];
  const db = servico();
  const achados = (await todosOsLogins(db))
    .filter((u) => (u.email ?? "").toLowerCase().includes(busca))
    .slice(0, MAX_RESULTADOS);
  const meiaHora = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recente } = await db
    .from("admin_registro")
    .select("id")
    .eq("acao", "logins_buscados")
    .eq("quem", quem)
    .eq("depois->>busca", busca)
    .gte("em", meiaHora)
    .limit(1);
  if (!recente || recente.length === 0) {
    await registrarAcaoAdmin(db, quem, { acao: "logins_buscados", depois: { busca, achados: achados.length } });
  }
  return comVinculos(db, achados);
}

/** Um login pelo id (o caminho do aviso de conflito, sem e-mail na URL). */
export async function buscarLoginPorIdDb(id: string): Promise<LoginDoPainel[]> {
  const quem = await exigirSuperAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id ?? "")) return [];
  const db = servico();
  const { data } = await db.auth.admin.getUserById(id);
  if (!data?.user) return [];
  await registrarAcaoAdmin(db, quem, { acao: "logins_buscados", depois: { login: id, achados: 1 } });
  return comVinculos(db, [data.user]);
}

/**
 * Troca o e-mail do login (já confirmado: quem pede é o dono do sistema),
 * atualiza as cópias que o sistema guarda dele e encerra as sessões
 * abertas — se alguém entrou pelo endereço errado, sai.
 *
 * As cópias: a equipe e o acesso do portal (pelo login); a ficha de
 * cliente que É esta pessoa (a da própria família e a que o acesso do
 * portal aponta), só onde o e-mail ainda é o antigo; e a candidatura de
 * Parceira com o e-mail antigo (o vínculo dela com a conta é pelo e-mail).
 */
export async function trocarEmailDoLoginDb(
  userId: string,
  novoEmail: string,
  confirmacao: string,
  motivo: string
): Promise<{ conflito?: { id: string; email: string }; novo?: string; aviso?: string; refeitas?: boolean }> {
  const quem = await exigirSuperAdmin();
  const porque = motivoValido(motivo);
  const novo = (novoEmail ?? "").trim().toLowerCase();
  if (!EMAIL_OK.test(novo) || novo.length > 254) throw new Error("Confira o e-mail novo.");
  if (novo !== (confirmacao ?? "").trim().toLowerCase()) throw new Error("Os dois e-mails não são iguais.");
  if (novo.endsWith("@eorganizei.com.br")) throw new Error("E-mails @eorganizei.com.br são das contas da casa: não use aqui.");

  const db = servico();
  const u = await loginPorId(db, userId);
  const atual = (u.email ?? "").toLowerCase();
  const donos = emailsDoDono();
  if (donos.includes(atual)) throw new Error("O login do dono do sistema não muda por aqui.");
  if (donos.includes(novo)) throw new Error("Esse e-mail é do dono do sistema: nenhum outro login pode usá-lo.");

  // o mesmo e-mail de novo: refaz as cópias da última troca deste login (se
  // alguma falhou), a partir do e-mail anterior que a auditoria guardou
  if (atual === novo) {
    const { data: ultima } = await db
      .from("admin_registro")
      .select("antes")
      .eq("acao", "login_email_trocado")
      .eq("depois->>login", userId)
      .eq("depois->>email", novo)
      .order("em", { ascending: false })
      .limit(1)
      .maybeSingle();
    const anterior = ((ultima?.antes as { email?: string } | null)?.email ?? "").toLowerCase();
    if (!anterior || anterior === novo) throw new Error("Esse já é o e-mail deste login.");
    const { copias, falhas } = await atualizarCopias(db, userId, anterior, novo);
    await registrarAcaoAdmin(db, quem, {
      acao: "login_copias_refeitas",
      empresaId: await empresaDoDono(db, userId),
      antes: { email: anterior },
      depois: { email: novo, login: userId, copias },
      motivo: porque,
    });
    return { novo, refeitas: true, aviso: falhas.length ? `Ainda não deu para atualizar: ${falhas.join(", ")}.` : undefined };
  }

  const outro = (await todosOsLogins(db)).find((x) => (x.email ?? "").toLowerCase() === novo && x.id !== userId);
  if (outro) return { conflito: { id: outro.id, email: outro.email ?? novo } };

  const { error } = await db.auth.admin.updateUserById(userId, { email: novo, email_confirm: true });
  if (error) {
    if (error.code === "email_exists") throw new Error("Esse e-mail acabou de ser usado por outro login.");
    throw new Error("O Supabase não aceitou a troca agora. Nada mudou.");
  }

  // as cópias: o que falhar aqui não desfaz o login (ele já mudou); fica
  // dito na tela e na auditoria, e trocar de novo para o mesmo e-mail refaz
  const { copias, falhas } = await atualizarCopias(db, userId, atual, novo);

  // quem entrou pelo endereço errado sai (a pessoa certa entra de novo)
  let sessoes: number | string;
  try {
    sessoes = await encerrarSessoes(db, userId);
  } catch {
    sessoes = "erro";
    falhas.push("sessões");
  }
  copias.sessoes_encerradas = sessoes;

  await registrarAcaoAdmin(db, quem, {
    acao: "login_email_trocado",
    empresaId: await empresaDoDono(db, userId),
    antes: { email: atual },
    depois: { email: novo, login: userId, copias },
    motivo: porque,
  });
  const aviso = [
    falhas.length ? `Não deu para atualizar: ${falhas.join(", ")} (troque de novo para o mesmo e-mail para refazer).` : "",
    sessoes === "sem a 194" ? "As sessões abertas continuam: aplique a migração 194." : "",
  ]
    .filter(Boolean)
    .join(" ");
  return { novo, aviso: aviso || undefined };
}

/**
 * As cópias do e-mail do login que o sistema guarda: a equipe e o acesso
 * do portal (pelo login); a ficha de cliente que É esta pessoa (a da
 * própria família e a que o acesso do portal aponta), só onde o e-mail
 * ainda é o antigo; a candidatura de Parceira com o e-mail antigo.
 * Idempotente: rodar de novo não estraga nada.
 */
async function atualizarCopias(
  db: Servico,
  userId: string,
  antigo: string,
  novo: string
): Promise<{ copias: Record<string, number | string>; falhas: string[] }> {
  const copias: Record<string, number | string> = {};
  const falhas: string[] = [];
  const contar = (rotulo: string, r: { data: unknown[] | null; error: { code?: string } | null }) => {
    if (r.error) {
      copias[rotulo] = `erro ${r.error.code ?? ""}`.trim();
      falhas.push(rotulo);
    } else copias[rotulo] = (r.data ?? []).length;
  };
  contar("equipe", await db.from("membros_equipe").update({ email: novo }).eq("user_id", userId).select("user_id"));
  const { data: acessos } = await db.from("evento_acesso").select("id, client_id").eq("user_id", userId);
  contar("acesso_portal", await db.from("evento_acesso").update({ email: novo }).eq("user_id", userId).select("id"));
  // a ficha de cliente desta pessoa: comparação exata em minúsculas, aqui
  // (o ilike trataria "_" e "%" do e-mail como curinga)
  const idsFicha = Array.from(new Set((acessos ?? []).map((a) => a.client_id as string | null).filter((x): x is string => !!x)));
  const { data: proprias } = await db.from("clients").select("id, email").eq("cerimonialista_id", userId);
  const { data: ligadas } = idsFicha.length
    ? await db.from("clients").select("id, email").in("id", idsFicha)
    : { data: [] as { id: string; email: string | null }[] };
  const fichas = Array.from(
    new Set([...(proprias ?? []), ...(ligadas ?? [])].filter((c) => (c.email ?? "").toLowerCase() === antigo).map((c) => c.id as string))
  );
  contar(
    "ficha_de_cliente",
    fichas.length ? await db.from("clients").update({ email: novo }).in("id", fichas).select("id") : { data: [], error: null }
  );
  const { data: parceiras } = await db.from("parceiras").select("id, email");
  const idsParceira = (parceiras ?? []).filter((p) => (p.email ?? "").toLowerCase() === antigo).map((p) => p.id as string);
  contar(
    "parceira",
    idsParceira.length ? await db.from("parceiras").update({ email: novo }).in("id", idsParceira).select("id") : { data: [], error: null }
  );
  return { copias, falhas };
}

/**
 * O link para criar uma senha nova: o token pelo Supabase (recovery) e o
 * e-mail por nós, com o link que /auth/confirm lê em qualquer aparelho. Cai
 * na tela de nova senha do portal (família) ou do sistema (equipe).
 */
export async function mandarLinkDeSenhaDb(userId: string, motivo: string): Promise<void> {
  const quem = await exigirSuperAdmin();
  const porque = motivoValido(motivo);
  const db = servico();
  const u = await loginPorId(db, userId);
  if (!u.email) throw new Error("Este login não tem e-mail.");
  const { data: link, error } = await db.auth.admin.generateLink({ type: "recovery", email: u.email });
  const token = link?.properties?.hashed_token;
  if (error || !token) {
    if (error?.status === 429) throw new Error("O Supabase pediu uma pausa: espere um minuto e mande de novo.");
    throw new Error("O Supabase não gerou o link agora. Tente de novo em instantes.");
  }
  const casa = await casaDoLogin(db, u);
  const destino = casa.portal ? "/portal/redefinir" : "/nova-senha";
  const envio = await enviarLinkDeNovaSenha({
    para: u.email,
    link: linkDeConfirmacao(casa.base, token, link.properties.verification_type || "recovery", destino),
  });
  if (!envio.ok) throw new Error("O e-mail não saiu agora. Tente de novo em instantes.");
  await registrarAcaoAdmin(db, quem, {
    acao: "login_link_de_senha",
    empresaId: await empresaDoDono(db, userId),
    depois: { email: u.email, destino: casa.portal ? "portal" : "sistema" },
    motivo: porque,
  });
}

/**
 * Reenvia o link de confirmação (a dona da caixa confirma — é a prova).
 * Num cadastro de festa pendente, o link termina a conta da festa.
 */
export async function reenviarConfirmacaoDb(userId: string, motivo: string): Promise<void> {
  const quem = await exigirSuperAdmin();
  const porque = motivoValido(motivo);
  const db = servico();
  const u = await loginPorId(db, userId);
  if (!u.email) throw new Error("Este login não tem e-mail.");
  if (u.email_confirmed_at) throw new Error("Este e-mail já está confirmado.");
  const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email: u.email });
  const token = link?.properties?.hashed_token;
  if (error || !token) throw new Error("O Supabase não gerou o link agora. Tente de novo em instantes.");
  const casa = await casaDoLogin(db, u);
  const pendente = !!festaPendenteDe(u);
  const destino = pendente ? "/portal/confirmar-conta" : casa.portal ? "/portal" : "/eventos/dashboard";
  const url = linkDeConfirmacao(casa.base, token, link.properties.verification_type || "magiclink", destino);
  const envio = pendente
    ? await enviarConfirmacaoDaConta({ para: u.email, link: url })
    : await enviarLinkDeConfirmacao({ para: u.email, link: url });
  if (!envio.ok) throw new Error("O e-mail não saiu agora. Tente de novo em instantes.");
  await registrarAcaoAdmin(db, quem, {
    acao: "login_confirmacao_reenviada",
    empresaId: await empresaDoDono(db, userId),
    depois: { email: u.email, festa_pendente: pendente },
    motivo: porque,
  });
}

/**
 * Confirma o e-mail SEM o link — só quando a pessoa provou ser a dona do
 * endereço por outro caminho (a tela avisa). Num cadastro de festa
 * pendente, a festa nasce no primeiro login (o /portal termina sozinho).
 */
export async function confirmarEmailDoLoginDb(userId: string, motivo: string): Promise<void> {
  const quem = await exigirSuperAdmin();
  const porque = motivoValido(motivo);
  const db = servico();
  const u = await loginPorId(db, userId);
  if (u.email_confirmed_at) throw new Error("Este e-mail já está confirmado.");
  // a mesma trava da troca: confirmar à mão um e-mail de dono do sistema (ou
  // da casa) entregaria o painel a quem escolheu a senha daquele login
  const email = (u.email ?? "").toLowerCase();
  if (emailsDoDono().includes(email) || email.endsWith("@eorganizei.com.br")) {
    throw new Error("Este e-mail não se confirma por aqui: só pelo link, na caixa do próprio endereço.");
  }
  const { error } = await db.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) throw new Error("O Supabase não aceitou a confirmação agora. Nada mudou.");
  await registrarAcaoAdmin(db, quem, {
    acao: "login_email_confirmado",
    empresaId: await empresaDoDono(db, userId),
    depois: { email: u.email ?? null, festa_pendente: !!festaPendenteDe(u) },
    motivo: porque,
  });
}

/** Encerra as sessões abertas do login em todos os aparelhos (194). */
export async function encerrarSessoesDb(userId: string, motivo: string): Promise<number> {
  const quem = await exigirSuperAdmin();
  const porque = motivoValido(motivo);
  const db = servico();
  const u = await loginPorId(db, userId);
  const n = await encerrarSessoes(db, userId);
  if (n === "sem a 194") throw new Error("Para encerrar as sessões, aplique a migração 194.");
  await registrarAcaoAdmin(db, quem, {
    acao: "login_sessoes_encerradas",
    empresaId: await empresaDoDono(db, userId),
    depois: { email: u.email ?? null, sessoes: n },
    motivo: porque,
  });
  return n;
}

/** Apaga um cadastro de festa que ninguém confirmou (e só ele). */
export async function apagarCadastroPendenteDb(userId: string, motivo: string): Promise<void> {
  const quem = await exigirSuperAdmin();
  const porque = motivoValido(motivo);
  const db = servico();
  const u = await loginPorId(db, userId);
  if (!festaPendenteDe(u)) throw new Error("Só um cadastro de festa ainda não confirmado pode ser apagado por aqui.");
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw new Error("O Supabase não apagou agora. Nada mudou.");
  // na auditoria, só o endereço: os dados da festa sumiram com o cadastro
  await registrarAcaoAdmin(db, quem, {
    acao: "login_pendente_apagado",
    antes: { email: u.email ?? null },
    motivo: porque,
  });
}
