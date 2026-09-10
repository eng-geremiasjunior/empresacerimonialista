// Domínio do Feed de Atividades.
// Lógica separada da interface: o ActivityFeed apenas renderiza o que
// receber. Quando o sistema de logs existir, cada ação importante grava
// uma Activity (em tabela própria) e o feed passa a ser alimentado por ela.

import { formatDate } from "@/lib/format";
import { hojeBR, somarDias } from "@/lib/tempo";

// ------------------------------------------------------------
// O calendário deste arquivo é o de Brasília, nos dois lados
// ------------------------------------------------------------
// Aqui morava `isToday`/`isYesterday`/`differenceInCalendarDays` do
// date-fns. Todos respondem pelo calendário LOCAL DO PROCESSO — e este
// arquivo roda nos dois: no servidor (Vercel, UTC) para gerar o HTML, e
// no navegador dela (Brasília) para hidratar.
//
// Medido em 10/09/2026, com o dev rodando em UTC para imitar a Vercel:
// duas atividades de 04/09 01:34 UTC (= 03/09 22:34 em Brasília) caíam
// em "Esta semana" no servidor e em "Este mês" no navegador. O navegador
// desenhava um grupo a mais, e o React derrubava a hidratação do
// dashboard inteiro — "Did not expect server HTML to contain a <div>".
//
// A regra do sistema já estava escrita em lib/tempo.ts: a cerimonialista
// trabalha em horário de Brasília, e o sistema também. Estas funções
// passam a usar a mesma régua.

/** O dia em Brasília de um instante qualquer, `yyyy-MM-dd`. */
function diaBR(iso: string | Date): string {
  return hojeBR(typeof iso === "string" ? new Date(iso) : iso);
}

/** Quantos dias de calendário separam dois `yyyy-MM-dd`. Sem fuso no meio. */
function diasEntre(depois: string, antes: string): number {
  const n = (s: string) => {
    const [a, m, d] = s.split("-").map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((n(depois) - n(antes)) / 86_400_000);
}

export type ActivityCategory =
  | "eventos"
  | "financeiro"
  | "orcamentos"
  | "clientes"
  | "fornecedores"
  | "checklist"
  | "sistema";

export type ActivityType =
  // Eventos
  | "evento_criado"
  | "evento_editado"
  | "evento_cancelado"
  | "evento_concluido"
  // Financeiro
  | "pagamento_recebido"
  | "pagamento_pendente"
  | "despesa_cadastrada"
  | "despesa_paga"
  // Orçamentos
  | "orcamento_criado"
  | "orcamento_enviado"
  | "orcamento_aprovado"
  | "orcamento_recusado"
  // Clientes
  | "cliente_criado"
  | "cliente_atualizado"
  // Fornecedores
  | "fornecedor_confirmado"
  | "fornecedor_cancelado"
  // Checklist
  | "tarefa_criada"
  | "tarefa_concluida"
  | "prazo_vencido"
  // Sistema
  | "login_realizado"
  | "backup_concluido"
  | "convite_enviado";

export type Activity = {
  id: string;
  category: ActivityCategory;
  type: ActivityType;
  title: string;
  description: string | null;
  eventId: string | null;
  eventName: string | null;
  createdAt: string; // ISO
  /** Sobrescrevem os padrões da categoria quando presentes. */
  icon?: string;
  color?: string;
};

export const ACTIVITY_TYPE_CATEGORY: Record<ActivityType, ActivityCategory> = {
  evento_criado: "eventos",
  evento_editado: "eventos",
  evento_cancelado: "eventos",
  evento_concluido: "eventos",
  pagamento_recebido: "financeiro",
  pagamento_pendente: "financeiro",
  despesa_cadastrada: "financeiro",
  despesa_paga: "financeiro",
  orcamento_criado: "orcamentos",
  orcamento_enviado: "orcamentos",
  orcamento_aprovado: "orcamentos",
  orcamento_recusado: "orcamentos",
  cliente_criado: "clientes",
  cliente_atualizado: "clientes",
  fornecedor_confirmado: "fornecedores",
  fornecedor_cancelado: "fornecedores",
  tarefa_criada: "checklist",
  tarefa_concluida: "checklist",
  prazo_vencido: "checklist",
  login_realizado: "sistema",
  backup_concluido: "sistema",
  convite_enviado: "sistema",
};

// Ícone e cor discreta por categoria (padrões; Activity.icon/color sobrescrevem).
export const ACTIVITY_CATEGORY_META: Record<
  ActivityCategory,
  { label: string; icon: string; chip: string }
> = {
  eventos: { label: "Eventos", icon: "📅", chip: "bg-rose-100 text-rose-700" },
  financeiro: {
    label: "Financeiro",
    icon: "💰",
    chip: "bg-emerald-100 text-emerald-700",
  },
  orcamentos: {
    label: "Orçamentos",
    icon: "📄",
    chip: "bg-amber-100 text-amber-700",
  },
  clientes: {
    label: "Clientes",
    icon: "👤",
    chip: "bg-violet-100 text-violet-700",
  },
  fornecedores: {
    label: "Fornecedores",
    icon: "🤝",
    chip: "bg-sky-100 text-sky-700",
  },
  checklist: { label: "Tarefas", icon: "✔️", chip: "bg-blue-100 text-blue-700" },
  sistema: { label: "Sistema", icon: "⚙️", chip: "bg-stone-200 text-stone-600" },
};

// ------------------------------------------------------------
// Tempo relativo ("há 20 min", "há 2 horas", "ontem", "há 3 dias")
// ------------------------------------------------------------

export function relativeTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const dia = diaBR(date);
  const hoje = diaBR(now);

  if (dia === hoje) {
    const hours = Math.floor(diffMinutes / 60);
    return `há ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }
  if (dia === somarDias(hoje, -1)) return "ontem";

  const days = diasEntre(hoje, dia);
  if (days <= 30) return `há ${days} dias`;
  return formatDate(iso.slice(0, 10));
}

// ------------------------------------------------------------
// Agrupamento por período
// ------------------------------------------------------------

export type ActivityGroup = { label: string; items: Activity[] };

const GROUP_ORDER = [
  "Hoje",
  "Ontem",
  "Esta semana",
  "Este mês",
  "Anteriores",
] as const;

function periodOf(activity: Activity, now: Date): (typeof GROUP_ORDER)[number] {
  const dia = diaBR(activity.createdAt);
  const hoje = diaBR(now);
  if (dia === hoje) return "Hoje";
  if (dia === somarDias(hoje, -1)) return "Ontem";
  if (diasEntre(hoje, dia) < 7) return "Esta semana";
  // mesmo mês, pelo calendário de Brasília — não pelo do processo
  if (dia.slice(0, 7) === hoje.slice(0, 7)) return "Este mês";
  return "Anteriores";
}

export function groupActivitiesByPeriod(
  activities: Activity[],
  now = new Date()
): ActivityGroup[] {
  const sorted = [...activities].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  const buckets = new Map<string, Activity[]>();
  for (const activity of sorted) {
    const label = periodOf(activity, now);
    const list = buckets.get(label) ?? [];
    list.push(activity);
    buckets.set(label, list);
  }

  return GROUP_ORDER.filter((label) => buckets.has(label)).map((label) => ({
    label,
    items: buckets.get(label)!,
  }));
}

// ------------------------------------------------------------
// Filtros rápidos do feed
// ------------------------------------------------------------

export type ActivityFilter = {
  value: string;
  label: string;
  categories: ActivityCategory[] | null; // null = todas
};

export const ACTIVITY_FILTERS: ActivityFilter[] = [
  { value: "todos", label: "Todos", categories: null },
  { value: "eventos", label: "Eventos", categories: ["eventos", "fornecedores"] },
  {
    value: "financeiro",
    label: "Financeiro",
    categories: ["financeiro", "orcamentos"],
  },
  { value: "clientes", label: "Clientes", categories: ["clientes"] },
  { value: "tarefas", label: "Tarefas", categories: ["checklist"] },
];
