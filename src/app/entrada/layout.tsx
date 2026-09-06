import type { Metadata } from "next";
import { garamond, jost } from "@/lib/fontes-convite";
import "../(portal)/portal.css";
import "../confirmar/confirmar.css";

// A tela que o QR do convidado abre. Mesma casca do convite: as fontes
// vêm de lib/fontes-convite (declaradas uma vez só — next/font resolve a
// família na compilação do módulo, e repetir a declaração quebra o build
// de produção), e o cartão é o mesmo .rsvp-cartao.

export const metadata: Metadata = {
  title: "Sua entrada",
  // é o ingresso de alguém: fora do índice de buscadores
  robots: { index: false, follow: false },
};

export default function EntradaLayout({
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
