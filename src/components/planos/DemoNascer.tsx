"use client";

// A demonstração da página de vendas: ela escreve o nome, escolhe o
// tipo, e assiste ao evento nascer — na TELA REAL do sistema.
//
// O que aparece é a tela do evento como ela vai encontrar depois de
// assinar: a barra lateral do app (AppShell), o cabeçalho com a pílula
// de status e o "Modo Evento" (eventos/[id]/layout.tsx), os três cartões
// de fase (FasesDoEvento), o Resumo do Copiloto (ResumoDaFase), as abas
// (EventTabs), os KPIs (ResumoOperacional) — e, embaixo, o Planejamento
// com "Decidir agora" e a Jornada exatamente como ModoFoco os desenha,
// nas cores de celebra.ts. Se a tela do sistema mudar, esta muda junto,
// à mão — o que não pode acontecer é ela ver uma coisa aqui e outra lá.
//
// Roda INTEIRA no navegador. Sem banco, sem conta, sem IA: é uma porta
// pública, e porta pública não chama nada que custe dinheiro nem cria
// nada que precise ser apagado depois. O conteúdo é o retrato do método
// real (demo-metodo.ts); o que ela digita morre quando fecha a aba.
//
// Só o evento é dela. O resto do menu e as outras abas estão trancados,
// e clicar diz por quê.

import { useEffect, useRef, useState } from "react";
import { demoIniciada } from "@/lib/marketing";
import {
  METODO_DA_DEMO,
  type DecisaoDaDemo,
  type TipoDaDemo,
} from "@/components/planos/demo-metodo";

/* ---- as fontes do app (next/font) e a paleta do Planejamento ---- */
const F_TITLE = "var(--font-title), Inter, system-ui, sans-serif";
const F_UI = "var(--font-ui), 'Instrument Sans', system-ui, sans-serif";
const F_MONO = "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace";

// celebra.ts — o tema neutro do Planejamento
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

// AppShell — a barra lateral real, na ordem real
const NAV = [
  "Dashboard", "Eventos", "Orçamentos", "Clientes", "Cerimonialistas", "Fornecedores",
  "Solicitações", "Contratos", "Agenda de Fornecedores", "Tarefas", "Calendário",
  "Financeiro", "Catálogo", "Assinatura", "Configurações", "Ajuda",
];
// EventTabs — as abas reais, na ordem real
const ABAS = [
  "Resumo", "Operação", "Mesas", "Fornecedores", "Contratos", "Comunicação",
  "Financeiro", "Área do cliente", "Histórico",
];

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
function hhmm(base: string, offsetMin: number): string {
  const [h, m] = base.split(":").map(Number);
  const t = (((h * 60 + m + offsetMin) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
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
// celebra.ts → prazoRelativo, as mesmas frases
function prazoRelativo(alvo: Date, hoje: Date): { texto: string; atrasada: boolean } {
  const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  if (dias === 0) return { texto: "vence hoje", atrasada: false };
  if (dias === 1) return { texto: "falta 1 dia", atrasada: false };
  if (dias > 1) return { texto: `faltam ${dias} dias`, atrasada: false };
  if (dias === -1) return { texto: "venceu ontem", atrasada: true };
  return { texto: `venceu há ${-dias} dias`, atrasada: true };
}

// papel.ts → rotuloResponsavel, em miniatura
function respLabel(resp: DecisaoDaDemo["resp"], tipo: TipoDaDemo): string {
  if (resp === "cerimonialista") return "cerimonialista";
  if (resp === "ambos") return "ambos";
  return tipo === "casamento" ? "casal" : "família";
}

export function DemoNascer({ precoDeEntrada }: { precoDeEntrada: string | null }) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoDaDemo>("casamento");
  const [data, setData] = useState("");
  // relógio só depois da hidratação: Date no primeiro render quebra a
  // hidratação em produção
  const [hoje, setHoje] = useState<Date | null>(null);
  useEffect(() => {
    const h = new Date();
    setHoje(h);
    if (!data) {
      const d = new Date(h);
      d.setMonth(d.getMonth() + 8);
      setData(d.toISOString().slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 0 = formulário; 1..5 = o evento nascendo, uma peça por vez
  const [etapa, setEtapa] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function nascer() {
    setErro(null);
    if (nome.trim().length < 2) {
      setErro(tipo === "casamento" ? "Escreva o nome do casal." : "Escreva o nome da debutante.");
      return;
    }
    if (!data) { setErro("Escolha a data."); return; }
    demoIniciada(tipo);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduz) { setEtapa(5); return; }
    setEtapa(1);
    [2, 3, 4, 5].forEach((e, i) => {
      timers.current.push(window.setTimeout(() => setEtapa(e), 750 * (i + 1)));
    });
  }
  function refazer() {
    timers.current.forEach((t) => window.clearTimeout(t));
    setEtapa(0);
    setAviso(null);
  }
  function trancado(oQue: string) {
    setAviso(`${oQue} entra com a assinatura. Na demonstração você vê só o evento nascer.`);
  }

  const m = METODO_DA_DEMO[tipo];
  const nomeLimpo = nome.trim();
  const tituloEvento = `${m.rotulo} — ${nomeLimpo}`;
  const faltam = hoje && data ? Math.round((somarDias(data, 0).getTime() - hoje.getTime()) / 86400000) : null;
  const proximidade = faltam === null ? "" : faltam > 1 ? `Faltam ${faltam} dias` : faltam === 1 ? "Falta 1 dia" : faltam === 0 ? "É hoje" : "Realizado";
  const ativos = m.objetivos.filter((o) => o.ativo);
  const mesesParaODia = faltam === null ? 0 : Math.max(0, Math.round(faltam / 30));

  // ModoFoco → "Decidir agora": as 3 de maior prioridade (o motor real
  // usa greatest(hoje, data − prazo): o que já devia estar decidido
  // aparece vencido, como no sistema)
  const decisoes = ativos.flatMap((o) => o.decisoes.map((d) => ({ ...d, objetivo: o.nome })));
  const criticas = [...decisoes].sort((a, b) => b.dias - a.dias).slice(0, 3);

  // A seção é uma FAIXA, como o fechamento e o CTA final da página: fundo
  // recuado, bordas, título centralizado e a pílula ameixa do topo. É o
  // tratamento que a própria página dá ao que não pode passar batido — o
  // dono viu a versão discreta e pediu destaque, sem sair do tema.
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
            o financeiro esperando o primeiro contrato.
          </p>
          <p style={{ margin: "10px auto 0", maxWidth: "56ch", fontSize: "13.5px", lineHeight: "1.5", color: "#928A81" }}>
            A tela é a do sistema. É uma demonstração: nada fica salvo.
          </p>
        </div>

      {/* ============ a janela: o app de verdade ============ */}
      <div style={{ maxWidth: "980px", margin: "clamp(28px,3.5vw,40px) auto 0", border: "1px solid #E6E0D8", borderRadius: "14px", background: "#fafaf9", overflow: "hidden", boxShadow: "0 1px 2px rgba(34,30,27,.04),0 14px 34px rgba(34,30,27,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "38px", padding: "0 12px", background: "#F2EEE9", borderBottom: "1px solid #E6E0D8" }}>
          <span style={{ display: "flex", gap: "6px", flex: "none" }}>
            {[0, 1, 2].map((i) => <i key={i} style={{ width: "9px", height: "9px", borderRadius: "999px", background: "#D9D2C8", display: "block" }} />)}
          </span>
          <span style={{ flex: "1", display: "flex", alignItems: "center", height: "22px", padding: "0 10px", borderRadius: "6px", background: "#FFFFFF", border: "1px solid #E6E0D8", fontFamily: F_MONO, fontSize: "11.5px", color: "#6B6259", overflow: "hidden", whiteSpace: "nowrap" }}>
            eorganizei.com.br<span style={{ color: "#221E1B", fontWeight: "500" }}>{etapa === 0 ? "/eventos/novo" : `/eventos/${slug(nomeLimpo) || "evento"}`}</span>
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,256px) minmax(0,1fr)", minHeight: "clamp(420px,52vw,640px)" }} data-stack="1">
          {/* AppShell: aside w-64 bg-stone-900 */}
          <nav data-side="1" aria-label="Menu" style={{ background: "#1c1917", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: F_UI }}>
            <span style={{ display: "flex", alignItems: "center", height: "56px", padding: "0 20px", flex: "none", fontFamily: F_TITLE, fontWeight: 600, fontSize: "17px", letterSpacing: "-0.03em", color: "#fafaf9" }}>
              e<span style={{ color: "#B98FAC" }}>organizei</span>
            </span>
            <span style={{ flex: "1", display: "flex", flexDirection: "column", gap: "2px", padding: "0 12px 16px", overflow: "hidden" }}>
              {NAV.map((item) => {
                const aberto = item === "Eventos";
                return (
                  <button key={item} type="button" onClick={() => (aberto ? setAviso(null) : trancado(item))}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", height: "36px", padding: "0 12px", borderRadius: "8px", border: "none", textAlign: "left", fontFamily: "inherit", fontWeight: 500, fontSize: "13.5px", cursor: "pointer", background: aberto ? "#292524" : "transparent", color: aberto ? "#ffffff" : "#a8a29e" }}>
                    {item}
                    {!aberto && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: "12px", height: "12px", flex: "none", opacity: 0.55 }} aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
                    )}
                  </button>
                );
              })}
            </span>
            <span style={{ flex: "none", padding: "12px 20px", borderTop: "1px solid #292524", fontSize: "12px", color: "#78716c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              demonstração
            </span>
          </nav>

          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", fontFamily: F_UI }}>
            {/* AppShell: header h-14 bg-white border-b */}
            <div style={{ height: "56px", display: "flex", alignItems: "center", gap: "12px", padding: "0 24px", background: "#ffffff", borderBottom: "1px solid #e7e5e4", flex: "none" }}>
              <span style={{ fontSize: "14px", color: "#78716c" }}>{hoje ? dataLonga(hoje) : ""}</span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px" }} aria-hidden="true"><path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                <span style={{ width: "28px", height: "28px", borderRadius: "999px", background: "#e7e5e4" }} />
                <span style={{ fontSize: "13.5px", color: "#57534e" }}>você</span>
                <span style={{ fontSize: "13.5px", color: "#78716c" }}>Sair</span>
              </span>
            </div>

            {aviso && (
              <p style={{ margin: "12px 24px 0", padding: "9px 12px", borderRadius: "8px", background: "#F3EBF0", color: "#4A2A40", fontSize: "13px", lineHeight: "1.45" }}>{aviso}</p>
            )}

            {etapa === 0 ? (
              /* ---- o formulário, na cara do app ---- */
              <div style={{ padding: "24px", maxWidth: "460px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#78716c" }}>Eventos / Novo evento</p>
                <h3 style={{ margin: "0 0 18px", fontFamily: F_TITLE, fontWeight: 600, fontSize: "22px", letterSpacing: "-0.02em", color: "#1b1c1e" }}>Novo evento</h3>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#3c4145", marginBottom: "6px" }}>Tipo</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                  {(["casamento", "debutante"] as TipoDaDemo[]).map((t) => (
                    <button key={t} type="button" onClick={() => setTipo(t)}
                      style={{ height: "36px", padding: "0 14px", borderRadius: "8px", border: `1px solid ${tipo === t ? "#6E3F5F" : "#e5e7eb"}`, background: tipo === t ? "#6E3F5F" : "#ffffff", color: tipo === t ? "#ffffff" : "#3c4145", fontFamily: "inherit", fontWeight: 500, fontSize: "13.5px", cursor: "pointer" }}>
                      {METODO_DA_DEMO[t].rotulo}
                    </button>
                  ))}
                </div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#3c4145", marginBottom: "6px" }}>
                  {tipo === "casamento" ? "Nome do casal" : "Nome da debutante"}
                </label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={tipo === "casamento" ? "Marina e Téo" : "Helena"} maxLength={60}
                  style={{ width: "100%", height: "40px", boxSizing: "border-box", padding: "0 12px", borderRadius: "8px", border: "1px solid #d6d3d1", fontFamily: "inherit", fontSize: "14px", color: "#1b1c1e", background: "#ffffff" }} />
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#3c4145", margin: "12px 0 6px" }}>Data</label>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)}
                  style={{ width: "100%", height: "40px", boxSizing: "border-box", padding: "0 12px", borderRadius: "8px", border: "1px solid #d6d3d1", fontFamily: F_MONO, fontSize: "13px", color: "#1b1c1e", background: "#ffffff" }} />
                {erro && <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#96605A" }}>{erro}</p>}
                <button type="button" onClick={nascer} className="pl-h-ameixa"
                  style={{ marginTop: "18px", height: "40px", padding: "0 18px", borderRadius: "8px", border: "none", background: "#6E3F5F", color: "#ffffff", fontFamily: "inherit", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                  Criar evento
                </button>
              </div>
            ) : (
              /* ---- a tela do evento, como no sistema ---- */
              <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* eventos/[id]/layout.tsx — cabeçalho */}
                <div style={{ opacity: etapa >= 1 ? 1 : 0, transition: "opacity .35s" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13.5px", color: "#797e86" }}>← Voltar para eventos</span>
                  <br />
                  <span style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: "999px", padding: "4px 10px", fontSize: "12px", fontWeight: 500, background: "#fffbeb", color: "#b45309" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "currentColor" }} />Orçamento
                  </span>
                  <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 600, fontSize: "24px", letterSpacing: "-0.025em", color: "#1b1c1e" }}>{tituloEvento}</h3>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#a2a6ad" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px" }} aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#797e86" }}>{ddmmaaaa(data)} · {proximidade}</p>
                    </div>
                    <button type="button" onClick={() => trancado("O Modo Evento")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#ffffff", padding: "8px 14px", fontFamily: "inherit", fontSize: "14px", fontWeight: 500, color: "#1b1c1e", cursor: "pointer" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px" }} aria-hidden="true"><path d="M6 4l14 8-14 8V4z" /></svg>
                      Modo Evento
                    </button>
                  </div>
                </div>

                {/* FasesDoEvento */}
                {etapa >= 2 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", overflow: "hidden", borderRadius: "12px", border: "1px solid #f0f0ee", background: "#ffffff" }} data-stack="1">
                    {[
                      ["Planejamento", 0, `${m.totalDecisoes} decisões com prazo`],
                      ["Organização", 0, "Sem fornecedores ou parcelas"],
                      ["Roteiro do dia", 0, `${m.roteiro.length} itens do roteiro`],
                    ].map(([nomeFase, pct, contagem], i) => (
                      <div key={String(nomeFase)} style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "14px 16px 12px", borderLeft: i ? "1px solid #f0f0ee" : "none" }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#1b1c1e" }}>{nomeFase}</span>
                          <span style={{ fontFamily: F_MONO, fontSize: "11px", color: "#a2a6ad" }}>{pct}%</span>
                        </div>
                        <span style={{ fontSize: "12px", lineHeight: 1.35, color: "#797e86" }}>{contagem}</span>
                        <span style={{ marginTop: "6px", display: "block", height: "3px", width: "100%", borderRadius: "999px", background: "#e8e8e4" }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* ResumoDaFase — o Copiloto */}
                {etapa >= 3 && (
                  <div style={{ overflow: "hidden", borderRadius: "12px", border: "1px solid #f0f0ee", background: "#ffffff" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px", borderBottom: "1px solid #f0f0ee", padding: "16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#b07514" }} />
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "#1b1c1e" }}>Resumo do Copiloto</span>
                        <span style={{ fontSize: "13px", color: "#797e86" }}>Planejamento</span>
                      </div>
                      <span style={{ fontSize: "11.5px", color: "#a2a6ad" }}>cálculo por regras · 0% · {m.totalDecisoes} decisões com prazo</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "11px", padding: "16px 18px" }}>
                      {[
                        `${criticas.length} decisões já vencidas — ${criticas[0]?.titulo.toLowerCase() ?? ""}`,
                        "Checklist do evento ainda não montado",
                      ].map((t) => (
                        <span key={t} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12.5px", color: "#33373d" }}>
                          <span style={{ width: "16px", height: "16px", borderRadius: "999px", background: "#f8efdd", color: "#b07514", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", flex: "none" }}>!</span>{t}
                        </span>
                      ))}
                    </div>
                    <div style={{ borderTop: "1px solid #f0f0ee", padding: "12px 18px" }}>
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#33373d" }}>Abrir tarefas →</span>
                    </div>
                  </div>
                )}

                {/* EventTabs */}
                {etapa >= 3 && (
                  <div style={{ display: "flex", gap: "4px", overflowX: "auto", borderBottom: "1px solid #f0f0ee" }}>
                    {ABAS.map((aba, i) => (
                      <button key={aba} type="button" onClick={() => (i === 0 ? setAviso(null) : trancado(`A aba ${aba}`))}
                        style={{ whiteSpace: "nowrap", padding: "10px 12px", marginBottom: "-1px", border: "none", borderBottom: `2px solid ${i === 0 ? "#1b1c1e" : "transparent"}`, background: "transparent", fontFamily: "inherit", fontSize: "14px", fontWeight: 500, color: i === 0 ? "#1b1c1e" : "#797e86", cursor: "pointer" }}>
                        {aba}
                      </button>
                    ))}
                  </div>
                )}

                {/* StatusOperacional + ResumoOperacional */}
                {etapa >= 4 && (
                  <>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "11px", height: "11px", borderRadius: "999px", background: "#f59e0b" }} />
                        <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.01em", color: "#111827" }}>Requer atenção</span>
                      </div>
                      <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[`${criticas.length} decisões vencidas no Planejamento`, "Nenhum fornecedor contratado ainda"].map((t) => (
                          <li key={t} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#374151" }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "15px", height: "15px", flex: "none" }} aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" /></svg>{t}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "12px" }} data-stack="1">
                      {[
                        ["Tarefas", "0/0", "Concluídas"],
                        ["Roteiro do dia", String(m.roteiro.length), "Itens"],
                        ["Fornecedores", "0/0", "Confirmados"],
                        ["Mensagens", "0", "Não lidas"],
                      ].map(([t, v, l]) => (
                        <div key={t} style={{ borderRadius: "12px", border: "1px solid #e5e7eb", background: "#ffffff", padding: "16px", boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}>
                          <span style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151" }}>{t}</span>
                          <span style={{ display: "block", marginTop: "12px", fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em", color: "#111827" }}>{v}</span>
                          <span style={{ display: "block", fontSize: "12px", color: "#6b7280" }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ---- Planejamento (tema neutro), como ModoFoco ---- */}
                {etapa >= 5 && (
                  <div style={{ margin: "8px -24px -24px", padding: "20px 24px 24px", background: C.canvas, fontFamily: F_UI }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "12px" }}>
                      <div>
                        <h3 style={{ ...titulo(22, 28), margin: 0 }}>Planejamento</h3>
                        <p style={{ margin: "2px 0 0", fontSize: "13px", color: C.secundario }}>Construindo o projeto — nada existe fisicamente ainda.</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ ...monoLabel, display: "block" }}>Progresso 0%</span>
                        <span style={{ display: "block", width: "180px", height: "3px", borderRadius: "999px", background: "#e4e6e8", margin: "6px 0 0 auto" }} />
                        <span style={{ display: "block", marginTop: "6px", fontFamily: F_MONO, fontSize: "10px", color: C.meta }}>ponderado por importância · {faltam !== null ? `faltam ${faltam} dias` : ""}</span>
                      </div>
                    </div>

                    <p style={{ margin: "22px 0 10px", ...titulo(15, 20) }}>
                      Decidir agora <span style={{ fontFamily: F_MONO, fontWeight: 400, fontSize: 11, color: C.meta, letterSpacing: 0 }}>{criticas.length} decisões no topo da fila</span>
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "12px" }} data-stack="1">
                      {criticas.map((d, i) => {
                        const p = hoje ? prazoRelativo(somarDias(data, -d.dias), hoje) : null;
                        return (
                          <div key={d.titulo} style={{ border: `1px solid ${C.bordaForte}`, borderRadius: 10, background: "#fff", padding: 14, display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}>
                            <span style={{ ...monoLabel, color: C.meta }}>{d.objetivo}</span>
                            <span style={titulo(16, 22)}>{d.titulo}</span>
                            <span style={{ fontFamily: F_MONO, fontSize: 11, lineHeight: "16px", color: C.secundario }}>
                              {respLabel(d.resp, tipo)}{p ? ` · ${p.texto}` : ""}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                              <button type="button" onClick={() => trancado("Abrir a decisão")}
                                style={{ height: 40, padding: "0 14px", borderRadius: 8, border: i === 0 ? "none" : `1.5px solid ${C.bordaForte}`, background: i === 0 ? C.ameixa : "#fff", color: i === 0 ? "#fff" : C.tinta, fontFamily: F_TITLE, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>
                                Abrir
                              </button>
                              <span style={{ fontFamily: F_UI, fontSize: 12, color: C.meta }}>Não se aplica</span>
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
                      {m.objetivos.map((o, i) => {
                        const aberto = i === 0;
                        const vencidas = hoje ? o.decisoes.filter((d) => somarDias(data, -d.dias).getTime() < hoje.getTime()).length : 0;
                        return (
                          <div key={o.nome} style={{ borderTop: i ? `1px solid ${C.divisoria2}` : "none", padding: "12px 16px", opacity: o.ativo ? 1 : 0.55 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                              <div style={{ minWidth: 0 }}>
                                <span style={{ ...titulo(14, 18), display: "block", textDecoration: o.ativo ? "none" : "line-through" }}>{aberto ? "▾ " : "› "}{o.nome}</span>
                                <span style={{ display: "block", marginTop: 2, fontFamily: F_MONO, fontSize: 10, color: C.meta }}>
                                  objetivo + categoria de verba · {respLabel(o.decisoes[0]?.resp ?? "ambos", tipo)} · previsto R$ 0
                                </span>
                              </div>
                              <span style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
                                <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.meta }}>decisões 0/{o.total}</span>
                                <span style={{ width: 56, height: 3, borderRadius: 999, background: "#e4e6e8" }} />
                              </span>
                            </div>
                            {aberto && (
                              <div style={{ marginTop: 6 }}>
                                {o.decisoes.map((d) => {
                                  const p = hoje ? prazoRelativo(somarDias(data, -d.dias), hoje) : null;
                                  return (
                                    <div key={d.titulo} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: `1px solid ${C.divisoria2}` }}>
                                      <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: p?.atrasada ? C.atrasadaFg : C.pendenteFg, flexShrink: 0 }} />
                                      <span style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ display: "block", fontFamily: F_UI, fontSize: 14, lineHeight: "18px", color: C.tinta, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.titulo}</span>
                                        <span style={{ display: "block", marginTop: 2, fontFamily: F_MONO, fontSize: 10, lineHeight: "14px", color: C.meta }}>{respLabel(d.resp, tipo)}</span>
                                      </span>
                                      {p && (
                                        <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                                          <span style={{ fontFamily: F_MONO, fontSize: 10, color: p.atrasada ? C.atrasadaFg : C.meta }}>{p.texto}</span>
                                          <span style={{ borderRadius: 999, padding: "2px 8px", fontFamily: F_MONO, fontSize: 10, background: p.atrasada ? C.atrasadaBg : C.pendenteBg, color: p.atrasada ? C.atrasadaFg : C.pendenteFg }}>{p.atrasada ? "atrasada" : "pendente"}</span>
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                                {vencidas > 0 && (
                                  <span style={{ display: "block", padding: "10px 0 2px", fontFamily: F_MONO, fontSize: 10, color: C.meta }}>
                                    + {o.total - o.decisoes.length > 0 ? `${o.total - o.decisoes.length} decisões` : "adicionar decisão"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* o roteiro do dia — Operação */}
                    <p style={{ margin: "22px 0 10px", ...titulo(15, 20) }}>
                      Roteiro do dia <span style={{ fontFamily: F_MONO, fontWeight: 400, fontSize: 11, color: C.meta, letterSpacing: 0 }}>{m.ancora} às {m.horaPadrao}</span>
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 6 }}>
                      {m.roteiro.map((r) => (
                        <div key={r.titulo} style={{ display: "flex", alignItems: "center", gap: 10, height: 32, padding: "0 10px", borderRadius: 8, background: "#fff", border: `1px solid ${r.offset === 0 ? C.ameixa : C.bordaSutil}` }}>
                          <b style={{ fontFamily: F_MONO, fontWeight: 500, fontSize: 12, color: C.tinta, flex: "none", width: 40 }}>{hhmm(m.horaPadrao, r.offset)}</b>
                          <span style={{ fontSize: 13, color: C.corpo, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titulo}</span>
                        </div>
                      ))}
                    </div>

                    {/* a saída */}
                    <div style={{ marginTop: 22, padding: "14px 16px", borderRadius: 10, background: "#fff", border: `1px solid ${C.bordaSutil}`, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: C.corpo, maxWidth: "48ch" }}>
                        Isto é o que nasce pronto. Abrir cada decisão, contratar fornecedores, ler o contrato, abrir o portal para {m.cliente} — vem com a assinatura.
                      </span>
                      <span style={{ display: "flex", gap: 10, alignItems: "center", flex: "none" }}>
                        <button type="button" onClick={refazer} style={{ height: 40, padding: "0 14px", borderRadius: 8, border: `1.5px solid ${C.bordaForte}`, background: "#fff", color: C.tinta, fontFamily: F_TITLE, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>Refazer</button>
                        <a href="/comecar" className="pl-h-ameixa" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 40, padding: "0 16px", borderRadius: 8, background: C.ameixa, color: "#fff", textDecoration: "none", fontFamily: F_TITLE, fontWeight: 600, fontSize: 13.5 }}>
                          {precoDeEntrada ? `Criar de verdade por ${precoDeEntrada}` : "Criar de verdade"}
                        </a>
                      </span>
                    </div>
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
