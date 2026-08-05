// Tipos e cálculos PUROS da tela de Organização (4B) — client-safe, sem
// import de servidor. A query que lê o banco vive em
// organizacao-query.ts, para o componente client poder usar itensDoMes()
// sem arrastar código server-only para o bundle.

export type TarefaStatus = "pendente" | "em_andamento" | "concluido";

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  dueDate: string | null;
  dueTime: string | null;
  status: TarefaStatus;
  priority: string | null;
  category: string | null;
};

// Compromisso já com o shape que a futura tabela deve ter — a tela não
// muda quando o dado real chegar, só para de vir vazio.
export type Compromisso = {
  id: string;
  titulo: string;
  data: string; // yyyy-mm-dd
  hora: string | null;
  local: string | null;
  responsavel: string | null;
};

export type ItemCalendario = {
  tipo: "tarefa" | "compromisso";
  id: string;
  data: string;
  hora: string | null;
  titulo: string;
};

export type Organizacao = {
  diasAteEvento: number | null;
  dataEvento: string | null;
  tarefas: Tarefa[];
  tarefasAbertas: number;
  compromissos: Compromisso[];
  // já pronto para a tabela de compromisso; hoje sempre false.
  agendaDisponivel: boolean;
};

// Itens de um mês para a grade do Calendário: compromissos (comparecer) +
// tarefas com vencimento (fazer). Puro, testável à parte.
export function itensDoMes(
  org: Organizacao,
  ano: number,
  mes: number // 0-11
): Map<number, ItemCalendario[]> {
  const mapa = new Map<number, ItemCalendario[]>();
  const push = (dia: number, item: ItemCalendario) => {
    const arr = mapa.get(dia) ?? [];
    arr.push(item);
    mapa.set(dia, arr);
  };

  for (const c of org.compromissos) {
    const d = new Date(`${c.data}T00:00:00`);
    if (d.getFullYear() === ano && d.getMonth() === mes) {
      push(d.getDate(), {
        tipo: "compromisso",
        id: c.id,
        data: c.data,
        hora: c.hora,
        titulo: c.titulo,
      });
    }
  }
  for (const t of org.tarefas) {
    if (!t.dueDate) continue;
    const d = new Date(`${t.dueDate}T00:00:00`);
    if (d.getFullYear() === ano && d.getMonth() === mes) {
      push(d.getDate(), {
        tipo: "tarefa",
        id: t.id,
        data: t.dueDate,
        hora: t.dueTime,
        titulo: t.titulo,
      });
    }
  }
  return mapa;
}
