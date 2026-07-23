"use client";

// CTA flutuante: aparece depois que o cliente passa do hero e some quando
// a faixa final já está na tela (dois botões iguais visíveis ao mesmo
// tempo confundem mais do que convertem).
//
// O estado só muda ao CRUZAR o limiar, não a cada pixel: useMotionValueEvent
// lê a MotionValue fora do ciclo de render e o setState é condicional.

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Check } from "lucide-react";

const LIMIAR = 420; // px — altura aproximada do hero

export function StickyCta({
  visivel,
  enviando,
  onAceitar,
  valorFormatado,
}: {
  visivel: boolean;
  enviando: boolean;
  onAceitar: () => void;
  valorFormatado: string;
}) {
  const { scrollY } = useScroll();
  const [passouDoHero, setPassouDoHero] = useState(false);
  const [noFim, setNoFim] = useState(false);
  const ultimo = useRef(0);

  useMotionValueEvent(scrollY, "change", (y) => {
    if (Math.abs(y - ultimo.current) < 24) return; // ignora micro-scroll
    ultimo.current = y;

    const passou = y > LIMIAR;
    setPassouDoHero((p) => (p === passou ? p : passou));

    // Perto do rodapé a faixa final já está visível.
    const restante =
      document.documentElement.scrollHeight - (y + window.innerHeight);
    const fim = restante < 520;
    setNoFim((p) => (p === fim ? p : fim));
  });

  const mostrar = visivel && passouDoHero && !noFim;

  return (
    <AnimatePresence>
      {mostrar && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t px-4 py-3 lg:left-[250px]"
          style={{
            background: "rgba(255,255,255,0.96)",
            borderColor: "#ECE0DA",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-4">
            <div className="min-w-0">
              <div
                className="text-[10px] font-semibold uppercase tracking-[1.2px]"
                style={{ color: "#8A7B73" }}
              >
                Investimento
              </div>
              <div
                className="truncate text-[17px] font-bold leading-tight"
                style={{ color: "#A85950" }}
              >
                {valorFormatado}
              </div>
            </div>
            <button
              onClick={onAceitar}
              disabled={enviando}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-[10px] px-5 py-3 text-[13.5px] font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "#A85950" }}
            >
              <Check size={16} />
              {enviando ? "Enviando…" : "Aceitar proposta"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
