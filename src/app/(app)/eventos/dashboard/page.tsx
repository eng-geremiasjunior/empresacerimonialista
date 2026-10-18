import { limparExemploVisto } from "@/app/(app)/eventos/exemplo-actions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  DollarSign,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CSS_DO_DASHBOARD, Cartao, ListaDoRadar, type LinhaDoRadar } from "@/components/dashboard/RadarDoDia";
import { FiltroDoDashboard } from "@/components/dashboard/FiltroDoDashboard";
import { ResumoFinanceiro } from "@/components/dashboard/ResumoFinanceiro";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { DonutCard } from "@/components/dashboard/DonutCard";
import {
  MonthPerformance,
  type PerformanceItem,
} from "@/components/dashboard/MonthPerformance";
import {
  getAlertasCopiloto,
  getBriefingHoje,
  getCotacoesAbertas,
  getEventsByStatus,
  getEventsByType,
  getKpiEventosEmAndamento,
  getKpiFaturamentoMes,
  getPerformanceMes,
  getRecentActivities,
  getResumoFinanceiro,
} from "@/lib/supabase/queries";
import { getSaudeBulk } from "@/lib/supabase/evento";

// Fallback do caso que não deveria existir (ver o comentário abaixo).
const SAUDE_VAZIA: Saude = {
  score: 0,
  nivel: "vermelho",
  alertas: [],
  semDados: true,
};
import { getSaldoEmpresaMes } from "@/lib/supabase/financeiro-empresa";
import { getCarteira } from "@/lib/supabase/carteira";
import type { Saude } from "@/lib/saude-evento";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { conhecaPorDentroDaConta } from "@/lib/conheca-por-dentro";
import { ConhecaPorDentro } from "@/components/evento/ConhecaPorDentro";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type EventStatus,
  type EventType,
} from "@/lib/types";
import type { DonutSlice, Kpi } from "@/lib/dashboard-mock";
import { hojeBR, horaBR, horaMinutoBR, somarDias } from "@/lib/tempo";
import { getPrimeiroAcesso } from "@/lib/supabase/primeiro-acesso";
import { BoasVindas } from "@/components/dashboard/BoasVindas";
import { PassosQueFaltam } from "@/components/dashboard/PassosQueFaltam";
import { ProximosEventosCard, type ProximoEvento } from "@/components/dashboard/ProximosEventosCard";
import { AreasDoPainel } from "@/components/dashboard/AreasDoPainel";
import { areasDoSistema } from "@/lib/areas-do-painel";
import { fotoDoTipo } from "@/lib/fotos-de-evento";

type UpcomingEvent = {
  id: string;
  type: EventType;
  name: string | null;
  date: string;
  time: string | null;
  location: string | null;
  status: EventStatus;
  exemplo: boolean | null;
  cover_image_url: string | null;
  clients: { name: string } | null;
};

/** "hoje", "amanhã", "em 12 dias" — falar em tempo, não em data */
// o cartão "Sua carteira": quatro valores lado a lado, o primeiro maior
const CSS_DA_CARTEIRA = `
.db-carteira{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}
.db-carteira>div{display:flex;flex-direction:column;gap:4px;padding:14px 16px 12px;border-left:1px solid var(--mo-linha,#D8D1C7);min-width:0}
.db-carteira>div:first-child{border-left:0;padding-left:0}
.db-carteira span{font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--mo-cinza-1,#68645E)}
.db-carteira b{font-family:var(--font-title),Inter,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:var(--mo-tinta,#252525)}
.db-carteira b.db-carteira-forte{font-size:28px;color:var(--mo-destaque,#A34F3E)}
.db-carteira em{font-style:normal;font-size:13px;font-weight:600;color:var(--mo-atraso,#9A3B2E)}
@media (max-width:760px){.db-carteira{grid-template-columns:1fr 1fr}.db-carteira>div{padding-left:0;border-left:0;border-top:1px solid var(--mo-linha,#D8D1C7)}.db-carteira>div:nth-child(-n+2){border-top:0}}
`;

function quandoFalta(dataIso: string, hojeIso: string): string {
  const dias = Math.round(
    (Date.UTC(+dataIso.slice(0, 4), +dataIso.slice(5, 7) - 1, +dataIso.slice(8, 10)) -
      Date.UTC(+hojeIso.slice(0, 4), +hojeIso.slice(5, 7) - 1, +hojeIso.slice(8, 10))) /
      86_400_000
  );
  return dias <= 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
}

function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function variation(current: number, previous: number): Pick<Kpi, "sub" | "tone"> {
  if (previous === 0) {
    return { sub: "sem base de comparação", tone: "neutral" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    sub: `${pct >= 0 ? "+" : ""}${pct}% vs. mês anterior`,
    tone: pct > 0 ? "up" : pct < 0 ? "down" : "neutral",
  };
}

// Paleta dessaturada, tom médio (sem neon) — status real do schema:
// orcamento/confirmado/concluido/cancelado (não há "produção"/"entregue").
const STATUS_COLORS: Record<EventStatus, string> = {
  orcamento: "#fbbf24", // amber-400
  confirmado: "#10b981", // emerald-500
  concluido: "#94a3b8", // slate-400
  cancelado: "#f87171", // red-400
};

// Paleta categórica dos 10 tipos reais — tons médios, não neon.
const TYPE_COLORS: Record<EventType, string> = {
  casamento: "#fb7185", // rose-400
  debutante: "#a78bfa", // violet-400
  formatura: "#38bdf8", // sky-400
  aniversario: "#fbbf24", // amber-400
  corporativo: "#64748b", // slate-500
  cha_revelacao: "#2dd4bf", // teal-400
  batizado: "#818cf8", // indigo-400
  bodas: "#22d3ee", // cyan-400
  show: "#f97316", // orange-500
  outro: "#9ca3af", // gray-400
};

export default async function DashboardPage({ searchParams }: { searchParams?: { evento?: string } }) {
  // o exemplo que ela já viu inteiro sai de cena aqui (174)
  await limparExemploVisto();
  const supabase = createClient();
  // "agora" em Brasília, não no fuso do processo. Na Vercel o runtime é
  // UTC: sem isto a saudação diz "Boa noite" às 15h e "hoje" vira amanhã
  // depois das 21h.
  const now = new Date();
  const todayIso = hojeBR(now);

  // Quem acaba de chegar (0 evento de verdade e não pulou) vê as boas-
  // vindas no lugar do painel, antes de qualquer consulta de números.
  const { cargo, empresaId } = await getMeuCargo();
  const primeiroAcesso = await getPrimeiroAcesso(cargo, empresaId);
  if (primeiroAcesso.boasVindas) {
    const porDentroNovo = cargo === "proprietaria" ? await conhecaPorDentroDaConta(empresaId) : null;
    const diaDaSemana = format(new Date(`${todayIso}T12:00:00`), "EEEE", { locale: ptBR })
      .split("-")[0]
      .toUpperCase();
    return (
      <BoasVindas
        saudacao={greeting(horaBR(now))}
        primeiroNome={primeiroAcesso.primeiroNome}
        meta={`${diaDaSemana} · ${formatDate(todayIso)} · ${horaMinutoBR(now)}`}
        mesAtual={Number(todayIso.slice(5, 7)) - 1}
        cargo={cargo}
        porDentro={porDentroNovo}
      />
    );
  }

  const { data } = await supabase
    .from("events")
    .select("id, type, name, date, time, location, status, exemplo, cover_image_url, clients(name)")
    .gte("date", todayIso)
    .in("status", ["orcamento", "confirmado"])
    .order("date", { ascending: true })
    .limit(10);

  const todosOsProximos = (data ?? []) as unknown as UpcomingEvent[];
  // o filtro do alto (16/10/2026): todos os eventos ou um só
  const filtro = todosOsProximos.find((e) => e.id === searchParams?.evento)?.id ?? null;
  const upcoming = filtro ? todosOsProximos.filter((e) => e.id === filtro) : todosOsProximos;

  // as tarefas dos próximos 7 dias (o radar da semana); falha vira lista vazia
  const fimDaSemana = somarDias(todayIso, 7);
  const { data: tarefasDaSemana } = await supabase
    .from("tasks")
    .select("id, title, due_date, event_id, events(name, type, clients(name))")
    .gte("due_date", todayIso)
    .lte("due_date", fimDaSemana)
    .neq("status", "concluido")
    .order("due_date", { ascending: true })
    .limit(filtro ? 60 : 30);

  const [
    saudes,
    briefing,
    alertas,
    financeiro,
    activities,
    kpiEventos,
    kpiFaturamento,
    cotacoesAbertas,
    statusCounts,
    typeCounts,
    performance,
    saldoEmpresa,
    carteira,
  ] = await Promise.all([
    // Eram 10 chamadas de getSaudeEvento e cada uma faz 4 consultas: 40
    // idas ao banco para desenhar 10 anéis. getSaudeBulk faz as mesmas 4
    // para o conjunto inteiro — a listagem de eventos já usava assim.
    getSaudeBulk(upcoming.map((e) => e.id)),
    getBriefingHoje(),
    getAlertasCopiloto(),
    getResumoFinanceiro(),
    getRecentActivities(),
    getKpiEventosEmAndamento(),
    getKpiFaturamentoMes(),
    getCotacoesAbertas(),
    getEventsByStatus(),
    getEventsByType(),
    getPerformanceMes(),
    getSaldoEmpresaMes(),
    getCarteira(),
  ]);
  // Os números do negócio (faturamento, eventos em andamento, em
  // orçamento) são da dona; quem conduz um evento abre o Dashboard para
  // saber o que precisa de atenção, não para ver o caixa.
  const dona = cargo === "proprietaria";
  // o convite para conhecer o sistema por dentro (27/09/2026): conta nova
  // ou com exemplo; só a dona, que é quem decide indicar
  const porDentro = dona ? await conhecaPorDentroDaConta(empresaId) : null;

  // getSaudeBulk devolve uma entrada por id pedido (percorre eventIds,
  // não as linhas), então a falta abaixo não deve acontecer. Se acontecer,
  // o evento não some da lista em silêncio: aparece com saúde vazia e o
  // motivo vai para o log.
  const eventsWithHealth: { event: UpcomingEvent; saude: Saude }[] =
    upcoming.map((event) => {
      const saude = saudes[event.id];
      if (!saude) {
        console.error(`[vela:dashboard] sem saúde para o evento ${event.id}`);
      }
      return { event, saude: saude ?? SAUDE_VAZIA };
    });

  // O álbum dos próximos eventos (29/09/2026): os três primeiros pela
  // data, sem o exemplo, cada um com a capa (ou a foto do tipo) e até três
  // sugestões tiradas da saúde, com o botão de resolver.
  const proximos: ProximoEvento[] = eventsWithHealth
    .filter(({ event }) => !event.exemplo)
    .slice(0, 3)
    .map(({ event, saude }) => {
      const doTipo = fotoDoTipo(event.type);
      const capa = event.cover_image_url;
      return {
        id: event.id,
        titulo:
          event.name ||
          `${EVENT_TYPE_LABELS[event.type]}${event.clients?.name ? ` — ${event.clients.name}` : ""}`,
        linha: [formatDate(event.date), event.time?.slice(0, 5), event.location].filter(Boolean).join(" · "),
        quando: quandoFalta(event.date, todayIso),
        foto: capa ? { ...doTipo, src: capa, posicao: "50% 50%", zoom: 1, foco: "50% 50%" } : doTipo,
        externa: capa ? /^https?:\/\//.test(capa) : false,
        sugestoes: (saude.semDados ? [] : saude.alertas).slice(0, 3).map((a) => ({
          texto: a.texto,
          acao: a.acao,
          href: `/eventos/${event.id}/${a.destino}`,
        })),
      };
    });

  // "O que você encontra aqui": Eventos e Clientes ficam só enquanto não
  // há última tela / último evento neste navegador
  const areas = areasDoSistema(cargo);
  const areaEventos = areas.find((a) => a.href === "/eventos");
  const areaClientes = areas.find((a) => a.href === "/clientes");

  const kpis: { kpi: Kpi; icon: LucideIcon }[] = [
    {
      icon: Calendar,
      kpi: {
        title: "Eventos em andamento",
        value: String(kpiEventos.current),
        ...variation(kpiEventos.current, kpiEventos.previous),
      },
    },
    {
      icon: DollarSign,
      kpi: {
        title: "Faturamento do mês",
        value: formatCurrency(kpiFaturamento.current),
        ...variation(kpiFaturamento.current, kpiFaturamento.previous),
      },
    },
    {
      icon: FileText,
      kpi: {
        title: "Eventos em orçamento",
        value: String(cotacoesAbertas),
        sub: "aguardando confirmação",
        tone: "neutral",
      },
    },
  ];

  const statusSlices: DonutSlice[] = statusCounts.map((s) => ({
    name: EVENT_STATUS_LABELS[s.status],
    value: s.count,
    color: STATUS_COLORS[s.status],
  }));

  const typeSlices: DonutSlice[] = typeCounts.map((t) => ({
    name: EVENT_TYPE_LABELS[t.type],
    value: t.count,
    color: TYPE_COLORS[t.type],
  }));

  const performanceItems: PerformanceItem[] = [
    { label: "Eventos realizados este mês", value: performance.eventosRealizados },
    // A consulta filtra por created_at, não por quando foi confirmado (não
    // existe coluna para isso): são os eventos que ENTRARAM este mês e já
    // estão confirmados. O rótulo passa a dizer isso.
    { label: "Novos eventos já confirmados", value: performance.cotacoesConfirmadas },
    { label: "Tarefas concluídas este mês", value: performance.tarefasConcluidas },
  ];

  // ---- o radar (desenho 7a): em tempo, nunca em status ----
  const diaCurto = (iso: string) => {
    if (iso === todayIso) return "hoje";
    if (iso === somarDias(todayIso, 1)) return "amanhã";
    const d = format(new Date(`${iso}T12:00:00`), "EEE d", { locale: ptBR });
    return d.replace(".", "");
  };
  const haQuanto = (ref: string) => {
    const dias = Math.round((Date.parse(`${todayIso}T00:00:00Z`) - Date.parse(`${ref.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
    if (dias <= 0) return dias === 0 ? "hoje" : `em ${-dias} dias`;
    return dias === 1 ? "ontem" : `há ${dias} dias`;
  };
  const ESPERA = new Set(["fornecedor", "pedido", "aceite"]);
  const linhaDoAlerta = (a: (typeof alertas)[number]): LinhaDoRadar => ({
    chave: a.id,
    quando: haQuanto(a.ref),
    texto: a.texto,
    href: a.href,
  });
  // com filtro, só os alertas daquele evento (o endereço de cada um leva a ele)
  const doFiltro = filtro ? alertas.filter((a) => a.href.includes(filtro)) : alertas;
  const esperando = doFiltro.filter((a) => ESPERA.has(a.tipo)).slice(0, 8).map(linhaDoAlerta);
  const atrasado = doFiltro.filter((a) => !ESPERA.has(a.tipo)).slice(0, 8).map(linhaDoAlerta);
  const nomeDoEvento = (e: { name: string | null; type: EventType; clients: { name: string } | null } | null) =>
    e ? e.name || e.clients?.name || EVENT_TYPE_LABELS[e.type] : null;
  const semana: LinhaDoRadar[] = [
    ...upcoming
      .filter((e) => !e.exemplo && e.date <= fimDaSemana)
      .map((e) => ({
        chave: `ev-${e.id}`,
        ref: e.date,
        quando: diaCurto(e.date),
        destaque: e.date === todayIso,
        evento: nomeDoEvento(e),
        texto: `o evento${e.time ? ` às ${e.time.slice(0, 5)}` : ""}${e.location ? ` · ${e.location}` : ""}`,
        href: `/eventos/${e.id}`,
      })),
    ...((tarefasDaSemana ?? []) as unknown as {
      id: string;
      title: string;
      due_date: string;
      event_id: string | null;
      events: { name: string | null; type: EventType; clients: { name: string } | null } | null;
    }[]).filter((t) => !filtro || t.event_id === filtro).map((t) => ({
      chave: `t-${t.id}`,
      ref: t.due_date,
      quando: diaCurto(t.due_date),
      destaque: t.due_date === todayIso,
      evento: nomeDoEvento(t.events),
      texto: t.title,
      href: t.event_id ? `/eventos/${t.event_id}/organizacao` : "/tarefas",
    })),
  ]
    .sort((a, b) => a.ref.localeCompare(b.ref))
    .slice(0, 12)
    .map(({ ref: _ref, ...l }) => l);

  // a data do alto e a frase em tempo
  const dataDoAlto = (() => {
    const raw = format(new Date(`${todayIso}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR }).replace("-feira", "");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();
  const paraHoje = briefing.eventosHoje + briefing.tarefasHoje;
  const frase = [
    paraHoje > 0 ? `${paraHoje} ${paraHoje === 1 ? "coisa" : "coisas"} para hoje` : "Nada marcado para hoje",
    esperando.length > 0 ? `${esperando.length} ${esperando.length === 1 ? "resposta esperando" : "respostas esperando"}` : null,
    atrasado.length > 0 ? `${atrasado.length} ${atrasado.length === 1 ? "pendência atrasada" : "pendências atrasadas"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const opcoesDoFiltro = todosOsProximos
    .filter((e) => !e.exemplo)
    .map((e) => ({ id: e.id, nome: nomeDoEvento(e) ?? "Evento" }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style dangerouslySetInnerHTML={{ __html: CSS_DO_DASHBOARD + CSS_DA_CARTEIRA }} />
      {/* a data, a frase e o filtro */}
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-title), Inter, sans-serif",
              fontWeight: 500,
              fontSize: "clamp(28px, 4vw, 40px)",
              letterSpacing: "-0.02em",
              color: "#221E1B",
            }}
          >
            {dataDoAlto}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "clamp(16px, 2vw, 18px)", color: "#6B6259" }}>{frase}</p>
        </div>
        {opcoesDoFiltro.length > 1 && <FiltroDoDashboard eventos={opcoesDoFiltro} />}
      </header>

      {/* os passos que faltam depois do primeiro evento, até serem feitos ou dispensados */}
      {primeiroAcesso.passos && <PassosQueFaltam passos={primeiroAcesso.passos} />}
      {porDentro?.mostrar && <ConhecaPorDentro exemploCasamento={porDentro.exemploCasamento} />}

      <div className="db-grade">
        {/* o que pede você: esperando e atrasado, lado a lado */}
        <Cartao
          titulo="Precisa de você"
          conta={esperando.length + atrasado.length}
          classe="db-inteiro"
        >
          <div className="db-duas">
            <div>
              <p className="db-sub">Esperando resposta</p>
              <ListaDoRadar linhas={esperando} vazio="Ninguém esperando resposta." />
            </div>
            <div>
              <p className="db-sub">Atrasado</p>
              <ListaDoRadar linhas={atrasado} vazio="Nada atrasado." />
            </div>
          </div>
        </Cartao>

        {/* o slide dos próximos eventos — pedido dele: fica */}
        <div className="db-largo" style={{ minWidth: 0 }}>
          <ProximosEventosCard eventos={proximos} />
        </div>

        <Cartao titulo="Próximos 7 dias" conta={semana.length} pe={{ href: "/calendario", rotulo: "Ver a agenda" }}>
          <ListaDoRadar linhas={semana} vazio="Nada marcado para esta semana." />
        </Cartao>

        {/* a Carteira da dona (18/10/2026): o dinheiro dela em destaque */}
        {carteira && (
          <Cartao titulo="Sua carteira" classe="db-inteiro" pe={{ href: "/carteira", rotulo: "Abrir a carteira" }}>
            <div className="db-carteira">
              <div>
                <span>A receber das clientes</span>
                <b className="db-carteira-forte">{formatCurrency(carteira.aReceber)}</b>
                {carteira.atrasado > 0 && <em>{formatCurrency(carteira.atrasado)} atrasados</em>}
              </div>
              <div>
                <span>Recebido este mês</span>
                <b>{formatCurrency(carteira.recebidoMes)}</b>
              </div>
              <div>
                <span>Fechado pela página</span>
                <b>{formatCurrency(carteira.vitrine.valor)}</b>
              </div>
              <div>
                <span>Sua parte nos presentes</span>
                <b>{formatCurrency(carteira.presentes.comissao)}</b>
              </div>
            </div>
          </Cartao>
        )}

        {/* só os 2 de "continuar de onde parou"; as áreas estão no menu ☰ */}
        {areaEventos && areaClientes && (
          <div className="db-largo" style={{ minWidth: 0 }}>
            <AreasDoPainel titulo="De onde você parou" semMemoriaTela={areaEventos} semMemoriaEvento={areaClientes} areas={[]} />
          </div>
        )}

        {dona ? (
          <Cartao titulo="Este mês" pe={{ href: "/financeiro", rotulo: "Ver o financeiro" }}>
            <div className="db-numeros">
              {kpis.map(({ kpi }) => (
                <div key={kpi.title} className="db-numero">
                  <span>{kpi.title}</span>
                  <b>{kpi.value}</b>
                </div>
              ))}
            </div>
          </Cartao>
        ) : null}

        {dona && (
          <Cartao titulo="Atividade recente" classe="db-largo">
            <ActivityFeed activities={activities} referenceIso={now.toISOString()} />
          </Cartao>
        )}

        {dona && (
          <Cartao titulo="Eventos por tipo e situação">
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
              <DonutCard title="Por situação" unit="eventos" data={statusSlices} />
              <DonutCard title="Por tipo" unit="eventos" data={typeSlices} />
            </div>
          </Cartao>
        )}

        {dona && (
          <Cartao titulo="Desempenho e caixa" classe="db-inteiro">
            <div style={{ display: "grid", gap: 16, padding: "8px 0" }}>
              <MonthPerformance items={performanceItems} />
              <ResumoFinanceiro data={financeiro} empresa={saldoEmpresa} />
            </div>
          </Cartao>
        )}
      </div>
    </div>
  );
}
