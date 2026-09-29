"use client";

// Importar o controle que ela já tem: a planilha (XLSX/CSV) lida NO
// NAVEGADOR — o arquivo não viaja (doutrina de ler-checklist, 23/09).
// Cada linha vira um item com quantidade e custo; o que já existe soma
// ao item, o que não existe entra como novo; a categoria vem sugerida e
// ela troca o que não estiver certo antes de confirmar. Nada entra sem
// a conferência.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  categoriaSugerida,
  codigoDoItem,
  lerCsv,
  lerPlanilhaDeEstoque,
  numero,
  UNIDADES,
  type CategoriaEstoque,
  type ItemEstoque,
  type LinhaLida,
} from "@/lib/estoque-core";
import { importarItens, type LinhaParaImportar } from "@/app/(app)/estoque/actions";

const T = {
  mono: "'IBM Plex Mono', monospace",
  ui: "'Instrument Sans', system-ui, sans-serif",
};

const campo: React.CSSProperties = {
  height: 34,
  padding: "0 8px",
  border: "1px solid var(--cinza-2)",
  borderRadius: 8,
  background: "var(--papel)",
  fontSize: 13,
  color: "var(--tinta)",
  minWidth: 0,
};

type Linha = LinhaLida & { chave: number; categoriaId: string | null; itemExistenteId: string | null; itemExistenteNome: string | null };

export function ImportarPlanilha({
  categorias,
  itens,
  onFechar,
}: {
  categorias: CategoriaEstoque[];
  itens: ItemEstoque[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [feito, setFeito] = useState<{ novos: number; somados: number } | null>(null);

  const porCodigo = useMemo(() => new Map(itens.map((i) => [i.codigo, i])), [itens]);

  async function ler(arquivo: File) {
    setErro(null);
    setAviso(null);
    setLendo(true);
    try {
      const nome = arquivo.name.toLowerCase();
      let rows: unknown[][] = [];
      if (nome.endsWith(".xlsx")) {
        const { default: lerPlanilha } = await import("read-excel-file/browser");
        const abas = await lerPlanilha(arquivo);
        // a primeira aba com conteúdo; as outras costumam ser rascunho
        rows = (abas.find((a) => a.data.length > 1) ?? abas[0])?.data ?? [];
      } else if (nome.endsWith(".csv") || nome.endsWith(".txt")) {
        rows = lerCsv(await arquivo.text());
      } else {
        throw new Error("Esse formato não abre aqui. Salve como .xlsx ou .csv.");
      }
      const { itens: lidas, semCabecalho } = lerPlanilhaDeEstoque(rows);
      if (lidas.length === 0) {
        throw new Error("Não achei linhas com nome e quantidade. A planilha precisa de uma coluna de item e uma de quantidade.");
      }
      if (semCabecalho) {
        setAviso("Sem cabeçalho reconhecido: li as colunas como nome, quantidade, unidade e custo, nesta ordem. Confira.");
      }
      setLinhas(
        lidas.map((l, k) => {
          const codigo = codigoDoItem(l.nome);
          const existente = porCodigo.get(codigo) ?? null;
          const porNome = l.categoriaNome
            ? categorias.find((c) => codigoDoItem(c.nome) === codigoDoItem(l.categoriaNome!))?.id ?? null
            : null;
          return {
            ...l,
            chave: k,
            categoriaId: existente?.categoriaId ?? porNome ?? categoriaSugerida(l.nome, categorias),
            itemExistenteId: existente?.id ?? null,
            itemExistenteNome: existente?.nome ?? null,
          };
        })
      );
    } catch (e) {
      setErro((e as Error).message || "Não foi possível ler o arquivo.");
    } finally {
      setLendo(false);
    }
  }

  function muda(chave: number, patch: Partial<Linha>) {
    setLinhas((ls) => (ls ? ls.map((l) => (l.chave === chave ? { ...l, ...patch } : l)) : ls));
  }

  function importar() {
    if (!linhas?.length) return;
    setErro(null);
    iniciar(async () => {
      const carga: LinhaParaImportar[] = linhas.map((l) => ({
        nome: l.nome,
        quantidade: l.quantidade,
        unidade: l.unidade,
        custoUnitario: l.custoUnitario,
        categoriaId: l.categoriaId,
        itemExistenteId: l.itemExistenteId,
      }));
      const r = await importarItens(carga);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setFeito({ novos: r.novos, somados: r.somados });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 style={{ margin: 0, font: `600 18px/1.2 Inter, system-ui, sans-serif`, color: "var(--tinta)" }}>Importar o seu controle</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--cinza)" }}>
          A planilha que você já mantém. Cada linha vira um item com quantidade e custo; o que já existe soma ao item. Você confere antes de entrar.
        </p>
      </div>

      {feito ? (
        <div style={{ fontSize: 14, color: "var(--tinta)" }}>
          Pronto: {feito.novos} {feito.novos === 1 ? "item novo" : "itens novos"}
          {feito.somados > 0 ? ` e ${feito.somados} ${feito.somados === 1 ? "somado a um item que já existia" : "somados a itens que já existiam"}` : ""}.
          <div className="mt-3">
            <button onClick={onFechar} style={{ ...campo, cursor: "pointer", fontWeight: 500 }}>
              Fechar
            </button>
          </div>
        </div>
      ) : !linhas ? (
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center"
          style={{ border: "1px dashed var(--cinza-2)", borderRadius: 14, padding: "28px 16px", background: "var(--papel)" }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--tinta)" }}>{lendo ? "Lendo…" : "Escolher a planilha"}</span>
          <span style={{ fontSize: 12.5, color: "var(--cinza)" }}>XLSX ou CSV · colunas de item e quantidade; unidade, custo e categoria se tiver</span>
          <input
            type="file"
            accept=".xlsx,.csv,.txt"
            className="hidden"
            disabled={lendo}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void ler(f);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <>
          {aviso && <p style={{ margin: 0, fontSize: 13, color: "var(--cinza)" }}>{aviso}</p>}
          <div style={{ fontSize: 12.5, color: "var(--cinza)" }}>
            {linhas.length} {linhas.length === 1 ? "linha" : "linhas"} · a categoria vem sugerida; troque o que não estiver certo e tire o que não deve entrar.
          </div>
          <ul className="flex flex-col gap-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {linhas.map((l) => (
              <li key={l.chave} className="flex flex-col gap-2" style={{ border: "1px solid var(--linha)", borderRadius: 12, padding: 10 }}>
                <div className="flex items-center gap-2">
                  <input value={l.nome} maxLength={80} onChange={(e) => muda(l.chave, { nome: e.target.value })} aria-label="Nome" style={{ ...campo, flex: 1 }} />
                  <button onClick={() => setLinhas((ls) => ls?.filter((x) => x.chave !== l.chave) ?? ls)} aria-label="Tirar da importação" style={{ fontSize: 13, color: "var(--cinza)" }}>
                    tirar
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={l.quantidade}
                    onChange={(e) => muda(l.chave, { quantidade: Number(e.target.value) })}
                    aria-label="Quantidade"
                    style={{ ...campo, width: 84, textAlign: "right", fontFamily: T.mono }}
                  />
                  <select value={UNIDADES.includes(l.unidade as (typeof UNIDADES)[number]) ? l.unidade : "unidades"} onChange={(e) => muda(l.chave, { unidade: e.target.value })} aria-label="Unidade" style={{ ...campo, width: 110 }}>
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <select value={l.categoriaId ?? ""} onChange={(e) => muda(l.chave, { categoriaId: e.target.value || null })} aria-label="Categoria" style={{ ...campo, width: 150 }}>
                    <option value="">Sem categoria</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1" style={{ fontSize: 12.5, color: "var(--cinza)" }}>
                    R$
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={l.custoUnitario ?? ""}
                      onChange={(e) => muda(l.chave, { custoUnitario: e.target.value === "" ? null : Number(e.target.value) })}
                      aria-label="Custo por unidade"
                      style={{ ...campo, width: 90, textAlign: "right", fontFamily: T.mono }}
                    />
                  </label>
                </div>
                <div style={{ fontSize: 12, color: "var(--cinza)" }}>
                  {l.itemExistenteId ? `já existe: soma ${numero(l.quantidade)} a ${l.itemExistenteNome}` : "item novo"}
                </div>
              </li>
            ))}
          </ul>
          {erro && <p style={{ margin: 0, fontSize: 13, color: "#A5544B" }}>{erro}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={importar}
              disabled={pendente || linhas.length === 0}
              className="h-10 px-4"
              style={{ border: 0, borderRadius: 8, background: "var(--tinta)", color: "var(--marfim)", font: `600 13px/1 ${T.ui}`, cursor: "pointer", opacity: pendente || linhas.length === 0 ? 0.5 : 1 }}
            >
              {pendente ? "Importando…" : `Importar ${linhas.length} ${linhas.length === 1 ? "item" : "itens"}`}
            </button>
            <button onClick={() => setLinhas(null)} style={{ fontSize: 13, color: "var(--cinza)" }}>
              escolher outro arquivo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
