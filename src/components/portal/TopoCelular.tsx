"use client";

/* eslint-disable @next/next/no-img-element */

// O topo fixo do celular: botão de menu (abre a navegação completa em
// gaveta), a marca centralizada e sino + iniciais à direita.

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icones from "./icones";
import {
  duranteDoTipo,
  investimentoDoEvento,
  principaisDoTipo,
  visiveis,
  type Destino,
} from "./destinos";
import { Rotulo } from "./Nucleo";

function Icone({ nome }: { nome: string }) {
  const Ico = (Icones as unknown as Record<string, typeof Icones.Bell>)[nome];
  if (!Ico) return null;
  return <Ico size={Icones.TAMANHO} strokeWidth={Icones.TRACO} />;
}

function iniciaisDe(nome: string): string {
  // só letras — ver a mesma regra em CabecalhoEvento
  const partes = nome
    .split(/\s*(?:&|\be\b)\s*/i)
    .map((p) => p.replace(/[^\p{L}]/gu, "").trim())
    .filter(Boolean);
  return partes.length >= 2
    ? `${partes[0][0]}&${partes[1][0]}`.toUpperCase()
    : (partes[0] ?? nome).slice(0, 2).toUpperCase();
}

function GrupoGaveta({
  titulo,
  itens,
  base,
  aoNavegar,
}: {
  titulo?: string;
  itens: Destino[];
  base: string;
  aoNavegar: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {titulo && <Rotulo style={{ padding: "12px 14px 6px" }}>{titulo}</Rotulo>}
      {itens.map((d) => (
        <Link
          key={d.seg}
          href={d.seg ? `${base}/${d.seg}` : base}
          className="portal-nav-item"
          onClick={aoNavegar}
        >
          <Icone nome={d.icone} />
          {d.rotulo}
        </Link>
      ))}
    </div>
  );
}

export function TopoCelular({
  eventoId,
  tipo,
  nomeEvento,
  marcaNome,
  marcaLogoUrl,
  temPrestacao = false,
}: {
  eventoId: string;
  /** tipo do evento — decide quais destinos existem e como se chamam */
  tipo: string;
  nomeEvento: string;
  marcaNome: string | null;
  marcaLogoUrl: string | null;
  /** a prestação de contas só entra no menu depois de entregue */
  temPrestacao?: boolean;
}) {
  const [aberta, setAberta] = useState(false);
  const pathname = usePathname();
  const base = `/portal/${eventoId}`;
  const fechar = () => setAberta(false);

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--esp-3)",
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--cor-borda-suave)",
          background: "var(--cor-superficie-alt)",
        }}
      >
        <button
          type="button"
          aria-label={aberta ? "Fechar o menu" : "Abrir o menu"}
          aria-expanded={aberta}
          onClick={() => setAberta((a) => !a)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 38,
            height: 38,
            borderRadius: "var(--raio-chip)",
            border: "1px solid var(--cor-borda)",
            color: "var(--cor-texto-secundario)",
            background: "var(--cor-card-suave)",
            cursor: "pointer",
          }}
        >
          <Icones.Menu size={Icones.TAMANHO} strokeWidth={Icones.TRACO} />
        </button>

        {marcaLogoUrl ? (
          <img
            src={marcaLogoUrl}
            alt={marcaNome ?? "Cerimonialista"}
            style={{ height: 24, width: "auto" }}
          />
        ) : (
          <div
            style={{
              fontFamily: "var(--fonte-titulo)",
              fontSize: 22,
              letterSpacing: "var(--tr-marca)",
              color: "var(--cor-texto-forte)",
            }}
          >
            {(marcaNome ?? "Vela").toUpperCase()}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "flex", color: "#5A5148" }} aria-hidden>
            <Icones.Bell size={Icones.TAMANHO} strokeWidth={Icones.TRACO} />
          </span>
          <span
            aria-hidden
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--raio-pill)",
              background: "var(--cor-chip-redondo)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--fonte-titulo)",
              fontSize: 13,
              color: "var(--cor-ouro-texto)",
            }}
          >
            {iniciaisDe(nomeEvento)}
          </span>
        </div>
      </header>

      {/* a gaveta com a navegação completa (os grupos que não cabem nas
          5 abas de baixo moram aqui) */}
      {aberta && (
        <div
          role="dialog"
          aria-label="Navegação do portal"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20,
            display: "flex",
          }}
        >
          <div
            style={{
              width: 300,
              maxWidth: "84vw",
              background: "var(--cor-superficie-alt)",
              borderRight: "1px solid var(--cor-borda-sidebar)",
              padding: "26px 16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "var(--esp-5)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--fonte-titulo)",
                fontSize: 22,
                letterSpacing: "var(--tr-marca)",
                color: "var(--cor-texto-forte)",
                padding: "0 14px",
              }}
            >
              {(marcaNome ?? "Vela").toUpperCase()}
            </div>
            <GrupoGaveta itens={visiveis(principaisDoTipo(tipo))} base={base} aoNavegar={fechar} />
            <GrupoGaveta titulo="Durante o evento" itens={visiveis(duranteDoTipo(tipo))} base={base} aoNavegar={fechar} />
            <GrupoGaveta titulo="Investimento" itens={investimentoDoEvento(temPrestacao)} base={base} aoNavegar={fechar} />
          </div>
          <button
            type="button"
            aria-label="Fechar o menu"
            onClick={fechar}
            style={{
              flex: 1,
              background: "rgba(51, 43, 36, 0.28)",
              border: "none",
              cursor: "pointer",
            }}
          />
        </div>
      )}
    </>
  );
}
