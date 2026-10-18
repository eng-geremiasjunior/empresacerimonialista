import "server-only";

// O evento inteiro numa leitura só (18/10/2026, pedido dele): alimenta a
// impressão do evento (/imprimir/evento) e o Panorama. Tudo pela sessão
// (RLS): cada cargo só recebe o que já enxerga. Falha numa parte vira parte
// vazia — a folha sai com o resto, nunca quebra.

import { createClient } from "@/lib/supabase/server";
import { getPlanejamento } from "@/lib/supabase/planejamento";
import { linhaDoFechado } from "@/lib/fechado";
import { assuntoDaDecisao } from "@/lib/assunto-da-tarefa";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { hojeBR } from "@/lib/tempo";

export type Dossie = {
  id: string;
  titulo: string;
  tipo: EventType;
  tipoLabel: string;
  data: string | null;
  hora: string | null;
  local: string | null;
  convidados: number | null;
  diasAte: number | null;
  cliente: { nome: string; telefone: string | null; email: string | null } | null;
  fornecedores: { nome: string; categoria: string | null; papel: string | null; contato: string | null }[];
  faltaContratar: string[];
  decididas: { assunto: string; linhas: { titulo: string; texto: string }[] }[];
  totalDecididas: number;
  faltam: { titulo: string; assunto: string; prazo: string | null }[];
  naoSeAplicam: number;
  tarefas: { titulo: string; prazo: string | null; atrasada: boolean }[];
  roteiro: { hora: string | null; titulo: string; responsavel: string | null }[];
  semResponsavel: number;
  cerimonia: { papel: string; nome: string; par: string | null; musica: string | null }[];
  convidadosRsvp: { total: number; confirmados: number; aguardando: number; naoVao: number };
  pagamentos: {
    recebido: number;
    aReceber: number;
    pago: number;
    aPagar: number;
    pendentes: { descricao: string; valor: number; vencimento: string | null; tipo: "receita" | "despesa" }[];
  };
  portal: { pessoas: number };
};

const PAPEL: Record<string, string> = {
  entrada: "Entrada",
  momento: "Momento",
  noiva: "Noiva",
  noivo: "Noivo",
  pais: "Pais",
  avos: "Avós",
  madrinha: "Madrinha",
  padrinho: "Padrinho",
  dama: "Dama",
  pajem: "Pajem",
  florista: "Florista",
  porta_alianca: "Porta-alianças",
  celebrante: "Celebrante",
  testemunha: "Testemunha",
  principe: "Príncipe",
  par_valsa: "Par da valsa",
  vela: "Vela",
  outro: "",
};

export async function getDossie(eventId: string): Promise<Dossie | null> {
  const supabase = createClient();
  const { data: ev } = await supabase
    .from("events")
    .select("id, name, type, date, time, location, city, guests, clients(name, phone, whatsapp, email)")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev) return null;
  const e = ev as unknown as {
    id: string;
    name: string | null;
    type: EventType;
    date: string | null;
    time: string | null;
    location: string | null;
    city: string | null;
    guests: number | null;
    clients: { name: string; phone: string | null; whatsapp: string | null; email: string | null } | null;
  };
  const hoje = hojeBR();
  const vazio = <T,>(r: { data: T[] | null; error: unknown }) => (r.error ? [] : r.data ?? []);

  const [planejamento, sups, etapasR, vinc, tarefasR, roteiroR, cortejoR, convR, txR, acessoR] = await Promise.all([
    getPlanejamento(eventId, e.date).catch(() => null),
    supabase.from("suppliers").select("id, name"),
    // as etapas (211): cotações, visitas e degustação entram na linha do fornecedor
    supabase.from("metodo_decisao").select("codigo, etapa_de").not("etapa_de", "is", null),
    supabase.from("event_suppliers").select("role, suppliers(name, category, phone, whatsapp)").eq("event_id", eventId),
    supabase.from("tasks").select("title, due_date, status").eq("event_id", eventId).neq("status", "concluido").order("due_date", { ascending: true, nullsFirst: false }).limit(200),
    supabase.from("roteiro_items").select("time, title, responsavel_nome, suppliers(name)").eq("event_id", eventId).order("time", { ascending: true, nullsFirst: false }).order("order", { ascending: true }),
    supabase.from("evento_cortejo_pessoa").select("papel, nome, par, musica, ordem").eq("event_id", eventId).order("ordem", { ascending: true }),
    supabase.from("evento_convidado").select("confirmacao").eq("event_id", eventId).limit(5000),
    supabase.from("transactions").select("type, value, paid, due_date, description").eq("event_id", eventId).limit(1000),
    supabase.from("evento_acesso").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "ativo"),
  ]);

  // ---- planejamento ----
  const fornecedoresPorId = new Map(((sups.data ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));
  const decididas: Dossie["decididas"] = [];
  const faltam: Dossie["faltam"] = [];
  const faltaContratar: string[] = [];
  let naoSeAplicam = 0;
  const paiDaEtapa = new Map(((etapasR.data ?? []) as { codigo: string; etapa_de: string }[]).map((x) => [x.codigo, x.etapa_de]));
  const anotadoNasEtapas = new Map<string, string[]>();
  for (const o of planejamento?.objetivos ?? [])
    for (const d of o.decisoes) {
      const pai = d.codigo ? paiDaEtapa.get(d.codigo) : undefined;
      if (!pai || d.estado !== "decidida") continue;
      const partes = linhaDoFechado(d, o.nome, fornecedoresPorId).partes;
      if (partes.length) anotadoNasEtapas.set(pai, [...(anotadoNasEtapas.get(pai) ?? []), ...partes]);
    }
  for (const o of [...(planejamento?.objetivos ?? [])].sort((a, b) => a.ordem - b.ordem)) {
    const linhas: { titulo: string; texto: string }[] = [];
    for (const d of [...o.decisoes].sort((a, b) => a.ordem - b.ordem)) {
      if (d.codigo && paiDaEtapa.has(d.codigo)) continue; // etapa: vai na linha do fornecedor
      if (d.estado === "nao_se_aplica") {
        naoSeAplicam++;
        continue;
      }
      if (d.estado === "decidida") {
        const extras = d.codigo ? anotadoNasEtapas.get(d.codigo) ?? [] : [];
        linhas.push({ titulo: d.titulo, texto: [...linhaDoFechado(d, o.nome, fornecedoresPorId).partes, ...extras].join(" · ") });
      } else {
        faltam.push({ titulo: d.titulo, assunto: o.nome, prazo: d.prazoPrevisto });
        if (assuntoDaDecisao(d.titulo)) faltaContratar.push(d.titulo);
      }
    }
    if (linhas.length) decididas.push({ assunto: o.nome, linhas });
  }
  faltam.sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));

  // ---- fornecedores vinculados ----
  const fornecedores = (vazio(vinc) as unknown as {
    role: string | null;
    suppliers: { name: string; category: string | null; phone: string | null; whatsapp: string | null } | null;
  }[])
    .filter((v) => v.suppliers)
    .map((v) => ({
      nome: v.suppliers!.name,
      categoria: v.suppliers!.category,
      papel: v.role,
      contato: v.suppliers!.whatsapp || v.suppliers!.phone || null,
    }))
    .sort((a, b) => (a.categoria ?? "").localeCompare(b.categoria ?? "") || a.nome.localeCompare(b.nome));

  // ---- tarefas, roteiro, cerimônia ----
  const tarefas = (vazio(tarefasR) as { title: string; due_date: string | null }[]).map((t) => ({
    titulo: t.title,
    prazo: t.due_date,
    atrasada: !!t.due_date && t.due_date < hoje,
  }));
  const roteiro = (vazio(roteiroR) as unknown as {
    time: string | null;
    title: string;
    responsavel_nome: string | null;
    suppliers: { name: string } | null;
  }[]).map((r) => ({
    hora: r.time?.slice(0, 5) ?? null,
    titulo: r.title,
    responsavel: r.suppliers?.name || r.responsavel_nome || null,
  }));
  const cerimonia = (vazio(cortejoR) as { papel: string; nome: string | null; par: string | null; musica: string | null }[])
    .filter((p) => (p.nome ?? "").trim())
    .map((p) => ({ papel: PAPEL[p.papel] ?? "", nome: p.nome!.trim(), par: p.par, musica: p.musica }));

  // ---- convidados ----
  const conv = vazio(convR) as { confirmacao: string | null }[];
  const convidadosRsvp = {
    total: conv.length,
    confirmados: conv.filter((c) => c.confirmacao === "confirmado").length,
    aguardando: conv.filter((c) => c.confirmacao === "aguardando" || !c.confirmacao).length,
    naoVao: conv.filter((c) => c.confirmacao === "nao_vai").length,
  };

  // ---- pagamentos ----
  const tx = vazio(txR) as { type: string; value: number | string; paid: boolean; due_date: string | null; description: string | null }[];
  const soma = (f: (t: (typeof tx)[number]) => boolean) => tx.filter(f).reduce((s, t) => s + Number(t.value || 0), 0);
  const pagamentos = {
    recebido: soma((t) => t.type === "receita" && t.paid),
    aReceber: soma((t) => t.type === "receita" && !t.paid),
    pago: soma((t) => t.type === "despesa" && t.paid),
    aPagar: soma((t) => t.type === "despesa" && !t.paid),
    pendentes: tx
      .filter((t) => !t.paid)
      .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
      .map((t) => ({
        descricao: t.description?.trim() || (t.type === "receita" ? "Parcela da cliente" : "Pagamento a fornecedor"),
        valor: Number(t.value || 0),
        vencimento: t.due_date,
        tipo: (t.type === "receita" ? "receita" : "despesa") as "receita" | "despesa",
      })),
  };

  const diasAte = e.date
    ? Math.round((Date.parse(`${e.date}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000)
    : null;
  const tipoLabel = EVENT_TYPE_LABELS[e.type] ?? "Evento";

  return {
    id: e.id,
    titulo: e.name || (e.clients?.name ? `${tipoLabel} — ${e.clients.name}` : tipoLabel),
    tipo: e.type,
    tipoLabel,
    data: e.date,
    hora: e.time?.slice(0, 5) ?? null,
    local: e.location || e.city,
    convidados: e.guests,
    diasAte,
    cliente: e.clients
      ? { nome: e.clients.name, telefone: e.clients.whatsapp || e.clients.phone, email: e.clients.email }
      : null,
    fornecedores,
    faltaContratar,
    decididas,
    totalDecididas: decididas.reduce((s, g) => s + g.linhas.length, 0),
    faltam,
    naoSeAplicam,
    tarefas,
    roteiro,
    semResponsavel: roteiro.filter((r) => !r.responsavel).length,
    cerimonia,
    convidadosRsvp,
    pagamentos,
    portal: { pessoas: acessoR.count ?? 0 },
  };
}

/** "faltam 192 dias" / "é hoje" / "realizado há 3 dias" */
export function quandoEmPalavras(dias: number | null): string {
  if (dias === null) return "sem data";
  if (dias > 1) return `faltam ${dias} dias`;
  if (dias === 1) return "é amanhã";
  if (dias === 0) return "é hoje";
  return `realizado há ${-dias} ${dias === -1 ? "dia" : "dias"}`;
}
