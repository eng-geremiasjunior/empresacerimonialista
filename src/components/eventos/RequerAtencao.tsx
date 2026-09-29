"use client";

// "Requer atenção", compacto, numa linha (Modelo A). Só existe quando há
// alerta; fica no Resumo (todos os alertas) e na fase à qual os alertas
// pertencem. Cada alerta é uma pílula que leva ao destino — sem a seta
// quando o destino é a tela atual (regra de 24/09/2026).
//
// Copiloto por regras, não IA: cada linha é contagem determinística
// sobre tarefas, fornecedores, parcelas e roteiro (saude-evento.ts).

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SaudeAlerta } from "@/lib/saude-evento";
import { faseDoSegmento, segmentoDoCaminho } from "@/lib/fases-do-evento";

/** "O evento é em 12 dias." → "o evento é em 12 dias" */
function porqueEmLinha(p: string): string {
  const s = p.trim().replace(/\.$/, "");
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function RequerAtencao({
  alertas,
  eventId,
}: {
  alertas: SaudeAlerta[];
  eventId: string;
}) {
  const pathname = usePathname() ?? "";
  const seg = segmentoDoCaminho(pathname, eventId);
  const fase = faseDoSegmento(seg);
  const noResumo = seg === "";

  const visiveis = alertas.filter((a) =>
    noResumo ? true : fase !== null && faseDoSegmento(a.destino) === fase
  );
  if (visiveis.length === 0) return null;

  return (
    <section
      aria-label="Requer atenção"
      style={{
        background: "var(--ev-card-bg)",
        border: "1px solid var(--ev-card-border)",
        borderRadius: 14,
        padding: "4px 6px 4px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: "var(--ev-warn)" }} />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", color: "var(--ev-text-strong)" }}>
          Requer atenção
        </span>
      </div>
      {visiveis.map((a, i) => {
        const aqui = seg === a.destino;
        const texto = a.porque ? `${a.texto} · ${porqueEmLinha(a.porque)}` : a.texto;
        const estilo: React.CSSProperties = {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          borderRadius: 9,
          background: "var(--ev-marfim)",
          border: "1px solid var(--ev-card-border)",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ev-text-strong)",
          transition: "border-color 140ms ease",
        };
        if (aqui) {
          return (
            <span key={i} style={estilo}>
              {texto}
            </span>
          );
        }
        return (
          <Link key={i} href={`/eventos/${eventId}/${a.destino}`} className="ev-pilula" style={estilo}>
            <span>{texto}</span>
            <span style={{ fontWeight: 600, color: "var(--ev-accent)", whiteSpace: "nowrap" }}>
              {a.acao} →
            </span>
          </Link>
        );
      })}
    </section>
  );
}
