import "server-only";

// O levantamento da semana do evento (21/10/2026). Tudo pela SESSÃO dela:
// a RLS decide o que ela enxerga. Os telefones lidos aqui servem só para o
// botão do WhatsApp na tela dela; NUNCA vão para a IA (o levantamento que
// sai para a instrução não leva telefone nem link).

import { createClient } from "@/lib/supabase/server";
import { hhmm } from "@/lib/ia-roteiro";
import type { FornecedorDaSemana, LevantamentoDaSemana, ParcelaDaSemana, PendenciaDaNoiva } from "@/lib/ia-semana";

type Sessao = ReturnType<typeof createClient>;
type Um<T> = T | T[] | null;
const um = <T,>(v: Um<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

async function lerLinks(supabase: Sessao, eventId: string) {
  const base = "supplier_id, hash, confirmed, suppliers(id, name, whatsapp, phone)";
  const r = await supabase.from("roteiro_links").select(`${base}, roteiro_enviado_em`).eq("event_id", eventId);
  if (!r.error || (r.error.code !== "42703" && r.error.code !== "PGRST204")) return r;
  return supabase.from("roteiro_links").select(base).eq("event_id", eventId);
}

export async function lerLevantamentoDaSemana(
  supabase: Sessao,
  eventId: string,
  base: string,
  hoje: string
): Promise<LevantamentoDaSemana | null> {
  const { data: ev } = await supabase
    .from("events")
    .select("id, name, date, time, location, clients(name, phone, whatsapp)")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev) return null;
  const e = ev as unknown as {
    id: string;
    name: string | null;
    date: string;
    time: string | null;
    location: string | null;
    clients: Um<{ name: string | null; phone: string | null; whatsapp: string | null }>;
  };
  const cliente = um(e.clients);

  const [links, confs, cronograma, decisoes, tarefas, aguardando, confirmados, parcelas] = await Promise.all([
    lerLinks(supabase, eventId),
    supabase.from("supplier_confirmations").select("supplier_id, status").eq("event_id", eventId),
    supabase.rpc("cronograma_evento", { p_event_id: eventId }),
    supabase
      .from("evento_decisao")
      .select("titulo, prazo_previsto, responsavel")
      .eq("event_id", eventId)
      .eq("estado", "pendente")
      .in("responsavel", ["noivos", "ambos"])
      .lte("prazo_previsto", e.date)
      .order("prazo_previsto", { ascending: true })
      .limit(12),
    supabase.from("tasks").select("title, due_date, responsavel, status").eq("event_id", eventId).neq("status", "concluido").limit(300),
    supabase.from("evento_convidado").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("confirmacao", "aguardando"),
    supabase.from("evento_convidado").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("confirmacao", "confirmado"),
    supabase
      .from("transactions")
      .select("description, value, due_date, type, conta, paid")
      .eq("event_id", eventId)
      .eq("paid", false)
      .lte("due_date", e.date)
      .order("due_date", { ascending: true })
      .limit(30),
  ]);

  const confirmouPelaConfirmacao = new Set(
    ((confs.data ?? []) as { supplier_id: string; status: string }[]).filter((c) => c.status === "confirmado").map((c) => c.supplier_id)
  );
  const itens = (cronograma.data ?? []) as { time: string | null; title: string; description: string | null; supplier_id: string | null }[];

  const fornecedores: FornecedorDaSemana[] = (
    (links.data ?? []) as unknown as {
      supplier_id: string;
      hash: string;
      confirmed: boolean;
      roteiro_enviado_em?: string | null;
      suppliers: Um<{ id: string; name: string; whatsapp: string | null; phone: string | null }>;
    }[]
  )
    .filter((l) => um(l.suppliers))
    .map((l) => {
      const s = um(l.suppliers)!;
      return {
        supplierId: l.supplier_id,
        nome: s.name,
        telefone: s.whatsapp ?? s.phone,
        url: `${base}/eventos/${eventId}/roteiro/publico/${l.hash}`,
        confirmado: l.confirmed || confirmouPelaConfirmacao.has(l.supplier_id),
        enviado: !!l.roteiro_enviado_em,
        horarios: itens
          .filter((i) => i.supplier_id === l.supplier_id && hhmm(i.time))
          .map((i) => ({ horario: hhmm(i.time)!, titulo: i.title, descricao: i.description })),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const abertas = (tarefas.data ?? []) as { title: string; due_date: string | null; responsavel: string | null }[];
  const daNoiva: PendenciaDaNoiva[] = [
    ...((decisoes.data ?? []) as { titulo: string; prazo_previsto: string | null }[]).map((d) => ({ titulo: d.titulo, prazo: d.prazo_previsto })),
    ...abertas
      .filter((t) => t.responsavel === "noivos" || t.responsavel === "ambos")
      .filter((t) => !t.due_date || t.due_date <= e.date)
      .map((t) => ({ titulo: t.title, prazo: t.due_date })),
  ].slice(0, 12);

  const linhas = (parcelas.data ?? []) as { description: string | null; value: number; due_date: string | null; type: string; conta: string | null }[];
  const lista: ParcelaDaSemana[] = linhas.map((p) => ({
    descricao: (p.description ?? (p.type === "receita" ? "Parcela" : "Pagamento")).slice(0, 120),
    valor: Number(p.value) || 0,
    vencimento: p.due_date,
    tipo: p.type === "receita" ? "receber" : "pagar",
    vencida: !!p.due_date && p.due_date < hoje,
  }));

  return {
    evento: {
      id: e.id,
      nome: e.name?.trim() || cliente?.name || "o evento",
      data: e.date,
      hora: hhmm(e.time),
      local: e.location,
    },
    cliente: { nome: cliente?.name ?? null, telefone: cliente?.whatsapp ?? cliente?.phone ?? null },
    fornecedores,
    daNoiva,
    rsvp: { aguardando: aguardando.count ?? 0, confirmados: confirmados.count ?? 0 },
    parcelas: lista,
    tarefasAbertas: abertas.map((t) => t.title),
  };
}
