"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Eye,
  Pencil,
  Copy,
  Archive,
  Download,
  X,
} from "lucide-react";
import {
  archiveEvent,
  archiveEvents,
  duplicateEvent,
} from "@/app/(app)/eventos/actions";
import { buildEventosHref, type EventosParams } from "@/lib/eventos-url";
import type { EventoRow } from "@/lib/supabase/eventos-list";
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
  concluido: "bg-gray-100 text-gray-600",
  cancelado: "bg-red-50 text-red-700",
};

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

type Props = {
  rows: EventoRow[];
  saudeById: Record<string, Saude>;
  current: EventosParams;
  todayIso: string;
  weekEndIso: string;
  archivingDisabled?: boolean;
};

export function EventosTable({
  rows,
  saudeById,
  current,
  todayIso,
  weekEndIso,
  archivingDisabled,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openMenuId]);

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkArchive() {
    const n = selected.size;
    if (!confirm(`Arquivar ${n} evento${n > 1 ? "s" : ""}? Eles saem da listagem, mas os dados continuam guardados.`)) {
      return;
    }
    await archiveEvents(Array.from(selected));
    setSelected(new Set());
    router.refresh();
  }

  function handleExportCsv() {
    const chosen = rows.filter((r) => selected.has(r.id));
    const header = ["Cliente", "Tipo", "Data", "Local", "Responsável", "Status"];
    const lines = chosen.map((r) =>
      [
        r.client_name ?? "",
        EVENT_TYPE_LABELS[r.type],
        r.date,
        r.city ?? r.location ?? "",
        r.responsavel_name ?? "",
        EVENT_STATUS_LABELS[r.status],
      ]
        .map(csvEscape)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eventos-${todayIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function sortHeader(col: "date" | "client" | "status", label: string) {
    const active = current.sort === col;
    const nextDir = active && current.dir === "asc" ? "desc" : "asc";
    return (
      <Link
        href={buildEventosHref(current, { sort: col, dir: nextDir, page: "1" })}
        className="inline-flex items-center gap-1 hover:text-gray-700"
      >
        {label}
        {active &&
          (current.dir === "asc" ? (
            <ChevronUp size={13} className="text-gray-400" />
          ) : (
            <ChevronDown size={13} className="text-gray-400" />
          ))}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
          <p className="text-sm font-medium text-gray-700">
            {selected.size} evento{selected.size > 1 ? "s" : ""} selecionado
            {selected.size > 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={handleBulkArchive}
              disabled={archivingDisabled}
              title={
                archivingDisabled
                  ? "Requer a migração 015_eventos_arquivar.sql"
                  : undefined
              }
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Archive size={14} />
              Arquivar
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              <Download size={14} />
              Exportar CSV
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-200"
            >
              <X size={14} />
              Cancelar seleção
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
              <th className="w-10 py-2.5 pl-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                  className="h-4 w-4"
                />
              </th>
              <th className="py-2.5 pr-4 font-medium">
                {sortHeader("client", "Cliente")}
              </th>
              <th className="py-2.5 pr-4 font-medium">
                {sortHeader("date", "Data")}
              </th>
              <th className="py-2.5 pr-4 font-medium">Local</th>
              <th className="py-2.5 pr-4 font-medium">Responsável</th>
              <th className="py-2.5 pr-4 font-medium">
                {sortHeader("status", "Status")}
              </th>
              <th className="py-2.5 pr-4 font-medium">Saúde</th>
              <th className="w-10 py-2.5 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const saude = saudeById[row.id];
              const soon = row.date >= todayIso && row.date <= weekEndIso;

              return (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/eventos/${row.id}`)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`Selecionar ${row.client_name ?? "evento"}`}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-900">
                      {row.client_name ?? "Sem cliente"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {EVENT_TYPE_LABELS[row.type]}
                    </p>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span
                      className={soon ? "font-medium text-indigo-600" : "text-gray-700"}
                    >
                      {formatDate(row.date)}
                    </span>
                  </td>
                  <td className="max-w-[180px] truncate py-3 pr-4 text-gray-500">
                    {row.city ?? row.location ?? "—"}
                  </td>
                  <td className="max-w-[160px] truncate py-3 pr-4 text-gray-500">
                    {row.responsavel_name ?? "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status]}`}
                    >
                      {EVENT_STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {saude ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-10 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${SAUDE_UI[saude.nivel].bar}`}
                            style={{ width: `${saude.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500 tabular-nums">
                          {saude.score}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                    <div
                      className="relative"
                      ref={openMenuId === row.id ? menuRef : undefined}
                    >
                      <button
                        onClick={() =>
                          setOpenMenuId((id) => (id === row.id ? null : row.id))
                        }
                        aria-label="Mais ações"
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === row.id && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          <Link
                            href={`/eventos/${row.id}`}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye size={14} /> Ver evento
                          </Link>
                          <Link
                            href={`/eventos/${row.id}/editar`}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil size={14} /> Editar
                          </Link>
                          <form action={duplicateEvent.bind(null, row.id)}>
                            <button
                              type="submit"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Copy size={14} /> Duplicar
                            </button>
                          </form>
                          <form
                            action={archiveEvent.bind(null, row.id)}
                            onSubmit={(e) => {
                              if (archivingDisabled || !confirm("Arquivar este evento?")) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <button
                              type="submit"
                              disabled={archivingDisabled}
                              title={
                                archivingDisabled
                                  ? "Requer a migração 015_eventos_arquivar.sql"
                                  : undefined
                              }
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                              <Archive size={14} /> Arquivar
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
