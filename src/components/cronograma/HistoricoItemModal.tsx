"use client";

// Linha do tempo viva de um item (roteiro_item_log). Lê direto da tabela
// via RLS (SELECT liberado para quem vê o evento — migração 031/032).

import { useEffect, useState } from "react";
import {
  Check,
  Eye,
  MessageSquareText,
  Pencil,
  Play,
  TriangleAlert,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type LogRow = {
  id: string;
  tipo_evento: string;
  descricao: string | null;
  origem: string;
  created_at: string;
};

const ICONE: Record<string, { icon: typeof Eye; cor: string }> = {
  visualizado: { icon: Eye, cor: "text-stone-400" },
  iniciado: { icon: Play, cor: "text-sky-500" },
  concluido: { icon: Check, cor: "text-emerald-500" },
  problema_reportado: { icon: TriangleAlert, cor: "text-red-500" },
  observacao_adicionada: { icon: MessageSquareText, cor: "text-stone-500" },
  editado_pela_cerimonialista: { icon: Pencil, cor: "text-stone-500" },
  status_atualizado: { icon: Pencil, cor: "text-stone-500" },
};

function hora(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function HistoricoItemModal({
  itemId,
  titulo,
  onFechar,
}: {
  itemId: string;
  titulo: string;
  onFechar: () => void;
}) {
  const [logs, setLogs] = useState<LogRow[] | null>(null);

  useEffect(() => {
    let ativo = true;
    const supabase = createClient();
    supabase
      .from("roteiro_item_log")
      .select("id, tipo_evento, descricao, origem, created_at")
      .eq("roteiro_item_id", itemId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (ativo) setLogs((data as LogRow[]) ?? []);
      });
    return () => {
      ativo = false;
    };
  }, [itemId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-4 sm:items-center"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Histórico
            </p>
            <h3 className="text-base font-semibold leading-snug text-stone-900">
              {titulo}
            </h3>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded p-1 text-stone-400 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {logs === null ? (
            <p className="py-8 text-center text-sm text-stone-400">
              Carregando…
            </p>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">
              Ainda não há atividade neste item.
            </p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => {
                const conf = ICONE[log.tipo_evento] ?? ICONE.status_atualizado;
                const Icone = conf.icon;
                return (
                  <li key={log.id} className="flex items-start gap-3">
                    <span className="font-mono text-xs font-semibold text-stone-500 pt-0.5 w-10 shrink-0">
                      {hora(log.created_at)}
                    </span>
                    <Icone size={15} className={`mt-0.5 shrink-0 ${conf.cor}`} />
                    <span className="text-sm text-stone-700">
                      {log.descricao ?? log.tipo_evento}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
