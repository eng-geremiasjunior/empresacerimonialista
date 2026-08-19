"use client";

// Clássico — Creme e Dourado, com calculadora de pacotes.
//
// Substituiu o PropostaV2 (o dono redesenhou o template no Claude Design
// e o handoff hi-fi virou esta implementação). Fiel à SPEC do handoff:
// paleta #F9F5F0/#3C2415/#B8935A/#E8DDD2, Cormorant Garamond + Inter,
// grids fixos com as regras base ANTES das media queries (o bug de
// cascata documentado na própria SPEC §5), fórmula da calculadora em
// calcularProposta — a mesma que a RPC de aceite refaz no banco.
//
// Data-driven de ponta a ponta: pacotes/extras/regra/condições do
// Catálogo; "incluso", "no dia" e "próximos passos" dos blocos da 101
// (banco vazio → copy-padrão de proposta-classico-conteudo.ts, que é a
// mesma que o editor do Catálogo mostra); etapas, depoimentos, fotos e
// stats das tabelas de sempre. Nada de número inventado: stat sem valor
// não aparece.

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ModalAceiteProposta,
  type TemaModal,
} from "@/components/orcamento-publico/ModalAceiteProposta";
import { useCountdownValidade } from "@/components/orcamento-publico/useCountdownValidade";
import {
  brl,
  brlInteiro,
  calcularProposta,
  condicoesDoBanco,
  opcoesParcelamento,
  regraDoBanco,
} from "@/lib/proposta";
import {
  BLOCOS_INCLUSO_CLASSICO,
  BLOCOS_NO_DIA_CLASSICO,
  BLOCOS_PROXIMOS_CLASSICO,
  CITACAO_CLASSICO,
  DEPOIMENTOS_CLASSICO,
  ETAPAS_CLASSICO,
  SUB_INVESTIMENTO_CLASSICO,
} from "@/lib/proposta-classico-conteudo";
import type {
  BlocoPublico,
  ComentarioPublico,
  OrcamentoPublicoData,
} from "@/lib/orcamento-publico";

/* ---------------- tokens da SPEC ---------------- */

const COR = {
  pagina: "#F9F5F0",
  card: "#FDFCFB",
  branco: "#FFFFFF",
  escuro: "#3C2415",
  texto2: "#6B5A4B",
  texto3: "#8B7355",
  dourado: "#B8935A",
  borda: "#E8DDD2",
  verde: "#3CA37A",
  premium: "#FFF9F0",
};

const SERIF = "var(--font-titulo), 'Cormorant Garamond', serif";
const SANS = "var(--font-inter), 'Inter', sans-serif";

const TEMA_MODAL: TemaModal = {
  fundo: "rgba(60,36,21,0.55)",
  card: COR.branco,
  texto: COR.escuro,
  textoSuave: COR.texto2,
  borda: COR.borda,
  acento: COR.dourado,
  botaoFundo: COR.escuro,
  botaoTexto: "#FFFFFF",
  raio: 24,
};

const NAV = [
  ["apresentacao", "APRESENTAÇÃO"],
  ["quem-somos", "QUEM SOMOS"],
  ["incluso", "O QUE ESTÁ INCLUSO"],
  ["como-funciona", "COMO FUNCIONA"],
  ["no-dia", "NO DIA DO CASAMENTO"],
  ["investimento", "INVESTIMENTO"],
  ["eventos", "EVENTOS REALIZADOS"],
  ["depoimentos", "DEPOIMENTOS"],
  ["proximos", "PRÓXIMOS PASSOS"],
] as const;

/* ícones de contorno (SPEC §7): nada de emoji */
const ICONE_PATH: Record<string, string> = {
  relogio: "M12 6v6l4 2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  trofeu:
    "M8 21h8 M12 17v4 M7 4h10v5a5 5 0 0 1-10 0V4z M7 6H4a2 2 0 0 0 2 4h1 M17 6h3a2 2 0 0 1-2 4h-1",
  brilho:
    "M12 3l1.9 5.8L20 10.7l-5 3.9 1.7 6.1L12 17l-4.7 3.7L9 14.6l-5-3.9 6.1-.9L12 3z",
  coracao:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z",
  presente:
    "M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
  camera:
    "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  flor: "M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m4.5 3a4.5 4.5 0 1 1-4.5 4.5M16.5 12H15m-3 4.5A4.5 4.5 0 1 1 7.5 12M12 16.5V15m-4.5-3H9m3 0h.01",
  talheres:
    "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2 M7 2v20 M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7",
  musica: "M9 18V5l12-2v13 M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  pessoas:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
};

function Icone({
  nome,
  tamanho = 18,
  cor = COR.texto2,
}: {
  nome: string | null;
  tamanho?: number;
  cor?: string;
}) {
  const d = ICONE_PATH[nome ?? ""] ?? ICONE_PATH.brilho;
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {d.split(" M").map((seg, i) => (
        <path key={i} d={(i === 0 ? "" : "M") + seg} />
      ))}
    </svg>
  );
}

const dataBr = (iso: string | null) => {
  if (!iso) return "A definir";
  const [a, m, d] = iso.slice(0, 10).split("-");
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${Number(d)} de ${meses[Number(m) - 1]} ${a}`;
};

/* ================================================================ */

export function PropostaCasamentoClassico({
  hash,
  inicial,
}: {
  hash: string;
  inicial: OrcamentoPublicoData;
}) {
  const dados = inicial;
  const inst = dados.institucional;

  /* ---------- conteúdo: banco → padrão ---------- */
  const blocosBanco = dados.blocos ?? [];
  const porSecao = (s: BlocoPublico["secao"], padrao: BlocoPublico[]) => {
    const doBanco = blocosBanco.filter((b) => b.secao === s);
    return doBanco.length > 0 ? doBanco : padrao;
  };
  const incluso = porSecao("incluso", BLOCOS_INCLUSO_CLASSICO);
  const noDia = porSecao("no_dia", BLOCOS_NO_DIA_CLASSICO);
  const proximos = porSecao("proximos_passos", BLOCOS_PROXIMOS_CLASSICO);
  const etapas = dados.etapas.length > 0 ? dados.etapas : ETAPAS_CLASSICO;
  const depoimentos =
    dados.depoimentos.length > 0 ? dados.depoimentos : DEPOIMENTOS_CLASSICO;
  const citacao = inst?.citacao_hero?.trim() || CITACAO_CLASSICO;

  const regra = regraDoBanco(inst);
  const condicoes = condicoesDoBanco({
    condicao_entrada_percentual: inst?.condicao_entrada_percentual,
    condicao_parcelas: inst?.condicao_parcelas_maximo,
    condicao_desconto_avista: inst?.condicao_desconto_a_vista_percentual,
    condicao_prazo_texto: inst?.condicao_prazo_parcelas_texto,
  });
  const opcoesParcela = opcoesParcelamento(condicoes.parcelasMaximo);

  /* ---------- estado da calculadora ---------- */
  const [pacoteId, setPacoteId] = useState<string | null>(
    () =>
      dados.pacotes.find((p) => p.recomendado)?.id ?? dados.pacotes[0]?.id ?? null
  );
  const [convidados, setConvidados] = useState(() =>
    Math.min(regra.max, Math.max(regra.min, dados.numero_convidados ?? regra.inclusos))
  );
  const [extrasIds, setExtrasIds] = useState<string[]>([]);
  const [forma, setForma] = useState<"vista" | "parcelado">("parcelado");
  const [parcelas, setParcelas] = useState(
    () => opcoesParcela[opcoesParcela.length - 1] ?? 1
  );

  const pacote = dados.pacotes.find((p) => p.id === pacoteId) ?? null;
  const valores = useMemo(
    () =>
      calcularProposta(
        { pacote, convidados, extrasIds, formaPagamento: forma, parcelas },
        dados.extras,
        regra,
        condicoes
      ),
    [pacote, convidados, extrasIds, forma, parcelas, dados.extras, regra, condicoes]
  );

  /* ---------- estado da página ---------- */
  const [secaoAtiva, setSecaoAtiva] = useState<string>("apresentacao");
  const [menuAberto, setMenuAberto] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [etapaAberta, setEtapaAberta] = useState<number | "todas" | null>(null);
  const [modalAceite, setModalAceite] = useState(false);
  const [recibo, setRecibo] = useState<{ codigo: string; total: number } | null>(
    dados.aceite
      ? { codigo: dados.aceite.recibo_codigo, total: dados.aceite.valor_total }
      : null
  );
  const [expandido, setExpandido] = useState<Record<number, boolean>>({});

  const tempo = useCountdownValidade(
    dados.status === "enviado" ? dados.data_validade : null
  );
  const podeAceitar = dados.status === "enviado" && !tempo.acabou && !recibo;

  /* comentários */
  const [comentarios, setComentarios] = useState<ComentarioPublico[]>(
    dados.comentarios ?? []
  );
  const [textoComentario, setTextoComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [erroComentario, setErroComentario] = useState<string | null>(null);

  async function comentar() {
    const texto = textoComentario.trim();
    if (!texto || enviandoComentario) return;
    setEnviandoComentario(true);
    setErroComentario(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("comentar_proposta_publica", {
      p_hash: hash,
      p_autor: dados.nome_contato || "Casal",
      p_texto: texto,
    });
    setEnviandoComentario(false);
    const resposta = data as
      | { success?: boolean; comentario?: ComentarioPublico; error?: string }
      | null;
    if (error || !resposta?.success || !resposta.comentario) {
      setErroComentario(
        resposta?.error ?? "não foi possível enviar agora — tente de novo"
      );
      return;
    }
    setComentarios((c) => [...c, resposta.comentario!]);
    setTextoComentario("");
  }

  /* barra de progresso + scrollspy */
  useEffect(() => {
    const aoRolar = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgresso(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    const observer = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setSecaoAtiva(e.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    for (const [id] of NAV) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => {
      window.removeEventListener("scroll", aoRolar);
      observer.disconnect();
    };
  }, []);

  const irPara = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setSecaoAtiva(id);
    setMenuAberto(false);
  };

  const iniciais = dados.nome_empresa
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const [nomeMarca, ...restoMarca] = dados.nome_empresa.split(/\s+/);
  const fotos = dados.fotos;
  const whats = inst?.whatsapp_contato?.replace(/\D/g, "") ?? null;

  const labelSecao: React.CSSProperties = {
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: COR.texto3,
  };

  return (
    <div
      style={{
        fontFamily: SANS,
        background: COR.pagina,
        color: COR.escuro,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* SPEC §5: as regras base vêm ANTES das media queries — é a ordem
          que segura o layout; invertida, tudo empilha numa coluna. */}
      <style>{`
        .kd-aside{display:none}
        .kd-mobilebar{display:flex}
        .kd-main{margin-left:0}
        .kd-lg-show{display:none}
        .kd-grid2a{display:grid;grid-template-columns:1fr;gap:40px}
        .kd-grid2b{display:grid;grid-template-columns:1fr;gap:40px}
        .kd-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .kd-grid6{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
        .kd-grid2c{display:grid;grid-template-columns:1.2fr 0.8fr;gap:24px}
        .kd-sm2{display:grid;grid-template-columns:1fr;gap:12px}
        .kd-hero{display:grid;grid-template-columns:1fr;gap:40px}
        .kd-dia2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .kd-fotos3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .kd-eventos{display:grid;grid-template-columns:1.1fr 0.9fr;gap:40px}
        @media (min-width:640px){ .kd-sm2{grid-template-columns:repeat(2,1fr)} }
        @media (min-width:1024px){
          .kd-aside{display:flex}
          .kd-mobilebar{display:none}
          .kd-main{margin-left:240px}
          .kd-lg-show{display:block}
          .kd-grid2a{grid-template-columns:0.9fr 1.1fr}
          .kd-grid2b{grid-template-columns:1.1fr 0.9fr}
          .kd-hero{grid-template-columns:1.1fr 0.9fr}
        }
        @keyframes kdFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes kdFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes kdPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .kd-foto{transition:all .4s;filter:brightness(.85)}
        .kd-foto:hover{filter:brightness(1);transform:scale(1.06)}
        .kd-step{transition:all .15s}
        .kd-step:hover{background:${COR.escuro}!important;border-color:${COR.escuro}!important;color:#fff!important}
        .kd-diacard{transition:all .15s}
        .kd-diacard:hover{border-color:${COR.dourado}!important;box-shadow:0 0 0 1px ${COR.dourado}}
        .kd-inclcard{transition:all .2s}
        .kd-inclcard:hover{box-shadow:0 12px 30px -12px rgba(60,36,21,.2);border-color:#E0D2BE!important}
        .kd-btn:hover{filter:brightness(1.05)}
        input[type=range].kd-range{accent-color:${COR.dourado}}
        @media (prefers-reduced-motion: reduce){
          .kd-foto,.kd-step,.kd-diacard,.kd-inclcard{transition:none}
        }
      `}</style>

      {/* barra de progresso */}
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 3,
          background: COR.borda, zIndex: 100,
        }}
        aria-hidden
      >
        <div
          style={{
            height: "100%", width: `${progresso}%`,
            background: COR.dourado, transition: "width 80ms linear",
          }}
        />
      </div>

      {/* ---------------- sidebar (desktop) ---------------- */}
      <aside
        className="kd-aside"
        style={{
          position: "fixed", top: 0, bottom: 0, left: 0, width: 240,
          background: COR.card, borderRight: `1px solid ${COR.borda}`,
          flexDirection: "column", padding: "28px 20px", zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {dados.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dados.logo_url}
              alt=""
              style={{
                width: 40, height: 40, borderRadius: "50%",
                objectFit: "cover", border: `1px solid ${COR.borda}`,
              }}
            />
          ) : (
            <span
              style={{
                width: 40, height: 40, borderRadius: "50%",
                border: `1px solid ${COR.texto3}`, display: "flex",
                alignItems: "center", justifyContent: "center",
                fontFamily: SERIF, fontSize: 18, fontWeight: 700,
              }}
            >
              {iniciais}
            </span>
          )}
          <div>
            <p
              style={{
                margin: 0, fontFamily: SANS, fontSize: 12, fontWeight: 600,
                letterSpacing: "0.18em", textTransform: "uppercase",
              }}
            >
              {nomeMarca}
            </p>
            {restoMarca.length > 0 && (
              <p
                style={{
                  margin: 0, fontSize: 10, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: COR.texto3,
                }}
              >
                {restoMarca.join(" ")}
              </p>
            )}
          </div>
        </div>

        <div
          aria-hidden
          style={{
            margin: "18px 0", display: "flex", alignItems: "center", gap: 8,
            color: COR.dourado, fontSize: 11,
          }}
        >
          ♥
          <span style={{ flex: 1, height: 1, background: COR.borda }} />
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {NAV.map(([id, rotulo]) => {
            const ativa = secaoAtiva === id;
            return (
              <button
                key={id}
                onClick={() => irPara(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 14px", borderRadius: 999, border: "none",
                  textAlign: "left", cursor: "pointer",
                  background: ativa ? COR.escuro : "transparent",
                  color: ativa ? "#fff" : COR.texto2,
                  fontFamily: SANS, fontSize: 11, fontWeight: 500,
                  letterSpacing: "0.12em",
                }}
              >
                {rotulo}
                {ativa && (
                  <span
                    aria-hidden
                    style={{
                      marginLeft: "auto", width: 6, height: 6,
                      borderRadius: "50%", background: COR.dourado,
                      animation: "kdFloat 2s ease-in-out infinite",
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            border: `1px solid ${COR.borda}`, borderRadius: 16,
            background: COR.pagina, padding: 16,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em" }}>
            💬 DÚVIDAS?
          </p>
          <p style={{ margin: "6px 0 10px", fontSize: 11, color: COR.texto2 }}>
            Fale direto com a gente. Resposta rápida.
          </p>
          {whats && (
            <a
              className="kd-btn"
              href={`https://wa.me/${whats}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block", textAlign: "center", padding: "9px 0",
                borderRadius: 999, border: `1px solid ${COR.borda}`,
                background: COR.branco, color: COR.escuro,
                fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                textDecoration: "none",
              }}
            >
              CHAMAR NO WHATS
            </a>
          )}
        </div>
      </aside>

      {/* ---------------- topbar (mobile) ---------------- */}
      <div
        className="kd-mobilebar"
        style={{
          position: "sticky", top: 3, zIndex: 50, background: COR.card,
          borderBottom: `1px solid ${COR.borda}`, padding: "12px 16px",
          alignItems: "center", justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: SANS, fontSize: 12, fontWeight: 600,
            letterSpacing: "0.18em", textTransform: "uppercase",
          }}
        >
          {dados.nome_empresa}
        </span>
        <button
          onClick={() => setMenuAberto(!menuAberto)}
          aria-expanded={menuAberto}
          aria-label="Menu"
          style={{
            border: `1px solid ${COR.borda}`, background: COR.branco,
            borderRadius: 999, padding: "6px 14px", fontSize: 11,
            fontWeight: 600, letterSpacing: "0.1em", cursor: "pointer",
          }}
        >
          {menuAberto ? "FECHAR" : "MENU"}
        </button>
      </div>
      {menuAberto && (
        <div
          className="kd-mobilebar"
          style={{
            position: "sticky", top: 51, zIndex: 49, background: COR.card,
            borderBottom: `1px solid ${COR.borda}`, padding: 12,
            display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6,
          }}
        >
          {NAV.map(([id, rotulo]) => (
            <button
              key={id}
              onClick={() => irPara(id)}
              style={{
                padding: "9px 10px", borderRadius: 12,
                border: `1px solid ${COR.borda}`,
                background: secaoAtiva === id ? COR.escuro : COR.branco,
                color: secaoAtiva === id ? "#fff" : COR.texto2,
                fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                cursor: "pointer", textAlign: "left",
              }}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      <main className="kd-main">
        {/* ---------------- countdown ---------------- */}
        {dados.status === "enviado" && !tempo.acabou && (
          <div
            style={{
              background: COR.escuro, color: "#fff", padding: "10px 24px",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, flexWrap: "wrap",
            }}
          >
            <span
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em" }}
            >
              ⏱ PROPOSTA VÁLIDA POR:
            </span>
            {(
              [
                [tempo.dias, "d"],
                [tempo.horas, "h"],
                [tempo.minutos, "m"],
                [tempo.segundos, "s"],
              ] as const
            ).map(([v, u], i) => (
              <span
                key={u}
                style={{
                  padding: "4px 12px", borderRadius: 999,
                  background: i === 3 ? COR.dourado : "rgba(255,255,255,0.1)",
                  fontFamily: SANS, fontSize: 12, fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {v}{u}
              </span>
            ))}
          </div>
        )}

        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          {/* ---------------- hero ---------------- */}
          <section id="apresentacao" style={{ padding: "56px 24px" }}>
            <div className="kd-hero">
              <div>
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "6px 14px", borderRadius: 999,
                    border: `1px solid ${COR.borda}`, background: COR.branco,
                    fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: COR.verde,
                    }}
                  />
                  PROPOSTA DE ASSESSORIA COMPLETA
                </span>

                <h1
                  style={{
                    margin: "20px 0 0", fontFamily: SERIF, fontWeight: 400,
                    fontSize: "clamp(40px, 6vw, 56px)", lineHeight: 0.95,
                  }}
                >
                  Proposta de
                  <br />
                  <span
                    style={{
                      borderBottom: `1px dotted ${COR.dourado}`,
                      paddingBottom: 4,
                    }}
                  >
                    {dados.nome_contato}
                  </span>{" "}
                  <span style={{ color: COR.dourado }}>♥</span>
                  <br />
                  <span style={{ fontSize: "clamp(30px, 4.4vw, 40px)", fontWeight: 300 }}>
                    assessoria
                  </span>
                </h1>

                <p
                  style={{
                    margin: "20px 0 0", fontFamily: SERIF, fontStyle: "italic",
                    fontSize: 20, lineHeight: 1.3, color: COR.texto2,
                    maxWidth: 460,
                  }}
                >
                  &ldquo;{citacao}&rdquo;
                </p>

                <div className="kd-grid3" style={{ marginTop: 28 }}>
                  {(
                    [
                      ["DATA", dataBr(dados.data_evento), null],
                      [
                        "CONVIDADOS",
                        `${dados.numero_convidados ?? regra.inclusos} pessoas`,
                        null,
                      ],
                      [
                        "LOCAL",
                        dados.local_evento ?? "A definir",
                        dados.cidade_evento,
                      ],
                    ] as const
                  ).map(([rotulo, valor, sub]) => (
                    <div
                      key={rotulo}
                      style={{
                        background: COR.branco, borderRadius: 16,
                        border: `1px solid ${COR.borda}`, padding: 16,
                      }}
                    >
                      <p style={{ ...labelSecao, margin: 0, fontSize: 10 }}>{rotulo}</p>
                      <p
                        style={{
                          margin: "6px 0 0", fontFamily: SERIF, fontSize: 18,
                          fontWeight: 600,
                        }}
                      >
                        {valor}
                      </p>
                      {sub && (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: COR.texto3 }}>
                          {sub}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 24, display: "flex", alignItems: "center", gap: 12,
                    background: COR.branco, borderRadius: 20,
                    border: `1px solid ${COR.borda}`, padding: 16,
                    boxShadow: "0 10px 40px -15px rgba(60,36,21,0.15)",
                  }}
                >
                  {dados.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={dados.logo_url}
                      alt=""
                      style={{
                        width: 44, height: 44, borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: COR.escuro, color: "#fff", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontFamily: SERIF, fontWeight: 700,
                      }}
                    >
                      {iniciais}
                    </span>
                  )}
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                      {dados.nome_empresa} — Wedding Planner
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: COR.texto3 }}>
                      {[
                        inst?.stat_eventos_realizados
                          ? `${inst.stat_eventos_realizados}+ casamentos`
                          : null,
                        dados.cidade_evento,
                      ]
                        .filter(Boolean)
                        .join(" • ") || "assessoria de casamentos"}
                    </p>
                  </div>
                </div>
              </div>

              {/* foto do hero */}
              <div
                style={{
                  borderRadius: 24, overflow: "hidden", position: "relative",
                  minHeight: 320, background: COR.borda,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dados.hero_imagem_url ?? fotos[0]?.url ?? "/images/hero-padrao.jpg"}
                  alt=""
                  style={{
                    position: "absolute", inset: 0, width: "100%",
                    height: "100%", objectFit: "cover",
                  }}
                />
                <div
                  style={{
                    position: "absolute", left: 0, right: 0, bottom: 0,
                    padding: "40px 20px 20px",
                    background:
                      "linear-gradient(to top, rgba(60,36,21,0.75), transparent)",
                    color: "#fff",
                  }}
                >
                  <p style={{ margin: 0, fontFamily: SERIF, fontSize: 24, fontWeight: 600 }}>
                    {dados.nome_contato}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0", fontSize: 11, letterSpacing: "0.14em",
                      textTransform: "uppercase", opacity: 0.85,
                    }}
                  >
                    {[
                      dados.data_evento?.slice(0, 10).split("-").reverse().join("."),
                      dados.local_evento,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- investimento ---------------- */}
          <section id="investimento" style={{ padding: "56px 24px" }}>
            <p style={{ ...labelSecao, margin: 0 }}>⚡ CALCULADORA INTERATIVA</p>
            <div
              style={{
                display: "flex", alignItems: "flex-end",
                justifyContent: "space-between", gap: 16, flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: "10px 0 0", fontFamily: SERIF, fontWeight: 400,
                  fontSize: "clamp(36px, 5vw, 48px)", lineHeight: 0.95,
                  maxWidth: 520,
                }}
              >
                Invista no dia
                <br />
                mais feliz da vida
              </h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="kd-btn"
                  onClick={() => setForma("parcelado")}
                  aria-pressed={forma === "parcelado"}
                  style={{
                    padding: "9px 18px", borderRadius: 999, cursor: "pointer",
                    border: `1px solid ${forma === "parcelado" ? COR.escuro : COR.borda}`,
                    background: forma === "parcelado" ? COR.escuro : COR.branco,
                    color: forma === "parcelado" ? "#fff" : COR.texto2,
                    fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                  }}
                >
                  ATÉ {condicoes.parcelasMaximo}X SEM JUROS
                </button>
                {condicoes.descontoAVista > 0 && (
                  <button
                    className="kd-btn"
                    onClick={() => setForma("vista")}
                    aria-pressed={forma === "vista"}
                    style={{
                      padding: "9px 18px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${forma === "vista" ? COR.escuro : COR.borda}`,
                      background: forma === "vista" ? COR.escuro : COR.branco,
                      color: forma === "vista" ? "#fff" : COR.texto2,
                      fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                    }}
                  >
                    {condicoes.descontoAVista}% DESCONTO À VISTA
                  </button>
                )}
              </div>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 14, color: COR.texto2, maxWidth: 520 }}>
              {SUB_INVESTIMENTO_CLASSICO}
            </p>

            {/* pacotes — repeat(3,1fr) SEMPRE */}
            <div className="kd-grid3" style={{ marginTop: 28, alignItems: "stretch" }}>
              {dados.pacotes.map((p) => {
                const ativo = p.id === pacoteId;
                const escuroCard = p.recomendado;
                const fundo = escuroCard
                  ? COR.escuro
                  : p.subtitulo?.toLowerCase().includes("platinum") ||
                      p.subtitulo?.toLowerCase().includes("premium")
                    ? COR.premium
                    : COR.pagina;
                const textoCard = escuroCard ? "#fff" : COR.escuro;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPacoteId(p.id)}
                    aria-pressed={ativo}
                    style={{
                      position: "relative", textAlign: "left", cursor: "pointer",
                      borderRadius: 20, padding: 20,
                      background: fundo, color: textoCard,
                      border: `2px solid ${ativo ? COR.escuro : COR.borda}`,
                      boxShadow: ativo
                        ? "0 20px 60px -20px rgba(60,36,21,0.3)"
                        : "none",
                      transform: ativo ? "scale(1.02)" : "none",
                      transition: "all .2s",
                    }}
                  >
                    {p.recomendado && (
                      <span
                        style={{
                          position: "absolute", top: -12, left: "50%",
                          transform: "translateX(-50%)",
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "5px 14px", borderRadius: 999,
                          background: COR.dourado, color: "#fff",
                          fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 14px rgba(184,147,90,0.5)",
                          animation: "kdPulse 2s ease-in-out infinite",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M2 18h20l-2-9-5 4-3-8-3 8-5-4-2 9z" />
                        </svg>
                        MAIS ESCOLHIDO
                      </span>
                    )}
                    <div
                      style={{
                        display: "flex", alignItems: "flex-start",
                        justifyContent: "space-between", gap: 8,
                      }}
                    >
                      <div>
                        {p.subtitulo && (
                          <p
                            style={{
                              margin: 0, fontSize: 10, fontWeight: 600,
                              letterSpacing: "0.12em", textTransform: "uppercase",
                              color: escuroCard ? "rgba(255,255,255,0.6)" : COR.texto3,
                            }}
                          >
                            {p.subtitulo}
                          </p>
                        )}
                        <p
                          style={{
                            margin: "4px 0 0", fontFamily: SERIF, fontSize: 20,
                            fontWeight: 600, letterSpacing: "0.05em",
                            textTransform: "uppercase",
                          }}
                        >
                          {p.nome}
                        </p>
                      </div>
                      <span
                        aria-hidden
                        style={{
                          width: 20, height: 20, borderRadius: 8, flex: "none",
                          border: `1.5px solid ${ativo ? COR.dourado : escuroCard ? "rgba(255,255,255,0.4)" : COR.borda}`,
                          display: "flex", alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {ativo && (
                          <span
                            style={{
                              width: 10, height: 10, borderRadius: "50%",
                              background: COR.dourado,
                            }}
                          />
                        )}
                      </span>
                    </div>
                    <p style={{ margin: "14px 0 0", fontFamily: SERIF, fontSize: 34, fontWeight: 600 }}>
                      {brlInteiro(p.preco)}
                      <span
                        style={{
                          fontFamily: SANS, fontSize: 11, fontWeight: 400,
                          marginLeft: 6,
                          color: escuroCard ? "rgba(255,255,255,0.6)" : COR.texto3,
                        }}
                      >
                        / pacote base
                      </span>
                    </p>
                    <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none" }}>
                      {p.inclui.map((linha) => (
                        <li
                          key={linha}
                          style={{
                            display: "flex", gap: 8, fontSize: 13,
                            lineHeight: 1.5,
                            color: escuroCard ? "rgba(255,255,255,0.9)" : COR.texto2,
                          }}
                        >
                          <span style={{ color: COR.dourado }}>✓</span>
                          {linha}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* ajustes finos ↔ resumo — 1.2fr 0.8fr SEMPRE */}
            <div className="kd-grid2c" style={{ marginTop: 24, alignItems: "start" }}>
              <div
                style={{
                  background: COR.pagina, borderRadius: 24,
                  border: `1px solid ${COR.borda}`, padding: 24,
                }}
              >
                <div
                  style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "baseline", gap: 12, flexWrap: "wrap",
                  }}
                >
                  <p style={{ margin: 0, fontFamily: SERIF, fontSize: 18, fontWeight: 600 }}>
                    Ajustes finos do seu casamento
                  </p>
                  <p style={{ ...labelSecao, margin: 0, fontSize: 10 }}>
                    VALOR EXTRA +{brlInteiro(regra.valorPorExtra).replace("R$ ", "R$")} / convidado acima de {regra.inclusos}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: 18, display: "flex",
                    justifyContent: "space-between", alignItems: "baseline",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em" }}>
                    CONVIDADOS: {convidados}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: COR.texto3 }}>
                    {valores.convidadosExcedentes === 0
                      ? `incluso até ${regra.inclusos}`
                      : `+ ${brl(valores.valorConvidadosExtra)}`}
                  </p>
                </div>
                <input
                  className="kd-range"
                  type="range"
                  min={regra.min}
                  max={regra.max}
                  value={convidados}
                  onChange={(e) => setConvidados(Number(e.target.value))}
                  aria-label="Número de convidados"
                  style={{ width: "100%", marginTop: 8 }}
                />
                <div
                  style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: 10, color: COR.texto3, marginTop: 2,
                  }}
                >
                  <span>{regra.min}</span>
                  <span>{regra.inclusos} base</span>
                  <span>{regra.max}</span>
                </div>

                {dados.extras.length > 0 && (
                  <div className="kd-dia2" style={{ marginTop: 18 }}>
                    {dados.extras.map((x) => {
                      const ligado = extrasIds.includes(x.id);
                      return (
                        <button
                          key={x.id}
                          onClick={() =>
                            setExtrasIds((ids) =>
                              ligado ? ids.filter((i) => i !== x.id) : [...ids, x.id]
                            )
                          }
                          aria-pressed={ligado}
                          style={{
                            display: "flex", alignItems: "center",
                            justifyContent: "space-between", gap: 10,
                            padding: "12px 14px", borderRadius: 16,
                            cursor: "pointer", textAlign: "left",
                            border: `1px solid ${ligado ? COR.dourado : COR.borda}`,
                            background: COR.branco,
                          }}
                        >
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
                              {x.nome}
                            </span>
                            {x.descricao && (
                              <span style={{ display: "block", fontSize: 11, color: COR.texto3 }}>
                                {x.descricao}
                              </span>
                            )}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: COR.dourado }}>
                              +{brlInteiro(x.preco).replace("R$ ", "R$")}
                            </span>
                            <span
                              aria-hidden
                              style={{
                                position: "relative", width: 34, height: 20,
                                borderRadius: 999,
                                background: ligado ? COR.escuro : COR.borda,
                                transition: "background 150ms ease",
                              }}
                            >
                              <span
                                style={{
                                  position: "absolute", top: 2,
                                  left: ligado ? 16 : 2, width: 16, height: 16,
                                  borderRadius: "50%", background: "#fff",
                                  transition: "left 150ms ease",
                                }}
                              />
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {forma === "parcelado" && (
                  <div
                    style={{
                      marginTop: 18, display: "flex", alignItems: "center",
                      gap: 8, flexWrap: "wrap",
                    }}
                  >
                    <span style={{ ...labelSecao, fontSize: 10 }}>PARCELAS</span>
                    {opcoesParcela.map((n) => (
                      <button
                        key={n}
                        onClick={() => setParcelas(n)}
                        aria-pressed={parcelas === n}
                        style={{
                          padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                          border: `1px solid ${parcelas === n ? COR.escuro : COR.borda}`,
                          background: parcelas === n ? COR.escuro : COR.branco,
                          color: parcelas === n ? "#fff" : COR.texto2,
                          fontSize: 12, fontWeight: 600,
                        }}
                      >
                        {n}x
                      </button>
                    ))}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: COR.texto3 }}>
                      {condicoes.prazoParcelasTexto}
                    </span>
                  </div>
                )}
              </div>

              {/* resumo financeiro escuro */}
              <div
                style={{
                  background: COR.escuro, color: "#fff", borderRadius: 24,
                  padding: 24, position: "sticky", top: 72,
                }}
              >
                <div
                  style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", gap: 8, flexWrap: "wrap",
                  }}
                >
                  <p
                    style={{
                      margin: 0, fontSize: 11, fontWeight: 600,
                      letterSpacing: "0.14em",
                      color: "rgba(249,245,240,0.6)",
                    }}
                  >
                    RESUMO FINANCEIRO AO VIVO
                  </p>
                  <span
                    style={{
                      padding: "3px 10px", borderRadius: 999,
                      background: "rgba(255,255,255,0.1)", fontSize: 10,
                      fontWeight: 600, letterSpacing: "0.1em",
                    }}
                  >
                    CÁLCULO INSTANTÂNEO
                  </span>
                </div>

                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  <Linha
                    rotulo={`Pacote ${pacote?.nome?.toUpperCase() ?? "—"}`}
                    valor={brl(valores.precoPacote)}
                  />
                  <Linha
                    rotulo={`Convidados extras (${valores.convidadosExcedentes})`}
                    valor={`+ ${brl(valores.valorConvidadosExtra)}`}
                  />
                  {valores.valorExtras > 0 && (
                    <Linha rotulo="Adicionais" valor={`+ ${brl(valores.valorExtras)}`} />
                  )}
                  {valores.desconto > 0 && (
                    <Linha
                      rotulo={`Desconto à vista (${valores.descontoPercentual}%)`}
                      valor={`− ${brl(valores.desconto)}`}
                      cor={COR.dourado}
                    />
                  )}
                  <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "6px 0" }} />
                  <Linha rotulo="Subtotal" valor={brl(valores.subtotal)} forte />
                </div>

                <p
                  style={{
                    margin: "16px 0 0", fontSize: 10, fontWeight: 600,
                    letterSpacing: "0.14em", color: "rgba(249,245,240,0.6)",
                  }}
                >
                  TOTAL
                </p>
                <p style={{ margin: "2px 0 0", fontFamily: SERIF, fontSize: 40, fontWeight: 600 }}>
                  {brl(valores.total)}
                </p>

                <div className="kd-dia2" style={{ marginTop: 14 }}>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.1)", borderRadius: 14,
                      padding: "12px 14px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(249,245,240,0.6)" }}>
                      ENTRADA {condicoes.entradaPercentual}%
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600 }}>
                      {brl(valores.entrada)}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(249,245,240,0.6)" }}>
                      para reserva da data
                    </p>
                  </div>
                  <div
                    style={{
                      background: COR.dourado, borderRadius: 14,
                      padding: "12px 14px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.75)" }}>
                      {forma === "vista" ? "À VISTA" : `RESTANTE ${parcelas}X`}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600 }}>
                      {forma === "vista"
                        ? brl(valores.saldo)
                        : brl(valores.parcela ?? 0)}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.75)" }}>
                      {forma === "vista" ? "após a entrada" : "sem juros"}
                    </p>
                  </div>
                </div>

                {recibo ? (
                  <div
                    style={{
                      marginTop: 16, borderRadius: 14, padding: "14px 16px",
                      background: "rgba(255,255,255,0.1)", textAlign: "center",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em" }}>
                      ✓ PROPOSTA ACEITA
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(249,245,240,0.85)" }}>
                      recibo {recibo.codigo} · {brl(recibo.total)}
                    </p>
                  </div>
                ) : (
                  <button
                    className="kd-btn"
                    disabled={!podeAceitar || !pacote}
                    onClick={() => setModalAceite(true)}
                    style={{
                      marginTop: 16, width: "100%", padding: "14px 0",
                      borderRadius: 999, border: "none", cursor: podeAceitar ? "pointer" : "default",
                      background: "#fff", color: COR.escuro,
                      fontSize: 12, fontWeight: 600, letterSpacing: "0.14em",
                      opacity: podeAceitar && pacote ? 1 : 0.5,
                    }}
                  >
                    ACEITAR E ASSINAR DIGITALMENTE →
                  </button>
                )}
                <p
                  style={{
                    margin: "10px 0 0", textAlign: "center", fontSize: 10,
                    color: "rgba(249,245,240,0.6)",
                  }}
                >
                  Contrato digital válido juridicamente • Assinatura na tela
                </p>
              </div>
            </div>
          </section>

          {/* ---------------- quem somos ---------------- */}
          <section id="quem-somos" style={{ padding: "56px 24px" }}>
            <div className="kd-grid2a">
              <div>
                <p style={{ ...labelSecao, margin: 0 }}>QUEM SOMOS</p>
                <h3
                  style={{
                    margin: "12px 0 0", fontFamily: SERIF, fontWeight: 400,
                    fontSize: "clamp(30px, 4vw, 38px)", lineHeight: 0.95,
                  }}
                >
                  {inst?.stat_anos_experiencia
                    ? `${inst.stat_anos_experiencia} ${
                        inst.stat_anos_experiencia === 1 ? "ano" : "anos"
                      } transformando SIM em arte`
                    : "Transformamos SIM em arte"}
                </h3>
                {inst?.sobre_nos_texto && (
                  <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.6, color: COR.texto2 }}>
                    {inst.sobre_nos_texto}
                  </p>
                )}
                <div className="kd-sm2" style={{ marginTop: 20, maxWidth: 380 }}>
                  {inst?.stat_eventos_realizados ? (
                    <div style={{ background: COR.branco, borderRadius: 16, border: `1px solid ${COR.borda}`, padding: 16 }}>
                      <p style={{ margin: 0, fontFamily: SERIF, fontSize: 28, fontWeight: 600 }}>
                        {inst.stat_eventos_realizados}+
                      </p>
                      <p style={{ ...labelSecao, margin: "2px 0 0", fontSize: 10 }}>CASAMENTOS</p>
                    </div>
                  ) : null}
                  {inst?.stat_equipe_texto ? (
                    <div style={{ background: COR.branco, borderRadius: 16, border: `1px solid ${COR.borda}`, padding: 16 }}>
                      <p style={{ margin: 0, fontFamily: SERIF, fontSize: 20, fontWeight: 600 }}>
                        {inst.stat_equipe_texto}
                      </p>
                      <p style={{ ...labelSecao, margin: "2px 0 0", fontSize: 10 }}>EQUIPE</p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* incluso */}
              <div id="incluso">
                <div
                  style={{
                    display: "flex", alignItems: "baseline",
                    justifyContent: "space-between", gap: 12, flexWrap: "wrap",
                  }}
                >
                  <h3 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 30 }}>
                    O que está incluso
                  </h3>
                  <span
                    style={{
                      padding: "4px 12px", borderRadius: 999,
                      border: `1px solid ${COR.borda}`, background: COR.branco,
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                    }}
                  >
                    {incluso.length} itens{pacote ? ` • PACOTE ${pacote.nome.toUpperCase()}` : ""}
                  </span>
                </div>
                <div className="kd-sm2" style={{ marginTop: 16 }}>
                  {incluso.map((b, i) => {
                    const aberto = !!expandido[i];
                    return (
                      <div
                        key={i}
                        className="kd-inclcard"
                        style={{
                          background: COR.branco, borderRadius: 20,
                          border: `1px solid ${COR.borda}`, padding: 18,
                        }}
                      >
                        <span
                          style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: COR.pagina, display: "flex",
                            alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Icone nome={b.icone} />
                        </span>
                        <p style={{ margin: "12px 0 0", fontFamily: SERIF, fontSize: 18, fontWeight: 600 }}>
                          {b.titulo}
                        </p>
                        <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5, color: COR.texto2 }}>
                          {aberto ? b.texto_longo ?? b.texto_curto : b.texto_curto}
                        </p>
                        {b.texto_longo && (
                          <button
                            onClick={() => setExpandido((e) => ({ ...e, [i]: !aberto }))}
                            style={{
                              marginTop: 10, border: "none", background: "none",
                              padding: 0, cursor: "pointer", color: COR.dourado,
                              fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                            }}
                          >
                            {aberto ? "VER MENOS" : "VER DETALHES →"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- como funciona ---------------- */}
          <section
            id="como-funciona"
            style={{ padding: "56px 24px", background: COR.card }}
          >
            <div
              style={{
                display: "flex", alignItems: "flex-end",
                justifyContent: "space-between", gap: 16, flexWrap: "wrap",
              }}
            >
              <div>
                <p style={{ ...labelSecao, margin: 0 }}>COMO FUNCIONA</p>
                <h3
                  style={{
                    margin: "12px 0 0", fontFamily: SERIF, fontWeight: 400,
                    fontSize: "clamp(32px, 4.4vw, 40px)", lineHeight: 0.9,
                  }}
                >
                  Do &ldquo;aceito a proposta&rdquo;
                  <br />
                  ao &ldquo;aceito você&rdquo;
                </h3>
              </div>
              <button
                className="kd-btn"
                onClick={() => setEtapaAberta("todas")}
                style={{
                  padding: "10px 20px", borderRadius: 999, cursor: "pointer",
                  border: `1px solid ${COR.escuro}`, background: COR.branco,
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                }}
              >
                VER EXPLICAÇÃO COMPLETA DO PROCESSO
              </button>
            </div>

            <div style={{ position: "relative", marginTop: 32 }}>
              <div
                className="kd-lg-show"
                aria-hidden
                style={{
                  position: "absolute", top: 22, left: 40, right: 40, height: 1,
                  background: `linear-gradient(to right, ${COR.borda}, rgba(184,147,90,0.4), ${COR.borda})`,
                }}
              />
              <div className="kd-grid6" style={{ position: "relative" }}>
                {etapas.slice(0, 6).map((e, i) => (
                  <button
                    key={i}
                    onClick={() => setEtapaAberta(i)}
                    style={{
                      border: "none", background: "none", padding: 0,
                      textAlign: "left", cursor: "pointer", color: COR.escuro,
                    }}
                  >
                    <span
                      className="kd-step"
                      style={{
                        width: 44, height: 44, borderRadius: "50%",
                        border: `1px solid ${COR.borda}`, background: COR.branco,
                        display: "flex", alignItems: "center",
                        justifyContent: "center", fontFamily: SERIF,
                        fontSize: 13, fontWeight: 700,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p style={{ margin: "12px 0 0", fontSize: 14, fontWeight: 600 }}>
                      {e.titulo}
                    </p>
                    {e.descricao && (
                      <p style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.5, color: COR.texto2 }}>
                        {e.descricao}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ---------------- no dia ---------------- */}
          <section id="no-dia" style={{ padding: "56px 24px" }}>
            <div className="kd-grid2b">
              <div>
                <p style={{ ...labelSecao, margin: 0 }}>NO DIA DO CASAMENTO</p>
                <h3
                  style={{
                    margin: "12px 0 0", fontFamily: SERIF, fontWeight: 400,
                    fontSize: "clamp(30px, 4vw, 38px)", lineHeight: 1.1,
                  }}
                >
                  Vocês vivem.
                  <br />A gente garante.
                </h3>
                <div className="kd-dia2" style={{ marginTop: 20 }}>
                  {noDia.map((b, i) => (
                    <div
                      key={i}
                      className="kd-diacard"
                      style={{
                        background: COR.branco, borderRadius: 16,
                        border: `1px solid ${COR.borda}`, padding: 14,
                        display: "flex", gap: 10,
                      }}
                    >
                      <span style={{ flex: "none", marginTop: 2 }}>
                        <Icone nome={b.icone} cor={COR.dourado} />
                      </span>
                      <span>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
                          {b.titulo}
                        </span>
                        {b.texto_curto && (
                          <span style={{ display: "block", fontSize: 11, lineHeight: 1.5, color: COR.texto3 }}>
                            {b.texto_curto}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="kd-fotos3">
                  {[0, 1, 2].map((i) => {
                    const f = fotos[i];
                    return (
                      <div
                        key={i}
                        style={{
                          aspectRatio: "1 / 1", borderRadius: 16,
                          overflow: "hidden", background: COR.borda,
                        }}
                      >
                        {f ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="kd-foto"
                            src={f.url}
                            alt={f.legenda ?? ""}
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span
                            style={{
                              display: "flex", width: "100%", height: "100%",
                              alignItems: "center", justifyContent: "center",
                              fontSize: 10, color: COR.texto3,
                            }}
                          >
                            foto
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {depoimentos[0] && (
                  <div
                    style={{
                      marginTop: 16, background: COR.branco, borderRadius: 20,
                      border: `1px solid ${COR.borda}`, padding: 20,
                    }}
                  >
                    <p style={{ margin: 0, color: COR.dourado, letterSpacing: 2 }}>★★★★★</p>
                    <p
                      style={{
                        margin: "10px 0 0", fontFamily: SERIF, fontStyle: "italic",
                        fontSize: 16, lineHeight: 1.4, color: COR.texto2,
                      }}
                    >
                      &ldquo;{depoimentos[0].texto}&rdquo;
                    </p>
                    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: COR.dourado, color: "#fff",
                          display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 13, fontWeight: 600,
                        }}
                      >
                        {depoimentos[0].autor[0]}
                      </span>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                          {depoimentos[0].autor}
                        </p>
                        {depoimentos[0].contexto && (
                          <p style={{ margin: 0, fontSize: 11, color: COR.texto3 }}>
                            {depoimentos[0].contexto}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ---------------- eventos + depoimentos (faixa escura) ---------------- */}
          <section
            id="eventos"
            style={{ background: COR.escuro, color: "#fff", padding: "56px 24px" }}
          >
            <div className="kd-eventos">
              <div>
                <p style={{ ...labelSecao, margin: 0, color: "rgba(249,245,240,0.6)" }}>
                  EVENTOS REALIZADOS
                </p>
                <h3 style={{ margin: "12px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: 34 }}>
                  Últimos casamentos assinados
                </h3>
                <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {(fotos.length > 0 ? fotos.slice(0, 3) : [null, null, null]).map(
                    (f, i) => (
                      <div
                        key={i}
                        style={{
                          width: 140, aspectRatio: "3 / 4", borderRadius: 16,
                          overflow: "hidden", background: "rgba(255,255,255,0.08)",
                          border: "1px dashed rgba(255,255,255,0.2)",
                        }}
                      >
                        {f && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="kd-foto"
                            src={f.url}
                            alt={f.legenda ?? ""}
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              <div id="depoimentos">
                <p style={{ ...labelSecao, margin: 0, color: "rgba(249,245,240,0.6)" }}>
                  DEPOIMENTOS REAIS
                </p>
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  {depoimentos.slice(0, 3).map((d) => (
                    <div
                      key={d.autor}
                      style={{
                        background: "rgba(255,255,255,0.05)", borderRadius: 16,
                        padding: 16, display: "flex", gap: 12,
                      }}
                    >
                      <span
                        style={{
                          flex: "none", width: 32, height: 32, borderRadius: "50%",
                          background: COR.dourado, color: "#fff",
                          display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 13, fontWeight: 600,
                        }}
                      >
                        {d.autor[0]}
                      </span>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{d.autor}</p>
                        <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.5, color: "rgba(249,245,240,0.85)" }}>
                          &ldquo;{d.texto}&rdquo;
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- próximos passos + comentários ---------------- */}
          <section id="proximos" style={{ padding: "56px 24px" }}>
            <p style={{ ...labelSecao, margin: 0 }}>PRÓXIMOS PASSOS</p>
            <h3 style={{ margin: "12px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: 34 }}>
              Como fechamos?
            </h3>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12, maxWidth: 620 }}>
              {proximos.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      flex: "none", width: 26, height: 26, borderRadius: "50%",
                      background: COR.escuro, color: "#fff", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    {i + 1}
                  </span>
                  <p style={{ margin: 0, fontSize: 14 }}>{p.titulo}</p>
                </div>
              ))}
            </div>

            {recibo ? (
              <div
                style={{
                  marginTop: 24, borderRadius: 20, background: COR.branco,
                  border: `1px solid ${COR.borda}`, padding: 24,
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontFamily: SERIF, fontSize: 24, fontWeight: 600 }}>
                  Proposta aceita ✓
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: COR.texto2 }}>
                  Recibo <b>{recibo.codigo}</b> · {brl(recibo.total)}
                </p>
                {whats && (
                  <a
                    className="kd-btn"
                    href={`https://wa.me/${whats}?text=${encodeURIComponent(
                      `Acabamos de aceitar a proposta! Recibo ${recibo.codigo} — ${dados.nome_contato}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block", marginTop: 14, padding: "12px 24px",
                      borderRadius: 999, background: COR.verde, color: "#fff",
                      fontSize: 12, fontWeight: 600, letterSpacing: "0.1em",
                      textDecoration: "none",
                    }}
                  >
                    ENVIAR CONFIRMAÇÃO NO WHATSAPP
                  </a>
                )}
              </div>
            ) : (
              <button
                className="kd-btn"
                disabled={!podeAceitar || !pacote}
                onClick={() => setModalAceite(true)}
                style={{
                  marginTop: 24, width: "100%", padding: "16px 0",
                  borderRadius: 999, border: "none",
                  cursor: podeAceitar ? "pointer" : "default",
                  background: COR.escuro, color: "#fff",
                  fontSize: 12, fontWeight: 600, letterSpacing: "0.14em",
                  opacity: podeAceitar && pacote ? 1 : 0.5,
                }}
              >
                ACEITAR PROPOSTA AGORA
              </button>
            )}

            {/* comentários dos noivos */}
            <div
              style={{
                marginTop: 24, background: COR.branco, borderRadius: 20,
                border: `1px solid ${COR.borda}`, padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: 12, flexWrap: "wrap",
                }}
              >
                <p style={{ margin: 0, fontFamily: SERIF, fontSize: 18, fontWeight: 600 }}>
                  💬 Observações dos noivos
                </p>
                <span
                  style={{
                    padding: "3px 10px", borderRadius: 999,
                    border: `1px solid ${COR.borda}`, fontSize: 10,
                    fontWeight: 600, color: COR.texto3,
                  }}
                >
                  {comentarios.length}{" "}
                  {comentarios.length === 1 ? "comentário" : "comentários"}
                </span>
              </div>

              {comentarios.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {comentarios.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        background: COR.pagina, borderRadius: 14,
                        border: `1px solid ${COR.borda}`, padding: "12px 14px",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: COR.texto3 }}>
                        {c.autor_nome}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.5 }}>
                        {c.texto}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <input
                  value={textoComentario}
                  onChange={(e) => setTextoComentario(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && comentar()}
                  maxLength={500}
                  placeholder="Deixe uma observação para a cerimonialista..."
                  style={{
                    flex: 1, minWidth: 0, padding: "11px 16px",
                    borderRadius: 999, border: `1px solid ${COR.borda}`,
                    background: COR.pagina, fontSize: 13, fontFamily: SANS,
                    color: COR.escuro,
                  }}
                />
                <button
                  className="kd-btn"
                  onClick={comentar}
                  disabled={enviandoComentario || !textoComentario.trim()}
                  aria-label="Enviar observação"
                  style={{
                    flex: "none", width: 42, height: 42, borderRadius: "50%",
                    border: "none", cursor: "pointer",
                    background: COR.escuro, color: "#fff", fontSize: 18,
                    opacity: enviandoComentario || !textoComentario.trim() ? 0.5 : 1,
                  }}
                >
                  +
                </button>
              </div>
              {erroComentario && (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#A5544B" }}>
                  {erroComentario}
                </p>
              )}
              <p style={{ margin: "8px 0 0", fontSize: 10, color: COR.texto3 }}>
                Comentários ficam salvos nesta proposta e a cerimonialista é avisada.
              </p>
            </div>
          </section>

          {/* ---------------- rodapé ---------------- */}
          <footer
            style={{
              padding: "24px", borderTop: `1px solid ${COR.borda}`,
              display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: 12, flexWrap: "wrap",
              fontSize: 10, letterSpacing: "0.1em", color: COR.texto3,
              textTransform: "uppercase",
            }}
          >
            <span>
              © {new Date().getFullYear()} {dados.nome_empresa}
              {dados.cidade_evento ? ` • ${dados.cidade_evento}` : ""}
            </span>
            <span style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <a
                href={`/orcamento/${hash}/pdf`}
                target="_blank"
                rel="noreferrer"
                style={{ color: COR.texto3, textDecoration: "underline" }}
              >
                Baixar em PDF
              </a>
              {recibo && <span>♥ Proposta • ID {recibo.codigo}</span>}
            </span>
          </footer>
        </div>
      </main>

      {/* ---------------- modal de etapa / processo completo ---------------- */}
      {etapaAberta !== null && (
        <div
          role="dialog"
          aria-modal
          onClick={(e) => e.target === e.currentTarget && setEtapaAberta(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 90,
            background: "rgba(60,36,21,0.55)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            style={{
              width: "100%", maxWidth: 560, maxHeight: "80vh",
              overflowY: "auto", background: COR.branco, borderRadius: 24,
              padding: 24, animation: "kdFadeUp 0.4s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <p style={{ ...labelSecao, margin: 0 }}>
                {etapaAberta === "todas" ? "PROCESSO COMPLETO" : "ETAPA DO PROCESSO"}
              </p>
              <button
                onClick={() => setEtapaAberta(null)}
                aria-label="Fechar"
                style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, color: COR.texto3 }}
              >
                ✕
              </button>
            </div>
            {etapaAberta === "todas" ? (
              <>
                <h4 style={{ margin: "10px 0 0", fontFamily: SERIF, fontSize: 26, fontWeight: 600 }}>
                  Como transformamos seu sonho em método
                </h4>
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  {etapas.slice(0, 6).map((e, i) => (
                    <div key={i}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                        {String(i + 1).padStart(2, "0")} · {e.titulo}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.6, color: COR.texto2 }}>
                        {e.texto_longo ?? e.descricao}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h4 style={{ margin: "10px 0 0", fontFamily: SERIF, fontSize: 26, fontWeight: 600 }}>
                  {etapas[etapaAberta]?.titulo}
                </h4>
                <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.6, color: COR.texto2 }}>
                  {etapas[etapaAberta]?.texto_longo ?? etapas[etapaAberta]?.descricao}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------------- modal de aceite (compartilhado) ---------------- */}
      {modalAceite && pacote && (
        <ModalAceiteProposta
          hash={hash}
          tema={TEMA_MODAL}
          titulo={`Quase lá, ${dados.nome_contato}!`}
          subtitulo="Revise o resumo financeiro e assine digitalmente. A data é travada após a entrada."
          resumo={`${pacote.nome} • ${convidados} convidados — ${brl(valores.total)} (entrada ${brl(valores.entrada)}${forma === "parcelado" ? `, ${parcelas}x de ${brl(valores.parcela ?? 0)}` : ", restante à vista"})`}
          nomeInicial={dados.nome_contato}
          pacoteId={pacote.id}
          convidados={convidados}
          extrasIds={extrasIds}
          formaPagamento={forma}
          parcelas={forma === "parcelado" ? parcelas : null}
          tipoEvento={dados.tipo_evento}
          dataEvento={dados.data_evento}
          assinaturaDupla
          rotuloAssinatura="Assinatura noiva"
          rotuloAssinatura2="Assinatura noivo"
          textoBotao="CONFIRMAR E GERAR CONTRATO →"
          rodape="Li e aceito os termos da assessoria e autorizo o uso das assinaturas para travamento da data."
          onFechar={() => setModalAceite(false)}
          onAceito={(codigo, total) => {
            setModalAceite(false);
            setRecibo({ codigo, total });
          }}
        />
      )}
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  forte,
  cor,
}: {
  rotulo: string;
  valor: string;
  forte?: boolean;
  cor?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: cor ?? "rgba(255,255,255,0.6)" }}>{rotulo}</span>
      <span style={{ fontWeight: forte ? 600 : 500, color: cor }}>{valor}</span>
    </div>
  );
}
