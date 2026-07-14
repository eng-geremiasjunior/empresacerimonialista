"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  CalendarDays,
  Banknote,
  MessageSquare,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import type { NotificationRow, NotificationType } from "@/lib/notifications-db";

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  tarefa_proxima: Clock,
  evento: CalendarDays,
  pagamento: Banknote,
  mensagem: MessageSquare,
  fornecedor: Handshake,
};

type Props = {
  notification: NotificationRow;
  onOpen: (notification: NotificationRow) => void;
  onDelete: (id: string) => void;
};

export function NotificationItem({ notification, onOpen, onDelete }: Props) {
  const Icon = TYPE_ICON[notification.type] ?? CalendarDays;
  const read = notification.read_at !== null;
  const when = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(notification)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(notification);
      }}
      className={`group flex w-full cursor-pointer items-start gap-3 p-3 text-left transition-colors hover:bg-stone-50 ${
        read ? "opacity-60" : ""
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            read ? "font-normal text-stone-500" : "font-semibold text-stone-900"
          }`}
        >
          {notification.title}
        </p>
        <p className="text-sm leading-snug text-stone-500">
          {notification.message}
        </p>
        <p className="mt-0.5 text-xs text-stone-400">
          {when}
          {notification.link && (
            <span className="ml-2 font-medium text-stone-500 underline underline-offset-2">
              Ver detalhes
            </span>
          )}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        aria-label="Excluir notificação"
        className="shrink-0 rounded-md p-1 text-stone-300 transition-colors hover:bg-stone-100 hover:text-stone-600"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
        >
          <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
