"use client";

// FAQ em accordion. Estado local, sem persistência — cada pergunta abre e
// fecha independentemente (o cliente costuma querer comparar respostas).

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Secao } from "./SecaoBase";
import type { FaqPublico } from "@/lib/orcamento-publico";

export function FaqAccordion({ itens }: { itens: FaqPublico[] }) {
  const [abertos, setAbertos] = useState<Record<number, boolean>>({});

  if (itens.length === 0) return null;

  return (
    <Secao id="faq" titulo="Perguntas frequentes">
      <div className="flex flex-col gap-2.5">
        {itens.map((item, i) => {
          const aberto = !!abertos[i];
          return (
            <div
              key={`${item.pergunta}-${i}`}
              className="rounded-xl border bg-white px-4 py-4 sm:px-[18px]"
              style={{ borderColor: "#ECE0DA" }}
            >
              <button
                onClick={() => setAbertos((p) => ({ ...p, [i]: !p[i] }))}
                aria-expanded={aberto}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span
                  className="text-[13.5px] font-semibold"
                  style={{ color: "#2E2621" }}
                >
                  {item.pergunta}
                </span>
                <span className="flex-shrink-0" style={{ color: "#A85950" }}>
                  {aberto ? <Minus size={16} /> : <Plus size={16} />}
                </span>
              </button>
              {aberto && (
                <p
                  className="mt-2.5 text-[12.5px] leading-[1.6]"
                  style={{ color: "#8A7B73" }}
                >
                  {item.resposta}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Secao>
  );
}
