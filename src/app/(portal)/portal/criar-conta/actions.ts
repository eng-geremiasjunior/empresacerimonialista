"use server";

// A conta da família (187): a noiva, ou o pai, a mãe ou o responsável da
// debutante, cria a conta sozinha, sem convite de cerimonialista.
//
// A ORDEM (desde 01/10/2026, pedido do dono: "gente errando e perdendo
// cadastro"):
//  1. o LOGIN, AINDA SEM CONFIRMAR, nasce de uma vez (createUser): a
//     senha, `portal: true` no user_metadata (o gatilho de cadastro, 104,
//     lê dali e NÃO cria empresa) e no app_metadata (a marca de autoridade,
//     só o servidor escreve), e os dados da festa em
//     app_metadata.familia_pendente. Depois disso nada altera o login: a
//     senha nunca é trocada por este formulário;
//  2. o LINK (generateLink) e o E-MAIL, mandado por nós (a voz do
//     eOrganizei). Até alguém abrir o link que chegou NAQUELE endereço, não
//     existe empresa, evento nem sessão: um e-mail digitado errado não
//     deixa uma festa presa numa conta que ninguém recupera;
//  3. a CONTA DA FAMÍLIA nasce quando o link é aberto
//     (/auth/confirm → /portal/confirmar-conta), numa função do banco que
//     só a chave de serviço executa, e a pessoa entra no portal.
//
// E-mail que já tem login: reenviar o link (ou desfazer o cadastro, no
// "Errei o e-mail") só para quem PROVA ser a dona — a senha certa de um
// login ainda não confirmado (o Supabase só responde "e-mail não
// confirmado" depois de a senha conferir). Sem a prova, "já existe uma
// conta": repetir o cadastro com o e-mail de outra pessoa não troca a
// senha dela, não muda a festa pendente e não manda nada.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createServico, type User } from "@supabase/supabase-js";
import { portalBase } from "@/lib/app-url";
import { enviarConfirmacaoDaConta } from "@/lib/email-conta-da-familia";
import { TERMOS_VERSAO } from "@/lib/termos";

export type TipoDaFesta = "casamento" | "debutante";
export type PapelDaFamilia = "noiva" | "noivo" | "mae" | "pai" | "outro";

export type DadosDaFamilia = {
  tipo: TipoDaFesta;
  papel: PapelDaFamilia;
  festa: string;
  data: string;
  cidade: string;
  nome: string;
  email: string;
  senha: string;
  /** a senha digitada de novo */
  confirmacao: string;
  /** no 15 anos: "sou pai, mãe ou responsável legal pela debutante" */
  responsavel: boolean;
  termos: boolean;
  /** campo escondido: gente não preenche, robô preenche */
  site?: string;
};

export type ResultadoDaFamilia =
  | { error: string; jaTemConta?: boolean }
  | { enviado: true; email: string };

/** O que espera a confirmação, no app_metadata (a pessoa não edita). */
export type FamiliaPendente = {
  tipo: TipoDaFesta;
  papel: PapelDaFamilia;
  festa: string;
  data: string;
  cidade: string;
  nome: string;
  termos_versao: string;
  /** o aceite dos termos é do momento do cadastro, não do clique no link */
  ip: string | null;
  user_agent: string | null;
};

function servico() {
  return createServico(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
    }
  );
}

// Amortecedor contra rajada (o mesmo molde do cadastro da cerimonialista):
// memória do processo, some no deploy, e é de propósito. Também segura
// quem usaria o formulário para encher a caixa de alguém de e-mails ou
// para adivinhar a senha de um cadastro pendente.
const JANELA_MS = 10 * 60 * 1000;
const MAX_POR_JANELA = 5;
const ultimas = new Map<string, number[]>();
function demaisTentativas(ip: string): boolean {
  const agora = Date.now();
  const anteriores = (ultimas.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  anteriores.push(agora);
  ultimas.set(ip, anteriores);
  if (ultimas.size > 5000) ultimas.clear();
  return anteriores.length > MAX_POR_JANELA;
}

function ipDoPedido(): string {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "desconhecido";
}

const PAPEIS: Record<TipoDaFesta, PapelDaFamilia[]> = {
  casamento: ["noiva", "noivo"],
  debutante: ["mae", "pai", "outro"],
};

/** Hoje no horário de Brasília, em AAAA-MM-DD (a data do evento é local). */
function hojeBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function conferir(d: DadosDaFamilia): { error: string } | null {
  if (d.tipo !== "casamento" && d.tipo !== "debutante") return { error: "Escolha a festa." };
  if (!PAPEIS[d.tipo].includes(d.papel)) return { error: "Diga quem você é na festa." };
  const festa = d.festa?.trim() ?? "";
  if (festa.length < 2 || festa.length > 80) {
    return { error: d.tipo === "casamento" ? "Escreva os nomes do casal." : "Escreva o nome da debutante." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data ?? "") || d.data < hojeBR()) {
    return { error: "Confira a data da festa." };
  }
  if ((d.cidade?.trim() ?? "").length > 80) return { error: "A cidade passou do tamanho." };
  const nome = d.nome?.trim() ?? "";
  if (nome.length < 2 || nome.length > 80) return { error: "Escreva o seu nome." };
  if (!EMAIL_OK.test(d.email?.trim() ?? "")) return { error: "Confira o e-mail digitado." };
  if ((d.senha ?? "").length < 8) return { error: "A senha precisa de pelo menos 8 caracteres." };
  if (d.senha !== d.confirmacao) return { error: "As duas senhas não são iguais." };
  if (d.tipo === "debutante" && !d.responsavel) {
    return { error: "A conta dos 15 anos é aberta pelo pai, pela mãe ou pelo responsável." };
  }
  if (!d.termos) return { error: "Para criar a conta, aceite os termos." };
  return null;
}

const JA_TEM_CONTA = {
  error: "Já existe uma conta com este e-mail. Entre com a sua senha.",
  jaTemConta: true,
} as const;
const SEM_CONTA_AGORA = { error: "Não foi possível criar a conta agora. Tente de novo em alguns instantes." } as const;
const SEM_EMAIL_AGORA = {
  error: "Não foi possível mandar o e-mail de confirmação agora. Tente de novo em alguns instantes.",
} as const;

/**
 * A prova de dono: a senha certa de um login ainda não confirmado. O
 * Supabase só responde "e-mail não confirmado" depois de a senha conferir
 * (com a senha errada, é "credenciais inválidas"). Login confirmado com a
 * senha certa abre uma sessão aqui no servidor — encerrada na hora.
 */
async function ehPendenteDeQuemDigitou(email: string, senha: string): Promise<boolean> {
  const anon = createServico(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password: senha });
  if (data?.session) {
    await anon.auth.signOut({ scope: "local" });
    return false;
  }
  return error?.code === "email_not_confirmed";
}

/** O cadastro de festa que ainda espera o link (e de mais nada). */
function pendenteDaFesta(u: User | null): FamiliaPendente | null {
  if (!u || u.email_confirmed_at) return null;
  const p = (u.app_metadata as { familia_pendente?: FamiliaPendente } | undefined)?.familia_pendente;
  return p && typeof p === "object" ? p : null;
}

/**
 * O link e o e-mail. O generateLink é a ÚLTIMA coisa que toca o login: o
 * token dele é o que vai no e-mail (mexer no login depois poderia
 * invalidá-lo). A senha passada é a que o login já tem — a da criação ou a
 * que acabou de ser provada —, então nada muda nela.
 */
async function mandarLink(email: string, senha: string): Promise<ResultadoDaFamilia> {
  const { data: link, error } = await servico().auth.admin.generateLink({ type: "signup", email, password: senha });
  const tokenHash = link?.properties?.hashed_token ?? null;
  const pendente = pendenteDaFesta(link?.user ?? null);
  if (error || !tokenHash || !pendente) {
    // só o código: a mensagem do Supabase repete o e-mail digitado
    if (error) console.error("[eorganizei:familia] link de cadastro:", error.code ?? "sem código");
    return error ? SEM_EMAIL_AGORA : JA_TEM_CONTA;
  }
  // o link volta para o endereço do portal da festa (casamento./debut.),
  // onde a sessão vai nascer
  const tipoDoLink = link.properties.verification_type || "signup";
  const confirmar =
    `${portalBase(pendente.tipo)}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}` +
    `&type=${encodeURIComponent(tipoDoLink)}&next=${encodeURIComponent("/portal/confirmar-conta")}`;
  const envio = await enviarConfirmacaoDaConta({ para: email, link: confirmar });
  if (!envio.ok) {
    console.error("[eorganizei:familia] e-mail de confirmação não saiu");
    return SEM_EMAIL_AGORA;
  }
  return { enviado: true, email };
}

export async function criarContaDaFamilia(d: DadosDaFamilia): Promise<ResultadoDaFamilia> {
  const ip = ipDoPedido();

  // robô: responde como se tivesse dado certo e não cria nada
  if (d.site && d.site.trim()) redirect("/portal/entrar");
  if (demaisTentativas(ip)) {
    return { error: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo." };
  }
  const problema = conferir(d);
  if (problema) return problema;

  const email = d.email.trim().toLowerCase();
  const pendente: FamiliaPendente = {
    tipo: d.tipo,
    papel: d.papel,
    festa: d.festa.trim(),
    data: d.data,
    cidade: (d.cidade ?? "").trim(),
    nome: d.nome.trim(),
    termos_versao: TERMOS_VERSAO,
    ip: ip === "desconhecido" ? null : ip.slice(0, 60),
    user_agent: headers().get("user-agent")?.slice(0, 300) ?? null,
  };

  // 1) o login, sem confirmar, com a senha e a festa pendente de uma vez
  const { error: erroCriar } = await servico().auth.admin.createUser({
    email,
    password: d.senha,
    email_confirm: false,
    // `name` e `portal` são as chaves que o gatilho de cadastro lê no insert
    user_metadata: { name: d.nome.trim(), portal: true, familia: true },
    app_metadata: { portal: true, familia: true, familia_pendente: pendente },
  });
  if (erroCriar) {
    const jaExiste =
      erroCriar.code === "email_exists" || /already been registered|already exists/i.test(erroCriar.message ?? "");
    if (erroCriar.code === "weak_password") return { error: "Escolha uma senha mais forte." };
    if (!jaExiste) {
      console.error("[eorganizei:familia] criar login:", erroCriar.code ?? "sem código");
      return SEM_CONTA_AGORA;
    }
    // o e-mail já tem login: é a própria pessoa repetindo o cadastro (ou
    // pedindo "Reenviar")? Só com a senha certa de um login não
    // confirmado. A festa pendente e a senha ficam as da primeira vez.
    if (!(await ehPendenteDeQuemDigitou(email, d.senha))) return JA_TEM_CONTA;
  }

  // 2) o link e o e-mail
  return mandarLink(email, d.senha);
}

/**
 * "Reenviar o link", na porta de entrar: o link venceu ou se perdeu. Só
 * com a senha certa de um cadastro de festa ainda não confirmado; a
 * resposta é a mesma para qualquer outro caso.
 */
export async function reenviarLinkDaConta(emailDigitado: string, senha: string): Promise<{ ok: true } | { error: string }> {
  const NAO_DEU = { error: "Não foi possível reenviar o link. Confira o e-mail e a senha." };
  if (demaisTentativas(ipDoPedido())) {
    return { error: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo." };
  }
  const email = (emailDigitado ?? "").trim().toLowerCase();
  if (!EMAIL_OK.test(email) || !senha) return NAO_DEU;
  if (!(await ehPendenteDeQuemDigitou(email, senha))) return NAO_DEU;
  const r = await mandarLink(email, senha);
  return "enviado" in r ? { ok: true } : NAO_DEU;
}

/**
 * "Errei o e-mail": apaga o cadastro pendente do endereço errado, para o
 * link que já foi para lá não abrir a festa na caixa de outra pessoa. Só
 * com a senha certa e só se o login ainda não foi confirmado. Nunca
 * falha alto: se não der, a rotina diária apaga os pendentes antigos.
 */
export async function desfazerCadastroPendente(emailDigitado: string, senha: string): Promise<{ ok: boolean }> {
  if (demaisTentativas(ipDoPedido())) return { ok: false };
  const email = (emailDigitado ?? "").trim().toLowerCase();
  if (!EMAIL_OK.test(email) || !senha) return { ok: false };
  if (!(await ehPendenteDeQuemDigitou(email, senha))) return { ok: false };
  const db = servico();
  // o generateLink devolve o login (a senha é a provada: nada muda nela)
  const { data: link } = await db.auth.admin.generateLink({ type: "signup", email, password: senha });
  const u = link?.user ?? null;
  if (!pendenteDaFesta(u) || !u) return { ok: false };
  const { error } = await db.auth.admin.deleteUser(u.id);
  if (error) console.error("[eorganizei:familia] desfazer cadastro:", error.code ?? "sem código");
  return { ok: !error };
}
