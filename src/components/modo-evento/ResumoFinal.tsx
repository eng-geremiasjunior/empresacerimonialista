"use client";

// Resumo do evento ao encerrar (Etapa 4, item 6). Calculado dos dados
// reais: itens concluídos, atrasos (via variação início real x previsto)
// e problemas reportados (contados no log).

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { calcularVariacao } from "@/lib/cronograma";
import type { ModoItem, ModoTheme } from "@/lib/modo-tema";
import type { AtividadeRecente } from "@/lib/modo-evento";

export function ResumoFinal({
  eventId,
  items,
  activities,
  onFechar,
  t,
}: {
  eventId: string;
  items: ModoItem[];
  activities: AtividadeRecente[];
  onFechar: () => void;
  t: ModoTheme;
}) {
  const total = items.length;
  const concluidos = items.filter((i) => i.statusNovo === "concluido").length;

  // Atrasos: itens cujo início real ficou depois do previsto.
  const variacoes = items
    .map((i) => calcularVariacao(i.time, i.horarioRealInicio))
    .filter((v) => v.status === "atrasado") as {
    status: "atrasado";
    minutos: number;
  }[];
  const atrasos = variacoes.length;
  const mediaAtraso =
    atrasos > 0
      ? Math.round(variacoes.reduce((s, v) => s + v.minutos, 0) / atrasos)
      : 0;

  // Problemas reportados: conta no log (query dedicada; activities só traz
  // as últimas). Fallback para as activities já carregadas.
  const [problemas, setProblemas] = useState<number>(
    activities.filter((a) => a.tipo_evento === "problema_reportado").length
  );
  useEffect(() => {
    let ativo = true;
    const supabase = createClient();
    supabase
      .from("roteiro_item_log")
      .select("id, roteiro_items!inner(event_id)", {
        count: "exact",
        head: true,
      })
      .eq("roteiro_items.event_id", eventId)
      .eq("tipo_evento", "problema_reportado")
      .then(({ count }) => {
        if (ativo && typeof count === "number") setProblemas(count);
      });
    return () => {
      ativo = false;
    };
  }, [eventId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-5">
      <div className={`w-full max-w-md rounded-2xl border p-6 ${t.panel}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-4xl">🎉</p>
            <h2 className="mt-2 text-2xl font-bold">
              {concluidos === total ? "Evento concluído" : "Resumo do evento"}
            </h2>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className={`rounded-full p-1.5 ${t.sub} hover:opacity-70`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-semibold">
              {concluidos} de {total}
            </span>{" "}
            itens concluídos
          </p>
          {atrasos > 0 ? (
            <p className={t.sub}>
              {atrasos} {atrasos === 1 ? "item teve" : "itens tiveram"} atraso
              {atrasos === 1 ? "" : "s"} (média de {mediaAtraso} min)
            </p>
          ) : (
            <p className={t.sub}>Nenhum item começou atrasado 🎯</p>
          )}
          {problemas > 0 && (
            <p className={t.sub}>
              {problemas}{" "}
              {problemas === 1
                ? "problema foi reportado"
                : "problemas foram reportados"}{" "}
              durante o evento
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link
            href={`/eventos/${eventId}/roteiro`}
            className={`rounded-xl border py-3 text-center text-sm font-semibold ${t.border}`}
          >
            Ver histórico
          </Link>
          <Link
            href={`/eventos/${eventId}`}
            className="rounded-xl bg-stone-900 py-3 text-center text-sm font-semibold text-white hover:bg-stone-700"
          >
            Voltar ao evento
          </Link>
        </div>
      </div>
    </div>
  );
}
