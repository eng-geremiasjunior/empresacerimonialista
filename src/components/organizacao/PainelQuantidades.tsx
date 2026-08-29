"use client";

// As quantidades, dentro da Organização.
//
// A Organização era 100% tarefa: o que precisa ser FEITO. Faltava o que
// precisa estar CERTO — quantos doces, quantos salgados, quantos quilos
// de bolo. Quem coordena precisa desse número na mesma tela onde
// trabalha, não a três cliques.
//
// Aqui só se lê. Contagem, custo e sobra vivem na Operação: esta é a
// régua, não a planilha — por isso seis itens e uma saída, não a lista
// inteira competindo com as tarefas.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { consumido, numero, type Recurso } from "@/lib/recursos-core";

const MAX_VISIVEIS = 6;

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

  const visiveis = recursos.slice(0, MAX_VISIVEIS);
  const restantes = recursos.length - visiveis.length;
  const aComprar = recursos.filter(
    (r) => (r.previsto ?? 0) > 0 && (r.comprado ?? 0) < (r.previsto ?? 0)
  ).length;

  return (
    <section style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-strong)" }}>
          Quantidades
        </span>
        {publico && publico.quantidade > 0 && (
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            para {publico.quantidade}{" "}
            {publico.origem === "confirmados" ? "confirmados" : "estimados"}
          </span>
        )}
        {aComprar > 0 && (
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            · {aComprar}{" "}
            {aComprar === 1 ? "item ainda a comprar" : "itens ainda a comprar"}
          </span>
        )}
      </div>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          columnGap: 24,
          rowGap: 4,
        }}
      >
        {visiveis.map((r) => {
          const c = consumido(r);
          const falta =
            (r.previsto ?? 0) > 0 && (r.comprado ?? 0) < (r.previsto ?? 0);
          return (
            <li
              key={r.id}
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 13,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  color: "var(--text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.nome}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                  color: falta ? "var(--text-strong)" : "var(--text-muted)",
                  fontWeight: falta ? 600 : 400,
                }}
              >
                {numero(c ?? r.previsto)}{" "}
                <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 400 }}>
                  {r.unidade}
                </span>
                {r.acabouEm && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "var(--danger, #b91c1c)",
                    }}
                  >
                    acabou {r.acabouEm}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <Link
        href={`/eventos/${eventId}/operacao`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginTop: 8,
          fontSize: 12.5,
          fontWeight: 500,
          color: "var(--text-muted)",
          textDecoration: "none",
        }}
      >
        {restantes > 0
          ? `Ver os outros ${restantes} e registrar a contagem`
          : "Registrar entrada, sobra e custo"}
        <ArrowRight size={13} />
      </Link>
    </section>
  );
}
