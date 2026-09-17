// O painel do dono, parte da receita (123, seções 2, 3 e 10) — SERVER-SIDE.
//
// O que entra: o que a operadora CONFIRMOU como pago (os avisos já
// guardados em gateway_evento). O que sai: os custos que o dono lança.
// Resultado de gestão, não contábil; a tela diz isso.
//
// Dos avisos da operadora, só números e datas saem daqui: o aviso carrega
// nome e e-mail de quem paga, e isso não é assunto desta tela.

import "server-only";
import {
  exigirSuperAdmin,
  idsDaCasa,
  lerTudo,
  registrarAcaoAdmin,
  servico,
  tabelaAusente,
} from "@/lib/supabase/admin-painel";

const FALTA_A_123 = "Reaplique a migração 123 no Supabase para lançar custos e caixa.";

// ------------------------------------------------------------------
// Custos
// ------------------------------------------------------------------

export const CATEGORIAS_DE_CUSTO = [
  { chave: "infraestrutura", rotulo: "Infraestrutura (servidor, banco)" },
  { chave: "email", rotulo: "E-mail" },
  { chave: "ia", rotulo: "Inteligência artificial" },
  { chave: "armazenamento", rotulo: "Armazenamento" },
  { chave: "dominio", rotulo: "Domínio" },
  { chave: "ferramentas", rotulo: "Ferramentas" },
  { chave: "operadora", rotulo: "Taxas da operadora" },
  { chave: "contabilidade", rotulo: "Contabilidade" },
  { chave: "impostos", rotulo: "Impostos" },
  { chave: "pessoal", rotulo: "Pessoal" },
  { chave: "outros", rotulo: "Outros" },
] as const;

export type CategoriaDeCusto = (typeof CATEGORIAS_DE_CUSTO)[number]["chave"];

/** Custo "de operação": o que existe porque o sistema está no ar. */
export const CATEGORIAS_DE_OPERACAO: CategoriaDeCusto[] = [
  "infraestrutura",
  "email",
  "ia",
  "armazenamento",
  "dominio",
  "operadora",
];

export type Custo = {
  id: string;
  mes: string; // yyyy-mm
  servico: string;
  categoria: CategoriaDeCusto;
  valor: number;
  recorrente: boolean;
  pago: boolean;
  nota: string | null;
};

export async function getCustos(desdeMes: string, ateMes: string): Promise<{ custos: Custo[]; tabela: boolean }> {
  await exigirSuperAdmin();
  const { data, error } = await servico()
    .from("custo_operacao")
    .select("id, mes, servico, categoria, valor, recorrente, pago, nota")
    .gte("mes", `${desdeMes}-01`)
    .lte("mes", `${ateMes}-01`)
    .order("mes", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(2000);
  if (error) {
    if (!tabelaAusente(error)) console.error("[eorganizei:admin] custos:", error.code);
    return { custos: [], tabela: !tabelaAusente(error) };
  }
  return {
    tabela: true,
    custos: (data ?? []).map((c) => ({
      id: c.id as string,
      mes: String(c.mes).slice(0, 7),
      servico: c.servico as string,
      categoria: c.categoria as CategoriaDeCusto,
      valor: Number(c.valor),
      recorrente: Boolean(c.recorrente),
      pago: Boolean(c.pago),
      nota: (c.nota as string | null) ?? null,
    })),
  };
}

export async function salvarCustoDb(input: {
  mes: string;
  servico: string;
  categoria: string;
  valor: number;
  recorrente: boolean;
  pago: boolean;
  nota: string | null;
}): Promise<void> {
  const quem = await exigirSuperAdmin();
  if (!/^\d{4}-\d{2}$/.test(input.mes)) throw new Error("Mês inválido.");
  const servicoNome = input.servico.trim();
  if (!servicoNome || servicoNome.length > 60) throw new Error("Diga de que é o custo (até 60 letras).");
  if (!CATEGORIAS_DE_CUSTO.some((c) => c.chave === input.categoria)) throw new Error("Categoria inválida.");
  if (!Number.isFinite(input.valor) || input.valor < 0) throw new Error("Valor inválido.");
  const db = servico();
  const linha = {
    mes: `${input.mes}-01`,
    servico: servicoNome,
    categoria: input.categoria,
    valor: Math.round(input.valor * 100) / 100,
    recorrente: input.recorrente,
    pago: input.pago,
    nota: input.nota?.trim().slice(0, 300) || null,
  };
  const { error } = await db.from("custo_operacao").insert(linha);
  if (error) throw new Error(tabelaAusente(error) ? FALTA_A_123 : `Não foi possível lançar: ${error.message}`);
  await registrarAcaoAdmin(db, quem, { acao: "custo_lancado", depois: linha });
}

export async function apagarCustoDb(id: string): Promise<void> {
  const quem = await exigirSuperAdmin();
  const db = servico();
  const { data, error } = await db
    .from("custo_operacao")
    .delete()
    .eq("id", id)
    .select("mes, servico, categoria, valor, recorrente, pago");
  if (error) throw new Error(`Não foi possível apagar: ${error.message}`);
  if (!data?.length) throw new Error("Esse custo já não existe.");
  await registrarAcaoAdmin(db, quem, { acao: "custo_apagado", antes: data[0] });
}

/** Os custos recorrentes do mês anterior, copiados para o mês pedido. */
export async function copiarRecorrentesDb(mes: string): Promise<{ copiados: number }> {
  const quem = await exigirSuperAdmin();
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error("Mês inválido.");
  const [a, m] = mes.split("-").map(Number);
  const anterior = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
  const db = servico();
  const [{ data: origem, error }, { data: jaTem }] = await Promise.all([
    db
      .from("custo_operacao")
      .select("servico, categoria, valor, nota")
      .eq("mes", `${anterior}-01`)
      .eq("recorrente", true),
    db.from("custo_operacao").select("servico, categoria").eq("mes", `${mes}-01`),
  ]);
  if (error) throw new Error(tabelaAusente(error) ? FALTA_A_123 : `Não foi possível ler: ${error.message}`);
  const existentes = new Set((jaTem ?? []).map((c) => `${c.categoria}|${String(c.servico).toLowerCase()}`));
  const novos = (origem ?? [])
    .filter((c) => !existentes.has(`${c.categoria}|${String(c.servico).toLowerCase()}`))
    .map((c) => ({
      mes: `${mes}-01`,
      servico: c.servico,
      categoria: c.categoria,
      valor: c.valor,
      nota: c.nota,
      recorrente: true,
      // copiado ainda não foi pago: o dono marca quando pagar
      pago: false,
    }));
  if (novos.length === 0) return { copiados: 0 };
  const { error: erroInsert } = await db.from("custo_operacao").insert(novos);
  if (erroInsert) throw new Error(`Não foi possível copiar: ${erroInsert.message}`);
  await registrarAcaoAdmin(db, quem, {
    acao: "custos_copiados",
    depois: { de: anterior, para: mes, quantos: novos.length },
  });
  return { copiados: novos.length };
}

export async function marcarCustoPagoDb(id: string, pago: boolean): Promise<void> {
  const quem = await exigirSuperAdmin();
  const db = servico();
  const { data, error } = await db
    .from("custo_operacao")
    .update({ pago, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("mes, servico, valor");
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
  if (!data?.length) throw new Error("Esse custo já não existe.");
  await registrarAcaoAdmin(db, quem, {
    acao: "custo_lancado",
    depois: { ...data[0], pago },
    motivo: pago ? "marcado como pago" : "marcado como a pagar",
  });
}

// ------------------------------------------------------------------
// Caixa
// ------------------------------------------------------------------

export type SaldoDeCaixa = { dia: string; valor: number; nota: string | null };

export async function getSaldosDeCaixa(): Promise<{ saldos: SaldoDeCaixa[]; tabela: boolean }> {
  await exigirSuperAdmin();
  const { data, error } = await servico()
    .from("caixa_saldo")
    .select("dia, valor, nota")
    .order("dia", { ascending: false })
    .limit(24);
  if (error) {
    if (!tabelaAusente(error)) console.error("[eorganizei:admin] caixa:", error.code);
    return { saldos: [], tabela: !tabelaAusente(error) };
  }
  return {
    tabela: true,
    saldos: (data ?? []).map((s) => ({
      dia: s.dia as string,
      valor: Number(s.valor),
      nota: (s.nota as string | null) ?? null,
    })),
  };
}

export async function salvarSaldoDb(dia: string, valor: number, nota: string | null): Promise<void> {
  const quem = await exigirSuperAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error("Data inválida.");
  if (!Number.isFinite(valor)) throw new Error("Valor inválido.");
  const db = servico();
  const { data: antes } = await db.from("caixa_saldo").select("valor").eq("dia", dia).maybeSingle();
  const { error } = await db.from("caixa_saldo").upsert(
    { dia, valor: Math.round(valor * 100) / 100, nota: nota?.trim().slice(0, 200) || null, updated_at: new Date().toISOString() },
    { onConflict: "dia" }
  );
  if (error) throw new Error(tabelaAusente(error) ? FALTA_A_123 : `Não foi possível salvar: ${error.message}`);
  await registrarAcaoAdmin(db, quem, {
    acao: "caixa_informado",
    antes: antes ? { dia, valor: Number(antes.valor) } : null,
    depois: { dia, valor },
  });
}

// ------------------------------------------------------------------
// Ajustes (alíquota estimada, limites dos serviços)
// ------------------------------------------------------------------

export type Ajustes = {
  aliquotaImposto: number | null; // %
  supabaseBancoMb: number | null;
  supabaseArquivosMb: number | null;
  resendEmailsMes: number | null;
};

const CHAVES_DOS_AJUSTES: Record<keyof Ajustes, string> = {
  aliquotaImposto: "aliquota_imposto",
  supabaseBancoMb: "supabase_banco_mb",
  supabaseArquivosMb: "supabase_arquivos_mb",
  resendEmailsMes: "resend_emails_mes",
};

export async function getAjustes(): Promise<Ajustes & { tabela: boolean }> {
  await exigirSuperAdmin();
  const { data, error } = await servico().from("painel_ajuste").select("chave, valor");
  const vazio = { aliquotaImposto: null, supabaseBancoMb: null, supabaseArquivosMb: null, resendEmailsMes: null };
  if (error) {
    if (!tabelaAusente(error)) console.error("[eorganizei:admin] ajustes:", error.code);
    return { ...vazio, tabela: !tabelaAusente(error) };
  }
  const mapa = new Map((data ?? []).map((l) => [l.chave as string, l.valor]));
  const numero = (chave: string) => {
    const v = Number(mapa.get(chave));
    return mapa.has(chave) && Number.isFinite(v) ? v : null;
  };
  return {
    tabela: true,
    aliquotaImposto: numero(CHAVES_DOS_AJUSTES.aliquotaImposto),
    supabaseBancoMb: numero(CHAVES_DOS_AJUSTES.supabaseBancoMb),
    supabaseArquivosMb: numero(CHAVES_DOS_AJUSTES.supabaseArquivosMb),
    resendEmailsMes: numero(CHAVES_DOS_AJUSTES.resendEmailsMes),
  };
}

export async function salvarAjustesDb(novos: Ajustes): Promise<void> {
  const quem = await exigirSuperAdmin();
  const db = servico();
  const antes = await getAjustes();
  const linhas: { chave: string; valor: number }[] = [];
  const apagar: string[] = [];
  for (const [campo, chave] of Object.entries(CHAVES_DOS_AJUSTES) as [keyof Ajustes, string][]) {
    const v = novos[campo];
    if (v === null) apagar.push(chave);
    else {
      if (!Number.isFinite(v) || v < 0) throw new Error("Valor inválido.");
      if (campo === "aliquotaImposto" && v > 60) throw new Error("A alíquota passa de 60%.");
      linhas.push({ chave, valor: v });
    }
  }
  if (linhas.length) {
    const { error } = await db
      .from("painel_ajuste")
      .upsert(linhas.map((l) => ({ ...l, atualizado_em: new Date().toISOString() })), { onConflict: "chave" });
    if (error) throw new Error(tabelaAusente(error) ? FALTA_A_123 : `Não foi possível salvar: ${error.message}`);
  }
  if (apagar.length) {
    await db.from("painel_ajuste").delete().in("chave", apagar);
  }
  const { tabela: _t, ...antesSemTabela } = antes;
  await registrarAcaoAdmin(db, quem, { acao: "ajuste_alterado", antes: antesSemTabela, depois: novos });
}

// ------------------------------------------------------------------
// O que a operadora confirmou (recebido) e o que ela recusou
// ------------------------------------------------------------------

export type Pagamento = {
  empresaId: string;
  cobranca: string;
  valor: number; // reais
  dia: string; // yyyy-mm-dd, Brasília
};

export type AvisoDaOperadora = { empresaId: string | null; tipo: string; dia: string };

function diaBRDe(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * Os pagamentos confirmados desde uma data, sem as contas da casa. A mesma
 * cobrança chega como charge.paid e dentro de invoice.paid: conta uma vez
 * (pelo id da cobrança).
 */
export async function getPagamentosEAvisos(desdeIso: string): Promise<{
  pagamentos: Pagamento[];
  avisos: AvisoDaOperadora[];
}> {
  await exigirSuperAdmin();
  const db = servico();
  type Linha = { empresa_id: string | null; tipo: string; created_at: string; payload: Record<string, unknown> | null };
  const [linhas, casa] = await Promise.all([
    lerTudo<Linha>(
      (de, ate) =>
        db
          .from("gateway_evento")
          .select("empresa_id, tipo, created_at, payload")
          .gte("created_at", desdeIso)
          .order("created_at", { ascending: true })
          .range(de, ate),
      "os avisos da operadora"
    ).catch(() => [] as Linha[]),
    idsDaCasa(db),
  ]);
  const vistos = new Set<string>();
  const pagamentos: Pagamento[] = [];
  const avisos: AvisoDaOperadora[] = [];
  for (const l of linhas) {
    if (l.empresa_id && casa.has(l.empresa_id)) continue;
    avisos.push({ empresaId: l.empresa_id, tipo: l.tipo, dia: diaBRDe(l.created_at) });
    if (!l.empresa_id) continue;
    if (l.tipo !== "charge.paid" && l.tipo !== "invoice.paid") continue;
    const d = ((l.payload as { data?: Record<string, any> } | null)?.data ?? {}) as Record<string, any>;
    const cobranca = l.tipo === "charge.paid" ? d.id : d.charge?.id;
    const centavos = Number(
      l.tipo === "charge.paid"
        ? d.paid_amount ?? d.amount
        : d.charge?.paid_amount ?? d.charge?.amount ?? d.amount
    );
    const pagoEm = (l.tipo === "charge.paid" ? d.paid_at : d.charge?.paid_at) ?? l.created_at;
    const chave = String(cobranca ?? `${l.tipo}:${l.created_at}`);
    if (vistos.has(chave) || !Number.isFinite(centavos) || centavos <= 0) continue;
    vistos.add(chave);
    pagamentos.push({
      empresaId: l.empresa_id,
      cobranca: chave,
      valor: centavos / 100,
      dia: diaBRDe(String(pagoEm)),
    });
  }
  return { pagamentos, avisos };
}
