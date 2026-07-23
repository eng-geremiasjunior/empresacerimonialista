"use client";

// "Como funciona": timeline horizontal numerada com as etapas do processo
// (Etapa 7). As etapas entram EM SEQUÊNCIA (stagger de 300ms), e a linha
// conectora cresce junto, reforçando a ideia de processo sendo construído.
//
// A linha só existe a partir de lg — no celular a timeline empilha e uma
// linha horizontal atravessaria o texto.

import { motion, useReducedMotion } from "framer-motion";
import { Secao } from "./SecaoBase";
import type { EtapaPublica } from "@/lib/orcamento-publico";

const PASSO = 0.3; // 300ms entre etapas, conforme o brief

export function ComoFunciona({ etapas }: { etapas: EtapaPublica[] }) {
  const semMovimento = useReducedMotion();
  if (etapas.length === 0) return null;

  // Duração da linha = tempo até a última etapa aparecer.
  const duracaoLinha = Math.max(0.6, etapas.length * PASSO);

  return (
    <Secao id="como-funciona" titulo="Como funciona">
      <motion.div
        className="relative grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3"
        initial="oculto"
        whileInView="visivel"
        viewport={{ once: true, amount: 0.25 }}
        variants={{
          visivel: { transition: { staggerChildren: semMovimento ? 0 : PASSO } },
        }}
      >
        <motion.div
          className="absolute left-[8%] top-5 hidden h-px origin-left lg:block"
          style={{ background: "var(--cor-borda)", right: "8%" }}
          initial={semMovimento ? { scaleX: 1 } : { scaleX: 0 }}
          variants={{ visivel: { scaleX: 1 } }}
          transition={{ duration: duracaoLinha, ease: "linear" }}
        />

        {etapas.map((etapa, i) => (
          <motion.div
            key={`${etapa.titulo}-${i}`}
            data-revelar
            className="relative z-[1] text-center"
            variants={{
              oculto: semMovimento
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.9 },
              visivel: { opacity: 1, scale: 1 },
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div
              className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "var(--cor-fundo-destaque)", color: "var(--cor-acento)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div
              className="mb-1 text-[13px] font-semibold"
              style={{ color: "var(--cor-texto-principal)" }}
            >
              {etapa.titulo}
            </div>
            {etapa.descricao && (
              <p
                className="text-[11.5px] leading-[1.5]"
                style={{ color: "var(--cor-texto-terciario)" }}
              >
                {etapa.descricao}
              </p>
            )}
          </motion.div>
        ))}
      </motion.div>
    </Secao>
  );
}
