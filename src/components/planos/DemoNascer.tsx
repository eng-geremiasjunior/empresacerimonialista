"use client";

// A demonstração da página de vendas: ela escreve o nome, escolhe o
// tipo, e assiste ao evento nascer — na TELA REAL do sistema.
//
// Desde 29/09/2026 a tela é a do Modelo A: o cabeçalho com a foto de
// capa, o bloco de fases que É a navegação, o "Requer atenção" numa
// linha e a Visão geral. O bloco de fases, o Requer atenção e os
// atalhos do cabeçalho são os COMPONENTES REAIS do app (BlocoDeFases,
// RequerAtencao, LinksDoCabecalho), desenhados com uma navegação sem
// roteador; a barra lateral lê o mesmo menu do AppShell (menu-do-app).
// O resto é cópia à mão, conferida contra um evento recém-criado de
// verdade — se a tela do sistema mudar, esta muda junto. O que não pode
// acontecer é ela ver uma coisa aqui e outra lá.
//
// Roda INTEIRA no navegador. Sem banco, sem conta, sem IA: é uma porta
// pública, e porta pública não chama nada que custe dinheiro nem cria
// nada que precise ser apagado depois. O conteúdo é o retrato do método
// real (demo-metodo.ts); o que ela digita morre quando fecha a aba.
//
// Ela passeia pelas três fases (Planejamento, Organização, Execução) e
// pela Visão geral; o resto está trancado, e clicar diz por quê.

import { useEffect, useRef, useState } from "react";
import { demoIniciada } from "@/lib/marketing";
import {
  METODO_DA_DEMO,
  type DecisaoDaDemo,
  type TipoDaDemo,
} from "@/components/planos/demo-metodo";
import { BlocoDeFases } from "@/components/eventos/BlocoDeFases";
import { RequerAtencao } from "@/components/eventos/RequerAtencao";
import { LinksDoCabecalho } from "@/components/eventos/LinksDoCabecalho";
import { ICONES_DO_MENU, MENU_DO_APP } from "@/lib/menu-do-app";
import type { NavegacaoDoEvento } from "@/lib/fases-do-evento";
import type { FasesEvento } from "@/lib/supabase/resumo-evento";
import type { SaudeAlerta } from "@/lib/saude-evento";
import { rotuloCortejo } from "@/lib/papel";
import { plural } from "@/lib/format";

/* ---- as fontes do app (next/font) ---- */
const F_TITLE = "var(--font-title), Inter, system-ui, sans-serif";
const F_UI = "var(--font-ui), 'Instrument Sans', system-ui, sans-serif";
const F_MONO = "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace";

// celebra.ts — o Planejamento (canvas recuado, ameixa só no "Abrir")
const C = {
  canvas: "#E4E5E7",
  bordaForte: "#A9AEB3",
  bordaSutil: "#DCDFE1",
  divisoria2: "#F0F1F2",
  tinta: "#23262A",
  corpo: "#3C4145",
  secundario: "#5B6167",
  meta: "#8A9096",
  ameixa: "#6E3F5F",
  atrasadaFg: "#96605A",
  atrasadaBg: "#F1EAE8",
  pendenteFg: "#8A7448",
  pendenteBg: "#F1EEE6",
};
const monoLabel: React.CSSProperties = {
  fontFamily: F_MONO,
  fontSize: 10,
  lineHeight: "14px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: C.secundario,
};
const titulo = (px: number, lh: number): React.CSSProperties => ({
  fontFamily: F_TITLE,
  fontWeight: 600,
  fontSize: px,
  lineHeight: `${lh}px`,
  letterSpacing: "-0.02em",
  color: C.tinta,
});
// o cartão do evento (Modelo A)
const cartao: React.CSSProperties = {
  background: "var(--ev-card-bg)",
  border: "1px solid var(--ev-card-border)",
  borderRadius: 14,
  overflow: "hidden",
};

/* ---- datas, sem biblioteca ---- */
function somarDias(iso: string, dias: number): Date {
  const [a, m, d] = iso.split("-").map(Number);
  const x = new Date(a, m - 1, d);
  x.setDate(x.getDate() + dias);
  return x;
}
function ddmmaaaa(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
function slug(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
function dataLonga(d: Date): string {
  const dias = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  return `${dias[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
// O prazo de uma decisão como o motor grava: greatest(hoje, data − dias).
// Num evento que acaba de nascer, o que já devia estar decidido vence hoje.
function prazoDaDecisao(data: string, dias: number, hoje: Date): Date {
  const bruto = somarDias(data, -dias);
  return bruto.getTime() < hoje.getTime() ? hoje : bruto;
}
// celebra.ts → prazoRelativo, as mesmas frases
function prazoRelativo(alvo: Date, hoje: Date): { texto: string; atrasada: boolean } {
  const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  if (dias === 0) return { texto: "vence hoje", atrasada: false };
  if (dias === 1) return { texto: "falta 1 dia", atrasada: false };
  if (dias > 1) return { texto: `faltam ${dias} dias`, atrasada: false };
  if (dias === -1) return { texto: "venceu ontem", atrasada: true };
  return { texto: `venceu há ${-dias} dias`, atrasada: true };
}
function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}
function duracao(min: number | null): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? String(m).padStart(2, "0") : ""}` : `${m}min`;
}

// papel.ts → rotuloResponsavel: casamento = "noivos", debutante = "família"
function respLabel(resp: DecisaoDaDemo["resp"], tipo: TipoDaDemo): string {
  if (resp === "cerimonialista") return "cerimonialista";
  if (resp === "ambos") return "ambos";
  return tipo === "casamento" ? "noivos" : "família";
}

// As telas que a demonstração abre; o resto do evento é trancado.
const VISTAS = new Set(["", "planejamento", "organizacao", "roteiro"]);
const TRANCADO: Record<string, string> = {
  "area-do-cliente": "O que o cliente vê",
  historico: "O histórico de alterações",
  fornecedores: "A aba Fornecedores",
  contratos: "A aba Contratos",
  comunicacao: "A aba Comunicação",
  financeiro: "A aba Financeiro",
  operacao: "A Operação",
  rsvp: "O RSVP",
  mesas: "As mesas",
  cortejo: "O cortejo",
};

// saude-evento.ts: o que um evento recém-criado pelo método pede — ainda
// sem tarefa e sem fornecedor (o roteiro já nasce montado).
const ALERTAS_DO_EVENTO_NOVO: SaudeAlerta[] = [
  {
    texto: "Ainda não há tarefas neste evento",
    aba: "tarefas",
    porque: "Elas nascem das decisões do Planejamento.",
    acao: "Abrir o Planejamento",
    destino: "planejamento",
  },
  {
    texto: "Nenhum fornecedor vinculado ainda",
    aba: "fornecedores",
    acao: "Vincular fornecedor",
    destino: "fornecedores",
  },
];

export function DemoNascer({
  precoDeEntrada,
  saida = null,
}: {
  precoDeEntrada: string | null;
  /**
   * Para onde vai o botão do fim da demonstração. Com o teste de sete
   * dias aberto (154), é o cadastro; fechado, é o checkout — quem decide
   * é a página, que sabe do portão.
   */
  saida?: { href: string; rotulo: string } | null;
}) {
  const [tipo, setTipo] = useState<TipoDaDemo>("casamento");
  // casamento pede noiva e noivo, como o Novo evento de verdade (25b5daf)
  const [noiva, setNoiva] = useState("");
  const [noivo, setNoivo] = useState("");
  const [debutante, setDebutante] = useState("");
  const [data, setData] = useState("");
  // relógio só depois da hidratação: Date no primeiro render quebra a
  // hidratação em produção
  const [hoje, setHoje] = useState<Date | null>(null);
  useEffect(() => {
    const h = inicioDoDia(new Date());
    setHoje(h);
    if (!data) {
      const d = new Date(h);
      d.setMonth(d.getMonth() + 8);
      setData(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 0 = formulário; 1..4 = o evento nascendo, uma peça por vez; 5 = pronto
  const [etapa, setEtapa] = useState(0);
  // a tela aberta dentro do evento ("" = Visão geral)
  const [vista, setVista] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const nome = tipo === "casamento"
    ? [noiva.trim(), noivo.trim()].filter(Boolean).join(" e ")
    : debutante.trim();

  function nascer() {
    setErro(null);
    if (tipo === "casamento" && (noiva.trim().length < 2 || noivo.trim().length < 2)) {
      setErro("Escreva o nome da noiva e o do noivo.");
      return;
    }
    if (tipo === "debutante" && debutante.trim().length < 2) {
      setErro("Escreva o nome da debutante.");
      return;
    }
    if (!data) { setErro("Escolha a data."); return; }
    demoIniciada(tipo);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setVista("");
    setAviso(null);
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduz) { setEtapa(5); return; }
    setEtapa(1);
    [2, 3, 4].forEach((e, i) => {
      timers.current.push(window.setTimeout(() => setEtapa(e), 700 * (i + 1)));
    });
    // pronto: o evento abre o Planejamento, como o "Abrir o Planejamento"
    // do Requer atenção pede — a fase acende e a tela troca no lugar
    timers.current.push(window.setTimeout(() => { setEtapa(5); setVista("planejamento"); }, 700 * 3 + 1900));
  }
  function refazer() {
    timers.current.forEach((t) => window.clearTimeout(t));
    setEtapa(0);
    setVista("");
    setAviso(null);
  }
  function trancado(oQue: string) {
    setAviso(`${oQue} entra com a assinatura. Na demonstração você vê o evento nascer e passeia pelas três fases.`);
  }
  const navegacao: NavegacaoDoEvento = {
    seg: vista,
    ir: (seg) => {
      if (VISTAS.has(seg)) {
        // se ela clicou antes do fim, a animação não passa por cima
        timers.current.forEach((t) => window.clearTimeout(t));
        setEtapa(5);
        setVista(seg);
        setAviso(null);
        return;
      }
      trancado(TRANCADO[seg] ?? "Esta tela");
    },
  };

  const m = METODO_DA_DEMO[tipo];
  const tituloEvento = `${m.rotulo} — ${nome}`;
  const faltam = hoje && data ? Math.round((somarDias(data, 0).getTime() - hoje.getTime()) / 86400000) : null;
  const proximidade = faltam === null ? "" : faltam > 0 ? `faltam ${plural(faltam, "dia", "dias")}` : faltam === 0 ? "é hoje" : "já realizado";
  const ativos = m.objetivos.filter((o) => o.ativo);
  const mesesParaODia = faltam === null ? 0 : Math.max(0, Math.round(faltam / 30));

  // resumo-evento.ts → as três fases de um evento que acaba de nascer
  const fases: FasesEvento = {
    lista: [
      { id: "planejamento", rotulo: "Planejamento", pct: 0, contagem: "Nenhuma tarefa cadastrada", selos: [] },
      { id: "organizacao", rotulo: "Organização", pct: 0, contagem: "Sem fornecedores ou parcelas", selos: [] },
      {
        id: "execucao",
        rotulo: "Roteiro",
        pct: 0,
        contagem: faltam !== null && faltam > 0 ? `Faltam ${plural(faltam, "dia", "dias")}` : "Roteiro não montado",
        selos: [],
      },
    ],
    sugerida: "planejamento",
  };

  // ModoFoco → "Decidir agora": as 3 de maior prioridade
  const decisoes = ativos.flatMap((o) => o.decisoes.map((d) => ({ ...d, objetivo: o.nome })));
  const criticas = [...decisoes].sort((a, b) => b.dias - a.dias).slice(0, 3);

  // planejamento.ts → a janela do objetivo pelo prazo mais próximo:
  // até 30 dias = AGORA; até 90 = PRÓXIMAS; depois = DEPOIS
  const janela = (o: (typeof m.objetivos)[number]): "agora" | "proximas" | "depois" | "nao" => {
    if (!o.ativo) return "nao";
    if (!hoje) return "depois";
    const prox = Math.min(...o.decisoes.map((d) => prazoDaDecisao(data, d.dias, hoje).getTime()));
    const dias = Math.round((prox - hoje.getTime()) / 86400000);
    return dias <= 30 ? "agora" : dias <= 90 ? "proximas" : "depois";
  };
  const JANELAS: { id: "agora" | "proximas" | "depois" | "nao"; rotulo: string }[] = [
    { id: "agora", rotulo: "Agora" },
    { id: "proximas", rotulo: "Próximas" },
    { id: "depois", rotulo: "Depois" },
    { id: "nao", rotulo: "Não se aplica" },
  ];
  const primeiroObjetivo = m.objetivos.find((o) => janela(o) === "agora")?.nome ?? m.objetivos[0]?.nome;

  const campo: React.CSSProperties = {
    width: "100%", height: "40px", boxSizing: "border-box", padding: "0 12px", borderRadius: "8px",
    border: "1px solid #d6d3d1", fontFamily: "inherit", fontSize: "14px", color: "#1b1c1e", background: "#ffffff",
  };
  const rotuloCampo: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 500, color: "#3c4145", margin: "12px 0 6px" };

  // A seção é uma FAIXA, como o fechamento e o CTA final da página: fundo
  // recuado, bordas, título centralizado e a pílula ameixa do topo.
  return (
    <section
      id="experimente"
      style={{
        // o cabeçalho fixo tem 56px: sem esta folga o link "Experimente"
        // pararia com o título escondido atrás dele
        scrollMarginTop: "64px",
        marginTop: "clamp(56px,7vw,88px)",
        padding: "clamp(52px,6vw,80px) 0 clamp(56px,7vw,84px)",
        background: "#F2EEE9",
        borderTop: "1px solid #E6E0D8",
        borderBottom: "1px solid #E6E0D8",
      }}
    >
      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 clamp(20px,4vw,28px)" }}>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              display: "inline-block",
              margin: "0 0 20px",
              padding: "6px 14px",
              borderRadius: "999px",
              background: "#6E3F5F",
              color: "#FAF8F5",
              fontFamily: F_MONO,
              fontSize: "12px",
              fontWeight: "600",
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            Experimente agora
          </p>
          <h2
            style={{
              margin: "0 auto 14px",
              maxWidth: "22ch",
              fontFamily: F_TITLE,
              fontWeight: "700",
              fontSize: "clamp(28px,4.4vw,46px)",
              lineHeight: "1.08",
              letterSpacing: "-0.035em",
              textWrap: "balance",
            }}
          >
            Veja o seu evento nascer.
          </h2>
          <p style={{ margin: "0 auto", maxWidth: "56ch", fontSize: "clamp(16px,1.8vw,18px)", lineHeight: "1.55", color: "#6B6259", textWrap: "pretty" }}>
            Escreva o nome, escolha o tipo e a data — e assista ao que o sistema
            monta sozinho num evento novo: as decisões com prazo, o roteiro do dia,
            as três fases do evento prontas para andar.
          </p>
          <p style={{ margin: "10px auto 0", maxWidth: "56ch", fontSize: "13.5px", lineHeight: "1.5", color: "#928A81" }}>
            A tela é a do sistema. É uma demonstração: nada fica salvo.
          </p>
        </div>

      {/* ============ a janela: o app de verdade ============ */}
      <div style={{ maxWidth: "1040px", margin: "clamp(28px,3.5vw,40px) auto 0", border: "1px solid #E6E0D8", borderRadius: "14px", background: "#fafaf9", overflow: "hidden", boxShadow: "0 1px 2px rgba(34,30,27,.04),0 14px 34px rgba(34,30,27,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "38px", padding: "0 12px", background: "#F2EEE9", borderBottom: "1px solid #E6E0D8" }}>
          <span style={{ display: "flex", gap: "6px", flex: "none" }}>
            {[0, 1, 2].map((i) => <i key={i} style={{ width: "9px", height: "9px", borderRadius: "999px", background: "#D9D2C8", display: "block" }} />)}
          </span>
          <span style={{ flex: "1", display: "flex", alignItems: "center", height: "22px", padding: "0 10px", borderRadius: "6px", background: "#FFFFFF", border: "1px solid #E6E0D8", fontFamily: F_MONO, fontSize: "11.5px", color: "#6B6259", overflow: "hidden", whiteSpace: "nowrap" }}>
            <span data-hide-sm="1">eorganizei.com.br</span><span style={{ color: "#221E1B", fontWeight: "500" }}>{etapa === 0 ? "/eventos/novo" : `/eventos/${slug(nome) || "evento"}${vista ? `/${vista}` : ""}`}</span>
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,232px) minmax(0,1fr)", minHeight: "clamp(420px,52vw,640px)" }} data-stack="1">
          {/* AppShell: a barra lateral, com o MESMO menu (menu-do-app) */}
          <nav data-side="1" aria-label="Menu" style={{ background: "#1c1917", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: F_UI }}>
            <span style={{ display: "flex", alignItems: "center", height: "56px", padding: "0 20px", flex: "none", fontFamily: F_TITLE, fontWeight: 600, fontSize: "17px", letterSpacing: "-0.03em", color: "#fafaf9" }}>
              e<span style={{ color: "#B98FAC" }}>organizei</span>
            </span>
            <span style={{ flex: "1", display: "flex", flexDirection: "column", padding: "0 10px 16px", overflow: "hidden" }}>
              {Array.from(new Set(MENU_DO_APP.map((i) => i.grupo))).map((grupo) => (
                <span key={grupo ?? "solto"} style={{ display: "flex", flexDirection: "column", gap: "2px", paddingTop: "10px" }}>
                  {grupo && (
                    <span style={{ padding: "0 12px 3px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#78716c" }}>{grupo}</span>
                  )}
                  {MENU_DO_APP.filter((i) => i.grupo === grupo).map((item) => {
                    const aberto = item.label === "Eventos";
                    return (
                      <button key={item.label} type="button" onClick={() => (aberto ? setAviso(null) : trancado(item.label))}
                        style={{ display: "flex", alignItems: "center", gap: "10px", height: "34px", padding: "0 12px", borderRadius: "8px", border: "none", textAlign: "left", fontFamily: "inherit", fontWeight: 500, fontSize: "13.5px", cursor: "pointer", background: aberto ? "#292524" : "transparent", color: aberto ? "#ffffff" : "#a8a29e" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }} aria-hidden="true"><path d={ICONES_DO_MENU[item.icon]} /></svg>
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                        {!aberto && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: "11px", height: "11px", flex: "none", opacity: 0.5 }} aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
                        )}
                      </button>
                    );
                  })}
                </span>
              ))}
            </span>
            <span style={{ flex: "none", padding: "12px 20px", borderTop: "1px solid #292524", fontSize: "12px", color: "#78716c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              demonstração
            </span>
          </nav>

          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", fontFamily: F_UI, background: vista === "planejamento" ? C.canvas : "#fafaf9", transition: "background .3s" }}>
            {/* AppShell: header h-14 bg-white border-b */}
            <div data-app-pad="1" style={{ height: "56px", display: "flex", alignItems: "center", gap: "12px", padding: "0 24px", background: "#ffffff", borderBottom: "1px solid #e7e5e4", flex: "none" }}>
              <span data-hide-sm="1" style={{ fontSize: "14px", color: "#78716c" }}>{hoje ? dataLonga(hoje) : ""}</span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }} aria-hidden="true"><path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                <span style={{ width: "28px", height: "28px", borderRadius: "999px", background: "#e7e5e4" }} />
                <span style={{ fontSize: "13.5px", color: "#57534e" }}>você</span>
                <span style={{ fontSize: "13.5px", color: "#78716c" }}>Sair</span>
              </span>
            </div>

            {aviso && (
              <p role="status" data-app-marg="1" style={{ margin: "12px 24px 0", padding: "9px 12px", borderRadius: "8px", background: "#EFEEEC", color: "#22201E", fontSize: "13px", lineHeight: "1.45" }}>{aviso}</p>
            )}

            {etapa === 0 ? (
              /* ---- o formulário, na cara do app ---- */
              <div data-app-pad="1" style={{ padding: "24px", maxWidth: "460px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#78716c" }}>Eventos / Novo evento</p>
                <h3 style={{ margin: "0 0 18px", fontFamily: F_TITLE, fontWeight: 600, fontSize: "22px", letterSpacing: "-0.02em", color: "#1b1c1e" }}>Novo evento</h3>
                <label style={{ ...rotuloCampo, marginTop: 0 }}>Tipo</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "2px" }}>
                  {(["casamento", "debutante"] as TipoDaDemo[]).map((t) => (
                    <button key={t} type="button" onClick={() => setTipo(t)}
                      style={{ height: "36px", padding: "0 14px", borderRadius: "8px", border: `1px solid ${tipo === t ? "#3B3835" : "#e5e7eb"}`, background: tipo === t ? "#3B3835" : "#ffffff", color: tipo === t ? "#ffffff" : "#3c4145", fontFamily: "inherit", fontWeight: 500, fontSize: "13.5px", cursor: "pointer" }}>
                      {METODO_DA_DEMO[t].rotulo}
                    </button>
                  ))}
                </div>
                {tipo === "casamento" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0 10px" }}>
                    <span>
                      <label style={rotuloCampo}>Nome da noiva</label>
                      <input value={noiva} onChange={(e) => setNoiva(e.target.value)} placeholder="Marina" maxLength={40} aria-label="Nome da noiva" style={campo} />
                    </span>
                    <span>
                      <label style={rotuloCampo}>Nome do noivo</label>
                      <input value={noivo} onChange={(e) => setNoivo(e.target.value)} placeholder="Téo" maxLength={40} aria-label="Nome do noivo" style={campo} />
                    </span>
                  </div>
                ) : (
                  <>
                    <label style={rotuloCampo}>Nome da debutante</label>
                    <input value={debutante} onChange={(e) => setDebutante(e.target.value)} placeholder="Helena" maxLength={60} aria-label="Nome da debutante" style={campo} />
                  </>
                )}
                <label style={rotuloCampo}>Data</label>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Data"
                  style={{ ...campo, fontFamily: F_MONO, fontSize: "13px" }} />
                {erro && <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#A5544B" }}>{erro}</p>}
                <button type="button" onClick={nascer} className="ev-btn-primario"
                  style={{ marginTop: "18px", height: "40px", padding: "0 18px", borderRadius: "10px", border: "none", background: "#3B3835", color: "#ffffff", fontFamily: "inherit", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                  Criar evento
                </button>
              </div>
            ) : (
              /* ---- a tela do evento, como no sistema (Modelo A) ---- */
              <div data-app-pad="1" style={{ padding: "18px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* eventos/[id]/layout.tsx — o cabeçalho */}
                <div style={{ opacity: etapa >= 1 ? 1 : 0, transition: "opacity .35s" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontSize: "13px", color: "var(--ev-text-muted)" }}>← Eventos</span>
                  <div className="ev-cabecalho" style={{ display: "flex", minHeight: 190, background: "var(--ev-card-bg)", border: "1px solid var(--ev-card-border)", borderRadius: 14 }}>
                    <button type="button" onClick={() => trancado("A foto de capa")} className="ev-capa"
                      style={{ flex: "0 1 30%", maxWidth: 340, minWidth: 140, border: 0, borderRadius: "13px 0 0 13px", background: "var(--ev-nevoa)", color: "var(--ev-text-muted)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: F_UI, fontSize: 13, cursor: "pointer" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--ev-text-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }} aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-3.1-3.1a2 2 0 00-2.8 0L6 21" /></svg>
                      Adicionar foto de capa
                    </button>
                    <div className="ev-cabecalho-texto" style={{ flex: 1, minWidth: 0, padding: "24px 28px 20px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "16px 24px", alignItems: "flex-end" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, maxWidth: "100%" }}>
                        <span style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: "var(--ev-st-orcamento-bg)", color: "var(--ev-st-orcamento-fg)" }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} />Orçamento
                        </span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }}>
                          {/* 34 e não 40: a janela da demonstração é mais estreita que a tela dela */}
                          <h3 className="ev-titulo" title={tituloEvento} style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 500, fontSize: 34, lineHeight: 1.05, letterSpacing: "-0.025em", color: "var(--ev-text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{tituloEvento}</h3>
                          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ev-text-faint)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, flex: "none" }} aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                        </div>
                        <p style={{ margin: 0, fontFamily: F_MONO, fontSize: 13, letterSpacing: "0.01em", color: "var(--ev-text-body)", whiteSpace: "nowrap" }}>{ddmmaaaa(data)}{proximidade ? ` · ${proximidade}` : ""}</p>
                        <LinksDoCabecalho eventId="demo" navegacao={navegacao} />
                      </div>
                      <div style={{ display: "flex", flex: "none", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
                        <button type="button" onClick={() => trancado("O Modo Evento")} className="ev-btn-secundario"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 16px", borderRadius: 10, border: "1px solid var(--ev-card-border)", background: "var(--ev-card-bg)", fontFamily: F_UI, fontSize: 13.5, fontWeight: 600, color: "var(--ev-text-strong)", cursor: "pointer" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }} aria-hidden="true"><path d="M6 4l14 8-14 8V4z" /></svg>
                          Modo Evento
                        </button>
                        <button type="button" onClick={() => trancado("O menu de ações")} className="ev-btn-primario"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 16px", borderRadius: 10, border: "none", background: "var(--ev-accent)", fontFamily: F_UI, fontSize: 13.5, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                          Ações
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* o bloco de fases — o componente REAL */}
                {etapa >= 2 && (
                  <BlocoDeFases
                    eventId="demo"
                    fases={fases}
                    tipoEvento={tipo}
                    counters={{ fornecedores: 0, comunicacao: 0, financeiro: 0, planejamento: 0, contratos: 0, tarefas: 0 }}
                    pendencias={{ planejar: 1, organizar: 1, executar: 0 }}
                    navegacao={navegacao}
                  />
                )}

                {/* Requer atenção — o componente REAL */}
                {etapa >= 3 && (
                  <RequerAtencao alertas={ALERTAS_DO_EVENTO_NOVO} eventId="demo" navegacao={navegacao} />
                )}

                {/* ============ Visão geral ============ */}
                {etapa >= 4 && vista === "" && (
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", gap: 16, alignItems: "start" }} data-stack="1">
                    <section style={cartao} aria-label="Informações do evento">
                      <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--ev-card-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <span style={{ fontFamily: F_TITLE, fontSize: 16, fontWeight: 600, color: "var(--ev-text-strong)" }}>Informações do evento</span>
                        <button type="button" onClick={() => trancado("Editar os dados")} style={{ border: 0, background: "transparent", fontFamily: F_UI, fontSize: 13, color: "var(--ev-text-muted)", cursor: "pointer" }}>Editar dados</button>
                      </div>
                      <div style={{ padding: "22px 24px", display: "flex", gap: 16, minWidth: 0 }}>
                        <span aria-hidden style={{ width: 52, height: 52, borderRadius: 999, background: "var(--ev-nevoa)", display: "grid", placeItems: "center", fontFamily: F_TITLE, fontSize: 16, fontWeight: 600, color: "var(--ev-text-body)", flex: "none" }}>{iniciais(nome)}</span>
                        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <span style={{ fontFamily: F_TITLE, fontSize: 17, fontWeight: 600, color: "var(--ev-text-strong)", overflowWrap: "anywhere" }}>{nome}</span>
                          <span style={{ fontSize: 12, color: "var(--ev-text-muted)" }}>Cliente</span>
                        </span>
                      </div>
                      <div style={{ margin: "0 24px 24px", padding: "16px 18px", borderRadius: 12, background: "var(--ev-marfim)", border: "1px solid var(--ev-card-border)", display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ev-text-strong)" }}>Observações do evento</span>
                        <span style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ev-text-muted)" }}>Nenhuma observação ainda.</span>
                      </div>
                    </section>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                      <section style={cartao} aria-label="Próximas atividades">
                        <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontFamily: F_TITLE, fontSize: 16, fontWeight: 600, color: "var(--ev-text-strong)" }}>Próximas atividades</span>
                          <button type="button" onClick={() => navegacao.ir("organizacao")} style={{ border: 0, background: "transparent", fontFamily: F_UI, fontSize: 12, color: "var(--ev-text-muted)", cursor: "pointer" }}>Ver todas →</button>
                        </div>
                        <p style={{ margin: 0, padding: "12px 20px 16px", borderTop: "1px solid var(--ev-card-border)", fontSize: 13, color: "var(--ev-text-muted)" }}>Nada agendado para os próximos dias.</p>
                      </section>

                      <section aria-label="Google Agenda" style={{ ...cartao, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                        <span aria-hidden style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--ev-card-border)", display: "grid", placeItems: "center", fontFamily: F_MONO, fontSize: 11, fontWeight: 600, color: "var(--ev-text-muted)", flex: "none" }}>{Number(data.slice(8, 10))}</span>
                        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ev-text-strong)" }}>Google Agenda</span>
                          <span style={{ fontSize: 12, color: "var(--ev-text-muted)" }}>O dia deste evento no seu Google e no celular</span>
                        </span>
                        <button type="button" onClick={() => trancado("A conexão com o Google Agenda")} className="ev-btn-secundario"
                          style={{ height: 32, padding: "0 12px", borderRadius: 10, border: "1px solid var(--ev-card-border)", background: "#fff", fontFamily: F_UI, fontSize: 12.5, fontWeight: 600, color: "var(--ev-text-strong)", cursor: "pointer" }}>Conectar</button>
                      </section>

                      <section aria-label="Ações rápidas" style={{ ...cartao, padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, paddingLeft: 4, color: "var(--ev-text-strong)" }}>Ações rápidas</span>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(88px,1fr))", gap: 8 }}>
                          {[
                            ["Nova tarefa", "M12 4.5v15m7.5-7.5h-15"],
                            ["Adicionar fornecedor", ICONES_DO_MENU.fornecedores],
                            ["Abrir comunicação", "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"],
                            ["Abrir financeiro", ICONES_DO_MENU.financeiro],
                            [rotuloCortejo(tipo), ICONES_DO_MENU.contratos],
                            ["Adicionar observação", ICONES_DO_MENU.cotacoes],
                          ].map(([rotulo, d]) => (
                            <button key={rotulo} type="button" onClick={() => trancado(rotulo)} className="ev-cartao-link"
                              style={{ border: "1px solid var(--ev-card-border)", borderRadius: 10, padding: "12px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", fontFamily: F_UI, fontSize: 12, lineHeight: 1.25, color: "var(--ev-text-body)", background: "#fff", cursor: "pointer" }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }} aria-hidden="true"><path d={d} /></svg>
                              {rotulo}
                            </button>
                          ))}
                        </div>
                      </section>

                      <section aria-label="Perguntar sobre este evento" style={{ ...cartao, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--ev-text-strong)" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ev-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }} aria-hidden="true"><path d={ICONES_DO_MENU.eventos} /></svg>
                          Perguntar sobre este evento
                        </span>
                        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {["O que vence esta semana?", "Quanto falta receber?", "Quais decisões ainda faltam?", "Quais fornecedores já confirmaram?"].map((p) => (
                            <button key={p} type="button" onClick={() => trancado("A pergunta ao evento")} className="ev-pilula"
                              style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid var(--ev-card-border)", background: "#fff", fontFamily: F_UI, fontSize: 12, color: "var(--ev-text-body)", cursor: "pointer" }}>{p}</button>
                          ))}
                        </span>
                        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ flex: 1, height: 40, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 10, border: "1px solid var(--ev-card-border)", fontSize: 13, color: "var(--ev-text-faint)" }}>Ex.: o que falta fechar?</span>
                          <span aria-hidden style={{ width: 40, height: 40, borderRadius: 10, background: "var(--ev-accent)", opacity: 0.5, flex: "none" }} />
                        </span>
                        <span style={{ fontSize: 11, color: "var(--ev-text-muted)" }}>Responde com os dados deste evento. Não altera nada.</span>
                      </section>
                    </div>
                  </div>
                )}

                {/* ============ Planejamento (ModoFoco) ============ */}
                {etapa >= 4 && vista === "planejamento" && (
                  <div style={{ fontFamily: F_UI }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                        <h3 style={{ ...titulo(20, 26), margin: 0 }}>Planejamento</h3>
                        <span style={{ fontFamily: F_MONO, fontSize: 11, color: C.meta }}>progresso 0% · {faltam !== null ? `faltam ${plural(faltam, "dia", "dias")}` : ""}</span>
                      </span>
                      <span style={{ display: "inline-flex", padding: 3, borderRadius: 10, background: "#fff", border: `1px solid ${C.bordaSutil}` }}>
                        <span style={{ padding: "6px 14px", borderRadius: 7, background: C.tinta, color: "#fff", fontSize: 13, fontWeight: 600 }}>Agora</span>
                        <button type="button" onClick={() => trancado("O Caderno do evento")} style={{ padding: "6px 14px", borderRadius: 7, border: 0, background: "transparent", color: C.corpo, fontFamily: F_UI, fontSize: 13, cursor: "pointer" }}>Caderno</button>
                      </span>
                    </div>

                    <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: "#fff", border: `1px solid ${C.bordaSutil}`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px" }}>
                      <span style={{ ...monoLabel, color: C.meta }}>Verba</span>
                      <span style={{ fontSize: 12, color: C.ameixa, textDecoration: "underline" }}>informar verba</span>
                      <span data-hide-sm="1" style={{ width: 120, height: 6, borderRadius: 999, background: "#EDEEEF" }} />
                      <span style={{ fontFamily: F_MONO, fontSize: 11, color: C.corpo }}>R$ 0 previsto · R$ 0 reserva · sem verba</span>
                    </div>

                    <p style={{ margin: "20px 0 10px", ...titulo(15, 20) }}>Decidir agora</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "12px" }} data-stack="1">
                      {criticas.map((d, i) => {
                        const p = hoje ? prazoRelativo(prazoDaDecisao(data, d.dias, hoje), hoje) : null;
                        return (
                          <div key={d.titulo} style={{ border: `1px solid ${C.bordaForte}`, borderRadius: 10, background: "#fff", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                            <span style={{ ...monoLabel, color: C.meta }}>{d.objetivo}</span>
                            <span style={titulo(16, 22)}>{d.titulo}</span>
                            <span style={{ fontFamily: F_MONO, fontSize: 11, lineHeight: "16px", color: C.secundario }}>{p?.texto ?? ""}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                              <button type="button" onClick={() => trancado("Abrir a decisão")}
                                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: i === 0 ? "none" : `1.5px solid ${C.bordaForte}`, background: i === 0 ? C.ameixa : "#fff", color: i === 0 ? "#fff" : C.tinta, fontFamily: F_TITLE, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>
                                Abrir
                              </button>
                              <span style={{ fontSize: 12, color: C.meta }}>Não se aplica</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p style={{ margin: "22px 0 10px", ...titulo(15, 20), display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                      Jornada
                      <span style={{ fontFamily: F_MONO, fontWeight: 400, fontSize: 10, color: C.meta, letterSpacing: "0.04em" }}>
                        {hoje ? MESES[hoje.getMonth()] : ""} · {mesesParaODia} meses para o dia D
                      </span>
                    </p>
                    <div style={{ border: `1px solid ${C.bordaSutil}`, borderRadius: 10, background: "#fff", overflow: "hidden" }}>
                      {JANELAS.map((j) => {
                        const lista = m.objetivos.filter((o) => janela(o) === j.id);
                        if (lista.length === 0) return null;
                        return (
                          <div key={j.id}>
                            <div style={{ padding: "8px 16px", background: "#F7F8F8", borderTop: `1px solid ${C.divisoria2}`, ...monoLabel, color: C.meta }}>{j.rotulo}</div>
                            {lista.map((o) => {
                              const aberto = o.nome === primeiroObjetivo;
                              return (
                                <div key={o.nome} style={{ borderTop: `1px solid ${C.divisoria2}`, padding: "12px 16px", opacity: j.id === "depois" ? 0.62 : 1 }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                    <div style={{ minWidth: 0 }}>
                                      <span style={{ ...titulo(14, 18), display: "block", textDecoration: o.ativo ? "none" : "line-through", color: o.ativo ? C.tinta : C.meta }}>{aberto ? "▾ " : "› "}{o.nome}</span>
                                      {o.ativo && (
                                        <span style={{ display: "block", marginTop: 2, fontFamily: F_MONO, fontSize: 10, color: C.meta }}>
                                          {respLabel(o.decisoes[0]?.resp ?? "ambos", tipo)} · previsto R$ 0
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.meta, flex: "none" }}>{o.ativo ? `decisões 0/${o.total}` : "reativar"}</span>
                                  </div>
                                  {aberto && (
                                    <div style={{ marginTop: 6 }}>
                                      {o.decisoes.map((d) => {
                                        const p = hoje ? prazoRelativo(prazoDaDecisao(data, d.dias, hoje), hoje) : null;
                                        const vencendo = p ? p.atrasada || p.texto === "vence hoje" : false;
                                        return (
                                          <div key={d.titulo} data-linha-cel="1" style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: `1px solid ${C.divisoria2}` }}>
                                            <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: vencendo ? C.atrasadaFg : C.pendenteFg, flexShrink: 0 }} />
                                            <span style={{ flex: 1, minWidth: 0 }}>
                                              <span data-titulo-cel="1" style={{ display: "block", fontSize: 14, lineHeight: "18px", color: C.tinta, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.titulo}</span>
                                              <span style={{ display: "block", marginTop: 2, fontFamily: F_MONO, fontSize: 10, lineHeight: "14px", color: C.meta }}>{respLabel(d.resp, tipo)}</span>
                                            </span>
                                            {p && (
                                              <span data-prazo-cel="1" style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                                                <span style={{ fontFamily: F_MONO, fontSize: 10, color: vencendo ? C.atrasadaFg : C.meta }}>{p.texto}</span>
                                                <span style={{ borderRadius: 999, padding: "2px 8px", fontFamily: F_MONO, fontSize: 10, background: p.atrasada ? C.atrasadaBg : C.pendenteBg, color: p.atrasada ? C.atrasadaFg : C.pendenteFg }}>{p.atrasada ? "atrasada" : "pendente"}</span>
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                      <span style={{ display: "block", padding: "10px 0 2px", fontSize: 12, color: C.meta }}>
                                        {o.total > o.decisoes.length ? `+ ${plural(o.total - o.decisoes.length, "decisão", "decisões")} neste objetivo` : "+ adicionar decisão"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ============ Organização › Tarefas ============ */}
                {etapa >= 4 && vista === "organizacao" && (
                  <div style={{ ...cartao, padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <span style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, background: "var(--ev-nevoa)", flexWrap: "wrap" }}>
                        {["Abertas", "Atrasadas", "Próximos 7 dias", "Concluídas"].map((f, i) => (
                          <span key={f} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 13, fontWeight: i === 0 ? 600 : 400, background: i === 0 ? "#fff" : "transparent", boxShadow: i === 0 ? "0 1px 2px rgba(0,0,0,.06)" : "none", color: f === "Atrasadas" ? "var(--ev-late)" : "var(--ev-text-body)", whiteSpace: "nowrap" }}>{f}</span>
                        ))}
                      </span>
                      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span aria-hidden style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--ev-card-border)", display: "grid", placeItems: "center", color: "var(--ev-text-muted)" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 16, height: 16 }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                        </span>
                        <span style={{ height: 38, display: "inline-flex", alignItems: "center", padding: "0 12px", borderRadius: 10, border: "1px solid var(--ev-card-border)", fontSize: 13, color: "var(--ev-text-body)" }}>Lista ▾</span>
                        <button type="button" onClick={() => trancado("Criar tarefa")} className="ev-btn-primario"
                          style={{ height: 40, padding: "0 16px", borderRadius: 10, border: 0, background: "var(--ev-accent)", color: "#fff", fontFamily: F_UI, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>+ Nova tarefa</button>
                      </span>
                    </div>
                    <p style={{ margin: 0, padding: "4px 4px 0", fontSize: 13.5, color: "var(--ev-text-muted)" }}>Nenhuma tarefa aqui.</p>
                  </div>
                )}

                {/* ============ Execução › Roteiro ============ */}
                {etapa >= 4 && vista === "roteiro" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* o passo do primeiro fornecedor (223b870), como no evento novo */}
                    <div style={{ padding: "16px 18px", borderRadius: 12, border: `1.5px solid ${C.ameixa}`, background: "#FBF8FA", display: "flex", flexDirection: "column", gap: 10 }}>
                      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ev-text-strong)" }}>Mande o roteiro para o primeiro fornecedor</span>
                        <span style={{ fontSize: 13, color: "var(--ev-text-body)" }}>Ele recebe só os horários dele, no celular, sem senha e sem aplicativo.</span>
                      </span>
                      <span style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
                        {["Nome (ex.: Buffet Aurora)", "WhatsApp com DDD (opcional)"].map((ph) => (
                          <span key={ph} style={{ height: 38, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #D6D3D1", background: "#fff", fontSize: 13, color: "var(--ev-text-faint)", overflow: "hidden", whiteSpace: "nowrap" }}>{ph}</span>
                        ))}
                      </span>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {["Buffet", "Decoração", "Música / DJ", "Foto e vídeo", "Cerimônia", "Outro"].map((c) => (
                          <span key={c} style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid #D6D3D1", background: "#fff", fontSize: 12, color: "var(--ev-text-body)" }}>{c}</span>
                        ))}
                      </span>
                      <button type="button" onClick={() => trancado("O link do fornecedor")}
                        style={{ alignSelf: "flex-start", height: 36, padding: "0 16px", borderRadius: 8, border: 0, background: C.ameixa, color: "#fff", fontFamily: F_UI, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Continuar</button>
                    </div>
                    <p style={{ margin: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, ...titulo(16, 22) }}>
                      Roteiro do dia
                      <span style={{ fontFamily: F_MONO, fontWeight: 400, fontSize: 11, color: C.meta, letterSpacing: 0 }}>{plural(m.roteiro.length, "item", "itens")} · 0% do dia</span>
                    </p>
                    {m.roteiro.map((r) => (
                      <div key={r.titulo} style={{ ...cartao, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                        <span aria-hidden style={{ width: 14, height: 14, borderRadius: 999, border: "1.5px solid var(--ev-text-faint)", flex: "none" }} />
                        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontFamily: F_MONO, fontSize: 11, color: "var(--ev-text-muted)" }}>A definir{r.duracao ? ` · ${duracao(r.duracao)}` : ""}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ev-text-strong)" }}>{r.titulo}</span>
                        </span>
                        <span style={{ flex: "none", padding: "3px 9px", borderRadius: 999, background: "var(--ev-nevoa)", fontSize: 11.5, fontWeight: 600, color: "var(--ev-text-muted)" }}>○ Pendente</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ---- a saída ---- */}
                {etapa >= 5 && (
                  <div style={{ padding: "14px 16px", borderRadius: 12, background: "#fff", border: "1px solid var(--ev-card-border)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ev-text-body)", maxWidth: "52ch" }}>
                      Isto é o que nasce pronto. Abrir cada decisão, contratar fornecedores, ler o contrato, abrir o portal para {m.cliente} — vem com a assinatura.
                    </span>
                    <span data-saida-cel="1" style={{ display: "flex", gap: 10, alignItems: "center", flex: "none" }}>
                      <button type="button" onClick={refazer} className="ev-btn-secundario" style={{ height: 40, padding: "0 14px", borderRadius: 10, border: "1px solid var(--ev-card-border)", background: "#fff", color: "var(--ev-text-strong)", fontFamily: F_UI, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Refazer</button>
                      <a href={saida?.href ?? "/criar-conta"} className="pl-h-ameixa" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 40, padding: "0 16px", borderRadius: 10, background: C.ameixa, color: "#fff", textDecoration: "none", fontFamily: F_TITLE, fontWeight: 600, fontSize: 13.5 }}>
                        {saida?.rotulo ?? (precoDeEntrada ? `Criar de verdade por ${precoDeEntrada}` : "Criar de verdade")}
                      </a>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
