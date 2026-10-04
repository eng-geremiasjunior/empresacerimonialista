import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { GrupoFechado } from "@/lib/fechado";

// O quadro "O que já está fechado" da Visão geral (04/10/2026): as
// contratações com fornecedor e valor, e o caminho para o resto no modo
// Fechado do Planejamento. Some quando nada foi decidido.

export function FechadoDoEvento({
  eventId,
  grupos,
  decididas,
  contratado,
  veValor,
}: {
  eventId: string;
  grupos: GrupoFechado[];
  decididas: number;
  contratado: number;
  /** valor de contrato: só quem contrata vê (a mesma regra do valor do evento) */
  veValor: boolean;
}) {
  if (decididas === 0) return null;
  const contratacoes = grupos.flatMap((g) => g.linhas).filter((l) => l.contratacao);
  const mostrar = contratacoes.slice(0, 8);

  return (
    <section
      aria-label="O que já está fechado"
      style={{
        background: "var(--ev-card-bg)",
        border: "1px solid var(--ev-card-border)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid var(--ev-card-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: "var(--font-title)", fontSize: 16, fontWeight: 600, color: "var(--ev-text-strong)" }}>
          O que já está fechado
        </span>
        {veValor && contratado > 0 && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ev-text-body)" }}>
            {formatCurrency(contratado)} contratados
          </span>
        )}
      </div>

      {mostrar.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: "6px 24px" }}>
          {mostrar.map((l) => (
            <li
              key={l.decisaoId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "9px 0",
                borderBottom: "1px solid var(--ev-card-border)",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
              }}
            >
              <span style={{ minWidth: 0 }}>
                <b style={{ fontWeight: 600, color: "var(--ev-text-strong)" }}>{l.assunto}</b>
                <span style={{ color: l.fornecedor ? "var(--ev-text-body)" : "var(--ev-text-muted)" }}>
                  {" · "}
                  {l.fornecedor ?? "fornecedor não anotado"}
                </span>
              </span>
              {veValor && l.valor !== null && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ev-text-strong)", flex: "none" }}>
                  {formatCurrency(l.valor)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div style={{ padding: "12px 24px 16px" }}>
        <Link
          href={`/eventos/${eventId}/planejamento?modo=fechado`}
          style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--ev-text-strong)" }}
          className="hover:underline"
        >
          Ver as {decididas} {decididas === 1 ? "decisão fechada" : "decisões fechadas"} →
        </Link>
      </div>
    </section>
  );
}
