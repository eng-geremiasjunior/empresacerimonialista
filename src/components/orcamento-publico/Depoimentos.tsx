"use client";

// "Depoimentos": prova social cadastrada pela cerimonialista. Só aparece
// quando existe ao menos um ativo — empresa que nunca cadastrou não ganha
// uma seção vazia na proposta.

import { Quote } from "lucide-react";
import { Card, Secao } from "./SecaoBase";
import { useTema } from "./TemaContexto";
import type { DepoimentoPublico } from "@/lib/orcamento-publico";

export function Depoimentos({ itens }: { itens: DepoimentoPublico[] }) {
  const tema = useTema();
  if (itens.length === 0) return null;

  return (
    <Secao id="depoimentos" titulo="Depoimentos" centralizado>
      <div
        className={`grid gap-4 ${
          itens.length > 1 ? "sm:grid-cols-2" : "max-w-[640px]"
        }`}
      >
        {itens.map((d, i) => (
          <Card
            key={`${d.autor}-${i}`}
            className={`p-5 ${tema.secoesEmCartao ? "border-0 shadow-none" : ""}`}
          >
            <Quote
              size={22}
              strokeWidth={1.5}
              style={{ color: "var(--cor-detalhe)" }}
              className="mb-2"
            />
            <p
              className="mb-4 text-[15px] italic leading-[1.55] [font-family:var(--font-playfair)]"
              style={{ color: "var(--cor-texto-principal)" }}
            >
              {d.texto}
            </p>
            <div
              className="text-[13.5px] font-semibold"
              style={{ color: "var(--cor-texto-principal)" }}
            >
              {d.autor}
            </div>
            {d.contexto && (
              <div
                className="text-[11.5px]"
                style={{ color: "var(--cor-texto-terciario)" }}
              >
                {d.contexto}
              </div>
            )}
          </Card>
        ))}
      </div>
    </Secao>
  );
}
