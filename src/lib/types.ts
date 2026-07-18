export type EventType =
  | "casamento"
  | "debutante"
  | "formatura"
  | "aniversario"
  | "corporativo"
  | "cha_revelacao"
  | "batizado"
  | "bodas"
  | "outro";

export type EventStatus = "orcamento" | "confirmado" | "concluido" | "cancelado";

export type Client = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  instagram: string | null;
  address: string | null;
  city: string | null;
  birthday: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Event = {
  id: string;
  client_id: string | null;
  type: EventType;
  date: string;
  location: string | null;
  status: EventStatus;
  clients: Client | null;
};

export type Supplier = {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
};

export type RoteiroStatus = "pendente" | "em_andamento" | "concluido";

export type RoteiroItem = {
  id: string;
  event_id: string;
  time: string | null;
  title: string;
  description: string | null;
  supplier_id: string | null;
  status: RoteiroStatus;
  suppliers: Pick<Supplier, "id" | "name"> | null;
};

// Status do cronograma dinâmico (Etapa 1 — status_novo em roteiro_items)
export type RoteiroStatusNovo =
  | "planejado"
  | "em_andamento"
  | "concluido"
  | "problema";

export type PublicRoteiroItem = {
  id: string;
  time: string | null;
  title: string;
  description: string | null;
  status: RoteiroStatus;
  status_novo: RoteiroStatusNovo;
  horario_real_inicio: string | null;
  horario_real_fim: string | null;
  observacao: string | null;
  responsavel_nome: string | null;
  etapa_obrigatoria: boolean;
};

export type PublicRoteiroData = {
  event: {
    type: EventType;
    date: string;
    location: string | null;
    client_name: string | null;
  };
  supplier: { name: string };
  items: PublicRoteiroItem[];
};

// Itens já mapeados para o Calendário (consulta em /calendario)
export type CalendarEventItem = {
  id: string;
  date: string; // yyyy-MM-dd
  type: EventType;
  status: EventStatus;
  client_name: string | null;
  location: string | null;
};

export type CalendarTaskItem = {
  id: string;
  date: string; // yyyy-MM-dd
  title: string;
  event_label: string | null;
};

export type TaskStatus = "pendente" | "em_progresso" | "concluido";

export type TaskPriority = "alta" | "media" | "baixa";

export type TaskCategory =
  | "som"
  | "buffet"
  | "decoracao"
  | "fotografia"
  | "bolo"
  | "cerimonia"
  | "transporte"
  | "geral"
  | "presente"
  | "vestiario";

export type TaskItem = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  events: {
    id: string;
    type: EventType;
    date: string;
    location: string | null;
    clients: { name: string } | null;
  } | null;
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: "Pendente",
  em_progresso: "Em progresso",
  concluido: "Concluído",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

// Ponto de cor dessaturado por prioridade (sem emoji).
export const TASK_PRIORITY_DOT: Record<TaskPriority, string> = {
  alta: "bg-red-500",
  media: "bg-amber-500",
  baixa: "bg-emerald-500",
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  som: "Som",
  buffet: "Buffet",
  decoracao: "Decoração",
  fotografia: "Fotografia",
  bolo: "Bolo",
  cerimonia: "Cerimônia",
  transporte: "Transporte",
  geral: "Geral",
  presente: "Presente",
  vestiario: "Vestiário",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  casamento: "Casamento",
  debutante: "Debutante",
  formatura: "Formatura",
  aniversario: "Aniversário",
  corporativo: "Corporativo",
  cha_revelacao: "Chá Revelação",
  batizado: "Batizado",
  bodas: "Bodas",
  outro: "Outro",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  orcamento: "Orçamento",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const ROTEIRO_STATUS_LABELS: Record<RoteiroStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};
