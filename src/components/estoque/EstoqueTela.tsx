"use client";

// Estoque — o que a empresa tem (184).
//
// Quatro decisões, as mesmas de Fornecedores:
// 1. BUSCA EM PRIMEIRO LUGAR. Um campo cobre nome e categoria e filtra a
//    cada tecla; a categoria é um seletor ao lado.
// 2. SEM NAVEGAÇÃO DE DETALHE. O item abre numa gaveta à direita.
// 3. COR SÓ QUANDO SIGNIFICA. Papel e tinta; o estado é frase ("abaixo
//    do mínimo", "vence em 12 dias"), nunca cor.
// 4. UMA AÇÃO POR LINHA: "Usar" — reservar para um evento. O resto mora
//    na gaveta.
//
// O saldo é a soma dos movimentos; a única escrita direta é o ajuste,
// com motivo. A lista agrupa por categoria NA ORDEM DELA, que é a ordem
// da lista de separação.

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Gaveta } from "@/components/estoque/Gaveta";
import {
  estadoDoItem,
  numero,
  reais,
  resumoDoEstoque,
  UNIDADES,
  valorEmEstoque,
  type CategoriaEstoque,
  type ItemEstoque,
} from "@/lib/estoque-core";
import type { MovimentoDoItem } from "@/lib/supabase/estoque";
import {
  ajustarSaldo,
  criarCategoria,
  criarItem,
  disponivelNaData,
  editarCategoria,
  editarItem,
  eventosParaReservar,
  garantirCategorias,
  historicoDoItem,
  moverCategoria,
  reativarItem,
  removerCategoria,
  removerItem,
  reservarParaEvento,
  type DadosDoItem,
  type EventoParaReservar,
} from "@/app/(app)/estoque/actions";
import { ImportarPlanilha } from "@/components/estoque/ImportarPlanilha";
import { formatDate } from "@/lib/format";

/* ------------------------------------------------------------- estilos */

const T = {
  mono: "'IBM Plex Mono', monospace",
  ui: "'Instrument Sans', system-ui, sans-serif",
  titulo: "Inter, system-ui, sans-serif",
};

const botaoPrimario: React.CSSProperties = {
  border: 0,
  borderRadius: 8,
  background: "var(--tinta)",
  color: "var(--marfim)",
  font: `600 13px/1 ${T.ui}`,
  cursor: "pointer",
};

const botaoSecundario: React.CSSProperties = {
  border: "1px solid var(--cinza-2)",
  borderRadius: 8,
  background: "var(--papel)",
  color: "var(--tinta)",
  font: `500 12.5px/1 ${T.ui}`,
  cursor: "pointer",
};

const campo: React.CSSProperties = {
  height: 36,
  padding: "0 10px",
  border: "1px solid var(--cinza-2)",
  borderRadius: 8,
  background: "var(--papel)",
  fontSize: 14,
  color: "var(--tinta)",
  width: "100%",
  minWidth: 0,
};

const rotulo: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--cinza)", marginBottom: 4 };
const ALERTA = "#A5544B";

type Gaveta =
  | { tipo: "item"; id: string }
  | { tipo: "novo" }
  | { tipo: "categorias" }
  | { tipo: "importar" }
  | { tipo: "usar"; id: string }
  | null;

type Resultado = { error?: string } & Record<string, unknown>;

/* ================================================================ TELA */

export function EstoqueTela({
  categorias,
  itens,
  hoje,
  podeEscrever,
  migracaoPendente,
  selecionadoInicial,
}: {
  categorias: CategoriaEstoque[];
  itens: ItemEstoque[];
  hoje: string;
  podeEscrever: boolean;
  migracaoPendente: boolean;
  selecionadoInicial: string | null;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("");
  const [inativos, setInativos] = useState(false);
  const [gaveta, setGaveta] = useState<Gaveta>(selecionadoInicial ? { tipo: "item", id: selecionadoInicial } : null);

  // as categorias de partida, uma vez, para quem pode escrever
  useEffect(() => {
    if (!migracaoPendente && podeEscrever && categorias.length === 0) {
      void garantirCategorias().then(() => router.refresh());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [migracaoPendente, podeEscrever, categorias.length]);

  const resumo = useMemo(() => resumoDoEstoque(itens, hoje), [itens, hoje]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((i) => {
      if (!inativos && !i.ativo) return false;
      if (categoria === "sem" && i.categoriaId) return false;
      if (categoria && categoria !== "sem" && i.categoriaId !== categoria) return false;
      if (!q) return true;
      return i.nome.toLowerCase().includes(q) || (i.categoriaNome ?? "").toLowerCase().includes(q);
    });
  }, [itens, busca, categoria, inativos]);

  // agrupado por categoria, na ordem dela; sem categoria vai por último
  const grupos = useMemo(() => {
    const ordem = new Map(categorias.map((c) => [c.id, c.ordem]));
    const m = new Map<string, { nome: string; ordem: number; itens: ItemEstoque[] }>();
    for (const i of visiveis) {
      const k = i.categoriaId ?? "sem";
      if (!m.has(k)) m.set(k, { nome: i.categoriaNome ?? "Sem categoria", ordem: i.categoriaId ? ordem.get(i.categoriaId) ?? 9998 : 9999, itens: [] });
      m.get(k)!.itens.push(i);
    }
    return [...m.values()].sort((a, b) => a.ordem - b.ordem);
  }, [visiveis, categorias]);

  const selecionado = gaveta?.tipo === "item" || gaveta?.tipo === "usar" ? itens.find((i) => i.id === gaveta.id) ?? null : null;
  const temInativos = itens.some((i) => !i.ativo);

  if (migracaoPendente) {
    return (
      <div className="px-4 pt-5 sm:px-6">
        <h1 style={{ margin: 0, font: `600 22px/1.2 ${T.titulo}`, color: "var(--tinta)" }}>Estoque</h1>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Esta parte ainda não está disponível. Avise a gente.
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* cabeçalho */}
      <div className="flex flex-col gap-3.5 px-4 pb-3.5 pt-5 sm:px-6" style={{ borderBottom: "1px solid var(--linha)" }}>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 style={{ margin: 0, font: `600 22px/1.2 ${T.titulo}`, letterSpacing: "-0.02em", color: "var(--tinta)" }}>Estoque</h1>
          <span style={{ font: `500 12px/1 ${T.mono}`, color: "var(--cinza)" }}>
            {resumo.itens} {resumo.itens === 1 ? "item" : "itens"}
            {resumo.valor != null ? ` · ${reais(resumo.valor)} em estoque` : ""}
            {resumo.abaixoDoMinimo > 0 ? ` · ${resumo.abaixoDoMinimo} abaixo do mínimo` : ""}
            {resumo.vencendo > 0 ? ` · ${resumo.vencendo} vencendo` : ""}
          </span>
          <span className="flex-1" />
          {podeEscrever && (
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setGaveta({ tipo: "importar" })} className="h-9 px-3" style={botaoSecundario}>
                Importar
              </button>
              <button onClick={() => setGaveta({ tipo: "categorias" })} className="h-9 px-3" style={botaoSecundario}>
                Categorias
              </button>
              <button onClick={() => setGaveta({ tipo: "novo" })} className="h-9 px-3" style={botaoPrimario}>
                Novo item
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label
            className="vela-busca flex h-10 min-w-[220px] flex-1 items-center gap-2.5 px-3"
            style={{ background: "var(--papel)", border: "1px solid var(--cinza-2)", borderRadius: 10 }}
          >
            <Search size={15} color="var(--cinza-3)" strokeWidth={1.75} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar item…"
              aria-label="Buscar item"
              className="min-w-0 flex-1 bg-transparent outline-none"
              style={{ border: 0, fontSize: 14, color: "var(--tinta)" }}
            />
          </label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria" className="h-10" style={{ ...campo, width: 190 }}>
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
            <option value="sem">Sem categoria</option>
          </select>
          {temInativos && (
            <label className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: "var(--cinza)" }}>
              <input type="checkbox" checked={inativos} onChange={(e) => setInativos(e.target.checked)} />
              mostrar desativados
            </label>
          )}
        </div>
      </div>

      {/* a lista */}
      {itens.length === 0 ? (
        <div className="mx-4 my-8 text-center sm:mx-6" style={{ border: "1px dashed var(--cinza-2)", borderRadius: 14, padding: "36px 20px" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "var(--tinta)" }}>Nenhum item ainda.</p>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--cinza)" }}>
            Traga o que você já tem: a planilha do seu controle, ou cadastre item por item.
          </p>
          {podeEscrever && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button onClick={() => setGaveta({ tipo: "importar" })} className="h-10 px-4" style={botaoPrimario}>
                Importar a planilha
              </button>
              <button onClick={() => setGaveta({ tipo: "novo" })} className="h-10 px-4" style={botaoSecundario}>
                Novo item
              </button>
            </div>
          )}
        </div>
      ) : visiveis.length === 0 ? (
        <p className="px-4 py-8 text-center sm:px-6" style={{ fontSize: 14, color: "var(--cinza)" }}>
          Nada com esse nome.
        </p>
      ) : (
        <div className="px-4 sm:px-6">
          {grupos.map((g) => (
            <section key={g.nome} className="pt-4">
              <div className="flex items-baseline gap-2 pb-1" style={{ borderBottom: "1px solid var(--linha)" }}>
                <span style={{ font: `600 13px/1 ${T.ui}`, color: "var(--tinta)" }}>{g.nome}</span>
                <span style={{ font: `500 11px/1 ${T.mono}`, color: "var(--cinza)" }}>
                  {g.itens.length} {g.itens.length === 1 ? "item" : "itens"}
                </span>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {g.itens.map((i) => (
                  <LinhaItem
                    key={i.id}
                    item={i}
                    hoje={hoje}
                    podeEscrever={podeEscrever}
                    onAbrir={() => setGaveta({ tipo: "item", id: i.id })}
                    onUsar={() => setGaveta({ tipo: "usar", id: i.id })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* a gaveta */}
      {gaveta && (
        <Gaveta onFechar={() => setGaveta(null)} larga={gaveta.tipo === "importar"}>
          {gaveta.tipo === "novo" && <FormItem categorias={categorias} podeEscrever={podeEscrever} onFechar={() => setGaveta(null)} />}
          {gaveta.tipo === "item" && selecionado && (
            <FormItem categorias={categorias} item={selecionado} hoje={hoje} podeEscrever={podeEscrever} onFechar={() => setGaveta(null)} />
          )}
          {gaveta.tipo === "categorias" && <GavetaCategorias categorias={categorias} />}
          {gaveta.tipo === "importar" && <ImportarPlanilha categorias={categorias} itens={itens} onFechar={() => setGaveta(null)} />}
          {gaveta.tipo === "usar" && selecionado && <UsarNoEvento item={selecionado} onFechar={() => setGaveta(null)} />}
        </Gaveta>
      )}
    </div>
  );
}

/* =============================================================== LINHA */

function LinhaItem({
  item,
  hoje,
  podeEscrever,
  onAbrir,
  onUsar,
}: {
  item: ItemEstoque;
  hoje: string;
  podeEscrever: boolean;
  onAbrir: () => void;
  onUsar: () => void;
}) {
  const estado = estadoDoItem(item, hoje);
  const valor = valorEmEstoque(item);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5" style={{ borderBottom: "1px solid var(--linha)", opacity: item.ativo ? 1 : 0.55 }}>
      <button onClick={onAbrir} className="min-w-[160px] flex-1 text-left">
        <span style={{ display: "block", fontSize: 15, fontWeight: 500, color: "var(--tinta)" }}>
          {item.nome}
          {!item.ativo ? <span style={{ color: "var(--cinza)", fontWeight: 400 }}> · desativado</span> : null}
        </span>
        {estado && <span style={{ display: "block", fontSize: 12.5, color: item.abaixoDoMinimo || estado.startsWith("venc") ? ALERTA : "var(--cinza)", marginTop: 1 }}>{estado}</span>}
      </button>
      <div style={{ textAlign: "right", minWidth: 96 }}>
        <span style={{ display: "block", font: `600 18px/1.1 ${T.titulo}`, color: "var(--tinta)", fontVariantNumeric: "tabular-nums" }}>
          {numero(item.saldo)}
          <span style={{ fontSize: 12, fontWeight: 400, color: "var(--cinza)" }}> {item.unidade}</span>
        </span>
        {item.reservado > 0 && (
          <span style={{ display: "block", font: `500 11px/1.2 ${T.mono}`, color: "var(--cinza)" }}>
            {numero(item.disponivelHoje)} disponíveis hoje
          </span>
        )}
      </div>
      <div style={{ width: 96, textAlign: "right", font: `500 12.5px/1 ${T.mono}`, color: "var(--cinza)" }}>{valor == null ? "" : reais(valor)}</div>
      {podeEscrever && item.ativo && (
        <button onClick={onUsar} className="h-8 px-3" style={botaoSecundario}>
          Usar
        </button>
      )}
    </li>
  );
}

/* ============================================================ O ITEM */

function FormItem({
  categorias,
  item,
  hoje,
  podeEscrever,
  onFechar,
}: {
  categorias: CategoriaEstoque[];
  item?: ItemEstoque;
  hoje?: string;
  podeEscrever: boolean;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [d, setD] = useState<DadosDoItem & { quantidadeInicial: string }>({
    nome: item?.nome ?? "",
    categoriaId: item?.categoriaId ?? null,
    unidade: item?.unidade ?? "unidades",
    custoUnitario: item?.custoUnitario ?? null,
    minimo: item?.minimo ?? null,
    validade: item?.validade ?? null,
    observacao: item?.observacao ?? null,
    quantidadeInicial: "",
  });
  const [novoSaldo, setNovoSaldo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [historico, setHistorico] = useState<MovimentoDoItem[] | null>(null);

  useEffect(() => {
    if (item) void historicoDoItem(item.id).then(setHistorico);
  }, [item]);

  function rodar(fn: () => Promise<Resultado>, depois?: () => void) {
    setErro(null);
    setSalvo(false);
    iniciar(async () => {
      const r = await fn();
      if (typeof r.error === "string") {
        setErro(r.error);
        return;
      }
      setSalvo(true);
      router.refresh();
      depois?.();
    });
  }

  const muda = (p: Partial<typeof d>) => setD((x) => ({ ...x, ...p }));
  const numOuNulo = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
  const unidadeConhecida = (UNIDADES as readonly string[]).includes(d.unidade);

  return (
    <div className="flex flex-col gap-4">
      <h2 style={{ margin: 0, font: `600 18px/1.2 ${T.titulo}`, color: "var(--tinta)", paddingRight: 28 }}>
        {item ? item.nome : "Novo item"}
      </h2>
      {item && hoje && (
        <div style={{ fontSize: 13, color: "var(--cinza)" }}>
          {numero(item.saldo)} {item.unidade} no estoque
          {item.reservado > 0 ? ` · ${numero(item.reservado)} reservadas` : ""}
          {item.fora > 0 ? ` · ${numero(item.fora)} fora do depósito` : ""}
          {estadoDoItem(item, hoje) ? ` · ${estadoDoItem(item, hoje)}` : ""}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2">
          <span style={rotulo}>Nome</span>
          <input value={d.nome} maxLength={80} onChange={(e) => muda({ nome: e.target.value })} disabled={!podeEscrever} placeholder="Ex.: Cadeira Tiffany" style={campo} />
        </label>
        <label>
          <span style={rotulo}>Categoria</span>
          <select value={d.categoriaId ?? ""} onChange={(e) => muda({ categoriaId: e.target.value || null })} disabled={!podeEscrever} style={campo}>
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={rotulo}>Unidade</span>
          <select value={unidadeConhecida ? d.unidade : "outra"} onChange={(e) => muda({ unidade: e.target.value === "outra" ? "" : e.target.value })} disabled={!podeEscrever} style={campo}>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
            <option value="outra">outra…</option>
          </select>
          {!unidadeConhecida && (
            <input value={d.unidade} maxLength={20} onChange={(e) => muda({ unidade: e.target.value })} placeholder="qual?" style={{ ...campo, marginTop: 6 }} />
          )}
        </label>
        {!item && (
          <label>
            <span style={rotulo}>Quantidade que você tem</span>
            <input type="number" min={0} step="any" inputMode="decimal" value={d.quantidadeInicial} onChange={(e) => muda({ quantidadeInicial: e.target.value })} style={{ ...campo, fontFamily: T.mono }} />
          </label>
        )}
        <label>
          <span style={rotulo}>Custo por unidade (R$)</span>
          <input type="number" min={0} step="0.01" inputMode="decimal" value={d.custoUnitario ?? ""} onChange={(e) => muda({ custoUnitario: numOuNulo(e.target.value) })} disabled={!podeEscrever} style={{ ...campo, fontFamily: T.mono }} />
        </label>
        <label>
          <span style={rotulo}>Mínimo para repor</span>
          <input type="number" min={0} step="any" inputMode="decimal" value={d.minimo ?? ""} onChange={(e) => muda({ minimo: numOuNulo(e.target.value) })} disabled={!podeEscrever} placeholder="20% do total" style={{ ...campo, fontFamily: T.mono }} />
        </label>
        <label>
          <span style={rotulo}>Vencimento</span>
          <input type="date" value={d.validade ?? ""} onChange={(e) => muda({ validade: e.target.value || null })} disabled={!podeEscrever} style={campo} />
        </label>
        <label className="col-span-2">
          <span style={rotulo}>Observação</span>
          <input value={d.observacao ?? ""} maxLength={300} onChange={(e) => muda({ observacao: e.target.value || null })} disabled={!podeEscrever} placeholder="onde fica, de quem é, o que conferir" style={campo} />
        </label>
      </div>

      {erro && <p style={{ margin: 0, fontSize: 13, color: ALERTA }}>{erro}</p>}
      {salvo && !erro && <p style={{ margin: 0, fontSize: 12.5, color: "var(--cinza)" }}>Salvo.</p>}

      {podeEscrever && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={pendente || d.nome.trim().length < 2}
            onClick={() =>
              rodar(
                () =>
                  item
                    ? editarItem(item.id, { ...d })
                    : criarItem({ ...d, quantidadeInicial: numOuNulo(d.quantidadeInicial) }),
                item ? undefined : onFechar
              )
            }
            className="h-10 px-4"
            style={{ ...botaoPrimario, opacity: pendente || d.nome.trim().length < 2 ? 0.5 : 1 }}
          >
            {item ? "Salvar" : "Cadastrar"}
          </button>
          {item && item.ativo && (
            <button
              disabled={pendente}
              onClick={() => {
                if (window.confirm(`Remover "${item.nome}" do estoque?`)) rodar(() => removerItem(item.id), onFechar);
              }}
              style={{ fontSize: 13, color: "var(--cinza)" }}
            >
              remover
            </button>
          )}
          {item && !item.ativo && (
            <button disabled={pendente} onClick={() => rodar(() => reativarItem(item.id))} style={{ fontSize: 13, color: "var(--cinza)" }}>
              reativar
            </button>
          )}
        </div>
      )}

      {item && podeEscrever && (
        <div className="mt-2 flex flex-col gap-2" style={{ borderTop: "1px solid var(--linha)", paddingTop: 14 }}>
          <span style={{ font: `600 13px/1 ${T.ui}`, color: "var(--tinta)" }}>Ajustar o saldo</span>
          <span style={{ fontSize: 12.5, color: "var(--cinza)" }}>Contou e deu diferente? Escreva o número certo e o motivo; a diferença fica registrada.</span>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" min={0} step="any" inputMode="decimal" value={novoSaldo} onChange={(e) => setNovoSaldo(e.target.value)} placeholder={numero(item.saldo)} aria-label="Novo saldo" style={{ ...campo, width: 110, fontFamily: T.mono }} />
            <input value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} placeholder="motivo (quebrou, contagem, doação…)" aria-label="Motivo" style={{ ...campo, flex: 1, minWidth: 180 }} />
            <button
              disabled={pendente || novoSaldo.trim() === "" || Number(novoSaldo.replace(",", ".")) === item.saldo}
              onClick={() =>
                rodar(() => ajustarSaldo(item.id, Number(novoSaldo.replace(",", ".")) - item.saldo, motivo), () => {
                  setNovoSaldo("");
                  setMotivo("");
                })
              }
              className="h-9 px-3"
              style={{ ...botaoSecundario, opacity: pendente || novoSaldo.trim() === "" ? 0.5 : 1 }}
            >
              Ajustar
            </button>
          </div>
        </div>
      )}

      {item && (
        <div className="flex flex-col gap-1" style={{ borderTop: "1px solid var(--linha)", paddingTop: 14 }}>
          <span style={{ font: `600 13px/1 ${T.ui}`, color: "var(--tinta)", marginBottom: 4 }}>Histórico</span>
          {historico == null ? (
            <span style={{ fontSize: 12.5, color: "var(--cinza)" }}>carregando…</span>
          ) : historico.length === 0 ? (
            <span style={{ fontSize: 12.5, color: "var(--cinza)" }}>Nenhum movimento ainda.</span>
          ) : (
            historico.map((m) => (
              <div key={m.id} className="flex items-baseline justify-between gap-3" style={{ fontSize: 12.5, color: "var(--tinta)" }}>
                <span>
                  {m.tipo === "entrada" ? `+${numero(m.quantidade)}` : m.tipo === "ajuste" ? `${m.quantidade > 0 ? "+" : ""}${numero(m.quantidade)}` : `−${numero(m.quantidade)}`}{" "}
                  <span style={{ color: "var(--cinza)" }}>
                    {m.tipo === "entrada" ? "entrada" : m.tipo === "baixa" ? "consumido" : m.tipo === "perda" ? "perda" : "ajuste"}
                    {m.eventoNome ? ` · ${m.eventoNome}` : ""}
                    {m.motivo ? ` · ${m.motivo}` : ""}
                    {m.custoUnitario != null ? ` · ${reais(m.custoUnitario)}/un` : ""}
                  </span>
                </span>
                <span style={{ font: `500 11px/1.4 ${T.mono}`, color: "var(--cinza)", whiteSpace: "nowrap" }}>{formatDate(m.quando.slice(0, 10))}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ======================================================== CATEGORIAS */

function GavetaCategorias({ categorias }: { categorias: CategoriaEstoque[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [nova, setNova] = useState("");
  const [novaReutilizavel, setNovaReutilizavel] = useState(true);
  const [editando, setEditando] = useState<{ id: string; nome: string; reutilizavel: boolean } | null>(null);

  function rodar(fn: () => Promise<Resultado>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (typeof r.error === "string") {
        setErro(r.error);
        return;
      }
      router.refresh();
      depois?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 style={{ margin: 0, font: `600 18px/1.2 ${T.titulo}`, color: "var(--tinta)" }}>Categorias</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--cinza)" }}>
          A lista de separação sai nesta ordem — a mesma em que a equipe anda pelo depósito. Reutilizável volta para o estoque depois do evento; consumível não.
        </p>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {categorias.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 py-2" style={{ borderBottom: "1px solid var(--linha)" }}>
            {editando?.id === c.id ? (
              <>
                <input value={editando.nome} maxLength={60} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} style={{ ...campo, flex: 1, minWidth: 140 }} />
                <label className="flex items-center gap-1" style={{ fontSize: 12.5, color: "var(--cinza)" }}>
                  <input type="checkbox" checked={editando.reutilizavel} onChange={(e) => setEditando({ ...editando, reutilizavel: e.target.checked })} /> reutilizável
                </label>
                <button disabled={pendente} onClick={() => rodar(() => editarCategoria(c.id, editando.nome, editando.reutilizavel), () => setEditando(null))} className="h-8 px-3" style={botaoPrimario}>
                  Salvar
                </button>
                <button onClick={() => setEditando(null)} style={{ fontSize: 12.5, color: "var(--cinza)" }}>
                  cancelar
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col" style={{ width: 22 }}>
                  <button aria-label="Subir" disabled={pendente || i === 0} onClick={() => rodar(() => moverCategoria(c.id, "cima"))} style={{ fontSize: 11, color: "var(--cinza)", opacity: i === 0 ? 0.3 : 1 }}>
                    ▲
                  </button>
                  <button aria-label="Descer" disabled={pendente || i === categorias.length - 1} onClick={() => rodar(() => moverCategoria(c.id, "baixo"))} style={{ fontSize: 11, color: "var(--cinza)", opacity: i === categorias.length - 1 ? 0.3 : 1 }}>
                    ▼
                  </button>
                </div>
                <button onClick={() => setEditando({ id: c.id, nome: c.nome, reutilizavel: c.reutilizavel })} className="min-w-0 flex-1 text-left">
                  <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--tinta)" }}>{c.nome}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--cinza)" }}>
                    {c.reutilizavel ? "reutilizável" : "consumível"} · {c.itens} {c.itens === 1 ? "item" : "itens"}
                  </span>
                </button>
                {c.itens === 0 && (
                  <button disabled={pendente} onClick={() => rodar(() => removerCategoria(c.id))} style={{ fontSize: 12.5, color: "var(--cinza)" }}>
                    apagar
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <input value={nova} maxLength={60} onChange={(e) => setNova(e.target.value)} placeholder="Nova categoria" aria-label="Nova categoria" style={{ ...campo, flex: 1, minWidth: 140 }} />
        <label className="flex items-center gap-1" style={{ fontSize: 12.5, color: "var(--cinza)" }}>
          <input type="checkbox" checked={novaReutilizavel} onChange={(e) => setNovaReutilizavel(e.target.checked)} /> reutilizável
        </label>
        <button disabled={pendente || nova.trim().length < 2} onClick={() => rodar(() => criarCategoria(nova, novaReutilizavel), () => setNova(""))} className="h-9 px-3" style={{ ...botaoPrimario, opacity: nova.trim().length < 2 ? 0.5 : 1 }}>
          Criar
        </button>
      </div>
      {erro && <p style={{ margin: 0, fontSize: 13, color: ALERTA }}>{erro}</p>}
    </div>
  );
}

/* ================================================================ USAR */

function UsarNoEvento({ item, onFechar }: { item: ItemEstoque; onFechar: () => void }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [eventos, setEventos] = useState<EventoParaReservar[] | null>(null);
  const [eventoId, setEventoId] = useState("");
  const [qtd, setQtd] = useState("");
  const [disponivel, setDisponivel] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  useEffect(() => {
    void eventosParaReservar().then(setEventos);
  }, []);

  const evento = eventos?.find((e) => e.id === eventoId) ?? null;
  useEffect(() => {
    if (!evento) {
      setDisponivel(null);
      return;
    }
    void disponivelNaData(item.id, evento.data).then(setDisponivel);
  }, [evento, item.id]);

  const quantidade = Number(qtd.replace(",", "."));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 style={{ margin: 0, font: `600 18px/1.2 ${T.titulo}`, color: "var(--tinta)", paddingRight: 28 }}>Usar {item.nome}</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--cinza)" }}>
          {numero(item.saldo)} {item.unidade} no estoque. A reserva desconta do disponível na data; o saldo só muda quando o evento fecha.
        </p>
      </div>
      {feito ? (
        <div style={{ fontSize: 14, color: "var(--tinta)" }}>
          {feito}
          <div className="mt-3">
            <button onClick={onFechar} className="h-9 px-3" style={botaoSecundario}>
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <>
          <label>
            <span style={rotulo}>Evento</span>
            <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} style={campo}>
              <option value="">{eventos == null ? "carregando…" : eventos.length === 0 ? "nenhum evento aberto" : "escolha o evento"}</option>
              {(eventos ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {formatDate(e.data)} · {e.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={rotulo}>
              Quantidade
              {evento && disponivel != null ? ` · ${numero(disponivel)} disponíveis nessa data` : ""}
            </span>
            <input type="number" min={0} step="any" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} style={{ ...campo, fontFamily: T.mono }} />
          </label>
          {evento && disponivel != null && quantidade > disponivel && (
            <p style={{ margin: 0, fontSize: 13, color: ALERTA }}>
              Faltam {numero(quantidade - disponivel)} nessa data. Dá para reservar assim mesmo e resolver o resto (alugar, comprar) depois.
            </p>
          )}
          {erro && <p style={{ margin: 0, fontSize: 13, color: ALERTA }}>{erro}</p>}
          <div>
            <button
              disabled={pendente || !evento || !(quantidade > 0)}
              onClick={() => {
                setErro(null);
                iniciar(async () => {
                  const r = await reservarParaEvento(evento!.id, item.id, quantidade);
                  if ("error" in r) {
                    setErro(r.error);
                    return;
                  }
                  setFeito(
                    r.falta > 0
                      ? `Reservado para ${evento!.nome}. Faltam ${numero(r.falta)} na data — veja em Por evento.`
                      : `Reservado para ${evento!.nome}. A linha já aparece na Operação do evento.`
                  );
                  router.refresh();
                });
              }}
              className="h-10 px-4"
              style={{ ...botaoPrimario, opacity: pendente || !evento || !(quantidade > 0) ? 0.5 : 1 }}
            >
              Reservar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
