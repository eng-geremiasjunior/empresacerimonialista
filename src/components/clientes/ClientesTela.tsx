"use client";

// A tela de Clientes — três colunas: visões, tabela e painel.
//
// Mesma arquitetura da tela de Fornecedores (o dono aprovou o padrão):
// a lista chega inteira do servidor e o filtro acontece AQUI, ao digitar,
// sem ida ao servidor. Clicar numa linha não navega — abre no painel.
//
// Cor só onde significa: pílula de evento futuro, estado do evento e o
// ponto âmbar de cliente frio. Nenhuma ameixa: cadastro é ação neutra.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  avisoDeFrios,
  contarRelacoes,
  contarVisoes,
  dataBr,
  dataCurta,
  estaFrio,
  filtrar,
  iniciais,
  linhaDeContexto,
  ORDEM_RELACOES,
  ORDEM_VISOES,
  RELACAO_LABELS,
  temFiltro,
  VISAO_LABELS,
  type ClienteLinha,
  type Filtros,
  type Relacao,
  type Visao,
  FILTROS_VAZIOS,
} from "@/lib/clientes-lista";
import { registrarContato } from "@/app/(app)/clientes/contato-actions";

const C = {
  tinta: "#221E1B",
  corpo: "#3D3835",
  cinza3: "#6B6259",
  cinza: "#928A81",
  cinza2: "#B4ADA4",
  linha: "#E6E0D8",
  linhaLeve: "#F0ECE6",
  marfim: "#FAF8F5",
  papel: "#FFFFFF",
  nevoa: "#F2EEE9",
  nevoaFunda: "#EDE8E2",
  ok: "#5E7355",
  okBg: "#E9EFE5",
  espera: "#A5813C",
  atraso: "#A5544B",
  atrasoBg: "#F6E4E1",
};

const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";

function whatsappHref(c: ClienteLinha): string | null {
  const bruto = c.whatsapp ?? c.telefone;
  if (!bruto) return null;
  const d = bruto.replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.length <= 11 ? "55" + d : d}`;
}

function brlCurto(v: number): string {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

const ESTADO_UI: Record<string, { fg: string; bg: string; label: string }> = {
  confirmado: { fg: C.ok, bg: C.okBg, label: "confirmado" },
  concluido: { fg: C.ok, bg: C.okBg, label: "concluído" },
  orcamento: { fg: C.cinza3, bg: C.nevoa, label: "orçamento" },
  cancelado: { fg: C.atraso, bg: C.atrasoBg, label: "cancelado" },
};

export function ClientesTela({ linhas }: { linhas: ClienteLinha[] }) {
  const router = useRouter();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [selId, setSelId] = useState<string | null>(linhas[0]?.id ?? null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [gaveta, setGaveta] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

  const visiveis = useMemo(() => filtrar(linhas, filtros), [linhas, filtros]);
  const contVisoes = useMemo(() => contarVisoes(linhas, filtros), [linhas, filtros]);
  const contRelacoes = useMemo(() => contarRelacoes(linhas, filtros), [linhas, filtros]);
  const aviso = useMemo(() => avisoDeFrios(linhas, filtros), [linhas, filtros]);

  // O filtro pode derrubar o selecionado: o painel passa a mostrar o
  // primeiro da lista, mas sem MEXER no estado durante o render.
  const sel = visiveis.find((c) => c.id === selId) ?? visiveis[0] ?? null;

  const mudar = useCallback((p: Partial<Filtros>) => {
    setFiltros((f) => ({ ...f, ...p }));
  }, []);

  // A seleção segue o que está À VISTA. Sem isto, marcar três, filtrar e
  // clicar em "Registrar contato" agia em quem sumiu da tela — a barra
  // dizia "3 selecionados" com uma linha visível.
  useEffect(() => {
    setMarcados((m) => {
      if (m.size === 0) return m;
      const visiveisIds = new Set(visiveis.map((c) => c.id));
      const podados = [...m].filter((id) => visiveisIds.has(id));
      return podados.length === m.size ? m : new Set(podados);
    });
  }, [visiveis]);

  // ⌘K foca a busca; ↑↓ percorrem a lista com o painel junto
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        buscaRef.current?.focus();
        return;
      }
      // Não sequestrar a tecla de quem está num controle: Enter num
      // botão focado por Tab abriria a ficha de um cliente arbitrário
      // junto com a ação do botão. Mesma guarda da tela de Fornecedores.
      const alvo = e.target as HTMLElement | null;
      const ocupado =
        alvo &&
        (alvo.tagName === "INPUT" ||
          alvo.tagName === "TEXTAREA" ||
          alvo.tagName === "BUTTON" ||
          alvo.tagName === "A" ||
          alvo.tagName === "SELECT" ||
          alvo.isContentEditable ||
          alvo.closest("[role=dialog],[role=menu],form"));
      if (ocupado) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (visiveis.length === 0) return;
        e.preventDefault();
        const i = visiveis.findIndex((c) => c.id === sel?.id);
        const prox =
          e.key === "ArrowDown"
            ? Math.min(visiveis.length - 1, i + 1)
            : Math.max(0, i - 1);
        setSelId(visiveis[prox].id);
      }
      if (e.key === "Enter" && sel) {
        router.push(`/clientes/${sel.id}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visiveis, sel, router]);

  function alternarMarcado(id: string) {
    setMarcados((m) => {
      const novo = new Set(m);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    // Altura FECHADA, não minHeight: sem height definida, o
    // overflow-y-auto da lista não tem de onde rolar e quem rola é o
    // documento inteiro — o cabeçalho de coluna "sticky" sai da tela junto.
    // Mesma medida da tela de Fornecedores.
    <div
      className="flex h-[calc(100dvh-8.5rem)] min-h-[540px] overflow-hidden"
      style={{ background: C.marfim, margin: "-1rem", fontFamily: "var(--font-ui, system-ui)" }}
    >
      {/* A barra do app come 256px + 64px de respiro. Com visões e painel
          juntos em 1280px sobram 396px para a tabela — menos que os 478px
          das colunas fixas, e a coluna NOME zerava. Visões entram em xl
          (1280) e o painel em 2xl (1536), como na tela de Fornecedores. */}
      <ColunaVisoes
        className="hidden w-[212px] flex-none xl:flex"
        filtros={filtros}
        contVisoes={contVisoes}
        contRelacoes={contRelacoes}
        onMudar={mudar}
      />

      <div className="flex min-w-0 flex-1 flex-col" style={{ borderRight: `1px solid ${C.linha}` }}>
        <Cabecalho
          total={linhas.length}
          filtros={filtros}
          visiveis={visiveis.length}
          buscaRef={buscaRef}
          onMudar={mudar}
          aviso={aviso}
        />
        <Tabela
          linhas={visiveis}
          selId={sel?.id ?? null}
          marcados={marcados}
          onSelecionar={(id) => {
            setSelId(id);
            setGaveta(true);
          }}
          onMarcar={alternarMarcado}
          temBusca={temFiltro(filtros)}
          onLimpar={() => setFiltros(FILTROS_VAZIOS)}
        />
        {marcados.size > 0 && (
          <BarraSelecao
            ids={[...marcados]}
            onLimpar={() => setMarcados(new Set())}
          />
        )}
      </div>

      {/* painel fixo a partir de 2xl */}
      <div className="hidden w-[352px] flex-none 2xl:flex">
        <Painel cliente={sel} />
      </div>

      {/* abaixo disso ele vira gaveta, aberta pelo clique na linha */}
      {gaveta && sel && (
        <div
          className="fixed inset-0 z-40 2xl:hidden"
          onClick={() => setGaveta(false)}
          style={{ background: "rgba(34,30,27,0.22)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-y-0 right-0 flex w-full max-w-[392px] overflow-y-auto"
            style={{ background: C.marfim, borderLeft: `1px solid ${C.linha}` }}
          >
            <div className="flex-1">
              <div className="flex justify-end px-4 pt-4">
                <button
                  type="button"
                  onClick={() => setGaveta(false)}
                  aria-label="Fechar"
                  className="flex h-11 w-11 items-center justify-center"
                  style={{ fontSize: 18, color: C.cinza3 }}
                >
                  ✕
                </button>
              </div>
              <Painel cliente={sel} naGaveta />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- coluna de visões ----------------

function ColunaVisoes({
  className,
  filtros,
  contVisoes,
  contRelacoes,
  onMudar,
}: {
  className?: string;
  filtros: Filtros;
  contVisoes: Record<Visao, number>;
  contRelacoes: Record<Relacao, number>;
  onMudar: (p: Partial<Filtros>) => void;
}) {
  return (
    <aside
      className={`flex-col gap-5 overflow-y-auto ${className ?? ""}`}
      style={{ padding: "20px 12px", borderRight: `1px solid ${C.linha}` }}
    >
      <Grupo titulo="Visões">
        {ORDEM_VISOES.map((v) => (
          <ItemLateral
            key={v}
            ativo={filtros.visao === v}
            label={VISAO_LABELS[v]}
            contagem={contVisoes[v]}
            onClick={() => onMudar({ visao: v })}
          />
        ))}
      </Grupo>

      <Grupo titulo="Relação">
        {ORDEM_RELACOES.map((r) => (
          <ItemLateral
            key={r}
            ativo={filtros.relacao === r}
            label={RELACAO_LABELS[r]}
            contagem={contRelacoes[r]}
            onClick={() => onMudar({ relacao: filtros.relacao === r ? null : r })}
          />
        ))}
      </Grupo>

      <p style={{ fontSize: 11.5, lineHeight: 1.5, color: C.cinza2 }}>
        A relação vem dos eventos: quem tem data marcada é <em>ativo</em>, quem
        já fez dois é <em>recorrente</em>.
      </p>
    </aside>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: C.cinza,
          marginBottom: 8,
          paddingLeft: 8,
        }}
      >
        {titulo}
      </p>
      <div className="flex flex-col" style={{ gap: 1 }}>{children}</div>
    </div>
  );
}

function ItemLateral({
  ativo,
  label,
  contagem,
  onClick,
}: {
  ativo: boolean;
  label: string;
  contagem: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-md transition-colors"
      style={{
        height: 30,
        padding: "0 8px",
        background: ativo ? C.nevoaFunda : "transparent",
        color: ativo ? C.tinta : C.cinza3,
        fontSize: 13,
        fontWeight: ativo ? 600 : 400,
      }}
    >
      <span className="truncate">{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color: C.cinza }}>
        {contagem}
      </span>
    </button>
  );
}

// ---------------- cabeçalho ----------------

function Cabecalho({
  total,
  visiveis,
  filtros,
  buscaRef,
  onMudar,
  aviso,
}: {
  total: number;
  visiveis: number;
  filtros: Filtros;
  buscaRef: React.RefObject<HTMLInputElement>;
  onMudar: (p: Partial<Filtros>) => void;
  aviso: { texto: string; quantos: number } | null;
}) {
  return (
    <div style={{ padding: 24, borderBottom: `1px solid ${C.linha}` }}>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: C.tinta }}>
            Clientes
          </h1>
          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, color: C.cinza }}>
            {total} no cadastro
          </span>
        </div>
        <Link
          href="/clientes/novo"
          className="flex items-center rounded-lg transition-colors hover:bg-black"
          style={{ height: 32, padding: "0 14px", background: C.tinta, color: C.marfim, fontSize: 13, fontWeight: 600 }}
        >
          + Novo cliente
        </Link>
      </div>

      <input
        ref={buscaRef}
        type="search"
        value={filtros.q}
        onChange={(e) => onMudar({ q: e.target.value })}
        placeholder="Buscar por nome, telefone, e-mail ou evento…"
        className="w-full rounded-[10px] outline-none transition-colors focus:border-[#221E1B]"
        style={{ height: 40, padding: "0 14px", border: `1px solid ${C.cinza2}`, background: C.papel, fontSize: 14, color: C.tinta }}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span style={{ fontSize: 12.5, color: C.corpo }}>
          {linhaDeContexto(visiveis, filtros)}
          {temFiltro(filtros) && (
            <button
              type="button"
              onClick={() => onMudar(FILTROS_VAZIOS)}
              className="ml-2 underline"
              style={{ color: C.tinta, textUnderlineOffset: 2 }}
            >
              limpar
            </button>
          )}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color: C.cinza2 }}>
          ↑↓ navegar · enter abrir
        </span>
      </div>

      {aviso && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px]"
          style={{ background: C.nevoa, padding: "10px 13px", fontSize: 12.5, color: C.corpo }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: C.espera, flexShrink: 0 }} />
          {aviso.texto}
          <button
            type="button"
            onClick={() => onMudar({ visao: "sem_contato" })}
            style={{ color: C.tinta, fontWeight: 600 }}
          >
            Revisar
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------- tabela ----------------

function Tabela({
  linhas,
  selId,
  marcados,
  onSelecionar,
  onMarcar,
  temBusca,
  onLimpar,
}: {
  linhas: ClienteLinha[];
  selId: string | null;
  marcados: Set<string>;
  onSelecionar: (id: string) => void;
  onMarcar: (id: string) => void;
  temBusca: boolean;
  onLimpar: () => void;
}) {
  const algumMarcado = marcados.size > 0;

  if (linhas.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <p style={{ fontSize: 15, fontWeight: 600, color: C.tinta }}>
          Nenhum cliente com esses filtros
        </p>
        <p style={{ fontSize: 12.5, color: C.cinza3 }}>
          {temBusca
            ? "Tente outro termo ou limpe os filtros."
            : "Cadastre a primeira cliente para começar."}
        </p>
        {temBusca && (
          <button
            type="button"
            onClick={onLimpar}
            className="rounded-lg"
            style={{ height: 32, padding: "0 14px", border: `1px solid ${C.cinza2}`, background: C.papel, fontSize: 12.5, color: C.tinta }}
          >
            Limpar busca
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-6"
        style={{ height: 30, background: C.marfim, borderBottom: `1px solid ${C.linha}`, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.cinza }}
      >
        <span className="min-w-0 flex-1">Nome</span>
        <span className="hidden sm:block" style={{ width: 112 }}>Contato</span>
        <span style={{ width: 104 }}>Eventos</span>
        <span className="hidden md:block" style={{ width: 92 }}>Últ. contato</span>
        <span className="hidden md:block" style={{ width: 74 }}>Relação</span>
      </div>

      {linhas.map((c) => (
        <LinhaCliente
          key={c.id}
          c={c}
          selecionada={c.id === selId}
          marcada={marcados.has(c.id)}
          mostrarCheckbox={algumMarcado}
          onSelecionar={() => onSelecionar(c.id)}
          onMarcar={() => onMarcar(c.id)}
        />
      ))}
    </div>
  );
}

function LinhaCliente({
  c,
  selecionada,
  marcada,
  mostrarCheckbox,
  onSelecionar,
  onMarcar,
}: {
  c: ClienteLinha;
  selecionada: boolean;
  marcada: boolean;
  mostrarCheckbox: boolean;
  onSelecionar: () => void;
  onMarcar: () => void;
}) {
  const [hover, setHover] = useState(false);
  const wa = whatsappHref(c);
  const frio = estaFrio(c);
  const caixa = mostrarCheckbox || hover;

  return (
    <div
      onClick={onSelecionar}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative flex cursor-pointer items-center gap-3 px-6 transition-colors"
      style={{
        height: 44,
        borderBottom: `1px solid ${C.linhaLeve}`,
        background: selecionada || hover ? C.nevoa : "transparent",
        boxShadow: selecionada ? `inset 2px 0 0 ${C.tinta}` : undefined,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-[9px]">
        {caixa ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarcar();
            }}
            aria-label={marcada ? "Desmarcar" : "Marcar"}
            className="flex shrink-0 items-center justify-center rounded-md"
            style={{
              width: 22,
              height: 22,
              border: marcada ? "none" : `1px solid ${C.cinza2}`,
              background: marcada ? C.tinta : C.papel,
            }}
          >
            {marcada && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.marfim} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ) : (
          <span
            className="flex shrink-0 items-center justify-center rounded-md"
            style={{ width: 22, height: 22, background: C.nevoaFunda, border: `1px solid ${C.linha}`, fontSize: 9.5, fontWeight: 600, color: C.cinza3 }}
          >
            {iniciais(c.nome)}
          </span>
        )}
        <span className="truncate" style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.02em", color: C.tinta }}>
          {c.nome}
        </span>
      </div>

      <span className="hidden truncate sm:block" style={{ width: 112, fontFamily: MONO, fontSize: 12.5, color: C.corpo }}>
        {c.telefone ?? c.whatsapp ?? "—"}
      </span>

      <span className="flex items-center gap-1.5" style={{ width: 104 }}>
        {c.futuros > 0 && (
          <span style={{ borderRadius: 999, background: C.okBg, color: C.ok, fontFamily: MONO, fontSize: 10.5, fontWeight: 500, padding: "2px 7px" }}>
            {c.futuros} futuro{c.futuros > 1 ? "s" : ""}
          </span>
        )}
        {c.realizados > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.cinza }}>
            {c.realizados} realizado{c.realizados > 1 ? "s" : ""}
          </span>
        )}
        {c.futuros === 0 && c.realizados === 0 && (
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.cinza2 }}>—</span>
        )}
      </span>

      <span className="hidden items-center gap-1.5 md:flex" style={{ width: 92 }}>
        {/* transparente quando em dia: a coluna não muda de largura */}
        <span style={{ width: 5, height: 5, borderRadius: 999, background: frio ? C.espera : "transparent", flexShrink: 0 }} />
        <span style={{ fontFamily: MONO, fontSize: 12.5, color: C.cinza }}>
          {dataCurta(c.ultimoContato, new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }))}
        </span>
      </span>

      <span className="hidden truncate md:block" style={{ width: 74, fontSize: 12.5, color: C.cinza3 }}>
        {RELACAO_LABELS[c.relacao]}
      </span>

      {hover && wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-6 flex items-center rounded-lg transition-colors"
          style={{ height: 26, padding: "0 10px", border: `1px solid ${C.cinza2}`, background: C.papel, fontSize: 12, fontWeight: 500, color: C.tinta }}
        >
          WhatsApp
        </a>
      )}
    </div>
  );
}

// ---------------- barra de seleção ----------------

function BarraSelecao({ ids, onLimpar }: { ids: string[]; onLimpar: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function registrar() {
    setOcupado(true);
    setErro(null);
    const r = await registrarContato(ids, "outro", null);
    setOcupado(false);
    if (r.error) setErro(r.error);
    else onLimpar();
  }

  return (
    <div
      className="flex flex-wrap items-center gap-3 px-6"
      style={{ minHeight: 52, background: C.papel, borderTop: `1px solid ${C.linha}` }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 600, color: C.tinta }}>
        {ids.length} selecionado{ids.length > 1 ? "s" : ""}
      </span>
      <button
        type="button"
        onClick={registrar}
        disabled={ocupado}
        className="rounded-lg transition-colors disabled:opacity-50"
        style={{ height: 30, padding: "0 12px", background: C.tinta, color: C.marfim, fontSize: 12.5, fontWeight: 600 }}
      >
        {ocupado ? "Registrando…" : "Registrar contato"}
      </button>
      <a
        href={`/api/clientes-export?ids=${ids.join(",")}`}
        className="rounded-lg"
        style={{ height: 30, lineHeight: "30px", padding: "0 12px", border: `1px solid ${C.cinza2}`, background: C.papel, fontSize: 12.5, fontWeight: 500, color: C.tinta }}
      >
        Exportar
      </a>
      <button type="button" onClick={onLimpar} className="underline" style={{ fontSize: 12.5, color: C.tinta, textUnderlineOffset: 2 }}>
        limpar seleção
      </button>
      {erro && <span style={{ fontSize: 12, color: C.atraso }}>{erro}</span>}
    </div>
  );
}

// ---------------- painel de detalhe ----------------

function Painel({
  cliente,
  naGaveta,
}: {
  cliente: ClienteLinha | null;
  naGaveta?: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!cliente) {
    return (
      <aside className="w-full" style={{ borderLeft: naGaveta ? "none" : `1px solid ${C.linha}`, padding: 24 }}>
        <p style={{ fontSize: 12.5, color: C.cinza3 }}>Selecione um cliente.</p>
      </aside>
    );
  }

  const c = cliente;
  const wa = whatsappHref(c);
  // A consulta vem em data DESC, então .find() pegava o evento futuro
  // MAIS DISTANTE. O que importa no cabeçalho é o próximo a acontecer.
  const proximo = c.eventos
    .filter((e) => (e.status === "confirmado" || e.status === "orcamento") && e.data)
    .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""))[0];
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  async function registrar() {
    setOcupado(true);
    setErro(null);
    const r = await registrarContato([c.id], "outro", null);
    setOcupado(false);
    if (r.error) setErro(r.error);
    else router.refresh();
  }

  return (
    <aside
      className="flex w-full flex-col gap-5 overflow-y-auto"
      style={{ borderLeft: naGaveta ? "none" : `1px solid ${C.linha}`, padding: "24px 22px" }}
    >
      <div className="flex items-center gap-[11px]">
        <span
          className="flex shrink-0 items-center justify-center rounded-lg"
          style={{ width: 40, height: 40, background: C.nevoaFunda, border: `1px solid ${C.linha}`, fontSize: 13, fontWeight: 600, color: C.cinza3 }}
        >
          {iniciais(c.nome)}
        </span>
        <div className="min-w-0">
          <p className="truncate" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: C.tinta }}>
            {c.nome}
          </p>
          <p style={{ fontSize: 12.5, color: C.cinza3 }}>
            {RELACAO_LABELS[c.relacao]}
            {proximo?.data ? ` · ${dataBr(proximo.data)}` : ""}
            {` · ${dataCurta(c.ultimoContato, hoje)}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/eventos/novo?cliente=${c.id}`}
          className="flex items-center rounded-lg transition-colors hover:bg-black"
          style={{ height: 32, padding: "0 12px", background: C.tinta, color: C.marfim, fontSize: 12.5, fontWeight: 600 }}
        >
          Novo evento
        </Link>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center rounded-lg"
            style={{ height: 32, padding: "0 12px", border: `1px solid ${C.cinza2}`, background: C.papel, fontSize: 12.5, fontWeight: 500, color: C.tinta }}
          >
            WhatsApp
          </a>
        )}
        <Link
          href={`/clientes/${c.id}`}
          className="flex items-center rounded-lg"
          style={{ height: 32, padding: "0 12px", border: `1px solid ${C.cinza2}`, background: C.papel, fontSize: 12.5, fontWeight: 500, color: C.tinta }}
        >
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metrica rotulo="Eventos" valor={String(c.eventos.length)} />
        <Metrica rotulo="Contratado" valor={c.contratado > 0 ? brlCurto(c.contratado) : "—"} />
      </div>

      <Bloco titulo="Contato">
        <Dado rotulo="Telefone" valor={c.telefone} mono />
        <Dado rotulo="WhatsApp" valor={c.whatsapp} mono />
        <Dado rotulo="E-mail" valor={c.email} mono />
        <Dado rotulo="Cidade" valor={c.cidade} />
      </Bloco>

      <Bloco titulo="Eventos">
        {c.eventos.length === 0 ? (
          <p style={{ fontSize: 12.5, color: C.cinza3 }}>Nenhum evento registrado.</p>
        ) : (
          c.eventos.slice(0, 4).map((e) => {
            const ui = ESTADO_UI[e.status] ?? { fg: C.cinza3, bg: C.nevoa, label: e.status };
            return (
              <Link
                key={e.id}
                href={`/eventos/${e.id}`}
                className="flex items-center justify-between gap-2"
                style={{ padding: "7px 0", borderBottom: `1px solid ${C.linhaLeve}` }}
              >
                <span className="min-w-0 flex-1 truncate" style={{ fontSize: 12.5, color: C.corpo }}>
                  {e.nome ?? "Evento"}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.cinza }}>{dataBr(e.data)}</span>
                <span style={{ borderRadius: 999, background: ui.bg, color: ui.fg, fontFamily: MONO, fontSize: 10.5, fontWeight: 500, padding: "2px 7px" }}>
                  {ui.label}
                </span>
              </Link>
            );
          })
        )}
      </Bloco>

      <Bloco titulo="Conversas">
        {c.contatos.length === 0 ? (
          <p style={{ fontSize: 12.5, color: C.cinza3 }}>Nenhum contato registrado.</p>
        ) : (
          c.contatos.slice(0, 4).map((ct, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2" style={{ padding: "6px 0", borderBottom: `1px solid ${C.linhaLeve}` }}>
              <span style={{ fontSize: 12.5, color: C.corpo }}>{ct.nota ?? ct.canal}</span>
              <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.cinza, flexShrink: 0 }}>{dataBr(ct.em)}</span>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={registrar}
          disabled={ocupado}
          className="mt-2 rounded-lg disabled:opacity-50"
          style={{ height: 32, padding: "0 12px", border: `1px solid ${C.cinza2}`, background: C.papel, fontSize: 12.5, fontWeight: 500, color: C.tinta }}
        >
          {ocupado ? "Registrando…" : "Registrar contato"}
        </button>
        {erro && <p className="mt-1" style={{ fontSize: 12, color: C.atraso }}>{erro}</p>}
      </Bloco>

      {c.anotacao && (
        <Bloco titulo="Anotação">
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: C.corpo, whiteSpace: "pre-wrap" }}>
            {c.anotacao}
          </p>
        </Bloco>
      )}
    </aside>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-[14px]" style={{ background: C.papel, border: `1px solid ${C.linha}`, padding: "11px 13px" }}>
      <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.cinza }}>
        {rotulo}
      </p>
      <p style={{ fontFamily: MONO, fontSize: 19, lineHeight: 1.1, color: C.tinta, marginTop: 4 }}>{valor}</p>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: C.cinza, marginBottom: 9 }}>
        {titulo}
      </p>
      {children}
    </div>
  );
}

function Dado({ rotulo, valor, mono }: { rotulo: string; valor: string | null; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3" style={{ padding: "6px 0", borderBottom: `1px solid ${C.linhaLeve}` }}>
      <span style={{ fontSize: 12.5, color: C.cinza3 }}>{rotulo}</span>
      <span
        className="truncate"
        style={{ fontFamily: mono ? MONO : undefined, fontSize: 12, color: valor ? C.corpo : C.cinza2 }}
      >
        {valor ?? "—"}
      </span>
    </div>
  );
}
