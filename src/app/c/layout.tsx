import type { Metadata } from "next";
import { garamond, jost } from "@/lib/fontes-convite";
import "../(portal)/portal.css";
import "../confirmar/confirmar.css";
import "../confirmar/convite.css";

// O endereço bonito do site do casamento (/c/ana-e-bruno). Mesmo visual
// e mesmas fontes da porta do hash — as fontes vêm de lib/fontes-convite
// para não redeclarar a família (o que quebra o build de produção).

export const metadata: Metadata = {
  title: "Convite",
  // aparecer em buscador é decisão do casal, nunca padrão do sistema
  robots: { index: false, follow: false },
};

export default function ConviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${garamond.variable} ${jost.variable} portal-raiz`}>
      {children}
    </div>
  );
}
