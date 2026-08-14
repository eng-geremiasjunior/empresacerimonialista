"use client";

/* eslint-disable @next/next/no-img-element */

// A barra lateral do computador (276px): marca, navegação principal,
// os dois grupos e o cartão da cerimonialista ancorado no rodapé.
//
// O item ativo é dito por fundo (#F3EBDF) e cor do texto — sem pílula,
// sem barra lateral, sem seta. Hover só troca o fundo.

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icones from "./icones";
import { DURANTE, INVESTIMENTO, PRINCIPAIS, type Destino } from "./destinos";
import { Rotulo } from "./Nucleo";

function Icone({ nome, tamanho }: { nome: string; tamanho?: number }) {
  const Ico = (Icones as unknown as Record<string, typeof Icones.Bell>)[nome];
  if (!Ico) return null;
  return <Ico size={tamanho ?? Icones.TAMANHO} strokeWidth={Icones.TRACO} />;
}

function itemAtivo(pathname: string, base: string, seg: string): boolean {
  if (seg === "") return pathname === base || pathname === `${base}/`;
  return pathname.startsWith(`${base}/${seg}`);
}

function Grupo({
  titulo,
  itens,
  base,
  pathname,
}: {
  titulo: string;
  itens: Destino[];
  base: string;
  pathname: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Rotulo style={{ padding: "0 14px 6px" }}>{titulo}</Rotulo>
      {itens.map((d) => (
        <Link
          key={d.seg}
          href={d.seg ? `${base}/${d.seg}` : base}
          className="portal-nav-item"
          data-sub="true"
          data-ativa={itemAtivo(pathname, base, d.seg)}
        >
          <Icone nome={d.icone} />
          {d.rotulo}
        </Link>
      ))}
    </div>
  );
}

export function NavLateral({
  eventoId,
  marcaNome,
  marcaLogoUrl,
  cerimonialistaNome,
  cerimonialistaZap,
}: {
  eventoId: string;
  marcaNome: string | null;
  marcaLogoUrl: string | null;
  cerimonialistaNome: string | null;
  cerimonialistaZap: string | null;
}) {
  const pathname = usePathname();
  const base = `/portal/${eventoId}`;
  const primeiroNome = cerimonialistaNome?.split(" ")[0] ?? null;

  return (
    <aside className="portal-sidebar">
      {/* marca — a logo é da cerimonialista; sem arquivo, o nome dela */}
      <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        {marcaLogoUrl ? (
          <img
            src={marcaLogoUrl}
            alt={marcaNome ?? "Cerimonialista"}
            style={{ height: 30, width: "auto", alignSelf: "flex-start" }}
          />
        ) : (
          <div
            style={{
              fontFamily: "var(--fonte-titulo)",
              fontSize: "var(--ts-marca)",
              letterSpacing: "var(--tr-marca)",
              color: "var(--cor-texto)",
              lineHeight: 1,
            }}
          >
            {(marcaNome ?? "Vela").toUpperCase()}
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--cor-texto-suave)" }}>
          {primeiroNome ? `por ${cerimonialistaNome}` : "por sua cerimonialista"}
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {PRINCIPAIS.map((d) => (
          <Link
            key={d.seg}
            href={d.seg ? `${base}/${d.seg}` : base}
            className="portal-nav-item"
            data-ativa={itemAtivo(pathname, base, d.seg)}
          >
            <Icone nome={d.icone} />
            {d.rotulo}
          </Link>
        ))}
      </nav>

      <Grupo titulo="Durante o evento" itens={DURANTE} base={base} pathname={pathname} />
      <Grupo titulo="Investimento" itens={INVESTIMENTO} base={base} pathname={pathname} />

      {/* cerimonialista, ancorada no rodapé */}
      {cerimonialistaNome && (
        <div
          style={{
            marginTop: "auto",
            border: "1px solid var(--cor-borda)",
            borderRadius: "var(--raio-chip)",
            background: "var(--cor-card-suave)",
            padding: "18px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "var(--esp-4)",
          }}
        >
          <Rotulo>Sua cerimonialista</Rotulo>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--esp-3)" }}>
            <span
              aria-hidden
              style={{
                width: 42,
                height: 42,
                flex: "none",
                borderRadius: "var(--raio-pill)",
                background: "var(--cor-chip-redondo)",
                border: "1px solid #EAE1D3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--fonte-titulo)",
                fontSize: 16,
                color: "var(--cor-ouro-texto)",
              }}
            >
              {cerimonialistaNome.slice(0, 1).toUpperCase()}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div
                style={{
                  fontFamily: "var(--fonte-titulo)",
                  fontSize: 18,
                  color: "var(--cor-texto)",
                }}
              >
                {cerimonialistaNome}
              </div>
              <div style={{ fontSize: 12, color: "var(--cor-texto-suave)" }}>
                responde em algumas horas
              </div>
            </div>
          </div>
          {cerimonialistaZap && (
            <a
              href={cerimonialistaZap}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--esp-2)",
                border: "1px solid var(--cor-borda-botao-ouro)",
                borderRadius: "var(--raio-botao)",
                padding: 11,
                minHeight: "var(--toque-min)",
                fontSize: "var(--ts-botao)",
                color: "var(--cor-ouro-texto-hover)",
                background: "var(--cor-superficie-alt)",
              }}
            >
              <Icones.MessageCircle size={Icones.TAMANHO} strokeWidth={Icones.TRACO} />
              Falar com {primeiroNome}
            </a>
          )}
        </div>
      )}
    </aside>
  );
}
