"use client";

// Barra de progresso de leitura, fixa no topo da proposta.
//
// Usa useScroll + scaleX do framer-motion em vez de um listener com
// throttle: o valor é uma MotionValue escrita direto no style do DOM, sem
// passar por setState. Ou seja, rolar a página não dispara nenhum render
// do React — é mais barato que qualquer throttle que eu escrevesse à mão.

import { motion, useScroll, useSpring } from "framer-motion";

export function BarraProgresso() {
  const { scrollYProgress } = useScroll();
  // Mola leve: sem ela a barra "pula" em scroll com roda do mouse.
  const progresso = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 26,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[60] h-1 origin-left"
      style={{ scaleX: progresso, background: "#A85950" }}
    />
  );
}
