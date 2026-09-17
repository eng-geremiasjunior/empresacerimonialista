// O painel do dono, parte do sistema e da auditoria (123, seções 7 e 10)
// — SERVER-SIDE. Mesma porta: exigirSuperAdmin() antes da chave de serviço.
//
// A situação dos serviços vem de dois lados, e a tela separa os dois:
//   · o que NÓS registramos (rotinas, e-mails, avisos da operadora,
//     erros, uso da IA, tamanho do banco);
//   · o que o PROVEDOR diz na página de status pública dele (a situação
//     geral do serviço, não a do nosso projeto).

import "server-only";
import {
  exigirSuperAdmin,
  idsDaCasa,
  servico,
  tabelaAusente,
} from "@/lib/supabase/admin-painel";
import { situacaoDoEmail, situacaoFinal, type SituacaoDoEmail } from "@/lib/email";

// ------------------------------------------------------------------
// Rotinas
// ------------------------------------------------------------------

export type ExecucaoDeRotina = {
  rotina: string;
  inicio: string;
  duracaoMs: number | null;
  ok: boolean;
  resumo: string | null;
};

export async function getExecucoes(limite = 400): Promise<{ execucoes: ExecucaoDeRotina[]; tabela: boolean }> {
  await exigirSuperAdmin();
  const { data, error } = await servico()
    .from("rotina_execucao")
    .select("rotina, inicio, duracao_ms, ok, resumo")
    .order("inicio", { ascending: false })
    .limit(limite);
  if (error) return { execucoes: [], tabela: !tabelaAusente(error) };
  return {
    tabela: true,
    execucoes: (data ?? []).map((r) => ({
      rotina: r.rotina as string,
      inicio: r.inicio as string,
      duracaoMs: (r.duracao_ms as number | null) ?? null,
      ok: Boolean(r.ok),
      resumo: (r.resumo as string | null) ?? null,
    })),
  };
}

// ------------------------------------------------------------------
// E-mails
// ------------------------------------------------------------------

export type EnvioRegistrado = {
  id: string;
  tipo: string;
  ok: boolean;
  erro: string | null;
  situacao: SituacaoDoEmail | null;
  em: string;
};

const SITUACOES: SituacaoDoEmail[] = ["entregue", "enviado", "atrasado", "nao_chegou", "spam"];

/**
 * Os envios desde uma data. Os mais recentes que ainda podem mudar de
 * situação são perguntados ao Resend (poucos por vez: a API aceita duas
 * chamadas por segundo) e a resposta fica guardada.
 */
export async function getEnvios(desdeIso: string): Promise<{ envios: EnvioRegistrado[]; tabela: boolean }> {
  await exigirSuperAdmin();
  const db = servico();
  const { data, error } = await db
    .from("email_envio")
    .select("id, tipo, ok, erro, situacao, provedor_id, created_at")
    .gte("created_at", desdeIso)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) return { envios: [], tabela: !tabelaAusente(error) };
  const linhas = data ?? [];
  const perguntar = linhas
    .filter(
      (l) =>
        l.ok &&
        l.provedor_id &&
        !situacaoFinal(SITUACOES.includes(l.situacao as SituacaoDoEmail) ? (l.situacao as SituacaoDoEmail) : null) &&
        Date.now() - new Date(l.created_at as string).getTime() > 60_000
    )
    .slice(0, 4);
  for (const l of perguntar) {
    const s = await situacaoDoEmail(l.provedor_id as string);
    if (s && s !== l.situacao) {
      l.situacao = s;
      await db.from("email_envio").update({ situacao: s }).eq("id", l.id);
    }
  }
  return {
    tabela: true,
    envios: linhas.map((l) => ({
      id: l.id as string,
      tipo: l.tipo as string,
      ok: Boolean(l.ok),
      erro: (l.erro as string | null) ?? null,
      situacao: SITUACOES.includes(l.situacao as SituacaoDoEmail) ? (l.situacao as SituacaoDoEmail) : null,
      em: l.created_at as string,
    })),
  };
}

// ------------------------------------------------------------------
// Erros
// ------------------------------------------------------------------

export type ErroRegistrado = {
  origem: "tela" | "servidor" | "rotina";
  area: string;
  codigo: string | null;
  empresaId: string | null;
  daCasa: boolean;
  em: string;
};

export async function getErros(desdeIso: string): Promise<{ erros: ErroRegistrado[]; tabela: boolean }> {
  await exigirSuperAdmin();
  const db = servico();
  const [{ data, error }, casa] = await Promise.all([
    db
      .from("erro_do_sistema")
      .select("origem, area, codigo, empresa_id, created_at")
      .gte("created_at", desdeIso)
      .order("created_at", { ascending: false })
      .limit(1000),
    idsDaCasa(db),
  ]);
  if (error) return { erros: [], tabela: !tabelaAusente(error) };
  return {
    tabela: true,
    erros: (data ?? []).map((e) => ({
      origem: e.origem as ErroRegistrado["origem"],
      area: e.area as string,
      codigo: (e.codigo as string | null) ?? null,
      empresaId: (e.empresa_id as string | null) ?? null,
      daCasa: Boolean(e.empresa_id && casa.has(e.empresa_id as string)),
      em: e.created_at as string,
    })),
  };
}

// ------------------------------------------------------------------
// Banco e arquivos
// ------------------------------------------------------------------

export type TamanhoDoBanco = {
  bancoBytes: number;
  baldes: { balde: string; bytes: number; arquivos: number }[];
  tabelas: { tabela: string; bytes: number; linhas: number }[];
};

export type MedidaDoDia = { dia: string; bancoBytes: number; arquivosBytes: number };

export async function getTamanhoDoBanco(): Promise<TamanhoDoBanco | null> {
  await exigirSuperAdmin();
  const { data, error } = await servico().rpc("admin_tamanho_do_banco", {});
  if (error || !data) return null;
  const d = data as { banco_bytes: number; baldes?: TamanhoDoBanco["baldes"]; tabelas?: TamanhoDoBanco["tabelas"] };
  return {
    bancoBytes: Number(d.banco_bytes) || 0,
    baldes: (d.baldes ?? []).map((b) => ({ ...b, bytes: Number(b.bytes) || 0, arquivos: Number(b.arquivos) || 0 })),
    tabelas: (d.tabelas ?? []).map((t) => ({ ...t, bytes: Number(t.bytes) || 0, linhas: Number(t.linhas) || 0 })),
  };
}

export async function getMedidas(dias = 90): Promise<MedidaDoDia[]> {
  await exigirSuperAdmin();
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await servico()
    .from("medida_diaria")
    .select("dia, banco_bytes, arquivos_bytes")
    .gte("dia", desde)
    .order("dia", { ascending: true });
  if (error) return [];
  return (data ?? []).map((m) => ({
    dia: m.dia as string,
    bancoBytes: Number(m.banco_bytes) || 0,
    arquivosBytes: Number(m.arquivos_bytes) || 0,
  }));
}

// ------------------------------------------------------------------
// IA
// ------------------------------------------------------------------

export type UsoDaIa = {
  dia: string;
  empresaId: string;
  daCasa: boolean;
  rota: string;
  chamadas: number;
  falhas: number;
  tokensEntrada: number;
  tokensSaida: number;
};

export async function getUsoDaIa(desdeDia: string): Promise<{ uso: UsoDaIa[]; tabela: boolean }> {
  await exigirSuperAdmin();
  const db = servico();
  const [{ data, error }, casa] = await Promise.all([
    db
      .from("ia_uso")
      .select("dia, empresa_id, rota, chamadas, falhas, tokens_entrada, tokens_saida")
      .gte("dia", desdeDia)
      .order("dia", { ascending: false })
      .limit(5000),
    idsDaCasa(db),
  ]);
  if (error) return { uso: [], tabela: !tabelaAusente(error) };
  return {
    tabela: true,
    uso: (data ?? []).map((u) => ({
      dia: u.dia as string,
      empresaId: u.empresa_id as string,
      daCasa: casa.has(u.empresa_id as string),
      rota: u.rota as string,
      chamadas: Number(u.chamadas) || 0,
      falhas: Number(u.falhas) || 0,
      tokensEntrada: Number(u.tokens_entrada) || 0,
      tokensSaida: Number(u.tokens_saida) || 0,
    })),
  };
}

// ------------------------------------------------------------------
// A operadora (o log de antes, agora dentro de Sistema)
// ------------------------------------------------------------------

export type LinhaDaOperadora = {
  quando: string;
  direcao: "enviado" | "aviso";
  titulo: string;
  ok: boolean;
  detalhe: string | null;
  duracao: string | null;
};

function resumoCurto(v: unknown): string | null {
  if (v == null) return null;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 600 ? `${s.slice(0, 600)}…` : s;
}

/**
 * O que saiu para a Pagar.me e o que voltou. Sem segredo nenhum: a chave
 * não é registrada e o cartão nunca passa por aqui. Dos avisos, só o tipo
 * e o que o processamento decidiu (o aviso inteiro tem dado de quem paga).
 */
export async function getLogDaOperadora(): Promise<LinhaDaOperadora[]> {
  await exigirSuperAdmin();
  const db = servico();
  const [chamadas, avisos] = await Promise.all([
    db
      .from("gateway_log")
      .select("metodo, caminho, status, ok, resposta, excecao, duracao_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("gateway_evento")
      .select("tipo, processado_em, erro, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return [
    ...(chamadas.data ?? []).map((c): LinhaDaOperadora => {
      const r = c.resposta as { message?: string; errors?: Record<string, string[]> } | null;
      const erroCurto = r?.errors
        ? Object.entries(r.errors)
            .map(([campo, msgs]) => `${campo}: ${msgs?.[0] ?? ""}`)
            .join(" · ")
        : r?.message ?? null;
      return {
        quando: c.created_at as string,
        direcao: "enviado",
        // o id da assinatura no caminho é o que se procura no painel da
        // operadora quando algo dá errado: fica como estava
        titulo: `${c.metodo} ${c.caminho} — HTTP ${c.status ?? "sem resposta"}`,
        ok: Boolean(c.ok),
        detalhe: c.ok ? null : (c.excecao as string | null) ?? erroCurto ?? resumoCurto(c.resposta),
        duracao: c.duracao_ms != null ? `${c.duracao_ms} ms` : null,
      };
    }),
    ...(avisos.data ?? []).map(
      (w): LinhaDaOperadora => ({
        quando: w.created_at as string,
        direcao: "aviso",
        titulo: w.tipo as string,
        // "erro" com nota de descarte ("sem assinatura no payload") não é
        // falha — falha de aviso é não ser processado
        ok: w.processado_em != null || w.erro == null,
        detalhe: (w.erro as string | null) ?? null,
        duracao: null,
      })
    ),
  ].sort((a, b) => (a.quando < b.quando ? 1 : -1));
}

// ------------------------------------------------------------------
// A situação que cada provedor publica
// ------------------------------------------------------------------

export type SituacaoDoProvedor = {
  servico: string;
  pagina: string | null;
  /** "operacional", "instável", "fora do ar", ou null quando não deu para saber */
  situacao: "operacional" | "atencao" | "fora" | null;
  descricao: string | null;
};

const PAGINAS_DE_STATUS: { servico: string; pagina: string; api: string }[] = [
  { servico: "Supabase", pagina: "https://status.supabase.com", api: "https://status.supabase.com/api/v2/status.json" },
  { servico: "Vercel", pagina: "https://www.vercel-status.com", api: "https://www.vercel-status.com/api/v2/status.json" },
  { servico: "Resend", pagina: "https://resend-status.com", api: "https://resend-status.com/api/v2/status.json" },
  { servico: "Pagar.me", pagina: "https://status.pagar.me", api: "https://status.pagar.me/api/v2/status.json" },
  { servico: "Groq (IA)", pagina: "https://groqstatus.com", api: "https://groqstatus.com/api/v2/status.json" },
];

/**
 * Só GET em página pública, sem mandar nada nosso. Guardado por 5 minutos
 * (a situação geral não muda a cada clique) e com prazo curto: página de
 * status fora do ar não pode travar o painel.
 */
export async function getSituacaoDosProvedores(): Promise<SituacaoDoProvedor[]> {
  await exigirSuperAdmin();
  const lidas = await Promise.all(
    PAGINAS_DE_STATUS.map(async (p): Promise<SituacaoDoProvedor> => {
      try {
        const r = await fetch(p.api, {
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(3500),
          headers: { Accept: "application/json" },
        });
        if (!r.ok) return { servico: p.servico, pagina: p.pagina, situacao: null, descricao: null };
        const j = (await r.json()) as { status?: { indicator?: string; description?: string } };
        const ind = (j.status?.indicator ?? "").toLowerCase();
        const desc = j.status?.description ?? null;
        const situacao =
          ind === "none" || ind === "up" || /all systems operational|operational/i.test(desc ?? "")
            ? "operacional"
            : ind === "critical" || ind === "major" || /major|outage/i.test(desc ?? "")
              ? "fora"
              : ind || desc
                ? "atencao"
                : null;
        return { servico: p.servico, pagina: p.pagina, situacao, descricao: desc };
      } catch {
        return { servico: p.servico, pagina: p.pagina, situacao: null, descricao: null };
      }
    })
  );
  return [
    ...lidas,
    // a Meta não publica uma situação que se possa consultar
    { servico: "Meta (anúncios)", pagina: "https://metastatus.com", situacao: null, descricao: null },
  ];
}

// ------------------------------------------------------------------
// Auditoria
// ------------------------------------------------------------------

export type LinhaDaAuditoria = {
  em: string;
  quem: string;
  acao: string;
  empresaId: string | null;
  empresaNome: string | null;
  daCasa: boolean;
  antes: unknown;
  depois: unknown;
  motivo: string | null;
};

export async function getAuditoria(filtro: { acao?: string | null; empresaId?: string | null }): Promise<{
  linhas: LinhaDaAuditoria[];
  tabela: boolean;
}> {
  await exigirSuperAdmin();
  const db = servico();
  let q = db
    .from("admin_registro")
    .select("em, quem, acao, empresa_id, empresa_nome, antes, depois, motivo")
    .order("em", { ascending: false })
    .limit(300);
  if (filtro.acao) q = q.eq("acao", filtro.acao);
  if (filtro.empresaId) q = q.eq("empresa_id", filtro.empresaId);
  const [{ data, error }, casa] = await Promise.all([q, idsDaCasa(db)]);
  if (error) return { linhas: [], tabela: !tabelaAusente(error) };
  return {
    tabela: true,
    linhas: (data ?? []).map((r) => ({
      em: r.em as string,
      quem: r.quem as string,
      acao: r.acao as string,
      empresaId: (r.empresa_id as string | null) ?? null,
      empresaNome: (r.empresa_nome as string | null) ?? null,
      daCasa: Boolean(r.empresa_id && casa.has(r.empresa_id as string)),
      antes: r.antes,
      depois: r.depois,
      motivo: (r.motivo as string | null) ?? null,
    })),
  };
}

// ------------------------------------------------------------------
// Nomes das contas (para as listas do sistema)
// ------------------------------------------------------------------

export async function getNomesDasContas(): Promise<Map<string, string>> {
  await exigirSuperAdmin();
  const { data } = await servico().from("empresas").select("id, nome").limit(5000);
  return new Map((data ?? []).map((e) => [e.id as string, e.nome as string]));
}
