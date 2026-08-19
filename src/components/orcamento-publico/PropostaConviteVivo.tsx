"use client";

// Debutante — "Convite Vivo" (modelo 03 do handoff).
//
// O mais interativo dos templates: vídeo em loop no hero, trilha opcional,
// timeline hora a hora e um montador de seis passos que recalcula o valor
// ao vivo. Fiel à especificação de design (px, cores, animações), com três
// desvios deliberados, todos anotados no ponto onde acontecem:
//
//   1. Preços, extras e regra de convidados vêm do Catálogo da empresa,
//      não das constantes do handoff — que a própria SPEC chama de
//      placeholders. Sem isso o template ignoraria o cadastro dela.
//   2. A contagem regressiva usa a validade real da proposta, não
//      "agora + 10 dias".
//   3. Nada de histórico inventado: "300 festas", "4.9 no Google" e os
//      cartões de prova saem dos stats do Catálogo e somem quando ela não
//      preencheu — o handoff trazia números de outra empresa.
//
// Mídia: vídeo e trilha ficam no Storage (proposta-midia), iguais para
// todas as empresas. O áudio só baixa quando a visitante liga o som —
// são 10 MB que ninguém deve pagar sem pedir.

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
} from "@/lib/proposta";
import {
  GENEROS_CONVITE_VIVO,
  HORAS_CONVITE_VIVO,
  INCLUSO_CONVITE_VIVO,
  MIDIA_CONVITE_VIVO,
  MOMENTOS_CONVITE_VIVO,
  TEXTOS_CONVITE_VIVO as T,
  TRADICOES_CONVITE_VIVO,
} from "@/lib/proposta-convite-vivo-conteudo";

/* ---------------- tokens da SPEC ---------------- */

const COR = {
  ameixa: "#12060F",
  ameixaEscuro: "#0d040b",
  champanhe: "#E8C87E",
  champanheClaro: "#f3ddab",
  rosa: "#E91E8C",
  rosaEscuro: "#c2166f",
  marfim: "#FFF8F2",
};

const SERIF = "var(--font-instrument), Georgia, serif";
const SANS = "var(--font-manrope), system-ui, sans-serif";

const marfim = (a: number) => `rgba(255,248,242,${a})`;
const champ = (a: number) => `rgba(232,200,126,${a})`;
const rosa = (a: number) => `rgba(233,30,140,${a})`;

const brl = (n: number) => Number(n).toLocaleString("pt-BR");

const TEMA_MODAL: TemaModal = {
  fundo: "rgba(255,248,242,.04)",
  card: "#12060F",
  texto: COR.marfim,
  textoSuave: marfim(0.6),
  borda: marfim(0.16),
  acento: COR.champanhe,
  botaoFundo: COR.champanhe,
  botaoTexto: COR.ameixa,
  raio: 28,
};

export function PropostaConviteVivo({
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
  const [momento, setMomento] = useState<string>(MOMENTOS_CONVITE_VIVO[0].id);
  const [pacoteId, setPacoteId] = useState<string | null>(
    pacotes.find((p) => p.recomendado)?.id ?? pacotes[0]?.id ?? null
  );
  const [convidados, setConvidados] = useState(
    dados.numero_convidados ?? regra.inclusos
  );
  const [generos, setGeneros] = useState<string[]>([]);
  const [extrasIds, setExtrasIds] = useState<string[]>([]);
  const [tradicoes, setTradicoes] = useState<string[]>([]);
  const [hora, setHora] = useState(HORAS_CONVITE_VIVO[3].hora);
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

  /* Passo 01 pré-seleciona o pacote pela ordem do Catálogo: o primeiro é
     o mais completo, o último o mais enxuto — mesma lógica do handoff,
     só que sobre os pacotes que ELA cadastrou. */
  function escolherMomento(id: string) {
    setMomento(id);
    const i = MOMENTOS_CONVITE_VIVO.findIndex((m) => m.id === id);
    const alvo = pacotes[Math.min(i, pacotes.length - 1)];
    if (alvo) setPacoteId(alvo.id);
  }

  const alterna = (lista: string[], set: (v: string[]) => void, id: string) =>
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  /* Progresso: os cinco marcos da SPEC, adaptados ao que existe aqui. */
  const marcos = [
    nome.trim() !== "",
    pacote !== null,
    convidados !== regra.inclusos,
    tradicoes.length >= 4,
    generos.length >= 3,
  ];
  const pct = Math.round((marcos.filter(Boolean).length / marcos.length) * 100);
  const faltam = marcos.filter((m) => !m).length;

  /* ---------------- trilha: só baixa quando pedem ---------------- */

  const audioRef = useRef<HTMLAudioElement>(null);
  const [somLigado, setSomLigado] = useState(false);

  function alternarSom() {
    const el = audioRef.current;
    if (!el) return;
    if (somLigado) {
      el.pause();
      setSomLigado(false);
      return;
    }
    // src só agora: são ~10 MB que ninguém deve baixar sem pedir
    if (!el.src) el.src = MIDIA_CONVITE_VIVO.trilha;
    el.loop = true;
    el.volume = 0.55;
    void el.play().then(
      () => setSomLigado(true),
      () => setSomLigado(false)
    );
  }

  useEffect(() => {
    const el = audioRef.current;
    return () => {
      el?.pause();
    };
  }, []);

  /* ---------------- barra de progresso da página ---------------- */

  const [rolagem, setRolagem] = useState(0);
  useEffect(() => {
    const aoRolar = () => {
      const total =
        document.documentElement.scrollHeight - window.innerHeight;
      setRolagem(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  const irParaMontador = () =>
    document.getElementById("montador")?.scrollIntoView({ behavior: "smooth" });

  const horaAtiva =
    HORAS_CONVITE_VIVO.find((h) => h.hora === hora) ?? HORAS_CONVITE_VIVO[0];

  const dataExtenso = dados.data_evento
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "long",
        weekday: "long",
      })
        .format(new Date(`${dados.data_evento}T12:00:00`))
        .toUpperCase()
    : null;

  const statsProva = [
    inst?.stat_eventos_realizados
      ? { valor: String(inst.stat_eventos_realizados), rotulo: "FESTAS ENTREGUES" }
      : null,
    inst?.stat_anos_experiencia
      ? { valor: String(inst.stat_anos_experiencia), rotulo: "ANOS DE ESTRADA" }
      : null,
    inst?.stat_equipe_texto
      ? { valor: inst.stat_equipe_texto, rotulo: "EQUIPE NO DIA" }
      : null,
  ].filter(Boolean) as { valor: string; rotulo: string }[];

  const whats = (inst?.whatsapp_contato ?? "").replace(/\D/g, "");

  return (
    <div
      style={{
        background: COR.ameixa,
        color: COR.marfim,
        fontFamily: SANS,
        minHeight: "100vh",
        // Sem overflow-x aqui: ele cria um contexto de rolagem e mata
        // TODO position:sticky de dentro — a barra do topo e o cartão de
        // resumo iam embora ao rolar. Quem transborda são os blobs, e cada
        // seção que tem um já recorta o seu.
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`
        .cv *::selection{background:${COR.rosa};color:#fff}
        .cv-serif{font-family:${SERIF};font-weight:400}
        .cv-it{font-style:italic}
        @keyframes cvRise{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes cvPulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes cvDrift{0%{transform:translate(0,0)}50%{transform:translate(18px,-22px)}100%{transform:translate(0,0)}}
        .cv-rise{animation:cvRise .7s ease both}
        .cv-pulse{animation:cvPulse 1.4s ease-in-out infinite}
        .cv-drift-a{animation:cvDrift 9s ease-in-out infinite}
        .cv-drift-b{animation:cvDrift 11s ease-in-out infinite reverse}
        .cv-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(480px,100%),1fr));gap:34px}
        .cv-grid-momentos{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
        .cv-grid-trad{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:12px}
        .cv-grid-corrente{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));row-gap:44px;column-gap:34px}
        .cv-grid-timeline{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:26px}
        .cv-grid-prova{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px}
        .cv-scroll::-webkit-scrollbar{height:8px}
        .cv-scroll::-webkit-scrollbar-thumb{background:${marfim(0.2)};border-radius:99px}
        .cv-slider{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;outline:none}
        .cv-slider::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;border-radius:999px;background:${COR.champanhe};border:3px solid ${COR.ameixa};box-shadow:0 0 0 1px ${COR.champanhe},0 4px 14px rgba(0,0,0,.6);cursor:pointer}
        .cv-slider::-moz-range-thumb{width:26px;height:26px;border-radius:999px;background:${COR.champanhe};border:3px solid ${COR.ameixa};box-shadow:0 0 0 1px ${COR.champanhe};cursor:pointer}
        @media (prefers-reduced-motion:reduce){
          .cv-rise,.cv-pulse,.cv-drift-a,.cv-drift-b{animation:none}
        }
        @media (max-width:900px){.cv-elo{display:none}}
      `}</style>

      <div className="cv">
        {/* ---------------- topo ---------------- */}
        <div
          style={{
            position: "sticky", top: 0, zIndex: 40,
            background: "rgba(18,6,15,.88)", backdropFilter: "blur(16px)",
            borderBottom: `1px solid ${marfim(0.1)}`,
          }}
        >
          <div style={{ height: 3, background: marfim(0.08) }}>
            <div
              style={{
                height: "100%", width: `${rolagem}%`,
                background: `linear-gradient(to right, ${COR.rosa}, ${COR.champanhe})`,
                transition: "width .4s ease",
              }}
            />
          </div>
          <div
            style={{
              maxWidth: 1280, margin: "0 auto", padding: "12px 32px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 18, flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {dados.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dados.logo_url}
                  alt={dados.nome_empresa}
                  style={{ width: 30, height: 30, borderRadius: 999, objectFit: "cover" }}
                />
              ) : (
                <span
                  className="cv-serif"
                  style={{
                    width: 30, height: 30, borderRadius: 999,
                    border: `1px solid ${champ(0.5)}`, background: champ(0.12),
                    display: "grid", placeItems: "center",
                    fontSize: 15, color: COR.champanhe,
                  }}
                >
                  15
                </span>
              )}
              <span style={{ lineHeight: 1.1 }}>
                <span
                  style={{
                    display: "block", fontSize: 11, fontWeight: 800,
                    letterSpacing: ".22em",
                  }}
                >
                  {dados.nome_empresa.toUpperCase()}
                </span>
                <span
                  style={{
                    display: "block", fontSize: 9, fontWeight: 700,
                    letterSpacing: ".24em", color: marfim(0.45),
                  }}
                >
                  {T.rodapeSelo}
                </span>
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 10, fontWeight: 800, letterSpacing: ".24em",
                  color: marfim(0.5),
                }}
              >
                <span
                  className="cv-pulse"
                  style={{
                    width: 7, height: 7, borderRadius: 999,
                    background: COR.champanhe, boxShadow: `0 0 14px ${COR.champanhe}`,
                  }}
                />
                PROPOSTA {pct}% MONTADA
              </span>
              {podeResponder && !tempo.acabou && (
                <span
                  style={{
                    fontSize: 12, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                    color: marfim(0.75),
                  }}
                >
                  VALOR TRAVA EM {String(tempo.dias).padStart(2, "0")}d{" "}
                  {String(tempo.horas).padStart(2, "0")}h
                </span>
              )}
              <button
                onClick={() => (podeResponder ? setModal(true) : irParaMontador())}
                style={{
                  border: "none", cursor: "pointer", borderRadius: 999,
                  padding: "9px 18px", fontSize: 12, fontWeight: 800,
                  letterSpacing: ".04em", background: COR.champanhe, color: COR.ameixa,
                }}
              >
                {podeResponder ? "FECHAR" : "VER PROPOSTA"}
              </button>
            </div>
          </div>
        </div>

        {/* ---------------- hero ---------------- */}
        <section
          style={{
            position: "relative", minHeight: "88vh",
            padding: "72px 32px 88px", display: "flex",
            alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}
        >
          <video
            src={MIDIA_CONVITE_VIVO.video}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", filter: "saturate(1.1) contrast(1.05)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(to top, ${COR.ameixa} 4%, rgba(18,6,15,.72) 45%, rgba(18,6,15,.55) 100%)`,
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute", inset: 0,
              background: `radial-gradient(ellipse at 20% 25%, ${rosa(0.28)}, transparent 55%), radial-gradient(ellipse at 82% 18%, ${champ(0.24)}, transparent 50%)`,
            }}
          />
          <span
            aria-hidden
            className="cv-drift-a"
            style={{
              position: "absolute", left: "8%", top: "18%", width: 220, height: 220,
              borderRadius: 999, background: rosa(0.35), filter: "blur(70px)",
            }}
          />
          <span
            aria-hidden
            className="cv-drift-b"
            style={{
              position: "absolute", right: "10%", bottom: "20%", width: 170, height: 170,
              borderRadius: 999, background: champ(0.22), filter: "blur(60px)",
            }}
          />

          <div
            className="cv-rise"
            style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 900 }}
          >
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 9,
                padding: "8px 16px", borderRadius: 999,
                border: `1px solid ${marfim(0.2)}`, background: "rgba(18,6,15,.4)",
                backdropFilter: "blur(10px)",
                fontSize: 10, fontWeight: 800, letterSpacing: ".24em",
              }}
            >
              <span
                className="cv-pulse"
                style={{ width: 7, height: 7, borderRadius: 999, background: COR.rosa }}
              />
              {T.heroBadge}
            </span>

            {dataExtenso && (
              <p
                style={{
                  margin: "22px 0 0", fontSize: 12, fontWeight: 800,
                  letterSpacing: ".42em", color: marfim(0.68),
                }}
              >
                {dataExtenso}
              </p>
            )}

            <label style={{ display: "block", marginTop: 14 }}>
              <span className="sr-only" style={{ position: "absolute", left: -9999 }}>
                Nome da debutante
              </span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="SEU NOME"
                className="cv-serif"
                style={{
                  width: "100%", background: "transparent", border: "none",
                  outline: "none", textAlign: "center", color: COR.marfim,
                  fontSize: "clamp(48px, 11vw, 104px)", lineHeight: 0.86,
                  letterSpacing: "-.03em",
                }}
              />
            </label>
            <p
              className="cv-serif cv-it"
              style={{
                margin: "6px 0 0", fontSize: "clamp(30px, 6vw, 58px)",
                lineHeight: 1, color: COR.champanhe,
              }}
            >
              {T.heroSub}
            </p>
            <p
              style={{
                margin: "10px 0 0", fontSize: 10, fontWeight: 800,
                letterSpacing: ".24em", color: marfim(0.4),
              }}
            >
              ↑ {T.heroDica}
            </p>

            <p
              style={{
                margin: "26px auto 0", maxWidth: 620, fontSize: 18,
                fontWeight: 500, lineHeight: 1.5, color: marfim(0.72),
                textWrap: "pretty",
              }}
            >
              {T.heroParagrafo}
            </p>

            <div
              style={{
                marginTop: 30, display: "flex", justifyContent: "center",
                gap: 12, flexWrap: "wrap",
              }}
            >
              <button
                onClick={irParaMontador}
                style={{
                  border: "none", cursor: "pointer", borderRadius: 999,
                  padding: "17px 34px", fontSize: 14, fontWeight: 800,
                  letterSpacing: ".06em", background: COR.marfim, color: COR.ameixa,
                }}
              >
                {T.ctaMontar}
              </button>
              <button
                onClick={alternarSom}
                style={{
                  cursor: "pointer", borderRadius: 999, padding: "17px 28px",
                  fontSize: 14, fontWeight: 800, letterSpacing: ".06em",
                  border: `1px solid ${marfim(0.3)}`, background: "rgba(18,6,15,.4)",
                  backdropFilter: "blur(10px)", color: COR.marfim,
                }}
              >
                {somLigado ? "❙❙ PAUSAR O SOM" : "♪ LIGAR O SOM DA FESTA"}
              </button>
            </div>

            {(dados.local_evento || statsProva.length > 0) && (
              <div
                style={{
                  marginTop: 34, display: "flex", justifyContent: "center",
                  gap: 26, flexWrap: "wrap", fontSize: 10, fontWeight: 800,
                  letterSpacing: ".18em", color: marfim(0.5),
                }}
              >
                {dados.local_evento && <span>{dados.local_evento.toUpperCase()}</span>}
                {statsProva[0] && (
                  <>
                    <span>·</span>
                    <span>
                      {statsProva[0].valor} {statsProva[0].rotulo}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <audio ref={audioRef} preload="none" />
        </section>

        {/* ---------------- timeline ---------------- */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 32px" }}>
          <div
            style={{
              display: "flex", flexWrap: "wrap", alignItems: "flex-end",
              justifyContent: "space-between", gap: 18,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0, fontSize: 10, fontWeight: 800,
                  letterSpacing: ".26em", color: COR.rosa,
                }}
              >
                {T.timelineEyebrow}
              </p>
              <h2
                className="cv-serif"
                style={{
                  margin: "16px 0 0", fontSize: "clamp(36px, 6.5vw, 60px)",
                  lineHeight: 0.95, letterSpacing: "-.02em", whiteSpace: "pre-line",
                }}
              >
                {T.timelineTitulo}
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: marfim(0.55) }}>
              {T.timelineDica}
            </p>
          </div>

          <div
            className="cv-scroll"
            style={{
              marginTop: 34, display: "flex", gap: 10,
              overflowX: "auto", paddingBottom: 10,
            }}
          >
            {HORAS_CONVITE_VIVO.map((h) => {
              const ativo = h.hora === hora;
              return (
                <button
                  key={h.hora}
                  onClick={() => setHora(h.hora)}
                  style={{
                    flex: "none", minWidth: 116, padding: "15px 22px",
                    borderRadius: 16, cursor: "pointer", textAlign: "left",
                    border: `1px solid ${ativo ? champ(0.5) : marfim(0.16)}`,
                    background: ativo ? champ(0.14) : marfim(0.03),
                    color: COR.marfim, transition: "background .2s, border-color .2s",
                  }}
                >
                  <span
                    style={{
                      display: "block", fontSize: 19, fontWeight: 800,
                      letterSpacing: "-.01em",
                      color: ativo ? COR.champanhe : COR.marfim,
                    }}
                  >
                    {h.hora}
                  </span>
                  <span
                    style={{
                      display: "block", marginTop: 4, fontSize: 11,
                      fontWeight: 700, letterSpacing: ".1em", color: marfim(0.5),
                    }}
                  >
                    {h.curto.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="cv-grid-timeline"
            style={{
              marginTop: 26, borderRadius: 26, overflow: "hidden",
              border: `1px solid ${marfim(0.14)}`, background: COR.ameixaEscuro,
            }}
          >
            <div style={{ padding: 44 }}>
              <p
                style={{
                  margin: 0, fontSize: 11, fontWeight: 800,
                  letterSpacing: ".24em", color: COR.champanhe,
                }}
              >
                {horaAtiva.hora} · {horaAtiva.tag}
              </p>
              <h3
                className="cv-serif"
                style={{ margin: "14px 0 0", fontSize: 42, lineHeight: 1.05 }}
              >
                {horaAtiva.titulo}
              </h3>
              <p
                style={{
                  margin: "16px 0 0", fontSize: 15, fontWeight: 500,
                  lineHeight: 1.6, color: marfim(0.72), textWrap: "pretty",
                }}
              >
                {horaAtiva.desc}
              </p>
              <ul
                style={{
                  margin: "22px 0 0", padding: 0, listStyle: "none",
                  display: "flex", flexDirection: "column", gap: 10,
                }}
              >
                {horaAtiva.itens.map((i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex", gap: 10, fontSize: 14, fontWeight: 600,
                      color: marfim(0.78),
                    }}
                  >
                    <span style={{ color: COR.champanhe }}>✓</span>
                    {i}
                  </li>
                ))}
              </ul>
              <p
                style={{
                  margin: "24px 0 0", fontSize: 10, fontWeight: 800,
                  letterSpacing: ".16em", color: marfim(0.42),
                }}
              >
                {horaAtiva.rodape}
              </p>
            </div>

            <div
              style={{
                position: "relative", minHeight: 340, display: "grid",
                placeItems: "center", overflow: "hidden",
                background: `radial-gradient(circle at 32% 30%, ${rosa(0.4)}, transparent 52%), radial-gradient(circle at 74% 68%, ${champ(0.34)}, transparent 48%)`,
              }}
            >
              <span
                aria-hidden
                className="cv-drift-a"
                style={{
                  position: "absolute", left: "18%", top: "22%", width: 130, height: 130,
                  borderRadius: 999, background: rosa(0.3), filter: "blur(46px)",
                }}
              />
              <span
                aria-hidden
                className="cv-drift-b"
                style={{
                  position: "absolute", right: "16%", bottom: "18%", width: 150, height: 150,
                  borderRadius: 999, background: champ(0.3), filter: "blur(52px)",
                }}
              />
              <span
                className="cv-serif"
                aria-hidden
                style={{
                  position: "relative", fontSize: 150, lineHeight: 1,
                  letterSpacing: "-.04em", color: marfim(0.14),
                }}
              >
                {horaAtiva.hora}
              </span>
            </div>
          </div>
        </section>

        {/* ---------------- montador ---------------- */}
        <section
          id="montador"
          style={{ background: COR.ameixaEscuro, padding: "96px 0" }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px" }}>
            <p
              style={{
                margin: 0, fontSize: 10, fontWeight: 800,
                letterSpacing: ".26em", color: COR.rosa,
              }}
            >
              {T.montadorEyebrow}
            </p>
            <h2
              className="cv-serif"
              style={{
                margin: "16px 0 34px", fontSize: "clamp(36px, 6.5vw, 64px)",
                lineHeight: 0.95, letterSpacing: "-.02em",
              }}
            >
              {T.montadorTitulo}
            </h2>

            <div className="cv-grid2">
              {/* coluna dos passos */}
              <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
                {/* 01 momento */}
                <Passo n="01" titulo="ONDE VOCÊ ESTÁ">
                  <div className="cv-grid-momentos">
                    {MOMENTOS_CONVITE_VIVO.map((m) => {
                      const ativo = m.id === momento;
                      return (
                        <button
                          key={m.id}
                          onClick={() => escolherMomento(m.id)}
                          style={{
                            textAlign: "left", borderRadius: 18, padding: 18,
                            cursor: "pointer", color: COR.marfim,
                            border: `1px solid ${ativo ? champ(0.5) : marfim(0.16)}`,
                            background: ativo ? champ(0.14) : marfim(0.03),
                            transition: "border-color .2s, background .2s",
                          }}
                        >
                          <span
                            className="cv-serif"
                            style={{
                              display: "block", fontSize: 30, lineHeight: 1,
                              color: COR.champanhe,
                            }}
                          >
                            {m.faixa}
                          </span>
                          <span
                            style={{
                              display: "block", marginTop: 10, fontSize: 13,
                              fontWeight: 800, letterSpacing: ".16em",
                            }}
                          >
                            {m.nome}
                          </span>
                          <span
                            style={{
                              display: "block", marginTop: 8, fontSize: 13,
                              fontWeight: 500, lineHeight: 1.5, color: marfim(0.62),
                            }}
                          >
                            {m.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Passo>

                {/* 02 pacotes */}
                <Passo n="02" titulo="A ASSESSORIA">
                  {pacotes.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 14, color: marfim(0.6) }}>
                      Os pacotes ainda não foram cadastrados nesta proposta.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                      {pacotes.map((p) => {
                        const ativo = p.id === pacoteId;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setPacoteId(p.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 14,
                              width: "100%", textAlign: "left", padding: "16px 18px",
                              borderRadius: 16, cursor: "pointer", color: COR.marfim,
                              border: `1px solid ${ativo ? champ(0.5) : marfim(0.16)}`,
                              background: ativo ? champ(0.14) : marfim(0.03),
                              transition: "border-color .2s, background .2s",
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                flex: "none", width: 19, height: 19, borderRadius: 999,
                                border: `1px solid ${ativo ? COR.champanhe : marfim(0.32)}`,
                                background: ativo ? COR.champanhe : "transparent",
                                display: "grid", placeItems: "center",
                                fontSize: 11, color: COR.ameixa,
                              }}
                            >
                              {ativo ? "✓" : ""}
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  display: "block", fontSize: 13, fontWeight: 800,
                                  letterSpacing: ".16em",
                                }}
                              >
                                {p.nome.toUpperCase()}
                              </span>
                              {p.subtitulo && (
                                <span
                                  style={{
                                    display: "block", marginTop: 6, fontSize: 13,
                                    fontWeight: 500, lineHeight: 1.5, color: marfim(0.62),
                                  }}
                                >
                                  {p.subtitulo}
                                </span>
                              )}
                            </span>
                            <span
                              className="cv-serif"
                              style={{ fontSize: 24, color: COR.champanhe, whiteSpace: "nowrap" }}
                            >
                              R$ {brl(p.preco)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Passo>

                {/* 03 convidados */}
                <Passo n="03" titulo="QUANTA GENTE">
                  <div
                    style={{
                      display: "flex", alignItems: "baseline",
                      justifyContent: "space-between", gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".16em", color: marfim(0.6) }}>
                      CONVIDADOS
                    </span>
                    <span className="cv-serif" style={{ fontSize: 44, lineHeight: 1, color: COR.champanhe }}>
                      {convidados}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="cv-slider"
                    min={regra.min}
                    max={regra.max}
                    step={5}
                    value={convidados}
                    onChange={(e) => setConvidados(Number(e.target.value))}
                    aria-label="Número de convidados"
                    style={{
                      width: "100%", marginTop: 16,
                      background: `linear-gradient(to right, ${COR.champanhe} ${((convidados - regra.min) / Math.max(1, regra.max - regra.min)) * 100}%, ${marfim(0.18)} 0%)`,
                    }}
                  />
                  <div
                    style={{
                      marginTop: 10, display: "flex", justifyContent: "space-between",
                      fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: marfim(0.4),
                    }}
                  >
                    <span>{regra.min}</span>
                    <span>ATÉ {regra.inclusos} INCLUSOS</span>
                    <span>{regra.max}</span>
                  </div>
                  {valores.valorConvidadosExtra > 0 && (
                    <p
                      style={{
                        margin: "14px 0 0", padding: "12px 14px", borderRadius: 14,
                        border: `1px solid ${champ(0.35)}`, background: champ(0.1),
                        fontSize: 13, fontWeight: 600, color: marfim(0.78),
                      }}
                    >
                      Acima de {regra.inclusos} convidados entra R$ {brl(regra.valorPorExtra)} por
                      pessoa: +R$ {brl(valores.valorConvidadosExtra)}
                    </p>
                  )}
                </Passo>

                {/* 04 pista */}
                <Passo n="04" titulo={T.pistaTitulo}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {GENEROS_CONVITE_VIVO.map((g) => {
                      const ativo = generos.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          onClick={() => alterna(generos, setGeneros, g.id)}
                          style={{
                            padding: "11px 19px", borderRadius: 999, cursor: "pointer",
                            fontSize: 12, fontWeight: 800, letterSpacing: ".08em",
                            border: `1px solid ${ativo ? COR.rosa : marfim(0.2)}`,
                            background: ativo ? COR.rosa : marfim(0.03),
                            color: ativo ? "#fff" : marfim(0.78),
                            transition: "background .2s, border-color .2s, color .2s",
                          }}
                        >
                          {g.nome}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ margin: "14px 0 0", fontSize: 13, fontWeight: 500, color: marfim(0.5) }}>
                    {T.pistaDica}
                  </p>
                </Passo>

                {/* 05 extras */}
                {extras.length > 0 && (
                  <Passo n="05" titulo="SERVIÇOS ADICIONAIS">
                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                      {extras.map((x) => {
                        const ativo = extrasIds.includes(x.id);
                        return (
                          <button
                            key={x.id}
                            onClick={() => alterna(extrasIds, setExtrasIds, x.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 14,
                              width: "100%", textAlign: "left", padding: "16px 18px",
                              borderRadius: 16, cursor: "pointer", color: COR.marfim,
                              border: `1px solid ${ativo ? champ(0.5) : marfim(0.16)}`,
                              background: ativo ? champ(0.14) : marfim(0.03),
                              transition: "border-color .2s, background .2s",
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                flex: "none", width: 19, height: 19, borderRadius: 6,
                                border: `1px solid ${ativo ? COR.champanhe : marfim(0.32)}`,
                                background: ativo ? COR.champanhe : "transparent",
                                display: "grid", placeItems: "center",
                                fontSize: 11, color: COR.ameixa,
                              }}
                            >
                              {ativo ? "✓" : ""}
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "block", fontSize: 13, fontWeight: 800, letterSpacing: ".16em" }}>
                                {x.nome.toUpperCase()}
                              </span>
                              {x.descricao && (
                                <span
                                  style={{
                                    display: "block", marginTop: 6, fontSize: 13,
                                    fontWeight: 500, color: marfim(0.62),
                                  }}
                                >
                                  {x.descricao}
                                </span>
                              )}
                            </span>
                            <span className="cv-serif" style={{ fontSize: 22, color: COR.champanhe, whiteSpace: "nowrap" }}>
                              +R$ {brl(x.preco)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </Passo>
                )}

                {/* o que está incluso */}
                <div
                  style={{
                    borderRadius: 24, border: `1px solid ${champ(0.3)}`,
                    background: `linear-gradient(135deg, ${champ(0.13)}, ${rosa(0.07)} 55%, ${marfim(0.03)})`,
                    overflow: "hidden", position: "relative",
                  }}
                >
                  <span
                    aria-hidden
                    className="cv-drift-b"
                    style={{
                      position: "absolute", right: -40, top: -40, width: 240, height: 240,
                      borderRadius: 999, background: champ(0.2), filter: "blur(70px)",
                    }}
                  />
                  <div style={{ position: "relative", padding: "38px 34px 30px" }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: ".26em", color: COR.champanhe }}>
                      {T.inclusoEyebrow}
                    </p>
                    <h3
                      className="cv-serif"
                      style={{
                        margin: "16px 0 0", fontSize: "clamp(28px, 4.4vw, 40px)",
                        lineHeight: 1.04, letterSpacing: "-.01em", maxWidth: 520,
                        textWrap: "pretty",
                      }}
                    >
                      {T.inclusoTitulo}
                      <br />
                      <span className="cv-it" style={{ color: COR.champanhe }}>
                        {T.inclusoTituloItalico}
                      </span>
                    </h3>
                    <p
                      style={{
                        margin: "18px 0 0", maxWidth: 560, fontSize: 14, fontWeight: 500,
                        lineHeight: 1.6, color: marfim(0.72), textWrap: "pretty",
                      }}
                    >
                      {T.inclusoParagrafo}
                    </p>
                  </div>

                  <div className="cv-grid-corrente" style={{ position: "relative", padding: "34px 30px 30px" }}>
                    {INCLUSO_CONVITE_VIVO.map((i) => (
                      <div key={i.n} style={{ position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span
                            className="cv-serif"
                            style={{
                              flex: "none", width: 38, height: 38, borderRadius: 999,
                              border: `1px solid ${champ(0.5)}`, background: champ(0.12),
                              display: "grid", placeItems: "center",
                              fontSize: 19, color: COR.champanhe,
                            }}
                          >
                            {i.n}
                          </span>
                          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", lineHeight: 1.25 }}>
                            {i.rotulo}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: "14px 0 0", fontSize: 13, fontWeight: 500,
                            lineHeight: 1.5, color: marfim(0.62), textWrap: "pretty",
                          }}
                        >
                          {i.desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      position: "relative", padding: "22px 30px",
                      borderTop: `1px solid ${champ(0.22)}`, display: "flex",
                      flexWrap: "wrap", alignItems: "center", gap: 14,
                    }}
                  >
                    <span className="cv-serif cv-it" style={{ fontSize: 20, color: COR.champanhe }}>
                      {T.foraDoValorRotulo}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".04em", color: marfim(0.6) }}>
                      {T.foraDoValor}
                    </span>
                  </div>
                </div>

                {/* 06 roteiro */}
                <Passo
                  n="06"
                  titulo={T.roteiroEyebrow}
                  aoLado={`${TRADICOES_CONVITE_VIVO.length} TRADIÇÕES · ${T.roteiroDica}`}
                >
                  <div className="cv-grid-trad">
                    {TRADICOES_CONVITE_VIVO.map((t) => {
                      const ativo = tradicoes.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => alterna(tradicoes, setTradicoes, t.id)}
                          style={{
                            display: "flex", gap: 12, textAlign: "left",
                            padding: "13px 16px", borderRadius: 999, cursor: "pointer",
                            alignItems: "center", color: COR.marfim,
                            border: `1px solid ${ativo ? champ(0.4) : marfim(0.2)}`,
                            background: ativo ? champ(0.14) : marfim(0.03),
                            transition: "border-color .2s, background .2s",
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              flex: "none", width: 20, height: 20, borderRadius: 999,
                              border: `1px solid ${ativo ? COR.champanhe : marfim(0.32)}`,
                              background: ativo ? COR.champanhe : "transparent",
                              display: "grid", placeItems: "center",
                              fontSize: 11, color: COR.ameixa,
                            }}
                          >
                            {ativo ? "✓" : "+"}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", lineHeight: 1.2 }}>
                              {t.nome}
                            </span>
                            <span style={{ display: "block", marginTop: 4, fontSize: 12, fontWeight: 500, color: marfim(0.55) }}>
                              {t.sub}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      marginTop: 22, paddingTop: 18,
                      borderTop: `1px solid ${champ(0.16)}`,
                    }}
                  >
                    <p className="cv-serif cv-it" style={{ margin: 0, fontSize: 19, color: COR.champanhe }}>
                      {tradicoes.length === 0
                        ? "Escolha os momentos que quer viver."
                        : `${tradicoes.length} ${tradicoes.length === 1 ? "momento" : "momentos"}. Sua noite terá ${TRADICOES_CONVITE_VIVO.filter((t) => tradicoes.includes(t.id)).map((t) => t.nome.toLowerCase()).join(", ")}.`}
                    </p>
                  </div>
                </Passo>
              </div>

              {/* coluna do resumo */}
              <div>
                <div
                  style={{
                    position: "sticky", top: 104, borderRadius: 26, padding: 32,
                    border: `1px solid ${champ(0.3)}`,
                    background: `linear-gradient(to bottom, ${champ(0.11)}, ${marfim(0.04)})`,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: ".26em", color: COR.champanhe }}>
                    O SEU ORÇAMENTO
                  </p>
                  <p className="cv-serif" style={{ margin: "12px 0 0", fontSize: 30, lineHeight: 1 }}>
                    A noite de {nome || dados.nome_contato}
                  </p>

                  <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                    <LinhaResumo r="Momento" v={MOMENTOS_CONVITE_VIVO.find((m) => m.id === momento)?.faixa ?? "—"} />
                    <LinhaResumo r="Assessoria" v={pacote?.nome ?? "—"} />
                    <LinhaResumo r="Convidados" v={String(convidados)} />
                    {valores.valorConvidadosExtra > 0 && (
                      <LinhaResumo r="Convidados extras" v={`+R$ ${brl(valores.valorConvidadosExtra)}`} />
                    )}
                    {valores.valorExtras > 0 && (
                      <LinhaResumo r="Adicionais" v={`+R$ ${brl(valores.valorExtras)}`} />
                    )}
                    <LinhaResumo r="Roteiro" v={`${tradicoes.length} ${tradicoes.length === 1 ? "momento" : "momentos"}`} />
                    <LinhaResumo r="Pista" v={`${generos.length} ${generos.length === 1 ? "estilo" : "estilos"}`} />
                  </div>

                  <div style={{ marginTop: 22, paddingTop: 20, borderTop: `1px solid ${champ(0.22)}` }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: ".24em", color: marfim(0.5) }}>
                      INVESTIMENTO TOTAL
                    </p>
                    <p
                      className="cv-serif"
                      style={{
                        margin: "8px 0 0", fontSize: "clamp(40px, 8vw, 54px)",
                        lineHeight: 1, letterSpacing: "-.03em",
                      }}
                    >
                      R$ {brl(valores.total)}
                    </p>
                    {condicoes.parcelasMaximo > 1 && valores.parcela !== null && (
                      <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 600, color: marfim(0.65) }}>
                        ou {condicoes.parcelasMaximo}× de R$ {brl(valores.parcela)}
                      </p>
                    )}
                  </div>

                  {recibo ? (
                    <div
                      style={{
                        marginTop: 24, padding: 18, borderRadius: 16,
                        border: `1px solid ${champ(0.4)}`, background: champ(0.1),
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".16em", color: COR.champanhe }}>
                        DATA TRAVADA ✓
                      </p>
                      <p style={{ margin: "8px 0 0", fontSize: 13, color: marfim(0.75) }}>
                        Recibo {recibo.codigo} · R$ {brl(recibo.total)}
                      </p>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setModal(true)}
                        disabled={!podeResponder || !pacote}
                        style={{
                          marginTop: 24, width: "100%", padding: 18, borderRadius: 999,
                          border: "none", cursor: podeResponder && pacote ? "pointer" : "not-allowed",
                          fontSize: 13, fontWeight: 800, letterSpacing: ".06em",
                          background: podeResponder && pacote ? COR.champanhe : marfim(0.12),
                          color: podeResponder && pacote ? COR.ameixa : marfim(0.4),
                        }}
                      >
                        ASSINAR E TRAVAR A DATA →
                      </button>
                      <p
                        style={{
                          margin: "14px 0 0", textAlign: "center", fontSize: 10,
                          fontWeight: 700, letterSpacing: ".16em", color: marfim(0.42),
                        }}
                      >
                        {venceu
                          ? "PROPOSTA VENCIDA"
                          : dados.data_validade
                            ? `PROPOSTA VÁLIDA ATÉ ${dados.data_validade.slice(8, 10)}/${dados.data_validade.slice(5, 7)}`
                            : "PROPOSTA EM ABERTO"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- prova + fechamento ---------------- */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 32px" }}>
          {statsProva.length > 0 && (
            <div className="cv-grid-prova">
              {statsProva.map((s) => (
                <div
                  key={s.rotulo}
                  style={{
                    padding: 34, borderRadius: 24, border: `1px solid ${marfim(0.16)}`,
                    background: marfim(0.04),
                  }}
                >
                  <p className="cv-serif" style={{ margin: 0, fontSize: 52, lineHeight: 1, color: COR.champanhe }}>
                    {s.valor}
                  </p>
                  <p
                    style={{
                      margin: "12px 0 0", fontSize: 11, fontWeight: 800,
                      letterSpacing: ".2em", color: marfim(0.5),
                    }}
                  >
                    {s.rotulo}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: statsProva.length > 0 ? 34 : 0, padding: "56px 40px",
              borderRadius: 24, textAlign: "center",
              border: `1px solid ${marfim(0.16)}`,
              background: `radial-gradient(ellipse at 50% 0%, ${rosa(0.16)}, transparent 70%)`,
            }}
          >
            <h2
              className="cv-serif"
              style={{
                margin: 0, fontSize: "clamp(32px, 6vw, 56px)", lineHeight: 1,
                letterSpacing: "-.02em",
              }}
            >
              {dataExtenso
                ? `A data de ${dataExtenso.toLowerCase()} ainda está livre.`
                : "A sua data ainda está livre."}
            </h2>
            <button
              onClick={() => (podeResponder ? setModal(true) : irParaMontador())}
              style={{
                marginTop: 30, padding: "19px 40px", borderRadius: 999, border: "none",
                cursor: "pointer", fontSize: 14, fontWeight: 800, letterSpacing: ".06em",
                background: COR.rosa, color: "#fff",
              }}
            >
              {T.fechamentoCta} — R$ {brl(valores.total)}
            </button>
          </div>
        </section>

        {/* ---------------- rodapé ---------------- */}
        <footer
          style={{
            maxWidth: 1280, margin: "0 auto", padding: "44px 32px 120px",
            borderTop: `1px solid ${marfim(0.1)}`, display: "flex",
            flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              className="cv-serif"
              style={{
                width: 46, height: 46, borderRadius: 999, display: "grid",
                placeItems: "center", border: `1px solid ${champ(0.5)}`,
                background: champ(0.12), fontSize: 18, color: COR.champanhe,
              }}
            >
              {dados.nome_empresa.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 800, letterSpacing: ".16em" }}>
                {dados.nome_empresa.toUpperCase()}
              </span>
              <span style={{ display: "block", marginTop: 4, fontSize: 11, fontWeight: 600, color: marfim(0.5) }}>
                {[dados.local_evento, dados.cidade_evento].filter(Boolean).join(" · ")}
              </span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <a
              href={`/orcamento/${hash}/pdf`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", color: marfim(0.6) }}
            >
              BAIXAR EM PDF
            </a>
            {whats && (
              <a
                href={`https://wa.me/55${whats}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", color: COR.champanhe }}
              >
                WHATSAPP
              </a>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".24em", color: marfim(0.45) }}>
              {T.rodapeSelo}
            </span>
          </div>
        </footer>

        {/* ---------------- barra fixa ---------------- */}
        {!recibo && (
          <div
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 45,
              background: "rgba(13,4,11,.92)", backdropFilter: "blur(18px)",
              borderTop: `1px solid ${marfim(0.1)}`, padding: "14px 24px",
            }}
          >
            <div
              style={{
                maxWidth: 1280, margin: "0 auto", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                gap: 18, flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: ".2em", color: marfim(0.5) }}>
                  {(pacote?.nome ?? "SEM PACOTE").toUpperCase()} · {convidados} PESSOAS
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800 }}>
                  R$ {brl(valores.total)}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                {faltam > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: marfim(0.5) }}>
                    {faltam === 1 ? "Falta 1 escolha" : `Faltam ${faltam} escolhas`}
                  </span>
                )}
                <button
                  onClick={() => (podeResponder ? setModal(true) : irParaMontador())}
                  disabled={!podeResponder || !pacote}
                  style={{
                    padding: "15px 30px", borderRadius: 999, border: "none",
                    cursor: podeResponder && pacote ? "pointer" : "not-allowed",
                    fontSize: 13, fontWeight: 800, letterSpacing: ".06em",
                    background: podeResponder && pacote ? COR.rosa : marfim(0.12),
                    color: podeResponder && pacote ? "#fff" : marfim(0.4),
                  }}
                >
                  {T.barraCta}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {modal && pacote && (
        <ModalAceiteProposta
          hash={hash}
          tema={TEMA_MODAL}
          titulo={`Fechar a noite de ${nome || dados.nome_contato}?`}
          subtitulo={T.contratoEyebrow}
          resumo={`${pacote.nome} • ${convidados} convidados • R$ ${brl(valores.total)}${condicoes.parcelasMaximo > 1 && valores.parcela !== null ? ` • ${condicoes.parcelasMaximo}× de R$ ${brl(valores.parcela)}` : ""}`}
          nomeInicial={nome || dados.nome_contato}
          pacoteId={pacote.id}
          convidados={convidados}
          extrasIds={extrasIds}
          parcelas={condicoes.parcelasMaximo}
          tipoEvento={dados.tipo_evento}
          dataEvento={dados.data_evento}
          textoBotao="ASSINAR E TRAVAR A DATA →"
          rodape="ASSINATURA COM VALIDADE JURÍDICA"
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

function Passo({
  n,
  titulo,
  aoLado,
  children,
}: {
  n: string;
  titulo: string;
  aoLado?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 24, padding: 32,
        border: `1px solid ${marfim(0.16)}`, background: marfim(0.04),
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 14, marginBottom: 20, flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            className="cv-serif"
            style={{ fontSize: 34, lineHeight: 1, color: COR.champanhe }}
          >
            {n}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".16em" }}>
            {titulo}
          </span>
        </div>
        {aoLado && (
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: marfim(0.4) }}>
            {aoLado}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function LinhaResumo({ r, v }: { r: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
      <span style={{ fontWeight: 600, color: marfim(0.55) }}>{r}</span>
      <span style={{ fontWeight: 800, textAlign: "right" }}>{v}</span>
    </div>
  );
}
