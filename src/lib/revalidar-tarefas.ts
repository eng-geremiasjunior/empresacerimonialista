import { revalidatePath } from "next/cache";

/**
 * As telas que mudam quando UMA tarefa muda.
 *
 * Existiam duas listas diferentes: a de tarefas/actions.ts revalidava
 * /tarefas, /calendario, o layout do evento e o painel; a de
 * organizacao/actions.ts — a que a Organização de fato usa — revalidava
 * só a própria aba. Resultado: ela marcava a tarefa como concluída na
 * Organização e o painel continuava contando, o calendário continuava
 * mostrando e o anel de saúde do evento continuava no número velho.
 *
 * Uma lista só, chamada dos dois lados.
 */
export function revalidarTarefas(eventId?: string) {
  // O layout raiz é onde nasce a frase do Copiloto da sidebar — sem
  // esta linha, concluir a última tarefa atrasada deixava "1 tarefa
  // atrasada" na tela até o F5.
  revalidatePath("/", "layout");
  revalidatePath("/tarefas");
  revalidatePath("/calendario");
  // O hub do evento (saúde, fases, Copiloto) e o painel.
  revalidatePath("/eventos/[id]", "layout");
  revalidatePath("/eventos/dashboard");
  if (eventId) revalidatePath(`/eventos/${eventId}/organizacao`);
}
