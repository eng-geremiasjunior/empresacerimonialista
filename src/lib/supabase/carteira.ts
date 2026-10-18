import "server-only";

// A Carteira da cerimonialista (18/10/2026, pedido dele: "essas pessoas só
// migram pra algo que gera valor $$"). O dinheiro DELA, num lugar só, e só
// número real:
//   - o que ela tem a receber das clientes (parcelas da assessoria, 167);
//   - o que já recebeu, no mês e no ano;
//   - o que fechou pelos pedidos da vitrine (165);
//   - a parte dela na lista de presentes (197/198).
// Só a proprietária. Os presentes pagos não são legíveis pela sessão dela
// (a regra de 197 é só da família), então essa parte vem pela chave de
// serviço, filtrada pela empresa da sessão — e só depois do cargo conferido.

import { createClient } from "@/lib/supabase/server";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { servico } from "@/lib/supabase/admin-painel";
import { comissaoDaCerimonialista } from "@/lib/lista-presentes";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { fimDoMesBR, hojeBR, inicioDoMesBR } from "@/lib/tempo";

export type ParcelaDaCarteira = {
  descricao: string;
  evento: string;
  eventId: string | null;
  valor: number;
  vencimento: string | null;
  atrasada: boolean;
};

export type Carteira = {
  aReceber: number;
  /** o que vence até o fim deste mês (inclui o atrasado) */
  aReceberMes: number;
  atrasado: number;
  proximas: ParcelaDaCarteira[];
  recebidoMes: number;
  recebidoAno: number;
  vitrine: { contratos: number; valor: number };
  presentes: { quantidade: number; comissao: number; porEvento: { evento: string; valor: number }[] };
};

type Ev = { name: string | null; type: EventType; clients: { name: string } | null } | null;
const nomeDo = (e: Ev) => (e ? e.name || e.clients?.name || EVENT_TYPE_LABELS[e.type] || "Evento" : "Sem evento");

export async function getCarteira(): Promise<Carteira | null> {
  const { cargo, empresaId } = await getMeuCargo();
  if (cargo !== "proprietaria" || !empresaId) return null;
  const supabase = createClient();
  const hoje = hojeBR();
  const inicioMes = inicioDoMesBR();
  const fimDoMes = fimDoMesBR();
  const inicioAno = `${hoje.slice(0, 4)}-01-01`;

  const [receitasR, vitrineR, presentesR] = await Promise.all([
    supabase
      .from("transactions")
      .select("description, value, due_date, paid, paid_at, event_id, events(name, type, clients(name))")
      .eq("type", "receita")
      .eq("conta", "assessoria")
      .limit(5000),
    supabase
      .from("orcamentos")
      .select("id, valor_total, orcamento_aceites(valor_total)")
      .not("pedido_id", "is", null)
      .eq("status", "aprovado")
      .limit(1000),
    (async () => {
      try {
        return await servico()
          .from("presente_pagamento")
          .select("taxa_centavos, total_centavos, taxa_cartao_centavos, events(name, type, clients(name))")
          .eq("empresa_id", empresaId)
          .eq("status", "pago")
          .limit(5000);
      } catch {
        return { data: [], error: null };
      }
    })(),
  ]);

  // ---- clientes: a receber e recebido ----
  const receitas = (receitasR.error ? [] : receitasR.data ?? []) as unknown as {
    description: string | null;
    value: number | string;
    due_date: string | null;
    paid: boolean;
    paid_at: string | null;
    event_id: string | null;
    events: Ev;
  }[];
  const abertas = receitas
    .filter((r) => !r.paid)
    .map((r) => ({
      descricao: r.description?.trim() || "Parcela da cliente",
      evento: nomeDo(r.events),
      eventId: r.event_id,
      valor: Number(r.value || 0),
      vencimento: r.due_date,
      atrasada: !!r.due_date && r.due_date < hoje,
    }))
    .sort((a, b) => (a.vencimento ?? "9999").localeCompare(b.vencimento ?? "9999"));
  const pagas = receitas.filter((r) => r.paid);
  const dataDoPagamento = (r: (typeof receitas)[number]) => (r.paid_at ?? r.due_date ?? "").slice(0, 10);
  const soma = (xs: { valor?: number; value?: number | string }[]) =>
    xs.reduce((s, x) => s + Number(x.valor ?? x.value ?? 0), 0);

  // ---- vitrine ----
  const vitrine = (vitrineR.error ? [] : vitrineR.data ?? []) as unknown as {
    valor_total: number | null;
    orcamento_aceites: { valor_total: number | null }[] | { valor_total: number | null } | null;
  }[];
  const valorDoAceite = (o: (typeof vitrine)[number]) => {
    const a = Array.isArray(o.orcamento_aceites) ? o.orcamento_aceites[0] : o.orcamento_aceites;
    return Number(a?.valor_total ?? o.valor_total ?? 0);
  };

  // ---- presentes ----
  const pagos = (presentesR.error ? [] : presentesR.data ?? []) as unknown as {
    taxa_centavos: number;
    total_centavos: number;
    taxa_cartao_centavos: number | null;
    events: Ev;
  }[];
  const porEvento = new Map<string, number>();
  let comissao = 0;
  for (const p of pagos) {
    const c = comissaoDaCerimonialista(p) / 100;
    comissao += c;
    const nome = nomeDo(p.events);
    porEvento.set(nome, (porEvento.get(nome) ?? 0) + c);
  }

  return {
    aReceber: soma(abertas),
    aReceberMes: soma(abertas.filter((a) => !!a.vencimento && a.vencimento <= fimDoMes)),
    atrasado: soma(abertas.filter((a) => a.atrasada)),
    proximas: abertas.slice(0, 8),
    recebidoMes: soma(pagas.filter((r) => dataDoPagamento(r) >= inicioMes)),
    recebidoAno: soma(pagas.filter((r) => dataDoPagamento(r) >= inicioAno)),
    vitrine: { contratos: vitrine.length, valor: vitrine.reduce((s, o) => s + valorDoAceite(o), 0) },
    presentes: {
      quantidade: pagos.length,
      comissao,
      porEvento: [...porEvento.entries()].map(([evento, valor]) => ({ evento, valor })).sort((a, b) => b.valor - a.valor),
    },
  };
}
