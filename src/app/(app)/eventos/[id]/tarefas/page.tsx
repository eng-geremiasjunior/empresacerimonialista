import { redirect } from "next/navigation";

// Aba aposentada: as tarefas do evento vivem na Organização (fonte única —
// cada tarefa nasce de uma decisão). Links antigos caem no lugar certo.
export default function EventoTarefasPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/eventos/${params.id}/organizacao`);
}
