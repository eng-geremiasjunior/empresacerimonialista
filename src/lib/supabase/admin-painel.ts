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
  type AssinaturaAdmin,
  type EventoAssinatura,
  type MetricasDoMes,
} from "@/lib/admin-metricas";
import { hojeBR } from "@/lib/tempo";

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

/** Lança se quem chama não é o dono do sistema. Toda função passa aqui. */
async function exigirSuperAdmin(): Promise<void> {
  if (!(await emailDoSuperAdmin())) {
    throw new Error("Acesso restrito ao proprietário do sistema.");
  }
}

function servico() {
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
  } | null;
};

export async function getContas(): Promise<ContaAdmin[]> {
  await exigirSuperAdmin();
  const db = servico();

  const [{ data: empresas }, { data: assinaturas }] = await Promise.all([
    db.from("empresas").select("id, nome, owner_user_id, created_at"),
    db.from("assinaturas").select("*"),
  ]);

  // Paginado até o fim: com >1000 logins, a primeira versão mostrava a
  // dona da conta como "sem e-mail" e escondia o banimento dela.
  const todosUsuarios: { id: string; email?: string }[] = [];
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
    const [{ count: membros }, { count: eventos }, { data: ult }] =
      await Promise.all([
        db
          .from("membros_equipe")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", e.id)
          .eq("status", "ativo"),
        db
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", e.id),
        db
          .from("activities")
          .select("created_at")
          .eq("empresa_id", e.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

    const dona = usuarioPorId.get(e.owner_user_id);
    const a = porEmpresa.get(e.id);
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
      eventos: eventos ?? 0,
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
          }
        : null,
    });
  }

  contas.sort((x, y) => (y.ultimaAtividade ?? "").localeCompare(x.ultimaAtividade ?? ""));
  return contas;
}

// ------------------------------------------------------------------
// Métricas do mês
// ------------------------------------------------------------------

export async function getMetricas(mes: string): Promise<MetricasDoMes> {
  await exigirSuperAdmin();
  const db = servico();

  const [{ data: assinaturas }, { data: eventos }, { data: gasto }] =
    await Promise.all([
      db.from("assinaturas").select("*"),
      db.from("assinatura_eventos").select("empresa_id, tipo, valor_antes, valor_depois, em"),
      db.from("gastos_aquisicao").select("valor").eq("mes", `${mes}-01`).maybeSingle(),
    ]);

  const a: AssinaturaAdmin[] = (assinaturas ?? []).map((r) => ({
    empresaId: r.empresa_id,
    status: r.status,
  }));
  const ev: EventoAssinatura[] = (eventos ?? []).map((r) => ({
    empresaId: r.empresa_id,
    tipo: r.tipo,
    valorAntes: r.valor_antes === null ? null : Number(r.valor_antes),
    valorDepois: r.valor_depois === null ? null : Number(r.valor_depois),
    em: r.em,
  }));

  return calcularMetricas(
    a,
    ev,
    gasto ? Number(gasto.valor) : null,
    mes
  );
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
  await exigirSuperAdmin();
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
}

export async function salvarGastoDb(mes: string, valor: number): Promise<void> {
  await exigirSuperAdmin();
  const db = servico();
  const { error } = await db.from("gastos_aquisicao").upsert(
    { mes: `${mes}-01`, valor, updated_at: new Date().toISOString() },
    { onConflict: "mes" }
  );
  if (error) throw new Error(`Não foi possível salvar o gasto: ${error.message}`);
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
  await exigirSuperAdmin();
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
  return { afetados };
}
