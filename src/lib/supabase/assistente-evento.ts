// Contexto do assistente de IA — SEMPRE de um único evento.
//
// Segurança: usa o client de servidor (cookies + anon key), então a RLS
// vale. Se a cerimonialista não pode ver o evento, a consulta volta vazia
// e o assistente não tem o que responder. Nunca usar service-role aqui:
// isso furaria o isolamento entre empresas.
//
// Só LEITURA. O assistente responde sobre o evento; não cria nem altera
// nada (decisão de produto: automação é determinística, IA é consulta).

import { createClient } from "@/lib/supabase/server";

export type ContextoEvento = {
  ok: boolean;
  texto: string;
};

function linha(...partes: (string | null | undefined)[]) {
  return partes.filter(Boolean).join(" · ");
}

function dataBR(iso: string | null): string {
  if (!iso) return "sem data";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function moeda(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Monta um resumo textual do evento para o modelo. Compacto de propósito:
// o que a cerimonialista perguntaria no dia a dia.
export async function montarContextoEvento(
  eventId: string
): Promise<ContextoEvento> {
  const supabase = createClient();

  // A RLS decide se este usuário enxerga o evento.
  const { data: ev } = await supabase
    .from("events")
    .select("id, type, date, time, location, city, guests, contract_value, status, client_id")
    .eq("id", eventId)
    .single();

  if (!ev) {
    return { ok: false, texto: "" };
  }

  const [cliRes, decRes, tarRes, compRes, transRes, fornRes] = await Promise.all([
    ev.client_id
      ? supabase.from("clients").select("name, phone, whatsapp, email").eq("id", ev.client_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("evento_decisao")
      .select("id, titulo, estado, prazo_previsto, responsavel")
      .eq("event_id", eventId)
      .order("prioridade", { ascending: false }),
    supabase
      .from("tasks")
      .select("title, status, due_date, responsavel")
      .eq("event_id", eventId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("compromisso")
      .select("titulo, data, hora, local, estado")
      .eq("event_id", eventId)
      .order("data", { ascending: true }),
    supabase
      .from("transactions")
      .select("description, type, value, due_date, paid, conta")
      .eq("event_id", eventId)
      .order("due_date", { ascending: true }),
    supabase
      .from("event_suppliers")
      .select("role, suppliers(name, category, phone, whatsapp)")
      .eq("event_id", eventId),
  ]);

  const cliente = cliRes.data as { name: string; phone: string | null; whatsapp: string | null; email: string | null } | null;
  const decisoes = decRes.data ?? [];
  const tarefas = tarRes.data ?? [];
  const compromissos = compRes.data ?? [];
  const transacoes = transRes.data ?? [];
  const fornecedores = fornRes.data ?? [];

  const hoje = new Date(new Date().toDateString());
  const diasAte = ev.date
    ? Math.round(
        (new Date(`${ev.date}T00:00:00`).getTime() - hoje.getTime()) / 86_400_000
      )
    : null;

  // Tempo em linguagem humana: "faltam -21 dias" faria o modelo repetir o
  // absurdo. Evento passado é passado.
  const tempo =
    diasAte === null
      ? null
      : diasAte > 1
        ? `faltam ${diasAte} dias`
        : diasAte === 1
          ? "é amanhã"
          : diasAte === 0
            ? "é hoje"
            : `já aconteceu há ${Math.abs(diasAte)} dias`;

  const partes: string[] = [];

  partes.push(
    `EVENTO: ${ev.type}${cliente ? ` de ${cliente.name}` : ""}\n` +
      linha(
        `data ${dataBR(ev.date)}`,
        tempo,
        ev.time ? `início ${String(ev.time).slice(0, 5)}` : null,
        ev.location || ev.city,
        ev.guests ? `${ev.guests} convidados` : null,
        ev.contract_value ? `contrato ${moeda(ev.contract_value)}` : null,
        `status ${ev.status}`
      )
  );

  if (cliente) {
    partes.push(
      `CLIENTE: ${cliente.name} · ${linha(cliente.whatsapp || cliente.phone, cliente.email) || "sem contato"}`
    );
  }

  // O que cada decisão definiu: campos tipados preenchidos (5A), no lugar
  // do antigo texto livre "resultado".
  const { data: camposRaw } = await supabase
    .from("evento_campo_valor")
    .select(
      "evento_decisao_id, label, tipo, valor_texto, valor_numero, valor_bool, valor_data, valor_opcao"
    )
    .eq("event_id", eventId)
    .order("ordem");
  const respostasPorDec = new Map<string, string[]>();
  for (const c of camposRaw ?? []) {
    let v: string | null = null;
    if (c.tipo === "numero") v = c.valor_numero !== null ? String(c.valor_numero) : null;
    else if (c.tipo === "moeda") v = c.valor_numero !== null ? moeda(Number(c.valor_numero)) : null;
    else if (c.tipo === "sim_nao") v = c.valor_bool === null ? null : c.valor_bool ? "sim" : "não";
    else if (c.tipo === "data") v = c.valor_data ? dataBR(c.valor_data) : null;
    else if (c.tipo === "escolha") v = c.valor_opcao ? c.valor_opcao.replaceAll("_", " ") : null;
    else v = c.valor_texto;
    if (v === null) continue;
    const arr = respostasPorDec.get(c.evento_decisao_id) ?? [];
    arr.push(`${c.label}: ${v}`);
    respostasPorDec.set(c.evento_decisao_id, arr);
  }
  const respostas = (id: string): string => {
    const arr = respostasPorDec.get(id) ?? [];
    return arr.length > 0 ? ` (${arr.join("; ")})` : "";
  };

  const pendentes = decisoes.filter((d) => d.estado === "pendente");
  const decididas = decisoes.filter((d) => d.estado === "decidida");
  partes.push(
    `DECISÕES (${decididas.length} decididas, ${pendentes.length} pendentes):\n` +
      [
        ...decididas.map(
          (d) => `- [decidida] ${d.titulo}${respostas(d.id)}`
        ),
        ...pendentes.map(
          (d) =>
            `- [pendente] ${d.titulo}${d.prazo_previsto ? ` (decidir até ${dataBR(d.prazo_previsto)})` : ""} — responsável: ${d.responsavel}`
        ),
      ].join("\n")
  );

  const abertas = tarefas.filter((t) => t.status !== "concluido");
  partes.push(
    `TAREFAS (${abertas.length} abertas de ${tarefas.length}):\n` +
      abertas
        .slice(0, 40)
        .map(
          (t) =>
            `- ${t.title}${t.due_date ? ` (vence ${dataBR(t.due_date)})` : " (sem prazo)"}${t.responsavel ? ` — ${t.responsavel}` : ""}`
        )
        .join("\n")
  );

  if (compromissos.length) {
    partes.push(
      `AGENDA (compromissos):\n` +
        compromissos
          .map(
            (c) =>
              `- ${dataBR(c.data)}${c.hora ? ` ${String(c.hora).slice(0, 5)}` : ""} ${c.titulo}${c.local ? ` em ${c.local}` : ""} [${c.estado}]`
          )
          .join("\n")
    );
  }

  if (transacoes.length) {
    const receber = transacoes.filter((t) => t.type === "receita");
    const pagar = transacoes.filter((t) => t.type === "despesa");
    const soma = (arr: typeof transacoes, pago: boolean) =>
      arr.filter((t) => t.paid === pago).reduce((s, t) => s + Number(t.value || 0), 0);
    partes.push(
      `FINANCEIRO:\n` +
        `- a receber: ${moeda(soma(receber, false))} · já recebido: ${moeda(soma(receber, true))}\n` +
        `- a pagar: ${moeda(soma(pagar, false))} · já pago: ${moeda(soma(pagar, true))}\n` +
        transacoes
          .filter((t) => !t.paid)
          .slice(0, 20)
          .map(
            (t) =>
              `- [${t.type}] ${t.description ?? "sem descrição"} ${moeda(Number(t.value))} vence ${dataBR(t.due_date)} (${t.conta})`
          )
          .join("\n")
    );
  }

  if (fornecedores.length) {
    partes.push(
      `FORNECEDORES DO EVENTO:\n` +
        fornecedores
          .map((f) => {
            const s = f.suppliers as
              | { name: string; category: string | null; phone: string | null; whatsapp: string | null }
              | { name: string; category: string | null; phone: string | null; whatsapp: string | null }[]
              | null;
            const sup = Array.isArray(s) ? s[0] : s;
            if (!sup) return null;
            return `- ${sup.name}${f.role ? ` (${f.role})` : ""}${sup.category ? ` · ${sup.category}` : ""}${sup.whatsapp || sup.phone ? ` · ${sup.whatsapp || sup.phone}` : ""}`;
          })
          .filter(Boolean)
          .join("\n")
    );
  }

  return { ok: true, texto: partes.join("\n\n") };
}
