"use client";

// Tela de Planejamento (4B/5A) — adaptação funcional ao modelo de campos
// tipados (a UI final vem depois, no redesign).
//
// Duas camadas: a FILA das 3 decisões mais críticas no topo (o que fazer
// agora) e o MAPA temporal por objetivo abaixo (o todo, nunca escondido).
// A decisão abre em PAINEL LATERAL — e ela é um FORMULÁRIO: os campos
// vazios são o roteiro de conversa com os noivos (o antigo guia virou isto).

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, X } from "lucide-react";
import type {
  Bucket,
  Campo,
  Decisao,
  EstadoDecisao,
  Objetivo,
  Planejamento,
  Responsavel,
} from "@/lib/supabase/planejamento";
import {
  decidirDecisao,
  definirDataEvento,
  marcarNaoSeAplica,
  reabrirDecisao,
  salvarCampo,
  salvarValorPrevisto,
  sugerirDistribuicao,
} from "@/app/(app)/eventos/[id]/planejamento/actions";

const ACENTO = "oklch(0.5 0.14 285)";
const ACENTO_FRACO = "oklch(0.95 0.03 285)";

const RESP_LABEL: Record<Responsavel, string> = {
  noivos: "Noivos",
  cerimonialista: "Cerimonialista",
  ambos: "Ambos",
};

const BUCKET_LABEL: Record<Bucket, string> = {
  agora: "Agora",
  proximas: "Próximas",
  depois: "Depois",
};

const mono = "font-mono text-[11px] uppercase tracking-[0.12em]";

type SupplierOpcao = { id: string; name: string };

// O valor canônico do campo, pelo tipo (espelho client-safe do data lib —
// que é server-only por importar o client de servidor).
function valorCampo(c: Campo): string | number | boolean | null {
  switch (c.tipo) {
    case "numero":
    case "moeda":
      return c.valorNumero;
    case "sim_nao":
      return c.valorBool;
    case "data":
      return c.valorData;
    case "escolha":
      return c.valorOpcao;
    case "fornecedor":
      return c.valorSupplierId;
    default:
      return c.valorTexto;
  }
}

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function opcaoLabel(v: string): string {
  return v.replaceAll("_", " ");
}

function faltamTexto(dias: number | null): string {
  if (dias === null) return "sem data";
  if (dias < 0) return `${Math.abs(dias)} dias atrás`;
  if (dias === 0) return "é hoje";
  return `faltam ${dias} dias`;
}

// Prazo recalculado (4D) em linguagem de tempo. Recebe a data já comprimida
// ao prazo do casal (prazo_previsto), não o offset cru do método.
function prazoPrevistoTexto(iso: string | null): string {
  if (!iso) return "sem prazo definido";
  const alvo = new Date(`${iso}T00:00:00`).getTime();
  const hoje = new Date(new Date().toDateString()).getTime();
  const dias = Math.round((alvo - hoje) / 86_400_000);
  if (dias <= 0) return "decidir agora";
  if (dias === 1) return "decidir até amanhã";
  if (dias <= 45) return `decidir em ${dias} dias`;
  const [a, m, d] = iso.split("-");
  return `decidir até ${d}/${m}/${a.slice(2)}`;
}

export function PlanejamentoEvento({
  eventId,
  inicial,
  suppliers,
  decisaoInicial,
}: {
  eventId: string;
  inicial: Planejamento;
  suppliers: SupplierOpcao[];
  // deep-link vindo da Organização ("ver decisão ↗" na origem da tarefa)
  decisaoInicial?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [aberta, setAberta] = useState<string | null>(decisaoInicial ?? null);

  const plano = inicial;

  // Override otimista de estado: o clique reflete na hora; o servidor
  // sincroniza em segundo plano. (Campos salvam no blur — sem override.)
  const [estadoOverride, setEstadoOverride] = useState<
    Record<string, EstadoDecisao>
  >({});

  const objetivosView: Objetivo[] = useMemo(
    () =>
      plano.objetivos.map((o) => ({
        ...o,
        decisoes: o.decisoes.map((d) => ({
          ...d,
          estado: estadoOverride[d.id] ?? d.estado,
        })),
      })),
    [plano.objetivos, estadoOverride]
  );

  const decisaoAberta = useMemo(() => {
    if (!aberta) return null;
    for (const o of objetivosView) {
      const d = o.decisoes.find((x) => x.id === aberta);
      if (d) return { objetivo: o, decisao: d };
    }
    return null;
  }, [aberta, objetivosView]);

  function agir(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  // Decisão: marca o estado na hora e refetta em segundo plano (muda fila,
  // buckets e tarefas geradas).
  function mudarEstado(
    decisaoId: string,
    novo: EstadoDecisao,
    fn: () => Promise<unknown>
  ) {
    setEstadoOverride((m) => ({ ...m, [decisaoId]: novo }));
    agir(fn);
  }

  if (!plano.temArvore) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Este evento não tem o método instanciado. Ele é criado automaticamente
        para casamentos novos; eventos anteriores à configuração do método não
        têm a árvore.
      </div>
    );
  }

  const grupos: { bucket: Bucket; objetivos: Objetivo[] }[] = (
    ["agora", "proximas", "depois"] as Bucket[]
  )
    .map((b) => ({
      bucket: b,
      objetivos: objetivosView.filter((o) => o.ativo && o.bucket === b),
    }))
    .filter((g) => g.objetivos.length > 0);

  const desligados = objetivosView.filter(
    (o) =>
      !o.ativo ||
      (o.decisoes.length > 0 &&
        o.decisoes.every((d) => d.estado === "nao_se_aplica"))
  );

  return (
    <div className="planejamento flex gap-0" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <style>{`
        .planejamento .mono{font-family:'IBM Plex Mono',ui-monospace,monospace}
      `}</style>

      {/* coluna principal */}
      <div className="min-w-0 flex-1 pr-0">
        {/* título + progresso ponderado */}
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#1b1b19]">
              Planejamento
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[#5f5f5b]">
              Construindo o projeto do casamento — nada existe fisicamente ainda.
            </p>
          </div>
          <div className="w-[190px] shrink-0">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className={`mono ${mono}`} style={{ color: "#5f5f5b" }}>
                Progresso
              </span>
              <span className="mono text-[12px] font-semibold text-[#2a2a27]">
                {plano.progressoPct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-[#eaeae7]">
              <div
                className="h-full rounded"
                style={{ width: `${plano.progressoPct}%`, background: "linear-gradient(90deg,oklch(0.58 0.06 150),oklch(0.62 0.07 155))" }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] uppercase tracking-wide text-[#6b6b66]">
              ponderado por importância
            </p>
          </div>
        </div>

        {/* DATA FALTANDO — sem data, prazos/compressão/timeline são nulos.
            É a primeira ação operacional; resolve aqui em um passo. */}
        {!plano.dataEvento && (
          <BannerData eventId={eventId} onAgir={agir} />
        )}

        {/* TERMÔMETRO DA VERBA (5C) — só o macro; o detalhe fica na
            Organização. A sugestão é por botão, nunca automática. */}
        <TermometroVerba
          eventId={eventId}
          plano={plano}
          pending={pending}
          onAgir={agir}
        />

        {/* FILA INTELIGENTE */}
        {plano.criticas.length > 0 && (
          <section className="mb-6 rounded-xl border border-[#e6e6e3] bg-[#f7f7f5] p-4">
            <p className="mb-3 text-[13px] font-semibold text-[#2a2a27]">
              {plano.criticas.length} decisões pedem atenção primeiro
            </p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {plano.criticas.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => setAberta(d.id)}
                  className="flex flex-col rounded-[10px] border border-[#e0e0dd] bg-white p-3 text-left transition-colors hover:border-[#cfcfca]"
                >
                  <span className={`mono ${mono}`} style={{ color: "#6b6b66" }}>
                    {d.objetivoNome}
                  </span>
                  <span className="mt-1 text-[14px] font-semibold text-[#1b1b19]">
                    {d.titulo}
                  </span>
                  <span className="mt-1.5 text-[11.5px] text-[#5f5f5b]">
                    {prazoPrevistoTexto(d.prazoPrevisto)}
                  </span>
                  <span
                    className="mt-2.5 inline-flex w-fit items-center gap-1 rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium text-white"
                    style={{ background: i === 0 ? ACENTO : "transparent", color: i === 0 ? "#fff" : ACENTO, border: i === 0 ? "none" : `1px solid ${ACENTO}` }}
                  >
                    {i === 0 ? "Resolver agora" : "Abrir"}
                  </span>
                </button>
              ))}
            </div>
            {plano.ritmoApertado && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                Ritmo intenso — casal contratou com pouco tempo, método
                comprimido. São cerca de {plano.densidadeMensal} decisões por
                mês; resolva primeiro as do topo da fila.
              </div>
            )}
          </section>
        )}

        {/* MAPA DA JORNADA */}
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold text-[#2a2a27]">
            Mapa da jornada
          </h3>
          <span className="mono text-[11px] text-[#5f5f5b]">
            {faltamTexto(plano.diasAteEvento)}
          </span>
        </div>

        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.bucket}>
              <p className={`mono ${mono} mb-2`} style={{ color: "#6b6b66" }}>
                {BUCKET_LABEL[g.bucket]}
              </p>
              <div className="space-y-2">
                {g.objetivos.map((o) => (
                  <ObjetivoCard
                    key={o.id}
                    eventId={eventId}
                    objetivo={o}
                    aberta={aberta}
                    pending={pending}
                    onAbrir={setAberta}
                    onAgir={agir}
                  />
                ))}
              </div>
            </div>
          ))}

          {desligados.length > 0 && (
            <div>
              <p className={`mono ${mono} mb-2`} style={{ color: "#c0c0bb" }}>
                Não se aplica
              </p>
              <div className="space-y-1.5">
                {desligados.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-lg border border-dashed border-[#e6e6e3] bg-transparent px-3 py-2 pl-6"
                  >
                    <span className="text-[13px] text-[#6b6b66] line-through">
                      {o.nome}
                    </span>
                    <button
                      onClick={() =>
                        agir(() =>
                          Promise.all(
                            o.decisoes
                              .filter((d) => d.estado === "nao_se_aplica")
                              .map((d) => reabrirDecisao(eventId, d.id))
                          )
                        )
                      }
                      disabled={pending}
                      className="mono text-[11px] uppercase tracking-wide text-[#5f5f5b] hover:text-[#2a2a27]"
                    >
                      reativar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PAINEL LATERAL da decisão */}
      {decisaoAberta && (
        <PainelDecisao
          eventId={eventId}
          objetivoNome={decisaoAberta.objetivo.nome}
          decisao={decisaoAberta.decisao}
          dataEvento={plano.dataEvento}
          suppliers={suppliers}
          pending={pending}
          onFechar={() => setAberta(null)}
          onAgir={agir}
          onEstado={mudarEstado}
        />
      )}
    </div>
  );
}

function BannerData({
  eventId,
  onAgir,
}: {
  eventId: string;
  onAgir: (fn: () => Promise<unknown>) => void;
}) {
  const [data, setData] = useState("");
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-amber-900">
          Defina a data do casamento
        </p>
        <p className="text-[12.5px] text-amber-800">
          Sem data, prazos, compressão e agenda ficam sem referência. É a
          primeira coisa a resolver.
        </p>
      </div>
      <input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-[14px] text-[#1b1b19] outline-none"
      />
      <button
        onClick={() => data && onAgir(() => definirDataEvento(eventId, data))}
        disabled={!data}
        className="rounded-lg bg-amber-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
      >
        Definir data
      </button>
    </div>
  );
}

// Verba / comprometido / saldo + sugerir distribuição (5C).
function TermometroVerba({
  eventId,
  plano,
  pending,
  onAgir,
}: {
  eventId: string;
  plano: Planejamento;
  pending: boolean;
  onAgir: (fn: () => Promise<unknown>) => void;
}) {
  const v = plano.verba;
  const [erro, setErro] = useState<string | null>(null);

  function sugerir() {
    setErro(null);
    onAgir(async () => {
      const r = await sugerirDistribuicao(eventId);
      if (r && "error" in r) setErro(r.error);
    });
  }

  // Sem verba definida ainda: uma linha discreta apontando o caminho.
  if (v.total === null) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-xl border border-[#e6e6e3] bg-white px-4 py-3">
        <p className="text-[12.5px] text-[#5f5f5b]">
          Verba ainda não levantada — preencha em{" "}
          <span className="font-medium text-[#2a2a27]">Levantar o budget</span>{" "}
          para acompanhar comprometido e saldo.
        </p>
      </div>
    );
  }

  const estourou = v.saldo !== null && v.saldo < 0;

  return (
    <div className="mb-6 rounded-xl border border-[#e6e6e3] bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <p className={`mono ${mono}`} style={{ color: "#6b6b66" }}>Verba</p>
          <p className="mono text-[15px] font-semibold text-[#1b1b19]">
            {fmtBRL(v.total)}
          </p>
        </div>
        <div>
          <p className={`mono ${mono}`} style={{ color: "#6b6b66" }}>
            Comprometido
          </p>
          <p className="mono text-[15px] font-semibold text-[#1b1b19]">
            {fmtBRL(v.comprometido)}
          </p>
        </div>
        {v.reservaPct !== null && (
          <div>
            <p className={`mono ${mono}`} style={{ color: "#6b6b66" }}>
              Reserva ({v.reservaPct}%)
            </p>
            <p className="mono text-[15px] font-semibold text-[#1b1b19]">
              {fmtBRL(v.reservaValor)}
            </p>
          </div>
        )}
        <div>
          <p className={`mono ${mono}`} style={{ color: "#6b6b66" }}>Saldo</p>
          <p
            className="mono text-[15px] font-semibold"
            style={{ color: estourou ? "#A5544B" : "#2e7d46" }}
          >
            {v.saldo !== null ? fmtBRL(v.saldo) : "—"}
          </p>
        </div>
        <div className="ml-auto">
          <button
            onClick={sugerir}
            disabled={pending}
            className="rounded-[7px] border border-[#d0d0cb] px-3 py-1.5 text-[12.5px] font-medium text-[#3a3a37] hover:bg-[#f2f2ef] disabled:opacity-50"
          >
            Sugerir distribuição
          </button>
        </div>
      </div>
      {/* barra: comprometido sobre a verba */}
      <div className="mt-3 h-1.5 overflow-hidden rounded bg-[#eaeae7]">
        <div
          className="h-full rounded"
          style={{
            width: `${Math.min(100, Math.round((v.comprometido / v.total) * 100))}%`,
            background: estourou ? "#A5544B" : ACENTO,
          }}
        />
      </div>
      {v.distribuicaoDesatualizada && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-[12px] text-amber-800">
            O cenário mudou — a distribuição ficou desatualizada em relação às
            faixas atuais.
          </p>
          <button
            onClick={sugerir}
            disabled={pending}
            className="shrink-0 rounded-md border border-amber-300 px-2.5 py-1 text-[12px] font-medium text-amber-900 hover:bg-amber-100"
          >
            Re-sugerir
          </button>
        </div>
      )}
      {erro && <p className="mt-2 text-[12px] text-[#A5544B]">{erro}</p>}
    </div>
  );
}

function ObjetivoCard({
  eventId,
  objetivo,
  aberta,
  pending,
  onAbrir,
  onAgir,
}: {
  eventId: string;
  objetivo: Objetivo;
  aberta: string | null;
  pending: boolean;
  onAbrir: (id: string) => void;
  onAgir: (fn: () => Promise<unknown>) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [editandoValor, setEditandoValor] = useState(false);
  const [valor, setValor] = useState(
    objetivo.valorPrevisto !== null ? String(objetivo.valorPrevisto) : ""
  );

  const temOrcamento =
    objetivo.faixaPctIdeal !== null || objetivo.valorPrevisto !== null;

  function salvarValor() {
    setEditandoValor(false);
    const n = valor === "" ? null : Number(valor);
    if (n === (objetivo.valorPrevisto ?? null)) return;
    onAgir(() => salvarValorPrevisto(eventId, objetivo.id, n));
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e6e6e3] bg-white">
      <button
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        <ChevronRight
          size={15}
          className={`shrink-0 text-[#6b6b66] transition-transform ${expandido ? "rotate-90" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#1b1b19]">
            {objetivo.nome}
          </p>
          <p className="text-[11.5px] text-[#5f5f5b]">
            Objetivo · {faltamTexto(objetivo.faltamDias)} ·{" "}
            {RESP_LABEL[objetivo.responsavelDominante]}
          </p>
        </div>
        {objetivo.valorPrevisto !== null && (
          <span className="mono shrink-0 text-[11px] text-[#5f5f5b]">
            {fmtBRL(Number(objetivo.valorPrevisto))}
          </span>
        )}
        <span className="mono shrink-0 text-[11px] text-[#5f5f5b]">
          decisões {objetivo.decididas}/{objetivo.aplicaveis}
        </span>
      </button>

      {expandido && (
        <div className="border-t border-[#f0f0ee] px-3.5 py-2">
          {/* Alocação do objetivo (categoria de orçamento) — editável. */}
          {temOrcamento && (
            <div className="mb-1 flex items-center gap-2 rounded-md bg-[#f7f7f5] px-2 py-1.5">
              <span className={`mono ${mono}`} style={{ color: "#6b6b66" }}>
                Previsto
              </span>
              {editandoValor ? (
                <input
                  autoFocus
                  type="number"
                  min={0}
                  step={100}
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  onBlur={salvarValor}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  disabled={pending}
                  className="mono w-[120px] rounded border border-[#c8c8c3] bg-white px-2 py-0.5 text-[12px] outline-none"
                />
              ) : (
                <button
                  onClick={() => {
                    setValor(
                      objetivo.valorPrevisto !== null
                        ? String(objetivo.valorPrevisto)
                        : ""
                    );
                    setEditandoValor(true);
                  }}
                  className="mono rounded px-1.5 py-0.5 text-[12px] font-semibold text-[#2a2a27] hover:bg-[#efefec]"
                >
                  {objetivo.valorPrevisto !== null
                    ? fmtBRL(Number(objetivo.valorPrevisto))
                    : "definir"}
                </button>
              )}
              {objetivo.faixaPctMin !== null && (
                <span className="mono ml-auto text-[10px] text-[#8a8a85]">
                  referência {objetivo.faixaPctMin}–{objetivo.faixaPctMax}%
                </span>
              )}
            </div>
          )}
          {objetivo.decisoes.map((d) => (
            <DecisaoLinha
              key={d.id}
              decisao={d}
              ativa={aberta === d.id}
              onAbrir={onAbrir}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Resumo dos campos preenchidos ("Fornecedor: Buffet X · Valor: R$ 18 mil")
// no lugar do antigo texto livre.
function resumoCampos(decisao: Decisao): string | null {
  const preenchidos = decisao.campos.filter((c) => valorCampo(c) !== null);
  if (preenchidos.length === 0) return null;
  return preenchidos
    .slice(0, 2)
    .map((c) => {
      const v = valorCampo(c);
      if (c.tipo === "sim_nao") return `${c.label}: ${v ? "sim" : "não"}`;
      if (c.tipo === "moeda") return `${c.label}: ${fmtBRL(Number(v))}`;
      if (c.tipo === "escolha") return `${c.label}: ${opcaoLabel(String(v))}`;
      if (c.tipo === "fornecedor") return c.label;
      return `${c.label}: ${String(v)}`;
    })
    .join(" · ");
}

function DecisaoLinha({
  decisao,
  ativa,
  onAbrir,
}: {
  decisao: Decisao;
  ativa: boolean;
  onAbrir: (id: string) => void;
}) {
  const na = decisao.estado === "nao_se_aplica";
  const decidida = decisao.estado === "decidida";
  const resumo = resumoCampos(decisao);

  return (
    <button
      onClick={() => onAbrir(decisao.id)}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${ativa ? "bg-[oklch(0.97_0.02_285)]" : "hover:bg-[#f7f7f5]"} ${na ? "pl-5 opacity-55" : ""}`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          decidida
            ? "border-emerald-500 bg-emerald-500 text-white"
            : na
              ? "border-[#d0d0cb]"
              : "border-[#c8c8c3]"
        }`}
      >
        {decidida && <Check size={11} strokeWidth={3} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`text-[13px] ${na ? "text-[#6b6b66] line-through" : "text-[#2a2a27]"}`}
        >
          {decisao.titulo}
        </span>
        {resumo && !na && (
          <span className="truncate text-[12px] text-[#6b6b66]">{resumo}</span>
        )}
      </span>
      {na ? (
        <span className="mono text-[10px] uppercase tracking-wide text-[#6b6b66]">
          não se aplica
        </span>
      ) : decidida ? (
        <span className="mono text-[10px] uppercase tracking-wide text-emerald-600">
          decidida
        </span>
      ) : (
        <span className="mono text-[10px] text-[#6b6b66]">
          {decisao.campos.length > 0
            ? `${decisao.camposPreenchidos}/${decisao.campos.length} campos`
            : "pendente"}
        </span>
      )}
    </button>
  );
}

// Um input por campo, conforme o tipo. Salva no blur (texto/número) ou na
// escolha (select/sim-não/data/fornecedor).
function CampoInput({
  eventId,
  campo,
  suppliers,
  pending,
  onAgir,
}: {
  eventId: string;
  campo: Campo;
  suppliers: SupplierOpcao[];
  pending: boolean;
  onAgir: (fn: () => Promise<unknown>) => void;
}) {
  const [texto, setTexto] = useState(
    campo.tipo === "numero" || campo.tipo === "moeda"
      ? campo.valorNumero !== null
        ? String(campo.valorNumero)
        : ""
      : campo.valorTexto ?? ""
  );

  const salvar = (valor: string | number | boolean | null) =>
    onAgir(() =>
      salvarCampo(eventId, campo.id, campo.tipo, campo.codigo, valor)
    );

  const inputCls =
    "mt-1 w-full rounded-lg border border-[#c8c8c3] bg-white px-3 py-2 text-[13.5px] text-[#1b1b19] placeholder:text-[#9a9a95] outline-none focus:border-[oklch(0.5_0.14_285)]";

  const label = (
    <label className="mono text-[10px] uppercase tracking-[0.14em] text-[#6b6b66]">
      {campo.label}
      {campo.unidade ? ` (${campo.unidade})` : ""}
    </label>
  );

  switch (campo.tipo) {
    case "sim_nao": {
      const v = campo.valorBool;
      return (
        <div>
          {label}
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {([true, false] as const).map((opt) => (
              <button
                key={String(opt)}
                onClick={() => salvar(v === opt ? null : opt)}
                disabled={pending}
                className={`rounded-lg border py-1.5 text-[12.5px] font-medium transition-colors ${
                  v === opt
                    ? "border-[oklch(0.5_0.14_285)] bg-[oklch(0.95_0.03_285)] text-[oklch(0.4_0.14_285)]"
                    : "border-[#d0d0cb] text-[#5f5f5b] hover:bg-[#f2f2ef]"
                }`}
              >
                {opt ? "Sim" : "Não"}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case "escolha":
      return (
        <div>
          {label}
          <select
            value={campo.valorOpcao ?? ""}
            onChange={(e) => salvar(e.target.value || null)}
            disabled={pending}
            className={inputCls}
          >
            <option value="">—</option>
            {(campo.opcoes ?? []).map((o) => (
              <option key={o} value={o}>
                {opcaoLabel(o)}
              </option>
            ))}
          </select>
        </div>
      );
    case "fornecedor":
      return (
        <div>
          {label}
          <select
            value={campo.valorSupplierId ?? ""}
            onChange={(e) => salvar(e.target.value || null)}
            disabled={pending}
            className={inputCls}
          >
            <option value="">—</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      );
    case "data":
      return (
        <div>
          {label}
          <input
            type="date"
            defaultValue={campo.valorData ?? ""}
            onChange={(e) => salvar(e.target.value || null)}
            disabled={pending}
            className={inputCls}
          />
        </div>
      );
    case "numero":
    case "moeda":
      return (
        <div>
          {label}
          <input
            type="number"
            min={0}
            step={campo.tipo === "moeda" ? 100 : 1}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => {
              const atual =
                campo.valorNumero !== null ? String(campo.valorNumero) : "";
              if (texto !== atual) salvar(texto === "" ? null : Number(texto));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            placeholder={campo.tipo === "moeda" ? "R$" : ""}
            disabled={pending}
            className={inputCls}
          />
        </div>
      );
    default:
      // texto e anexo (anexo: caminho/link até a tela final ter upload)
      return (
        <div>
          {label}
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => {
              if ((campo.valorTexto ?? "") !== texto.trim())
                salvar(texto.trim() || null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            placeholder={campo.tipo === "anexo" ? "link do arquivo" : ""}
            disabled={pending}
            className={inputCls}
          />
        </div>
      );
  }
}

function PainelDecisao({
  eventId,
  objetivoNome,
  decisao,
  dataEvento,
  suppliers,
  pending,
  onFechar,
  onAgir,
  onEstado,
}: {
  eventId: string;
  objetivoNome: string;
  decisao: Decisao;
  dataEvento: string | null;
  suppliers: SupplierOpcao[];
  pending: boolean;
  onFechar: () => void;
  onAgir: (fn: () => Promise<unknown>) => void;
  onEstado: (
    decisaoId: string,
    novo: EstadoDecisao,
    fn: () => Promise<unknown>
  ) => void;
}) {
  const na = decisao.estado === "nao_se_aplica";
  const decidida = decisao.estado === "decidida";
  // Esta decisão É a data do casamento? Então o "valor" dela é events.date.
  const ehData = decisao.codigo === "data";

  return (
    <aside className="w-[340px] shrink-0 border-l border-[#e6e6e3] bg-[#fbfbfa] pl-5">
      <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pb-4 pr-1">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-[#6b6b66]">
              {objetivoNome} · decisão
            </p>
            <h3 className="mt-1 text-[16px] font-semibold leading-tight text-[#1b1b19]">
              {decisao.titulo}
            </h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="mono text-[10px] uppercase tracking-wide text-[#5f5f5b]">
                {RESP_LABEL[decisao.responsavel]}
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: na ? "#eeeeeb" : decidida ? "#e7f4ea" : ACENTO_FRACO,
                  color: na ? "#9a9a95" : decidida ? "#2e7d46" : ACENTO,
                }}
              >
                {na ? "Não se aplica" : decidida ? "Decidida" : "Pendente"}
              </span>
            </div>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded p-1 text-[#6b6b66] hover:bg-[#efefec] hover:text-[#2a2a27]"
          >
            <X size={16} />
          </button>
        </div>

        {/* A DATA é campo de primeira classe do evento (events.date). */}
        {!na && ehData && (
          <div className="mb-4">
            <label className="mono text-[11px] uppercase tracking-[0.14em] text-[#6b6b66]">
              Data do casamento
            </label>
            <input
              type="date"
              defaultValue={dataEvento ?? ""}
              onChange={(e) =>
                e.target.value &&
                onAgir(() => definirDataEvento(eventId, e.target.value))
              }
              disabled={pending}
              className="mt-1.5 w-full rounded-lg border border-[#c8c8c3] bg-white px-3 py-2 text-[14px] text-[#1b1b19] outline-none focus:border-[oklch(0.5_0.14_285)]"
            />
            {!dataEvento && (
              <p className="mt-1 text-[12px] text-[#8a6d3b]">
                Sem data, os prazos e a agenda ficam soltos. Defina para o
                método se ajustar ao tempo real.
              </p>
            )}
          </div>
        )}

        {/* O FORMULÁRIO da decisão: um input por campo, com o tipo certo.
            Os campos vazios são o roteiro do que perguntar aos noivos. */}
        {!na && decisao.campos.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="mono text-[10px] uppercase tracking-[0.14em] text-[#5f5f5b]">
                O que essa decisão define
              </span>
              <span className="mono text-[11px] text-[#6b6b66]">
                {decisao.camposPreenchidos} / {decisao.campos.length}
              </span>
            </div>
            <div className="space-y-3">
              {decisao.campos.map((c) => (
                <CampoInput
                  key={c.id}
                  eventId={eventId}
                  campo={c}
                  suppliers={suppliers}
                  pending={pending}
                  onAgir={onAgir}
                />
              ))}
            </div>
          </div>
        )}

        {/* VÍNCULO com a Organização: nomes reais do blueprint (4C) */}
        {decisao.gerariaTarefas.length > 0 && (
          <div className="mb-4 rounded-lg border border-[#eaeae7] bg-white p-3">
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-[#5f5f5b]">
              Próximas tarefas
            </p>
            <ul className="mt-2 space-y-1">
              {decisao.gerariaTarefas.map((t, i) => (
                <li
                  key={i}
                  className="flex items-center gap-1.5 text-[12px] text-[#3a3a37]"
                >
                  <span
                    className="h-1 w-1 shrink-0 rounded-full"
                    style={{ background: decidida ? "#4b7a52" : "#c0c0bb" }}
                  />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AÇÕES — "não se aplica" com a MESMA proeminência de "decidida" */}
        <div className="flex flex-col gap-2">
          {na ? (
            <button
              onClick={() =>
                onEstado(decisao.id, "pendente", () =>
                  reabrirDecisao(eventId, decisao.id)
                )
              }
              disabled={pending}
              className="w-full rounded-[7px] border border-[#d0d0cb] py-2 text-[12.5px] font-medium text-[#3a3a37] hover:bg-[#f2f2ef]"
            >
              Reativar decisão
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  decidida
                    ? onEstado(decisao.id, "pendente", () =>
                        reabrirDecisao(eventId, decisao.id)
                      )
                    : onEstado(decisao.id, "decidida", () =>
                        decidirDecisao(eventId, decisao.id)
                      )
                }
                disabled={pending}
                className="rounded-[7px] py-2 text-[12.5px] font-medium text-white"
                style={{ background: decidida ? "#6b6b66" : ACENTO }}
              >
                {decidida ? "Reabrir" : "Marcar como decidida"}
              </button>
              <button
                onClick={() =>
                  onEstado(decisao.id, "nao_se_aplica", () =>
                    marcarNaoSeAplica(eventId, decisao.id)
                  )
                }
                disabled={pending}
                className="rounded-[7px] border border-[#d0d0cb] py-2 text-[12.5px] font-medium text-[#3a3a37] hover:bg-[#f2f2ef]"
              >
                Não se aplica
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
