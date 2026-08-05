"use client";

// Tela de Organização — dois objetos visualmente distintos e nunca
// intercalados: COMPROMISSO (Agenda — onde comparecer) e TAREFA (o que
// fazer). Toggle Lista ↔ Calendário e filtro Tudo / Agenda / Tarefas.
//
// Compromissos vêm da tabela `compromisso` (069). A cerimonialista cria,
// remarca, cancela e pede confirmação por WhatsApp ao fornecedor vinculado.

import { useMemo, useState, useTransition } from "react";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Send,
  X,
} from "lucide-react";
import {
  itensDoMes,
  type Compromisso,
  type Organizacao,
  type Tarefa,
} from "@/lib/supabase/organizacao";
import {
  criarCompromisso,
  enviarConfirmacaoCompromisso,
  excluirCompromisso,
  mudarEstadoCompromisso,
} from "@/app/(app)/eventos/[id]/organizacao/actions";

const ACENTO = "oklch(0.5 0.14 285)";

type Vista = "lista" | "calendario";
type Filtro = "tudo" | "agenda" | "tarefas";
type Fornecedor = { id: string; nome: string; temWhatsapp: boolean };

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

// Quantos dias até uma data ISO (negativo = passou).
function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const alvo = new Date(`${iso}T00:00:00`).getTime();
  const hoje = new Date(new Date().toDateString()).getTime();
  return Math.round((alvo - hoje) / 86_400_000);
}

// Prazo em linguagem de tempo — "hoje", "amanhã", "em 4 dias", "há 2 dias".
function prazo(iso: string | null): string {
  const d = diasAte(iso);
  if (d === null) return "sem data";
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d === -1) return "ontem";
  if (d > 1) return `em ${d} dias`;
  return `há ${-d} dias`;
}

const ESTADO_ROTULO: Record<Compromisso["estado"], { texto: string; cor: string }> = {
  agendado: { texto: "aguardando", cor: "#8a8a86" },
  confirmado: { texto: "confirmado", cor: "#0a7a4a" },
  cancelado: { texto: "não virá", cor: "#b0402f" },
  remarcado: { texto: "remarcado", cor: "#8a6d3b" },
};

export function OrganizacaoEvento({
  inicial,
  eventId,
  fornecedores,
}: {
  inicial: Organizacao;
  eventId: string;
  fornecedores: Fornecedor[];
}) {
  const org = inicial;
  const [vista, setVista] = useState<Vista>("lista");
  const [filtro, setFiltro] = useState<Filtro>("tudo");

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <style>{`.org .mono{font-family:'IBM Plex Mono',ui-monospace,monospace}`}</style>
      <div className="org">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-[#1b1b19]">
            Organização
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[#7a7a76]">
            {org.diasAteEvento !== null && org.diasAteEvento >= 0
              ? `Faltam ${org.diasAteEvento} dias para o evento.`
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
          <VistaLista
            org={org}
            filtro={filtro}
            eventId={eventId}
            fornecedores={fornecedores}
          />
        ) : (
          <VistaCalendario org={org} filtro={filtro} />
        )}
      </div>
    </div>
  );
}

function VistaLista({
  org,
  filtro,
  eventId,
  fornecedores,
}: {
  org: Organizacao;
  filtro: Filtro;
  eventId: string;
  fornecedores: Fornecedor[];
}) {
  const abertas = org.tarefas.filter((t) => t.status !== "concluido");
  const concluidas = org.tarefas.filter((t) => t.status === "concluido");
  const [criando, setCriando] = useState(false);

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
            <button
              onClick={() => setCriando((v) => !v)}
              className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium"
              style={{ background: criando ? "#efefec" : ACENTO, color: criando ? "#7a7a76" : "#fff" }}
            >
              {criando ? <X size={13} /> : <Plus size={13} />}
              {criando ? "Fechar" : "Novo"}
            </button>
          </div>

          {criando && (
            <NovoCompromisso
              eventId={eventId}
              fornecedores={fornecedores}
              onPronto={() => setCriando(false)}
            />
          )}

          {org.compromissos.length === 0 ? (
            !criando && (
              <p className="px-1 py-4 text-[13px] text-[#8a8a86]">
                Nenhum compromisso marcado.
              </p>
            )
          ) : (
            <div className="space-y-2">
              {org.compromissos.map((c) => (
                <LinhaCompromisso key={c.id} c={c} eventId={eventId} />
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
            <p className="px-1 py-4 text-[13px] text-[#8a8a86]">
              Nenhuma tarefa ainda.
            </p>
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

function NovoCompromisso({
  eventId,
  fornecedores,
  onPronto,
}: {
  eventId: string;
  fornecedores: Fornecedor[];
  onPronto: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pend, start] = useTransition();

  const input =
    "w-full rounded-lg border border-[#e0e0dd] bg-white px-3 py-2 text-[13px] text-[#1b1b19] outline-none focus:border-[#c0c0bb]";

  function salvar() {
    setErro(null);
    start(async () => {
      const r = await criarCompromisso(eventId, {
        titulo,
        data,
        hora: hora || null,
        local: local || null,
        responsavel: responsavel || null,
        observacao: observacao || null,
        supplierId: supplierId || null,
      });
      if ("error" in r) setErro(r.error);
      else onPronto();
    });
  }

  return (
    <div className="mb-3 rounded-xl border border-[#e6e6e3] bg-[#fbfbfa] p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={`${input} sm:col-span-2`}
          placeholder="Ex.: Reunião final, prova de vestido, degustação"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          autoFocus
        />
        <input className={input} type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <input className={input} type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        <input
          className={input}
          placeholder="Local (opcional)"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
        />
        <select className={input} value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
          <option value="">Quem comparece?</option>
          <option value="noivos">Noivos</option>
          <option value="cerimonialista">Cerimonialista</option>
          <option value="ambos">Ambos</option>
        </select>
        <select
          className={`${input} sm:col-span-2`}
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="">Sem fornecedor</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
              {f.temWhatsapp ? "" : " (sem WhatsApp)"}
            </option>
          ))}
        </select>
        <input
          className={`${input} sm:col-span-2`}
          placeholder="Observação (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>

      {erro && <p className="mt-2 text-[12px] text-[#b0402f]">{erro}</p>}

      <div className="mt-2.5 flex items-center gap-2">
        <button
          onClick={salvar}
          disabled={pend}
          className="rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-60"
          style={{ background: ACENTO }}
        >
          {pend ? "Salvando…" : "Salvar compromisso"}
        </button>
        <button
          onClick={onPronto}
          className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-[#7a7a76]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function LinhaCompromisso({ c, eventId }: { c: Compromisso; eventId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const estado = ESTADO_ROTULO[c.estado];
  const podeConfirmar = Boolean(c.supplierId && c.supplierWhatsapp);

  function pedirConfirmacao() {
    setErro(null);
    setAviso(null);
    start(async () => {
      const r = await enviarConfirmacaoCompromisso(eventId, c.id);
      if ("error" in r) setErro(r.error);
      else setAviso("Pedido de confirmação enviado no WhatsApp.");
    });
  }

  function mudar(estadoNovo: "cancelado" | "remarcado" | "agendado") {
    start(async () => {
      const r = await mudarEstadoCompromisso(eventId, c.id, estadoNovo);
      if ("error" in r) setErro(r.error);
    });
  }

  function excluir() {
    start(async () => {
      const r = await excluirCompromisso(eventId, c.id);
      if ("error" in r) setErro(r.error);
    });
  }

  return (
    <div
      className="rounded-xl border-l-2 bg-white px-4 py-3"
      style={{ borderColor: ACENTO, borderTop: "1px solid #eaeae7", borderRight: "1px solid #eaeae7", borderBottom: "1px solid #eaeae7" }}
    >
      <div className="flex items-center gap-3">
        <div className="mono w-16 shrink-0 text-[11px] text-[#8a8a86]">
          {dataBR(c.data)}
          <div className="text-[13px] font-semibold text-[#1b1b19]">
            {c.hora ?? "—"}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium text-[#1b1b19]">{c.titulo}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-[11.5px] text-[#8a8a86]">
            <span>{prazo(c.data)}</span>
            {c.local && <span>· {c.local}</span>}
            {c.supplierNome && <span>· {c.supplierNome}</span>}
            {c.responsavel && <span className="capitalize">· {c.responsavel}</span>}
          </p>
        </div>
        <span
          className="mono shrink-0 text-[11px] font-medium"
          style={{ color: estado.cor }}
        >
          {estado.texto}
        </span>
      </div>

      {/* ações — texto simples, sem caixas */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-[76px] text-[11.5px]">
        {podeConfirmar && c.estado !== "confirmado" && (
          <button
            onClick={pedirConfirmacao}
            disabled={pend}
            className="flex items-center gap-1 font-medium disabled:opacity-50"
            style={{ color: ACENTO }}
          >
            <Send size={12} />
            Pedir confirmação
          </button>
        )}
        {c.estado !== "remarcado" && (
          <button onClick={() => mudar("remarcado")} disabled={pend} className="text-[#8a6d3b] disabled:opacity-50">
            Remarcar
          </button>
        )}
        {c.estado !== "cancelado" && (
          <button onClick={() => mudar("cancelado")} disabled={pend} className="text-[#8a8a86] disabled:opacity-50">
            Cancelar
          </button>
        )}
        {(c.estado === "cancelado" || c.estado === "remarcado") && (
          <button onClick={() => mudar("agendado")} disabled={pend} className="text-[#8a8a86] disabled:opacity-50">
            Reativar
          </button>
        )}
        <button onClick={excluir} disabled={pend} className="text-[#b0402f] disabled:opacity-50">
          Excluir
        </button>
      </div>

      {c.supplierId && !c.supplierWhatsapp && (
        <p className="mt-1 pl-[76px] text-[11px] text-[#a8a8a3]">
          {c.supplierNome} não tem WhatsApp cadastrado.
        </p>
      )}
      {aviso && <p className="mt-1 pl-[76px] text-[11px] text-[#0a7a4a]">{aviso}</p>}
      {erro && <p className="mt-1 pl-[76px] text-[11px] text-[#b0402f]">{erro}</p>}
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
        <p className="flex flex-wrap items-center gap-x-2 text-[11.5px] text-[#8a8a86]">
          {tarefa.responsavel && (
            <span className="capitalize">{tarefa.responsavel}</span>
          )}
          {tarefa.origemDecisao && (
            <span className="text-[#a8a8a3]">{tarefa.origemDecisao}</span>
          )}
          {!tarefa.responsavel && !tarefa.origemDecisao && tarefa.category && (
            <span>{tarefa.category}</span>
          )}
        </p>
      </div>
      <span className="mono shrink-0 text-[11px] text-[#8a8a86]">
        {feita ? "concluída" : `vence ${prazo(tarefa.dueDate)}`}
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
