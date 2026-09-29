"use client";

// Visão geral · O que o cliente vê · Histórico de alterações — o grupo
// segmentado do cabeçalho (Modelo A). Resumo, Área do cliente e
// Histórico saíram da barra de abas e subiram para cá, com o nome que
// quem nunca usou o sistema entende sem clicar. A dica de cada um vai
// no `title`.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LINKS_DO_CABECALHO, segmentoDoCaminho } from "@/lib/fases-do-evento";

// Heroicons outline (traço 1.7): grade 2×2, pessoa, relógio.
const ICONE: Record<string, string> = {
  "": "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
  "area-do-cliente":
    "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  historico: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
};

export function LinksDoCabecalho({ eventId }: { eventId: string }) {
  const pathname = usePathname() ?? "";
  const atual = segmentoDoCaminho(pathname, eventId);
  const base = `/eventos/${eventId}`;

  return (
    <nav
      aria-label="Visões do evento"
      style={{
        display: "inline-flex",
        alignSelf: "flex-start",
        gap: 2,
        marginTop: 8,
        padding: 3,
        border: "1px solid var(--ev-card-border)",
        borderRadius: 10,
        background: "var(--ev-marfim)",
        flexWrap: "wrap",
        maxWidth: "100%",
      }}
    >
      {LINKS_DO_CABECALHO.map((l) => {
        const ativo = atual === l.seg;
        return (
          <Link
            key={l.seg}
            href={l.seg ? `${base}/${l.seg}` : base}
            title={l.dica}
            aria-current={ativo ? "page" : undefined}
            className="ev-seg"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 12px",
              borderRadius: 7,
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: ativo ? 600 : 500,
              color: ativo ? "var(--ev-text-strong)" : "var(--ev-accent)",
              background: ativo ? "#ffffff" : "transparent",
              boxShadow: ativo ? "0 1px 2px rgba(0,0,0,.08)" : "none",
              whiteSpace: "nowrap",
              transition: "background 140ms ease, color 140ms ease",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d={ICONE[l.seg]} />
            </svg>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
