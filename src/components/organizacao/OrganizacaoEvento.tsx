"use client";

// Tarefas da Organização — fonte única (wireframe Celebra Pro).
//
// Três visões: LISTA (linhas com chip de data), TIMELINE (eixo vertical por
// data) e AGENDA (compromissos — comparecer, não executar). Toda tarefa
// nasce de uma decisão (4C); o drawer mostra a cadeia Objetivo → Decisão →
// Tarefa com link para a decisão de origem. Tarefa manual é permitida, mas
// sempre com substância (título + prazo).
//
// Tokens do Celebra Pro em globals.css; primitivos em ui/celebra.

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarClock,
  Check,
  GitBranch,
  GitMerge,
  ListChecks,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type {
  Compromisso,
  Disparo,
  Organizacao,
  PendenciaFinanceira,
  Tarefa,
  TarefaStatus,
} from "@/lib/supabase/organizacao";
import { marcoTemporal } from "@/lib/supabase/organizacao";
import {
  agruparPorTempo,
  type TomGrupo,
} from "@/lib/organizacao-agrupamento";
import {
  adicionarChecklistItem,
  alternarChecklist,
  alternarTarefa,
  aprovarSugestao,
  atualizarTarefa,
  criarCompromisso,
  criarTarefa,
  descartarPendencia,
  dispararConvite,
  enviarConfirmacaoCompromisso,
  excluirCompromisso,
  excluirTarefa,
  mudarEstadoCompromisso,
  recusarSugestao,
  removerChecklistItem,
  type TarefaForm,
} from "@/app/(app)/eventos/[id]/organizacao/actions";
import { definirDataEvento } from "@/app/(app)/eventos/[id]/planejamento/actions";
import {
  Badge,
  Button,
  FieldLabel,
  SegmentedControl,
  Select,
  Switch,
  TextField,
  type BadgeTone,
} from "@/components/ui/celebra";

type Vista = "lista" | "timeline" | "agenda";
type Filtro = "todas" | "atrasadas" | "andamento" | "concluidas";
type Fornecedor = { id: string; nome: string; temWhatsapp: boolean };

const MES_ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function dataBR(iso: string | null): string {
  if (!iso) return "sem prazo";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

// Dias entre duas datas ISO (b − a), para as notas D-x.
function diasEntre(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) /
      86_400_000
  );
}

function prazo(iso: string | null): string {
  if (!iso) return "sem data";
  const alvo = new Date(`${iso}T00:00:00`).getTime();
  const hoje = new Date(new Date().toDateString()).getTime();
  const d = Math.round((alvo - hoje) / 86_400_000);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d === -1) return "ontem";
  if (d > 1) return `em ${d} dias`;
  return `há ${-d} dias`;
}

const STATUS_META: Record<TarefaStatus, { label: string; tone: BadgeTone; dot: string }> = {
  pendente: { label: "Pendente", tone: "wait", dot: "var(--state-wait)" },
  em_progresso: { label: "Em progresso", tone: "wait", dot: "var(--state-wait)" },
  concluido: { label: "Concluída", tone: "ok", dot: "var(--state-ok)" },
};

const PRIO_LABEL: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

const ESTADO_ROTULO: Record<Compromisso["estado"], { texto: string; cor: string }> = {
  agendado: { texto: "aguardando", cor: "var(--text-muted)" },
  confirmado: { texto: "confirmado", cor: "var(--state-ok)" },
  cancelado: { texto: "não virá", cor: "var(--state-late)" },
  remarcado: { texto: "remarcado", cor: "var(--state-wait)" },
};

const VINCULO_MODULO: Record<"execucao" | "financeiro", { rota: string; rotulo: string }> = {
  execucao: { rota: "roteiro", rotulo: "alimenta a Execução" },
  financeiro: { rota: "financeiro", rotulo: "entra no Financeiro" },
};

const CATEGORIAS = [
  "geral", "buffet", "decoracao", "som", "fotografia", "bolo",
  "cerimonia", "transporte", "presente", "vestiario",
];

/* ================================================================ */

export function OrganizacaoEvento({
  inicial,
  eventId,
  fornecedores,
  tarefaInicial,
  hoje,
}: {
  inicial: Organizacao;
  eventId: string;
  fornecedores: Fornecedor[];
  tarefaInicial?: string | null;
  /** yyyy-MM-dd em Brasília, vindo do servidor (ver page.tsx) */
  hoje: string;
}) {
  const [vista, setVista] = useState<Vista>("lista");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [prox7, setProx7] = useState(false);
  const [busca, setBusca] = useState("");
  // Drawer: id da tarefa aberta, "nova" para criação, null fechado.
  const [sel, setSel] = useState<string | null>(tarefaInicial ?? null);

  // Status otimista (o clique reflete na hora; o servidor sincroniza).
  const [statusOverride, setStatusOverride] = useState<Record<string, TarefaStatus>>({});

  const org: Organizacao = {
    ...inicial,
    tarefas: inicial.tarefas.map((t) =>
      statusOverride[t.id] ? { ...t, status: statusOverride[t.id] } : t
    ),
  };

  function alternar(taskId: string, concluida: boolean) {
    const novo: TarefaStatus = concluida ? "concluido" : "pendente";
    const anterior = org.tarefas.find((t) => t.id === taskId)?.status ?? "pendente";
    setStatusOverride((m) => ({ ...m, [taskId]: novo }));
    void alternarTarefa(eventId, taskId, concluida).then((r) => {
      if ("error" in r) setStatusOverride((m) => ({ ...m, [taskId]: anterior }));
    });
  }

  // Filtros aplicados (busca + chip + próximos 7 dias)
  const tarefasVisiveis = useMemo(() => {
    const hojeMs = new Date(`${hoje}T00:00:00`).getTime();
    const seteDias = hojeMs + 7 * 86_400_000;
    const q = busca.trim().toLowerCase();
    return org.tarefas.filter((t) => {
      if (q) {
        const alvo = `${t.titulo} ${t.supplierNome ?? ""} ${t.local ?? ""}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      if (filtro === "concluidas" && t.status !== "concluido") return false;
      if (filtro === "andamento" && t.status === "concluido") return false;
      if (filtro === "atrasadas") {
        if (t.status === "concluido" || !t.dueDate) return false;
        if (new Date(`${t.dueDate}T00:00:00`).getTime() >= hojeMs) return false;
      }
      if (prox7) {
        if (!t.dueDate) return false;
        const d = new Date(`${t.dueDate}T00:00:00`).getTime();
        if (d < hojeMs || d > seteDias) return false;
      }
      return true;
    });
  }, [org.tarefas, filtro, prox7, busca, hoje]);

  const tarefaSel = sel && sel !== "nova" ? org.tarefas.find((t) => t.id === sel) ?? null : null;
  const abertas = org.tarefas.filter((t) => t.status !== "concluido").length;

  return (
    <div style={{ fontFamily: "var(--font-ui)", color: "var(--text-strong)" }}>
      {!org.dataEvento && <BannerDataOrg eventId={eventId} />}
      {org.pendencias.length > 0 && (
        <PendenciasFinanceiras eventId={eventId} pendencias={org.pendencias} />
      )}

      {/* cabeçalho da seção */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-title)",
              fontWeight: 700,
              fontSize: 19,
              letterSpacing: "-0.02em",
            }}
          >
            Tarefas da Organização
          </h2>
          <p style={{ margin: "3px 0 0", display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)" }}>
            <GitMerge size={13} style={{ color: "var(--accent)" }} />
            Fonte única — cada tarefa nasce de uma decisão e aparece só aqui.
          </p>
        </div>
        <Button onClick={() => setSel("nova")}>
          <Plus size={15} />
          Nova tarefa
        </Button>
      </div>

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <SegmentedControl<Vista>
          value={vista}
          onChange={setVista}
          options={[
            { value: "lista", label: "Lista" },
            { value: "timeline", label: "Timeline" },
            { value: "agenda", label: <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><CalendarClock size={13} />Agenda</span> },
          ]}
        />

        {vista !== "agenda" && (
          <>
            <div style={{ display: "inline-flex", gap: 6 }}>
              {(
                [
                  ["todas", "Todas"],
                  ["atrasadas", "Atrasadas"],
                  ["andamento", "Em andamento"],
                  ["concluidas", "Concluídas"],
                ] as const
              ).map(([f, label]) => {
                const ativo = filtro === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    style={{
                      height: 32,
                      padding: "0 13px",
                      borderRadius: "var(--r-pill)",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      fontWeight: ativo ? 600 : 500,
                      cursor: "pointer",
                      background: ativo ? "var(--text-strong)" : "var(--surface-card)",
                      color: ativo ? "#fff" : "var(--text-muted)",
                      border: ativo ? "1px solid var(--text-strong)" : "1px solid var(--border-hairline)",
                      transition: "background 120ms ease",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 7, height: 34, padding: "0 10px",
                  background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--r-md)", width: 210,
                }}
              >
                <Search size={14} style={{ color: "var(--text-muted)", flex: "0 0 auto" }} />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar tarefa, fornecedor…"
                  style={{ border: "none", outline: "none", background: "transparent", flex: 1, minWidth: 0, fontSize: 12.5, fontFamily: "var(--font-ui)", color: "var(--text-strong)" }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-muted)", cursor: "pointer" }}>
                Próximos 7 dias
                <Switch checked={prox7} onChange={setProx7} label="Próximos 7 dias" />
              </label>
            </div>
          </>
        )}

        {vista === "agenda" && (
          <span className="mono" style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)" }}>
            {org.compromissos.length} compromissos · {abertas} tarefas abertas
          </span>
        )}
      </div>

      {/* visões */}
      {vista === "lista" && (
        <VistaLista
          tarefas={tarefasVisiveis}
          dataEvento={org.dataEvento}
          eventId={eventId}
          hoje={hoje}
          onAbrir={setSel}
          onToggle={alternar}
        />
      )}
      {vista === "timeline" && (
        <VistaTimeline tarefas={tarefasVisiveis} onAbrir={setSel} />
      )}
      {vista === "agenda" && (
        <VistaAgenda org={org} eventId={eventId} fornecedores={fornecedores} />
      )}

      {/* CENTRAL DE DISPAROS — vive na Agenda: é lá que se marca reunião
          com fornecedor. Só aparece com trabalho real (nada de caixa vazia). */}
      {vista === "agenda" && org.disparos.length > 0 && (
        <CentralDisparos disparos={org.disparos} onAbrir={setSel} />
      )}

      {/* drawer */}
      {(tarefaSel || sel === "nova") && (
        <TarefaDrawer
          key={sel}
          eventId={eventId}
          tarefa={tarefaSel}
          dataEvento={org.dataEvento}
          hoje={hoje}
          fornecedores={fornecedores}
          onFechar={() => setSel(null)}
        />
      )}
    </div>
  );
}

/* ============================================================ LISTA */

function VistaLista({
  tarefas,
  dataEvento,
  eventId,
  hoje,
  onAbrir,
  onToggle,
}: {
  tarefas: Tarefa[];
  dataEvento: string | null;
  eventId: string;
  hoje: string;
  onAbrir: (id: string) => void;
  onToggle: (id: string, concluida: boolean) => void;
}) {
  // A lista já vem ordenada por prazo crescente do banco; agrupar é só
  // render, não reordenação.
  const grupos = useMemo(() => agruparPorTempo(tarefas, hoje), [tarefas, hoje]);

  if (tarefas.length === 0) {
    return (
      <p style={{ padding: "28px 4px", fontSize: 13.5, color: "var(--text-muted)" }}>
        Nenhuma tarefa aqui. Elas nascem quando você decide no Planejamento — ou crie uma com “Nova tarefa”.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {grupos.map((g) => (
        <section key={g.chave} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {/* A hierarquia sai daqui, não de cor no cartão. Mesma
              especificação do FieldLabel dos primitivos: 11px, 600,
              caixa alta, tracking largo, em muted. Sem borda, sem fundo. */}
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            {g.titulo}
          </h3>
          {g.itens.map((t) => (
            <LinhaTarefa
              key={t.id}
              t={t}
              dataEvento={dataEvento}
              eventId={eventId}
              hoje={hoje}
              tom={g.tom}
              peso={g.peso}
              onAbrir={onAbrir}
              onToggle={onToggle}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

// A cor da caixa de data é a única cor da linha, e agora ela SIGNIFICA
// algo: ameixa = está chegando (hoje/amanhã), terracota = passou,
// neutro = está no calendário. Antes toda tarefa com prazo era ameixa —
// o acento virava papel de parede e não informava nada.
const TOM_DATA: Record<TomGrupo, { bg: string; fg: string }> = {
  proxima: { bg: "var(--accent-tint)", fg: "var(--accent)" },
  atrasada: { bg: "var(--state-late-bg)", fg: "var(--state-late)" },
  quieta: { bg: "var(--surface-sunken)", fg: "var(--text-muted)" },
};

function ChipData({
  iso,
  hora,
  tom,
}: {
  iso: string | null;
  hora: string | null;
  tom: TomGrupo;
}) {
  if (!iso) {
    return (
      <div
        style={{
          width: 64, flex: "0 0 64px", borderRadius: "var(--r-md)",
          background: "var(--surface-sunken)", padding: "10px 6px", textAlign: "center",
        }}
      >
        <div className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
          SEM
          <br />
          PRAZO
        </div>
      </div>
    );
  }
  const [a, m, d] = iso.split("-");
  const c = TOM_DATA[tom];
  return (
    <div
      style={{
        width: 64, flex: "0 0 64px", borderRadius: "var(--r-md)",
        background: c.bg, padding: "8px 6px", textAlign: "center",
      }}
    >
      <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 20, lineHeight: 1.1, color: c.fg }}>
        {Number(d)}
      </div>
      <div className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: c.fg }}>
        {m}/{a}
      </div>
      {hora && (
        <div className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: c.fg, opacity: 0.75 }}>
          {hora}
        </div>
      )}
    </div>
  );
}

function LinhaTarefa({
  t,
  dataEvento,
  eventId,
  hoje,
  tom,
  peso,
  onAbrir,
  onToggle,
}: {
  t: Tarefa;
  dataEvento: string | null;
  eventId: string;
  hoje: string;
  tom: TomGrupo;
  peso: 600 | 700;
  onAbrir: (id: string) => void;
  onToggle: (id: string, concluida: boolean) => void;
}) {
  const feita = t.status === "concluido";
  const marco = marcoTemporal(t.dueDate, dataEvento, feita, hoje);
  const st = STATUS_META[t.status];
  const vinc = t.vinculoModulo ? VINCULO_MODULO[t.vinculoModulo] : null;

  return (
    <div
      onClick={() => onAbrir(t.id)}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
        borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-sm)",
        padding: "14px 18px", cursor: "pointer", opacity: feita ? 0.62 : 1,
      }}
    >
      <ChipData iso={t.dueDate} hora={t.dueTime} tom={feita ? "quieta" : tom} />

      <div style={{ minWidth: 0, flex: 1 }}>
        {/* O que muda no que é para agora é o PESO, não a cor — mesmo
            padrão do cabeçalho do evento, que marca "faltam menos de 7
            dias" escurecendo e engrossando, sem matiz nova. */}
        <p
          style={{
            margin: 0, fontFamily: "var(--font-title)", fontWeight: feita ? 600 : peso, fontSize: 16,
            letterSpacing: "-0.01em", textDecoration: feita ? "line-through" : "none",
            color: feita ? "var(--text-muted)" : "var(--text-strong)",
          }}
        >
          {t.titulo}
        </p>
        <p className="mono" style={{ margin: "3px 0 0", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          ID #{t.id.slice(0, 4)}
          {t.supplierNome ? ` · ${t.supplierNome}` : ""}
          {t.local ? ` · ${t.local}` : ""}
          {!t.supplierNome && !t.local && t.origemDecisao ? ` · ${t.origemDecisao}` : ""}
        </p>
        <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap", alignItems: "center" }}>
          {/* O cabeçalho da seção já diz "Atrasadas", e a caixa de data
              já está em terracota. O selo aqui volta a dizer o que só ele
              sabe: em que pé a tarefa está. Antes o mesmo fato aparecia
              quatro vezes na mesma linha. */}
          <Badge tone={st.tone}>{st.label}</Badge>
          {/* Selo do Secretário: reunião marcada pelo convite */}
          {t.convite?.status === "respondido" && !feita && (
            <Badge tone="sage">Agendada</Badge>
          )}
          {t.convite?.status === "sugerido" && (
            <Badge tone="wait">Sugestão p/ aprovar</Badge>
          )}
          {t.priority && <Badge tone="plum">{PRIO_LABEL[t.priority] ?? t.priority}</Badge>}
          {/* "vencida" e "sem prazo" seriam repetição do cabeçalho da
              seção; o marco só entra quando tem algo próprio a dizer
              (D-7, 3S antes, dia do evento). */}
          {!marco.vencida && t.dueDate && (
            <Badge tone="neutral">{marco.label}</Badge>
          )}
          {t.checklist.length > 0 && (
            <span className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ListChecks size={12} />
              {t.checklist.filter((c) => c.feito).length}/{t.checklist.length}
            </span>
          )}
          {vinc && (
            <Link
              href={`/eventos/${eventId}/${vinc.rota}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                background: "var(--accent-tint)", color: "var(--accent)",
                borderRadius: "var(--r-pill)", padding: "3px 9px",
                fontSize: 11, fontWeight: 600, textDecoration: "none",
              }}
            >
              {vinc.rotulo} →
            </Link>
          )}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(t.id, !feita);
        }}
        aria-label={feita ? "Reabrir tarefa" : "Concluir tarefa"}
        style={{
          width: 24, height: 24, flex: "0 0 auto", borderRadius: "50%",
          border: feita ? "none" : "1.5px solid var(--border-strong)",
          background: feita ? "var(--state-ok)" : "var(--surface-card)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}
      >
        {feita && <Check size={14} strokeWidth={3} />}
      </button>
    </div>
  );
}

/* ========================================================= TIMELINE */

function VistaTimeline({
  tarefas,
  onAbrir,
}: {
  tarefas: Tarefa[];
  onAbrir: (id: string) => void;
}) {
  const ordenadas = useMemo(() => {
    const comData = tarefas.filter((t) => t.dueDate).slice()
      .sort((a, b) => (a.dueDate! + (a.dueTime ?? "")).localeCompare(b.dueDate! + (b.dueTime ?? "")));
    const semData = tarefas.filter((t) => !t.dueDate);
    return [...comData, ...semData];
  }, [tarefas]);

  if (ordenadas.length === 0) {
    return (
      <p style={{ padding: "28px 4px", fontSize: 13.5, color: "var(--text-muted)" }}>
        Nada na linha do tempo com os filtros atuais.
      </p>
    );
  }

  return (
    <div style={{ position: "relative", paddingLeft: 26 }}>
      <div style={{ position: "absolute", left: 8, top: 6, bottom: 6, width: 2, background: "var(--border-hairline)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {ordenadas.map((t) => {
          const st = STATUS_META[t.status];
          const [a, m, d] = t.dueDate ? t.dueDate.split("-") : [null, null, null];
          return (
            <div key={t.id} style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute", left: -24, top: 20, width: 10, height: 10,
                  borderRadius: "50%", background: st.dot, boxShadow: "0 0 0 3px var(--surface-app)",
                }}
              />
              <div
                onClick={() => onAbrir(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-sm)",
                  padding: "12px 16px", cursor: "pointer",
                }}
              >
                <div className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)", width: 74, flex: "0 0 74px" }}>
                  {t.dueDate ? (
                    <>
                      {d}/{m}/{a!.slice(2)}
                      <br />
                      {t.dueTime ?? "—"}
                    </>
                  ) : (
                    "sem prazo"
                  )}
                </div>
                <div style={{ width: 1, alignSelf: "stretch", background: "var(--border-hairline)" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-title)", fontWeight: 600, fontSize: 14.5, color: "var(--text-strong)" }}>
                    {t.titulo}
                  </p>
                  <p className="mono" style={{ margin: "2px 0 0", fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)" }}>
                    {t.supplierNome ?? t.origemDecisao ?? "—"}
                  </p>
                </div>
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================== AGENDA */

function VistaAgenda({
  org,
  eventId,
  fornecedores,
}: {
  org: Organizacao;
  eventId: string;
  fornecedores: Fornecedor[];
}) {
  const [criando, setCriando] = useState(false);
  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontFamily: "var(--font-title)", fontWeight: 600, fontSize: 14.5 }}>Agenda</h3>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>— onde você precisa comparecer</span>
        <span style={{ marginLeft: "auto" }}>
          <Button size="sm" variant={criando ? "secondary" : "primary"} onClick={() => setCriando((v) => !v)}>
            {criando ? <X size={13} /> : <Plus size={13} />}
            {criando ? "Fechar" : "Novo"}
          </Button>
        </span>
      </div>

      {criando && (
        <NovoCompromisso eventId={eventId} fornecedores={fornecedores} onPronto={() => setCriando(false)} />
      )}

      {org.compromissos.length === 0 ? (
        !criando && (
          <p style={{ padding: "16px 4px", fontSize: 13, color: "var(--text-muted)" }}>
            Nenhum compromisso marcado.
          </p>
        )
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {org.compromissos.map((c) => (
            <LinhaCompromisso key={c.id} c={c} eventId={eventId} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ================================================ CENTRAL DE DISPAROS */

const DISPARO_META: Record<Disparo["status"], { label: string; tone: BadgeTone }> = {
  agendado: { label: "Agendado", tone: "sage" },
  enviado: { label: "Enviado", tone: "wait" },
  reenviado: { label: "Reenviado", tone: "wait" },
  respondido: { label: "Respondido", tone: "ok" },
  expirado: { label: "Expirado", tone: "late" },
  sugerido: { label: "Sugestão p/ aprovar", tone: "wait" },
};

function CentralDisparos({
  disparos,
  onAbrir,
}: {
  disparos: Disparo[];
  onAbrir: (taskId: string) => void;
}) {
  return (
    <section style={{ marginTop: 34 }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
          borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-sm)",
          padding: "14px 18px", marginBottom: 11,
        }}
      >
        <span style={{ width: 42, height: 42, borderRadius: "var(--r-md)", background: "var(--salvia-50)", color: "var(--salvia-600)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
          <Send size={19} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-title)", fontWeight: 600, fontSize: 15 }}>
            Central de Disparos
          </p>
          <p style={{ margin: "1px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            {disparos.filter((d) => d.status === "agendado").length} programados ·{" "}
            {disparos.filter((d) => d.status === "enviado" || d.status === "reenviado").length} aguardando resposta
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {disparos.map((d) => {
          const meta = DISPARO_META[d.status];
          const [a, m, dia] = d.data ? d.data.split("-") : [null, null, null];
          return (
            <button
              key={d.id}
              // convite avulso não tem tarefa para abrir
              onClick={() => d.taskId && onAbrir(d.taskId)}
              style={{
                display: "flex", alignItems: "center", gap: 14, textAlign: "left",
                background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
                borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-sm)",
                padding: "11px 16px", width: "100%",
                cursor: d.taskId ? "pointer" : "default",
              }}
            >
              <div style={{ width: 46, flex: "0 0 46px", textAlign: "center", borderRadius: "var(--r-md)", background: "var(--surface-sunken)", padding: "6px 2px" }}>
                {d.data ? (
                  <>
                    <div className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, color: "var(--text-muted)" }}>
                      {MES_ABREV[Number(m) - 1]}
                    </div>
                    <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 16, color: "var(--text-strong)" }}>
                      {Number(dia)}
                    </div>
                  </>
                ) : (
                  <div className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-muted)" }}>
                    sem
                    <br />
                    data
                  </div>
                )}
                <span style={{ display: "none" }}>{a}</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)" }}>
                  {d.status === "agendado" ? "Enviar convite: " : "Convite: "}
                  {d.tarefa}
                </p>
                <p className="mono" style={{ margin: "2px 0 0", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                  {d.fornecedor ?? "—"} · via WhatsApp
                </p>
              </div>
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </button>
          );
        })}
      </div>

      <p className="mono" style={{ margin: "9px 0 0", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-faint)" }}>
        disparos via WhatsApp · verificação diária às 09:00 · sem resposta em 5
        dias, volta pro manual
        <Link
          href="/agenda?tab=grade"
          style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
        >
          Editar minha grade →
        </Link>
      </p>
    </section>
  );
}

/* =========================================================== DRAWER */

function TarefaDrawer({
  eventId,
  tarefa,
  dataEvento,
  hoje,
  fornecedores,
  onFechar,
}: {
  eventId: string;
  tarefa: Tarefa | null; // null = nova
  dataEvento: string | null;
  /** o mesmo "hoje" da lista: com ?tarefa=<id> o drawer renderiza no
      servidor, e marco divergente entre linha e drawer seria mentira */
  hoje: string;
  fornecedores: Fornecedor[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const nova = tarefa === null;

  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [status, setStatus] = useState<TarefaStatus>(tarefa?.status ?? "pendente");
  const [priority, setPriority] = useState(tarefa?.priority ?? "media");
  const [dueDate, setDueDate] = useState(tarefa?.dueDate ?? "");
  const [dueTime, setDueTime] = useState(tarefa?.dueTime ?? "");
  const [supplierId, setSupplierId] = useState(tarefa?.supplierId ?? "");
  const [responsavel, setResponsavel] = useState(tarefa?.responsavel ?? "cerimonialista");
  const [valor, setValor] = useState(
    tarefa?.valor !== null && tarefa?.valor !== undefined ? String(tarefa.valor) : ""
  );
  const [local, setLocal] = useState(tarefa?.local ?? "");
  const [categoria, setCategoria] = useState(tarefa?.category ?? "geral");
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? "");
  // Gatilho do convite (anexo 1): offset em dias antes do EVENTO com data
  // calculada; "Editar data" troca para data manual (offset vira null).
  const [conviteData, setConviteData] = useState(tarefa?.conviteData ?? "");
  const [conviteOffset, setConviteOffset] = useState<number>(
    tarefa?.conviteOffsetDias ?? 21
  );
  const [modoDataManual, setModoDataManual] = useState<boolean>(
    Boolean(tarefa && tarefa.conviteOffsetDias === null && tarefa.conviteData)
  );
  const [prazoDias, setPrazoDias] = useState<number>(
    tarefa?.prazoRespostaDias ?? 5
  );
  const [reenvioHoras, setReenvioHoras] = useState<number>(
    tarefa?.reenvioHoras ?? 48
  );
  const [autoAgendar, setAutoAgendar] = useState(tarefa?.autoAgendar ?? false);
  const [duracaoMin, setDuracaoMin] = useState(tarefa?.duracaoMin ?? 60);
  const [canalConvite, setCanalConvite] = useState<"whatsapp" | "email">(
    tarefa?.canalConvite ?? "whatsapp"
  );
  const [avisoDisparo, setAvisoDisparo] = useState<string | null>(null);

  // data calculada = data do evento − offset (nunca no passado)
  const conviteCalculada = (() => {
    if (!dataEvento || !Number.isFinite(conviteOffset)) return null;
    const d = new Date(`${dataEvento}T00:00:00`);
    d.setDate(d.getDate() - conviteOffset);
    // piso = o "hoje" do servidor: com ?tarefa=<id> este drawer renderiza
    // no servidor, e relógio local aqui quebraria a hidratação das 21h à
    // meia-noite (servidor em UTC, aparelho em Brasília)
    const piso = new Date(`${hoje}T00:00:00`);
    const alvo = d < piso ? piso : d;
    return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}-${String(alvo.getDate()).padStart(2, "0")}`;
  })();
  const conviteEfetiva = modoDataManual ? conviteData || null : conviteCalculada;
  const [novoPasso, setNovoPasso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const tituloRef = useRef<HTMLInputElement>(null);

  // checklist otimista
  const [checklist, setChecklist] = useState(tarefa?.checklist ?? []);
  const feitosCk = checklist.filter((c) => c.feito).length;
  const pctCk = checklist.length ? Math.round((feitosCk / checklist.length) * 100) : 0;

  const marco = tarefa
    ? marcoTemporal(tarefa.dueDate, dataEvento, tarefa.status === "concluido", hoje)
    : null;

  function salvar() {
    setErro(null);
    // Validação com destino: diz o que falta e leva o foco até o campo.
    if (!titulo.trim()) {
      setErro("Escreva o título da tarefa — é o único campo obrigatório.");
      tituloRef.current?.focus();
      tituloRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const form: TarefaForm = {
      titulo,
      descricao,
      status,
      priority,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      responsavel,
      supplierId: supplierId || null,
      local,
      valor: valor.trim() === "" ? null : Number(valor.replace(/\./g, "").replace(",", ".")),
      conviteData: conviteEfetiva,
      conviteOffsetDias: modoDataManual ? null : conviteOffset,
      prazoRespostaDias: prazoDias,
      reenvioHoras,
      categoria: categoria || "geral",
      autoAgendar,
      duracaoMin,
      canalConvite,
    };
    start(async () => {
      const r = nova
        ? await criarTarefa(eventId, form)
        : await atualizarTarefa(eventId, tarefa!.id, form);
      if ("error" in r) setErro(r.error);
      else {
        router.refresh();
        onFechar();
      }
    });
  }

  function excluir() {
    if (nova) return;
    start(async () => {
      const r = await excluirTarefa(eventId, tarefa!.id);
      if ("error" in r) setErro(r.error);
      else {
        router.refresh();
        onFechar();
      }
    });
  }

  function togglePasso(id: string, feito: boolean) {
    setChecklist((l) => l.map((c) => (c.id === id ? { ...c, feito } : c)));
    void alternarChecklist(eventId, id, feito).then((r) => {
      if ("error" in r) setChecklist((l) => l.map((c) => (c.id === id ? { ...c, feito: !feito } : c)));
    });
  }

  function addPasso() {
    const texto = novoPasso.trim();
    if (!texto || nova) return;
    setNovoPasso("");
    void adicionarChecklistItem(eventId, tarefa!.id, texto, checklist.length).then((r) => {
      if ("id" in r && r.id) {
        setChecklist((l) => [...l, { id: r.id!, texto, feito: false, ordem: l.length }]);
      }
    });
  }

  function delPasso(id: string) {
    setChecklist((l) => l.filter((c) => c.id !== id));
    void removerChecklistItem(eventId, id);
  }

  const st = STATUS_META[status];

  return (
    <>
      {/* scrim */}
      <div
        onClick={onFechar}
        style={{
          position: "fixed", inset: 0, background: "rgba(34,30,27,0.28)",
          zIndex: 40, animation: "celebraFade 150ms ease",
        }}
      />
      <style>{`
        @keyframes celebraFade{from{opacity:0}to{opacity:1}}
        @keyframes celebraDrawerIn{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
      `}</style>

      {/* painel */}
      <aside
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 472, maxWidth: "100vw",
          background: "var(--surface-card)", borderLeft: "1px solid var(--border-hairline)",
          boxShadow: "var(--shadow-lg)", zIndex: 41, display: "flex", flexDirection: "column",
          animation: "celebraDrawerIn 160ms ease", fontFamily: "var(--font-ui)",
        }}
      >
        {/* header */}
        <div style={{ padding: "16px 22px 12px", borderBottom: "1px solid var(--border-hairline)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="mono" style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                {nova
                  ? "nova tarefa"
                  : `ID #${tarefa!.id.slice(0, 4)} · ${tarefa!.decisaoId ? "gerada automaticamente" : "criada manualmente"}`}
              </p>
              {/* Vazio, o título precisa PARECER campo (antes lia como
                  cabeçalho e a pessoa não sabia que faltava preencher). */}
              <input
                ref={tituloRef}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={nova ? "Escreva o título da tarefa" : "Título da tarefa"}
                autoFocus={nova}
                style={{
                  width: "100%", outline: "none",
                  border: titulo.trim() ? "1px solid transparent" : "1px dashed var(--border-strong)",
                  background: titulo.trim() ? "transparent" : "var(--surface-sunken)",
                  borderRadius: "var(--r-sm)",
                  fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 19,
                  letterSpacing: "-0.015em", color: "var(--text-strong)",
                  marginTop: 3, padding: titulo.trim() ? "1px 0" : "3px 8px",
                  transition: "background 140ms ease, border-color 140ms ease",
                }}
              />
            </div>
            <button
              onClick={onFechar}
              aria-label="Fechar"
              style={{ border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
            >
              <X size={17} />
            </button>
          </div>
          {!nova && (
            <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
              <Badge tone={st.tone}>{st.label}</Badge>
              {priority && <Badge tone="plum">{PRIO_LABEL[priority] ?? priority}</Badge>}
              {marco && <Badge tone={marco.vencida ? "late" : "neutral"}>{marco.label}</Badge>}
            </div>
          )}
        </div>

        {/* corpo */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* ORIGEM — cadeia real Objetivo → Decisão → Tarefa (4C) */}
          {tarefa?.decisaoId && (
            <div
              style={{
                background: "var(--surface-sunken)", border: "1px solid var(--border-hairline)",
                borderRadius: "var(--r-md)", padding: "14px 16px",
              }}
            >
              <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>
                <GitBranch size={13} />
                Origem da tarefa
              </p>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 0 }}>
                <NoOrigem
                  rotulo="objetivo"
                  anel
                  ultimo={false}
                  texto={<span style={{ fontSize: 13.5, fontWeight: 500 }}>{tarefa.origemObjetivo ?? "—"}</span>}
                />
                <NoOrigem
                  rotulo="decisão"
                  anel={false}
                  ultimo={false}
                  texto={
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                      «{tarefa.origemDecisao}»{" "}
                      <Link
                        href={`/eventos/${eventId}/planejamento?decisao=${tarefa.decisaoId}`}
                        style={{ fontSize: 12, fontWeight: 500, color: "var(--accent)" }}
                      >
                        ver decisão ↗
                      </Link>
                    </span>
                  }
                />
                <NoOrigem
                  rotulo="tarefa"
                  anel={false}
                  ultimo
                  texto={<span style={{ fontSize: 13, color: "var(--text-faint)" }}>esta tarefa</span>}
                />
              </div>
            </div>
          )}

          {/* grade de campos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as TarefaStatus)}>
              <option value="pendente">Pendente</option>
              <option value="em_progresso">Em progresso</option>
              <option value="concluido">Concluída</option>
            </Select>
            <Select label="Prioridade" value={priority ?? "media"} onChange={(e) => setPriority(e.target.value)}>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </Select>
            <TextField label="Vencimento" type="date" mono value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <TextField label="Horário" type="time" mono value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Select label="Fornecedor" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Sem fornecedor</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </Select>
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 5 }}>
              <FieldLabel>Responsável</FieldLabel>
              <SegmentedControl
                value={responsavel ?? "cerimonialista"}
                onChange={setResponsavel}
                options={[
                  { value: "cerimonialista", label: "Cerimonial" },
                  { value: "noivos", label: "Noivos" },
                  { value: "ambos", label: "Ambos" },
                ]}
              />
            </div>
            <TextField label="Valor" mono inputMode="decimal" placeholder="R$ 0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
            <TextField label="Local" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Onde acontece" />
            <div style={{ gridColumn: "1 / -1" }}>
              <Select label="Categoria" value={categoria ?? "geral"} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* SECRETÁRIO — seção sempre visível (é onde se descobre que a
              automação existe). Sem fornecedor vinculado ela aparece
              travada, explicando o que falta: nunca some da tela. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <FieldLabel>Disparo automático</FieldLabel>
            <div style={{ border: "1px solid var(--border-hairline)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "var(--surface-sunken)" }}>
                <span style={{ width: 30, height: 30, borderRadius: "var(--r-md)", background: "var(--salvia-50)", color: "var(--salvia-600)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
                  <Send size={15} />
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                    Agendamento automático com fornecedor
                  </p>
                  <p style={{ margin: "1px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>
                    {supplierId
                      ? "envia os seus horários livres por WhatsApp; ele escolhe, a Agenda registra"
                      : "escolha um fornecedor acima para ligar"}
                  </p>
                </div>
                <Switch
                  checked={autoAgendar && Boolean(supplierId)}
                  onChange={setAutoAgendar}
                  disabled={!supplierId}
                  label="Agendamento automático"
                />
              </div>
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12, opacity: supplierId ? 1 : 0.5, pointerEvents: supplierId ? "auto" : "none" }}>
                {/* SUGESTÃO PENDENTE — a bola está com você */}
                {tarefa?.convite?.status === "sugerido" && tarefa.convite.sugestaoData && (
                  <div
                    style={{
                      border: "1px solid var(--state-wait)", background: "var(--state-wait-bg)",
                      borderRadius: "var(--r-md)", padding: "10px 12px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>
                      {tarefa.supplierNome ?? "Fornecedor"} sugeriu outro horário
                    </p>
                    <p className="mono" style={{ margin: "3px 0 0", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-body)" }}>
                      {dataBR(tarefa.convite.sugestaoData)} às {tarefa.convite.sugestaoHora}
                    </p>
                    <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                      <Button
                        size="sm"
                        disabled={pend}
                        onClick={() => {
                          setAvisoDisparo(null);
                          start(async () => {
                            const r = await aprovarSugestao(eventId, tarefa.convite!.id);
                            if ("error" in r) setAvisoDisparo(r.error);
                            else {
                              setAvisoDisparo("Aprovado — está na Agenda e o fornecedor foi avisado.");
                              router.refresh();
                            }
                          });
                        }}
                      >
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={pend}
                        onClick={() => {
                          setAvisoDisparo(null);
                          start(async () => {
                            const r = await recusarSugestao(eventId, tarefa.convite!.id);
                            if ("error" in r) setAvisoDisparo(r.error);
                            else {
                              setAvisoDisparo("Recusado — o fornecedor foi avisado; combine direto com ele.");
                              router.refresh();
                            }
                          });
                        }}
                      >
                        Recusar
                      </Button>
                    </div>
                  </div>
                )}

                {/* QUANDO DISPARAR O CONVITE (anexo 1) */}
                <div
                  style={{
                    borderLeft: "3px solid var(--accent)", background: "var(--surface-sunken)",
                    borderRadius: "var(--r-md)", padding: "11px 13px",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}
                >
                  <p className="mono" style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    Quando disparar o convite
                  </p>

                  {modoDataManual ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
                      <span>Data do convite:</span>
                      <input
                        type="date"
                        value={conviteData}
                        onChange={(e) => setConviteData(e.target.value)}
                        style={{
                          border: "1px solid var(--border-hairline)", borderRadius: "var(--r-sm)",
                          padding: "5px 8px", fontFamily: "var(--font-mono)", fontSize: 12.5,
                          background: "var(--surface-card)", outline: "none",
                        }}
                      />
                      <button
                        onClick={() => setModoDataManual(false)}
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--accent)", fontSize: 12, fontWeight: 600, padding: 0 }}
                      >
                        Usar dias antes do evento
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
                      <span>Quando disparar convite:</span>
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={conviteOffset}
                        onChange={(e) => setConviteOffset(Number(e.target.value))}
                        style={{
                          width: 58, textAlign: "center",
                          border: "1px solid var(--border-hairline)", borderRadius: "var(--r-sm)",
                          padding: "5px 4px", fontFamily: "var(--font-mono)", fontSize: 12.5,
                          background: "var(--surface-card)", outline: "none",
                        }}
                      />
                      <span>dias antes do evento →</span>
                      {conviteCalculada ? (
                        <>
                          <b className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--accent)" }}>
                            Calculado: {dataBR(conviteCalculada)}
                          </b>
                          {dataEvento && (
                            <span className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-faint)" }}>
                              (base {dataBR(dataEvento)})
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--state-wait)" }}>
                          defina a data do evento
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setConviteData(conviteCalculada ?? "");
                          setModoDataManual(true);
                        }}
                        style={{
                          border: "none", cursor: "pointer", borderRadius: "var(--r-pill)",
                          background: "var(--text-strong)", color: "#fff",
                          fontSize: 11, fontWeight: 600, padding: "4px 10px",
                        }}
                      >
                        Editar data
                      </button>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
                    <span>Prazo pro fornecedor escolher:</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={prazoDias}
                      onChange={(e) => setPrazoDias(Number(e.target.value))}
                      style={{
                        width: 48, textAlign: "center",
                        border: "1px solid var(--border-hairline)", borderRadius: "var(--r-sm)",
                        padding: "5px 4px", fontFamily: "var(--font-mono)", fontSize: 12.5,
                        background: "var(--surface-card)", outline: "none",
                      }}
                    />
                    <span>dias</span>
                    <span style={{ color: "var(--text-faint)" }}>·</span>
                    <span>Se não responder, reenviar em:</span>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={reenvioHoras}
                      onChange={(e) => setReenvioHoras(Number(e.target.value))}
                      style={{
                        width: 48, textAlign: "center",
                        border: "1px solid var(--border-hairline)", borderRadius: "var(--r-sm)",
                        padding: "5px 4px", fontFamily: "var(--font-mono)", fontSize: 12.5,
                        background: "var(--surface-card)", outline: "none",
                      }}
                    />
                    <span>h</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
                    <Select
                      label="Duração da reunião"
                      value={String(duracaoMin)}
                      onChange={(e) => setDuracaoMin(Number(e.target.value))}
                      style={{ height: 32, fontSize: 12.5, width: 110 }}
                    >
                      {[30, 45, 60, 90, 120].map((d) => (
                        <option key={d} value={d}>{d} min</option>
                      ))}
                    </Select>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <FieldLabel>Enviar por</FieldLabel>
                      <SegmentedControl<"whatsapp" | "email">
                        value={canalConvite}
                        onChange={setCanalConvite}
                        options={[
                          { value: "whatsapp", label: "WhatsApp" },
                          { value: "email", label: "E-mail" },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Disparar agora + status */}
                {!nova && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={
                        pend ||
                        tarefa?.convite?.status === "respondido" ||
                        tarefa?.convite?.status === "sugerido"
                      }
                      onClick={() => {
                        setAvisoDisparo(null);
                        start(async () => {
                          const r = await dispararConvite(eventId, tarefa!.id);
                          if ("error" in r) setAvisoDisparo(r.error);
                          else {
                            setAvisoDisparo("Convite enviado no WhatsApp.");
                            router.refresh();
                          }
                        });
                      }}
                    >
                      ⚡ Disparar agora manualmente
                    </Button>
                    {tarefa?.convite ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: tarefa.convite.status === "respondido" ? "var(--salvia-600)" : tarefa.convite.status === "expirado" ? "var(--state-late)" : "var(--state-wait)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                        {tarefa.convite.status === "respondido"
                          ? "horário escolhido — está na Agenda"
                          : tarefa.convite.status === "sugerido"
                            ? "sugestão aguardando você"
                            : tarefa.convite.status === "expirado"
                              ? "expirou sem resposta — agende manualmente"
                              : `aguardando resposta (${tarefa.convite.status === "reenviado" ? "reenviado" : "enviado"})`}
                      </span>
                    ) : (
                      autoAgendar &&
                      conviteEfetiva && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--salvia-600)" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                          Status: Agendado para {dataBR(conviteEfetiva)}
                        </span>
                      )
                    )}
                  </div>
                )}
                {avisoDisparo && (
                  <p style={{ margin: 0, fontSize: 12, color: /enviado|Aprovado|Recusado/.test(avisoDisparo) ? "var(--state-ok)" : "var(--state-late)" }}>
                    {avisoDisparo}
                  </p>
                )}

                {/* nota D-x (anexo 1) — e alerta quando está invertido */}
                {dataEvento && dueDate && (() => {
                  const dTarefa = diasEntre(dueDate, dataEvento);
                  const dConvite =
                    modoDataManual && conviteData
                      ? diasEntre(conviteData, dataEvento)
                      : conviteOffset;
                  // convite tem que sair ANTES do vencimento: D maior = mais cedo
                  const invertido = dConvite <= dTarefa;
                  return (
                    <p
                      className="mono"
                      style={{
                        margin: 0, fontFamily: "var(--font-mono)", fontSize: 10.5,
                        color: invertido ? "var(--state-wait)" : "var(--text-faint)",
                        background: invertido ? "var(--state-wait-bg)" : "var(--surface-sunken)",
                        borderRadius: "var(--r-md)", padding: "7px 9px",
                      }}
                    >
                      {invertido
                        ? `O convite sairia em D-${dConvite}, no dia do vencimento (D-${dTarefa}) ou depois — o fornecedor precisa ser chamado antes. Aumente os dias.`
                        : `Tarefa será realizada em D-${dTarefa}, mas convite sai em D-${dConvite} para garantir agenda do fornecedor.`}
                    </p>
                  );
                })()}
              </div>
            </div>
            {!supplierId && (
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-muted)" }}>
                Escolha o fornecedor no campo acima para liberar o disparo.
              </p>
            )}
          </div>

          {/* descrição */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <FieldLabel>Descrição detalhada</FieldLabel>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Contexto, combinados, observações…"
              style={{
                borderRadius: "var(--r-md)", border: "1px solid var(--border-hairline)",
                background: "var(--surface-card)", padding: "9px 11px",
                fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--text-strong)",
                outline: "none", resize: "vertical",
              }}
            />
          </div>

          {/* sub-checklist */}
          {!nova && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FieldLabel>Sub-checklist</FieldLabel>
                {checklist.length > 0 && (
                  <>
                    <span className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                      {feitosCk}/{checklist.length}
                    </span>
                    <div style={{ flex: 1, height: 4, borderRadius: 4, background: "var(--surface-sunken)", overflow: "hidden" }}>
                      <div style={{ width: `${pctCk}%`, height: "100%", background: "var(--salvia-600)", transition: "width 160ms ease" }} />
                    </div>
                    <span className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{pctCk}%</span>
                  </>
                )}
              </div>
              {checklist.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <button
                    onClick={() => togglePasso(c.id, !c.feito)}
                    aria-label={c.feito ? "Desmarcar passo" : "Marcar passo"}
                    style={{
                      width: 17, height: 17, borderRadius: 5, flex: "0 0 auto",
                      border: c.feito ? "none" : "1.5px solid var(--border-strong)",
                      background: c.feito ? "var(--salvia-600)" : "var(--surface-card)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}
                  >
                    {c.feito && <Check size={11} strokeWidth={3} />}
                  </button>
                  <span style={{ flex: 1, fontSize: 13, color: c.feito ? "var(--text-muted)" : "var(--text-body)", textDecoration: c.feito ? "line-through" : "none" }}>
                    {c.texto}
                  </span>
                  <button
                    onClick={() => delPasso(c.id)}
                    aria-label="Remover passo"
                    style={{ border: "none", background: "transparent", color: "var(--text-faint)", cursor: "pointer", padding: 2 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={novoPasso}
                  onChange={(e) => setNovoPasso(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPasso()}
                  placeholder="Adicionar passo…"
                  style={{
                    flex: 1, height: 32, borderRadius: "var(--r-md)",
                    border: "1px dashed var(--border-hairline)", background: "transparent",
                    padding: "0 10px", fontFamily: "var(--font-ui)", fontSize: 12.5,
                    color: "var(--text-strong)", outline: "none",
                  }}
                />
                <Button size="sm" variant="secondary" onClick={addPasso}>
                  <Plus size={13} />
                </Button>
              </div>
            </div>
          )}

          {erro && <p style={{ margin: 0, fontSize: 12.5, color: "var(--state-late)" }}>{erro}</p>}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 22px", borderTop: "1px solid var(--border-hairline)" }}>
          {!nova && (
            <Button variant="ghost" size="sm" onClick={excluir} disabled={pend} style={{ color: "var(--state-late)" }}>
              <Trash2 size={14} />
              Excluir
            </Button>
          )}
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onFechar} disabled={pend}>
            Cancelar
          </Button>
          {/* Nunca desabilitar por campo vazio: o clique explica o que falta
              e leva o foco até lá. Botão morto sem motivo trava a pessoa. */}
          <Button onClick={salvar} disabled={pend}>
            {pend ? "Salvando…" : "Salvar tarefa"}
          </Button>
        </div>
      </aside>
    </>
  );
}

function NoOrigem({
  rotulo,
  texto,
  anel,
  ultimo,
}: {
  rotulo: string;
  texto: React.ReactNode;
  anel: boolean;
  ultimo: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12, flex: "0 0 12px" }}>
        <span
          style={{
            width: 9, height: 9, borderRadius: "50%", marginTop: 4,
            background: anel ? "transparent" : "var(--accent)",
            border: anel ? "2px solid var(--accent-quiet)" : "none",
            flex: "0 0 auto",
          }}
        />
        {!ultimo && <span style={{ width: 2, flex: 1, background: "var(--border-hairline)", marginTop: 2 }} />}
      </div>
      <div style={{ paddingBottom: ultimo ? 0 : 10, minWidth: 0 }}>
        <p className="mono" style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)" }}>
          {rotulo}
        </p>
        <div style={{ marginTop: 1 }}>{texto}</div>
      </div>
    </div>
  );
}

/* ================================================== blocos mantidos */

function PendenciasFinanceiras({
  eventId,
  pendencias,
}: {
  eventId: string;
  pendencias: PendenciaFinanceira[];
}) {
  const router = useRouter();
  const [pend, start] = useTransition();

  return (
    <section
      style={{
        marginBottom: 16, background: "var(--surface-card)",
        border: "1px solid var(--border-hairline)", borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)", padding: "13px 16px",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>
        {pendencias.length === 1
          ? "1 pendência esperando você no Financeiro"
          : `${pendencias.length} pendências esperando você no Financeiro`}
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
        Nada foi lançado — você confirma o valor.
      </p>
      <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {pendencias.map((p) => (
          <li key={p.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 12px", fontSize: 12.5 }}>
            <span style={{ color: "var(--text-strong)" }}>{p.titulo}</span>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              {p.tipo === "revisao" ? "revisar custo de buffet e bar" : "lançar o pagamento"}
            </span>
            <Link href={`/eventos/${eventId}/financeiro`} style={{ fontWeight: 600, color: "var(--accent)", fontSize: 12.5 }}>
              Abrir Financeiro →
            </Link>
            <button
              onClick={() =>
                start(async () => {
                  await descartarPendencia(eventId, p.id);
                  router.refresh();
                })
              }
              disabled={pend}
              style={{ border: "none", background: "transparent", fontSize: 11.5, color: "var(--text-muted)", cursor: "pointer", textDecoration: "underline" }}
            >
              Descartar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BannerDataOrg({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [data, setData] = useState("");
  const [pend, start] = useTransition();
  return (
    <div
      style={{
        marginBottom: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
        border: "1px solid var(--state-wait)", background: "var(--state-wait-bg)",
        borderRadius: "var(--r-lg)", padding: "12px 16px",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>
          Defina a data do casamento
        </p>
        <p style={{ margin: "1px 0 0", fontSize: 12.5, color: "var(--text-body)" }}>
          Sem data, as tarefas ficam sem prazo e a agenda perde referência.
        </p>
      </div>
      <input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        style={{
          borderRadius: "var(--r-md)", border: "1px solid var(--border-hairline)",
          background: "var(--surface-card)", padding: "8px 11px", fontSize: 13.5,
          fontFamily: "var(--font-mono)", color: "var(--text-strong)", outline: "none",
        }}
      />
      <Button
        onClick={() =>
          data &&
          start(async () => {
            await definirDataEvento(eventId, data);
            router.refresh();
          })
        }
        disabled={!data || pend}
      >
        {pend ? "Definindo…" : "Definir data"}
      </Button>
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
  // Nasce "ambos" (o default da própria tabela): compromisso sem
  // responsável não entra na linha do tempo do Portal da Cliente.
  const [responsavel, setResponsavel] = useState("ambos");
  const [supplierId, setSupplierId] = useState("");
  const [observacao, setObservacao] = useState("");
  // Secretário direto na Agenda (080): em vez de escolher o horário, o
  // sistema oferece a sua grade ao fornecedor e ele escolhe.
  const [auto, setAuto] = useState(false);
  const [duracaoMin, setDuracaoMin] = useState(60);
  const [prazoDias, setPrazoDias] = useState(5);
  const [canalNovo, setCanalNovo] = useState<"whatsapp" | "email">("whatsapp");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pend, start] = useTransition();

  function salvar() {
    setErro(null);
    setAviso(null);
    start(async () => {
      const r = await criarCompromisso(eventId, {
        titulo,
        data,
        hora: hora || null,
        local: local || null,
        responsavel: responsavel || null,
        observacao: observacao || null,
        supplierId: supplierId || null,
        agendarAutomatico: auto,
        duracaoMin,
        prazoRespostaDias: prazoDias,
        canal: canalNovo,
      });
      if ("error" in r) setErro(r.error);
      else if (auto) {
        setAviso("Convite enviado — o fornecedor escolhe o horário.");
        setTimeout(onPronto, 1200);
      } else onPronto();
    });
  }

  return (
    <div
      style={{
        marginBottom: 12, background: "var(--surface-sunken)",
        border: "1px solid var(--border-hairline)", borderRadius: "var(--r-lg)", padding: 14,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <TextField
            placeholder="Ex.: Reunião final, prova de vestido, degustação"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            autoFocus
          />
        </div>
        {/* Com agendamento automático o horário é do fornecedor: a data
            vira apenas o limite ("até quando"), e a hora some. */}
        <TextField
          type="date"
          mono
          value={data}
          onChange={(e) => setData(e.target.value)}
          label={auto ? "Marcar até (opcional)" : undefined}
        />
        {auto ? (
          <Select
            label="Duração"
            value={String(duracaoMin)}
            onChange={(e) => setDuracaoMin(Number(e.target.value))}
          >
            {[30, 45, 60, 90, 120].map((d) => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </Select>
        ) : (
          <TextField type="time" mono value={hora} onChange={(e) => setHora(e.target.value)} />
        )}
        <TextField placeholder="Local (opcional)" value={local} onChange={(e) => setLocal(e.target.value)} />
        <Select
          label="Quem comparece"
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
        >
          <option value="ambos">Ambos</option>
          <option value="noivos">Noivos</option>
          <option value="cerimonialista">Cerimonialista</option>
        </Select>
        <div style={{ gridColumn: "1 / -1" }}>
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Sem fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
                {f.temWhatsapp ? "" : " (sem WhatsApp)"}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <TextField placeholder="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
      </div>

      {/* SECRETÁRIO — é aqui que ele mais faz sentido: você quer a reunião,
          não quer escolher o horário nem perguntar. */}
      <div
        style={{
          marginTop: 12, border: "1px solid var(--border-hairline)",
          borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--surface-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px" }}>
          <span style={{ width: 28, height: 28, borderRadius: "var(--r-md)", background: "var(--salvia-50)", color: "var(--salvia-600)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
            <Send size={14} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600 }}>
              Deixar o fornecedor escolher o horário
            </p>
            <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
              {supplierId
                ? "manda sua grade por WhatsApp; quando ele escolher, entra aqui na Agenda"
                : "escolha o fornecedor acima para ligar"}
            </p>
          </div>
          <Switch
            checked={auto && Boolean(supplierId)}
            onChange={setAuto}
            disabled={!supplierId}
            label="Deixar o fornecedor escolher"
          />
        </div>
        {auto && supplierId && (
          <div style={{ padding: "10px 13px", borderTop: "1px solid var(--border-hairline)", background: "var(--surface-sunken)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5 }}>Enviar por</span>
              <SegmentedControl<"whatsapp" | "email">
                value={canalNovo}
                onChange={setCanalNovo}
                options={[
                  { value: "whatsapp", label: "WhatsApp" },
                  { value: "email", label: "E-mail" },
                ]}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12.5 }}>
              <span>Prazo pra responder:</span>
              <input
                type="number"
                min={1}
                max={30}
                value={prazoDias}
                onChange={(e) => setPrazoDias(Number(e.target.value))}
                style={{
                  width: 46, textAlign: "center",
                  border: "1px solid var(--border-hairline)", borderRadius: "var(--r-sm)",
                  padding: "4px", fontFamily: "var(--font-mono)", fontSize: 12.5,
                  background: "var(--surface-card)", outline: "none",
                }}
              />
              <span>dias · sem resposta, você é avisada e combina direto</span>
            </div>
          </div>
        )}
      </div>

      {erro && <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--state-late)" }}>{erro}</p>}
      {aviso && <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--state-ok)" }}>{aviso}</p>}

      <div style={{ marginTop: 11, display: "flex", gap: 8 }}>
        <Button size="sm" onClick={salvar} disabled={pend}>
          {pend
            ? auto
              ? "Enviando convite…"
              : "Salvando…"
            : auto
              ? "Enviar convite ao fornecedor"
              : "Salvar compromisso"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onPronto}>
          Cancelar
        </Button>
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
  const [a, m, d] = c.data.split("-");

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

  const acao: React.CSSProperties = {
    border: "none", background: "transparent", cursor: "pointer",
    fontSize: 11.5, padding: 0, fontFamily: "var(--font-ui)",
  };

  return (
    <div
      style={{
        background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
        borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-sm)", padding: "12px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 52, flex: "0 0 52px", borderRadius: "var(--r-md)",
            background: "var(--salvia-50)", padding: "7px 4px", textAlign: "center",
          }}
        >
          <div className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 600, color: "var(--salvia-600)" }}>
            {MES_ABREV[Number(m) - 1]}
          </div>
          <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 17, lineHeight: 1.15, color: "var(--salvia-800)" }}>
            {Number(d)}
          </div>
          <div className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--salvia-600)" }}>
            {c.hora ?? "—"}
          </div>
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-title)", fontWeight: 600, fontSize: 14.5, color: "var(--text-strong)" }}>
            {c.titulo}
          </p>
          <p style={{ margin: "2px 0 0", display: "flex", flexWrap: "wrap", gap: "0 8px", fontSize: 11.5, color: "var(--text-muted)" }}>
            <span>{prazo(c.data)}</span>
            {c.local && <span>· {c.local}</span>}
            {c.supplierNome && <span>· {c.supplierNome}</span>}
            {c.responsavel && <span style={{ textTransform: "capitalize" }}>· {c.responsavel}</span>}
            <span className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-faint)" }}>
              {a}
            </span>
          </p>
        </div>
        <span className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: estado.cor, flex: "0 0 auto" }}>
          {estado.texto}
        </span>
      </div>

      <div style={{ marginTop: 8, paddingLeft: 66, display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
        {podeConfirmar && c.estado !== "confirmado" && (
          <button onClick={pedirConfirmacao} disabled={pend} style={{ ...acao, color: "var(--accent)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Send size={12} />
            Pedir confirmação
          </button>
        )}
        {c.estado !== "remarcado" && (
          <button onClick={() => mudar("remarcado")} disabled={pend} style={{ ...acao, color: "var(--state-wait)" }}>
            Remarcar
          </button>
        )}
        {c.estado !== "cancelado" && (
          <button onClick={() => mudar("cancelado")} disabled={pend} style={{ ...acao, color: "var(--text-muted)" }}>
            Cancelar
          </button>
        )}
        {(c.estado === "cancelado" || c.estado === "remarcado") && (
          <button onClick={() => mudar("agendado")} disabled={pend} style={{ ...acao, color: "var(--text-muted)" }}>
            Reativar
          </button>
        )}
        <button onClick={excluir} disabled={pend} style={{ ...acao, color: "var(--state-late)" }}>
          Excluir
        </button>
      </div>

      {c.supplierId && !c.supplierWhatsapp && (
        <p style={{ margin: "4px 0 0", paddingLeft: 66, fontSize: 11, color: "var(--text-faint)" }}>
          {c.supplierNome} não tem WhatsApp cadastrado.
        </p>
      )}
      {aviso && <p style={{ margin: "4px 0 0", paddingLeft: 66, fontSize: 11, color: "var(--state-ok)" }}>{aviso}</p>}
      {erro && <p style={{ margin: "4px 0 0", paddingLeft: 66, fontSize: 11, color: "var(--state-late)" }}>{erro}</p>}
    </div>
  );
}
