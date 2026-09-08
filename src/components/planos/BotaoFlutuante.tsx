"use client";

// O botão que acompanha a rolagem no desktop.
//
// Aparece quando o botão do hero sai da tela e some quando a chamada
// final entra — nos dois momentos já existe um botão igual à vista, e
// dois "assine agora" lado a lado é ruído. No celular ele não existe:
// lá a barra fixa do rodapé já faz esse papel (regra em estilo.ts).

import { useEffect, useState } from "react";

const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";

export function BotaoFlutuante({
  href,
  rotulo,
  preco,
}: {
  href: string;
  rotulo: string;
  preco: string | null;
}) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const heroi = document.querySelector("[data-cta-hero]");
    const fim = document.querySelector("[data-cta-final]");
    if (!heroi || typeof IntersectionObserver === "undefined") return;
    let heroiNaTela = true;
    let fimNaTela = false;
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.target === heroi) heroiNaTela = e.isIntersecting;
        if (e.target === fim) fimNaTela = e.isIntersecting;
      }
      setVisivel(!heroiNaTela && !fimNaTela);
    });
    io.observe(heroi);
    if (fim) io.observe(fim);
    return () => io.disconnect();
  }, []);

  if (!visivel) return null;

  return (
    <div
      data-flutuante="1"
      style={{
        position: "fixed",
        right: "24px",
        bottom: "24px",
        zIndex: "40",
        animation: "flutuaEntra 320ms cubic-bezier(.2,.8,.3,1) both",
      }}
    >
      <a
        href={href}
        className="pl-h-ameixa pl-cta"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          minHeight: "52px",
          padding: "0 18px 0 24px",
          borderRadius: "999px",
          background: "#6E3F5F",
          color: "#FAF8F5",
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "15.5px",
          whiteSpace: "nowrap",
        }}
      >
        {rotulo}
        {preco && (
          <span
            style={{
              fontFamily: MONO,
              fontWeight: "500",
              fontSize: "13px",
              letterSpacing: "-0.01em",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "rgba(250,248,245,.16)",
            }}
          >
            {preco}
          </span>
        )}
      </a>
    </div>
  );
}
