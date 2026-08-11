"use client";

// Agenda de Fornecedores — duas abas (handoff Celebra Pro):
//   1. Próximas Reuniões: mini-calendário + lista dos compromissos com
//      fornecedor, de TODOS os eventos da cerimonialista. Dado real.
//   2. Grade de Horários: dias/janelas de atendimento, slot padrão, buffer
//      e exceções. É a grade que alimenta o Secretário Executivo.
//
// Adaptações conscientes vs. o mockup: sem "Copiar link de agendamento"
// (não existe link genérico — o magic link é por convite; botão de mentira
// viola a regra de ouro) e shell próprio do app (sem sidebar do protótipo).

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  X,
} from "lucide-react";
import type {
  AgendaFornecedores,
  Excecao,
  ReuniaoFornecedor,
} from "@/lib/supabase/agenda-fornecedores";
import {
  adicionarExcecao,
  removerExcecao,
  salvarGrade,
} from "@/app/(app)/agenda/actions";
import { mudarEstadoCompromisso } from "@/app/(app)/eventos/[id]/organizacao/actions";
import {
  Badge,
  Button,
  FieldLabel,
  Switch,
  type BadgeTone,
} from "@/components/ui/celebra";

type Tab = "reunioes" | "grade";

const DIAS_LONGO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DOW_MONO = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const ESTADO_META: Record<
  ReuniaoFornecedor["estado"],
  { label: string; tone: BadgeTone; barra: string }
> = {
  confirmado: { label: "Confirmada", tone: "ok", barra: "var(--salvia-600)" },
  agendado: { label: "Agendada", tone: "sage", barra: "var(--salvia-300)" },
  remarcado: { label: "Remarcar", tone: "wait", barra: "var(--state-wait)" },
};

function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ================================================================ */

export function AgendaFornecedoresTela({
  dados,
  tabInicial,
}: {
  dados: AgendaFornecedores;
  tabInicial: Tab;
}) {
  const [tab, setTab] = useState<Tab>(tabInicial);

  return (
    <div
      style={{
        fontFamily: "var(--font-ui)",
        color: "var(--text-strong)",
        maxWidth: 1180,
      }}
    >
      {/* eyebrow + título + stats */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span
            className="mono"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--text-muted)",
              border: "1px solid var(--border-hairline)", borderRadius: "var(--r-pill)",
              padding: "4px 10px", background: "var(--surface-card)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--salvia-600)" }} />
            Agenda ativa · fornecedores
          </span>
          <h1
            style={{
              margin: "10px 0 0", fontFamily: "var(--font-title)", fontWeight: 600,
              fontSize: 32, letterSpacing: "-0.02em",
            }}
          >
            Agenda de Fornecedores
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
            Sua disponibilidade e reuniões com fornecedores —{" "}
            <b style={{ color: "var(--cinza-3, #6B6259)", fontWeight: 600 }}>nunca com noivos</b>. Grade
            operacional, válida para todos os eventos.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatCard rotulo="Livres" numero={String(dados.livresSemana)} sub="essa semana" />
          <StatCard
            rotulo="Agendadas"
            numero={String(dados.reunioes.filter((r) => diasAte(r.data) <= 7).length)}
            sub="próximos 7 dias"
          />
          <StatCard
            rotulo="Pendente"
            numero={String(dados.convitesPendentes.length)}
            sub="aguardando"
            corNumero={dados.convitesPendentes.length > 0 ? "var(--state-wait)" : undefined}
          />
        </div>
      </div>

      {/* abas */}
      <div
        style={{
          display: "inline-flex", marginTop: 18, marginBottom: 22,
          background: "var(--surface-sunken)", border: "1px solid var(--border-hairline)",
          borderRadius: "var(--r-pill)", padding: 4, gap: 2,
        }}
      >
        {(
          [
            ["reunioes", "Próximas Reuniões"],
            ["grade", "Grade de Horários"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              border: "none", cursor: "pointer", whiteSpace: "nowrap",
              borderRadius: "var(--r-pill)", padding: "8px 16px",
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: tab === t ? 600 : 500,
              background: tab === t ? "var(--surface-card)" : "transparent",
              color: tab === t ? "var(--text-strong)" : "var(--text-muted)",
              boxShadow: tab === t ? "var(--shadow-sm)" : "none",
              transition: "background 140ms ease, color 140ms ease, box-shadow 140ms ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "reunioes" ? (
        <AbaReunioes dados={dados} onIrGrade={() => setTab("grade")} />
      ) : (
        <AbaGrade dados={dados} />
      )}
    </div>
  );
}

function diasAte(iso: string): number {
  return Math.round(
    (new Date(`${iso}T00:00:00`).getTime() -
      new Date(new Date().toDateString()).getTime()) /
      86_400_000
  );
}

function StatCard({
  rotulo,
  numero,
  sub,
  corNumero,
}: {
  rotulo: string;
  numero: string;
  sub: string;
  corNumero?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
        borderRadius: "var(--r-lg)", padding: "14px 16px", minWidth: 116,
      }}
    >
      <p className="mono" style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        {rotulo}
      </p>
      <p style={{ margin: "3px 0 0", fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 24, color: corNumero ?? "var(--text-strong)" }}>
        {numero}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: "var(--text-faint)" }}>{sub}</p>
    </div>
  );
}

/* ====================================================== ABA 1 */

function AbaReunioes({
  dados,
  onIrGrade,
}: {
  dados: AgendaFornecedores;
  onIrGrade: () => void;
}) {
  const [fEvento, setFEvento] = useState("");
  const [fFornecedor, setFFornecedor] = useState("");
  const [fEstado, setFEstado] = useState("");

  const eventos = useMemo(
    () => [...new Set(dados.reunioes.map((r) => r.casal).filter(Boolean))] as string[],
    [dados.reunioes]
  );
  const fornecedores = useMemo(
    () => [...new Set(dados.reunioes.map((r) => r.fornecedor))],
    [dados.reunioes]
  );

  const visiveis = dados.reunioes.filter(
    (r) =>
      (!fEvento || r.casal === fEvento) &&
      (!fFornecedor || r.fornecedor === fFornecedor) &&
      (!fEstado || r.estado === fEstado)
  );

  const selStyle: React.CSSProperties = {
    height: 40, borderRadius: "var(--r-md)", border: "1px solid var(--border-hairline)",
    background: "var(--surface-card)", padding: "0 10px",
    fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-strong)", outline: "none",
  };

  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px",
        gap: 24, alignItems: "start",
      }}
      className="agenda-grid"
    >
      <style>{`@media (max-width: 900px){ .agenda-grid{ grid-template-columns: 1fr !important } }`}</style>

      <div style={{ minWidth: 0 }}>
        {/* filtros */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <select style={selStyle} value={fEvento} onChange={(e) => setFEvento(e.target.value)}>
            <option value="">Todos os eventos</option>
            {eventos.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <select style={selStyle} value={fFornecedor} onChange={(e) => setFFornecedor(e.target.value)}>
            <option value="">Todos fornecedores</option>
            {fornecedores.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select style={selStyle} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
            <option value="">Todos status</option>
            <option value="confirmado">Confirmada</option>
            <option value="agendado">Agendada</option>
            <option value="remarcado">Remarcar</option>
          </select>
          {(fEvento || fFornecedor || fEstado) && (
            <Button
              variant="secondary"
              onClick={() => {
                setFEvento("");
                setFFornecedor("");
                setFEstado("");
              }}
            >
              Limpar
            </Button>
          )}
        </div>

        {/* lista */}
        {visiveis.length === 0 ? (
          <div
            style={{
              padding: "34px 20px", textAlign: "center",
              background: "var(--surface-card)", border: "1px dashed var(--border-hairline)",
              borderRadius: "var(--r-lg)",
            }}
          >
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Nenhuma reunião marcada</p>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
              Elas nascem quando o fornecedor escolhe um horário pelo convite —
              ou quando você cria um compromisso com fornecedor no evento.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {visiveis.map((r) => (
              <CardReuniao key={r.id} r={r} />
            ))}
          </div>
        )}

        {/* dica */}
        <div
          style={{
            marginTop: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            background: "var(--surface-sunken)", border: "1px solid var(--border-hairline)",
            borderRadius: "var(--r-md)", padding: "12px 16px", fontSize: 12.5,
            color: "var(--text-body)",
          }}
        >
          <b>Dica:</b> fornecedores só veem os horários que você liberou na grade.
          <button
            onClick={onIrGrade}
            style={{
              border: "none", background: "transparent", cursor: "pointer",
              color: "var(--accent)", fontWeight: 600, fontSize: 12.5,
              display: "inline-flex", alignItems: "center", gap: 4, padding: 0,
            }}
          >
            Ajustar grade <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* aside */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <MiniCalendario reunioes={dados.reunioes} />

        {dados.proximoSlot ? (
          <div
            style={{
              background: "var(--text-strong)", color: "#fff",
              borderRadius: "var(--r-lg)", padding: "16px 18px",
            }}
          >
            <p className="mono" style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>
              Próximo slot livre
            </p>
            <p style={{ margin: "6px 0 0", fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 19 }}>
              {DIAS_LONGO[new Date(`${dados.proximoSlot.data}T00:00:00`).getDay()]},{" "}
              {dados.proximoSlot.hora} — {dados.slotPadraoMin}min
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.75 }}>
              {dados.bufferMin > 0
                ? `Buffer automático de ${dados.bufferMin}min após cada reunião.`
                : "Sem intervalo entre reuniões."}
            </p>
          </div>
        ) : (
          <div
            style={{
              background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
              borderRadius: "var(--r-lg)", padding: "16px 18px",
            }}
          >
            <p className="mono" style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Próximo slot livre
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
              Sem grade configurada — ajuste na aba Grade de Horários.
            </p>
          </div>
        )}

        {dados.frequentes.length > 0 && (
          <div
            style={{
              background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
              borderRadius: "var(--r-lg)", padding: "16px 18px",
            }}
          >
            <p className="mono" style={{ margin: "0 0 10px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Fornecedores frequentes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dados.frequentes.map((f) => (
                <div key={f.nome} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 28, height: 28, borderRadius: "50%", flex: "0 0 auto",
                      background: "var(--text-strong)", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10.5, fontWeight: 600,
                    }}
                  >
                    {f.iniciais}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{f.nome}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
                      {f.total} {f.total === 1 ? "reunião" : "reuniões"}
                    </p>
                  </div>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--salvia-600)" }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CardReuniao({ r }: { r: ReuniaoFornecedor }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const meta = ESTADO_META[r.estado];
  const [a, m, d] = r.data.split("-");
  void a;
  const dow = DOW_MONO[new Date(`${r.data}T00:00:00`).getDay()];

  function mudar(estado: "remarcado" | "cancelado") {
    start(async () => {
      await mudarEstadoCompromisso(r.eventId, r.id, estado);
      router.refresh();
    });
  }

  return (
    <div
      style={{
        display: "flex", overflow: "hidden",
        background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
        borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ width: 4, flex: "0 0 4px", background: meta.barra }} />
      <div style={{ display: "flex", gap: 14, padding: "14px 16px", flex: 1, minWidth: 0, alignItems: "flex-start" }}>
        <div
          style={{
            minWidth: 60, flex: "0 0 auto", textAlign: "center",
            background: "var(--surface-sunken)", border: "1px solid var(--border-hairline)",
            borderRadius: "var(--r-md)", padding: "8px 6px",
          }}
        >
          <div className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
            {dow}
          </div>
          <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 18 }}>
            {d}/{m}
          </div>
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600 }}>
              {r.hora ?? "—"}
            </span>
            <span
              style={{
                background: "var(--accent-tint)", color: "var(--ameixa-800, #4A2A40)",
                borderRadius: "var(--r-pill)", padding: "2px 9px", fontSize: 11.5, fontWeight: 600,
              }}
            >
              {r.titulo}
            </span>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
          {r.casal && (
            <p className="mono" style={{ margin: "4px 0 0", fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)" }}>
              {r.casal}
              {r.dataEvento ? ` · evento ${r.dataEvento.split("-").reverse().slice(0, 2).join("/")}` : ""}
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span
              style={{
                width: 24, height: 24, borderRadius: "50%", flex: "0 0 auto",
                background: "var(--text-strong)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9.5, fontWeight: 600,
              }}
            >
              {r.fornecedorIniciais}
            </span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{r.fornecedor}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
                Fornecedor{r.local ? ` · ${r.local}` : ""} · {r.duracaoMin}min
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {r.estado !== "remarcado" && (
              <Button variant="secondary" size="sm" disabled={pend} onClick={() => mudar("remarcado")}>
                Remarcar
              </Button>
            )}
            <Link href={`/eventos/${r.eventId}/organizacao`} style={{ textDecoration: "none" }}>
              <Button variant="ghost" size="sm">Ver no evento</Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              disabled={pend}
              onClick={() => mudar("cancelado")}
              style={{ color: "var(--state-late)" }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCalendario({ reunioes }: { reunioes: ReuniaoFornecedor[] }) {
  const hoje = new Date(new Date().toDateString());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());

  const diasComReuniao = useMemo(() => {
    const s = new Set<string>();
    for (const r of reunioes) s.add(r.data);
    return s;
  }, [reunioes]);

  const primeiro = new Date(ano, mes, 1).getDay();
  const total = new Date(ano, mes + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array(primeiro).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  function passo(delta: number) {
    let m = mes + delta;
    let a = ano;
    if (m < 0) { m = 11; a--; }
    if (m > 11) { m = 0; a++; }
    setMes(m);
    setAno(a);
  }

  return (
    <div
      style={{
        background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
        borderRadius: "var(--r-lg)", padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--font-title)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {MESES[mes]} {ano}
        </span>
        <span style={{ display: "flex", gap: 4 }}>
          <button onClick={() => passo(-1)} aria-label="Mês anterior" style={botaoSeta}>
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => passo(1)} aria-label="Próximo mês" style={botaoSeta}>
            <ChevronRight size={13} />
          </button>
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <div key={i} className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", textAlign: "center", paddingBottom: 4 }}>
            {d}
          </div>
        ))}
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={i} />;
          const iso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const ehHoje = iso === hojeIso();
          const tem = diasComReuniao.has(iso);
          return (
            <div
              key={i}
              style={{
                aspectRatio: "1", borderRadius: "var(--r-sm)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: ehHoje ? "var(--text-strong)" : "transparent",
                color: ehHoje ? "#fff" : "var(--text-body)",
                fontWeight: ehHoje ? 700 : 400, fontSize: 12,
              }}
            >
              {dia}
              {tem && (
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: ehHoje ? "#fff" : "var(--accent)", marginTop: 1 }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 10.5, color: "var(--text-muted)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
          Reunião
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-strong)" }} />
          Hoje
        </span>
      </div>
    </div>
  );
}

const botaoSeta: React.CSSProperties = {
  width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
  border: "1px solid var(--border-hairline)", borderRadius: "var(--r-sm)",
  background: "var(--surface-card)", color: "var(--text-muted)", cursor: "pointer",
};

/* ====================================================== ABA 2 */

type DiaLinha = { on: boolean; inicio: string; fim: string };

function AbaGrade({ dados }: { dados: AgendaFornecedores }) {
  const router = useRouter();

  // estado inicial vindo do banco (uma janela por dia; a primeira vence)
  const [dias, setDias] = useState<DiaLinha[]>(() => {
    const base: DiaLinha[] = Array.from({ length: 7 }, (_, i) => ({
      on: false,
      inicio: i === 0 || i === 6 ? "09:00" : "14:00",
      fim: i === 0 || i === 6 ? "12:00" : "18:00",
    }));
    for (const j of dados.grade) {
      base[j.dia_semana] = {
        on: true,
        inicio: String(j.hora_inicio).slice(0, 5),
        fim: String(j.hora_fim).slice(0, 5),
      };
    }
    return base;
  });
  const [slotMin, setSlotMin] = useState<number>(dados.slotPadraoMin);
  const [bufferMin, setBufferMin] = useState<number>(dados.bufferMin);
  const [excecoes, setExcecoes] = useState<Excecao[]>(dados.excecoes);
  const [novaExcData, setNovaExcData] = useState("");
  const [novaExcLabel, setNovaExcLabel] = useState("");
  const [addExc, setAddExc] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pend, start] = useTransition();

  const resumo = useMemo(() => {
    const ativos = dias
      .map((d, i) => ({ ...d, i }))
      .filter((d) => d.on);
    if (ativos.length === 0) return "nenhum dia ativo";
    return `${ativos.map((d) => DIAS_CURTO[d.i]).join(", ")} · ${ativos[0].inicio}–${ativos[0].fim}`;
  }, [dias]);

  function salvar() {
    setErro(null);
    setSalvo(false);
    start(async () => {
      const janelas = dias
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => d.on)
        .map(({ d, i }) => ({
          dia_semana: i,
          hora_inicio: d.inicio,
          hora_fim: d.fim,
        }));
      const r = await salvarGrade(janelas, slotMin, bufferMin);
      if ("error" in r) setErro(r.error);
      else {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2500);
        router.refresh();
      }
    });
  }

  function adicionarExc() {
    setErro(null);
    start(async () => {
      const r = await adicionarExcecao(novaExcData, novaExcLabel);
      if ("error" in r) setErro(r.error);
      else {
        setExcecoes((e) =>
          [...e, { id: r.id!, data: novaExcData, label: novaExcLabel || null }].sort((a, b) =>
            a.data.localeCompare(b.data)
          )
        );
        setNovaExcData("");
        setNovaExcLabel("");
        setAddExc(false);
      }
    });
  }

  function removerExc(id: string) {
    setExcecoes((e) => e.filter((x) => x.id !== id));
    void removerExcecao(id);
  }

  const campoHora: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: "1px solid var(--border-hairline)", borderRadius: "var(--r-pill)",
    background: "var(--surface-card)", padding: "5px 11px",
  };

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 24, alignItems: "start" }}
      className="agenda-grid"
    >
      <style>{`@media (max-width: 900px){ .agenda-grid{ grid-template-columns: 1fr !important } }`}</style>

      {/* dias de atendimento */}
      <div
        style={{
          background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
          borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-sm)", padding: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-title)", fontWeight: 600, fontSize: 16 }}>
              Dias de atendimento
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
              Quando fornecedores podem agendar com você.
            </p>
          </div>
          <span className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)" }}>
            {resumo}
          </span>
        </div>

        <div style={{ marginTop: 14 }}>
          {dias.map((d, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                padding: "12px 0", borderTop: "1px solid var(--border-hairline)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, width: 140, flex: "0 0 auto" }}>
                <Switch
                  checked={d.on}
                  onChange={(v) => setDias((arr) => arr.map((x, j) => (j === i ? { ...x, on: v } : x)))}
                  label={DIAS_LONGO[i]}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: d.on ? "var(--text-strong)" : "var(--text-faint)" }}>
                  {DIAS_LONGO[i]}
                </span>
              </div>

              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1,
                  opacity: d.on ? 1 : 0.45, pointerEvents: d.on ? "auto" : "none",
                }}
              >
                <span style={campoHora}>
                  <Clock size={13} style={{ color: "var(--text-muted)" }} />
                  <input
                    type="time"
                    value={d.inicio}
                    onChange={(e) => setDias((arr) => arr.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)))}
                    style={{ border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-strong)", width: 66 }}
                  />
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>às</span>
                <span style={campoHora}>
                  <Clock size={13} style={{ color: "var(--text-muted)" }} />
                  <input
                    type="time"
                    value={d.fim}
                    onChange={(e) => setDias((arr) => arr.map((x, j) => (j === i ? { ...x, fim: e.target.value } : x)))}
                    style={{ border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-strong)", width: 66 }}
                  />
                </span>
                <span
                  style={{
                    marginLeft: "auto", background: "var(--salvia-50)", color: "var(--salvia-800)",
                    borderRadius: "var(--r-pill)", padding: "3px 10px", fontSize: 11.5, fontWeight: 600,
                  }}
                >
                  slot {slotMin}min
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* aside */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
            borderRadius: "var(--r-lg)", padding: "16px 18px",
          }}
        >
          <FieldLabel>Duração de cada reunião</FieldLabel>
          <SegmentedNums
            opcoes={[30, 45, 60]}
            valor={slotMin}
            onChange={setSlotMin}
            sufixo=" min"
          />
          <p style={{ margin: "6px 0 14px", fontSize: 11, color: "var(--text-faint)" }}>
            padrão de tarefa nova — cada tarefa pode ajustar a sua
          </p>
          <FieldLabel>Intervalo entre reuniões</FieldLabel>
          <SegmentedNums
            opcoes={[0, 15, 30]}
            valor={bufferMin}
            onChange={setBufferMin}
            rotulos={["Sem", "15 min", "30 min"]}
          />
        </div>

        <div
          style={{
            background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
            borderRadius: "var(--r-lg)", padding: "16px 18px",
          }}
        >
          <FieldLabel>Exceções</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {excecoes.map((e) => {
              const [a, m, d] = e.data.split("-");
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarOff size={14} style={{ color: "var(--state-late)", flex: "0 0 auto" }} />
                  <span className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {d}/{m}/{a}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.label ?? "indisponível"}
                  </span>
                  <button
                    onClick={() => removerExc(e.id)}
                    aria-label="Remover exceção"
                    style={{ border: "none", background: "transparent", color: "var(--text-faint)", cursor: "pointer", padding: 2 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {addExc ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              <input
                type="date"
                value={novaExcData}
                onChange={(e) => setNovaExcData(e.target.value)}
                style={{
                  border: "1px solid var(--border-hairline)", borderRadius: "var(--r-md)",
                  padding: "7px 10px", fontFamily: "var(--font-mono)", fontSize: 12.5, outline: "none",
                }}
              />
              <input
                placeholder="Motivo (ex.: férias)"
                value={novaExcLabel}
                onChange={(e) => setNovaExcLabel(e.target.value)}
                style={{
                  border: "1px solid var(--border-hairline)", borderRadius: "var(--r-md)",
                  padding: "7px 10px", fontFamily: "var(--font-ui)", fontSize: 12.5, outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" onClick={adicionarExc} disabled={pend || !novaExcData}>
                  Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAddExc(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddExc(true)}
              style={{
                marginTop: 10, width: "100%", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 6, padding: "9px 0",
                border: "1px dashed var(--border-strong)", borderRadius: "var(--r-md)",
                background: "transparent", color: "var(--text-muted)", cursor: "pointer",
                fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 500,
              }}
            >
              <Plus size={14} />
              Adicionar exceção
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Button onClick={salvar} disabled={pend} style={{ flex: 1 }}>
            {pend ? "Salvando…" : "Salvar grade"}
          </Button>
          <Button variant="secondary" onClick={() => router.refresh()} disabled={pend}>
            Cancelar
          </Button>
        </div>
        {salvo && (
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--state-ok)", fontWeight: 600 }}>
            Grade salva — vale para todos os eventos.
          </p>
        )}
        {erro && <p style={{ margin: 0, fontSize: 12.5, color: "var(--state-late)" }}>{erro}</p>}
      </div>
    </div>
  );
}

function SegmentedNums({
  opcoes,
  valor,
  onChange,
  sufixo = "",
  rotulos,
}: {
  opcoes: number[];
  valor: number;
  onChange: (v: number) => void;
  sufixo?: string;
  rotulos?: string[];
}) {
  return (
    <div
      style={{
        display: "inline-flex", marginTop: 8,
        background: "var(--surface-sunken)", border: "1px solid var(--border-hairline)",
        borderRadius: "var(--r-md)", padding: 3, gap: 2,
      }}
    >
      {opcoes.map((o, i) => {
        const ativo = o === valor;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              border: "none", cursor: "pointer", borderRadius: 7, padding: "6px 12px",
              fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: ativo ? 600 : 500,
              background: ativo ? "var(--surface-card)" : "transparent",
              color: ativo ? "var(--accent)" : "var(--text-muted)",
              boxShadow: ativo ? "var(--shadow-xs, var(--shadow-sm))" : "none",
              transition: "background 140ms ease",
            }}
          >
            {rotulos?.[i] ?? `${o}${sufixo}`}
          </button>
        );
      })}
    </div>
  );
}
