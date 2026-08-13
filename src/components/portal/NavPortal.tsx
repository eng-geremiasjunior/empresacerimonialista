"use client";

// As quatro abas do rodapé, no celular. Nunca cinco: não cabem em 430px, e
// a regra é permanente — área nova entra DENTRO de Evento, não como aba.
//
// O ativo é dito por um único fio de 1px que DESLIZA entre as abas (200ms).
// O fio nunca some e reaparece: ele viaja. Os botões não têm borda própria;
// só a cor do texto transiciona.
//
// A barra usa --cor-card (e não --cor-fundo) de propósito: é o que impede
// os fios da atmosfera de passarem por baixo dela.

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { rotulo: "Evento", seg: "" },
  { rotulo: "Escolhas", seg: "escolhas" },
  { rotulo: "Convidados", seg: "convidados" },
  { rotulo: "Linha do tempo", seg: "linha-do-tempo" },
];

export function NavPortal({ eventoId }: { eventoId: string }) {
  const pathname = usePathname();
  const base = `/portal/${eventoId}`;

  // Telas internas (perguntas, investimento, cortejo, inspirações) são
  // filhas de Evento, não irmãs: a aba Evento permanece acesa nelas.
  const indiceAtivo = (() => {
    for (let i = ABAS.length - 1; i >= 1; i--) {
      if (pathname.startsWith(`${base}/${ABAS[i].seg}`)) return i;
    }
    return 0;
  })();

  return (
    <nav
      style={{
        // sticky já cria o contexto para o fio absoluto
        position: "sticky",
        bottom: 0,
        zIndex: 2,
        background: "var(--cor-card)",
        borderTop: "var(--borda-fina)",
        display: "flex",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -1,
          left: 0,
          height: 1,
          width: "25%",
          background: "var(--cor-acento)",
          transform: `translateX(${indiceAtivo * 100}%)`,
          transition: "transform var(--dur-aba) var(--ease-padrao)",
        }}
      />
      {ABAS.map((aba, i) => {
        const href = aba.seg ? `${base}/${aba.seg}` : base;
        const ativa = i === indiceAtivo;
        return (
          <Link
            key={aba.rotulo}
            href={href}
            style={{
              flex: 1,
              minHeight: "var(--toque-min)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "var(--esp-4) var(--esp-1)",
              fontSize: "var(--ts-rotulo)",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textAlign: "center",
              color: ativa
                ? "var(--cor-acento)"
                : "var(--cor-texto-secundario)",
              transition: "color var(--dur-aba) var(--ease-padrao)",
            }}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
