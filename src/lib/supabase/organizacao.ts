// Tipos e cálculos PUROS da tela de Organização (4B) — client-safe, sem
// import de servidor. A query que lê o banco vive em
// organizacao-query.ts, para o componente client poder usar itensDoMes()
// sem arrastar código server-only para o bundle.

// Valores do CHECK real (003): em_progresso, não "em_andamento".
export type TarefaStatus = "pendente" | "em_progresso" | "concluido";

export type ChecklistItem = {
  id: string;
  texto: string;
  feito: boolean;
  ordem: number;
};

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  dueDate: string | null;
  dueTime: string | null;
  status: TarefaStatus;
  priority: string | null;
  category: string | null;
  responsavel: string | null;
  // Rastreabilidade (4C): a cadeia Objetivo → Decisão que gerou a tarefa.
  // null = tarefa manual, sem origem no método.
  origemDecisao: string | null;
  origemObjetivo: string | null;
  decisaoId: string | null;
  // Vínculo real com outro módulo: esta tarefa alimenta a Execução (roteiro
  // do dia) ou entra no Financeiro. O selo vira um atalho para lá.
  vinculoModulo: "execucao" | "financeiro" | null;
  // Campos operacionais (076)
  supplierId: string | null;
  supplierNome: string | null;
  local: string | null;
  valor: number | null;
  // A SEGUNDA data: quando o convite ao fornecedor sai (Secretário).
  // offset = "N dias antes do evento"; null = data manual (Editar data).
  conviteData: string | null;
  conviteOffsetDias: number | null;
  prazoRespostaDias: number;
  reenvioHoras: number;
  autoAgendar: boolean;
  duracaoMin: number;
  canalConvite: "whatsapp" | "email";
  // convite mais recente (se houver): estado do disparo
  convite: {
    id: string;
    status:
      | "enviado"
      | "reenviado"
      | "respondido"
      | "expirado"
      | "cancelado"
      | "sugerido";
    enviadoEm: string;
    prazoAte: string;
    sugestaoData: string | null;
    sugestaoHora: string | null;
  } | null;
  checklist: ChecklistItem[];
  criadaEm: string | null;
};

// Linha da Central de Disparos: o que o Secretário fez/vai fazer.
export type Disparo = {
  id: string;
  tarefa: string;
  taskId: string;
  fornecedor: string | null;
  status:
    | "agendado"
    | "enviado"
    | "reenviado"
    | "respondido"
    | "expirado"
    | "sugerido";
  // data de referência: convite_data (agendado) ou enviado_em (demais)
  data: string;
};

export type CompromissoEstado =
  | "agendado"
  | "confirmado"
  | "cancelado"
  | "remarcado";

// Um COMPROMISSO é um evento no tempo com hora marcada (comparecer),
// distinto da tarefa (executar). Pode ter fornecedor vinculado e nasce de
// uma decisão/tarefa.
export type Compromisso = {
  id: string;
  titulo: string;
  data: string; // yyyy-mm-dd
  hora: string | null;
  local: string | null;
  responsavel: string | null;
  estado: CompromissoEstado;
  observacao: string | null;
  // fornecedor vinculado (para confirmar por WhatsApp)
  supplierId: string | null;
  supplierNome: string | null;
  supplierWhatsapp: string | null;
  origemDecisao: string | null; // título da decisão/tarefa de origem
};

// Pendência financeira aberta pela automação ao concluir uma tarefa de
// dinheiro. É rascunho: só vira lançamento quando a cerimonialista confirma.
export type PendenciaFinanceira = {
  id: string;
  titulo: string;
  tipo: "pagamento" | "revisao";
  criadaEm: string;
};

export type Organizacao = {
  diasAteEvento: number | null;
  dataEvento: string | null;
  tarefas: Tarefa[];
  tarefasAbertas: number;
  compromissos: Compromisso[];
  agendaDisponivel: boolean;
  // pendências financeiras abertas (esperando confirmação)
  pendencias: PendenciaFinanceira[];
  // Central de Disparos (Secretário): convites programados e enviados
  disparos: Disparo[];
};

// Marco temporal derivado das datas ("3M antes", "D-7", "vencida") — puro,
// calculado na leitura; não é coluna (seria redundância que dessincroniza).
export function marcoTemporal(
  dueDate: string | null,
  dataEvento: string | null,
  concluida: boolean
): { label: string; vencida: boolean } {
  if (!dueDate) return { label: "sem prazo", vencida: false };
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  const hoje = new Date(new Date().toDateString()).getTime();
  if (!concluida && due < hoje) return { label: "vencida", vencida: true };
  if (!dataEvento) return { label: "no prazo", vencida: false };
  const evento = new Date(`${dataEvento}T00:00:00`).getTime();
  const diasAntesEvento = Math.round((evento - due) / 86_400_000);
  if (diasAntesEvento <= 0) return { label: "dia do evento", vencida: false };
  if (diasAntesEvento <= 7) return { label: `D-${diasAntesEvento}`, vencida: false };
  if (diasAntesEvento <= 45)
    return { label: `${Math.ceil(diasAntesEvento / 7)}S antes`, vencida: false };
  return { label: `${Math.round(diasAntesEvento / 30)}M antes`, vencida: false };
}
