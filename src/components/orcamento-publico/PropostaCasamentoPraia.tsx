"use client";

// Casamento — "Praia" (paleta Maré Alta).
//
// Vídeo do mar no hero com o céu que escurece conforme a página desce
// (tarde → pôr do sol → noite), som de ondas opcional com frases que
// trocam a cada 9s, simulador do pôr do sol por praia e data, e o
// montador de seis passos que recalcula ao vivo.
//
// Fiel à especificação (Marcellus + Karla, raio 2px, paleta, overlays),
// com os desvios deliberados de sempre, anotados onde acontecem:
//
//   1. Preços, extras e regra de convidados vêm do Catálogo da empresa —
//      a SPEC chama os dela de referência. Extra com preço 0 vira
//      "a cotar": não soma e liga o aviso do resumo, como no design.
//   2. O countdown usa a validade real da proposta (hook compartilhado).
//   3. Nada de histórico inventado: "350 EVENTOS", o depoimento
//      "Camila & Rafael" e o selo "SÓ 2 CASAMENTOS POR MÊS" saíram do
//      padrão; stats e depoimentos vêm do Catálogo e somem vazios.
//
// O simulador geocodifica a praia no OpenStreetMap (grátis, sem chave) —
// só no clique do botão, nunca a cada tecla, respeitando o limite deles.
// O cálculo do sol em si é matemática local (proposta-praia-conteudo).
//
// Som de ondas: preload="none" e src só no primeiro toque — ninguém
// baixa áudio sem pedir.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ModalAceiteProposta,
  type TemaModal,
} from "@/components/orcamento-publico/ModalAceiteProposta";
import { useCountdownValidade } from "@/components/orcamento-publico/useCountdownValidade";
import { expirado, type OrcamentoPublicoData } from "@/lib/orcamento-publico";
import {
  calcularProposta,
  condicoesDoBanco,
  regraDoBanco,
  precoDePacote, } from "@/lib/proposta";
import {
  CARTA_PRAIA,
  ESTILOS_PRAIA,
  FRASES_MAR,
  INCLUSO_PRAIA,
  MIDIA_PRAIA,
  PRAZOS_PRAIA,
  TEXTOS_PRAIA as T,
  TIMELINE_PRAIA,
  TRADICOES_PRAIA,
  horaLegivel,
  porDoSol,
} from "@/lib/proposta-praia-conteudo";

/* ---------------- tokens da SPEC ---------------- */

const COR = {
  fundo: "#F3EDE4",
  branco: "#FFFFFF",
  suave: "#FBF7F0",
  escuro: "#25383F",
  oceano: "#3F5A63",
  coral: "#E4857A",
  claro: "#F7F2EA",
  borda: "#E2D8C9",
  divisor: "#EFE7DB",
  bordaInput: "#D9C9B6",
  texto2: "#8C8074",
  texto3: "#6B6157",
  selecionado: "#FBF1EE",
  verde: "#8C9A7B",
  vermelho: "#C4584A",
};

const SERIF = "var(--font-marcellus), Georgia, serif";
const SANS = "var(--font-karla), system-ui, sans-serif";

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

// Largura do conteúdo. A SPEC diz 1180px, e 1180 é exatamente 92,2% da
// prancheta de 1280 em que o design foi desenhado — o número fixo já era
// uma PROPORÇÃO disfarçada. Num monitor de 1440, 1180 vira 130px de margem
// de cada lado e a página encolhe, enquanto a prévia do design (que escala
// a prancheta para preencher a janela) continua cheia.
//
// Mantém 1180 até 1280 (idêntico ao spec e ao mockup), cresce na mesma
// proporção acima disso e para em 1460 para a linha de texto não ficar
// longa demais em telas muito largas.
const LARGURA_CONTAINER = "min(1460px, max(1180px, 92.2vw))";

const TEMA_MODAL: TemaModal = {
  fundo: COR.suave,
  card: COR.branco,
  texto: COR.escuro,
  textoSuave: COR.texto2,
  borda: COR.borda,
  acento: COR.coral,
  botaoFundo: COR.coral,
  botaoTexto: "#FFFFFF",
  raio: 2,
};

const eyebrow: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "2.4px",
  textTransform: "uppercase",
  color: COR.texto2,
};

export function PropostaCasamentoPraia({
  hash,
  inicial,
}: {
  hash: string;
  inicial: OrcamentoPublicoData;
}) {
  const dados = inicial;
  const inst = dados.institucional;
  const pacotes = useMemo(() => dados.pacotes ?? [], [dados.pacotes]);
  const extras = useMemo(() => dados.extras ?? [], [dados.extras]);

  const regra = regraDoBanco(inst);
  const condicoes = condicoesDoBanco({
    condicao_entrada_percentual: inst?.condicao_entrada_percentual,
    condicao_parcelas: inst?.condicao_parcelas_maximo,
    condicao_desconto_avista: inst?.condicao_desconto_a_vista_percentual,
    condicao_prazo_texto: inst?.condicao_prazo_parcelas_texto,
  });

  /* ---------------- estado do montador ---------------- */

  const [nome, setNome] = useState(dados.nome_contato || "");
  const [slot, setSlot] = useState(1);
  const [prazo, setPrazo] = useState<string>(PRAZOS_PRAIA[0].id);
  const [pacoteId, setPacoteId] = useState<string | null>(
    pacotes.find((p) => p.recomendado)?.id ?? pacotes[0]?.id ?? null
  );
  const [convidados, setConvidados] = useState(
    dados.numero_convidados ?? regra.inclusos
  );
  const [estilos, setEstilos] = useState<string[]>([]);
  const [extrasIds, setExtrasIds] = useState<string[]>([]);
  const [tradicoes, setTradicoes] = useState<number[]>([]);
  const [modal, setModal] = useState(false);
  const [recibo, setRecibo] = useState<{ codigo: string; total: number } | null>(
    dados.aceite
      ? { codigo: dados.aceite.recibo_codigo, total: dados.aceite.valor_total }
      : null
  );

  const pacote = pacotes.find((p) => p.id === pacoteId) ?? null;
  const venceu = expirado(dados);
  const podeResponder = dados.status === "enviado" && !venceu && !recibo;
  const tempo = useCountdownValidade(
    dados.status === "enviado" ? dados.data_validade : null
  );

  const valores = useMemo(
    () =>
      calcularProposta(
        {
          pacote,
          convidados,
          extrasIds,
          formaPagamento: "parcelado",
          parcelas: condicoes.parcelasMaximo,
        },
        extras,
        regra,
        condicoes
      ),
    [pacote, convidados, extrasIds, extras, regra, condicoes]
  );

  // extra com preço 0 = "a cotar": não soma e liga o aviso do resumo
  const extrasSelecionados = extras.filter((x) => extrasIds.includes(x.id));
  const temACotar = extrasSelecionados.some((x) => Number(x.preco) === 0);

  function escolherPrazo(id: string) {
    setPrazo(id);
    const i = PRAZOS_PRAIA.findIndex((p) => p.id === id);
    const alvo = pacotes[Math.min(i, pacotes.length - 1)];
    if (alvo) setPacoteId(alvo.id);
  }

  const alternaStr = (lista: string[], set: (v: string[]) => void, id: string) =>
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);
  const alternaNum = (lista: number[], set: (v: number[]) => void, i: number) =>
    set(lista.includes(i) ? lista.filter((x) => x !== i) : [...lista, i]);

  const marcos = [
    nome.trim() !== "",
    pacote !== null,
    convidados !== regra.inclusos,
    tradicoes.length >= 3,
    estilos.length >= 2,
  ];
  const pct = Math.round((marcos.filter(Boolean).length / marcos.length) * 100);
  const faltam = marcos.filter((m) => !m).length;

  /* ---------------- som do mar + frases ---------------- */

  const audioRef = useRef<HTMLAudioElement>(null);
  const [marLigado, setMarLigado] = useState(false);
  const [fraseIdx, setFraseIdx] = useState(0);
  const primeiroNome = (nome || dados.nome_contato || "").split(/\s|&|e /)[0] || "noiva";
  const frases = FRASES_MAR(primeiroNome);

  function alternarMar() {
    const el = audioRef.current;
    if (!el) return;
    if (marLigado) {
      el.pause();
      setMarLigado(false);
      return;
    }
    if (!el.src) el.src = MIDIA_PRAIA.ondas;
    el.loop = true;
    el.volume = 0.6;
    void el.play().then(
      () => setMarLigado(true),
      () => setMarLigado(false)
    );
  }

  useEffect(() => {
    if (!marLigado) return;
    const id = setInterval(() => setFraseIdx((i) => i + 1), 9_000);
    return () => clearInterval(id);
  }, [marLigado]);

  useEffect(() => {
    const el = audioRef.current;
    return () => el?.pause();
  }, []);

  /* ---------------- céu por scroll + progresso ---------------- */

  const [scrollT, setScrollT] = useState(0);
  const [rolagem, setRolagem] = useState(0);
  useEffect(() => {
    // Sem requestAnimationFrame aqui: rAF pausa em aba fora de foco e o
    // céu congelaria ao voltar. O trabalho é leve (duas contas) e o
    // listener é passivo — mesmo padrão do Convite Vivo.
    const aoRolar = () => {
      setScrollT(Math.min(1, window.scrollY / (window.innerHeight * 1.4)));
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setRolagem(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);
  // 0→0.5 tarde→pôr do sol · 0.5→1 pôr do sol→noite
  const solOp = Math.min(1, scrollT * 2) * (1 - Math.max(0, scrollT - 0.5) * 2);
  const noiteOp = Math.max(0, scrollT - 0.5) * 2;

  /* ---------------- simulador do pôr do sol ---------------- */

  const [simData, setSimData] = useState(dados.data_evento ?? "2027-05-24");
  const [simBusca, setSimBusca] = useState(dados.cidade_evento || "Búzios, RJ");
  const [simNome, setSimNome] = useState(dados.cidade_evento || "Búzios · RJ");
  const [simLat, setSimLat] = useState(-22.75);
  const [simLng, setSimLng] = useState(-41.88);
  const [simStatus, setSimStatus] = useState<"ok" | "buscando" | "nao-achou" | "erro">("ok");

  async function buscarPraia() {
    const q = simBusca.trim();
    if (!q) return;
    setSimStatus("buscando");
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`
      );
      const js = (await r.json()) as { lat: string; lon: string; display_name: string }[];
      if (js?.[0]) {
        setSimLat(parseFloat(js[0].lat));
        setSimLng(parseFloat(js[0].lon));
        setSimNome(js[0].display_name.split(",").slice(0, 2).join(" ·"));
        setSimStatus("ok");
      } else setSimStatus("nao-achou");
    } catch {
      setSimStatus("erro");
    }
  }

  const sol = porDoSol(simData, simLat, simLng);
  const entradaHora = sol !== null ? horaLegivel(sol - 0.67) : "—";
  const solHora = sol !== null ? horaLegivel(sol) : "—";
  const goldenHora = sol !== null ? horaLegivel(sol - 1) : "—";

  const irParaMontador = () =>
    document.getElementById("montador")?.scrollIntoView({ behavior: "smooth" });

  const ativa = TIMELINE_PRAIA[slot] ?? TIMELINE_PRAIA[0];
  const dataExtenso = dados.data_evento
    ? new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" })
        .format(new Date(`${dados.data_evento}T12:00:00`))
    : null;

  const statsProva = [
    inst?.stat_eventos_realizados
      ? { valor: String(inst.stat_eventos_realizados), rotulo: "EVENTOS REALIZADOS" }
      : null,
    inst?.stat_anos_experiencia
      ? { valor: String(inst.stat_anos_experiencia), rotulo: "ANOS DE ESTRADA" }
      : null,
    inst?.stat_equipe_texto
      ? { valor: inst.stat_equipe_texto, rotulo: "EQUIPE NO DIA" }
      : null,
  ].filter(Boolean) as { valor: string; rotulo: string }[];

  const depoimento = (dados.depoimentos ?? [])[0] ?? null;
  const whats = (inst?.whatsapp_contato ?? "").replace(/\D/g, "");
  const tradNomes = tradicoes.map((i) => TRADICOES_PRAIA[i]).filter(Boolean);
  const roteiroFrase =
    tradicoes.length === 0
      ? T.roteiroVazio
      : `${tradicoes.length} ${tradicoes.length === 1 ? "momento escolhido" : "momentos escolhidos"}. O dia de vocês terá ${tradNomes.slice(0, 3).join(", ").toLowerCase()}${tradicoes.length > 3 ? ` e mais ${tradicoes.length - 3}.` : "."}`;

  return (
    <div
      className="praia"
      style={{
        background: COR.fundo,
        color: COR.escuro,
        fontFamily: SANS,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`
        .praia ::selection{background:${COR.coral};color:#fff}
        .praia-serif{font-family:${SERIF};font-weight:400}
        @keyframes praiaFloat{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes praiaW1{from{height:3px}to{height:14px}}
        @keyframes praiaW2{from{height:5px}to{height:16px}}
        @keyframes praiaW3{from{height:4px}to{height:10px}}
        .praia-float{animation:praiaFloat .7s ease both}
        .praia-w span{display:inline-block;width:3px;background:${COR.claro};border-radius:2px}
        .praia-w span:nth-child(1){animation:praiaW1 .8s infinite alternate}
        .praia-w span:nth-child(2){animation:praiaW2 1.1s infinite alternate}
        .praia-w span:nth-child(3){animation:praiaW3 .9s infinite alternate}
        .praia-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(460px,100%),1fr));gap:24px}
        .praia-grid-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px}
        .praia-grid-trad{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:10px}
        .praia-slider{-webkit-appearance:none;appearance:none;height:3px;background:${COR.bordaInput};border-radius:2px;outline:none}
        .praia-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:${COR.oceano};border:3px solid ${COR.fundo};cursor:pointer}
        .praia-slider::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:${COR.oceano};border:3px solid ${COR.fundo};cursor:pointer}
        @media (prefers-reduced-motion:reduce){.praia-float,.praia-w span{animation:none}}
      `}</style>

      {/* ---------------- header sticky ---------------- */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(243,237,228,0.94)", backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${COR.borda}`,
        }}
      >
        <div style={{ height: 3, background: COR.divisor }}>
          <div
            style={{
              height: "100%", width: `${rolagem}%`,
              background: "linear-gradient(90deg, #E4857A, #C9963F)",
              transition: "width .4s ease",
            }}
          />
        </div>
        <div
          style={{
            maxWidth: LARGURA_CONTAINER, margin: "0 auto", padding: "14px 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 18, flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {dados.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dados.logo_url}
                alt={dados.nome_empresa}
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <span
                className="praia-serif"
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  border: `1px solid ${COR.oceano}`, display: "grid",
                  placeItems: "center", fontSize: 12, color: COR.oceano,
                }}
              >
                {dados.nome_empresa.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span style={{ lineHeight: 1.2 }}>
              <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "2px" }}>
                {dados.nome_empresa.toUpperCase()}
              </span>
              <span style={{ display: "block", fontSize: 9.5, fontWeight: 600, letterSpacing: "1.6px", color: COR.texto2 }}>
                {T.topoBadge}
              </span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "1.6px", color: COR.texto2 }}>
              {pct}% MONTADA
            </span>
            {podeResponder && !tempo.acabou && (
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "1.6px", color: COR.oceano, fontVariantNumeric: "tabular-nums" }}>
                VALOR TRAVA EM {tempo.dias}D {String(tempo.horas).padStart(2, "0")}H
              </span>
            )}
            <button
              onClick={() => (podeResponder ? setModal(true) : irParaMontador())}
              style={{
                border: "none", cursor: "pointer", borderRadius: 2,
                background: COR.coral, color: "#fff", padding: "10px 18px",
                fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", fontFamily: SANS,
              }}
            >
              ACEITAR PROPOSTA
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- hero: mar + céu que escurece ---------------- */}
      <section
        style={{
          position: "relative", minHeight: "86vh", display: "flex",
          alignItems: "center", justifyContent: "center",
          padding: "72px 32px", overflow: "hidden", color: COR.claro,
        }}
      >
        <video
          src={MIDIA_PRAIA.video}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            background:
              "linear-gradient(180deg, rgba(37,56,63,0.62) 0%, rgba(37,56,63,0.42) 45%, rgba(37,56,63,0.82) 100%)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, opacity: solOp,
            transition: "opacity .25s linear",
            background:
              "linear-gradient(180deg, rgba(214,120,74,0.30), rgba(196,88,86,0.42) 50%, rgba(90,42,66,0.72))",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, opacity: noiteOp,
            transition: "opacity .25s linear",
            background:
              "linear-gradient(180deg, rgba(10,22,38,0.55), rgba(8,16,28,0.72) 55%, rgba(5,10,18,0.9))",
          }}
        />

        <div className="praia-float" style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 760 }}>
          <span
            style={{
              display: "inline-block", padding: "8px 16px",
              border: "1px solid rgba(247,242,234,0.4)", borderRadius: 2,
              fontSize: 10, fontWeight: 700, letterSpacing: "2.4px",
            }}
          >
            {T.heroBadge}
          </span>
          {dataExtenso && (
            <p style={{ margin: "18px 0 0", fontSize: 11, fontWeight: 700, letterSpacing: "3px", opacity: 0.85 }}>
              {dataExtenso.toUpperCase()}
            </p>
          )}
          <label style={{ display: "block", marginTop: 10 }}>
            <span style={{ position: "absolute", left: -9999 }}>Nome do casal</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Marina & João"
              className="praia-serif"
              style={{
                width: "100%", background: "transparent", border: "none",
                outline: "none", textAlign: "center", color: COR.claro,
                fontSize: "clamp(36px, 6vw, 64px)", lineHeight: 1.15,
              }}
            />
          </label>
          <p style={{ margin: "6px 0 0", fontSize: 10, fontWeight: 700, letterSpacing: "2.4px", opacity: 0.7 }}>
            ↑ {T.heroDica}
          </p>
          <p style={{ margin: "22px auto 0", maxWidth: 560, fontSize: 15.5, lineHeight: 1.7, opacity: 0.92 }}>
            {T.heroParagrafo}
          </p>
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={irParaMontador}
              style={{
                border: "none", cursor: "pointer", borderRadius: 2,
                background: COR.coral, color: "#fff", padding: "16px 32px",
                fontSize: 12, fontWeight: 700, letterSpacing: "1.8px", fontFamily: SANS,
              }}
            >
              {T.ctaMontar}
            </button>
            <button
              onClick={alternarMar}
              style={{
                cursor: "pointer", borderRadius: 2, padding: "16px 28px",
                border: "1px solid rgba(247,242,234,0.5)", background: "rgba(37,56,63,0.35)",
                color: COR.claro, fontSize: 12, fontWeight: 700,
                letterSpacing: "1.8px", fontFamily: SANS,
                display: "inline-flex", alignItems: "center", gap: 10,
              }}
            >
              {marLigado && (
                <span className="praia-w" aria-hidden style={{ display: "inline-flex", gap: 2, alignItems: "flex-end", height: 16 }}>
                  <span /><span /><span />
                </span>
              )}
              {marLigado ? T.pausarMar : T.ouvirMar}
            </button>
          </div>
          {marLigado && (
            <p
              className="praia-serif"
              style={{ margin: "26px auto 0", maxWidth: 520, fontStyle: "italic", fontSize: 17, lineHeight: 1.6, opacity: 0.95 }}
            >
              {frases[fraseIdx % frases.length]}
            </p>
          )}
          {(dados.local_evento || statsProva[0]) && (
            <p style={{ margin: "34px 0 0", fontSize: 10, letterSpacing: "2.2px", opacity: 0.7, fontWeight: 700 }}>
              {[dados.local_evento?.toUpperCase(), statsProva[0] ? `${statsProva[0].valor} ${statsProva[0].rotulo}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <audio ref={audioRef} preload="none" />
      </section>

      {/* ---------------- timeline ---------------- */}
      <section style={{ maxWidth: LARGURA_CONTAINER, margin: "0 auto", padding: "88px 32px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 32, flexWrap: "wrap", marginBottom: 30 }}>
          <div>
            <p style={{ ...eyebrow, margin: 0 }}>{T.timelineEyebrow}</p>
            <h2 className="praia-serif" style={{ margin: "12px 0 0", fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: 1.2, whiteSpace: "pre-line" }}>
              {T.timelineTitulo}
            </h2>
          </div>
          <p style={{ margin: 0, maxWidth: 380, fontSize: 13.5, lineHeight: 1.65, color: COR.texto3 }}>
            {T.timelineDica}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TIMELINE_PRAIA.map((h, i) => {
            const on = i === slot;
            return (
              <button
                key={h.tag}
                onClick={() => setSlot(i)}
                style={{
                  padding: "12px 18px", borderRadius: 2, cursor: "pointer",
                  fontSize: 10.5, fontWeight: 700, letterSpacing: "1.6px", fontFamily: SANS,
                  border: `1px solid ${on ? COR.oceano : COR.borda}`,
                  background: on ? COR.oceano : COR.branco,
                  color: on ? COR.claro : COR.oceano,
                  transition: "background .2s, color .2s",
                }}
              >
                {i + 1} · {h.tag}
              </button>
            );
          })}
        </div>

        <div className="praia-grid2" style={{ marginTop: 16 }}>
          <div style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 2, padding: 34 }}>
            <p style={{ ...eyebrow, margin: 0, color: COR.coral }}>{ativa.fase}</p>
            <h3 className="praia-serif" style={{ margin: "12px 0 0", fontSize: 27 }}>{ativa.titulo}</h3>
            <p style={{ margin: "14px 0 0", fontSize: 14.5, lineHeight: 1.7, color: COR.texto3 }}>{ativa.desc}</p>
            <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
              {ativa.itens.map((x) => (
                <li key={x} style={{ display: "flex", gap: 10, fontSize: 13.5, color: COR.escuro }}>
                  <span style={{ color: COR.coral }}>✓</span>
                  {x}
                </li>
              ))}
            </ul>
            <p className="praia-serif" style={{ margin: "20px 0 0", fontStyle: "italic", fontSize: 15, color: COR.oceano }}>
              {ativa.nota}
            </p>
          </div>
          <div
            style={{
              position: "relative", minHeight: 300, borderRadius: 2, overflow: "hidden",
              background: COR.oceano, color: COR.claro, padding: 34,
              display: "flex", flexDirection: "column", justifyContent: "flex-end",
            }}
          >
            <span
              className="praia-serif"
              aria-hidden
              style={{
                position: "absolute", right: 8, top: -18, fontSize: 150,
                lineHeight: 1, color: "rgba(247,242,234,0.09)",
              }}
            >
              {slot + 1}
            </span>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "2.4px", opacity: 0.7 }}>
              MOMENTO {slot + 1} DE {TIMELINE_PRAIA.length}
            </p>
            <p className="praia-serif" style={{ margin: "10px 0 0", fontSize: 22, lineHeight: 1.35 }}>
              {ativa.nota}
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- simulador do pôr do sol ---------------- */}
      <section style={{ maxWidth: LARGURA_CONTAINER, margin: "0 auto", padding: "88px 32px 0" }}>
        <div className="praia-grid2">
          <div
            style={{
              borderRadius: 2, padding: 38, minHeight: 300,
              background: "linear-gradient(180deg, #F7E3CE 0%, #EFC9A8 55%, #D98D6B 100%)",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ ...eyebrow, margin: 0, color: "#7A4A33" }}>{T.simuladorEyebrow}</p>
              <h2 className="praia-serif" style={{ margin: "12px 0 0", fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: 1.2, color: "#4A2C1E" }}>
                {T.simuladorTitulo}
              </h2>
            </div>
            <div style={{ display: "flex", gap: 26, flexWrap: "wrap", marginTop: 26 }}>
              {[
                ["SUA ENTRADA", entradaHora],
                ["PÔR DO SOL", solHora],
                ["GOLDEN HOUR", goldenHora],
              ].map(([r, v]) => (
                <div key={r}>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: "1.8px", color: "#7A4A33" }}>{r}</p>
                  <p className="praia-serif" style={{ margin: "4px 0 0", fontSize: 22, color: "#4A2C1E" }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 2, padding: 30 }}>
            <p style={{ ...eyebrow, margin: 0 }}>ONDE</p>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <input
                value={simBusca}
                onChange={(e) => setSimBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarPraia()}
                placeholder="Praia, cidade ou estado"
                style={{
                  flex: 1, minWidth: 0, border: `1px solid ${COR.bordaInput}`,
                  borderRadius: 2, background: COR.suave, padding: "12px 14px",
                  fontSize: 14, fontFamily: SANS, color: COR.escuro, outline: "none",
                }}
              />
              <button
                onClick={buscarPraia}
                disabled={simStatus === "buscando"}
                style={{
                  border: "none", cursor: "pointer", borderRadius: 2,
                  background: COR.oceano, color: COR.claro, padding: "0 18px",
                  fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", fontFamily: SANS,
                }}
              >
                {simStatus === "buscando" ? "…" : "BUSCAR"}
              </button>
            </div>
            <p
              style={{
                margin: "8px 0 0", fontSize: 12,
                color: simStatus === "ok" ? COR.verde : simStatus === "buscando" ? COR.texto2 : COR.vermelho,
              }}
            >
              {simStatus === "ok" && `✓ ${simNome}`}
              {simStatus === "buscando" && "Procurando…"}
              {simStatus === "nao-achou" && "Não achei esse lugar — tente cidade e estado."}
              {simStatus === "erro" && "Sem conexão com o mapa agora. O horário usa a última praia."}
            </p>

            <p style={{ ...eyebrow, margin: "22px 0 0" }}>QUANDO</p>
            <input
              type="date"
              value={simData}
              onChange={(e) => setSimData(e.target.value)}
              style={{
                marginTop: 8, width: "100%", border: `1px solid ${COR.bordaInput}`,
                borderRadius: 2, background: COR.suave, padding: "12px 14px",
                fontSize: 14, fontFamily: SANS, color: COR.escuro, outline: "none",
              }}
            />
            <p style={{ margin: "16px 0 0", fontSize: 12.5, lineHeight: 1.65, color: COR.texto2 }}>
              A entrada acontece cerca de 40 minutos antes do sol se pôr — é a
              conta que fazemos para a cerimônia terminar na golden hour.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- montador ---------------- */}
      <section id="montador" style={{ maxWidth: LARGURA_CONTAINER, margin: "0 auto", padding: "88px 32px 0" }}>
        <p style={{ ...eyebrow, margin: 0 }}>{T.montadorEyebrow}</p>
        <h2 className="praia-serif" style={{ margin: "12px 0 30px", fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: 1.2 }}>
          {T.montadorTitulo}
        </h2>

        <div className="praia-grid2" style={{ alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 01 prazo */}
            <Bloco n="01" titulo={T.passoPrazo}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PRAZOS_PRAIA.map((p) => {
                  const on = prazo === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => escolherPrazo(p.id)}
                      style={{
                        flex: "1 1 140px", padding: "14px 16px", borderRadius: 2,
                        cursor: "pointer", textAlign: "left",
                        border: `1px solid ${on ? COR.oceano : COR.borda}`,
                        background: on ? COR.oceano : COR.branco,
                        color: on ? COR.claro : COR.escuro,
                        transition: "background .2s, color .2s",
                      }}
                    >
                      <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{p.rotulo}</span>
                      <span style={{ display: "block", marginTop: 4, fontSize: 11.5, opacity: 0.75 }}>{p.dica}</span>
                    </button>
                  );
                })}
              </div>
            </Bloco>

            {/* 02 pacote */}
            <Bloco n="02" titulo={T.passoPacote}>
              {pacotes.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13.5, color: COR.texto2 }}>
                  Os pacotes ainda não foram cadastrados nesta proposta.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pacotes.map((p) => {
                    const on = p.id === pacoteId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPacoteId(p.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "16px 18px", borderRadius: 2, cursor: "pointer",
                          textAlign: "left",
                          border: `1px solid ${on ? COR.coral : COR.borda}`,
                          background: on ? COR.selecionado : COR.branco,
                          color: COR.escuro, transition: "background .2s, border-color .2s",
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, letterSpacing: "1px" }}>
                            {p.nome.toUpperCase()}
                          </span>
                          {p.subtitulo && (
                            <span style={{ display: "block", marginTop: 4, fontSize: 12.5, color: COR.texto2 }}>
                              {p.subtitulo}
                            </span>
                          )}
                        </span>
                        <span className="praia-serif" style={{ fontSize: 20, color: on ? COR.coral : COR.oceano, whiteSpace: "nowrap" }}>
                          {precoDePacote(p.preco)}
                        </span>
                        {on && <span style={{ color: COR.coral }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </Bloco>

            {/* 03 convidados */}
            <Bloco n="03" titulo={T.passoConvidados}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.6px", color: COR.texto2 }}>CONVIDADOS</span>
                <span className="praia-serif" style={{ fontSize: 34, color: COR.oceano }}>{convidados}</span>
              </div>
              <input
                type="range"
                className="praia-slider"
                min={regra.min}
                max={regra.max}
                step={5}
                value={convidados}
                onChange={(e) => setConvidados(Number(e.target.value))}
                aria-label="Número de convidados"
                style={{ width: "100%", marginTop: 14 }}
              />
              <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11, color: COR.texto2 }}>
                <span>{regra.min}</span>
                <span>ATÉ {regra.inclusos} INCLUSOS</span>
                <span>{regra.max}</span>
              </div>
              {valores.valorConvidadosExtra > 0 && (
                <p style={{ margin: "12px 0 0", fontSize: 12.5, color: COR.texto3 }}>
                  Acima de {regra.inclusos} convidados: +{brl(valores.valorConvidadosExtra)}
                </p>
              )}
            </Bloco>

            {/* 04 pista */}
            <Bloco n="04" titulo={T.passoPista}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ESTILOS_PRAIA.map((g) => {
                  const on = estilos.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => alternaStr(estilos, setEstilos, g)}
                      style={{
                        padding: "10px 16px", borderRadius: 2, cursor: "pointer",
                        fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", fontFamily: SANS,
                        border: `1px solid ${on ? COR.oceano : COR.borda}`,
                        background: on ? COR.oceano : COR.branco,
                        color: on ? COR.claro : COR.oceano,
                        transition: "background .2s, color .2s",
                      }}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </Bloco>

            {/* 05 extras */}
            {extras.length > 0 && (
              <Bloco n="05" titulo={T.passoExtras} sub={T.extrasDica}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {extras.map((x) => {
                    const on = extrasIds.includes(x.id);
                    const aCotar = Number(x.preco) === 0;
                    return (
                      <button
                        key={x.id}
                        onClick={() => alternaStr(extrasIds, setExtrasIds, x.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "14px 16px", borderRadius: 2, cursor: "pointer",
                          textAlign: "left",
                          border: `1px solid ${on ? COR.coral : COR.borda}`,
                          background: on ? COR.selecionado : COR.branco,
                          color: COR.escuro, transition: "background .2s, border-color .2s",
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            flex: "none", width: 34, height: 34, borderRadius: 2,
                            border: `1px solid ${COR.coral}`, display: "grid",
                            placeItems: "center", fontSize: 14,
                            background: on ? COR.coral : "transparent",
                            color: on ? "#fff" : COR.coral,
                          }}
                        >
                          {on ? "✓" : "+"}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{x.nome}</span>
                          {x.descricao && (
                            <span style={{ display: "block", marginTop: 3, fontSize: 12, color: COR.texto2 }}>
                              {x.descricao}
                            </span>
                          )}
                        </span>
                        <span className="praia-serif" style={{ fontSize: 16, color: COR.oceano, whiteSpace: "nowrap" }}>
                          {aCotar ? "a cotar" : `+${brl(Number(x.preco))}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Bloco>
            )}

            {/* incluso */}
            <div style={{ background: COR.suave, border: `1px solid ${COR.borda}`, borderRadius: 2, padding: 30 }}>
              <p style={{ ...eyebrow, margin: 0 }}>{T.inclusoEyebrow}</p>
              <p className="praia-serif" style={{ margin: "12px 0 0", fontSize: 20, lineHeight: 1.5, color: COR.escuro }}>
                {T.inclusoTitulo}
              </p>
              <div className="praia-grid-trad" style={{ marginTop: 20 }}>
                {INCLUSO_PRAIA.map((i) => (
                  <div key={i.num} style={{ display: "flex", gap: 12 }}>
                    <span className="praia-serif" style={{ fontSize: 18, color: COR.coral }}>{i.num}</span>
                    <span>
                      <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1.6px" }}>{i.titulo}</span>
                      <span style={{ display: "block", marginTop: 3, fontSize: 12, lineHeight: 1.55, color: COR.texto3 }}>{i.desc}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ margin: "20px 0 0", paddingTop: 16, borderTop: `1px solid ${COR.divisor}`, fontSize: 12, lineHeight: 1.65, color: COR.texto2 }}>
                {T.foraDoValor}
              </p>
            </div>
          </div>

          {/* resumo sticky */}
          <div style={{ position: "sticky", top: 104 }}>
            <div style={{ background: COR.escuro, color: COR.claro, borderRadius: 2, padding: 30 }}>
              <p style={{ ...eyebrow, margin: 0, color: "rgba(247,242,234,0.6)" }}>O SEU ORÇAMENTO</p>
              <p className="praia-serif" style={{ margin: "10px 0 0", fontSize: 24, lineHeight: 1.3 }}>
                {nome || dados.nome_contato}
              </p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <Linha r="Momento" v={PRAZOS_PRAIA.find((p) => p.id === prazo)?.rotulo ?? "—"} />
                <Linha r="Assessoria" v={pacote?.nome ?? "—"} />
                <Linha r="Convidados" v={String(convidados)} />
                {valores.valorConvidadosExtra > 0 && (
                  <Linha r="Convidados extras" v={`+${brl(valores.valorConvidadosExtra)}`} />
                )}
                <Linha r="Roteiro" v={`${tradicoes.length} ${tradicoes.length === 1 ? "tradição" : "tradições"}`} />
                <Linha r="Pista" v={`${estilos.length} ${estilos.length === 1 ? "estilo" : "estilos"}`} />
                {extrasSelecionados.length > 0 && (
                  <Linha r="Extras" v={`${extrasSelecionados.length} ${extrasSelecionados.length === 1 ? "item" : "itens"}`} />
                )}
              </div>
              <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(247,242,234,0.18)" }}>
                <p style={{ ...eyebrow, margin: 0, color: "rgba(247,242,234,0.6)" }}>INVESTIMENTO TOTAL</p>
                <p className="praia-serif" style={{ margin: "6px 0 0", fontSize: 38, lineHeight: 1, color: COR.coral }}>
                  {brl(valores.total)}
                </p>
                {condicoes.parcelasMaximo > 1 && valores.parcela !== null && (
                  <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "rgba(247,242,234,0.75)" }}>
                    ou {condicoes.parcelasMaximo}× de {brl(valores.parcela)}
                  </p>
                )}
                {temACotar && (
                  <p style={{ margin: "12px 0 0", fontSize: 11.5, lineHeight: 1.55, color: "rgba(247,242,234,0.65)" }}>
                    {T.aCotarAviso}
                  </p>
                )}
              </div>
              {recibo ? (
                <div style={{ marginTop: 20, padding: 14, borderRadius: 2, border: `1px solid ${COR.coral}` }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "1.6px", color: COR.coral }}>
                    DATA TRAVADA ✓
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "rgba(247,242,234,0.85)" }}>
                    Recibo {recibo.codigo} · {brl(recibo.total)}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setModal(true)}
                  disabled={!podeResponder || !pacote}
                  style={{
                    marginTop: 20, width: "100%", padding: "16px 0", borderRadius: 2,
                    border: "none",
                    cursor: podeResponder && pacote ? "pointer" : "not-allowed",
                    background: podeResponder && pacote ? COR.coral : COR.bordaInput,
                    color: "#fff", fontSize: 12, fontWeight: 700,
                    letterSpacing: "1.8px", fontFamily: SANS,
                  }}
                >
                  {T.assinarCta}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- roteiro (tradições) ---------------- */}
      <section style={{ maxWidth: LARGURA_CONTAINER, margin: "0 auto", padding: "88px 32px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <p style={{ ...eyebrow, margin: 0 }}>{T.roteiroEyebrow}</p>
            <h2 className="praia-serif" style={{ margin: "12px 0 0", fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: 1.2 }}>
              O que entra no dia de vocês
            </h2>
          </div>
          <p style={{ ...eyebrow, margin: 0, color: COR.coral }}>{T.roteiroDica}</p>
        </div>
        <div className="praia-grid-trad">
          {TRADICOES_PRAIA.map((t, i) => {
            const on = tradicoes.includes(i);
            return (
              <button
                key={t}
                onClick={() => alternaNum(tradicoes, setTradicoes, i)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "14px 16px", borderRadius: 2, cursor: "pointer",
                  textAlign: "left",
                  border: `1px solid ${on ? COR.coral : COR.borda}`,
                  background: on ? COR.selecionado : COR.branco,
                  color: COR.escuro, transition: "background .2s, border-color .2s",
                }}
              >
                <span style={{ color: COR.coral, fontSize: 14 }}>{on ? "✓" : "+"}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t}</span>
              </button>
            );
          })}
        </div>
        <p className="praia-serif" style={{ margin: "18px 0 0", fontStyle: "italic", fontSize: 17, color: COR.oceano }}>
          {roteiroFrase}
        </p>
      </section>

      {/* ---------------- stats + cta data ---------------- */}
      <section style={{ maxWidth: LARGURA_CONTAINER, margin: "0 auto", padding: "88px 32px 0" }}>
        {statsProva.length > 0 && (
          <div className="praia-grid-cards">
            {statsProva.map((s) => (
              <div key={s.rotulo} style={{ border: `1px solid ${COR.borda}`, background: COR.branco, borderRadius: 2, padding: 28 }}>
                <p className="praia-serif" style={{ margin: 0, fontSize: 40, color: COR.oceano }}>{s.valor}</p>
                <p style={{ margin: "8px 0 0", fontSize: 10.5, letterSpacing: "2px", color: COR.texto2, fontWeight: 700 }}>
                  {s.rotulo}
                </p>
              </div>
            ))}
          </div>
        )}
        <div style={{ border: `1px solid ${COR.borda}`, background: COR.branco, borderRadius: 2, marginTop: statsProva.length ? 16 : 0, padding: "44px 32px", textAlign: "center" }}>
          <p className="praia-serif" style={{ margin: "0 auto", fontSize: "clamp(24px, 3vw, 34px)", lineHeight: 1.35, maxWidth: 560 }}>
            {dataExtenso ? `A data de ${dataExtenso} ainda está livre.` : "A data de vocês ainda está livre."}
          </p>
          <button
            onClick={() => (podeResponder ? setModal(true) : irParaMontador())}
            style={{
              marginTop: 28, border: "none", cursor: "pointer", borderRadius: 2,
              background: COR.coral, color: "#fff", padding: "17px 34px",
              fontSize: 12, fontWeight: 700, letterSpacing: "1.8px", fontFamily: SANS,
            }}
          >
            QUERO ESSA DATA — {brl(valores.total)}
          </button>
        </div>
      </section>

      {/* ---------------- prova social: depoimento + carta ---------------- */}
      <section style={{ maxWidth: LARGURA_CONTAINER, margin: "0 auto", padding: "88px 32px 0" }}>
        <div className="praia-grid2">
          {depoimento && (
            <div style={{ position: "relative", background: COR.branco, border: `1px solid ${COR.borda}`, borderRadius: 2, padding: 38 }}>
              <span className="praia-serif" aria-hidden style={{ position: "absolute", top: 6, left: 18, fontSize: 70, color: "#F0DFD1" }}>
                “
              </span>
              <p className="praia-serif" style={{ position: "relative", margin: 0, fontStyle: "italic", fontSize: 19, lineHeight: 1.6 }}>
                {depoimento.texto}
              </p>
              <p style={{ margin: "18px 0 0", fontSize: 11, fontWeight: 700, letterSpacing: "1.8px", color: COR.texto2 }}>
                {depoimento.autor.toUpperCase()}
                {depoimento.contexto ? ` · ${depoimento.contexto.toUpperCase()}` : ""}
              </p>
            </div>
          )}
          <div
            style={{
              position: "relative", background: COR.suave, borderRadius: 2, padding: 38,
              border: `1px solid ${COR.oceano}`, display: "flex", flexDirection: "column", gap: 16,
            }}
          >
            <span className="praia-serif" aria-hidden style={{ position: "absolute", top: 6, left: 18, fontSize: 70, color: "#DCE4E6" }}>
              “
            </span>
            <p style={{ ...eyebrow, position: "relative", margin: 0 }}>{T.cartaEyebrow}</p>
            <p className="praia-serif" style={{ position: "relative", margin: 0, fontStyle: "italic", fontSize: 17, lineHeight: 1.7 }}>
              {CARTA_PRAIA(primeiroNome)}
            </p>
            <p className="praia-serif" style={{ margin: "auto 0 0", fontSize: 22, color: COR.oceano }}>
              {dados.nome_empresa}
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- footer ---------------- */}
      <footer
        style={{
          maxWidth: LARGURA_CONTAINER, margin: "0 auto", padding: "56px 32px 136px",
          display: "flex", justifyContent: "space-between", gap: 24,
          flexWrap: "wrap", alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            className="praia-serif"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              border: `1px solid ${COR.oceano}`, display: "grid",
              placeItems: "center", fontSize: 13, color: COR.oceano,
            }}
          >
            {dados.nome_empresa.slice(0, 2).toUpperCase()}
          </span>
          <span>
            <span style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "1.8px" }}>
              {dados.nome_empresa.toUpperCase()}
            </span>
            <span style={{ display: "block", marginTop: 3, fontSize: 11.5, color: COR.texto2 }}>
              {[dados.local_evento, dados.cidade_evento].filter(Boolean).join(" · ") || T.rodapeSelo}
            </span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <a
            href={`/orcamento/${hash}/pdf`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "1.8px", color: COR.texto2 }}
          >
            BAIXAR EM PDF
          </a>
          {whats && (
            <a
              href={`https://wa.me/55${whats}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "1.8px", color: COR.coral }}
            >
              WHATSAPP
            </a>
          )}
        </div>
      </footer>

      {/* ---------------- barra fixa ---------------- */}
      {!recibo && (
        <div
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 45,
            background: COR.escuro, color: COR.claro, padding: "15px 32px",
          }}
        >
          <div
            style={{
              maxWidth: LARGURA_CONTAINER, margin: "0 auto", display: "flex",
              alignItems: "center", justifyContent: "space-between",
              gap: 16, flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "1.8px", color: "rgba(247,242,234,0.6)" }}>
                ASSESSORIA {(pacote?.nome ?? "—").toUpperCase()} · {convidados} CONVIDADOS
              </p>
              <p className="praia-serif" style={{ margin: "3px 0 0", fontSize: 24, color: COR.coral }}>
                {brl(valores.total)}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {faltam > 0 && (
                <span style={{ fontSize: 11.5, color: "rgba(247,242,234,0.65)" }}>
                  {faltam === 1 ? "Falta 1 escolha" : `Faltam ${faltam} escolhas`}
                </span>
              )}
              <button
                onClick={() => (podeResponder ? setModal(true) : irParaMontador())}
                disabled={!podeResponder || !pacote}
                style={{
                  border: "none", borderRadius: 2, padding: "14px 26px",
                  cursor: podeResponder && pacote ? "pointer" : "not-allowed",
                  background: podeResponder && pacote ? COR.coral : "rgba(247,242,234,0.25)",
                  color: "#fff", fontSize: 11, fontWeight: 700,
                  letterSpacing: "1.8px", fontFamily: SANS,
                }}
              >
                {T.barraCta}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && pacote && (
        <ModalAceiteProposta
          hash={hash}
          tema={TEMA_MODAL}
          titulo={`Fechar o casamento de ${nome || dados.nome_contato}?`}
          subtitulo="CONTRATO DIGITAL · ASSINATURA"
          resumo={`${pacote.nome} · ${convidados} convidados · ${brl(valores.total)}${condicoes.parcelasMaximo > 1 && valores.parcela !== null ? ` · até ${condicoes.parcelasMaximo}× de ${brl(valores.parcela)}` : ""}${temACotar ? " · itens a cotar seguem no contrato" : ""}`}
          nomeInicial={nome || dados.nome_contato}
          pacoteId={pacote.id}
          convidados={convidados}
          extrasIds={extrasIds}
          parcelas={condicoes.parcelasMaximo}
          tipoEvento={dados.tipo_evento}
          dataEvento={dados.data_evento}
          assinaturaDupla
          rotuloAssinatura="Assinatura noiva"
          rotuloAssinatura2="Assinatura noivo"
          textoBotao="ASSINAR E TRAVAR A DATA →"
          rodape="Li e aceito as condições desta proposta. O contrato de assessoria é enviado em seguida."
          onFechar={() => setModal(false)}
          onAceito={(codigo, total) => {
            setModal(false);
            setRecibo({ codigo, total });
          }}
        />
      )}
    </div>
  );
}

/* ---------------- peças ---------------- */

function Bloco({
  n,
  titulo,
  sub,
  children,
}: {
  n: string;
  titulo: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2D8C9", borderRadius: 2, padding: 30 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <span className="praia-serif" style={{ fontSize: 22, color: "#E4857A" }}>{n}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#25383F" }}>{titulo}</span>
      </div>
      {sub && (
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#8C8074" }}>{sub}</p>
      )}
      {!sub && <div style={{ height: 8 }} />}
      {children}
    </div>
  );
}

function Linha({ r, v }: { r: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "rgba(247,242,234,0.6)" }}>{r}</span>
      <span style={{ fontWeight: 700, textAlign: "right" }}>{v}</span>
    </div>
  );
}
