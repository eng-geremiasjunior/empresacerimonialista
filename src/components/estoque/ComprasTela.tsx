"use client";

// Compras do estoque: o histórico e a porta para registrar. Cada linha
// diz se a compra já virou despesa no Financeiro da empresa.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CategoriaEstoque, ItemEstoque } from "@/lib/estoque-core";
import { reais } from "@/lib/estoque-core";
import type { CompraDoEstoque } from "@/lib/supabase/estoque";
import { desfazerCompra, urlDaNota } from "@/app/(app)/estoque/actions";
import { Gaveta } from "@/components/estoque/Gaveta";
import { RegistrarCompra } from "@/components/estoque/RegistrarCompra";
import { formatDate } from "@/lib/format";

const T = { mono: "'IBM Plex Mono', monospace", ui: "'Instrument Sans', system-ui, sans-serif", titulo: "Inter, system-ui, sans-serif" };
const primario: React.CSSProperties = { border: 0, borderRadius: 8, background: "var(--tinta)", color: "var(--marfim)", font: `600 13px/1 ${T.ui}`, cursor: "pointer" };
const ORIGEM: Record<CompraDoEstoque["origem"], string> = { xml: "XML da nota", pdf: "PDF da nota", foto: "foto", planilha: "planilha", manual: "à mão" };

export function ComprasTela({
  compras,
  categorias,
  itens,
  empresaId,
  podeEscrever,
  migracaoPendente,
}: {
  compras: CompraDoEstoque[];
  categorias: CategoriaEstoque[];
  itens: ItemEstoque[];
  empresaId: string | null;
  podeEscrever: boolean;
  migracaoPendente: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (migracaoPendente) {
    return (
      <div className="px-4 pt-5 sm:px-6">
        <h1 style={{ margin: 0, font: `600 22px/1.2 ${T.titulo}`, color: "var(--tinta)" }}>Compras</h1>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Esta parte ainda não está disponível. Avise a gente.</div>
      </div>
    );
  }

  const aLancar = compras.filter((c) => !c.lancamentoId && !c.lancadaFora).length;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2.5 px-4 pb-3.5 pt-5 sm:px-6" style={{ borderBottom: "1px solid var(--linha)" }}>
        <h1 style={{ margin: 0, font: `600 22px/1.2 ${T.titulo}`, letterSpacing: "-0.02em", color: "var(--tinta)" }}>Compras</h1>
        <span style={{ font: `500 12px/1 ${T.mono}`, color: "var(--cinza)" }}>
          {compras.length} {compras.length === 1 ? "compra" : "compras"}
          {aLancar > 0 ? ` · ${aLancar} a lançar no Financeiro` : ""}
        </span>
        <span className="flex-1" />
        {podeEscrever && (
          <button onClick={() => setAberta(true)} className="h-9 px-3" style={primario}>
            Registrar compra
          </button>
        )}
      </div>

      {erro && <p className="px-4 pt-3 sm:px-6" style={{ margin: 0, fontSize: 13, color: "#A5544B" }}>{erro}</p>}

      {compras.length === 0 ? (
        <div className="mx-4 my-8 text-center sm:mx-6" style={{ border: "1px dashed var(--cinza-2)", borderRadius: 14, padding: "36px 20px" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "var(--tinta)" }}>Nenhuma compra registrada.</p>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--cinza)" }}>
            A nota da compra (XML ou PDF), a planilha ou os itens à mão: o que entra aqui repõe o estoque e vai para o Financeiro como “a lançar”.
          </p>
        </div>
      ) : (
        <ul className="mx-4 sm:mx-6" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {compras.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3" style={{ borderBottom: "1px solid var(--linha)" }}>
              <div className="min-w-[220px] flex-1">
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--tinta)" }}>
                  {formatDate(c.data)}
                  {c.fornecedorNome ? ` · ${c.fornecedorNome}` : ""}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--cinza)", marginTop: 2 }}>
                  {c.itens} {c.itens === 1 ? "item" : "itens"}
                  {c.resumo ? ` · ${c.resumo}` : ""}
                  {c.numeroNota ? ` · nota ${c.numeroNota}` : ""}
                  {` · ${ORIGEM[c.origem]}`}
                </div>
              </div>
              <div style={{ font: `500 13px/1 ${T.mono}`, color: "var(--tinta)", minWidth: 96, textAlign: "right" }}>{reais(c.total)}</div>
              <div style={{ fontSize: 12.5, color: c.lancamentoId || c.lancadaFora ? "var(--cinza)" : "var(--tinta)", minWidth: 150 }}>
                {c.lancamentoId ? "lançada no Financeiro" : c.lancadaFora ? "lançada por fora" : "a lançar no Financeiro"}
              </div>
              <div className="flex items-center gap-3">
                {c.documentoPath && (
                  <button
                    onClick={() =>
                      iniciar(async () => {
                        const url = await urlDaNota(c.id);
                        if (url) window.open(url, "_blank");
                      })
                    }
                    disabled={pendente}
                    style={{ fontSize: 12.5, color: "var(--tinta)", textDecoration: "underline", textUnderlineOffset: 2 }}
                  >
                    ver nota
                  </button>
                )}
                {podeEscrever && !c.lancamentoId && !c.lancadaFora && (
                  <button
                    onClick={() => {
                      if (!window.confirm("Desfazer esta compra? As entradas dela saem do estoque.")) return;
                      setErro(null);
                      iniciar(async () => {
                        const r = await desfazerCompra(c.id);
                        if ("error" in r) setErro(r.error);
                        router.refresh();
                      });
                    }}
                    disabled={pendente}
                    style={{ fontSize: 12.5, color: "var(--cinza)" }}
                  >
                    desfazer
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {aberta && (
        <Gaveta onFechar={() => setAberta(false)} larga>
          <RegistrarCompra categorias={categorias} itens={itens} empresaId={empresaId} onFechar={() => setAberta(false)} />
        </Gaveta>
      )}
    </div>
  );
}
