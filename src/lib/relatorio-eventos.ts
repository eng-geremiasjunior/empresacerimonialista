import type { EventoExportRow } from "@/lib/supabase/eventos-list";
import { EVENT_STATUS_LABELS, type EventStatus } from "@/lib/types";

// Campo que começa com =, +, - ou @ é lido como FÓRMULA pelo Excel e pelo
// Sheets: nome de cliente digitado à mão viraria código na planilha de
// quem abre. O apóstrofo neutraliza sem mudar o que se lê na célula.
// (Mesma proteção em relatorio-fornecedores.ts.)
function csvCampo(v: string) {
  const seguro = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
  return /[",\n\r;]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
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
