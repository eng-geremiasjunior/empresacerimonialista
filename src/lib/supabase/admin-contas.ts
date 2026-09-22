// O painel do dono, parte das contas (123, seções 7 a 9) — SERVER-SIDE.
//
// Mesma porta de admin-painel.ts: toda função começa por
// exigirSuperAdmin(), e só depois usa a chave de serviço. O banco devolve
// fatos (contagens, datas, nomes de área); as regras de situação e de
// atenção moram em lib/admin/saude-da-conta.ts, sem banco.

import "server-only";
import {
  exigirSuperAdmin,
  lerTudo,
  registrarAcaoAdmin,
  servico,
  tabelaAusente,
} from "@/lib/supabase/admin-painel";
import type { ResumoDaConta } from "@/lib/admin/saude-da-conta";
import { checkoutDasLinhas } from "@/lib/etapas-da-assinatura";
import { hojeBR, somarDias } from "@/lib/tempo";
import { moverInicioDaAssinatura } from "@/lib/pagarme";

/** A função do banco ainda não existe (123 não reaplicada). */
function funcaoAusente(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || /could not find the function/i.test(error.message ?? "");
}

export type LeituraDoPainel<T> =
  | { ok: true; dados: T }
  | { ok: false; motivo: "migracao" | "erro"; mensagem: string };

const FALTA_A_123 = "Reaplique a migração 123 no Supabase para ver esta parte do painel.";

// ------------------------------------------------------------------
// O resumo de cada conta
// ------------------------------------------------------------------

/**
 * Até onde cada conta chegou no caminho da assinatura. Sai do sinal de
 * presença (uso por dia e a última tela), filtrado às áreas da assinatura:
 * poucas linhas, sem migração. Falhar aqui não derruba o painel — a conta
 * só fica sem essa informação.
 */
async function anexarCheckout(
  contas: ResumoDaConta[],
  empresaId?: string
): Promise<ResumoDaConta[]> {
  if (contas.length === 0) return contas;
  try {
    const db = servico();
    const [uso, presenca] = await Promise.all([
      lerTudo<{ empresa_id: string; dia: string; area: string }>((de, ate) => {
        let q = db.from("uso_diario").select("empresa_id, dia, area").like("area", "Assinatura%");
        if (empresaId) q = q.eq("empresa_id", empresaId);
        return q.order("dia").range(de, ate);
      }, "o uso da assinatura"),
      lerTudo<{ empresa_id: string; area: string; visto_em: string }>((de, ate) => {
        let q = db.from("presenca").select("empresa_id, area, visto_em").like("area", "Assinatura%");
        if (empresaId) q = q.eq("empresa_id", empresaId);
        return q.order("visto_em", { ascending: false }).range(de, ate);
      }, "a presença na assinatura"),
    ]);

    const usoDa = new Map<string, { dia: string; area: string }[]>();
    for (const u of uso) {
      const lista = usoDa.get(u.empresa_id) ?? [];
      lista.push(u);
      usoDa.set(u.empresa_id, lista);
    }
    // vem do mais recente: a primeira de cada empresa é a que vale
    const presencaDa = new Map<string, { area: string; visto_em: string }>();
    for (const p of presenca) {
      if (!presencaDa.has(p.empresa_id)) presencaDa.set(p.empresa_id, p);
    }

    return contas.map((c) => ({
      ...c,
      checkout: checkoutDasLinhas(
        usoDa.get(c.empresa_id) ?? [],
        presencaDa.get(c.empresa_id) ?? null
      ),
    }));
  } catch (e) {
    console.error("[eorganizei:admin] checkout das contas:", (e as Error).message.slice(0, 120));
    return contas;
  }
}

export async function getResumoDasContas(): Promise<LeituraDoPainel<ResumoDaConta[]>> {
  await exigirSuperAdmin();
  const { data, error } = await servico().rpc("admin_resumo_contas", {});
  if (error) {
    if (funcaoAusente(error)) return { ok: false, motivo: "migracao", mensagem: FALTA_A_123 };
    console.error("[eorganizei:admin] resumo das contas:", error.code, (error.message ?? "").slice(0, 120));
    return { ok: false, motivo: "erro", mensagem: "Não foi possível ler as contas agora." };
  }
  const contas = (Array.isArray(data) ? data : []) as ResumoDaConta[];
  return { ok: true, dados: await anexarCheckout(contas) };
}

export async function getResumoDaConta(empresaId: string): Promise<LeituraDoPainel<ResumoDaConta | null>> {
  await exigirSuperAdmin();
  const { data, error } = await servico().rpc("admin_resumo_contas", { p_empresa_id: empresaId });
  if (error) {
    if (funcaoAusente(error)) return { ok: false, motivo: "migracao", mensagem: FALTA_A_123 };
    // id que não é uuid cai aqui (22P02): conta que não existe
    if (error.code === "22P02") return { ok: true, dados: null };
    console.error("[eorganizei:admin] resumo da conta:", error.code, (error.message ?? "").slice(0, 120));
    return { ok: false, motivo: "erro", mensagem: "Não foi possível ler esta conta agora." };
  }
  const lista = (Array.isArray(data) ? data : []) as ResumoDaConta[];
  const [conta] = await anexarCheckout(lista.slice(0, 1), empresaId);
  return { ok: true, dados: conta ?? null };
}

// ------------------------------------------------------------------
// A linha do tempo da ficha
// ------------------------------------------------------------------

export type LinhaDoTempo = {
  acoes: { dia: string; tipo: string; n: number }[];
  uso: {
    dia: string;
    minutos: number;
    aberturas: number;
    areas: { area: string; minutos: number; aberturas: number }[];
  }[];
  assinatura: {
    em: string;
    tipo: string;
    valor_antes: number | null;
    valor_depois: number | null;
    nota: string | null;
  }[];
  suporte: { dia: string; dela: number; nossas: number }[];
  gateway: { em: string; tipo: string; erro: string | null }[];
  registro: {
    em: string;
    quem: string;
    acao: string;
    antes: unknown;
    depois: unknown;
    motivo: string | null;
  }[];
  notas: { id: string; texto: string; autor: string; em: string }[];
};

export async function getLinhaDoTempo(
  empresaId: string,
  dias: number
): Promise<LeituraDoPainel<LinhaDoTempo>> {
  await exigirSuperAdmin();
  const { data, error } = await servico().rpc("admin_linha_do_tempo", {
    p_empresa_id: empresaId,
    p_dias: dias,
  });
  if (error) {
    if (funcaoAusente(error)) return { ok: false, motivo: "migracao", mensagem: FALTA_A_123 };
    console.error("[eorganizei:admin] linha do tempo:", error.code, (error.message ?? "").slice(0, 120));
    return { ok: false, motivo: "erro", mensagem: "Não foi possível ler a atividade agora." };
  }
  const d = (data ?? {}) as Partial<LinhaDoTempo>;
  return {
    ok: true,
    dados: {
      acoes: d.acoes ?? [],
      uso: d.uso ?? [],
      assinatura: d.assinatura ?? [],
      suporte: d.suporte ?? [],
      gateway: d.gateway ?? [],
      registro: d.registro ?? [],
      notas: d.notas ?? [],
    },
  };
}

// ------------------------------------------------------------------
// Ativação e uso
// ------------------------------------------------------------------

export type UsoPorModulo = {
  dias: number;
  acoes: { empresa_id: string; tipo: string; n: number; dias: number }[];
  uso: { empresa_id: string; area: string; minutos: number; aberturas: number; dias: number }[];
  suporte: { empresa_id: string; n: number }[];
};

export async function getUsoPorModulo(dias: number): Promise<LeituraDoPainel<UsoPorModulo>> {
  await exigirSuperAdmin();
  const { data, error } = await servico().rpc("admin_uso_por_modulo", { p_dias: dias });
  if (error) {
    if (funcaoAusente(error)) return { ok: false, motivo: "migracao", mensagem: FALTA_A_123 };
    console.error("[eorganizei:admin] uso por módulo:", error.code);
    return { ok: false, motivo: "erro", mensagem: "Não foi possível ler o uso agora." };
  }
  const d = (data ?? {}) as Partial<UsoPorModulo>;
  return {
    ok: true,
    dados: { dias: d.dias ?? dias, acoes: d.acoes ?? [], uso: d.uso ?? [], suporte: d.suporte ?? [] },
  };
}

export type DiasAtivos = { empresa_id: string; acao: string[]; acesso: string[] };

export async function getDiasAtivos(): Promise<LeituraDoPainel<DiasAtivos[]>> {
  await exigirSuperAdmin();
  const { data, error } = await servico().rpc("admin_dias_ativos", {});
  if (error) {
    if (funcaoAusente(error)) return { ok: false, motivo: "migracao", mensagem: FALTA_A_123 };
    console.error("[eorganizei:admin] dias ativos:", error.code);
    return { ok: false, motivo: "erro", mensagem: "Não foi possível ler os dias de uso agora." };
  }
  return { ok: true, dados: (Array.isArray(data) ? data : []) as DiasAtivos[] };
}

// ------------------------------------------------------------------
// As ações da ficha
// ------------------------------------------------------------------

export async function salvarNotaDb(empresaId: string, texto: string): Promise<void> {
  const quem = await exigirSuperAdmin();
  const limpo = texto.trim();
  if (!limpo) throw new Error("Escreva a nota.");
  if (limpo.length > 2000) throw new Error("A nota passa de 2.000 caracteres.");
  const db = servico();
  const { error } = await db.from("conta_nota").insert({
    empresa_id: empresaId,
    texto: limpo,
    autor: quem,
  });
  if (error) {
    throw new Error(
      tabelaAusente(error) ? FALTA_A_123 : `Não foi possível salvar a nota: ${error.message}`
    );
  }
  // o texto fica na nota; a auditoria guarda só o fato
  await registrarAcaoAdmin(db, quem, {
    acao: "nota_da_conta",
    empresaId,
    depois: { caracteres: limpo.length },
  });
}

/** Até quantos dias de uma vez o painel prorroga um teste. */
export const PRORROGACAO_MAXIMA = 30;

/**
 * Mais dias de teste para uma conta. Conta com o teste ainda correndo
 * ganha os dias depois do fim combinado; teste que já acabou volta a
 * correr a partir de hoje. Só vale para conta em teste, e o motivo é
 * obrigatório: vai para a auditoria.
 */
export async function prorrogarTesteDb(
  empresaId: string,
  dias: number,
  motivo: string
): Promise<{ novoFim: string }> {
  const quem = await exigirSuperAdmin();
  if (!Number.isInteger(dias) || dias < 1 || dias > PRORROGACAO_MAXIMA) {
    throw new Error(`Prorrogue de 1 a ${PRORROGACAO_MAXIMA} dias.`);
  }
  const porque = motivo.trim();
  if (porque.length < 3) throw new Error("Escreva o motivo da prorrogação.");
  if (porque.length > 500) throw new Error("O motivo passa de 500 caracteres.");

  const db = servico();
  const { data: a, error: erroLeitura } = await db
    .from("assinaturas")
    .select("id, status, teste_termina_em, gateway_subscription_id, promocao_codigo")
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (erroLeitura) throw new Error(`Não foi possível ler a assinatura: ${erroLeitura.message}`);
  if (!a || a.status !== "trial") {
    throw new Error("Só dá para prorrogar o teste de uma conta que está em teste.");
  }

  const hoje = hojeBR();
  const fimAntes = (a.teste_termina_em as string | null) ?? null;
  const base = fimAntes && fimAntes >= hoje ? fimAntes : hoje;
  const novoFim = somarDias(base, dias);

  // O teste com cartão (21/09/2026): a cobrança está agendada na operadora
  // para o dia seguinte ao fim de ANTES. Prorrogar aqui sem mover lá
  // cobraria no meio do teste prorrogado — então a operadora vai
  // primeiro, e se ela recusar, nada muda.
  const agendada = (a.gateway_subscription_id as string | null) ?? null;
  const novaCobranca = somarDias(novoFim, 1);
  if (agendada) {
    const r = await moverInicioDaAssinatura(agendada, novaCobranca);
    if (!r.ok) {
      throw new Error(`A operadora não aceitou mover a cobrança agendada (${r.erro}). Nada mudou.`);
    }
  }

  const { data: gravada, error } = await db
    .from("assinaturas")
    .update({
      teste_termina_em: novoFim,
      ...(agendada
        ? {
            proximo_vencimento: novaCobranca,
            ...(a.promocao_codigo ? { promocao_inicio: novaCobranca } : {}),
            observacao: `teste prorrogado · cobrança agendada para ${novaCobranca}`,
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", a.id)
    // se ela assinou entre a leitura e aqui, nada muda
    .eq("status", "trial")
    .select("id");
  if (error) throw new Error(`Não foi possível prorrogar: ${error.message}`);
  if (!gravada?.length) throw new Error("A conta saiu do teste enquanto você prorrogava. Nada mudou.");

  await registrarAcaoAdmin(db, quem, {
    acao: "teste_prorrogado",
    empresaId,
    antes: { teste_termina_em: fimAntes },
    depois: { teste_termina_em: novoFim, dias },
    motivo: porque,
  });
  return { novoFim };
}
