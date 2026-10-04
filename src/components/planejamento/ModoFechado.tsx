"use client";

// Modo Fechado (04/10/2026): "foi feito, ok — onde vejo isso rápido?".
// Tudo o que está decidido, por assunto, com o resultado escrito na linha
// (fornecedor, valor, data, escolha). Tocar abre a decisão. A decisão
// fechada sem nada anotado aparece também, discreta: está decidida, só não
// guardou o quê.

import type { Decisao, Objetivo } from "@/lib/supabase/planejamento";
import { oQueEstaFechado, type FornecedorVinculado } from "@/lib/fechado";
import { brl, C, F_MONO, F_UI, monoLabel } from "./celebra";
import type { SupplierRef } from "./DrawerDecisao";

export function ModoFechado({
  objetivos,
  suppliers,
  vinculados,
  onAbrirDecisao,
}: {
  objetivos: Objetivo[];
  suppliers: SupplierRef[];
  vinculados: FornecedorVinculado[];
  onAbrirDecisao: (d: Decisao) => void;
}) {
  const { grupos, decididas, comAnotacao, contratado } = oQueEstaFechado(objetivos, suppliers, vinculados);
  const porId = new Map(objetivos.flatMap((o) => o.decisoes.map((d) => [d.id, d] as const)));

  if (decididas === 0) {
    return (
      <p style={{ fontFamily: F_UI, fontSize: 14, color: C.secundario, padding: "24px 0" }}>
        Nada decidido ainda.
      </p>
    );
  }

  const semAnotacao = decididas - comAnotacao;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p style={{ margin: 0, fontFamily: F_UI, fontSize: 14, color: C.corpo }}>
        <b style={{ color: C.tinta }}>
          {decididas} {decididas === 1 ? "decisão fechada" : "decisões fechadas"}
        </b>
        {contratado > 0 && <> · {brl(contratado)} em contratações</>}
        {semAnotacao > 0 && (
          <span style={{ color: C.meta }}>
            {" "}
            · {semAnotacao} sem anotação
          </span>
        )}
      </p>

      {grupos.map((g) => (
        <section
          key={g.objetivo}
          style={{ background: C.card, border: `1px solid ${C.bordaSutil}`, borderRadius: 10, overflow: "hidden" }}
        >
          <h3 style={{ ...monoLabel, margin: 0, padding: "10px 16px", background: C.zona2, borderBottom: `1px solid ${C.divisoria}` }}>
            {g.objetivo}
          </h3>
          {g.linhas.map((l) => {
            const d = porId.get(l.decisaoId);
            return (
              <button
                key={l.decisaoId}
                type="button"
                onClick={() => d && onAbrirDecisao(d)}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                  width: "100%",
                  textAlign: "left",
                  padding: "11px 16px",
                  border: "none",
                  borderBottom: `1px solid ${C.divisoria2}`,
                  background: "none",
                  cursor: "pointer",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontFamily: F_UI, fontSize: 14, fontWeight: 600, color: l.semAnotacao ? C.secundario : C.tinta, minWidth: 180 }}>
                  {l.assunto}
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 200,
                    fontFamily: l.semAnotacao ? F_MONO : F_UI,
                    fontSize: l.semAnotacao ? 11 : 14,
                    color: l.semAnotacao ? C.meta : C.corpo,
                  }}
                >
                  {l.semAnotacao ? "sem anotação" : l.partes.join(" · ")}
                </span>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
