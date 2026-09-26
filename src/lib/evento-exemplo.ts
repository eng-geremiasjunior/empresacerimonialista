// O evento de exemplo (174, 23/09/2026 — pedido do dono): a conta nova não
// nasce vazia. No cadastro entra UM evento fictício (um casamento, ou os
// 15 anos para quem veio do anúncio de debutante), todo preenchido e
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

// Dois modelos (25/09/2026): o casamento de sempre e os 15 anos, para
// quem chega pelo anúncio de debutante (ou troca na faixa do exemplo).
export type ModeloDoExemplo = "casamento" | "debutante";

type FornecedorDoExemplo = { ref: string; name: string; categoria: string; palavras: string[] };

type Modelo = {
  cliente: string;
  /** o nome do evento: o portal tira dele de quem é a festa */
  nome: string;
  evento: {
    type: ModeloDoExemplo;
    dias: number;
    time: string;
    location: string;
    guests: number;
    contract_value: number;
    verba_total: number;
  };
  fornecedores: FornecedorDoExemplo[];
  /** o fornecedor cujo link ainda não foi confirmado */
  semConfirmar: string;
  // [hora, item, detalhe, fornecedor]
  roteiro: [string, string, string | null, string | null][];
  // [fornecedor, tipo de lançamento, descrição, valor, em quantos dias, pago]
  despesas: [string, "sinal" | "parcela", string, number, number, boolean][];
  nota: string;
  // [papel, nome, quem é / o que leva]
  cortejo: [string, string, string | null][];
};

const MODELOS: Record<ModeloDoExemplo, Modelo> = {
  casamento: {
    cliente: "Exemplo · Marina e Téo",
    nome: "Exemplo · Marina e Téo",
    evento: { type: "casamento", dias: 172, time: "17:00", location: "Villa Real", guests: 180, contract_value: 18500, verba_total: 92000 },
    fornecedores: [
      { ref: "buffet", name: "Buffet Aurora", categoria: "buffet", palavras: ["buffet", "jantar", "coquetel", "bolo", "comida"] },
      { ref: "decor", name: "Flor & Casa", categoria: "decoracao", palavras: ["decora", "montagem", "flor", "arranjo"] },
      { ref: "banda", name: "Banda Lume", categoria: "som", palavras: ["banda", "música", "musica", "dj", "som", "pista", "valsa"] },
      { ref: "foto", name: "Estúdio Luz", categoria: "fotografia", palavras: ["foto", "making", "vídeo", "video"] },
    ],
    semConfirmar: "foto",
    roteiro: [
      ["11:00", "Montagem da decoração", "Flores do altar e das mesas", "decor"],
      ["14:00", "Making of da noiva", "Hotel da Villa", "foto"],
      ["15:30", "Passagem de som", null, "banda"],
      ["16:30", "Entrada do buffet", "Montagem do coquetel", "buffet"],
      ["17:00", "Cerimônia", "Jardim da Villa Real", null],
      ["18:00", "Coquetel e fotos com a família", null, "foto"],
      ["20:15", "Jantar servido", null, "buffet"],
      ["21:30", "Abertura da pista", null, "banda"],
      ["00:30", "Encerramento e retirada", null, "decor"],
    ],
    despesas: [
      ["buffet", "sinal", "Buffet Aurora · sinal", 9500, -30, true],
      ["buffet", "parcela", "Buffet Aurora · parcela", 9500, 12, false],
      ["decor", "sinal", "Flor & Casa · sinal", 4500, -20, true],
      ["decor", "parcela", "Flor & Casa · parcela", 6500, 16, false],
      ["banda", "sinal", "Banda Lume · sinal", 3000, -15, true],
    ],
    nota: "Degustação: a noiva prefere o menu 2, sem frutos do mar.",
    cortejo: [],
  },
  debutante: {
    cliente: "Exemplo · 15 anos da Júlia",
    nome: "Exemplo · 15 anos da Júlia",
    evento: { type: "debutante", dias: 150, time: "20:00", location: "Casa Lírio", guests: 150, contract_value: 14500, verba_total: 70000 },
    fornecedores: [
      { ref: "buffet", name: "Buffet Aurora", categoria: "buffet", palavras: ["buffet", "jantar", "coquetel", "recepção", "recepcao", "drinks"] },
      { ref: "decor", name: "Flor & Casa", categoria: "decoracao", palavras: ["decora", "montagem", "painel", "flor"] },
      { ref: "dj", name: "DJ Lume", categoria: "dj", palavras: ["dj", "música", "musica", "som", "balada", "pista", "parabéns", "parabens"] },
      { ref: "danca", name: "Studio Passo", categoria: "coreografia", palavras: ["valsa", "ensaio", "coreografia"] },
      { ref: "foto", name: "Estúdio Luz", categoria: "fotografia", palavras: ["foto", "making", "vídeo", "video"] },
    ],
    semConfirmar: "foto",
    roteiro: [
      ["14:00", "Montagem da decoração", "Painel de fotos e mesa do bolo", "decor"],
      ["16:00", "Making of da debutante", "Cabelo, maquiagem e vestido da valsa", "foto"],
      ["18:30", "Ensaio da valsa no salão", null, "danca"],
      ["19:30", "Recepção dos convidados", "Coquetel e drinks sem álcool", "buffet"],
      ["20:30", "Entrada da debutante", "Com o pai, pela escada", null],
      ["20:45", "Valsa com o pai e o príncipe", null, "danca"],
      ["21:15", "Troca para o vestido da festa", null, null],
      ["21:40", "Cerimônia das 15 velas", null, null],
      ["22:15", "Jantar servido", null, "buffet"],
      ["23:30", "Parabéns e bolo", null, "dj"],
      ["23:45", "Abertura da balada", null, "dj"],
      ["03:00", "Encerramento e retirada", null, "decor"],
    ],
    despesas: [
      ["buffet", "sinal", "Buffet Aurora · sinal", 8000, -30, true],
      ["buffet", "parcela", "Buffet Aurora · parcela", 8000, 15, false],
      ["decor", "sinal", "Flor & Casa · sinal", 4000, -20, true],
      ["decor", "parcela", "Flor & Casa · parcela", 5500, 18, false],
      ["dj", "sinal", "DJ Lume · sinal", 2500, -15, true],
      ["danca", "sinal", "Studio Passo · sinal", 1200, -25, true],
    ],
    nota: "Reunião com a mãe: a Júlia quer entrar pela escada, com a valsa já tocando. Tema jardim encantado, lilás e dourado.",
    cortejo: [
      ["entrada", "Ricardo, o pai", null],
      ["principe", "Lucas Andrade", null],
      ["par_valsa", "Bia e Pedro", null],
      ["par_valsa", "Carol e Rafa", null],
      ["vela", "Lúcia", "avó"],
      ["vela", "Marta", "madrinha"],
      ["vela", "Helena", "melhor amiga"],
    ],
  },
};

/**
 * O modelo pelo anúncio de onde ela veio: campanha, conteúdo ou termo com
 * "debut", "debutante" ou "15 anos" levam ao exemplo de 15 anos.
 */
export function modeloPelaOrigem(origem: Record<string, string> | null | undefined): ModeloDoExemplo {
  const texto = origem
    ? [origem.utm_campaign, origem.utm_content, origem.utm_term, origem.utm_source].filter(Boolean).join(" ")
    : "";
  return /debut|15[s_-]*anos|quinze/i.test(texto) ? "debutante" : "casamento";
}

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
export async function criarEventoDeExemplo(
  empresaId: string,
  userId: string,
  modelo: ModeloDoExemplo = "casamento"
): Promise<string | null> {
  const db = servico();
  const m = MODELOS[modelo];
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
        name: m.cliente,
        city: "Itu",
        exemplo: true,
      })
      .select("id")
      .single();
    if (eCli || !cliente) throw new Error("cliente: " + (eCli?.message ?? "sem linha"));

    const idDoFornecedor: Record<string, string> = {};
    for (const f of m.fornecedores) {
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
        type: m.evento.type,
        name: m.nome,
        date: emDias(m.evento.dias),
        time: m.evento.time,
        location: m.evento.location,
        city: "Itu",
        guests: m.evento.guests,
        contract_value: m.evento.contract_value,
        verba_total: m.evento.verba_total,
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
          confirmed: r !== m.semConfirmar,
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
        m.roteiro.map(([time, title, description, ref], i) => ({
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
        const f = m.fornecedores.find((x) => x.palavras.some((p) => t.includes(p)));
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

    // o financeiro: a assessoria dela (30% de entrada e quatro parcelas,
    // a última perto da festa) e o dinheiro da família com fornecedores
    const agora = new Date().toISOString();
    const total = m.evento.contract_value;
    const entrada = Math.round(total * 30) / 100;
    const parcela = Math.round(((total - entrada) / 4) * 100) / 100;
    const lanc: (Record<string, unknown> & { supplier?: string })[] = [
      { type: "receita", conta: "assessoria", tipo_lancamento: "entrada", description: "Entrada", value: entrada, due_date: emDias(-40), paid: true, paid_at: agora },
      { type: "receita", conta: "assessoria", tipo_lancamento: "parcela", description: "Parcela 2", value: parcela, due_date: emDias(-10), paid: true, paid_at: agora, installment_number: 2, installment_total: 5 },
      { type: "receita", conta: "assessoria", tipo_lancamento: "parcela", description: "Parcela 3", value: parcela, due_date: emDias(20), paid: false, installment_number: 3, installment_total: 5 },
      { type: "receita", conta: "assessoria", tipo_lancamento: "parcela", description: "Parcela 4", value: parcela, due_date: emDias(50), paid: false, installment_number: 4, installment_total: 5 },
      { type: "receita", conta: "assessoria", tipo_lancamento: "saldo", description: "Saldo", value: parcela, due_date: emDias(m.evento.dias - 12), paid: false, installment_number: 5, installment_total: 5 },
      ...m.despesas.map(([ref, tipoLancamento, description, value, dias, pago]) => ({
        type: "despesa",
        conta: "fornecedor",
        tipo_lancamento: tipoLancamento,
        description,
        value,
        due_date: emDias(dias),
        paid: pago,
        ...(pago ? { paid_at: agora } : {}),
        supplier: ref,
      })),
    ];
    for (const l of lanc) {
      const { supplier, ...linha } = l;
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
      content: m.nota,
    });

    // a corte e as 15 velas (só a debutante traz): quem entra, e quem é
    if (m.cortejo.length) {
      await db.from("evento_cortejo_pessoa").insert(
        m.cortejo.map(([papel, nome, detalhe], i) => ({
          event_id: eventId,
          empresa_id: empresaId,
          papel,
          nome,
          o_que_leva: detalhe,
          ordem: (i + 1) * 10,
          origem: "equipe",
        }))
      );
    }

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
