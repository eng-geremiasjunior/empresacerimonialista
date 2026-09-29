"use client";

// As quantidades, numa linha, dentro da Organização (Modelo A).
//
// A Organização é o que precisa ser FEITO; as quantidades são o que
// precisa estar CERTO. Aqui só se lê: quantos itens ainda faltam comprar
// ou separar, para quanta gente. Contagem, custo e sobra vivem na
// Operação — "Ver na Operação" leva lá.

import Link from "next/link";
import type { Recurso } from "@/lib/recursos-core";
import { plural } from "@/lib/format";

export function PainelQuantidades({
  eventId,
  recursos,
  publico,
}: {
  eventId: string;
  recursos: Recurso[];
  publico: { quantidade: number; origem: string } | null;
}) {
  if (recursos.length === 0) return null;

  const aComprar = recursos.filter(
    (r) =>
      r.compravel &&
      r.origemSuprimento === "compra" &&
      (r.previsto ?? 0) > 0 &&
      (r.comprado ?? 0) < (r.previsto ?? 0)
  ).length;
  // do estoque e ainda na prateleira (184)
  const aSeparar = recursos.filter(
    (r) => r.reserva && !r.reserva.separadoEm && !r.reserva.fechadoEm
  ).length;

  const partes: string[] = [];
  if (aComprar > 0) partes.push(`${aComprar} ${aComprar === 1 ? "item ainda a comprar" : "itens ainda a comprar"}`);
  if (aSeparar > 0) partes.push(`${aSeparar} do estoque a separar`);
  if (partes.length === 0) partes.push(plural(recursos.length, "item dimensionado", "itens dimensionados"));
  if (publico && publico.quantidade > 0) {
    partes.push(`para ${publico.quantidade} ${publico.origem === "confirmados" ? "confirmados" : "estimados"}`);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 10,
        background: "var(--ev-marfim, #faf8f5)",
        border: "1px solid var(--ev-card-border, var(--border-hairline))",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        color: "var(--ev-text-body, var(--text-body))",
        flexWrap: "wrap",
      }}
    >
      <b style={{ color: "var(--ev-text-strong, var(--text-strong))", fontWeight: 600 }}>Quantidades</b>
      <span>{partes.join(" · ")}</span>
      <Link
        href={`/eventos/${eventId}/operacao`}
        style={{ marginLeft: "auto", fontWeight: 600, color: "var(--ev-text-strong, var(--text-strong))", whiteSpace: "nowrap" }}
      >
        Ver na Operação →
      </Link>
    </div>
  );
}
