"use client";

// Registrar compra: a nota que repõe o acervo. Quatro portas, uma
// conferência: XML da nota (lido no navegador, sem IA), PDF da nota (o
// texto sai no navegador; a IA estrutura), planilha (as colunas usuais)
// e à mão. Ela confere fornecedor, data, total e cada item — o que já
// existe soma ao item, o que não existe entra como novo — e só então a
// compra grava. O PDF fica guardado como a nota da compra.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  categoriaSugerida,
  codigoDoItem,
  lerCsv,
  lerPlanilhaDeEstoque,
  numero,
  reais,
  UNIDADES,
  type CategoriaEstoque,
  type ItemEstoque,
  type LinhaLida,
} from "@/lib/estoque-core";
import { normalizarNotaLida, type NotaLida } from "@/lib/estoque-leitura-core";
import { lerNfeXml } from "@/lib/nfe-xml";
import { createClient } from "@/lib/supabase/client";
import { hojeBR } from "@/lib/tempo";
import { anexarDocumentoDaCompra, registrarCompra, type CompraParaRegistrar } from "@/app/(app)/estoque/actions";

const T = { mono: "'IBM Plex Mono', monospace", ui: "'Instrument Sans', system-ui, sans-serif", titulo: "Inter, system-ui, sans-serif" };
const campo: React.CSSProperties = { height: 34, padding: "0 8px", border: "1px solid var(--cinza-2)", borderRadius: 8, background: "var(--papel)", fontSize: 13, color: "var(--tinta)", minWidth: 0 };
const rotulo: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--cinza)", marginBottom: 4 };
const primario: React.CSSProperties = { border: 0, borderRadius: 8, background: "var(--tinta)", color: "var(--marfim)", font: `600 13px/1 ${T.ui}`, cursor: "pointer" };
const secundario: React.CSSProperties = { border: "1px solid var(--cinza-2)", borderRadius: 8, background: "var(--papel)", color: "var(--tinta)", font: `500 12.5px/1 ${T.ui}`, cursor: "pointer" };
const ALERTA = "#A5544B";

type Origem = CompraParaRegistrar["origem"];

// o cabeçalho zera a cada nota: sem isto, "começar de novo" carregava a
// chave da nota anterior para a compra seguinte
const CAB_VAZIO = () => ({ fornecedor: "", data: hojeBR(), numero: "", chave: "", total: "" });
type Linha = LinhaLida & { chave: number; categoriaId: string | null; itemExistenteId: string | null; itemExistenteNome: string | null };

const PORTAS: { origem: Origem; titulo: string; texto: string; aceita: string }[] = [
  { origem: "xml", titulo: "XML da nota", texto: "O arquivo que o fornecedor manda junto com a NF-e. Lido aqui, sem IA.", aceita: ".xml" },
  { origem: "pdf", titulo: "PDF da nota", texto: "A DANFE ou o cupom em PDF. O texto sai no seu navegador; a leitura organiza os itens.", aceita: ".pdf" },
  { origem: "planilha", titulo: "Planilha", texto: "Colunas de item e quantidade; custo e unidade se tiver.", aceita: ".xlsx,.csv,.txt" },
  { origem: "manual", titulo: "À mão", texto: "Feira, atacado sem cupom: digite os itens.", aceita: "" },
];

export function RegistrarCompra({
  categorias,
  itens,
  empresaId,
  onFechar,
}: {
  categorias: CategoriaEstoque[];
  itens: ItemEstoque[];
  empresaId: string | null;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [origem, setOrigem] = useState<Origem | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [cab, setCab] = useState(CAB_VAZIO);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [feito, setFeito] = useState<{ id: string; notaGuardada: boolean | null } | null>(null);

  const porCodigo = useMemo(() => new Map(itens.map((i) => [i.codigo, i])), [itens]);

  function montar(nota: NotaLida) {
    setCab({
      fornecedor: nota.fornecedor ?? "",
      data: nota.data ?? hojeBR(),
      numero: nota.numero ?? "",
      chave: nota.chave ?? "",
      total: nota.total != null ? String(nota.total) : "",
    });
    setLinhas(
      nota.itens.map((l, k) => {
        const existente = porCodigo.get(codigoDoItem(l.nome)) ?? null;
        const porNome = l.categoriaNome ? categorias.find((c) => codigoDoItem(c.nome) === codigoDoItem(l.categoriaNome!))?.id ?? null : null;
        return { ...l, chave: k, categoriaId: existente?.categoriaId ?? porNome ?? categoriaSugerida(l.nome, categorias), itemExistenteId: existente?.id ?? null, itemExistenteNome: existente?.nome ?? null };
      })
    );
  }

  async function ler(f: File, o: Origem) {
    setErro(null);
    setAviso(null);
    setLendo(true);
    try {
      const nome = f.name.toLowerCase();
      if (o === "xml") {
        const nota = lerNfeXml(await f.text());
        if (!nota) throw new Error("Esse XML não é uma NF-e ou NFC-e.");
        if (nota.itens.length === 0) throw new Error("A nota não tem itens com quantidade.");
        montar(nota);
      } else if (o === "pdf") {
        if (!nome.endsWith(".pdf")) throw new Error("Escolha um PDF.");
        const { extrairTextoDePdf } = await import("@/lib/pdf-texto-cliente");
        const texto = await extrairTextoDePdf(await f.arrayBuffer(), 4);
        if (texto.trim().length < 20) throw new Error("Este PDF não tem texto (é uma imagem). Tire uma foto da nota — a leitura por foto entra em breve.");
        const resp = await fetch("/api/ai/estoque-texto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) });
        const j = (await resp.json()) as { nota?: unknown; error?: string };
        if (!resp.ok || !j.nota) throw new Error(j.error ?? "Não foi possível ler a nota.");
        montar(normalizarNotaLida(j.nota));
        setArquivo(f);
      } else if (o === "planilha") {
        let rows: unknown[][] = [];
        if (nome.endsWith(".xlsx")) {
          const { default: lerPlanilha } = await import("read-excel-file/browser");
          const abas = await lerPlanilha(f);
          rows = (abas.find((a) => a.data.length > 1) ?? abas[0])?.data ?? [];
        } else rows = lerCsv(await f.text());
        const { itens: lidas, semCabecalho } = lerPlanilhaDeEstoque(rows);
        if (lidas.length === 0) throw new Error("Não achei linhas com nome e quantidade.");
        if (semCabecalho) setAviso("Sem cabeçalho reconhecido: li as colunas como nome, quantidade, unidade e custo, nesta ordem. Confira.");
        montar({ fornecedor: null, data: null, numero: null, chave: null, total: null, itens: lidas });
      }
    } catch (e) {
      setErro((e as Error).message || "Não foi possível ler o arquivo.");
    } finally {
      setLendo(false);
    }
  }

  function muda(chave: number, patch: Partial<Linha>) {
    setLinhas((ls) => (ls ? ls.map((l) => (l.chave === chave ? { ...l, ...patch } : l)) : ls));
  }
  function acrescentar() {
    setLinhas((ls) => [...(ls ?? []), { chave: Date.now(), nome: "", quantidade: 1, unidade: "unidades", custoUnitario: null, categoriaNome: null, categoriaId: null, itemExistenteId: null, itemExistenteNome: null }]);
  }
  function casar(chave: number, nome: string) {
    const existente = porCodigo.get(codigoDoItem(nome)) ?? null;
    muda(chave, { nome, itemExistenteId: existente?.id ?? null, itemExistenteNome: existente?.nome ?? null, categoriaId: existente?.categoriaId ?? categoriaSugerida(nome, categorias) });
  }

  const somaItens = (linhas ?? []).reduce((s, l) => s + (l.custoUnitario ?? 0) * (l.quantidade || 0), 0);

  function registrar() {
    if (!linhas?.length || !origem) return;
    setErro(null);
    iniciar(async () => {
      const r = await registrarCompra({
        data: cab.data,
        fornecedorNome: cab.fornecedor || null,
        numeroNota: cab.numero || null,
        chaveNfe: cab.chave.replace(/\D/g, "") || null,
        total: cab.total.trim() === "" ? null : Number(cab.total.replace(",", ".")),
        origem,
        itens: linhas.map((l) => ({ nome: l.nome, quantidade: l.quantidade, unidade: l.unidade, custoUnitario: l.custoUnitario, categoriaId: l.categoriaId, itemExistenteId: l.itemExistenteId })),
      });
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      // a nota em PDF fica guardada na pasta da empresa; o XML não entra
      // no bucket (só PDF e imagem são aceitos lá)
      let notaGuardada: boolean | null = null;
      if (arquivo && empresaId && origem === "pdf") {
        try {
          const path = `${empresaId}/estoque/${r.id}.pdf`;
          const { error: erroUpload } = await createClient().storage.from("comprovantes").upload(path, arquivo, { contentType: "application/pdf", upsert: true });
          notaGuardada = !erroUpload && !("error" in (await anexarDocumentoDaCompra(r.id, path)));
        } catch {
          notaGuardada = false;
        }
      }
      setFeito({ id: r.id, notaGuardada });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 style={{ margin: 0, font: `600 18px/1.2 ${T.titulo}`, color: "var(--tinta)", paddingRight: 28 }}>Registrar compra</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--cinza)" }}>
          O que você comprou entra no estoque e fica esperando o seu clique para virar despesa no Financeiro da empresa.
        </p>
      </div>

      {feito ? (
        <div style={{ fontSize: 14, color: "var(--tinta)" }}>
          Compra registrada. Os itens já estão no estoque, e a compra aparece no Financeiro da empresa como “a lançar”.
          {feito.notaGuardada === false && <div style={{ marginTop: 6, color: "var(--cinza)" }}>A nota em PDF não pôde ser guardada; os itens entraram mesmo assim.</div>}
          <div className="mt-3">
            <button onClick={onFechar} className="h-9 px-3" style={secundario}>
              Fechar
            </button>
          </div>
        </div>
      ) : !origem ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PORTAS.map((p) => (
            <label
              key={p.origem}
              className="flex cursor-pointer flex-col gap-1"
              style={{ border: "1px solid var(--linha)", borderRadius: 12, padding: "12px 14px", background: "var(--papel)" }}
              onClick={p.origem === "manual" ? () => { setCab(CAB_VAZIO()); setArquivo(null); setOrigem("manual"); setLinhas([]); acrescentar(); } : undefined}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tinta)" }}>{lendo ? "Lendo…" : p.titulo}</span>
              <span style={{ fontSize: 12.5, color: "var(--cinza)" }}>{p.texto}</span>
              {p.aceita && (
                <input
                  type="file"
                  accept={p.aceita}
                  className="hidden"
                  disabled={lendo}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setOrigem(p.origem);
                      void ler(f, p.origem);
                    }
                    e.target.value = "";
                  }}
                />
              )}
            </label>
          ))}
          {erro && <p className="sm:col-span-2" style={{ margin: 0, fontSize: 13, color: ALERTA }}>{erro}</p>}
        </div>
      ) : lendo || linhas == null ? (
        <div style={{ fontSize: 13.5, color: "var(--cinza)" }}>
          {erro ? (
            <>
              <span style={{ color: ALERTA }}>{erro}</span>
              <div className="mt-3">
                <button onClick={() => { setOrigem(null); setErro(null); setCab(CAB_VAZIO()); setArquivo(null); }} className="h-9 px-3" style={secundario}>
                  Escolher outro jeito
                </button>
              </div>
            </>
          ) : (
            "Lendo a nota…"
          )}
        </div>
      ) : (
        <>
          {aviso && <p style={{ margin: 0, fontSize: 13, color: "var(--cinza)" }}>{aviso}</p>}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2">
              <span style={rotulo}>Fornecedor (quem vendeu)</span>
              <input value={cab.fornecedor} maxLength={120} onChange={(e) => setCab({ ...cab, fornecedor: e.target.value })} style={{ ...campo, width: "100%" }} />
            </label>
            <label>
              <span style={rotulo}>Data da compra</span>
              <input type="date" value={cab.data} onChange={(e) => setCab({ ...cab, data: e.target.value })} style={{ ...campo, width: "100%" }} />
            </label>
            <label>
              <span style={rotulo}>Total (R$)</span>
              <input type="number" min={0} step="0.01" inputMode="decimal" value={cab.total} placeholder={somaItens > 0 ? numero(Math.round(somaItens * 100) / 100) : ""} onChange={(e) => setCab({ ...cab, total: e.target.value })} style={{ ...campo, width: "100%", fontFamily: T.mono }} />
            </label>
            {origem !== "manual" && origem !== "planilha" && (
              <>
                <label>
                  <span style={rotulo}>Número da nota</span>
                  <input value={cab.numero} maxLength={30} onChange={(e) => setCab({ ...cab, numero: e.target.value })} style={{ ...campo, width: "100%" }} />
                </label>
                <label>
                  <span style={rotulo}>Chave (44 dígitos)</span>
                  <input value={cab.chave} maxLength={54} inputMode="numeric" onChange={(e) => setCab({ ...cab, chave: e.target.value })} style={{ ...campo, width: "100%", fontFamily: T.mono }} />
                </label>
              </>
            )}
          </div>

          <div style={{ fontSize: 12.5, color: "var(--cinza)" }}>
            {linhas.length} {linhas.length === 1 ? "item" : "itens"} · o que já existe soma ao item; confira nome, quantidade, custo e categoria.
          </div>
          <ul className="flex flex-col gap-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {linhas.map((l) => (
              <li key={l.chave} className="flex flex-col gap-2" style={{ border: "1px solid var(--linha)", borderRadius: 12, padding: 10 }}>
                <div className="flex items-center gap-2">
                  <input value={l.nome} maxLength={80} placeholder="Nome do item" onChange={(e) => casar(l.chave, e.target.value)} aria-label="Nome" style={{ ...campo, flex: 1 }} />
                  <button onClick={() => setLinhas((ls) => ls?.filter((x) => x.chave !== l.chave) ?? ls)} aria-label="Tirar" style={{ fontSize: 13, color: "var(--cinza)" }}>
                    tirar
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="number" min={0} step="any" inputMode="decimal" value={l.quantidade} onChange={(e) => muda(l.chave, { quantidade: Number(e.target.value) })} aria-label="Quantidade" style={{ ...campo, width: 84, textAlign: "right", fontFamily: T.mono }} />
                  <select value={(UNIDADES as readonly string[]).includes(l.unidade) ? l.unidade : "unidades"} onChange={(e) => muda(l.chave, { unidade: e.target.value })} aria-label="Unidade" style={{ ...campo, width: 110 }}>
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
                    <input type="number" min={0} step="0.01" inputMode="decimal" value={l.custoUnitario ?? ""} onChange={(e) => muda(l.chave, { custoUnitario: e.target.value === "" ? null : Number(e.target.value) })} aria-label="Custo por unidade" style={{ ...campo, width: 90, textAlign: "right", fontFamily: T.mono }} />
                  </label>
                </div>
                <div style={{ fontSize: 12, color: "var(--cinza)" }}>
                  {l.itemExistenteId ? `já existe: soma ${numero(l.quantidade)} a ${l.itemExistenteNome}` : "item novo"}
                </div>
              </li>
            ))}
          </ul>
          <div>
            <button onClick={acrescentar} style={{ fontSize: 13, color: "var(--cinza)" }}>
              + acrescentar item
            </button>
          </div>
          {somaItens > 0 && (
            <div style={{ fontSize: 12.5, color: "var(--cinza)" }}>Soma dos itens: {reais(Math.round(somaItens * 100) / 100)}</div>
          )}
          {erro && <p style={{ margin: 0, fontSize: 13, color: ALERTA }}>{erro}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={registrar} disabled={pendente || linhas.length === 0} className="h-10 px-4" style={{ ...primario, opacity: pendente || linhas.length === 0 ? 0.5 : 1 }}>
              {pendente ? "Registrando…" : "Registrar compra"}
            </button>
            <button onClick={() => { setOrigem(null); setLinhas(null); setArquivo(null); setCab(CAB_VAZIO()); setErro(null); setAviso(null); }} style={{ fontSize: 13, color: "var(--cinza)" }}>
              começar de novo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
