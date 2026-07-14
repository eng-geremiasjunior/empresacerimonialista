// Coluna esquerda da tela de login: apresentação da marca + mockups do
// produto. Os "prints" são versões estáticas simplificadas do Dashboard
// real (KPIs, gráfico, briefing) e da visão mobile do roteiro público,
// renderizadas em frames de notebook/celular via CSS.

import {
  BarChart3,
  CalendarCheck,
  CircleDollarSign,
  Flame,
  Users,
} from "lucide-react";

const DIFERENCIAIS = [
  {
    icon: CalendarCheck,
    title: "Planejamento completo",
    desc: "Cronogramas, checklist e tarefas em um só lugar",
  },
  {
    icon: Users,
    title: "Comunicação automática",
    desc: "Confirmações e lembretes por e-mail com poucos cliques",
  },
  {
    icon: CircleDollarSign,
    title: "Financeiro organizado",
    desc: "Controle de contratos, pagamentos e recebimentos",
  },
  {
    icon: BarChart3,
    title: "Visão clara do seu negócio",
    desc: "Dashboards e relatórios para decidir com confiança",
  },
];

export function VelaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
        <Flame size={compact ? 18 : 20} strokeWidth={2} />
      </span>
      <span
        className={`font-semibold tracking-tight text-gray-900 ${
          compact ? "text-xl" : "text-2xl"
        }`}
      >
        Vela
      </span>
    </div>
  );
}

// Mini-dashboard estático (conteúdo real do sistema, em escala reduzida)
function DashboardMock() {
  return (
    <div className="flex h-full bg-gray-50 text-left">
      {/* sidebar */}
      <div className="hidden w-[68px] shrink-0 flex-col gap-2 border-r border-gray-200 bg-white p-2 sm:flex">
        <div className="mb-1 flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-indigo-600 text-white">
            <Flame size={9} />
          </span>
          <span className="text-[8px] font-semibold text-gray-900">Vela</span>
        </div>
        {["Dashboard", "Eventos", "Calendário", "Tarefas", "Financeiro"].map(
          (item, i) => (
            <span
              key={item}
              className={`rounded px-1.5 py-1 text-[7px] font-medium ${
                i === 0 ? "bg-indigo-50 text-indigo-700" : "text-gray-500"
              }`}
            >
              {item}
            </span>
          )
        )}
      </div>
      {/* conteúdo */}
      <div className="min-w-0 flex-1 space-y-2 p-2.5">
        <div>
          <p className="text-[9px] font-semibold text-gray-900">
            Bom dia! Aqui está o seu dia.
          </p>
          <p className="text-[7px] text-gray-500">
            2 eventos esta semana · 5 tarefas pendentes
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ["Eventos ativos", "8"],
            ["A receber", "R$ 20.000"],
            ["Tarefas hoje", "5"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-md border border-gray-200 bg-white p-1.5"
            >
              <p className="text-[6.5px] text-gray-500">{label}</p>
              <p className="text-[10px] font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
        {/* gráfico de barras */}
        <div className="rounded-md border border-gray-200 bg-white p-1.5">
          <p className="mb-1 text-[6.5px] font-medium text-gray-500">
            Receitas × Despesas
          </p>
          <div className="flex h-9 items-end gap-1">
            {[55, 30, 70, 40, 85, 50, 95, 60, 65, 35, 80, 45].map((h, i) => (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-sm ${
                  i % 2 === 0 ? "bg-indigo-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
        {/* próximos eventos */}
        <div className="rounded-md border border-gray-200 bg-white p-1.5">
          <p className="mb-1 text-[6.5px] font-medium text-gray-500">
            Próximos eventos
          </p>
          {[
            ["Casamento — Luana", "25 JUL", "bg-emerald-400"],
            ["Debutante — Maria Clara", "02 AGO", "bg-indigo-400"],
          ].map(([nome, data, dot]) => (
            <div key={nome} className="flex items-center gap-1 py-0.5">
              <span className={`h-1 w-1 rounded-full ${dot}`} />
              <span className="flex-1 truncate text-[7px] text-gray-700">
                {nome}
              </span>
              <span className="text-[6.5px] text-gray-400">{data}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Visão mobile: roteiro público do fornecedor no dia do evento
function MobileMock() {
  return (
    <div className="h-full space-y-1.5 bg-gray-50 p-2 text-left">
      <p className="text-[8px] font-semibold text-gray-900">
        Roteiro do evento
      </p>
      <p className="text-[6.5px] text-gray-500">Casamento — Luana · Hoje</p>
      {[
        ["16:00", "Chegada do buffet", true],
        ["17:30", "Montagem das mesas", true],
        ["19:00", "Cerimônia", false],
        ["20:30", "Jantar", false],
      ].map(([hora, titulo, feito]) => (
        <div
          key={titulo as string}
          className={`rounded-md border p-1.5 ${
            feito
              ? "border-emerald-200 bg-emerald-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <p className="text-[6.5px] font-semibold text-gray-500">
            {hora as string}
          </p>
          <p className="text-[7.5px] font-medium text-gray-900">
            {titulo as string}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BrandShowcase() {
  return (
    <div className="flex h-full flex-col justify-between gap-10 bg-gradient-to-br from-gray-50 via-indigo-50/40 to-gray-50 px-10 py-10 xl:px-16">
      <div>
        <VelaLogo />

        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Gestão inteligente para cerimonialistas
        </p>
        <h1 className="mt-3 max-w-md text-4xl font-bold leading-tight tracking-tight text-gray-900 xl:text-5xl">
          Organize cada detalhe. Encante em cada evento.
        </h1>
        <p className="mt-4 max-w-md text-gray-600">
          Do orçamento ao dia da festa: eventos, cronogramas, fornecedores e
          financeiro em uma ferramenta feita para quem trabalha com celebrações.
        </p>

        <ul className="mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
          {DIFERENCIAIS.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Icon size={17} strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Mockups: notebook + celular */}
      <div className="relative flex items-end justify-center pb-2">
        {/* notebook */}
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-t-lg border border-gray-300 bg-white shadow-xl">
            {/* barra do "navegador" */}
            <div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-100 px-2.5 py-1.5">
              <span className="h-2 w-2 rounded-full bg-red-300" />
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <span className="ml-2 flex-1 truncate rounded bg-white px-2 py-0.5 text-[7px] text-gray-400">
                app.vela.com.br/dashboard
              </span>
            </div>
            <div className="h-52">
              <DashboardMock />
            </div>
          </div>
          {/* base do notebook */}
          <div className="mx-auto h-2.5 w-[112%] max-w-none -translate-x-[5.5%] rounded-b-xl bg-gray-300" />
        </div>
        {/* celular */}
        <div className="absolute -right-1 bottom-0 hidden w-28 xl:block">
          <div className="overflow-hidden rounded-[14px] border-[3px] border-gray-800 bg-white shadow-2xl">
            <div className="flex justify-center bg-gray-800 py-0.5">
              <span className="h-1 w-8 rounded-full bg-gray-600" />
            </div>
            <div className="h-48">
              <MobileMock />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
