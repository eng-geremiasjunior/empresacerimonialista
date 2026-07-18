"use client";

// Botões de ação de um item do cronograma no link público do fornecedor.
// Sem bloqueio por ordem (imprevistos acontecem — decisão do spec).
// Todas as ações passam pelo wrapper público autenticado por hash.

import { useState, useTransition } from "react";
import { CheckCircle2, Play, RotateCcw, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConcluirModal } from "@/components/roteiro-publico/ConcluirModal";
import { ReportarProblemaModal } from "@/components/roteiro-publico/ReportarProblemaModal";
import type { PublicRoteiroItem } from "@/lib/types";

export function ItemAcaoBotoes({
  hash,
  item,
  onChanged,
}: {
  hash: string;
  item: PublicRoteiroItem;
  onChanged: () => void;
}) {
  const [modal, setModal] = useState<"concluir" | "problema" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function mudar(status: "em_andamento" | "concluido" | "problema", obs: string | null) {
    setErro(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("atualizar_status_item_publico", {
        p_hash: hash,
        p_item_id: item.id,
        p_novo_status: status,
        p_observacao: obs,
      });
      const falha = error || (data as { error?: string })?.error;
      if (falha) {
        setErro("Não foi possível atualizar. Tente novamente.");
        return;
      }
      setModal(null);
      onChanged();
    });
  }

  const s = item.status_novo;

  return (
    <div className="mt-3">
      {s === "planejado" && (
        <button
          onClick={() => mudar("em_andamento", null)}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
        >
          <Play size={16} />
          {pending ? "Enviando…" : "Iniciar"}
        </button>
      )}

      {s === "em_andamento" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setModal("concluir")}
            disabled={pending}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <CheckCircle2 size={16} />
            Concluir
          </button>
          <button
            onClick={() => setModal("problema")}
            disabled={pending}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            <TriangleAlert size={16} />
            Reportar problema
          </button>
        </div>
      )}

      {s === "problema" && (
        <button
          onClick={() => mudar("em_andamento", null)}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white py-3 text-sm font-semibold text-stone-700 hover:border-stone-400 disabled:opacity-60"
        >
          <RotateCcw size={16} />
          {pending ? "Enviando…" : "Retomar"}
        </button>
      )}

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      {modal === "concluir" && (
        <ConcluirModal
          titulo={item.title}
          enviando={pending}
          onFechar={() => setModal(null)}
          onConfirmar={(obs) => mudar("concluido", obs)}
        />
      )}
      {modal === "problema" && (
        <ReportarProblemaModal
          titulo={item.title}
          enviando={pending}
          onFechar={() => setModal(null)}
          onConfirmar={(descricao) => mudar("problema", descricao)}
        />
      )}
    </div>
  );
}
