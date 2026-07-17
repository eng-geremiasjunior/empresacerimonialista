import type { EventoExportRow } from "@/lib/supabase/eventos-list";
import { EVENT_STATUS_LABELS, type EventStatus } from "@/lib/types";

function csvCampo(v: string) {
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// Gera o CSV do relatório de eventos (separador ";", BOM p/ Excel pt-BR).
export function gerarCsvEventos(rows: EventoExportRow[]): string {
  const header = ["Nome", "Tipo", "Data", "Status", "Cliente", "Valor contratado"];
  const linhas = rows.map((r) =>
    [
      r.nome,
      r.tipo,
      r.data,
      EVENT_STATUS_LABELS[r.status as EventStatus] ?? r.status,
      r.cliente,
      r.valor != null ? String(r.valor).replace(".", ",") : "",
    ]
      .map((c) => csvCampo(c))
      .join(";")
  );
  return "﻿" + [header.join(";"), ...linhas].join("\n");
}
