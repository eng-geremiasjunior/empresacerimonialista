// "Como funciona": timeline horizontal numerada com as etapas do processo
// (Etapa 7). A linha que liga os círculos só existe a partir de sm — no
// celular a timeline empilha e a linha ficaria atravessando o texto.

import { Secao } from "./SecaoBase";
import type { EtapaPublica } from "@/lib/orcamento-publico";

export function ComoFunciona({ etapas }: { etapas: EtapaPublica[] }) {
  if (etapas.length === 0) return null;

  return (
    <Secao id="como-funciona" titulo="Como funciona">
      <div className="relative grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
        <div
          className="absolute left-[8%] right-[8%] top-5 hidden h-px lg:block"
          style={{ background: "#ECE0DA" }}
        />
        {etapas.map((etapa, i) => (
          <div key={`${etapa.titulo}-${i}`} className="relative z-[1] text-center">
            <div
              className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "#F6E9E6", color: "#A85950" }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div
              className="mb-1 text-[13px] font-semibold"
              style={{ color: "#2E2621" }}
            >
              {etapa.titulo}
            </div>
            {etapa.descricao && (
              <p
                className="text-[11.5px] leading-[1.5]"
                style={{ color: "#8A7B73" }}
              >
                {etapa.descricao}
              </p>
            )}
          </div>
        ))}
      </div>
    </Secao>
  );
}
