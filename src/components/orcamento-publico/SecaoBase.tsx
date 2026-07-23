"use client";

// Casca comum das seções da proposta pública: âncora, espaçamento, título
// serifado e a animação de entrada (fade + slide, uma única vez).
//
// A animação NUNCA deixa o conteúdo permanentemente invisível: se o leitor
// pediu menos movimento (prefers-reduced-motion), entramos já em opacity 1
// sem deslocamento. É uma página de conversão — animação que falha não pode
// custar o conteúdo.

import { motion, useReducedMotion } from "framer-motion";

const DURACAO = 0.45;

export function Revelar({
  children,
  atraso = 0,
  className,
}: {
  children: React.ReactNode;
  atraso?: number;
  className?: string;
}) {
  const semMovimento = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={semMovimento ? { opacity: 1 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: DURACAO, ease: "easeOut", delay: atraso }}
    >
      {children}
    </motion.div>
  );
}

export function Secao({
  id,
  titulo,
  subtitulo,
  children,
}: {
  id: string;
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <Revelar className="scroll-mt-6 pt-12 sm:pt-14">
      <section id={id} className="scroll-mt-6">
        <h2
          className="text-[22px] font-medium sm:text-[26px] [font-family:var(--font-playfair)]"
          style={{ color: "#2E2621" }}
        >
          {titulo}
        </h2>
        {subtitulo && (
          <p className="mt-1 text-[12.5px] font-semibold" style={{ color: "#A85950" }}>
            {subtitulo}
          </p>
        )}
        <div className="mt-5">{children}</div>
      </section>
    </Revelar>
  );
}

// Card branco padrão (borda e raio dos tokens).
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[14px] border bg-white ${className}`}
      style={{ borderColor: "#ECE0DA" }}
    >
      {children}
    </div>
  );
}
