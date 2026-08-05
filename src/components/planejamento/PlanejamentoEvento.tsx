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
  Objetivo,
  Planejamento,
  Responsavel,
} from "@/lib/supabase/planejamento";
import {
  alternarGuia,
  decidirDecisao,
  marcarNaoSeAplica,
  reabrirDecisao,
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

// Prazo ideal da decisão em linguagem de tempo: a janela fecha quando faltam
// `offset` dias para o evento, então ela deveria ser decidida daqui a
// (diasAteEvento - offset) dias.
function prazoDecisao(
  diasAteEvento: number | null,
  offsetIdealDias: number | null
): string {
  if (diasAteEvento === null || offsetIdealDias === null)
    return "sem prazo definido";
  const gap = diasAteEvento - offsetIdealDias;
  if (gap <= 0) return "no prazo ideal agora";
  if (gap === 1) return "ideal decidir até amanhã";
  return `ideal decidir em ${gap} dias`;
}

export function PlanejamentoEvento({
  eventId,
  inicial,
}: {
  eventId: string;
  inicial: Planejamento;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [aberta, setAberta] = useState<string | null>(null);

  const plano = inicial;

  // decisão do painel lateral (reencontrada no dado fresco a cada refresh)
  const decisaoAberta = useMemo(() => {
    if (!aberta) return null;
    for (const o of plano.objetivos) {
      const d = o.decisoes.find((x) => x.id === aberta);
      if (d) return { objetivo: o, decisao: d };
    }
    return null;
  }, [aberta, plano.objetivos]);

  function agir(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
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
      objetivos: plano.objetivos.filter((o) => o.ativo && o.bucket === b),
    }))
    .filter((g) => g.objetivos.length > 0);

  const desligados = plano.objetivos.filter(
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
            <p className="mt-0.5 text-[12.5px] text-[#7a7a76]">
              Construindo o projeto do casamento — nada existe fisicamente ainda.
            </p>
          </div>
          <div className="w-[190px] shrink-0">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className={`mono ${mono}`} style={{ color: "#8a8a86" }}>
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
            <p className="mt-1 text-right text-[10px] uppercase tracking-wide text-[#a8a8a3]">
              ponderado por importância
            </p>
          </div>
        </div>

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
                  <span className={`mono ${mono}`} style={{ color: "#a8a8a3" }}>
                    {d.objetivoNome}
                  </span>
                  <span className="mt-1 text-[14px] font-semibold text-[#1b1b19]">
                    {d.titulo}
                  </span>
                  <span className="mt-1.5 text-[11.5px] text-[#7a7a76]">
                    {prazoDecisao(plano.diasAteEvento, d.offsetIdealDias)}
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
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                <span>
                  Ritmo intenso — a janela ideal de decisões estruturantes já
                  passou; itens seguem ordenados por prioridade.
                </span>
              </div>
            )}
          </section>
        )}

        {/* MAPA DA JORNADA */}
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold text-[#2a2a27]">
            Mapa da jornada
          </h3>
          <span className="mono text-[11px] text-[#8a8a86]">
            {faltamTexto(plano.diasAteEvento)}
          </span>
        </div>

        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.bucket}>
              <p className={`mono ${mono} mb-2`} style={{ color: "#a8a8a3" }}>
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
                    <span className="text-[13px] text-[#b0b0ab] line-through">
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
                      className="mono text-[11px] uppercase tracking-wide text-[#8a8a86] hover:text-[#2a2a27]"
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
          pending={pending}
          onFechar={() => setAberta(null)}
          onAgir={agir}
        />
      )}
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
          className={`shrink-0 text-[#b0b0ab] transition-transform ${expandido ? "rotate-90" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#1b1b19]">
            {objetivo.nome}
          </p>
          <p className="text-[11.5px] text-[#8a8a86]">
            Objetivo · {faltamTexto(objetivo.faltamDias)} ·{" "}
            {RESP_LABEL[objetivo.responsavelDominante]}
          </p>
        </div>
        <span className="mono shrink-0 text-[11px] text-[#8a8a86]">
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
      <span
        className={`flex-1 text-[13px] ${na ? "text-[#a8a8a3] line-through" : "text-[#2a2a27]"}`}
      >
        {decisao.titulo}
      </span>
      {na ? (
        <span className="mono text-[10px] uppercase tracking-wide text-[#b0b0ab]">
          não se aplica
        </span>
      ) : decidida ? (
        <span className="mono text-[10px] uppercase tracking-wide text-emerald-600">
          decidida
        </span>
      ) : (
        <span className="mono text-[10px] text-[#a8a8a3]">
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
  pending,
  onFechar,
  onAgir,
}: {
  eventId: string;
  objetivoNome: string;
  decisao: Decisao;
  pending: boolean;
  onFechar: () => void;
  onAgir: (fn: () => Promise<unknown>) => void;
}) {
  const na = decisao.estado === "nao_se_aplica";
  const decidida = decisao.estado === "decidida";

  return (
    <aside className="w-[340px] shrink-0 border-l border-[#e6e6e3] bg-[#fbfbfa] pl-5">
      <div className="sticky top-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-[#a8a8a3]">
              {objetivoNome} · decisão
            </p>
            <h3 className="mt-1 text-[16px] font-semibold leading-tight text-[#1b1b19]">
              {decisao.titulo}
            </h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="mono text-[10px] uppercase tracking-wide text-[#8a8a86]">
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
            className="rounded p-1 text-[#a8a8a3] hover:bg-[#efefec] hover:text-[#2a2a27]"
          >
            <X size={16} />
          </button>
        </div>

        {/* GUIA DA DECISÃO */}
        {decisao.guias.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="mono text-[10px] uppercase tracking-[0.14em] text-[#8a8a86]">
                Guia da decisão
              </span>
              <span className="mono text-[11px] text-[#a8a8a3]">
                {decisao.guiasMarcados} / {decisao.guias.length}
              </span>
            </div>
            <ul className="space-y-1">
              {decisao.guias.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => onAgir(() => alternarGuia(eventId, g.id, !g.marcado))}
                    disabled={pending}
                    className="flex w-full items-start gap-2 rounded px-1.5 py-1 text-left hover:bg-[#f2f2ef]"
                  >
                    <span
                      className={`mt-[1px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${g.marcado ? "border-[oklch(0.5_0.14_285)] bg-[oklch(0.5_0.14_285)] text-white" : "border-[#c8c8c3]"}`}
                    >
                      {g.marcado && <Check size={9} strokeWidth={3} />}
                    </span>
                    <span
                      className={`text-[12.5px] ${g.marcado ? "text-[#8a8a86] line-through" : "text-[#3a3a37]"}`}
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
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-[#8a8a86]">
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
              onClick={() => onAgir(() => reabrirDecisao(eventId, decisao.id))}
              disabled={pending}
              className="w-full rounded-[7px] border border-[#d0d0cb] py-2 text-[12.5px] font-medium text-[#3a3a37] hover:bg-[#f2f2ef]"
            >
              Reativar decisão
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  onAgir(() =>
                    decidida
                      ? reabrirDecisao(eventId, decisao.id)
                      : decidirDecisao(eventId, decisao.id)
                  )
                }
                disabled={pending}
                className="rounded-[7px] py-2 text-[12.5px] font-medium text-white"
                style={{ background: decidida ? "#6b6b66" : ACENTO }}
              >
                {decidida ? "Reabrir" : "Marcar como decidida"}
              </button>
              <button
                onClick={() => onAgir(() => marcarNaoSeAplica(eventId, decisao.id))}
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
