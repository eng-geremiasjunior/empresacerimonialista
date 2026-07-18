"use client";

// Página pública do fornecedor (link com hash): lista SÓ os itens dele,
// com ações Iniciar/Concluir/Reportar problema por item (Etapa 2 do
// Cronograma dinâmico). Mobile-first, sem login. Polling de 20s.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Circle,
  CircleDot,
  MessageSquareText,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ItemAcaoBotoes } from "@/components/roteiro-publico/ItemAcaoBotoes";
import { formatDate, formatTime } from "@/lib/format";
import {
  EVENT_TYPE_LABELS,
  type PublicRoteiroData,
  type PublicRoteiroItem,
  type RoteiroStatusNovo,
} from "@/lib/types";

const REFRESH_INTERVAL_MS = 20_000;

const STATUS_UI: Record<
  RoteiroStatusNovo,
  { border: string; badge: string; label: string }
> = {
  planejado: {
    border: "border-l-stone-300",
    badge: "bg-stone-100 text-stone-600",
    label: "Planejado",
  },
  em_andamento: {
    border: "border-l-sky-500",
    badge: "bg-sky-50 text-sky-700",
    label: "Em andamento",
  },
  concluido: {
    border: "border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    label: "Concluído",
  },
  problema: {
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-700",
    label: "Problema",
  },
};

function StatusIcone({ s }: { s: RoteiroStatusNovo }) {
  if (s === "concluido")
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check size={15} strokeWidth={3} />
      </span>
    );
  if (s === "em_andamento")
    return <CircleDot size={26} className="text-sky-500" />;
  if (s === "problema")
    return <TriangleAlert size={24} className="text-red-500" />;
  return <Circle size={26} className="text-stone-300" />;
}

function horaLocal(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type Props = {
  initial: PublicRoteiroData;
  hash: string;
  children?: React.ReactNode;
};

export function PublicRoteiro({ initial, hash, children }: Props) {
  const [data, setData] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const visualizacaoFeita = useRef(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data: fresh } = await supabase.rpc("roteiro_publico", {
      link_hash: hash,
    });
    if (fresh) {
      setData(fresh as PublicRoteiroData);
      setUpdatedAt(new Date());
    }
  }, [hash]);

  // Polling (padrão já usado no chat) + refresh ao voltar para a aba.
  useEffect(() => {
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Registra a visualização do próximo item pendente (alimenta a linha
  // do tempo viva; anti-spam de 5min é feito no banco).
  useEffect(() => {
    if (visualizacaoFeita.current) return;
    visualizacaoFeita.current = true;
    const proximo = initial.items.find((i) => i.status_novo !== "concluido");
    if (!proximo) return;
    const supabase = createClient();
    supabase
      .rpc("registrar_visualizacao_publica", {
        p_hash: hash,
        p_item_id: proximo.id,
      })
      .then(() => {});
  }, [hash, initial.items]);

  // Item "atual" quando o evento é hoje (último cujo horário já passou).
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  let currentId: string | null = null;
  if (data.event.date === todayStr) {
    for (const item of data.items) {
      if (item.time && item.time <= nowTime) currentId = item.id;
    }
  }

  const eventLabel = [
    EVENT_TYPE_LABELS[data.event.type] ?? data.event.type,
    data.event.client_name,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <header className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-stone-400">
          Roteiro do evento
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          {data.supplier.name}
        </h1>
        <p className="mt-2 text-stone-600">{eventLabel}</p>
        <p className="text-sm text-stone-500">
          {formatDate(data.event.date)}
          {data.event.location ? ` · ${data.event.location}` : ""}
        </p>
      </header>

      {data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
          Nenhum item do roteiro para você ainda.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((item: PublicRoteiroItem) => {
            const ui = STATUS_UI[item.status_novo] ?? STATUS_UI.planejado;
            const isCurrent = item.id === currentId;
            const inicioReal = horaLocal(item.horario_real_inicio);
            const fimReal = horaLocal(item.horario_real_fim);

            return (
              <li
                key={item.id}
                className={`rounded-xl border border-stone-200 border-l-4 ${ui.border} bg-white p-4 shadow-sm ${
                  isCurrent ? "ring-2 ring-sky-400" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <StatusIcone s={item.status_novo} />
                    <div>
                      <span className="font-mono text-xl font-bold leading-none">
                        {formatTime(item.time)}
                      </span>
                      <p className="mt-1 text-lg font-medium leading-snug">
                        {item.title}
                        {item.etapa_obrigatoria && (
                          <span className="ml-2 align-middle rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            obrigatória
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {isCurrent && (
                      <span className="rounded-full bg-sky-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                        AGORA
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ui.badge}`}
                    >
                      {ui.label}
                    </span>
                  </div>
                </div>

                {item.description && (
                  <p className="mt-2 whitespace-pre-line text-stone-600">
                    {item.description}
                  </p>
                )}

                {item.responsavel_nome && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
                    <UserRound size={14} className="text-stone-400" />
                    Responsável: {item.responsavel_nome}
                  </p>
                )}

                {/* Carimbo de horário real */}
                {item.status_novo === "em_andamento" && inicioReal && (
                  <p className="mt-2 text-sm font-medium text-sky-700">
                    Iniciado às {inicioReal}
                  </p>
                )}
                {item.status_novo === "concluido" && fimReal && (
                  <p className="mt-2 text-sm font-medium text-emerald-700">
                    Concluído às {fimReal}
                  </p>
                )}

                {/* Observação registrada */}
                {item.observacao && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
                    <MessageSquareText
                      size={14}
                      className="mt-0.5 shrink-0 text-stone-400"
                    />
                    {item.observacao}
                  </p>
                )}

                <ItemAcaoBotoes hash={hash} item={item} onChanged={refresh} />
              </li>
            );
          })}
        </ul>
      )}

      {children}

      <footer className="mt-8 text-center text-xs text-stone-400">
        <p>
          Esta página atualiza sozinha.
          {updatedAt
            ? ` Última atualização às ${pad(updatedAt.getHours())}:${pad(updatedAt.getMinutes())}.`
            : ""}
        </p>
        <p className="mt-1">Vela — gestão para cerimonialistas</p>
      </footer>
    </div>
  );
}
