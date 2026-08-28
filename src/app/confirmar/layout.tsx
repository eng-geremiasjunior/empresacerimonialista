import type { Metadata } from "next";
import { garamond, jost } from "@/lib/fontes-convite";
import "../(portal)/portal.css";
import "./confirmar.css";
import "./site.css";

// As telas do convidado — a individual (/confirmar/[hash]) e a do link
// do evento (/confirmar/evento/[hash]), que com o site publicado (128)
// vira o site do casamento inteiro.
//
// As fontes moram em lib/fontes-convite, declaradas UMA vez e usadas
// também pelo layout de /c: next/font resolve a fonte na compilação do
// módulo, e declarar a mesma família em vários arquivos quebra o build
// de produção (o dev não reclama).

export const metadata: Metadata = {
  title: "Confirmar presença",
  // convite pessoal: fora do índice de buscadores
  robots: { index: false, follow: false },
};

export default function ConfirmarLayout({
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
