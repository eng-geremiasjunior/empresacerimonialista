"use client";

// Saudação de abertura da proposta, encenada em três tempos discretos:
//   1. "Olá," entra em fade.
//   2. o nome é revelado da esquerda para a direita (máscara com borda
//      suave — não wipe seco, não digitação).
//   3. a mensagem sobe alguns pixels em fade.
//
// Roda UMA vez por sessão e por proposta. Voltar à aba, rolar entre
// seções ou reabrir a mesma proposta no mesmo tab não repete (flag em
// sessionStorage, chaveada pelo path). prefers-reduced-motion desliga.
//
// Nunca esconde o texto de forma permanente: o SSR e o primeiro render
// entregam a frase inteira, visível e utilizável. Só quando o cliente
// abre pela primeira vez, e antes da primeira pintura, a versão animada
// assume — sem flash, porque a troca acontece em useLayoutEffect.

import { useLayoutEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Curva ease-out expo — desaceleração longa, o "toque premium" de
// Linear/Vercel. Nada de bounce.
const SUAVE = [0.16, 1, 0.3, 1] as const;

function TextoEstatico({
  nome,
  mensagem,
  className,
}: {
  nome: string;
  mensagem: string;
  className?: string;
}) {
  return (
    <p className={className} style={{ color: "var(--cor-texto-secundario)" }}>
      <span className="font-medium" style={{ color: "var(--cor-texto-principal)" }}>
        Olá, {nome}!
      </span>{" "}
      {mensagem}
    </p>
  );
}

function TextoAnimado({
  nome,
  mensagem,
  className,
}: {
  nome: string;
  mensagem: string;
  className?: string;
}) {
  return (
    <p className={className} style={{ color: "var(--cor-texto-secundario)" }}>
      <span className="font-medium" style={{ color: "var(--cor-texto-principal)" }}>
        {/* 1) "Olá," — só opacidade, sem deslocamento (nada pula) */}
        <motion.span
          className="inline-block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: SUAVE, delay: 0.25 }}
        >
          Olá,&nbsp;
        </motion.span>
        {/* 2) nome revelado L→R: clip-path abre da esquerda, e a opacidade
              amacia a borda para não virar um corte de vídeo */}
        <motion.span
          className="inline-block"
          style={{ willChange: "clip-path, opacity" }}
          initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0 }}
          animate={{ clipPath: "inset(0 0 0 0)", opacity: 1 }}
          transition={{ duration: 0.5, ease: SUAVE, delay: 0.45 }}
        >
          {nome}!
        </motion.span>
      </span>{" "}
      {/* 3) mensagem: fade + leve subida (8px) */}
      <motion.span
        className="inline"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: SUAVE, delay: 0.7 }}
        style={{ display: "inline-block" }}
      >
        {mensagem}
      </motion.span>
    </p>
  );
}

export function IntroSaudacao({
  nome,
  mensagem,
  className,
}: {
  nome: string;
  mensagem: string;
  className?: string;
}) {
  const semMovimento = useReducedMotion();
  const [animar, setAnimar] = useState(false);

  useLayoutEffect(() => {
    if (semMovimento) return;
    const chave = `vela-intro:${window.location.pathname}`;
    let jaViu = false;
    try {
      jaViu = sessionStorage.getItem(chave) === "1";
      if (!jaViu) sessionStorage.setItem(chave, "1");
    } catch {
      // sessionStorage indisponível (modo restrito): anima uma vez e
      // segue — sem persistência, mas sem quebrar.
    }
    if (!jaViu) setAnimar(true);
    // Sem dependências além do reduced-motion: roda uma vez no mount.
  }, [semMovimento]);

  // animar só vira true DENTRO do useLayoutEffect, que corre antes da
  // pintura — a troca para a versão que começa oculta não gera flash.
  return animar ? (
    <TextoAnimado nome={nome} mensagem={mensagem} className={className} />
  ) : (
    <TextoEstatico nome={nome} mensagem={mensagem} className={className} />
  );
}
