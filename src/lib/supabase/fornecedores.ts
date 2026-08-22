// Queries server-side do FORNECEDOR ISOLADO: a ficha em /fornecedores/[id]
// e o histórico dela. CRUD fica nas server actions.
//
// A LISTAGEM não mora mais aqui: a tela nova lê tudo de uma vez em
// fornecedores-tela.ts e filtra no cliente, então busca por ilike,
// paginação em memória e contagem de categorias no servidor saíram junto
// com a tela que as usava.

import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import type { Fornecedor } from "@/lib/fornecedores-shared";

const COLUMNS =
  "id, name, descricao, tipo_operacional, status, faixa_preco, phone, whatsapp, email, cpf, endereco, cidade";

type Row = Omit<Fornecedor, "categorias"> & {
  supplier_categorias: { categoria: string }[] | null;
};

function mapRow(row: unknown): Fornecedor {
  const r = row as Row;
  return {
    id: r.id,
    name: r.name,
    descricao: r.descricao,
    tipo_operacional: r.tipo_operacional,
    status: r.status,
    faixa_preco: r.faixa_preco,
    phone: r.phone,
    whatsapp: r.whatsapp,
    email: r.email,
    cpf: r.cpf,
    endereco: r.endereco,
    cidade: r.cidade,
    categorias: (r.supplier_categorias ?? []).map((c) => c.categoria),
  };
}

export async function getFornecedor(id: string): Promise<Fornecedor | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("suppliers")
    .select(`${COLUMNS}, supplier_categorias(categoria)`)
    .eq("id", id)
    .maybeSingle();
  return data ? mapRow(data) : null;
}

// ------------------------------------------------------------
// Histórico do fornecedor (página de detalhe) — dados reais via
// roteiro_links (vínculo evento↔fornecedor). Nada de mock.
// ------------------------------------------------------------

export type EventoDoFornecedor = {
  id: string;
  label: string;
  date: string;
  status: string;
  confirmado: boolean;
  futuro: boolean;
};

export type HistoricoFornecedor = {
  eventosAtendidos: number;
  proximoEvento: EventoDoFornecedor | null;
  ultimoEvento: EventoDoFornecedor | null;
  // % de eventos em que o fornecedor confirmou presença (roteiro_links.confirmed).
  // null quando não há eventos (não faz sentido calcular).
  taxaConfirmacao: number | null;
  totalConfirmados: number;
  eventos: EventoDoFornecedor[];
  /** o que já foi lançado no Financeiro com este fornecedor, somando
   *  todos os eventos dela — é o "valor praticado" que ela usa para
   *  negociar o próximo, e vivia trancado na aba Financeiro de cada evento */
  dinheiro: {
    total: number;
    pago: number;
    aberto: number;
    eventosComValor: number;
    /** média por evento em que houve lançamento, não por evento atendido */
    medioPorEvento: number | null;
  };
};

export async function getHistoricoFornecedor(
  supplierId: string
): Promise<HistoricoFornecedor> {
  const supabase = createClient();
  const hoje = new Date();
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const { data } = await supabase
    .from("roteiro_links")
    .select("confirmed, events(id, type, date, status, clients(name))")
    .eq("supplier_id", supplierId);

  const rows = (data ?? []) as unknown as {
    confirmed: boolean;
    events: {
      id: string;
      type: EventType;
      date: string;
      status: string;
      clients: { name: string } | null;
    } | null;
  }[];

  const eventos: EventoDoFornecedor[] = rows
    .filter((r) => r.events)
    .map((r) => ({
      id: r.events!.id,
      label: `${EVENT_TYPE_LABELS[r.events!.type] ?? r.events!.type} — ${r.events!.clients?.name ?? "Sem cliente"}`,
      date: r.events!.date,
      status: r.events!.status,
      confirmado: r.confirmed,
      futuro: r.events!.date >= hojeIso,
    }))
    // Mais próximo/recente primeiro: futuros ascendentes, depois passados desc.
    .sort((a, b) => {
      if (a.futuro !== b.futuro) return a.futuro ? -1 : 1;
      return a.futuro
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    });

  // O dinheiro atravessa os eventos, como o fornecedor. RLS já limita à
  // empresa dela, então somar aqui é somar o que é dela.
  const { data: lancamentos } = await supabase
    .from("transactions")
    .select("event_id, value, paid")
    .eq("supplier_id", supplierId)
    .eq("type", "despesa");

  let total = 0;
  let pago = 0;
  const eventosComLancamento = new Set<string>();
  for (const t of lancamentos ?? []) {
    const valor = Number(t.value) || 0;
    total += valor;
    if (t.paid) pago += valor;
    if (t.event_id) eventosComLancamento.add(t.event_id);
  }

  const futuros = eventos.filter((e) => e.futuro);
  const passados = eventos.filter((e) => !e.futuro);
  const totalConfirmados = eventos.filter((e) => e.confirmado).length;

  return {
    eventosAtendidos: eventos.length,
    proximoEvento: futuros[0] ?? null,
    ultimoEvento: passados[0] ?? null,
    taxaConfirmacao:
      eventos.length > 0
        ? Math.round((totalConfirmados / eventos.length) * 100)
        : null,
    totalConfirmados,
    eventos,
    dinheiro: {
      total,
      pago,
      aberto: total - pago,
      eventosComValor: eventosComLancamento.size,
      medioPorEvento:
        eventosComLancamento.size > 0
          ? Math.round(total / eventosComLancamento.size)
          : null,
    },
  };
}
