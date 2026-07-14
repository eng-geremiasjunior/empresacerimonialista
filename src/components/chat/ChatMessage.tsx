// Bubble de mensagem, usada nos dois lados do chat.
export type ChatBubbleMessage = {
  id: string;
  sender_type: "cerimonialista" | "fornecedor";
  message: string;
  created_at: string;
  read_at: string | null;
};

type Props = {
  message: ChatBubbleMessage;
  viewer: "cerimonialista" | "fornecedor";
  otherName: string;
};

function timeLabel(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ChatMessage({ message, viewer, otherName }: Props) {
  const own = message.sender_type === viewer;
  const initials = otherName.slice(0, 2).toUpperCase();

  if (own) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-stone-900 px-3.5 py-2 text-white">
          <p className="whitespace-pre-line break-words text-sm">
            {message.message}
          </p>
          <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-stone-400">
            {timeLabel(message.created_at)}
            <span
              className={message.read_at ? "text-sky-400" : "text-stone-500"}
              title={message.read_at ? "Lida" : "Enviada"}
            >
              {message.read_at ? "✓✓" : "✓"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-600">
        {initials}
      </span>
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-stone-200 bg-white px-3.5 py-2">
        <p className="whitespace-pre-line break-words text-sm text-stone-900">
          {message.message}
        </p>
        <p className="mt-0.5 text-right text-[10px] text-stone-400">
          {timeLabel(message.created_at)}
        </p>
      </div>
    </div>
  );
}
