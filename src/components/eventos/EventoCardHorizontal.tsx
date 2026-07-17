"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Copy,
  Image as ImageIcon,
  MapPin,
  MoreVertical,
  Users,
  Eye,
  Pencil,
  Archive,
} from "lucide-react";
import { archiveEvent, duplicateEvent } from "@/app/(app)/eventos/actions";
import { coverPublicUrl } from "@/lib/event-cover";
import { ACAO_PATH } from "@/lib/proxima-acao";
import type { EventoRow } from "@/lib/supabase/eventos-list";
import type { EventoCardData } from "@/lib/supabase/eventos-cards";
import { SAUDE_UI, type Saude } from "@/lib/saude-evento";
import { formatDate } from "@/lib/format";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type EventStatus,
} from "@/lib/types";

const STATUS_STYLES: Record<EventStatus, string> = {
  orcamento: "bg-amber-50 text-amber-700",
  confirmado: "bg-emerald-50 text-emerald-700",
  concluido: "bg-sky-50 text-sky-700",
  cancelado: "bg-red-50 text-red-700",
};

// Descrição textual da saúde conforme os limiares já definidos.
function saudeTexto(saude: Saude) {
  if (saude.score >= 80) return "Tudo encaminhado";
  if (saude.score >= 50) return "Atenção necessária";
  return "Risco alto";
}

function CircularSaude({ saude }: { saude: Saude }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const off = c - (saude.score / 100) * c;
  const cor =
    saude.score >= 80
      ? "stroke-emerald-500"
      : saude.score >= 50
        ? "stroke-amber-500"
        : "stroke-red-500";
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
        <circle cx="24" cy="24" r={r} className="fill-none stroke-gray-100" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          className={`fill-none ${cor}`}
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold text-gray-700 tabular-nums">
        {saude.score}
      </span>
    </div>
  );
}

function Menu({ eventId, archivingDisabled }: { eventId: string; archivingDisabled: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-label="Ações"
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <Link href={`/eventos/${eventId}`} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            <Eye size={14} /> Ver evento
          </Link>
          <Link href={`/eventos/${eventId}/editar`} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            <Pencil size={14} /> Editar
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              startTransition(async () => {
                await duplicateEvent(eventId);
              });
            }}
            disabled={pending}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Copy size={14} /> Duplicar
          </button>
          <button
            onClick={() => {
              if (archivingDisabled || !confirm("Arquivar este evento? Ele sai da listagem, mas os dados continuam guardados.")) return;
              setOpen(false);
              startTransition(async () => {
                await archiveEvent(eventId);
                router.refresh();
              });
            }}
            disabled={archivingDisabled}
            title={archivingDisabled ? "Requer a migração 015" : undefined}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Archive size={14} /> Arquivar
          </button>
        </div>
      )}
    </div>
  );
}

export function EventoCardHorizontal({
  row,
  data,
  archivingDisabled,
}: {
  row: EventoRow;
  data?: EventoCardData;
  archivingDisabled: boolean;
}) {
  const router = useRouter();
  const cover = row.cover_image_url || coverPublicUrl(row.id);
  const [coverErro, setCoverErro] = useState(false);
  const titulo =
    row.name ||
    `${EVENT_TYPE_LABELS[row.type]}${row.client_name ? ` — ${row.client_name}` : ""}`;

  const acao = data?.proximaAcao;
  const acaoHref =
    acao && acao.acao ? `/eventos/${row.id}/${ACAO_PATH[acao.acao]}` : null;

  const fin = data?.financeiro;
  const finTexto = !fin
    ? null
    : !fin.temReceitas
      ? "Sem financeiro"
      : fin.entradaPaga === false
        ? "Entrada pendente"
        : `Pago ${fin.pagoPct}%`;

  return (
    <div
      onClick={() => router.push(`/eventos/${row.id}`)}
      className="group flex cursor-pointer gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-gray-300"
    >
      {/* Foto */}
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {cover && !coverErro ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            onError={() => setCoverErro(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageIcon size={26} strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Info principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900">{titulo}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <CalendarDays size={13} /> {formatDate(row.date)}
              </span>
              {row.guests != null && (
                <span className="flex items-center gap-1">
                  <Users size={13} /> {row.guests}
                </span>
              )}
              {(row.city || row.location) && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin size={13} /> {row.city ?? row.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status]}`}
            >
              {EVENT_STATUS_LABELS[row.status]}
            </span>
            <Menu eventId={row.id} archivingDisabled={archivingDisabled} />
          </div>
        </div>

        {/* Rodapé: resumo operacional + próxima ação */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-0.5 text-xs text-gray-500">
            {data && (
              <p>
                Fornecedores:{" "}
                <span className="font-medium text-gray-700">
                  {data.fornecedoresConfirmados}/{data.fornecedoresTotal}
                </span>{" "}
                confirmados
              </p>
            )}
            {finTexto && (
              <p>
                {finTexto}
                {fin?.proximaParcelaData && (
                  <span className="text-gray-400">
                    {" · Próxima "}
                    {formatDate(fin.proximaParcelaData)}
                  </span>
                )}
              </p>
            )}
          </div>

          {acao && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                  Próxima ação
                </p>
                <p
                  className={`max-w-[220px] truncate text-sm font-medium ${
                    acao.urgencia === "alta"
                      ? "text-red-600"
                      : acao.urgencia === "media"
                        ? "text-amber-600"
                        : "text-emerald-600"
                  }`}
                >
                  {acao.texto}
                </p>
              </div>
              {acaoHref && acao.botao && (
                <Link
                  href={acaoHref}
                  onClick={(e) => e.stopPropagation()}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400"
                >
                  {acao.botao}
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Saúde circular */}
      <div className="hidden shrink-0 flex-col items-center justify-center gap-1 border-l border-gray-100 pl-4 sm:flex">
        {data?.saude && <CircularSaude saude={data.saude} />}
        {data?.saude && (
          <span className={`text-[11px] font-medium ${SAUDE_UI[data.saude.nivel].dot}`}>
            {saudeTexto(data.saude)}
          </span>
        )}
      </div>
    </div>
  );
}
