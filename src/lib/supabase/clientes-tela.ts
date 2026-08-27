// Leitura da tela de Clientes: uma passada, tudo em lote.
//
// Mesma arquitetura da tela de Fornecedores — a tela filtra no CLIENTE
// (busca ao digitar, sem ida ao servidor), então o servidor entrega a
// lista completa uma vez, já com o que o cadastro sozinho não sabe:
//
//   eventos    — nome, data e estado de cada um (alimenta relação,
//                a pílula "1 futuro" e o bloco EVENTOS do painel)
//   contatos   — cliente_contato (124): o último contato de verdade
//   contratado — honorários de assessoria lançados nos eventos dela
//
// Quatro consultas com `.in()` sobre o mesmo conjunto de ids. A RLS já
// limita tudo à empresa e ao cargo; nada aqui filtra por empresa à mão.

import { createClient } from "@/lib/supabase/server";
import { hojeBR } from "@/lib/tempo";
import {
  montarLinha,
  type ClienteLinha,
  type ContatoRegistrado,
  type EventoDoCliente,
} from "@/lib/clientes-lista";

const COLUNAS = "id, name, phone, whatsapp, email, city, notes, created_at";

export async function getClientesTela(): Promise<ClienteLinha[]> {
  const supabase = createClient();
  const hoje = hojeBR();

  const { data: clientesData, error } = await supabase
    .from("clients")
    .select(COLUNAS)
    .order("name", { ascending: true });

  if (error) {
    // Erro de leitura não pode virar "nenhum cliente" em silêncio — a
    // tela ficaria dizendo que o cadastro está vazio.
    console.error("[vela:clientes] leitura:", error.message);
    throw new Error("Não foi possível carregar os clientes.");
  }

  const clientes = (clientesData ?? []) as {
    id: string;
    name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    city: string | null;
    notes: string | null;
    created_at: string;
  }[];
  if (clientes.length === 0) return [];

  const ids = clientes.map((c) => c.id);

  const [eventosRes, contatosRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, client_id, name, date, status, type, archived")
      .in("client_id", ids)
      .order("date", { ascending: false }),
    supabase
      .from("cliente_contato")
      .select("client_id, em, canal, nota")
      .in("client_id", ids)
      .order("em", { ascending: false }),
  ]);

  // Falha na leitura de eventos NÃO pode degradar em silêncio: sem eles
  // todo cliente vira "lead", a coluna EVENTOS mostra "—" e a visão "Sem
  // evento" passa a contar o cadastro inteiro. Números plausíveis e
  // falsos, sem nada na tela dizendo que houve erro.
  if (eventosRes.error) {
    console.error("[vela:clientes] eventos:", eventosRes.error.message);
    throw new Error("Não foi possível carregar os eventos dos clientes.");
  }
  // A 124 é a exceção justificada: pode não estar aplicada ainda, e sem
  // ela a tela funciona com todo mundo "nunca contatada" — que é a verdade.
  if (contatosRes.error) console.error("[vela:clientes] contatos:", contatosRes.error.message);

  const eventos = (eventosRes.data ?? []) as {
    id: string;
    client_id: string;
    name: string | null;
    date: string | null;
    status: string;
    type: string;
    archived: boolean | null;
  }[];

  // Honorários por evento (conta 'assessoria'), somados por cliente.
  // É o que ELA faturou com essa pessoa — não o orçamento do casamento.
  const eventoIds = eventos.map((e) => e.id);
  const porEvento = new Map<string, number>();
  if (eventoIds.length > 0) {
    const { data: tx, error: erroTx } = await supabase
      .from("transactions")
      .select("event_id, value, type, conta")
      .in("event_id", eventoIds)
      .eq("conta", "assessoria")
      .eq("type", "receita");
    if (erroTx) {
      console.error("[vela:clientes] transactions:", erroTx.message);
      throw new Error("Não foi possível carregar os valores dos clientes.");
    }
    for (const t of (tx ?? []) as { event_id: string; value: number }[]) {
      porEvento.set(t.event_id, (porEvento.get(t.event_id) ?? 0) + Number(t.value));
    }
  }

  const eventosPorCliente = new Map<string, EventoDoCliente[]>();
  const contratadoPorCliente = new Map<string, number>();
  for (const e of eventos) {
    const lista = eventosPorCliente.get(e.client_id) ?? [];
    lista.push({
      id: e.id,
      nome: e.name,
      data: e.date,
      status: e.status,
      arquivado: e.archived === true,
    });
    eventosPorCliente.set(e.client_id, lista);
    // Valor contratado só de evento vivo: somar o de um cancelado ou
    // arquivado faria a métrica do painel contar dinheiro que não existe.
    const morto = e.status === "cancelado" || e.archived === true;
    const v = morto ? 0 : porEvento.get(e.id) ?? 0;
    if (v) {
      contratadoPorCliente.set(
        e.client_id,
        (contratadoPorCliente.get(e.client_id) ?? 0) + v
      );
    }
  }

  const contatosPorCliente = new Map<string, ContatoRegistrado[]>();
  for (const c of (contatosRes.data ?? []) as {
    client_id: string;
    em: string;
    canal: string;
    nota: string | null;
  }[]) {
    const lista = contatosPorCliente.get(c.client_id) ?? [];
    lista.push({ em: c.em, canal: c.canal, nota: c.nota });
    contatosPorCliente.set(c.client_id, lista);
  }

  return clientes.map((c) =>
    montarLinha(
      {
        id: c.id,
        nome: c.name,
        telefone: c.phone,
        whatsapp: c.whatsapp,
        email: c.email,
        cidade: c.city,
        anotacao: c.notes,
        cadastradaEm: c.created_at,
        eventos: eventosPorCliente.get(c.id) ?? [],
        contatos: contatosPorCliente.get(c.id) ?? [],
        contratado: contratadoPorCliente.get(c.id) ?? 0,
      },
      hoje
    )
  );
}
