// O evento de exemplo (174, 23/09/2026 — pedido do dono): a conta nova não
// nasce vazia. No cadastro entra UM casamento fictício, todo preenchido e
// marcado como exemplo, para ela ver como o eOrganizei fica com um evento
// de verdade. Ele some sozinho quando ela já passou pelas telas
// principais dele, ou quando ela clica em apagar.
//
// O exemplo não conta no plano, não entra no painel do dono, não manda
// nada a ninguém (sem e-mail, sem WhatsApp, cliente e fornecedores sem
// contato real) e não vai para o Google Agenda.

import "server-only";

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { hojeBR } from "@/lib/tempo";

/** As telas que ela precisa ter aberto para o exemplo sair de cena. */
export const AREAS_DO_EXEMPLO = [
  { area: "resumo", rotulo: "Resumo", caminho: "" },
  { area: "planejamento", rotulo: "Planejamento", caminho: "/planejamento" },
  { area: "fornecedores", rotulo: "Fornecedores", caminho: "/fornecedores" },
  { area: "roteiro", rotulo: "Roteiro do dia", caminho: "/roteiro" },
  { area: "financeiro", rotulo: "Financeiro", caminho: "/financeiro" },
  { area: "rsvp", rotulo: "Convidados", caminho: "/rsvp" },
] as const;

export type AreaDoExemplo = (typeof AREAS_DO_EXEMPLO)[number]["area"];

export function viuTudo(visto: string[] | null | undefined): boolean {
  const v = new Set(visto ?? []);
  return AREAS_DO_EXEMPLO.every((a) => v.has(a.area));
}

function servico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: {
      fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }),
    },
  });
}

function emDias(n: number): string {
  const [a, m, d] = hojeBR().split("-").map(Number);
  const x = new Date(a, m - 1, d + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

const FORNECEDORES = [
  { ref: "buffet", name: "Buffet Aurora", categoria: "buffet", palavras: ["buffet", "jantar", "coquetel", "bolo", "comida"] },
  { ref: "decor", name: "Flor & Casa", categoria: "decoracao", palavras: ["decora", "montagem", "flor", "arranjo"] },
  { ref: "banda", name: "Banda Lume", categoria: "som", palavras: ["banda", "música", "musica", "dj", "som", "pista", "valsa"] },
  { ref: "foto", name: "Estúdio Luz", categoria: "fotografia", palavras: ["foto", "making", "vídeo", "video"] },
] as const;

// [hora, item, detalhe, fornecedor]
const ROTEIRO: [string, string, string | null, string | null][] = [
  ["11:00", "Montagem da decoração", "Flores do altar e das mesas", "decor"],
  ["14:00", "Making of da noiva", "Hotel da Villa", "foto"],
  ["15:30", "Passagem de som", null, "banda"],
  ["16:30", "Entrada do buffet", "Montagem do coquetel", "buffet"],
  ["17:00", "Cerimônia", "Jardim da Villa Real", null],
  ["18:00", "Coquetel e fotos com a família", null, "foto"],
  ["20:15", "Jantar servido", null, "buffet"],
  ["21:30", "Abertura da pista", null, "banda"],
  ["00:30", "Encerramento e retirada", null, "decor"],
];

const CONVIDADOS: [string, "confirmado" | "aguardando" | "nao_vai", number][] = [
  ["Ana Souza", "confirmado", 1],
  ["Bruno Lima", "confirmado", 1],
  ["Carla Mendes", "confirmado", 0],
  ["Diego Rocha", "aguardando", 0],
  ["Elisa Farias", "confirmado", 2],
  ["Fábio Nunes", "aguardando", 1],
  ["Gabriela Torres", "confirmado", 1],
  ["Heitor Campos", "nao_vai", 0],
  ["Isabela Prado", "confirmado", 0],
  ["João Vieira", "aguardando", 1],
  ["Larissa Moura", "confirmado", 1],
  ["Marcos Pires", "confirmado", 0],
];

/**
 * Cria o exemplo da conta. Nunca derruba o cadastro: qualquer falha fica
 * no log e a conta segue sem exemplo.
 */
export async function criarEventoDeExemplo(empresaId: string, userId: string): Promise<string | null> {
  const db = servico();
  try {
    const { data: jaTem } = await db
      .from("events")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("exemplo", true)
      .limit(1);
    if (jaTem && jaTem.length) return jaTem[0].id as string;

    const { data: cliente, error: eCli } = await db
      .from("clients")
      .insert({
        cerimonialista_id: userId,
        empresa_id: empresaId,
        // o nome já diz que é exemplo em toda lista (eventos, dashboard, calendário)
        name: "Exemplo · Marina e Téo",
        city: "Itu",
        exemplo: true,
      })
      .select("id")
      .single();
    if (eCli || !cliente) throw new Error("cliente: " + (eCli?.message ?? "sem linha"));

    const idDoFornecedor: Record<string, string> = {};
    for (const f of FORNECEDORES) {
      const { data: s } = await db
        .from("suppliers")
        .insert({ cerimonialista_id: userId, empresa_id: empresaId, name: f.name, cidade: "Itu", exemplo: true })
        .select("id")
        .single();
      if (!s) continue;
      idDoFornecedor[f.ref] = s.id as string;
      await db.from("supplier_categorias").insert({ supplier_id: s.id, categoria: f.categoria });
    }

    const { data: evento, error: eEv } = await db
      .from("events")
      .insert({
        cerimonialista_id: userId,
        empresa_id: empresaId,
        client_id: cliente.id,
        type: "casamento",
        date: emDias(172),
        time: "17:00",
        location: "Villa Real",
        city: "Itu",
        guests: 180,
        contract_value: 18500,
        verba_total: 92000,
        status: "confirmado",
        // nada sai daqui para ninguém
        email_auto: false,
        whatsapp_auto: false,
        rsvp_aberto: false,
        exemplo: true,
      })
      .select("id")
      .single();
    if (eEv || !evento) throw new Error("evento: " + (eEv?.message ?? "sem linha"));
    const eventId = evento.id as string;

    // fornecedores no evento, com o link de cada um (um ainda sem confirmar)
    const refs = Object.keys(idDoFornecedor);
    if (refs.length) {
      await db.from("event_suppliers").insert(refs.map((r) => ({ event_id: eventId, supplier_id: idDoFornecedor[r] })));
      await db.from("roteiro_links").insert(
        refs.map((r) => ({
          event_id: eventId,
          supplier_id: idDoFornecedor[r],
          hash: randomBytes(16).toString("hex"),
          confirmed: r !== "foto",
        }))
      );
    }

    // o roteiro do dia: conta nova não tem modelo de roteiro, então o
    // exemplo traz o dele, com QUEM faz cada item
    const { count: jaTemRoteiro } = await db
      .from("roteiro_items")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);
    if (!jaTemRoteiro) {
      await db.from("roteiro_items").insert(
        ROTEIRO.map(([time, title, description, ref], i) => ({
          event_id: eventId,
          empresa_id: empresaId,
          time,
          title,
          description,
          supplier_id: ref ? idDoFornecedor[ref] ?? null : null,
          order: (i + 1) * 10,
        }))
      );
    } else {
      const { data: itens } = await db.from("roteiro_items").select("id, title").eq("event_id", eventId);
      for (const it of (itens ?? []) as { id: string; title: string }[]) {
        const t = it.title.toLowerCase();
        const f = FORNECEDORES.find((x) => x.palavras.some((p) => t.includes(p)));
        if (f && idDoFornecedor[f.ref]) {
          await db.from("roteiro_items").update({ supplier_id: idDoFornecedor[f.ref] }).eq("id", it.id);
        }
      }
    }

    // o planejamento andou: um terço das decisões, as de prazo mais cedo,
    // já está decidido (as tarefas que elas geram, com prazo passado,
    // ficam feitas)
    const { data: decisoes } = await db
      .from("evento_decisao")
      .select("id, prazo_previsto")
      .eq("event_id", eventId)
      .neq("estado", "nao_se_aplica")
      .order("prazo_previsto", { ascending: true, nullsFirst: false })
      .order("ordem", { ascending: true });
    const lista = (decisoes ?? []) as { id: string; prazo_previsto: string | null }[];
    const hoje = emDias(0);
    const decidir = lista.slice(0, Math.round(lista.length / 3)).map((d) => d.id);
    for (let i = 0; i < decidir.length; i += 40) {
      await db
        .from("evento_decisao")
        .update({ estado: "decidida", decidida_em: new Date().toISOString() })
        .in("id", decidir.slice(i, i + 40));
    }
    await db
      .from("tasks")
      .update({ status: "concluido" })
      .eq("event_id", eventId)
      .lt("due_date", hoje)
      .neq("status", "concluido");

    // o financeiro: a assessoria dela e o dinheiro do casal com fornecedores
    const agora = new Date().toISOString();
    const lanc = [
      { type: "receita", conta: "assessoria", tipo_lancamento: "entrada", description: "Entrada", value: 5550, due_date: emDias(-40), paid: true, paid_at: agora },
      { type: "receita", conta: "assessoria", tipo_lancamento: "parcela", description: "Parcela 2", value: 3237.5, due_date: emDias(-10), paid: true, paid_at: agora, installment_number: 2, installment_total: 5 },
      { type: "receita", conta: "assessoria", tipo_lancamento: "parcela", description: "Parcela 3", value: 3237.5, due_date: emDias(20), paid: false, installment_number: 3, installment_total: 5 },
      { type: "receita", conta: "assessoria", tipo_lancamento: "parcela", description: "Parcela 4", value: 3237.5, due_date: emDias(50), paid: false, installment_number: 4, installment_total: 5 },
      { type: "receita", conta: "assessoria", tipo_lancamento: "saldo", description: "Saldo", value: 3237.5, due_date: emDias(160), paid: false, installment_number: 5, installment_total: 5 },
      { type: "despesa", conta: "fornecedor", tipo_lancamento: "sinal", description: "Buffet Aurora · sinal", value: 9500, due_date: emDias(-30), paid: true, paid_at: agora, supplier: "buffet" },
      { type: "despesa", conta: "fornecedor", tipo_lancamento: "parcela", description: "Buffet Aurora · parcela", value: 9500, due_date: emDias(12), paid: false, supplier: "buffet" },
      { type: "despesa", conta: "fornecedor", tipo_lancamento: "sinal", description: "Flor & Casa · sinal", value: 4500, due_date: emDias(-20), paid: true, paid_at: agora, supplier: "decor" },
      { type: "despesa", conta: "fornecedor", tipo_lancamento: "parcela", description: "Flor & Casa · parcela", value: 6500, due_date: emDias(16), paid: false, supplier: "decor" },
      { type: "despesa", conta: "fornecedor", tipo_lancamento: "sinal", description: "Banda Lume · sinal", value: 3000, due_date: emDias(-15), paid: true, paid_at: agora, supplier: "banda" },
    ];
    for (const l of lanc) {
      const { supplier, ...linha } = l as typeof l & { supplier?: string };
      await db.from("transactions").insert({
        ...linha,
        event_id: eventId,
        empresa_id: empresaId,
        origem_pagamento: "cliente_direto",
        supplier_id: supplier ? idDoFornecedor[supplier] ?? null : null,
      });
    }

    // a lista de convidados, sem telefone nem e-mail (ninguém é avisado)
    await db.from("evento_convidado").insert(
      CONVIDADOS.map(([nome, confirmacao, acompanhantes]) => ({
        event_id: eventId,
        empresa_id: empresaId,
        nome,
        confirmacao,
        acompanhantes,
        origem: "equipe",
        confirmado_em: confirmacao === "aguardando" ? null : agora,
        confirmado_via: confirmacao === "aguardando" ? null : "manual",
      }))
    );

    // uma anotação, como ela faria depois de uma reunião
    await db.from("event_notes").insert({
      event_id: eventId,
      author_id: userId,
      content: "Degustação: a noiva prefere o menu 2, sem frutos do mar.",
    });

    return eventId;
  } catch (e) {
    console.error("[eorg:exemplo] criar:", String(e).slice(0, 300));
    return null;
  }
}

/** Apaga o exemplo da conta (evento, cliente e fornecedores do exemplo). */
export async function apagarEventoDeExemplo(empresaId: string): Promise<void> {
  const db = servico();
  await db.from("events").delete().eq("empresa_id", empresaId).eq("exemplo", true);
  await db.from("clients").delete().eq("empresa_id", empresaId).eq("exemplo", true);
  await db.from("suppliers").delete().eq("empresa_id", empresaId).eq("exemplo", true);
}
