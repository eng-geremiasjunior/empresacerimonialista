// Cronograma dinâmico (Etapa 3) — helpers puros do lado da cerimonialista.
// Cálculos client-safe: variação de horário (espelha a função SQL
// calcular_variacao_horario da Etapa 1), progresso do dia, próximos
// itens e alertas REAIS (sem IA).

import type { RoteiroStatusNovo } from "@/lib/types";

export type CronogramaItem = {
  id: string;
  time: string | null; // horário previsto (TIME "HH:MM:SS")
  title: string;
  description: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_categoria: string | null;
  status_novo: RoteiroStatusNovo;
  horario_real_inicio: string | null;
  horario_real_fim: string | null;
  observacao: string | null;
  responsavel_nome: string | null;
  responsavel_telefone: string | null;
  etapa_obrigatoria: boolean;
  duracao_minutos: number | null;
};

// ---- UI tokens por status (paleta dessaturada) ----
export const STATUS_UI: Record<
  RoteiroStatusNovo,
  { label: string; badge: string; border: string; dot: string }
> = {
  planejado: {
    label: "Pendente",
    badge: "bg-stone-100 text-stone-600",
    border: "border-l-stone-300",
    dot: "bg-stone-300",
  },
  em_andamento: {
    label: "Em andamento",
    badge: "bg-sky-50 text-sky-700",
    border: "border-l-sky-500",
    dot: "bg-sky-500",
  },
  concluido: {
    label: "Concluído",
    badge: "bg-emerald-50 text-emerald-700",
    border: "border-l-emerald-500",
    dot: "bg-emerald-500",
  },
  problema: {
    label: "Problema",
    badge: "bg-red-50 text-red-700",
    border: "border-l-red-500",
    dot: "bg-red-500",
  },
};

// Cor do badge de categoria (visual — paleta dessaturada). Agrupa por
// afinidade: decoração/flores=roxo, buffet=laranja, som/dj/banda=azul,
// foto/filmagem=rosa, celebrante/cerimonial=índigo, resto=neutro.
const CATEGORIA_CORES: Record<string, string> = {
  decoracao: "bg-purple-50 text-purple-700",
  flores: "bg-purple-50 text-purple-700",
  buffet: "bg-orange-50 text-orange-700",
  som: "bg-sky-50 text-sky-700",
  dj: "bg-sky-50 text-sky-700",
  banda: "bg-sky-50 text-sky-700",
  iluminacao: "bg-sky-50 text-sky-700",
  fotografia: "bg-pink-50 text-pink-700",
  filmagem: "bg-pink-50 text-pink-700",
  celebrante: "bg-indigo-50 text-indigo-700",
  mestre_cerimonias: "bg-indigo-50 text-indigo-700",
  cerimonial_religioso: "bg-indigo-50 text-indigo-700",
};

export function categoriaBadgeClass(slug: string | null): string {
  if (!slug) return "bg-stone-100 text-stone-600";
  return CATEGORIA_CORES[slug] ?? "bg-stone-100 text-stone-600";
}

// "HH:MM:SS" | "HH:MM" -> minutos desde 00:00
export function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Minutos locais (fuso do navegador, alinhado ao America/Sao_Paulo do
// usuário) de um timestamp ISO, no mesmo dia do evento.
function realMinutesFromISO(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export type Variacao =
  | { status: "antecipado" | "atrasado"; minutos: number }
  | { status: "no_horario"; minutos: 0 }
  | { status: "sem_dado" };

// Espelha calcular_variacao_horario (Etapa 1): compara o início real com
// o horário previsto (TIME + data do evento). Tolerância de 5 min.
export function calcularVariacao(
  previstoTime: string | null,
  realInicioISO: string | null
): Variacao {
  const previsto = timeToMinutes(previstoTime);
  if (previsto === null || !realInicioISO) return { status: "sem_dado" };
  const real = realMinutesFromISO(realInicioISO);
  const diff = real - previsto;
  if (diff < 0) return { status: "antecipado", minutos: Math.abs(diff) };
  if (diff > 5) return { status: "atrasado", minutos: diff };
  return { status: "no_horario", minutos: 0 };
}

// Frase sutil de variação para itens concluídos / em andamento.
export function fraseVariacao(
  v: Variacao,
  concluido: boolean
): { texto: string; cor: string } | null {
  if (v.status === "sem_dado") return null;
  const verbo = concluido ? "Concluído" : "Iniciado";
  if (v.status === "no_horario")
    return { texto: `${verbo} no horário previsto`, cor: "text-stone-500" };
  if (v.status === "antecipado")
    return {
      texto: `${verbo} ${v.minutos} min antes do previsto`,
      cor: "text-emerald-600",
    };
  return {
    texto: `${verbo} ${v.minutos} min depois do previsto`,
    cor: "text-amber-600",
  };
}

// ---- Progresso do dia ----
export function progressoDoDia(items: CronogramaItem[]): {
  pct: number;
  concluidos: number;
  total: number;
} {
  const total = items.length;
  const concluidos = items.filter((i) => i.status_novo === "concluido").length;
  const pct = total === 0 ? 0 : Math.round((concluidos / total) * 100);
  return { pct, concluidos, total };
}

// ---- Próximos itens (planejados, por horário) ----
export function proximosItens(
  items: CronogramaItem[],
  n = 3
): CronogramaItem[] {
  return items
    .filter((i) => i.status_novo === "planejado" && i.time)
    .sort((a, b) => (timeToMinutes(a.time)! - timeToMinutes(b.time)!))
    .slice(0, n);
}

// Contagem regressiva legível a partir de agora (client-side).
export function contagemRegressiva(
  previstoTime: string | null,
  nowMinutes: number
): string {
  const previsto = timeToMinutes(previstoTime);
  if (previsto === null) return "";
  const diff = previsto - nowMinutes;
  if (diff <= 0) return "agora";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `Em ${m} min`;
  return `Em ${h}h ${m}min`;
}

// ---- Alertas REAIS (não IA) ----
export type AlertaCronograma = {
  id: string;
  tipo: "problema" | "atraso";
  prioridade: number; // menor = mais urgente
  titulo: string;
  detalhe: string;
  itemId: string;
};

const ATRASO_MIN = 10;

export function alertasCronograma(
  items: CronogramaItem[],
  nowMinutes: number
): AlertaCronograma[] {
  const alertas: AlertaCronograma[] = [];

  for (const item of items) {
    // Prioridade máxima: problema reportado.
    if (item.status_novo === "problema") {
      alertas.push({
        id: `problema-${item.id}`,
        tipo: "problema",
        prioridade: 0,
        titulo: `${item.supplier_name ?? "Fornecedor"} reportou um problema`,
        detalhe: `"${item.title}"${item.observacao ? ` — ${item.observacao}` : ""}`,
        itemId: item.id,
      });
      continue;
    }
    // Atraso: planejado com horário previsto já passado há > 10 min.
    if (item.status_novo === "planejado") {
      const previsto = timeToMinutes(item.time);
      if (previsto !== null) {
        const atrasoMin = nowMinutes - previsto;
        if (atrasoMin > ATRASO_MIN) {
          alertas.push({
            id: `atraso-${item.id}`,
            tipo: "atraso",
            prioridade: 1,
            titulo: `"${item.title}" está atrasado`,
            detalhe: `Previsto para ${(item.time ?? "").slice(0, 5)} · há ${atrasoMin} min sem iniciar`,
            itemId: item.id,
          });
        }
      }
    }
  }

  return alertas.sort((a, b) => a.prioridade - b.prioridade);
}
