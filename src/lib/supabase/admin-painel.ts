// Camada de dados do painel do dono — SERVER-SIDE APENAS.
//
// Este módulo é a ÚNICA porta do /admin para o banco, e ela é diferente
// de todas as outras do sistema: usa o service role (atravessa todas as
// empresas, fora do meu_cargo) e por isso TODA função aqui começa
// exigindo o super admin. Não existe caminho de leitura sem o gate.
//
// SUPER_ADMIN_EMAILS: lista de e-mails separada por vírgula, no ambiente
// da Vercel e no .env.local. Sem a variável, o painel nega para todos —
// fechado por padrão, nunca aberto por esquecimento.

import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createClient as createSessao } from "@/lib/supabase/server";
import {
  calcularMetricas,
  eventosEfetivos,
  mesesAte,
  type AssinaturaAdmin,
  type EventoAssinatura,
  type MetricasDoMes,
} from "@/lib/admin-metricas";
import { hojeBR, somarDias } from "@/lib/tempo";
import { AO_VIVO_ATE_MS, haQuantoTempo } from "@/lib/presenca";
import {
  situacaoDoEmail,
  situacaoFinal,
  type ResultadoEnvio,
  type SituacaoDoEmail,
} from "@/lib/email";
import { enviarEmailRespostaSuporte } from "@/lib/email-suporte";

// ------------------------------------------------------------------
// O gate
// ------------------------------------------------------------------

export async function emailDoSuperAdmin(): Promise<string | null> {
  const lista = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (lista.length === 0) return null;

  const supabase = createSessao();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? null;
  return email && lista.includes(email) ? email : null;
}

/**
 * Lança se quem chama não é o dono do sistema. Toda função passa aqui.
 * Devolve o e-mail de quem está no painel: é ele que a auditoria grava.
 */
export async function exigirSuperAdmin(): Promise<string> {
  const email = await emailDoSuperAdmin();
  if (!email) {
    throw new Error("Acesso restrito ao proprietário do sistema.");
  }
  return email;
}

/**
 * A chave de serviço. Exportada só para os outros módulos do painel
 * (admin-contas, admin-sistema, admin-receita), que chamam
 * exigirSuperAdmin antes de usar, como este.
 */
export function servico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente");
  return createSupabase(url, key, {
    auth: { persistSession: false },
    global: {
      // Next cacheia fetch GET em contexto server; painel é sempre vivo.
      fetch: (i: RequestInfo | URL, x?: RequestInit) =>
        fetch(i, { ...x, cache: "no-store" }),
    },
  });
}

/**
 * Lê uma tabela INTEIRA, em lotes de 1000.
 *
 * O PostgREST corta a resposta em 1000 linhas por padrão e não avisa. No
 * dia em que `assinatura_eventos` passar de 1000 (é log append-only: uma
 * linha por transição), a leitura crua voltaria pela metade e o painel
 * mostraria MRR, churn e NRR MENORES do que a verdade, sem erro nenhum na
 * tela — a pior falha possível aqui, porque tem cara de número certo. É o
 * mesmo motivo pelo qual `getContas` já pagina os logins.
 *
 * A ordenação que o chamador passa não é estética: sem ORDER BY o
 * Postgres não garante ordem entre páginas, e a mesma linha pode vir
 * duas vezes ou nenhuma.
 */
export async function lerTudo<T>(
  pagina: (
    de: number,
    ate: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  oQue: string
): Promise<T[]> {
  const LOTE = 1000;
  const tudo: T[] = [];
  for (let i = 0; i < 200; i++) {
    const de = i * LOTE;
    const { data, error } = await pagina(de, de + LOTE - 1);
    if (error) throw new Error(`Não foi possível ler ${oQue}: ${error.message}`);
    const lote = data ?? [];
    tudo.push(...lote);
    if (lote.length < LOTE) break;
  }
  return tudo;
}

// ------------------------------------------------------------------
// Contas da casa (123, seção 4)
// ------------------------------------------------------------------
// As contas do próprio dono (administrador, testes, vídeo) ficam fora de
// todos os números do painel e num grupo à parte em Contas.

export type Servico = ReturnType<typeof servico>;

export function tabelaAusente(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /could not find the table|does not exist/i.test(error.message ?? "")
  );
}

/**
 * As empresas marcadas como da casa. Sem a tabela (123 ainda não
 * reaplicada), nenhuma: o painel segue como antes, sem cair.
 */
export async function idsDaCasa(db: Servico): Promise<Set<string>> {
  const { data, error } = await db.from("contas_da_casa").select("empresa_id");
  if (error) {
    if (!tabelaAusente(error)) {
      console.error("[eorganizei:admin] contas da casa:", error.code, (error.message ?? "").slice(0, 120));
    }
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.empresa_id as string));
}

// ------------------------------------------------------------------
// Auditoria do painel (123, seção 7)
// ------------------------------------------------------------------
// Toda ação do dono no painel vira uma linha que não se altera nem se
// apaga: quem, quando, o quê, em que conta, antes, depois e por quê.
// Registrar nunca impede a ação (a ação já aconteceu quando chega aqui).

export type AcaoDoPainel =
  | "assinatura_alterada"
  | "teste_prorrogado"
  | "conta_suspensa"
  | "conta_reativada"
  | "conta_da_casa"
  | "conta_de_cliente"
  | "portao_do_teste"
  | "gasto_marketing"
  | "suporte_respondido"
  | "suporte_avisado_por_email"
  | "nota_da_conta"
  | "ficha_aberta"
  | "custo_lancado"
  | "custo_apagado"
  | "custos_copiados"
  | "caixa_informado"
  | "ajuste_alterado"
  | "email_enviado";

export async function registrarAcaoAdmin(
  db: Servico,
  quem: string,
  linha: {
    acao: AcaoDoPainel;
    empresaId?: string | null;
    antes?: unknown;
    depois?: unknown;
    motivo?: string | null;
  }
): Promise<void> {
  try {
    let empresaNome: string | null = null;
    if (linha.empresaId) {
      const { data } = await db.from("empresas").select("nome").eq("id", linha.empresaId).maybeSingle();
      empresaNome = (data?.nome as string | undefined) ?? null;
    }
    const { error } = await db.from("admin_registro").insert({
      quem,
      acao: linha.acao,
      empresa_id: linha.empresaId ?? null,
      empresa_nome: empresaNome,
      antes: linha.antes ?? null,
      depois: linha.depois ?? null,
      motivo: linha.motivo ? linha.motivo.slice(0, 500) : null,
    });
    if (error && !tabelaAusente(error)) {
      console.error("[eorganizei:admin] auditoria:", error.code);
    }
  } catch {
    console.error("[eorganizei:admin] auditoria: sem resposta do banco");
  }
}

/**
 * Abrir a ficha de uma conta mostra e-mail e WhatsApp da dona: fica
 * registrado, uma linha por conta por dia (não uma por clique).
 */
export async function registrarFichaAberta(empresaId: string): Promise<void> {
  const quem = await exigirSuperAdmin();
  const db = servico();
  const inicioDoDia = new Date(`${hojeBR()}T00:00:00-03:00`).toISOString();
  const { data, error } = await db
    .from("admin_registro")
    .select("id")
    .eq("acao", "ficha_aberta")
    .eq("empresa_id", empresaId)
    .eq("quem", quem)
    .gte("em", inicioDoDia)
    .limit(1);
  if (error || (data ?? []).length > 0) return;
  await registrarAcaoAdmin(db, quem, { acao: "ficha_aberta", empresaId });
}

export async function definirContaDaCasaDb(empresaId: string, daCasa: boolean): Promise<void> {
  const quem = await exigirSuperAdmin();
  const db = servico();
  const { error } = daCasa
    ? await db.from("contas_da_casa").upsert({ empresa_id: empresaId }, { onConflict: "empresa_id" })
    : await db.from("contas_da_casa").delete().eq("empresa_id", empresaId);
  if (error) {
    throw new Error(
      tabelaAusente(error)
        ? "Reaplique a migração 123 no Supabase para separar as contas da casa."
        : `Não foi possível salvar: ${error.message}`
    );
  }
  await registrarAcaoAdmin(db, quem, {
    acao: daCasa ? "conta_da_casa" : "conta_de_cliente",
    empresaId,
  });
}

type LinhaEvento = {
  empresa_id: string;
  tipo: EventoAssinatura["tipo"];
  valor_antes: number | string | null;
  valor_depois: number | string | null;
  em: string;
};

// ------------------------------------------------------------------
// Ao vivo e uso do sistema (123, seção 5)
// ------------------------------------------------------------------
// Só o NOME da área e os tempos: o banco nunca recebe o que está na tela
// (lib/presenca.ts). Os textos relativos ("há 12 min") saem prontos daqui,
// com o relógio do servidor: a tabela é client e, calculando lá, o texto
// do servidor e o do navegador divergiriam na hidratação.

export type AgoraDaConta = {
  aoVivo: boolean;
  /** pessoas da conta com sinal recente */
  pessoas: number;
  /** a área de quem deu sinal por último */
  area: string;
  /** ao vivo: há quanto tempo entrou; offline: há quanto tempo foi visto */
  quando: string;
};

export type UsoDaConta = {
  dias7: number;
  minutos7: number;
  dias30: number;
  /** as áreas mais abertas nos últimos 7 dias */
  areas: { area: string; aberturas: number }[];
};

async function lerAgora(db: Servico, agora: number): Promise<Map<string, AgoraDaConta>> {
  type Linha = { user_id: string; empresa_id: string; area: string; desde: string; visto_em: string };
  let linhas: Linha[];
  try {
    linhas = await lerTudo<Linha>(
      (de, ate) =>
        db.from("presenca").select("user_id, empresa_id, area, desde, visto_em").order("user_id").range(de, ate),
      "a presença"
    );
  } catch (e) {
    // sem a 123 reaplicada, ninguém aparece ao vivo, e a tela segue
    const msg = e instanceof Error ? e.message : "";
    if (!/could not find the table|does not exist|schema cache/i.test(msg)) {
      console.error("[eorganizei:admin] presença:", msg.slice(0, 120));
    }
    return new Map();
  }
  const porEmpresa = new Map<string, Linha[]>();
  for (const l of linhas) {
    const lista = porEmpresa.get(l.empresa_id) ?? [];
    lista.push(l);
    porEmpresa.set(l.empresa_id, lista);
  }
  const saida = new Map<string, AgoraDaConta>();
  for (const [empresaId, lista] of porEmpresa) {
    lista.sort((a, b) => b.visto_em.localeCompare(a.visto_em));
    const vivos = lista.filter((l) => agora - new Date(l.visto_em).getTime() <= AO_VIVO_ATE_MS);
    const ultima = vivos[0] ?? lista[0];
    saida.set(empresaId, {
      aoVivo: vivos.length > 0,
      pessoas: vivos.length,
      area: ultima.area,
      quando: haQuantoTempo(vivos.length > 0 ? ultima.desde : ultima.visto_em, agora),
    });
  }
  return saida;
}

/** A presença de todas as contas, para o painel se atualizar sozinho. */
export async function getAgoraDasContas(): Promise<Record<string, AgoraDaConta>> {
  await exigirSuperAdmin();
  return Object.fromEntries(await lerAgora(servico(), Date.now()));
}

async function lerUso(db: Servico): Promise<Map<string, UsoDaConta>> {
  type Linha = { empresa_id: string; dia: string; area: string; aberturas: number; minutos: number };
  const hoje = hojeBR();
  const desde7 = somarDias(hoje, -6);
  let linhas: Linha[];
  try {
    linhas = await lerTudo<Linha>(
      (de, ate) =>
        db
          .from("uso_diario")
          .select("empresa_id, dia, area, aberturas, minutos")
          .gte("dia", somarDias(hoje, -29))
          .order("user_id")
          .order("dia")
          .order("area")
          .range(de, ate),
      "o uso do sistema"
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (!/could not find the table|does not exist|schema cache/i.test(msg)) {
      console.error("[eorganizei:admin] uso:", msg.slice(0, 120));
    }
    return new Map();
  }
  type Soma = { dias7: Set<string>; dias30: Set<string>; minutos7: number; areas: Map<string, number> };
  const somas = new Map<string, Soma>();
  for (const l of linhas) {
    const s = somas.get(l.empresa_id) ?? { dias7: new Set(), dias30: new Set(), minutos7: 0, areas: new Map() };
    s.dias30.add(l.dia);
    if (l.dia >= desde7) {
      s.dias7.add(l.dia);
      s.minutos7 += Number(l.minutos) || 0;
      if (l.aberturas > 0) s.areas.set(l.area, (s.areas.get(l.area) ?? 0) + Number(l.aberturas));
    }
    somas.set(l.empresa_id, s);
  }
  const saida = new Map<string, UsoDaConta>();
  for (const [empresaId, s] of somas) {
    saida.set(empresaId, {
      dias7: s.dias7.size,
      minutos7: s.minutos7,
      dias30: s.dias30.size,
      areas: [...s.areas.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([area, aberturas]) => ({ area, aberturas })),
    });
  }
  return saida;
}

// ------------------------------------------------------------------
// Contas — a tabela de gestão
// ------------------------------------------------------------------

export type ContaAdmin = {
  empresaId: string;
  nome: string;
  criadaEm: string;
  donaEmail: string | null;
  donaUserId: string;
  banidaAte: string | null; // do login da dona
  membros: number;
  eventos: number;
  ultimaAtividade: string | null;
  assinatura: {
    id: string;
    plano: string;
    valorMensal: number;
    status: string;
    inicio: string;
    canceladaEm: string | null;
    observacao: string | null;
    /** fim do teste grátis, quando a conta está nele */
    testeTerminaEm: string | null;
  } | null;
  // QUEM É E O QUE FEZ. Pedido do dono no dia da primeira conta de uma
  // desconhecida: "não sei de onde ela é, sei nada". Tudo abaixo já estava
  // no banco — nenhum campo novo foi pedido a ninguém no cadastro.
  /** de onde o clique veio (origem_do_clique, 152) */
  origem: { canal: string; campanha: string | null; aparelho: string | null } | null;
  /** cidades dos eventos dela — o que responde "de onde ela é" */
  cidades: string[];
  ultimoLogin: string | null;
  whatsapp: string | null;
  /** nomes na lista de convidados (evento_convidado) */
  convidados: number;
  /** soma do "quantos convidados" que ela informou ao criar os eventos */
  convidadosPrevistos: number;
  tarefas: number;
  fornecedores: number;
  /** o guia do primeiro acesso da dona (160) */
  guia: "em andamento" | "pulou" | "concluiu";
  /** o que ela respondeu no cadastro (16/09/2026) — nulo em conta antiga */
  eventos3Meses: string | null;
  instagram: string | null;
  /** conta do próprio dono: fora dos números, num grupo à parte */
  daCasa: boolean;
  /** quem da conta está no sistema agora; null = nenhum sinal ainda */
  agora: AgoraDaConta | null;
  /** uso nos últimos 7 e 30 dias; null = nenhum registro ainda */
  uso: UsoDaConta | null;
};

/** utm_source/utm_medium → como o dono fala. */
function canalDaOrigem(source: string | null, medium: string | null, gclid: string | null): string {
  const s = (source ?? "").toLowerCase();
  const m = (medium ?? "").toLowerCase();
  const pago = /paid|cpc|ads|anuncio/.test(m);
  if (gclid || s === "google") return pago || gclid ? "Anúncio no Google" : "Google";
  if (s === "ig" || s.includes("instagram")) return pago ? "Anúncio no Instagram" : "Instagram";
  if (s === "fb" || s.includes("facebook")) return pago ? "Anúncio no Facebook" : "Facebook";
  if (s === "an" || s.includes("audience")) return "Anúncio da Meta (rede de parceiros)";
  if (s) return pago ? `Anúncio (${s})` : s;
  return "Sem origem registrada";
}

function textoOuNulo(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** user_agent → o aparelho, sem versão nem modelo. */
function aparelhoDoAgente(ua: string | null): string | null {
  if (!ua) return null;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "celular Android" : "tablet Android";
  if (/Windows/i.test(ua)) return "computador Windows";
  if (/Macintosh|Mac OS/i.test(ua)) return "Mac";
  return "outro aparelho";
}

export async function getContas(): Promise<ContaAdmin[]> {
  await exigirSuperAdmin();
  const db = servico();

  const [{ data: empresas }, { data: assinaturas }, origens, donas, casa, agoraPor, usoPor] = await Promise.all([
    db.from("empresas").select("id, nome, owner_user_id, created_at"),
    db.from("assinaturas").select("*"),
    // de onde veio o clique — ausência da 152 vira "sem origem", não erro
    db.from("origem_do_clique").select("empresa_id, utm_source, utm_medium, utm_campaign, gclid, user_agent"),
    // WhatsApp e guia da DONA de cada conta (a linha dela em membros_equipe)
    db.from("membros_equipe").select("user_id, empresa_id, whatsapp, guia_dispensado_em, guia_concluido_em").eq("is_owner", true),
    idsDaCasa(db),
    lerAgora(db, Date.now()),
    lerUso(db),
  ]);
  type Origem = { empresa_id: string; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; gclid: string | null; user_agent: string | null };
  const origemPor = new Map(((origens.data ?? []) as Origem[]).map((o) => [o.empresa_id, o]));
  type Dona = { user_id: string; empresa_id: string; whatsapp: string | null; guia_dispensado_em?: string | null; guia_concluido_em?: string | null };
  const donaPor = new Map(((donas.data ?? []) as Dona[]).map((d) => [d.empresa_id, d]));

  // Paginado até o fim: com >1000 logins, a primeira versão mostrava a
  // dona da conta como "sem e-mail" e escondia o banimento dela.
  const todosUsuarios: {
    id: string;
    email?: string;
    last_sign_in_at?: string | null;
    user_metadata?: Record<string, unknown> | null;
  }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data: lote } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const users = lote?.users ?? [];
    todosUsuarios.push(...users);
    if (users.length < 1000) break;
  }

  const porEmpresa = new Map(
    (assinaturas ?? []).map((a) => [a.empresa_id as string, a])
  );
  const usuarioPorId = new Map(todosUsuarios.map((u) => [u.id, u]));

  const contas: ContaAdmin[] = [];
  for (const e of empresas ?? []) {
    const [{ count: membros }, { data: evs }, { data: ult }, conv, tar, forn] =
      await Promise.all([
        db
          .from("membros_equipe")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", e.id)
          .eq("status", "ativo"),
        // a CIDADE vem junto: é o que responde "de onde ela é"
        db.from("events").select("city, guests").eq("empresa_id", e.id),
        db
          .from("activities")
          .select("created_at")
          .eq("empresa_id", e.id)
          .order("created_at", { ascending: false })
          .limit(1),
        db.from("evento_convidado").select("id", { count: "exact", head: true }).eq("empresa_id", e.id),
        db.from("tasks").select("id", { count: "exact", head: true }).eq("empresa_id", e.id),
        // fornecedores CADASTRADOS por ela (antes contava links de roteiro)
        db.from("suppliers").select("id", { count: "exact", head: true }).eq("empresa_id", e.id),
      ]);

    const dona = usuarioPorId.get(e.owner_user_id);
    const a = porEmpresa.get(e.id);
    const o = origemPor.get(e.id);
    const d = donaPor.get(e.id);

    // cidades por frequência, sem repetir e sem vazio. A cidade é digitada
    // à mão: "Governador valadares" e "Governador Valadares" são a mesma,
    // então a chave ignora maiúscula e acento, e aparece a primeira grafia.
    const contagem = new Map<string, { nome: string; n: number }>();
    let convidadosPrevistos = 0;
    for (const x of (evs ?? []) as { city: string | null; guests: number | null }[]) {
      convidadosPrevistos += Number(x.guests) || 0;
      const c = x.city?.trim().replace(/\s+/g, " ");
      if (!c) continue;
      const chave = c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
      const atual = contagem.get(chave);
      contagem.set(chave, { nome: atual?.nome ?? c, n: (atual?.n ?? 0) + 1 });
    }
    const cidades = [...contagem.values()].sort((p, q) => q.n - p.n).map((c) => c.nome).slice(0, 3);
    contas.push({
      empresaId: e.id,
      nome: e.nome,
      criadaEm: e.created_at,
      donaEmail: dona?.email ?? null,
      donaUserId: e.owner_user_id,
      banidaAte:
        ((dona as unknown as { banned_until?: string | null })?.banned_until) ??
        null,
      membros: membros ?? 0,
      eventos: (evs ?? []).length,
      ultimaAtividade: ult?.[0]?.created_at ?? null,
      assinatura: a
        ? {
            id: a.id,
            plano: a.plano,
            valorMensal: Number(a.valor_mensal),
            status: a.status,
            inicio: a.inicio,
            canceladaEm: a.cancelada_em,
            observacao: a.observacao,
            testeTerminaEm: (a.teste_termina_em as string | null) ?? null,
          }
        : null,
      origem: o
        ? {
            canal: canalDaOrigem(o.utm_source, o.utm_medium, o.gclid),
            campanha: o.utm_campaign ?? null,
            aparelho: aparelhoDoAgente(o.user_agent),
          }
        : null,
      cidades,
      ultimoLogin: dona?.last_sign_in_at ?? null,
      whatsapp: d?.whatsapp?.trim() || null,
      convidados: conv.count ?? 0,
      convidadosPrevistos,
      tarefas: tar.count ?? 0,
      fornecedores: forn.count ?? 0,
      guia: d?.guia_concluido_em ? "concluiu" : d?.guia_dispensado_em ? "pulou" : "em andamento",
      eventos3Meses: textoOuNulo(dona?.user_metadata?.eventos_3_meses),
      instagram: textoOuNulo(dona?.user_metadata?.instagram),
      daCasa: casa.has(e.id),
      agora: agoraPor.get(e.id) ?? null,
      uso: usoPor.get(e.id) ?? null,
    });
  }

  // quem está ao vivo primeiro; depois, a atividade mais recente
  contas.sort(
    (x, y) =>
      Number(Boolean(y.agora?.aoVivo)) - Number(Boolean(x.agora?.aoVivo)) ||
      (y.ultimaAtividade ?? "").localeCompare(x.ultimaAtividade ?? "")
  );
  return contas;
}

// ------------------------------------------------------------------
// Métricas do mês
// ------------------------------------------------------------------

/**
 * Um mês só. É a MESMA leitura da série — de propósito.
 *
 * A versão anterior repetia aqui as três consultas por conta própria, e
 * duas portas para o mesmo número é como se ganha divergência: quem
 * amanhã ajustar a leitura da série (excluir uma empresa de teste, por
 * exemplo) e esquecer desta faria o mesmo mês responder dois valores.
 */
export async function getMetricas(mes: string): Promise<MetricasDoMes> {
  await exigirSuperAdmin();
  return (await getSerieMensal(mes, 1)).meses[0];
}

// ------------------------------------------------------------------
// A série do painel — vários meses, UMA leitura
// ------------------------------------------------------------------

/**
 * Tudo que o painel do dono desenha, numa viagem só ao banco.
 *
 * Devolve mais que a lista de meses de propósito: o relatório precisa do
 * LOG BRUTO (para contar upgrades, pausas, cancelamentos do mês) e das
 * datas de criação das empresas. Se cada bloco da tela fosse buscar o
 * seu, a mesma tabela `assinatura_eventos` seria lida três vezes na
 * mesma renderização — e nada garante que as três leituras vissem o
 * mesmo estado.
 */
export type SerieDoPainel = {
  /** do mês mais antigo ao mais recente; o último é o mês pedido */
  meses: MetricasDoMes[];
  /** log inteiro, para as contagens do relatório */
  eventos: EventoAssinatura[];
  /** `empresas.created_at` das contas de clientes — "contas criadas no mês" */
  criadasEm: string[];
  /** quantas contas da casa ficaram fora de todos os números acima */
  contasDaCasa: number;
};

/**
 * Os `n` meses que terminam em `mesFinal`.
 *
 * A regra que não pode ser quebrada aqui: UMA leitura e N cálculos. As
 * métricas são reconstruídas repassando o log inteiro até cada corte, e
 * o log é a mesma coisa para todos os meses — buscar por mês seriam 12
 * (ou 36) idas ao banco para responder o que uma responde.
 */
export async function getSerieMensal(
  mesFinal: string,
  n: number
): Promise<SerieDoPainel> {
  await exigirSuperAdmin();
  const db = servico();

  const meses = mesesAte(mesFinal, n);

  const [assinaturas, eventos, { data: gastos }, empresas, casa] = await Promise.all([
    lerTudo<{
      empresa_id: string;
      status: AssinaturaAdmin["status"];
      teste_termina_em?: string | null;
    }>(
      (de, ate) =>
        db
          .from("assinaturas")
          // Todas as colunas, e não a lista: teste_termina_em (154) pode
          // ainda não existir no banco quando este código subir, e pedir
          // a coluna pelo nome derrubaria o painel inteiro com erro do
          // PostgREST.
          .select("*")
          .order("empresa_id", { ascending: true })
          .range(de, ate),
      "as assinaturas"
    ),
    // ORDER BY em, created_at: o desempate de eventos do mesmo dia é o
    // que decide o valor final da conta (converter por 97 e subir para
    // 149 na mesma data). Ver o comentário de `repassar`.
    lerTudo<LinhaEvento>(
      (de, ate) =>
        db
          .from("assinatura_eventos")
          .select("empresa_id, tipo, valor_antes, valor_depois, em")
          .order("em", { ascending: true })
          .order("created_at", { ascending: true })
          .range(de, ate),
      "o histórico de assinaturas"
    ),
    // o gasto de marketing é por mês; a janela inteira vem numa consulta
    db
      .from("gastos_aquisicao")
      .select("mes, valor")
      .gte("mes", `${meses[0]}-01`)
      .lte("mes", `${mesFinal}-01`),
    lerTudo<{ id: string; created_at: string }>(
      (de, ate) =>
        db
          .from("empresas")
          .select("id, created_at")
          .order("created_at", { ascending: true })
          .range(de, ate),
      "as contas"
    ),
    idsDaCasa(db),
  ]);

  // As contas da casa saem de TUDO aqui: assinatura, histórico e contas
  // criadas. É esta leitura que alimenta todos os números do painel.
  const a: AssinaturaAdmin[] = assinaturas.filter((r) => !casa.has(r.empresa_id)).map((r) => ({
    empresaId: r.empresa_id,
    status: r.status,
    testeTerminaEm: r.teste_termina_em ?? null,
  }));
  // eventosEfetivos tira as repetições (cancelar quem já não pagava) antes
  // de qualquer conta: métricas e relatório leem a mesma lista limpa.
  const ev: EventoAssinatura[] = eventosEfetivos(
    eventos.filter((r) => !casa.has(r.empresa_id)).map((r) => ({
      empresaId: r.empresa_id,
      tipo: r.tipo,
      valorAntes: r.valor_antes === null ? null : Number(r.valor_antes),
      valorDepois: r.valor_depois === null ? null : Number(r.valor_depois),
      em: r.em,
    }))
  );

  const gastoPorMes = new Map<string, number>(
    (gastos ?? []).map((g) => [String(g.mes).slice(0, 7), Number(g.valor)])
  );

  return {
    meses: meses.map((m) =>
      calcularMetricas(a, ev, gastoPorMes.get(m) ?? null, m)
    ),
    eventos: ev,
    criadasEm: empresas.filter((e) => !casa.has(e.id)).map((e) => e.created_at),
    contasDaCasa: casa.size,
  };
}

// ------------------------------------------------------------------
// Ações (chamadas pelas server actions de /admin, que re-checam o gate)
// ------------------------------------------------------------------

export async function salvarAssinaturaDb(input: {
  empresaId: string;
  plano: string;
  valorMensal: number;
  status: "trial" | "ativa" | "pausada" | "cancelada";
  observacao: string | null;
}): Promise<void> {
  const quem = await exigirSuperAdmin();
  const db = servico();

  const { data: atual } = await db
    .from("assinaturas")
    .select("*")
    .eq("empresa_id", input.empresaId)
    .maybeSingle();

  const hoje = hojeBR();
  const antesStatus: string | null = atual?.status ?? null;
  const antesValor: number | null = atual ? Number(atual.valor_mensal) : null;

  // ------------------------------------------------------------------
  // A tabela de transições. O log de eventos é a fonte das métricas —
  // errar um tipo aqui é errar o churn para sempre. Regras:
  //   · trial não é pagante: criar/cancelar/pausar trial NÃO gera evento
  //     (a primeira versão fazia trial cancelado virar churn de pagante)
  //   · a conversão trial→ativa é o "inicio" e ATUALIZA a coluna inicio
  //     para a data da conversão (senão a venda cai no mês do trial e o
  //     CAC sai errado nos dois meses)
  //   · pausa/retomada têm eventos próprios: pausar tira do MRR e conta
  //     no NRR, mas não é churn
  // ------------------------------------------------------------------
  const eraPagante = antesStatus === "ativa" || antesStatus === "pausada";
  let tipo:
    | "inicio"
    | "upgrade"
    | "downgrade"
    | "cancelamento"
    | "reativacao"
    | "pausa"
    | "retomada"
    | null = null;

  if (!eraPagante) {
    // vinha de nada, de trial ou de cancelada
    if (input.status === "ativa") {
      tipo = antesStatus === "cancelada" ? "reativacao" : "inicio";
    }
    // trial→cancelada, trial→pausada, criação em trial: sem evento
  } else if (antesStatus === "ativa") {
    if (input.status === "cancelada") tipo = "cancelamento";
    else if (input.status === "pausada") tipo = "pausa";
    else if (input.status === "ativa" && antesValor !== null) {
      if (input.valorMensal > antesValor) tipo = "upgrade";
      else if (input.valorMensal < antesValor) tipo = "downgrade";
    }
  } else if (antesStatus === "pausada") {
    if (input.status === "ativa") tipo = "retomada";
    else if (input.status === "cancelada") tipo = "cancelamento";
  }

  const novoInicio =
    tipo === "inicio" ? hoje : (atual?.inicio ?? hoje);
  const canceladaEm =
    input.status === "cancelada" ? (atual?.cancelada_em ?? hoje) : null;

  const { data: salva, error } = await db
    .from("assinaturas")
    .upsert(
      {
        empresa_id: input.empresaId,
        plano: input.plano,
        valor_mensal: input.valorMensal,
        status: input.status,
        inicio: novoInicio,
        cancelada_em: canceladaEm,
        observacao: input.observacao,
        // Mexer no plano ou no valor por AQUI encerra a promoção — a
        // mesma regra que trocarPlano() já aplica do lado da cliente.
        // Sem isto, o dono corrigia uma conta à mão e a rotina diária
        // puxava a mensalidade de volta para o degrau na madrugada
        // seguinte, desfazendo em silêncio o que ele acabou de decidir.
        // Preço mexido à mão é preço combinado à mão: não tem escada.
        promocao_codigo: null,
        promocao_inicio: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "empresa_id" }
    )
    .select("id")
    .single();
  if (error || !salva) {
    throw new Error(`Não foi possível salvar a assinatura: ${error?.message}`);
  }

  if (tipo) {
    const { error: erroEvento } = await db.from("assinatura_eventos").insert({
      assinatura_id: salva.id,
      empresa_id: input.empresaId,
      tipo,
      valor_antes: antesValor,
      valor_depois: input.valorMensal,
      em: hoje,
    });
    // O log é a fonte das métricas: falhar em silêncio aqui corromperia
    // o histórico sem ninguém saber.
    if (erroEvento) {
      throw new Error(`Assinatura salva, mas o histórico falhou: ${erroEvento.message}`);
    }
  }

  await registrarAcaoAdmin(db, quem, {
    acao: "assinatura_alterada",
    empresaId: input.empresaId,
    antes: atual
      ? {
          plano: atual.plano,
          valor_mensal: Number(atual.valor_mensal),
          status: atual.status,
          observacao: atual.observacao ?? null,
        }
      : null,
    depois: {
      plano: input.plano,
      valor_mensal: input.valorMensal,
      status: input.status,
      observacao: input.observacao,
      historico: tipo,
    },
  });
}

export async function salvarGastoDb(mes: string, valor: number): Promise<void> {
  const quem = await exigirSuperAdmin();
  const db = servico();
  const { data: antes } = await db
    .from("gastos_aquisicao")
    .select("valor")
    .eq("mes", `${mes}-01`)
    .maybeSingle();
  const { error } = await db.from("gastos_aquisicao").upsert(
    { mes: `${mes}-01`, valor, updated_at: new Date().toISOString() },
    { onConflict: "mes" }
  );
  if (error) throw new Error(`Não foi possível salvar o gasto: ${error.message}`);
  await registrarAcaoAdmin(db, quem, {
    acao: "gasto_marketing",
    antes: antes ? { mes, valor: Number(antes.valor) } : null,
    depois: { mes, valor },
  });
}

/**
 * Banir = suspender TODOS os logins da empresa (dona e equipe) por 100
 * anos, e derrubar as sessões. Reativar = tirar a suspensão. Nada é
 * apagado: os dados da conta ficam intactos para o caso de reativação.
 */
export async function definirBanimentoDb(
  empresaId: string,
  banir: boolean
): Promise<{ afetados: number }> {
  const quem = await exigirSuperAdmin();
  const db = servico();

  const { data: membros } = await db
    .from("membros_equipe")
    .select("user_id")
    .eq("empresa_id", empresaId)
    .not("user_id", "is", null);
  const { data: emp } = await db
    .from("empresas")
    .select("owner_user_id")
    .eq("id", empresaId)
    .single();

  const ids = new Set<string>(
    (membros ?? []).map((m) => m.user_id as string)
  );
  if (emp?.owner_user_id) ids.add(emp.owner_user_id);

  let afetados = 0;
  for (const id of ids) {
    const { error } = await db.auth.admin.updateUserById(id, {
      ban_duration: banir ? "876000h" : "none",
    });
    if (!error) {
      afetados++;
      if (banir) await db.auth.admin.signOut(id, "global");
    }
  }
  await registrarAcaoAdmin(db, quem, {
    acao: banir ? "conta_suspensa" : "conta_reativada",
    empresaId,
    depois: { logins_afetados: afetados },
  });
  return { afetados };
}

// ------------------------------------------------------------------
// O portão do teste grátis (154)
// ------------------------------------------------------------------
// Ligar e desligar o cadastro sem cartão é decisão comercial do dono, e
// por isso mora no banco e não no código: ele fecha a torneira às onze
// da noite sem publicar nada. Fechar governa só quem CHEGA — quem já
// tem `teste_termina_em` corre os dias dela até o fim.

export type PortaoAdmin = { aberto: boolean; dias: number; atualizadoEm: string | null };

export async function getPortaoDoTeste(): Promise<PortaoAdmin | null> {
  await exigirSuperAdmin();
  const db = servico();
  const { data, error } = await db
    .from("teste_gratis")
    .select("aberto, dias, atualizado_em")
    .maybeSingle();
  // sem a 154 aplicada a tabela não existe: a tela mostra o aviso em vez
  // de um interruptor que não liga nada
  if (error || !data) return null;
  return {
    aberto: data.aberto === true,
    dias: Number(data.dias) || 7,
    atualizadoEm: data.atualizado_em ?? null,
  };
}

export async function salvarPortaoDoTesteDb(input: {
  aberto: boolean;
  dias: number;
}): Promise<void> {
  const quem = await exigirSuperAdmin();
  const db = servico();
  const dias = Math.trunc(input.dias);
  // o CHECK do banco recusaria, mas a mensagem do Postgres não diria ao
  // dono qual era a faixa
  if (!Number.isFinite(dias) || dias < 1 || dias > 90) {
    throw new Error("O teste precisa ter entre 1 e 90 dias.");
  }
  const { data: antes } = await db.from("teste_gratis").select("aberto, dias").maybeSingle();
  const { error } = await db
    .from("teste_gratis")
    .upsert(
      { id: true, aberto: input.aberto, dias, atualizado_em: new Date().toISOString() },
      { onConflict: "id" }
    );
  if (error) {
    throw new Error(
      error.code === "42P01"
        ? "A migração 154 ainda não foi aplicada neste banco."
        : `Não foi possível salvar o portão: ${error.message}`
    );
  }
  await registrarAcaoAdmin(db, quem, {
    acao: "portao_do_teste",
    antes: antes ? { aberto: antes.aberto, dias: antes.dias } : null,
    depois: { aberto: input.aberto, dias },
  });
}

// ------------------------------------------------------------------
// Suporte (161)
// ------------------------------------------------------------------
// A caixinha do canto do sistema escreve em suporte_mensagem pelas
// funções da cliente; o dono lê e responde AQUI, com a chave de serviço,
// atrás do mesmo gate de toda esta camada. A tabela não tem policy
// nenhuma: fora destas funções e das duas RPCs da cliente, ninguém a vê.
//
// Desde 16/09/2026 cada resposta sai também por e-mail, e a conversa diz
// o que se sabe dela: "vista" (a pessoa abriu a caixinha com a resposta
// na tela) e a situação do e-mail no Resend ("entregue" = o provedor dela
// aceitou; não é leitura). As colunas do aviso vêm da 161 reaplicada: sem
// elas, o e-mail sai do mesmo jeito, e a tela só não mostra a situação.

export type ConversaSuporteResumo = {
  userId: string;
  pessoa: string;
  email: string | null;
  empresa: string;
  ultimaMensagem: string;
  ultimaEm: string;
  ultimoAutor: "cliente" | "eorganizei";
  naoLidas: number;
  /** a última palavra é nossa, e a pessoa ainda não abriu a caixinha */
  respostaNaoVista: boolean;
  daCasa: boolean;
};

export type AvisoPorEmail =
  | { estado: "sem_aviso" }
  | { estado: "falhou"; falha: string }
  | { estado: "enviado"; em: string; situacao: SituacaoDoEmail };

export type MensagemSuporteAdmin = {
  id: string;
  autor: "cliente" | "eorganizei";
  texto: string;
  pagina: string | null;
  em: string;
  /** nas nossas respostas: quando a pessoa abriu a caixinha com ela na tela */
  vistaEm: string | null;
  /** nulo nas mensagens dela, e enquanto a 161 não for reaplicada */
  aviso: AvisoPorEmail | null;
};

export type PessoaDoSuporte = {
  primeiroNome: string;
  ultimoLogin: string | null;
  whatsapp: string | null;
};

export type ResultadoDoAviso = { aviso: "enviado" | "falhou" | "sem_email"; falha?: string };

type LinhaSuporte = {
  id: string;
  empresa_id: string;
  user_id: string | null;
  autor: "cliente" | "eorganizei";
  texto: string;
  pagina: string | null;
  lida_pelo_suporte_em: string | null;
  lida_pela_cliente_em: string | null;
  created_at: string;
  // da 161 reaplicada (16/09/2026); ausentes antes disso
  aviso_email_id?: string | null;
  aviso_email_em?: string | null;
  aviso_email_situacao?: string | null;
  aviso_email_falha?: string | null;
};

export async function contarSuporteNaoLidas(): Promise<number> {
  await exigirSuperAdmin();
  const db = servico();
  const [{ data, error }, casa] = await Promise.all([
    db
      .from("suporte_mensagem")
      .select("empresa_id")
      .eq("autor", "cliente")
      .is("lida_pelo_suporte_em", null)
      .limit(1000),
    idsDaCasa(db),
  ]);
  // 161 ausente: a caixa de entrada só não acende — o painel segue.
  // As mensagens das contas da casa não acendem o menu (são testes dele).
  if (error) return 0;
  return (data ?? []).filter((m) => !casa.has(m.empresa_id as string)).length;
}

export async function getConversasSuporte(): Promise<ConversaSuporteResumo[]> {
  await exigirSuperAdmin();
  const db = servico();
  const [{ data, error }, casa] = await Promise.all([
    db
      .from("suporte_mensagem")
      .select("id, empresa_id, user_id, autor, texto, pagina, lida_pelo_suporte_em, lida_pela_cliente_em, created_at")
      .order("created_at", { ascending: false })
      .limit(3000),
    idsDaCasa(db),
  ]);
  if (error || !data) return [];
  const linhas = data as LinhaSuporte[];

  const porPessoa = new Map<string, LinhaSuporte[]>();
  for (const l of linhas) {
    if (!l.user_id) continue;
    const lista = porPessoa.get(l.user_id) ?? [];
    lista.push(l);
    porPessoa.set(l.user_id, lista);
  }
  if (porPessoa.size === 0) return [];

  const ids = [...porPessoa.keys()];
  const empresasIds = [...new Set(linhas.map((l) => l.empresa_id))];
  const [{ data: membros }, { data: empresas }] = await Promise.all([
    db.from("membros_equipe").select("user_id, nome, email").in("user_id", ids),
    db.from("empresas").select("id, nome").in("id", empresasIds),
  ]);
  const membroPor = new Map((membros ?? []).map((m) => [m.user_id as string, m]));
  const empresaPor = new Map((empresas ?? []).map((e) => [e.id as string, e.nome as string]));

  return ids
    .map((userId) => {
      const msgs = porPessoa.get(userId)!; // já em ordem decrescente
      const ultima = msgs[0];
      const m = membroPor.get(userId);
      return {
        userId,
        pessoa: (m?.nome as string) || "Sem nome",
        email: (m?.email as string) ?? null,
        empresa: empresaPor.get(ultima.empresa_id) ?? "—",
        ultimaMensagem: ultima.texto,
        ultimaEm: ultima.created_at,
        ultimoAutor: ultima.autor,
        naoLidas: msgs.filter((x) => x.autor === "cliente" && !x.lida_pelo_suporte_em).length,
        respostaNaoVista: ultima.autor === "eorganizei" && !ultima.lida_pela_cliente_em,
        daCasa: casa.has(ultima.empresa_id),
      };
    })
    .sort((a, b) => (a.ultimaEm < b.ultimaEm ? 1 : -1));
}

const SITUACOES: SituacaoDoEmail[] = ["entregue", "enviado", "atrasado", "nao_chegou", "spam"];
const comoSituacao = (v: unknown): SituacaoDoEmail =>
  SITUACOES.includes(v as SituacaoDoEmail) ? (v as SituacaoDoEmail) : "enviado";

/**
 * Quantas situações de e-mail a conversa aberta pergunta ao Resend de uma
 * vez. A API aceita 2 chamadas por segundo; a situação final fica gravada
 * e não é perguntada de novo.
 */
const CONSULTAS_AO_RESEND = 4;

/**
 * Abrir a conversa conta como ler: as mensagens da cliente ganham a data.
 * Das nossas respostas, a tela recebe se a pessoa viu e o que o e-mail
 * fez; a situação que ainda pode mudar é perguntada ao Resend e guardada.
 */
export async function getConversaSuporte(userId: string): Promise<MensagemSuporteAdmin[]> {
  await exigirSuperAdmin();
  const db = servico();
  const { data, error } = await db
    .from("suporte_mensagem")
    // todas as colunas: as do aviso só existem com a 161 reaplicada, e
    // pedi-las pelo nome derrubaria a conversa inteira antes disso
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error || !data) return [];
  await db
    .from("suporte_mensagem")
    .update({ lida_pelo_suporte_em: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("autor", "cliente")
    .is("lida_pelo_suporte_em", null);

  const linhas = data as LinhaSuporte[];
  const comColunasDoAviso = linhas.some((l) => "aviso_email_em" in l);

  const aPerguntar = linhas
    .filter(
      (l) =>
        l.autor === "eorganizei" &&
        l.aviso_email_id &&
        !situacaoFinal(comoSituacao(l.aviso_email_situacao))
    )
    .slice(-CONSULTAS_AO_RESEND);
  for (const l of aPerguntar) {
    const s = await situacaoDoEmail(l.aviso_email_id as string);
    if (s && s !== l.aviso_email_situacao) {
      l.aviso_email_situacao = s;
      await db.from("suporte_mensagem").update({ aviso_email_situacao: s }).eq("id", l.id);
    }
  }

  return linhas.map((m) => {
    let aviso: AvisoPorEmail | null = null;
    if (m.autor === "eorganizei" && comColunasDoAviso) {
      aviso = m.aviso_email_em
        ? { estado: "enviado", em: m.aviso_email_em, situacao: comoSituacao(m.aviso_email_situacao) }
        : m.aviso_email_falha
          ? { estado: "falhou", falha: m.aviso_email_falha }
          : { estado: "sem_aviso" };
    }
    return {
      id: m.id,
      autor: m.autor,
      texto: m.texto,
      pagina: m.pagina,
      em: m.created_at,
      vistaEm: m.autor === "eorganizei" ? m.lida_pela_cliente_em : null,
      aviso,
    };
  });
}

/** Quem é a pessoa da conversa: o nome para o WhatsApp, o último login e o número. */
export async function getPessoaDoSuporte(userId: string): Promise<PessoaDoSuporte> {
  await exigirSuperAdmin();
  const db = servico();
  const [{ data: u }, { data: m }] = await Promise.all([
    db.auth.admin.getUserById(userId),
    db
      .from("membros_equipe")
      .select("nome, whatsapp")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  const nome = ((m?.nome as string | null) ?? "").trim();
  return {
    primeiroNome: nome.split(/\s+/)[0] ?? "",
    ultimoLogin: u?.user?.last_sign_in_at ?? null,
    whatsapp: ((m?.whatsapp as string | null) ?? "").trim() || null,
  };
}

/**
 * Manda a resposta por e-mail e guarda o que o envio devolveu. Nunca
 * lança: a resposta já está gravada, e o e-mail que falha vira aviso na
 * tela do dono, não erro.
 */
async function avisarPorEmail(
  db: Servico,
  linha: { id: string; user_id: string; texto: string }
): Promise<ResultadoDoAviso> {
  const [{ data: u }, { data: m }] = await Promise.all([
    db.auth.admin.getUserById(linha.user_id),
    db
      .from("membros_equipe")
      .select("nome")
      .eq("user_id", linha.user_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  const para = u?.user?.email?.trim();
  if (!para) return { aviso: "sem_email" };

  let r: ResultadoEnvio;
  try {
    r = await enviarEmailRespostaSuporte({
      para,
      nome: (m?.nome as string | null) ?? null,
      texto: linha.texto,
    });
  } catch (e) {
    console.error("[eorganizei:admin] aviso do suporte:", e instanceof Error ? e.message : e);
    r = { ok: false, error: "Não foi possível enviar o e-mail agora." };
  }

  const registro = r.ok
    ? {
        aviso_email_id: r.id,
        aviso_email_em: new Date().toISOString(),
        aviso_email_situacao: "enviado",
        aviso_email_falha: null,
      }
    : { aviso_email_falha: r.error.slice(0, 200) };
  const { error } = await db.from("suporte_mensagem").update(registro).eq("id", linha.id);
  if (error) {
    // 161 ainda não reaplicada: o e-mail saiu (ou não), só não fica registrado
    console.error("[eorganizei:admin] registro do aviso:", error.code, (error.message ?? "").slice(0, 120));
  }
  return r.ok ? { aviso: "enviado" } : { aviso: "falhou", falha: r.error };
}

export async function responderSuporteDb(userId: string, texto: string): Promise<ResultadoDoAviso> {
  const quem = await exigirSuperAdmin();
  const limpo = texto.trim();
  if (!limpo) throw new Error("Escreva a resposta.");
  if (limpo.length > 2000) throw new Error("Resposta longa demais.");
  const db = servico();
  // A empresa sai da própria conversa: resposta só existe onde alguém
  // perguntou — o painel não abre conversa do nada com ninguém.
  const { data: ultima } = await db
    .from("suporte_mensagem")
    .select("empresa_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ultima) throw new Error("Conversa não encontrada.");
  const { data: nova, error } = await db
    .from("suporte_mensagem")
    .insert({
      empresa_id: ultima.empresa_id,
      user_id: userId,
      autor: "eorganizei",
      texto: limpo,
    })
    .select("id")
    .single();
  if (error || !nova) throw new Error(`Não foi possível responder: ${error?.message}`);
  const aviso = await avisarPorEmail(db, { id: nova.id as string, user_id: userId, texto: limpo });
  // o texto da resposta fica na conversa; a auditoria guarda só o fato
  await registrarAcaoAdmin(db, quem, {
    acao: "suporte_respondido",
    empresaId: ultima.empresa_id as string,
    depois: { caracteres: limpo.length, aviso_por_email: aviso.aviso },
  });
  return aviso;
}

/** O aviso por e-mail de uma resposta que ainda não teve (ou cujo envio falhou). */
export async function avisarRespostaPorEmailDb(mensagemId: string): Promise<ResultadoDoAviso> {
  const quem = await exigirSuperAdmin();
  const db = servico();
  const { data, error } = await db
    .from("suporte_mensagem")
    .select("*")
    .eq("id", mensagemId)
    .maybeSingle();
  if (error || !data) throw new Error("Resposta não encontrada.");
  const l = data as LinhaSuporte;
  if (l.autor !== "eorganizei" || !l.user_id) throw new Error("Só as nossas respostas vão por e-mail.");
  if (!("aviso_email_em" in l)) {
    throw new Error("Reaplique a migração 161 no Supabase para avisar por e-mail.");
  }
  if (l.aviso_email_em) throw new Error("Esta resposta já foi avisada por e-mail.");
  const aviso = await avisarPorEmail(db, { id: l.id, user_id: l.user_id, texto: l.texto });
  await registrarAcaoAdmin(db, quem, {
    acao: "suporte_avisado_por_email",
    empresaId: l.empresa_id,
    depois: { aviso_por_email: aviso.aviso },
  });
  return aviso;
}
