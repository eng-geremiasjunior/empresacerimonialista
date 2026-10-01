"use client";

// Os 3 cartões de destaque (T03 e T04), em grade auto-fit (mínimo 280px):
// cada um é um link com ícone, rótulo, a seta em accentText, o valor em
// headFont clamp(28px,3vw,36px) e a nota de 14px; no hover sobe 4px com
// sombra. Entram com reveal de 0, 100 e 200ms.
//
//   1. Cerimônia: a hora do evento ("16h30") → #dia;
//   2. Traje: o título do traje ("Social") → #traje;
//   3. o prazo da confirmação ("15 de outubro") → #rsvp. No desenho era a
//      cota da lua de mel com a barra de arrecadado, que ninguém confirma.
//
// Cada um só aparece com o dado; o que leva a uma seção ausente vira
// cartão sem link. Sem nenhum, a fileira some.

import { useEffect, useState, type ReactNode } from "react";
import { hojeBR } from "@/lib/tempo";
import { formatarPrazo } from "@/components/site/pecas/useRsvp";
import { Icone, type NomeDoIcone } from "../comum";

export type Destaque = {
  rotulo: string;
  valor: string;
  nota: ReactNode;
  icone: NomeDoIcone;
  /** a âncora; ausente = cartão sem link */
  href?: string;
};

/** O título do traje sem o "Traje:" que a noiva às vezes já escreve. */
export function nomeDoTraje(titulo: string): string {
  return titulo.replace(/^\s*traje\s*:?\s*/i, "").trim() || titulo.trim();
}

/** "Faltam 14 dias" até o prazo, no dia de Brasília. Calculado depois da
 *  montagem: o servidor e o celular podem estar em dias diferentes. */
function useFaltamDias(prazo: string | null): string {
  const [nota, setNota] = useState("");
  useEffect(() => {
    if (!prazo) return;
    const hoje = hojeBR();
    const dias = Math.round((Date.parse(`${prazo}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 864e5);
    setNota(dias > 1 ? `Faltam ${dias} dias` : dias === 1 ? "Falta 1 dia" : dias === 0 ? "Hoje é o último dia" : "");
  }, [prazo]);
  return nota;
}

export function NotaDoPrazo({ prazo }: { prazo: string }) {
  return <>{useFaltamDias(prazo)}</>;
}

export function destaquesDoSite({
  hora,
  traje,
  prazo,
  comDia,
  comTraje,
  comRsvp,
}: {
  hora: string | null;
  traje: string | null;
  prazo: string | null;
  comDia: boolean;
  comTraje: boolean;
  comRsvp: boolean;
}): Destaque[] {
  const d: Destaque[] = [];
  if (hora)
    d.push({
      rotulo: "Cerimônia",
      valor: hora,
      nota: "Chegue com 30 minutos de antecedência",
      icone: "relogio",
      href: comDia ? "#dia" : undefined,
    });
  if (traje && comTraje)
    d.push({ rotulo: "Traje", valor: nomeDoTraje(traje), nota: "Elegante e confortável", icone: "cabide", href: "#traje" });
  if (prazo && comRsvp)
    d.push({
      rotulo: "Confirme até",
      valor: formatarPrazo(prazo),
      nota: <NotaDoPrazo prazo={prazo} />,
      icone: "envelope",
      href: "#rsvp",
    });
  return d;
}

export function Destaques({ itens }: { itens: Destaque[] }) {
  if (itens.length === 0) return null;
  return (
    <div className="k-destaques">
      {itens.map((d, i) => {
        const miolo = (
          <>
            <div className="k-destaque-topo">
              <span className="k-destaque-rotulo">
                <Icone nome={d.icone} className="k-destaque-icone" />
                {d.rotulo}
              </span>
              {d.href && <Icone nome="seta" className="k-destaque-seta" />}
            </div>
            <div className="k-destaque-valor">{d.valor}</div>
            <div className="k-destaque-nota">{d.nota}</div>
          </>
        );
        const comum = {
          className: `k-destaque ${d.href ? "k-destaque--link" : ""}`,
          "data-revelar": "up",
          "data-atraso": i * 100 || undefined,
        };
        return d.href ? (
          <a key={d.rotulo} href={d.href} {...comum}>
            {miolo}
          </a>
        ) : (
          <div key={d.rotulo} {...comum}>
            {miolo}
          </div>
        );
      })}
    </div>
  );
}
