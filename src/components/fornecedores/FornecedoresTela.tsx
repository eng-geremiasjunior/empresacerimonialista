"use client";

// Fornecedores — cadastro global.
//
// Quatro decisões governam esta tela:
//
// 1. BUSCA EM PRIMEIRO LUGAR. Um campo de 40px cobre nome, categoria,
//    cidade e telefone, e filtra a cada tecla. Filtro é secundário, numa
//    coluna à esquerda — nunca uma fileira de chips comendo o topo.
// 2. SEM NAVEGAÇÃO DE DETALHE. O fornecedor abre no painel à direita, na
//    mesma tela. A página /fornecedores/[id] continua existindo para
//    link profundo (é onde mora o link mágico dele), mas o dia a dia
//    não passa mais por ela.
// 3. COR SÓ QUANDO SIGNIFICA. A tela inteira é papel e tinta. Matiz
//    aparece só nas pílulas de estado do histórico e no ponto do aviso.
// 4. AÇÃO ADMINISTRATIVA É NEUTRA. Cadastro e gestão usam tinta, não
//    ameixa — a ameixa fica reservada para ação de fluxo de evento, e
//    nesta tela não há nenhuma.
//
// Tudo filtra no cliente: o servidor manda a lista inteira uma vez e daqui
// em diante ninguém espera rede para ver o resultado de uma tecla.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Search, X } from "lucide-react";
import {
  ORDEM_VISOES,
  VISAO_LABELS,
  avisoDeContrato,
  contarCategorias,
  contarVisoes,
  filtrar,
  linhaDeContexto,
  mesAno,
  nivelFaixa,
  rotuloFaixa,
  temFiltro,
  TOM_PAGAMENTO,
  type Filtros,
  type FornecedorLinha,
  type Visao,
} from "@/lib/fornecedores-lista";
import { categoriaLabel, waLink } from "@/lib/fornecedores-shared";
import { NovoFornecedorButton } from "@/components/fornecedores/NovoFornecedorButton";
import { formatCurrency } from "@/lib/format";
import {
  desmarcarFavorito,
  eventosParaVincular,
  marcarComoFavorito,
  vincularAoEvento,
  type EventoParaVincular,
} from "@/app/(app)/fornecedores/actions";

/* ------------------------------------------------------------- estilos */

const T = {
  mono: "'IBM Plex Mono', monospace",
  ui: "'Instrument Sans', system-ui, sans-serif",
  titulo: "Inter, system-ui, sans-serif",
};

const rotuloColuna: React.CSSProperties = {
  font: `500 11px/1 ${T.mono}`,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--cinza)",
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

/* -------------------------------------------------------------- tipos */

type Props = {
  linhas: FornecedorLinha[];
  anoCorrente: number;
  migracaoPendente: boolean;
  /** id vindo de ?f= — abre o painel direto neste fornecedor */
  selecionadoInicial: string | null;
  /**
   * Assistente LÊ o cadastro mas não escreve (RLS 024). E as policies de
   * UPDATE só têm USING: a escrita recusada volta com ZERO linhas e SEM
   * erro. Mostrar o botão seria prometer uma ação que falha calada.
   */
  podeEscrever: boolean;
};

/* ================================================================ TELA */

export function FornecedoresTela({
  linhas,
  anoCorrente,
  migracaoPendente,
  selecionadoInicial,
  podeEscrever,
}: Props) {
  const router = useRouter();
  const [filtros, setFiltros] = useState<Filtros>({
    q: "",
    visao: "todos",
    categoria: null,
  });
  const [selId, setSelId] = useState<string | null>(
    selecionadoInicial ?? linhas[0]?.id ?? null
  );
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [painelAberto, setPainelAberto] = useState(false); // < 1024px
  const [filtrosAbertos, setFiltrosAbertos] = useState(false); // < 1024px
  const buscaRef = useRef<HTMLInputElement>(null);

  const visiveis = useMemo(
    () => filtrar(linhas, filtros, anoCorrente),
    [linhas, filtros, anoCorrente]
  );
  const visoes = useMemo(
    () => contarVisoes(linhas, anoCorrente),
    [linhas, anoCorrente]
  );
  const categorias = useMemo(() => contarCategorias(linhas), [linhas]);
  const aviso = useMemo(
    () => avisoDeContrato(linhas, filtros.visao),
    [linhas, filtros.visao]
  );

  const sel = useMemo(
    () => visiveis.find((f) => f.id === selId) ?? visiveis[0] ?? null,
    [visiveis, selId]
  );

  // selId TEM que apontar para o que está destacado. Sem isto, quando o
  // filtro derruba o selecionado, o painel mostra o primeiro da lista mas
  // selId continua no antigo — e Enter abriria um fornecedor que não está
  // em lugar nenhum da tela.
  useEffect(() => {
    if (sel && sel.id !== selId) setSelId(sel.id);
    if (!sel && selId !== null) setSelId(null);
  }, [sel, selId]);

  // ⌘K de qualquer lugar; ↑↓ percorre a lista e o painel acompanha;
  // enter abre. Campo de texto em foco desliga a navegação.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        buscaRef.current?.focus();
        buscaRef.current?.select();
        return;
      }
      const alvo = e.target as HTMLElement | null;
      // A guarda precisa cobrir mais que campo de texto: <select> usa as
      // setas para trocar de opção e <button>/<a> usam Enter para acionar.
      // Sem isto, o listener global rouba a tecla do modal de cadastro —
      // as setas param de escolher a categoria e Enter navega para fora no
      // meio do formulário.
      const ocupado =
        alvo &&
        (alvo.tagName === "INPUT" ||
          alvo.tagName === "TEXTAREA" ||
          alvo.tagName === "SELECT" ||
          alvo.tagName === "BUTTON" ||
          alvo.tagName === "A" ||
          alvo.isContentEditable ||
          alvo.closest("[role='dialog'],[role='menu'],form") !== null);
      const digitando =
        alvo &&
        (alvo.tagName === "INPUT" ||
          alvo.tagName === "TEXTAREA" ||
          alvo.isContentEditable);

      if (e.key === "Escape") {
        setPainelAberto(false);
        setFiltrosAbertos(false);
        if (digitando) (alvo as HTMLElement).blur();
        return;
      }
      if (ocupado) return;
      if (visiveis.length === 0) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const i = visiveis.findIndex((f) => f.id === selId);
        const prox =
          e.key === "ArrowDown"
            ? Math.min(visiveis.length - 1, i < 0 ? 0 : i + 1)
            : Math.max(0, i < 0 ? 0 : i - 1);
        const novo = visiveis[prox];
        setSelId(novo.id);
        // sem isto a seleção passa a andar fora da vista numa lista longa
        document
          .querySelector(`[data-forn="${novo.id}"]`)
          ?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        // sel, não selId: é o que está destacado na tela
        if (sel) router.push(`/fornecedores/${sel.id}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visiveis, selId, sel, router]);

  // Trocar de filtro limpa a seleção. Manter significaria a barra dizendo
  // "3 selecionados" com 1 na tela, e "Marcar favorito" atingindo dois
  // fornecedores que ela não está vendo.
  const mudarFiltros = useCallback((f: Filtros) => {
    setFiltros((antes) => {
      if (antes.visao !== f.visao || antes.categoria !== f.categoria) {
        setMarcados([]);
      }
      return f;
    });
  }, []);

  const limparTudo = useCallback(() => {
    setFiltros({ q: "", visao: "todos", categoria: null });
    setMarcados([]);
  }, []);

  function escolher(id: string) {
    setSelId(id);
    setPainelAberto(true); // só tem efeito abaixo de 1024px
  }

  if (migracaoPendente) {
    return (
      <div
        style={{
          border: "1px solid var(--linha)",
          borderRadius: 14,
          background: "var(--papel)",
          padding: 24,
          fontFamily: T.ui,
          fontSize: 13,
          color: "var(--text-body)",
        }}
      >
        O cadastro de fornecedores ainda não foi migrado neste banco. Aplique a
        migração 026 e recarregue.
      </div>
    );
  }

  const algumMarcado = marcados.length > 0;

  return (
    <div
      className="flex h-[calc(100dvh-8.5rem)] min-h-[540px] overflow-hidden"
      style={{
        border: "1px solid var(--linha)",
        borderRadius: 14,
        background: "var(--surface-app)",
        fontFamily: T.ui,
        color: "var(--text-body)",
      }}
    >
      {/* ---------------------------------------------- coluna de visões */}
      {/* A barra do app já come 256px + 64px de respiro. Ligar visões e
          painel em lg (1024px) deixava a TABELA com ~90px úteis. Visões
          entram em xl (1280) e o painel em 2xl (1536), que é quando os três
          cabem de verdade. */}
      <ColunaVisoes
        className="hidden w-[212px] flex-none xl:flex"
        filtros={filtros}
        setFiltros={mudarFiltros}
        visoes={visoes}
        categorias={categorias}
      />

      {/* ------------------------------------------------------ conteúdo */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Cabecalho
          total={linhas.length}
          visiveis={visiveis.length}
          filtros={filtros}
          setFiltros={setFiltros}
          buscaRef={buscaRef}
          limparTudo={limparTudo}
          abrirFiltros={() => setFiltrosAbertos(true)}
          podeCadastrar={podeEscrever}
        />

        {aviso && (
          <div
            className="mx-4 mt-3.5 sm:mx-6"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 13px",
              background: "var(--nevoa)",
              border: "1px solid var(--linha)",
              borderRadius: 10,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                flex: "none",
                borderRadius: "50%",
                background: "var(--state-wait)",
              }}
            />
            <span style={{ fontSize: 12.5, color: "var(--text-body)" }}>
              {aviso}
            </span>
            <span style={{ flex: 1 }} />
            <button
              onClick={() =>
                mudarFiltros({ q: "", visao: "sem_contrato", categoria: null })
              }
              className="vela-link vela-foco"
              style={{
                border: 0,
                background: "transparent",
                font: `600 12.5px/1 ${T.ui}`,
                color: "var(--tinta)",
                textDecoration: "underline",
                textUnderlineOffset: 2,
                cursor: "pointer",
              }}
            >
              Revisar
            </button>
          </div>
        )}

        <div
          className="hidden gap-3 px-4 pb-2.5 pt-4 sm:px-6 md:flex"
          style={{ ...rotuloColuna, borderBottom: "1px solid var(--linha)" }}
        >
          <div style={{ flex: 2.4, minWidth: 0 }}>Nome</div>
          <div style={{ width: 104 }}>Categoria</div>
          <div style={{ width: 64 }}>Eventos</div>
          <div className="hidden xl:block" style={{ width: 74 }}>
            Últ. uso
          </div>
          <div style={{ width: 52 }}>Faixa</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-6">
          {visiveis.length === 0 ? (
            <Vazio temBusca={temFiltro(filtros)} limpar={limparTudo} />
          ) : (
            visiveis.map((f) => (
              <LinhaFornecedor
                key={f.id}
                f={f}
                selecionado={sel?.id === f.id}
                hovered={hoverId === f.id}
                marcado={marcados.includes(f.id)}
                algumMarcado={algumMarcado}
                onEscolher={() => escolher(f.id)}
                onHover={setHoverId}
                onMarcar={() =>
                  setMarcados((m) =>
                    m.includes(f.id) ? m.filter((x) => x !== f.id) : [...m, f.id]
                  )
                }
              />
            ))
          )}
        </div>

        {algumMarcado && (
          <BarraSelecao
            marcados={marcados}
            podeEscrever={podeEscrever}
            limpar={() => setMarcados([])}
            onFeito={() => {
              setMarcados([]);
              router.refresh();
            }}
          />
        )}
      </div>

      {/* --------------------------------------------------------- painel
          Ele NÃO desmonta quando a busca não acha nada: a tabela saltaria
          352px de largura a cada tecla que zera o resultado. */}
      {!sel && (
        <aside
          className="hidden w-[352px] flex-none 2xl:block"
          style={{ borderLeft: "1px solid var(--linha)", background: "var(--surface-app)" }}
        />
      )}
      {sel && (
        <>
          <aside
            className="hidden w-[352px] flex-none overflow-y-auto 2xl:block"
            style={{
              borderLeft: "1px solid var(--linha)",
              background: "var(--surface-app)",
            }}
          >
            <PainelDetalhe
              f={sel}
              podeEscrever={podeEscrever}
              onMudou={() => router.refresh()}
            />
          </aside>

          {/* abaixo de 1024px o painel vira gaveta sobre a lista */}
          {painelAberto && (
            <div
              className="fixed inset-0 z-40 2xl:hidden"
              onClick={() => setPainelAberto(false)}
              style={{ background: "rgba(34,30,27,0.22)" }}
            >
              <aside
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-y-0 right-0 w-full max-w-[392px] overflow-y-auto"
                style={{
                  background: "var(--surface-app)",
                  borderLeft: "1px solid var(--linha)",
                }}
              >
                <div className="flex justify-end px-4 pt-4">
                  <button
                    onClick={() => setPainelAberto(false)}
                    aria-label="Fechar"
                    className="flex h-11 w-11 items-center justify-center"
                    style={{ border: 0, background: "transparent", cursor: "pointer" }}
                  >
                    <X size={18} color="var(--cinza-3)" />
                  </button>
                </div>
                <PainelDetalhe
                  f={sel}
                  podeEscrever={podeEscrever}
                  onMudou={() => router.refresh()}
                />
              </aside>
            </div>
          )}
        </>
      )}

      {/* filtros como gaveta abaixo de 1024px */}
      {filtrosAbertos && (
        <div
          className="fixed inset-0 z-40 xl:hidden"
          onClick={() => setFiltrosAbertos(false)}
          style={{ background: "rgba(34,30,27,0.22)" }}
        >
          <ColunaVisoes
            className="absolute inset-y-0 left-0 flex w-[260px] max-w-[85vw] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            filtros={filtros}
            setFiltros={(f) => {
              mudarFiltros(f);
              setFiltrosAbertos(false);
            }}
            visoes={visoes}
            categorias={categorias}
          />
        </div>
      )}
    </div>
  );
}

/* ==================================================== COLUNA DE VISÕES */

function ColunaVisoes({
  className,
  onClick,
  filtros,
  setFiltros,
  visoes,
  categorias,
}: {
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  filtros: Filtros;
  setFiltros: (f: Filtros) => void;
  visoes: Record<Visao, number>;
  categorias: { slug: string; label: string; count: number }[];
}) {
  const item = (ativo: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    height: 30,
    padding: "0 8px",
    border: 0,
    borderRadius: 6,
    fontSize: 13,
    textAlign: "left",
    cursor: "pointer",
    transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
    background: ativo ? "var(--nevoa-2)" : "transparent",
    color: ativo ? "var(--tinta)" : "var(--cinza-3)",
    fontWeight: ativo ? 600 : 400,
  });

  return (
    <div
      className={`flex-col gap-5 px-3 py-5 ${className ?? ""}`}
      onClick={onClick}
      style={{
        borderRight: "1px solid var(--linha)",
        background: "var(--surface-app)",
      }}
    >
      <div className="flex flex-col gap-1.5">
        <div style={{ ...rotuloColuna, padding: "0 8px" }}>Visões</div>
        <div className="flex flex-col gap-px">
          {ORDEM_VISOES.map((v) => (
            <button
              key={v}
              onClick={() => setFiltros({ ...filtros, visao: v })}
              className="vela-item-nav vela-foco"
              style={item(filtros.visao === v)}
            >
              <span className="min-w-0 flex-1 truncate">{VISAO_LABELS[v]}</span>
              <span style={{ font: `500 11px/1 ${T.mono}`, color: "var(--cinza)" }}>
                {visoes[v]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {categorias.length > 0 && (
        <div className="flex min-h-0 flex-col gap-1.5">
          <div style={{ ...rotuloColuna, padding: "0 8px" }}>Categoria</div>
          <div className="flex flex-col gap-px overflow-y-auto">
            {categorias.map((c) => (
              <button
                key={c.slug}
                // clicar de novo desmarca: o filtro é um interruptor, não
                // uma escolha da qual ela precise sair pelo "Todos"
                onClick={() =>
                  setFiltros({
                    ...filtros,
                    categoria: filtros.categoria === c.slug ? null : c.slug,
                  })
                }
                className="vela-item-nav vela-foco"
                style={item(filtros.categoria === c.slug)}
              >
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                <span style={{ font: `500 11px/1 ${T.mono}`, color: "var(--cinza)" }}>
                  {c.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />
    </div>
  );
}

/* ========================================================== CABEÇALHO */

function Cabecalho({
  total,
  visiveis,
  filtros,
  setFiltros,
  buscaRef,
  limparTudo,
  abrirFiltros,
  podeCadastrar,
}: {
  total: number;
  visiveis: number;
  podeCadastrar: boolean;
  filtros: Filtros;
  setFiltros: (f: Filtros) => void;
  buscaRef: React.RefObject<HTMLInputElement>;
  limparTudo: () => void;
  abrirFiltros: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-3.5 px-4 pb-3.5 pt-5 sm:px-6"
      style={{ borderBottom: "1px solid var(--linha)" }}
    >
      <div className="flex items-center gap-2.5">
        <h1
          style={{
            margin: 0,
            font: `600 22px/1.2 ${T.titulo}`,
            letterSpacing: "-0.02em",
            color: "var(--tinta)",
          }}
        >
          Fornecedores
        </h1>
        <span style={{ font: `500 12px/1 ${T.mono}`, color: "var(--cinza)" }}>
          {total} no cadastro
        </span>
        <span className="flex-1" />
        {/* Ação administrativa é neutra: tinta, não ameixa. A ameixa fica
            reservada para ação de fluxo de evento, e nesta tela não há. */}
        {podeCadastrar && <NovoFornecedorButton />}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={abrirFiltros}
          className="vela-btn-secundario vela-foco h-11 flex-none px-3 xl:hidden"
          style={{ ...botaoSecundario, font: `500 12.5px/1 ${T.ui}` }}
        >
          Filtros
        </button>

        <label
          className="vela-busca flex h-10 min-w-0 flex-1 items-center gap-2.5 px-3"
          style={{
            background: "var(--papel)",
            border: "1px solid var(--cinza-2)",
            borderRadius: 10,
          }}
        >
          <Search size={15} color="var(--cinza-3)" strokeWidth={1.75} />
          <input
            ref={buscaRef}
            value={filtros.q}
            onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
            placeholder="Buscar por nome, categoria, cidade, telefone…"
            aria-label="Buscar fornecedor"
            className="min-w-0 flex-1 bg-transparent outline-none"
            style={{ border: 0, fontSize: 14, color: "var(--tinta)" }}
          />
          <span
            className="hidden sm:inline"
            style={{
              font: `500 10.5px/1 ${T.mono}`,
              color: "var(--cinza-2)",
              border: "1px solid var(--linha)",
              borderRadius: 4,
              padding: "3px 5px",
            }}
          >
            ⌘K
          </span>
        </label>
      </div>

      <div className="flex min-h-[20px] items-center gap-2">
        {/* sem filtro esta linha repetiria o "N no cadastro" do cabeçalho */}
        {temFiltro(filtros) && (
          <span style={{ fontSize: 12.5, color: "var(--cinza-3)" }}>
            {linhaDeContexto(visiveis, filtros)}
          </span>
        )}
        {temFiltro(filtros) && (
          <button
            onClick={limparTudo}
            className="vela-link vela-foco"
            style={{
              border: 0,
              background: "transparent",
              fontSize: 12.5,
              color: "var(--tinta)",
              textDecoration: "underline",
              textUnderlineOffset: 2,
              cursor: "pointer",
            }}
          >
            limpar
          </button>
        )}
        <span className="flex-1" />
        <span
          className="hidden xl:inline"
          style={{ font: `500 11px/1 ${T.mono}`, color: "var(--cinza-2)" }}
        >
          ↑↓ navegar · enter abrir
        </span>
      </div>
    </div>
  );
}

/* =============================================================== LINHA */

function MedidorFaixa({ f }: { f: FornecedorLinha }) {
  const n = nivelFaixa(f.faixaPreco);
  return (
    <div
      title={rotuloFaixa(f.faixaPreco)}
      aria-label={`Faixa de preço ${rotuloFaixa(f.faixaPreco)}`}
      style={{ width: 52, display: "flex", gap: 2, alignItems: "flex-end" }}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: 4,
            borderRadius: 2,
            height: 6 + i * 3,
            background: i <= n ? "var(--text-body)" : "var(--linha)",
          }}
        />
      ))}
    </div>
  );
}

function LinhaFornecedor({
  f,
  selecionado,
  hovered,
  marcado,
  algumMarcado,
  onEscolher,
  onHover,
  onMarcar,
}: {
  f: FornecedorLinha;
  selecionado: boolean;
  hovered: boolean;
  marcado: boolean;
  algumMarcado: boolean;
  onEscolher: () => void;
  onHover: (id: string | null) => void;
  onMarcar: () => void;
}) {
  const wa = waLink(f.telefone);
  const mostrarCheck = hovered || marcado || algumMarcado;
  const catPrincipal = f.categorias[0] ? categoriaLabel(f.categorias[0]) : "—";
  const catExtras = f.categorias.length - 1;

  return (
    <div
      onClick={onEscolher}
      onMouseEnter={() => onHover(f.id)}
      onMouseLeave={() => onHover(null)}
      data-forn={f.id}
      role="button"
      tabIndex={-1}
      aria-current={selecionado}
      className="relative flex cursor-pointer items-center gap-3 py-2.5 md:h-11 md:py-0"
      style={{
        padding: "0 8px",
        margin: "0 -8px",
        borderBottom: "1px solid var(--linha-suave)",
        borderRadius: 6,
        transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
        background: selecionado || hovered ? "var(--nevoa)" : "transparent",
        boxShadow: selecionado ? "inset 2px 0 0 var(--tinta)" : undefined,
      }}
    >
      <div className="flex min-w-0 flex-[2.4] items-center gap-2.5 py-2 md:py-0">
        {mostrarCheck ? (
          // <button> de verdade, não <span role="checkbox">: assim ele
          // entra na ordem de tabulação e responde a espaço/enter sem eu
          // reimplementar teclado à mão.
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarcar();
            }}
            role="checkbox"
            aria-checked={marcado}
            aria-label={`Selecionar ${f.nome}`}
            className="vela-foco"
            style={{
              width: 22,
              height: 22,
              flex: "none",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              background: marcado ? "var(--tinta)" : "var(--papel)",
              border: `1px solid ${marcado ? "var(--tinta)" : "var(--cinza-2)"}`,
            }}
          >
            {marcado && <Check size={11} color="var(--marfim)" strokeWidth={3} />}
          </button>
        ) : (
          <span
            aria-hidden
            style={{
              width: 22,
              height: 22,
              flex: "none",
              borderRadius: 6,
              background: "var(--nevoa-2)",
              border: "1px solid var(--linha)",
            }}
          />
        )}

        <span className="min-w-0 flex-1">
          <span
            className="block truncate"
            style={{
              font: `600 13.5px/1.3 ${T.titulo}`,
              letterSpacing: "-0.02em",
              color: "var(--tinta)",
            }}
          >
            {f.nome}
          </span>
          {/* abaixo de 768px categoria e último uso descem para cá */}
          <span
            className="block truncate md:hidden"
            style={{ font: `400 11.5px/1.4 ${T.mono}`, color: "var(--cinza)" }}
          >
            {catPrincipal}
            {catExtras > 0 ? ` +${catExtras}` : ""} · {f.eventos} ev ·{" "}
            {mesAno(f.ultimoUso)} · {rotuloFaixa(f.faixaPreco)}
          </span>
        </span>

        {f.status === "favorito" && (
          <span
            style={{
              font: `500 10px/1 ${T.mono}`,
              color: "var(--cinza-3)",
              background: "var(--nevoa)",
              borderRadius: 999,
              padding: "3px 7px",
              flex: "none",
            }}
          >
            favorito
          </span>
        )}
        {f.status === "bloqueado" && (
          <span
            style={{
              font: `500 10px/1 ${T.mono}`,
              color: "var(--cinza-3)",
              background: "var(--nevoa-2)",
              borderRadius: 999,
              padding: "3px 7px",
              flex: "none",
            }}
          >
            não contratar
          </span>
        )}
      </div>

      <div
        className="hidden truncate md:block"
        title={f.categorias.map(categoriaLabel).join(" · ")}
        style={{ width: 104, fontSize: 13, color: "var(--cinza-3)" }}
      >
        {catPrincipal}
        {catExtras > 0 && (
          <span style={{ color: "var(--cinza-2)" }}> +{catExtras}</span>
        )}
      </div>
      <div
        className="hidden md:block"
        style={{ width: 64, font: `400 12.5px/1 ${T.mono}`, color: "var(--text-body)" }}
      >
        {f.eventos}
      </div>
      <div
        className="hidden xl:block"
        style={{ width: 74, font: `400 12.5px/1 ${T.mono}`, color: "var(--cinza)" }}
      >
        {mesAno(f.ultimoUso)}
      </div>
      <div className="hidden md:block">
        <MedidorFaixa f={f} />
      </div>

      {/* Ações no hover: cortam um clique no uso diário. Só no desktop —
          no toque nada pode depender de hover, e lá o cartão inteiro abre
          o painel, que tem as mesmas ações em alvos de 44px. */}
      {hovered && !algumMarcado && (
        <div
          className="absolute right-0 top-0 hidden h-[43px] items-center gap-1.5 pl-[22px] pr-2 lg:flex"
          style={{ background: "var(--nevoa)" }}
        >
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="vela-btn-secundario vela-foco flex h-[26px] items-center px-2.5"
              style={{ ...botaoSecundario, font: `500 12px/1 ${T.ui}`, textDecoration: "none" }}
            >
              WhatsApp
            </a>
          )}
          <BotaoVincular
            ids={[f.id]}
            rotulo="Vincular a evento"
            altura={26}
            onStop
          />
        </div>
      )}
    </div>
  );
}

/* ============================================================== VAZIO */

function Vazio({ temBusca, limpar }: { temBusca: boolean; limpar: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-11">
      <p style={{ font: `600 14px/1 ${T.titulo}`, color: "var(--tinta)" }}>
        {temBusca ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor no cadastro"}
      </p>
      <p style={{ fontSize: 12.5, color: "var(--cinza-3)" }}>
        {temBusca
          ? "Ajuste a busca ou cadastre este fornecedor agora."
          : "Cadastre o primeiro para começar a montar sua rede."}
      </p>
      {temBusca && (
        <button
          onClick={limpar}
          className="vela-btn-secundario vela-foco mt-1 h-11 px-3 sm:h-[30px]"
          style={botaoSecundario}
        >
          Limpar busca
        </button>
      )}
    </div>
  );
}

/* ==================================================== BARRA DE SELEÇÃO */

function BarraSelecao({
  marcados,
  podeEscrever,
  limpar,
  onFeito,
}: {
  marcados: string[];
  podeEscrever: boolean;
  limpar: () => void;
  onFeito: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);

  // "Favorito" é um VALOR de status, então a ação só alcança quem está
  // 'ativo' — quem está inativo ou marcado como "não contratar" fica de
  // fora de propósito. Se a seleção sumisse sem dizer nada, ela acharia
  // que funcionou para todos.
  async function favoritar() {
    setOcupado(true);
    setRecado(null);
    const r = await marcarComoFavorito(marcados);
    setOcupado(false);
    if (r.error) {
      setRecado(r.error);
      return;
    }
    const alterados = r.alterados ?? 0;
    const pedidos = r.pedidos ?? marcados.length;
    if (alterados === 0) {
      setRecado("Nenhum foi marcado: só fornecedor ativo vira favorito.");
      return;
    }
    if (alterados < pedidos) {
      setRecado(
        `${alterados} de ${pedidos} marcados — os outros não estavam ativos.`
      );
    }
    onFeito();
  }

  return (
    <div
      className="flex flex-none flex-wrap items-center gap-2.5 px-4 py-2 sm:px-6 md:h-[52px] md:flex-nowrap md:py-0"
      style={{ borderTop: "1px solid var(--linha)", background: "var(--papel)" }}
    >
      <span style={{ font: `500 12px/1 ${T.mono}`, color: "var(--tinta)" }}>
        {marcados.length} {marcados.length === 1 ? "selecionado" : "selecionados"}
      </span>
      <span
        aria-hidden
        className="hidden md:block"
        style={{ width: 1, height: 18, background: "var(--linha)" }}
      />
      {podeEscrever && (
        <>
          <BotaoVincular
            ids={marcados}
            rotulo="Vincular a evento"
            altura={30}
            onFeito={onFeito}
          />
          <button
            onClick={favoritar}
            disabled={ocupado}
            className="vela-btn-secundario vela-foco h-11 px-3 md:h-[30px]"
            style={{ ...botaoSecundario, opacity: ocupado ? 0.5 : 1 }}
          >
            Marcar favorito
          </button>
        </>
      )}
      <a
        href={`/api/fornecedores-export?ids=${marcados.join(",")}`}
        className="vela-btn-secundario vela-foco flex h-11 items-center px-3 md:h-[30px]"
        style={{ ...botaoSecundario, textDecoration: "none" }}
      >
        Exportar
      </a>
      {recado && (
        <span style={{ fontSize: 12, color: "var(--cinza-3)" }}>{recado}</span>
      )}
      <span className="flex-1" />
      <button
        onClick={limpar}
        className="vela-link vela-foco"
        style={{
          border: 0,
          background: "transparent",
          fontSize: 12.5,
          color: "var(--cinza-3)",
          textDecoration: "underline",
          textUnderlineOffset: 2,
          cursor: "pointer",
        }}
      >
        limpar seleção
      </button>
    </div>
  );
}

/* ========================================================== VINCULAR */

function BotaoVincular({
  ids,
  rotulo,
  altura,
  onStop,
  onFeito,
}: {
  ids: string[];
  rotulo: string;
  altura: number;
  onStop?: boolean;
  onFeito?: () => void;
}) {
  const router = useRouter();
  const botaoRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [eventos, setEventos] = useState<EventoParaVincular[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [falhouCarregar, setFalhouCarregar] = useState(false);

  // POSIÇÃO FIXA, medida na abertura. Um popover `absolute` seria cortado:
  // este botão vive dentro da lista, que rola, e dentro da barra de
  // seleção, que fica colada no fundo — nos dois casos um ancestral com
  // overflow comeria o menu.
  const LARGURA = 280;
  const ALTURA_MAX = 300;

  async function abrir(e: React.MouseEvent) {
    if (onStop) e.stopPropagation();
    const r = botaoRef.current?.getBoundingClientRect();
    if (!r) return;
    const abaixo = window.innerHeight - r.bottom;
    const paraCima = abaixo < ALTURA_MAX + 12;
    setPos({
      top: paraCima ? Math.max(8, r.top - ALTURA_MAX - 6) : r.bottom + 6,
      left: Math.min(
        Math.max(8, r.right - LARGURA),
        Math.max(8, window.innerWidth - LARGURA - 8)
      ),
    });
    setErro(null);
    if (eventos === null) {
      const r = await eventosParaVincular();
      if (r.error) {
        // "Nenhum evento em aberto" é uma afirmação; dizê-la porque a
        // consulta falhou faria ela cadastrar um evento que já existe.
        setFalhouCarregar(true);
        setErro(r.error);
        return;
      }
      setEventos(r.eventos);
    }
  }

  // Rolar fecha: reposicionar a cada quadro seria pior que fechar, e o
  // menu preso no lugar errado é o defeito clássico do popover fixo.
  // Esc também fecha, e para ANTES do listener da lista — senão as setas
  // continuariam navegando a tabela atrás do menu aberto.
  useEffect(() => {
    if (!pos) return;
    const fecha = () => setPos(null);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setPos(null);
      }
    };
    window.addEventListener("scroll", fecha, true);
    window.addEventListener("resize", fecha);
    window.addEventListener("keydown", tecla, true);
    return () => {
      window.removeEventListener("scroll", fecha, true);
      window.removeEventListener("resize", fecha);
      window.removeEventListener("keydown", tecla, true);
    };
  }, [pos]);

  async function escolher(eventId: string, e: React.MouseEvent) {
    if (onStop) e.stopPropagation();
    setOcupado(true);
    const r = await vincularAoEvento(eventId, ids);
    setOcupado(false);
    if (r.error) {
      setErro(r.error);
      return;
    }
    setPos(null);
    onFeito?.();
    router.refresh();
  }

  return (
    <>
      <button
        ref={botaoRef}
        onClick={abrir}
        aria-haspopup="menu"
        aria-expanded={pos !== null}
        className="vela-btn-primario vela-foco flex items-center px-2.5"
        style={{
          ...botaoPrimario,
          height: altura,
          font: `600 ${altura >= 32 ? 12.5 : 12}px/1 ${T.ui}`,
        }}
      >
        {rotulo}
      </button>

      {pos && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              if (onStop) e.stopPropagation();
              setPos(null);
            }}
          />
          <div
            role="menu"
            onClick={(e) => onStop && e.stopPropagation()}
            className="fixed z-50 overflow-y-auto"
            style={{
              top: pos.top,
              left: pos.left,
              width: LARGURA,
              maxHeight: ALTURA_MAX,
              background: "var(--papel)",
              border: "1px solid var(--linha)",
              borderRadius: 10,
              boxShadow: "var(--shadow-md)",
              padding: 6,
            }}
          >
            <div style={{ ...rotuloColuna, padding: "6px 8px" }}>
              Vincular {ids.length > 1 ? `${ids.length} fornecedores` : ""} a
            </div>
            {falhouCarregar ? (
              <p className="px-2 py-2" style={{ fontSize: 12.5, color: "var(--cinza-3)" }}>
                Não deu para carregar os eventos. Feche e tente de novo.
              </p>
            ) : eventos === null ? (
              <p className="px-2 py-2" style={{ fontSize: 12.5, color: "var(--cinza)" }}>
                Carregando…
              </p>
            ) : eventos.length === 0 ? (
              <p className="px-2 py-2" style={{ fontSize: 12.5, color: "var(--cinza-3)" }}>
                Nenhum evento em aberto.
              </p>
            ) : (
              eventos.map((ev) => (
                <button
                  key={ev.id}
                  role="menuitem"
                  disabled={ocupado}
                  onClick={(e) => escolher(ev.id, e)}
                  className="vela-item-nav vela-foco flex w-full items-center gap-2 rounded-md px-2 py-2 text-left"
                  style={{
                    border: 0,
                    background: "transparent",
                    cursor: "pointer",
                    opacity: ocupado ? 0.5 : 1,
                  }}
                >
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{ fontSize: 12.5, color: "var(--tinta)" }}
                  >
                    {ev.label}
                  </span>
                  <span style={{ font: `400 11.5px/1 ${T.mono}`, color: "var(--cinza)" }}>
                    {ev.date.slice(8, 10)}/{ev.date.slice(5, 7)}/{ev.date.slice(2, 4)}
                  </span>
                </button>
              ))
            )}
            {erro && (
              <p className="px-2 py-1.5" style={{ fontSize: 12, color: "var(--state-late)" }}>
                {erro}
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}

/* ============================================================== PAINEL */

function PainelDetalhe({
  f,
  podeEscrever,
  onMudou,
}: {
  f: FornecedorLinha;
  podeEscrever: boolean;
  onMudou: () => void;
}) {
  const [recado, setRecado] = useState<string | null>(null);
  const wa = waLink(f.telefone);

  async function favoritar() {
    setRecado(null);
    const r = await marcarComoFavorito([f.id]);
    if (r.error) return setRecado(r.error);
    if ((r.alterados ?? 0) === 0) {
      return setRecado("Só fornecedor ativo vira favorito.");
    }
    onMudou();
  }

  async function desfavoritar() {
    setRecado(null);
    const r = await desmarcarFavorito(f.id);
    if (r.error) return setRecado(r.error);
    onMudou();
  }
  const meta = [
    f.categorias.length > 0 ? f.categorias.map(categoriaLabel).join(" · ") : null,
    f.cidade,
    f.ultimoUso ? `últ. uso ${mesAno(f.ultimoUso)}` : "nunca usado",
    f.status === "favorito" ? "favorito" : null,
    f.status === "bloqueado" ? "não contratar" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const dados: { k: string; v: string }[] = [
    { k: "CPF / CNPJ", v: f.cpf || "—" },
    { k: "Telefone", v: f.telefone || "—" },
    { k: "E-mail", v: f.email || "—" },
    { k: "Cidade", v: f.cidade || "—" },
    {
      k: "Faixa de preço",
      v: f.faixaPreco
        ? `${rotuloFaixa(f.faixaPreco)} · ${nivelFaixa(f.faixaPreco)}/3`
        : "não informada",
    },
    { k: "Contrato", v: f.semContrato ? "pendente em evento aberto" : "em dia" },
  ];

  return (
    <div className="flex flex-col gap-5 px-[22px] pb-6 pt-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          style={{
            width: 40,
            height: 40,
            flex: "none",
            borderRadius: 8,
            background: "var(--nevoa-2)",
            border: "1px solid var(--linha)",
          }}
        />
        <div className="min-w-0 flex-1">
          <p
            style={{
              margin: 0,
              font: `600 17px/1.25 ${T.titulo}`,
              letterSpacing: "-0.02em",
              color: "var(--tinta)",
            }}
          >
            {f.nome}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--cinza-3)" }}>
            {meta}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {podeEscrever && (
          <BotaoVincular
            ids={[f.id]}
            rotulo="Vincular a evento"
            altura={32}
            onFeito={onMudou}
          />
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="vela-btn-secundario vela-foco flex h-11 items-center px-3 sm:h-8"
            style={{ ...botaoSecundario, textDecoration: "none" }}
          >
            WhatsApp
          </a>
        )}
        <Link
          href={`/fornecedores/${f.id}`}
          className="vela-btn-secundario vela-foco flex h-11 items-center px-3 sm:h-8"
          style={{ ...botaoSecundario, textDecoration: "none" }}
        >
          Abrir ficha
        </Link>
        {podeEscrever &&
          (f.status === "favorito" ? (
            <button
              onClick={desfavoritar}
              className="vela-btn-secundario vela-foco h-11 px-3 sm:h-8"
              style={botaoSecundario}
            >
              Tirar dos favoritos
            </button>
          ) : (
            f.status === "ativo" && (
              <button
                onClick={favoritar}
                className="vela-btn-secundario vela-foco h-11 px-3 sm:h-8"
                style={botaoSecundario}
              >
                Favoritar
              </button>
            )
          ))}
      </div>
      {recado && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--cinza-3)" }}>{recado}</p>
      )}

      <div className="flex gap-2">
        <Metrica rotulo="Eventos" valor={String(f.eventos)} />
        <Metrica
          rotulo="Ticket médio"
          valor={f.ticketMedio === null ? "—" : formatCurrency(f.ticketMedio)}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div style={rotuloColuna}>Dados</div>
        <div className="flex flex-col gap-1.5">
          {dados.map((d) => (
            <div
              key={d.k}
              className="flex items-baseline gap-2.5 pb-1.5"
              style={{ borderBottom: "1px solid var(--linha)" }}
            >
              <span style={{ fontSize: 12.5, color: "var(--cinza-3)" }}>{d.k}</span>
              <span className="flex-1" />
              <span
                className="text-right"
                style={{ font: `400 12px/1.3 ${T.mono}`, color: "var(--text-body)" }}
              >
                {d.v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {f.historico.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline gap-2">
            <div style={rotuloColuna}>Histórico</div>
            <span className="flex-1" />
            <Link
              href={`/fornecedores/${f.id}`}
              className="vela-link vela-foco"
              style={{ fontSize: 12, color: "var(--cinza-3)", textDecoration: "none" }}
            >
              ver tudo
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            {f.historico.map((h) => {
              const tom = TOM_PAGAMENTO[h.estado];
              return (
                <div
                  key={h.eventId}
                  className="flex items-center gap-2.5 pb-1.5"
                  style={{ borderBottom: "1px solid var(--linha)" }}
                >
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{ fontSize: 12.5, color: "var(--text-body)" }}
                  >
                    {h.evento}
                  </span>
                  <span style={{ font: `400 11.5px/1 ${T.mono}`, color: "var(--cinza)" }}>
                    {mesAno(h.data)}
                  </span>
                  {/* a palavra vai junto da cor: estado nunca é só matiz */}
                  <span
                    style={{
                      font: `500 10.5px/1 ${T.mono}`,
                      borderRadius: 999,
                      padding: "4px 8px",
                      whiteSpace: "nowrap",
                      color: tom.fg,
                      background: tom.bg,
                    }}
                  >
                    {h.estado}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {f.totalGasto > 0 && (
        <div className="flex flex-col gap-2.5">
          <div style={rotuloColuna}>Valores</div>
          <div
            className="flex items-baseline gap-2.5 pb-1.5"
            style={{ borderBottom: "1px solid var(--linha)" }}
          >
            <span style={{ fontSize: 12.5, color: "var(--cinza-3)" }}>
              Total lançado
            </span>
            <span className="flex-1" />
            <span style={{ font: `400 12px/1.3 ${T.mono}`, color: "var(--text-body)" }}>
              {formatCurrency(f.totalGasto)}
            </span>
          </div>
        </div>
      )}

      {f.descricao && (
        <div className="flex flex-col gap-2">
          <div style={rotuloColuna}>Anotação</div>
          <p
            style={{
              margin: 0,
              background: "var(--papel)",
              border: "1px solid var(--linha)",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 12.5,
              lineHeight: 1.5,
              color: "var(--text-body)",
            }}
          >
            {f.descricao}
          </p>
        </div>
      )}

    </div>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div
      className="flex-1"
      style={{
        background: "var(--papel)",
        border: "1px solid var(--linha)",
        borderRadius: 14,
        padding: "11px 13px",
      }}
    >
      <div style={{ ...rotuloColuna, fontSize: 10 }}>{rotulo}</div>
      <div
        className="mt-1.5 whitespace-nowrap"
        style={{ font: `400 19px/1.1 ${T.mono}`, color: "var(--tinta)" }}
      >
        {valor}
      </div>
    </div>
  );
}
