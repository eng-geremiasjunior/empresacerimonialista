"use client";

// O que a conferência do briefing NÃO conseguiu aplicar.
//
// Vive fora da caixa de conferência de propósito: as actions que a
// conferência chama revalidam a rota, a caixa é desmontada no mesmo
// instante e o aviso ia junto — ela aplicava, algo ficava de fora e a
// tela não dizia nada. Aqui o texto vem do banco e fica até ela ler.

import { useState, useTransition } from "react";
import { marcarAvisosLidos } from "@/app/(app)/eventos/[id]/briefing-extracao-actions";

export function AvisosDoBriefing({
  eventId,
  extracaoId,
  avisos,
}: {
  eventId: string;
  extracaoId: string;
  avisos: string[];
}) {
  const [pendente, iniciar] = useTransition();
  const [sumiu, setSumiu] = useState(false);

  if (sumiu || avisos.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-amber-900">
        {avisos.length === 1 ? "Ficou de fora" : "Ficaram de fora"}
      </h2>
      <ul className="mt-2 space-y-1.5">
        {avisos.map((a, i) => (
          <li key={i} className="text-[13px] leading-snug text-amber-900">
            {a}
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          iniciar(async () => {
            const r = await marcarAvisosLidos(eventId, extracaoId);
            if (!("error" in r)) setSumiu(true);
          })
        }
        disabled={pendente}
        className="mt-3 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-[13px] font-medium text-amber-900 hover:border-amber-500 disabled:opacity-40"
      >
        Entendi
      </button>
    </section>
  );
}
