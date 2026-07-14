"use client";

import toast from "react-hot-toast";

export type TaskNotice = {
  taskId: string;
  title: string;
  eventLabel: string | null;
  minutesLeft: number; // > 0: faltam N minutos; <= 0: é hora
};

export function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function notifyTask(notice: TaskNotice, onOpen: () => void) {
  showToast(notice, onOpen);
  showBrowserNotification(notice, onOpen);
}

function noticeLabel(notice: TaskNotice) {
  const suffix = notice.eventLabel ? ` — ${notice.eventLabel}` : "";
  return notice.minutesLeft > 0
    ? `Faltam ${notice.minutesLeft} min para: ${notice.title}${suffix}`
    : `É hora de: ${notice.title}${suffix}`;
}

function showToast(notice: TaskNotice, onOpen: () => void) {
  const isWarning = notice.minutesLeft > 0;

  toast.custom(
    (t) => (
      <button
        onClick={() => {
          toast.dismiss(t.id);
          onOpen();
        }}
        className={`pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border p-3.5 text-left text-sm shadow-lg transition-opacity ${
          t.visible ? "opacity-100" : "opacity-0"
        } ${
          isWarning
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-green-300 bg-green-50 text-green-900"
        }`}
      >
        <span aria-hidden className="mt-0.5">
          {isWarning ? "⏰" : "✅"}
        </span>
        <span className="font-medium leading-snug">{noticeLabel(notice)}</span>
      </button>
    ),
    { id: `task-${notice.taskId}`, duration: 6000 }
  );
}

function showBrowserNotification(notice: TaskNotice, onOpen: () => void) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notification = new Notification(`Tarefa: ${notice.title}`, {
    body: `${notice.eventLabel ? `${notice.eventLabel} — ` : ""}${
      notice.minutesLeft > 0 ? `em ${notice.minutesLeft} minutos` : "agora"
    }`,
    icon: "/icon.svg",
    tag: `vela-task-${notice.taskId}`,
  });

  notification.onclick = () => {
    window.focus();
    onOpen();
    notification.close();
  };
}
