"use client";

// Atraso com preview da cascata. Antes de gravar, mostra exatamente quem
// vai ser empurrado — atrasar sem ver o efeito é como a cerimonialista
// perde a noção do dia.
//
// Só dependência DURA empurra; SUAVE aparece no texto como "não muda".

import { useState, useTransition } from "react";
import { AlertTriangle, X } from "lucide-react";
import {
  atrasarItem,
  desfazerAtraso,
} from "@/app/(app)/eventos/[id]/roteiro/actions";
import {
  cadeiaDura,
  horarioOriginal,
  inicioMin,
  formatarMin,
  type ItemExecucao,
} from "@/lib/execucao-evento";

const MINUTOS = [15, 30, 60];

export function ModalAtraso({
  eventId,
  item,
  itens,
  onFechar,
  onPronto,
}: {
  eventId: string;
  item: ItemExecucao;
  itens: ItemExecucao[];
  onFechar: () => void;
  onPronto: () => void;
}) {
  const [minutos, setMinutos] = useState(15);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const impactados = cadeiaDura(item.id, itens, minutos);
  const ini = inicioMin(item);
  const era = horarioOriginal(item);

  function aplicar(emCascata: boolean) {
    setErro(null);
    iniciar(async () => {
      const res = await atrasarItem(eventId, item.id, minutos, emCascata);
      if ("error" in res) return setErro(res.error);
      onPronto();
      onFechar();
    });
  }

  function desfazer() {
    setErro(null);
    iniciar(async () => {
      const res = await desfazerAtraso(eventId, item.id);
      if ("error" in res) return setErro(res.error);
      onPronto();
      onFechar();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,20,50,.4)] p-4"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[440px] rounded-[20px] bg-white p-6"
        style={{ boxShadow: "0 24px 60px rgba(30,20,60,.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[16px] font-bold text-[#17162A]">
            Atrasar “{item.title}”
          </h3>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="text-stone-400 hover:text-stone-700"
          >
            <X size={18} />
          </button>
        </div>

        {ini !== null && (
          <p className="mt-1 text-[12.5px] text-stone-500">
            Agora às {formatarMin(ini)}
            {era && <span className="ml-1 line-through">era {era}</span>}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          {MINUTOS.map((m) => (
            <button
              key={m}
              onClick={() => setMinutos(m)}
              className="rounded-[9px] border px-3 py-1.5 text-[13px] font-semibold transition-colors"
              style={
                minutos === m
                  ? { background: "#17162A", color: "#fff", borderColor: "#17162A" }
                  : { borderColor: "#E7E5E4", color: "#57534E" }
              }
            >
              +{m} min
            </button>
          ))}
        </div>

        {impactados.length > 0 ? (
          <div className="mt-4">
            <p className="text-[13px] text-stone-600">
              Empurra {impactados.length}{" "}
              {impactados.length === 1 ? "item" : "itens"} com dependência{" "}
              <strong>dura</strong>:
            </p>
            <ul className="mt-2 space-y-1.5">
              {impactados.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between gap-3 rounded-[10px] bg-stone-50 px-3 py-2 text-[12.5px]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[#17162A]">
                      {i.titulo}
                    </span>
                    <span className="text-stone-500">{i.fornecedor}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap">
                    <span className="text-stone-400 line-through">{i.de}</span>{" "}
                    <span className="font-semibold text-[#C55A32]">{i.para}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11.5px] text-stone-500">
              Dependências <strong>suaves</strong> e itens sem vínculo continuam
              no mesmo horário.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-stone-600">
            Nenhum item depende deste — o atraso não empurra mais ninguém.
          </p>
        )}

        {erro && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 p-2.5 text-[12.5px] text-red-700">
            <AlertTriangle size={14} /> {erro}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {impactados.length > 0 ? (
            <>
              <button
                onClick={() => aplicar(true)}
                disabled={pendente}
                className="flex-1 rounded-[9px] bg-[#7C5CE6] px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {pendente ? "Aplicando…" : `Confirmar · empurra ${impactados.length}`}
              </button>
              <button
                onClick={() => aplicar(false)}
                disabled={pendente}
                className="rounded-[9px] border border-stone-300 px-4 py-2.5 text-[13px] font-semibold text-stone-700 disabled:opacity-50"
              >
                Só essa
              </button>
            </>
          ) : (
            <button
              onClick={() => aplicar(false)}
              disabled={pendente}
              className="flex-1 rounded-[9px] bg-[#7C5CE6] px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {pendente ? "Aplicando…" : `Aplicar +${minutos} min`}
            </button>
          )}
        </div>

        {era && (
          <button
            onClick={desfazer}
            disabled={pendente}
            className="mt-2 w-full rounded-[9px] border border-[#E8C9B8] bg-[#FBEDE6] px-4 py-2 text-[12.5px] font-semibold text-[#C55A32] disabled:opacity-50"
          >
            Desfazer atraso · voltar para {era}
          </button>
        )}
      </div>
    </div>
  );
}
