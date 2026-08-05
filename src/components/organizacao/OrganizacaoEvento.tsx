"use client";

// Tela de Organização (4B) — fiel aos designs 2b (lista) e 2c (calendário).
//
// Dois objetos, visualmente distintos e nunca intercalados: COMPROMISSO
// (Agenda — onde comparecer) e TAREFA (o que fazer). Toggle Lista ↔
// Calendário e filtro Tudo / Agenda / Tarefas.
//
// A Agenda ainda não tem tabela; nasce com estado vazio até o Módulo
// Reuniões criar o schema. As Tarefas vêm da `tasks` real, como estão.

import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react";
import {
  itensDoMes,
  type Organizacao,
  type Tarefa,
} from "@/lib/supabase/organizacao";

const ACENTO = "oklch(0.5 0.14 285)";
const mono = "font-mono text-[11px] uppercase tracking-[0.12em]";

type Vista = "lista" | "calendario";
type Filtro = "tudo" | "agenda" | "tarefas";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEM = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function dataBR(iso: string | null): string {
  if (!iso) return "sem prazo";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

export function OrganizacaoEvento({ inicial }: { inicial: Organizacao }) {
  const org = inicial;
  const [vista, setVista] = useState<Vista>("lista");
  const [filtro, setFiltro] = useState<Filtro>("tudo");

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <style>{`.org .mono{font-family:'IBM Plex Mono',ui-monospace,monospace}`}</style>
      <div className="org">
        {/* título */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-[#1b1b19]">
            Organização
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[#7a7a76]">
            As decisões viraram realidade.{" "}
            {org.diasAteEvento !== null && org.diasAteEvento >= 0
              ? `Faltam ${org.diasAteEvento} dias.`
              : "Data do evento a definir."}
          </p>
        </div>

        {/* controles: toggle de vista + filtro */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-[#e0e0dd] bg-white p-0.5">
            {(
              [
                ["lista", "Lista", List],
                ["calendario", "Calendário", CalendarIcon],
              ] as const
            ).map(([v, label, Ico]) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className="flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                style={
                  vista === v
                    ? { background: "#f2f2ef", color: "#1b1b19" }
                    : { color: "#8a8a86" }
                }
              >
                <Ico size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="inline-flex gap-1">
            {(
              [
                ["tudo", "Tudo"],
                ["agenda", "Agenda"],
                ["tarefas", "Tarefas"],
              ] as const
            ).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className="rounded-full px-3 py-1 text-[12px] font-medium transition-colors"
                style={
                  filtro === f
                    ? { background: ACENTO, color: "#fff" }
                    : { background: "#efefec", color: "#7a7a76" }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {vista === "lista" ? (
          <VistaLista org={org} filtro={filtro} />
        ) : (
          <VistaCalendario org={org} filtro={filtro} />
        )}
      </div>
    </div>
  );
}

function VistaLista({ org, filtro }: { org: Organizacao; filtro: Filtro }) {
  const abertas = org.tarefas.filter((t) => t.status !== "concluido");
  const concluidas = org.tarefas.filter((t) => t.status === "concluido");

  return (
    <div className="space-y-6">
      {/* AGENDA — compromissos (comparecer) */}
      {filtro !== "tarefas" && (
        <section>
          <div className="mb-2 flex items-baseline gap-2">
            <CalendarClock size={15} style={{ color: ACENTO }} />
            <h3 className="text-[14px] font-semibold text-[#2a2a27]">Agenda</h3>
            <span className="text-[12px] text-[#8a8a86]">
              — onde você precisa comparecer
            </span>
            <span className="mono ml-auto text-[11px] text-[#a8a8a3]">
              {org.compromissos.length} marcados
            </span>
          </div>

          {org.compromissos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e0e0dd] bg-[#fbfbfa] px-4 py-6 text-center">
              <p className="text-[13px] text-[#7a7a76]">
                Nenhum compromisso ainda.
              </p>
              <p className="mt-1 text-[11.5px] text-[#a8a8a3]">
                Reunião final, prova de vestido, degustação e ensaio entram aqui
                quando o Módulo Reuniões chegar.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {org.compromissos.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border-l-2 bg-white px-4 py-3"
                  style={{ borderColor: ACENTO, borderTop: "1px solid #eaeae7", borderRight: "1px solid #eaeae7", borderBottom: "1px solid #eaeae7" }}
                >
                  <div className="mono w-14 shrink-0 text-[11px] text-[#8a8a86]">
                    {dataBR(c.data)}
                    <div className="text-[13px] font-semibold text-[#1b1b19]">
                      {c.hora ?? ""}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-[#1b1b19]">
                      {c.titulo}
                    </p>
                    <p className="text-[11.5px] text-[#8a8a86]">
                      {[c.local, c.responsavel].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAREFAS — o que fazer */}
      {filtro !== "agenda" && (
        <section>
          <div className="mb-2 flex items-baseline gap-2">
            <CheckSquare size={15} className="text-[#5f5f5b]" />
            <h3 className="text-[14px] font-semibold text-[#2a2a27]">Tarefas</h3>
            <span className="text-[12px] text-[#8a8a86]">
              — o que você precisa fazer
            </span>
            <span className="mono ml-auto text-[11px] text-[#a8a8a3]">
              {abertas.length} abertas
            </span>
          </div>

          {org.tarefas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#e0e0dd] bg-[#fbfbfa] px-4 py-6 text-center text-[13px] text-[#7a7a76]">
              Nenhuma tarefa ainda. Elas serão geradas pelas decisões do
              Planejamento (etapa 4C).
            </div>
          ) : (
            <div className="space-y-1.5">
              {abertas.map((t) => (
                <LinhaTarefa key={t.id} tarefa={t} />
              ))}
              {concluidas.map((t) => (
                <LinhaTarefa key={t.id} tarefa={t} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function LinhaTarefa({ tarefa }: { tarefa: Tarefa }) {
  const feita = tarefa.status === "concluido";
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-[#eaeae7] bg-white px-4 py-2.5 ${feita ? "opacity-55" : ""}`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${feita ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#c8c8c3]"}`}
      >
        {feita && "✓"}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13.5px] ${feita ? "text-[#a8a8a3] line-through" : "text-[#2a2a27]"}`}
        >
          {tarefa.titulo}
        </p>
        {tarefa.category && (
          <p className="text-[11.5px] text-[#8a8a86]">{tarefa.category}</p>
        )}
      </div>
      <span className="mono shrink-0 text-[11px] text-[#8a8a86]">
        {feita ? "concluída" : `vence ${dataBR(tarefa.dueDate)}`}
      </span>
    </div>
  );
}

function VistaCalendario({ org, filtro }: { org: Organizacao; filtro: Filtro }) {
  const base = org.dataEvento
    ? new Date(`${org.dataEvento}T00:00:00`)
    : new Date();
  const [ano, setAno] = useState(base.getFullYear());
  const [mes, setMes] = useState(base.getMonth());

  const itens = useMemo(() => itensDoMes(org, ano, mes), [org, ano, mes]);

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  function passo(delta: number) {
    let m = mes + delta;
    let a = ano;
    if (m < 0) { m = 11; a--; }
    if (m > 11) { m = 0; a++; }
    setMes(m);
    setAno(a);
  }

  const mostra = (tipo: "tarefa" | "compromisso") =>
    filtro === "tudo" ||
    (filtro === "agenda" && tipo === "compromisso") ||
    (filtro === "tarefas" && tipo === "tarefa");

  return (
    <div className="rounded-xl border border-[#e6e6e3] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => passo(-1)}
            aria-label="Mês anterior"
            className="rounded p-1 text-[#8a8a86] hover:bg-[#f2f2ef]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[14px] font-semibold text-[#1b1b19]">
            {MESES[mes]} {ano}
          </span>
          <button
            onClick={() => passo(1)}
            aria-label="Próximo mês"
            className="rounded p-1 text-[#8a8a86] hover:bg-[#f2f2ef]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#8a8a86]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: ACENTO }} />
            Agenda · comparecer
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#9a9a95]" />
            Tarefa · fazer
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {DIAS_SEM.map((d) => (
          <div key={d} className="mono pb-1 text-center text-[10px] text-[#a8a8a3]">
            {d}
          </div>
        ))}
        {celulas.map((dia, i) => {
          const doDia = dia !== null ? itens.get(dia) ?? [] : [];
          const visiveis = doDia.filter((it) => mostra(it.tipo));
          const ehEvento =
            org.dataEvento === `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          return (
            <div
              key={i}
              className={`min-h-[76px] rounded-md border p-1.5 ${dia === null ? "border-transparent" : "border-[#f0f0ee] bg-[#fbfbfa]"}`}
            >
              {dia !== null && (
                <>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] text-[#7a7a76]">{dia}</span>
                    {ehEvento && (
                      <span className="mono rounded bg-[#1b1b19] px-1 py-0.5 text-[8px] font-semibold uppercase text-white">
                        evento
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {visiveis.slice(0, 3).map((it) => (
                      <div
                        key={it.id}
                        className="truncate rounded px-1 py-0.5 text-[10px] leading-tight"
                        style={
                          it.tipo === "compromisso"
                            ? { background: "oklch(0.95 0.03 285)", color: ACENTO }
                            : { background: "#efefec", color: "#5f5f5b" }
                        }
                        title={it.titulo}
                      >
                        {it.hora ? `${it.hora} ` : ""}
                        {it.titulo}
                      </div>
                    ))}
                    {visiveis.length > 3 && (
                      <div className="px-1 text-[9px] text-[#a8a8a3]">
                        +{visiveis.length - 3}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
