"use client";

// Casca comum das seções da proposta pública: âncora, espaçamento, título
// serifado e a animação de entrada (fade + slide, uma única vez).
//
// No Template 2 a seção vira um CARTÃO BRANCO de raio 20 com sombra suave
// e o título ganha o traço final ("Como funciona —"), seguindo a arte.

import { motion, useReducedMotion } from "framer-motion";
import { useTema } from "./TemaContexto";

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
      data-revelar
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

// Cartão branco das seções do Template 2 (no Template 1 é transparente).
export function MolduraSecao({ children }: { children: React.ReactNode }) {
  const tema = useTema();
  if (!tema.secoesEmCartao) return <>{children}</>;
  return (
    <div
      className="rounded-[20px] px-6 py-7 sm:px-8"
      style={{
        background: "var(--cor-card)",
        boxShadow: "0 2px 10px rgba(40,40,20,0.05)",
      }}
    >
      {children}
    </div>
  );
}

export function TituloSecao({
  children,
  centralizado = false,
}: {
  children: React.ReactNode;
  centralizado?: boolean;
}) {
  const tema = useTema();
  const barra = tema.tituloEstilo === "centralizado-barra";

  return (
    <div className={barra ? "text-center" : ""}>
      <h2
        className={`text-[22px] font-medium sm:text-[28px] [font-family:var(--font-playfair)] ${
          centralizado && tema.tituloEstilo === "traco" ? "text-center" : ""
        }`}
        style={{ color: "var(--cor-texto-principal)" }}
      >
        {children}
        {tema.tituloEstilo === "traco" && (
          <span style={{ color: "var(--cor-texto-terciario)" }}> —</span>
        )}
      </h2>
      {/* Arte do Template 3: filete dourado no lugar do traço. */}
      {barra && (
        <div
          className="mx-auto mt-3 h-[2px] w-[50px]"
          style={{ background: "var(--cor-detalhe)" }}
        />
      )}
    </div>
  );
}

export function Secao({
  id,
  titulo,
  subtitulo,
  centralizado = false,
  children,
}: {
  id: string;
  titulo: string;
  subtitulo?: string;
  centralizado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Revelar className="scroll-mt-6 pt-8 sm:pt-10">
      <section id={id} className="scroll-mt-6">
        <MolduraSecao>
          <TituloSecao centralizado={centralizado}>{titulo}</TituloSecao>
          {subtitulo && (
            <p
              className="mt-1 text-[12.5px] font-semibold"
              style={{ color: "var(--cor-acento)" }}
            >
              {subtitulo}
            </p>
          )}
          <div className="mt-5">{children}</div>
        </MolduraSecao>
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
  const tema = useTema();
  // Template 3 usa sombra difusa em vez de borda.
  return (
    <div
      className={`rounded-[14px] bg-white ${tema.cartaoComSombra ? "" : "border"} ${className}`}
      style={
        tema.cartaoComSombra
          ? { boxShadow: "0 2px 12px rgba(58,13,25,0.06)" }
          : { borderColor: "var(--cor-borda)" }
      }
    >
      {children}
    </div>
  );
}
