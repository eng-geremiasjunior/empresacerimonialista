"use client";

// Faixa final de conversão. "Aceitar proposta" reaproveita o fluxo real de
// aprovação das Etapas 5/6 (responder_orcamento -> ficha -> evento) — seria
// uma regressão trocar algo que já funciona por um placeholder.
//
// TODO (Etapa 10): "Solicitar alterações" ganha modal com texto livre e
// envio registrado. Por ora cai no WhatsApp da empresa, para o botão não
// ficar morto numa página que já está no ar.

import { Check, Heart } from "lucide-react";

export function CtaFinal({
  podeResponder,
  enviando,
  onAceitar,
  linkAlteracoes,
  mensagem,
}: {
  podeResponder: boolean;
  enviando: boolean;
  onAceitar: () => void;
  linkAlteracoes: string | null;
  mensagem?: string;
}) {
  return (
    <section className="pt-12 sm:pt-14">
      <div
        className="flex flex-wrap items-center justify-between gap-5 rounded-[18px] px-7 py-7 text-white sm:px-8"
        style={{ background: "#A85950" }}
      >
        <div className="flex max-w-[420px] items-center gap-3.5">
          <Heart size={22} className="flex-shrink-0" />
          <div>
            <div className="mb-1 text-[15px] font-semibold">
              Prontos para começar esse sonho juntos?
            </div>
            <div className="text-[12.5px] opacity-90">
              {mensagem ??
                "Aceite a proposta e daremos o próximo passo para tornar seu grande dia inesquecível."}
            </div>
          </div>
        </div>

        {podeResponder && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={onAceitar}
              disabled={enviando}
              className="flex items-center gap-1.5 rounded-[10px] bg-white px-5 py-3 text-[13.5px] font-bold disabled:opacity-60"
              style={{ color: "#A85950" }}
            >
              <Check size={16} />
              {enviando ? "Enviando…" : "Aceitar proposta"}
            </button>
            {linkAlteracoes && (
              <a
                href={linkAlteracoes}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[10px] border-[1.5px] px-5 py-3 text-[13.5px] font-semibold text-white"
                style={{ borderColor: "rgba(255,255,255,0.7)" }}
              >
                Solicitar alterações
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
