"use client";

// O guia de uso: busca ao digitar, grupos por módulo, resposta curta.
// Cada pergunta é um <details> nativo — abre uma, fecha outra, sem
// estado por item e sem JavaScript além do filtro.

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { filtrarAjuda, GRUPOS_AJUDA } from "@/lib/ajuda-conteudo";

export function AjudaTela() {
  const [termo, setTermo] = useState("");
  const grupos = useMemo(() => filtrarAjuda(GRUPOS_AJUDA, termo), [termo]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-lg font-semibold text-gray-900">Ajuda</h1>

      <div className="relative mt-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Busque por uma palavra — parcela, link, guia, prancha…"
          autoFocus
          className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
      </div>

      {grupos.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">
          Nada com esse termo. Tente outra palavra — ou me chame no
          WhatsApp que eu respondo.
        </p>
      ) : (
        grupos.map((g) => (
          <section key={g.titulo} className="mt-8">
            <h2 className="text-sm font-semibold text-gray-900">{g.titulo}</h2>
            <div className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white shadow-sm">
              {g.perguntas.map((p) => (
                <details key={p.id} className="group px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-gray-800 marker:content-none group-open:text-gray-900 [&::-webkit-details-marker]:hidden">
                    {p.pergunta}
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {p.resposta}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
