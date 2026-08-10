"use client";

// Tela de Planejamento (4B) — fiel ao design 2a.
//
// Duas camadas: a FILA das 3 decisões mais críticas no topo (o que fazer
// agora) e o MAPA temporal por objetivo abaixo (o todo, nunca escondido).
// A decisão abre em PAINEL LATERAL (não inline, que empurraria o mapa).
//
// Tokens do handoff: IBM Plex Sans/Mono, acento violeta oklch(0.5 0.14
// 285), cards raio 10, tom interno Linear/Notion. O objeto dominante é a
// DECISÃO, dentro de OBJETIVOS.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, X } from "lucide-react";
import type {
  Bucket,
  Decisao,
  EstadoDecisao,
  Objetivo,
  Planejamento,
  Responsavel,
} from "@/lib/supabase/planejamento";
import {
  alternarGuia,
  decidirDecisao,
  definirDataEvento,
  marcarNaoSeAplica,
  reabrirDecisao,
  registrarResultado,
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
  decisaoInicial,
}: {
  eventId: string;
  inicial: Planejamento;
  // deep-link vindo da Organização ("ver decisão ↗" na origem da tarefa)
  decisaoInicial?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [aberta, setAberta] = useState<string | null>(decisaoInicial ?? null);

  const plano = inicial;

  // Overrides otimistas: o clique reflete na hora; o servidor sincroniza
  // em segundo plano. guiaOverride mata a lentidão (cada tique refazia a
  // árvore); estadoOverride dá resposta imediata ao decidir.
  const [guiaOverride, setGuiaOverride] = useState<Record<string, boolean>>({});
  const [estadoOverride, setEstadoOverride] = useState<
    Record<string, EstadoDecisao>
  >({});

  // Árvore com os overrides aplicados — usada no mapa E no painel, para que
  // o dot da decisão e a contagem de guias mudem imediatamente.
  const objetivosView: Objetivo[] = useMemo(
    () =>
      plano.objetivos.map((o) => ({
        ...o,
        decisoes: o.decisoes.map((d) => {
          const guias = d.guias.map((g) =>
            g.id in guiaOverride ? { ...g, marcado: guiaOverride[g.id] } : g
          );
          return {
            ...d,
            estado: estadoOverride[d.id] ?? d.estado,
            guias,
            guiasMarcados: guias.filter((g) => g.marcado).length,
          };
        }),
      })),
    [plano.objetivos, guiaOverride, estadoOverride]
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

  // Guia: otimista e SEM refetch (era o clique mais lento). Reverte se falhar.
  function toggleGuia(guiaId: string, marcado: boolean) {
    setGuiaOverride((m) => ({ ...m, [guiaId]: marcado }));
    void alternarGuia(eventId, guiaId, marcado).then((r) => {
      if (r && "error" in r)
        setGuiaOverride((m) => ({ ...m, [guiaId]: !marcado }));
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
    (o) => o.decisoes.length > 0 && o.decisoes.every((d) => d.estado === "nao_se_aplica")
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
                    objetivo={o}
                    aberta={aberta}
                    onAbrir={setAberta}
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
                            o.decisoes.map((d) => reabrirDecisao(eventId, d.id))
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
          pending={pending}
          onFechar={() => setAberta(null)}
          onAgir={agir}
          onToggleGuia={toggleGuia}
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

function ObjetivoCard({
  objetivo,
  aberta,
  onAbrir,
}: {
  objetivo: Objetivo;
  aberta: string | null;
  onAbrir: (id: string) => void;
}) {
  const [expandido, setExpandido] = useState(false);

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
        <span className="mono shrink-0 text-[11px] text-[#5f5f5b]">
          decisões {objetivo.decididas}/{objetivo.aplicaveis}
        </span>
      </button>

      {expandido && (
        <div className="border-t border-[#f0f0ee] px-3.5 py-2">
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
        {decisao.resultado && !na && (
          <span className="truncate text-[12px] text-[#6b6b66]">
            {decisao.resultado}
          </span>
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
          {decisao.guias.length > 0
            ? `${decisao.guiasMarcados}/${decisao.guias.length} guia`
            : "pendente"}
        </span>
      )}
    </button>
  );
}

function PainelDecisao({
  eventId,
  objetivoNome,
  decisao,
  dataEvento,
  pending,
  onFechar,
  onAgir,
  onToggleGuia,
  onEstado,
}: {
  eventId: string;
  objetivoNome: string;
  decisao: Decisao;
  dataEvento: string | null;
  pending: boolean;
  onFechar: () => void;
  onAgir: (fn: () => Promise<unknown>) => void;
  onToggleGuia: (guiaId: string, marcado: boolean) => void;
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
  const [resultado, setResultado] = useState(decisao.resultado ?? "");

  return (
    <aside className="w-[340px] shrink-0 border-l border-[#e6e6e3] bg-[#fbfbfa] pl-5">
      <div className="sticky top-4">
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

        {/* CAPTURAR O RESULTADO — "definir" ganha onde acontecer. A data é
            campo do evento; as demais decisões guardam um texto livre. */}
        {!na && (
          <div className="mb-4">
            <label className="mono text-[11px] uppercase tracking-[0.14em] text-[#6b6b66]">
              {ehData ? "Data do casamento" : "O que foi decidido"}
            </label>
            {ehData ? (
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
            ) : (
              <input
                type="text"
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                onBlur={() => {
                  if ((decisao.resultado ?? "") !== resultado.trim())
                    onAgir(() =>
                      registrarResultado(eventId, decisao.id, resultado)
                    );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                placeholder="Ex.: Buffet Sabor & Arte — R$ 18.000"
                disabled={pending}
                className="mt-1.5 w-full rounded-lg border border-[#c8c8c3] bg-white px-3 py-2 text-[14px] text-[#1b1b19] placeholder:text-[#6b6b66] outline-none focus:border-[oklch(0.5_0.14_285)]"
              />
            )}
            {ehData && !dataEvento && (
              <p className="mt-1 text-[12px] text-[#8a6d3b]">
                Sem data, os prazos e a agenda ficam soltos. Defina para o
                método se ajustar ao tempo real.
              </p>
            )}
          </div>
        )}

        {/* GUIA DA DECISÃO */}
        {decisao.guias.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="mono text-[10px] uppercase tracking-[0.14em] text-[#5f5f5b]">
                Guia da decisão
              </span>
              <span className="mono text-[11px] text-[#6b6b66]">
                {decisao.guiasMarcados} / {decisao.guias.length}
              </span>
            </div>
            <ul className="space-y-1">
              {decisao.guias.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => onToggleGuia(g.id, !g.marcado)}
                    className="flex w-full items-start gap-2 rounded px-1.5 py-1 text-left hover:bg-[#f2f2ef]"
                  >
                    <span
                      className={`mt-[1px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${g.marcado ? "border-[oklch(0.5_0.14_285)] bg-[oklch(0.5_0.14_285)] text-white" : "border-[#c8c8c3]"}`}
                    >
                      {g.marcado && <Check size={9} strokeWidth={3} />}
                    </span>
                    <span
                      className={`text-[12.5px] ${g.marcado ? "text-[#5f5f5b] line-through" : "text-[#3a3a37]"}`}
                    >
                      {g.texto}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
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
