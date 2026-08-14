"use client";

// O que a cliente pediu no cronograma. Fica no topo da tela porque é a
// única coisa ali que espera uma resposta dela — o resto é consulta.
//
// Aceitar aplica na hora. Recusar pede o motivo: a cliente lê a resposta
// no portal, e recusa sem explicação vira desconfiança na próxima.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SugestaoCronograma } from "@/lib/supabase/programa-do-dia";
import {
  aceitarSugestao,
  recusarSugestao,
} from "@/app/(app)/eventos/[id]/roteiro/sugestoes-actions";

function hhmm(h: string | null): string {
  return h ? h.slice(0, 5) : "";
}

export function FilaSugestoes({
  eventId,
  sugestoes,
  titulosPorItem,
}: {
  eventId: string;
  sugestoes: SugestaoCronograma[];
  /** título do momento que a sugestão referencia */
  titulosPorItem: Record<string, string>;
}) {
  if (sugestoes.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 print:hidden">
      <h2 className="text-sm font-semibold text-amber-900">
        {sugestoes.length === 1
          ? "A cliente pediu um ajuste"
          : `A cliente pediu ${sugestoes.length} ajustes`}
      </h2>
      <ul className="mt-3 space-y-3">
        {sugestoes.map((s) => (
          <Sugestao
            key={s.id}
            eventId={eventId}
            sugestao={s}
            titulo={
              s.roteiroItemId ? (titulosPorItem[s.roteiroItemId] ?? "") : ""
            }
          />
        ))}
      </ul>
    </section>
  );
}

function Sugestao({
  eventId,
  sugestao,
  titulo,
}: {
  eventId: string;
  sugestao: SugestaoCronograma;
  titulo: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const resumo =
    sugestao.tipo === "horario"
      ? `${titulo || "um momento"} às ${hhmm(sugestao.horarioSugerido)}`
      : `incluir “${sugestao.tituloSugerido}”${
          sugestao.horarioSugerido ? ` às ${hhmm(sugestao.horarioSugerido)}` : ""
        }`;

  function rodar(fn: () => Promise<{ error: string } | { success: true }>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setRecusando(false);
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-amber-200 bg-white p-3">
      <p className="text-sm text-stone-900">{resumo}</p>
      {sugestao.mensagem && (
        <p className="mt-1 text-sm text-stone-500">“{sugestao.mensagem}”</p>
      )}

      {recusando ? (
        <div className="mt-2 space-y-2">
          <input
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            placeholder="Por que não dá? Ela lê no portal."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pendente || !motivo.trim()}
              onClick={() => rodar(() => recusarSugestao(eventId, sugestao.id, motivo))}
              className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Enviar resposta
            </button>
            <button
              type="button"
              onClick={() => setRecusando(false)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={pendente}
            onClick={() => rodar(() => aceitarSugestao(eventId, sugestao.id))}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {sugestao.tipo === "horario" ? "Mudar o horário" : "Incluir no dia"}
          </button>
          <button
            type="button"
            onClick={() => setRecusando(true)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          >
            Não dá
          </button>
        </div>
      )}

      {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
    </li>
  );
}
