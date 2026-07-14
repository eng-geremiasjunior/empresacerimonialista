"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  notifyTask,
  requestNotificationPermission,
} from "@/lib/notifications";
import { createNotification } from "@/lib/notifications-db";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";

const POLL_MS = 60_000; // verifica a cada 1 minuto
const WINDOW_MS = 5 * 60_000; // notifica quando faltam <= 5 minutos
const GRACE_MS = 60_000; // ...até 1 minuto depois do vencimento

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  events: { type: EventType; clients: { name: string } | null } | null;
};

export function useTaskNotifications() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function check() {
      // Só reivindica a notificação se esta aba puder entregá-la de verdade:
      // visível (toast na tela) ou com permissão nativa (alcança o usuário
      // mesmo em segundo plano). Evita que uma aba escondida "consuma" o
      // aviso sem ninguém ver.
      const permission =
        typeof Notification !== "undefined"
          ? Notification.permission
          : "indisponível";
      const canDeliver =
        document.visibilityState === "visible" || permission === "granted";
      if (!canDeliver) {
        console.debug(
          "[vela:notificações] ciclo pulado: aba oculta e sem permissão de notificação nativa"
        );
        return;
      }

      // RLS garante que só vêm tarefas dos eventos da cerimonialista logada.
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, title, due_date, due_time, events(type, clients(name))"
        )
        .in("status", ["pendente", "em_progresso"])
        .is("notified_at", null)
        .not("due_time", "is", null)
        .not("due_date", "is", null);

      if (error) {
        console.debug("[vela:notificações] erro na consulta:", error.message);
        return;
      }
      if (cancelled || !data) return;

      console.debug(
        `[vela:notificações] ${data.length} tarefa(s) com horário aguardando notificação; permissão do navegador: ${permission}`
      );

      const now = Date.now();

      for (const task of data as unknown as TaskRow[]) {
        const due = new Date(`${task.due_date}T${task.due_time}`).getTime();
        if (isNaN(due)) continue;

        const diff = due - now;
        if (diff > WINDOW_MS || diff < -GRACE_MS) {
          console.debug(
            `[vela:notificações] "${task.title}" fora da janela (vence em ${Math.round(diff / 60_000)} min)`
          );
          continue;
        }

        // Marca como notificada ANTES de exibir; o filtro is(null) na
        // atualização garante que só uma aba/verificação notifica.
        const { data: claimed } = await supabase
          .from("tasks")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", task.id)
          .is("notified_at", null)
          .select("id");

        if (cancelled || !claimed || claimed.length === 0) {
          console.debug(
            `[vela:notificações] "${task.title}" já foi notificada por outra aba`
          );
          continue;
        }

        console.debug(`[vela:notificações] notificando: "${task.title}"`);

        const eventLabel = task.events
          ? `${EVENT_TYPE_LABELS[task.events.type]} — ${task.events.clients?.name ?? "Sem cliente"}`
          : null;
        const minutesLeft = Math.max(0, Math.ceil(diff / 60_000));

        notifyTask(
          {
            taskId: task.id,
            title: task.title,
            eventLabel,
            minutesLeft,
          },
          () => router.push("/tarefas")
        );

        // Registra no histórico (sino do header).
        await createNotification({
          type: "tarefa_proxima",
          title: task.title,
          message:
            minutesLeft > 0
              ? `Faltam ${minutesLeft} min${eventLabel ? ` — ${eventLabel}` : ""}`
              : `É hora${eventLabel ? ` — ${eventLabel}` : ""}`,
          link: "/tarefas",
        });
      }
    }

    console.debug(
      "[vela:notificações] hook ativo — verificando tarefas a cada 60s"
    );
    requestNotificationPermission();
    check();
    const interval = setInterval(check, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);
}
