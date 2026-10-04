import "server-only";

// O Orçamento da noiva que abriu a conta sozinha (04/10/2026), lido pela
// sessão dela. Na conta da família ela é a dona do evento: o Financeiro
// da cerimonialista (getFinanceiroDoEvento) já lê tudo por ela, e as
// contas saem do mesmo módulo puro (financeiro-tela.ts). Daqui só sai o
// que a tela do portal desenha: o orçamento, os gastos, os próximos
// pagamentos e quanto cada capítulo do planejamento leva.

import { createClient } from "@/lib/supabase/server";
import { getFinanceiroDoEvento } from "@/lib/supabase/financeiro-evento";
import { daAgenda, linhasDeFornecedor, montarItens, soma, type ItemFinanceiro } from "@/lib/financeiro-tela";
import { CAPITULOS, OUTROS, capituloDoCodigo, nomeDoAssunto } from "@/lib/portal-planejamento";
import { distribuirVerba, quandoPagar } from "@/lib/portal-orcamento";
import { donaDaFesta } from "@/lib/supabase/portal-planejamento";

export type PagamentoDaNoiva = {
  id: string;
  /** "Parcela 2 de 6 · Sabor & Arte" */
  titulo: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  /** "vence em 4 dias", "venceu há 2 dias", "pago 12/10" */
  quando: string;
  perto: boolean;
  atrasada: boolean;
};

export type GastoDaNoiva = {
  /** fornecedor: o id dele; gasto sem fornecedor: o id do lançamento */
  chave: string;
  tipo: "fornecedor" | "avulso";
  nome: string;
  /** o assunto do planejamento ("Buffet e bebidas"), quando se sabe */
  assunto: string | null;
  objetivoId: string | null;
  /** o maior entre o contrato e o que já virou pagamento */
  total: number;
  pago: number;
  falta: number;
  /** do contrato, o que ainda não virou pagamento com data */
  faltaLancar: number;
  pagamentos: PagamentoDaNoiva[];
};

export type CapituloNoOrcamento = { id: string; nome: string; gasto: number; previsto: number | null };

export type OrcamentoDaNoiva = {
  /** quanto querem gastar (verba_total); null = ainda não disseram */
  verba: number | null;
  gastos: number;
  pago: number;
  falta: number;
  /** orçamento − gastos; null sem orçamento */
  livre: number | null;
  /** em aberto, do mais antigo para o mais novo */
  proximos: PagamentoDaNoiva[];
  lista: GastoDaNoiva[];
  capitulos: CapituloNoOrcamento[];
  /** "Para quê?" do formulário: os assuntos de cada capítulo */
  assuntos: { capitulo: string; opcoes: { id: string; nome: string }[] }[];
  fornecedores: string[];
  hoje: string;
};

type ObjetivoBruto = {
  id: string;
  nome: string;
  ativo: boolean;
  faixa_pct_ideal: number | null;
  valor_previsto: number | null;
  metodo_objetivo: { codigo: string } | { codigo: string }[] | null;
};

function pagamento(i: ItemFinanceiro, hoje: string, comFornecedor: boolean): PagamentoDaNoiva {
  const q = quandoPagar(i.vencimento, i.pagoEm, hoje);
  return {
    id: i.id,
    titulo: comFornecedor && i.supplierId ? `${i.titulo} · ${i.fornecedor}` : i.titulo,
    valor: i.valor,
    vencimento: i.vencimento,
    pago: Boolean(i.pagoEm),
    quando: q.texto,
    perto: q.perto,
    atrasada: q.atrasada,
  };
}

/** null = não é a dona da conta de família (ou a sessão não vê o evento). */
export async function getOrcamentoDaNoiva(eventoId: string): Promise<OrcamentoDaNoiva | null> {
  const dona = await donaDaFesta(eventoId);
  if (!dona) return null;
  const supabase = createClient();

  const [fin, { data: objetivosBrutos }, { data: reservaBruta }, { data: fornecedoresBrutos }] = await Promise.all([
    getFinanceiroDoEvento(eventoId),
    supabase
      .from("evento_objetivo")
      .select("id, nome, ativo, faixa_pct_ideal, valor_previsto, metodo_objetivo(codigo)")
      .eq("event_id", eventoId)
      .order("ordem"),
    supabase.from("evento_campo_valor").select("valor_numero").eq("event_id", eventoId).eq("codigo", "reserva_pct").maybeSingle(),
    supabase.from("suppliers").select("name").eq("empresa_id", dona.empresaId).order("name").limit(300),
  ]);
  const hoje = fin.hoje;

  // só a verba: a conta da família não tem assessoria
  const itens = daAgenda(montarItens(fin.lancamentos.filter((l) => l.conta === "verba"), hoje));
  const linhas = linhasDeFornecedor(fin.contratos, itens);

  const objetivos = ((objetivosBrutos ?? []) as unknown as ObjetivoBruto[]).map((o) => {
    const m = Array.isArray(o.metodo_objetivo) ? o.metodo_objetivo[0] : o.metodo_objetivo;
    const codigo = m?.codigo ?? null;
    return {
      id: o.id,
      codigo,
      nome: nomeDoAssunto(codigo, o.nome),
      ativo: o.ativo !== false,
      faixaIdeal: o.faixa_pct_ideal === null ? null : Number(o.faixa_pct_ideal),
      previstoGravado: o.valor_previsto === null ? null : Number(o.valor_previsto),
      capitulo: capituloDoCodigo(codigo),
    };
  });
  const objetivoPor = new Map(objetivos.map((o) => [o.id, o]));

  const lista: GastoDaNoiva[] = [
    ...linhas.map((l): GastoDaNoiva => {
      const total = Math.max(l.contrato ?? 0, l.pago + l.aPagar);
      return {
        chave: l.supplierId,
        tipo: "fornecedor",
        nome: l.nome,
        assunto: l.objetivoId ? (objetivoPor.get(l.objetivoId)?.nome ?? null) : null,
        objetivoId: l.objetivoId,
        total,
        pago: l.pago,
        falta: Math.max(0, total - l.pago),
        faltaLancar: l.faltaLancar,
        pagamentos: l.parcelas.map((p) => pagamento(p, hoje, false)),
      };
    }),
    ...itens
      .filter((i) => i.avulso)
      .map(
        (i): GastoDaNoiva => ({
          chave: i.id,
          tipo: "avulso",
          nome: i.titulo,
          assunto: i.objetivoId ? (objetivoPor.get(i.objetivoId)?.nome ?? null) : null,
          objetivoId: i.objetivoId,
          total: i.valor,
          pago: i.pagoEm ? i.valor : 0,
          falta: i.pagoEm ? 0 : i.valor,
          faltaLancar: 0,
          pagamentos: [pagamento(i, hoje, false)],
        })
      ),
  ];

  const gastos = lista.reduce((t, g) => t + g.total, 0);
  const pago = soma(itens.filter((i) => i.pagoEm));
  const verba = fin.verbaTotal !== null && fin.verbaTotal > 0 ? fin.verbaTotal : null;

  // quanto cada capítulo leva: o previsto gravado (se alguém gravou) ou a
  // divisão do método; o gasto é o dos gastos daquele assunto
  const sugerido = verba
    ? distribuirVerba(
        verba,
        reservaBruta?.valor_numero == null ? null : Number(reservaBruta.valor_numero),
        objetivos
      )
    : new Map<string, number>();
  const capitulos: CapituloNoOrcamento[] = [...CAPITULOS, OUTROS]
    .map((c) => {
      const dele = objetivos.filter((o) => o.ativo && o.capitulo.id === c.id);
      const previstos = dele.map((o) => o.previstoGravado ?? sugerido.get(o.id) ?? null).filter((v): v is number => v !== null);
      const gasto = lista
        .filter((g) => g.objetivoId && objetivoPor.get(g.objetivoId)?.capitulo.id === c.id)
        .reduce((t, g) => t + g.total, 0);
      // em centenas: é um norte para ela, não um número de planilha
      const previsto = previstos.length ? Math.round(previstos.reduce((t, v) => t + v, 0) / 100) * 100 : null;
      return { id: c.id, nome: c.nome, gasto, previsto };
    })
    .filter((c) => c.gasto > 0 || (c.previsto ?? 0) > 0);
  const semCapitulo = lista.filter((g) => !g.objetivoId || !objetivoPor.has(g.objetivoId)).reduce((t, g) => t + g.total, 0);
  if (semCapitulo > 0) capitulos.push({ id: "sem-capitulo", nome: "Sem capítulo", gasto: semCapitulo, previsto: null });

  const assuntos = [...CAPITULOS, OUTROS]
    .map((c) => ({
      capitulo: c.nome,
      opcoes: objetivos
        .filter((o) => o.ativo && o.capitulo.id === c.id)
        .sort((a, b) => c.codigos.indexOf(a.codigo ?? "") - c.codigos.indexOf(b.codigo ?? ""))
        .map((o) => ({ id: o.id, nome: o.nome })),
    }))
    .filter((g) => g.opcoes.length > 0);

  return {
    verba,
    gastos,
    pago,
    falta: Math.max(0, gastos - pago),
    livre: verba === null ? null : verba - gastos,
    proximos: itens.filter((i) => !i.pagoEm).map((i) => pagamento(i, hoje, true)),
    lista: lista.sort((a, b) => b.total - a.total),
    capitulos,
    assuntos,
    fornecedores: ((fornecedoresBrutos ?? []) as { name: string }[]).map((f) => f.name),
    hoje,
  };
}
