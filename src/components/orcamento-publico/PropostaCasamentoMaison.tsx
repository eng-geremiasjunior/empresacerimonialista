"use client";

// Proposta pública de casamento — template "Maison Lumière"
// (design/template-5 Casamento). Alta-costura: sóbrio, hairlines de 0.5px,
// valor único em vez de calculadora de pacotes.
//
// Tokens confirmados no DOM do mockup a 1440px:
//   espresso #2B1E16 · marrom #3C2415 · taupe #8B7355 · camel #B8935A
//   corpo #5C4033 · off #FAF8F5 · card #FDFBF7 · investimento #F5F1EB
//   bordas #E8DDD2/#DDD5C7 (0.5px) · whatsapp #25D366
//   Cormorant Garamond (títulos/preço) + Great Vibes (nome do casal) + Inter
//   topbar 44px · sidebar 240 · seções 112px 72px · container 1320
//   hero 518.9/442 gap 80 · incluso [96px, 1fr, 1.2fr] gap 32
//   no-dia e depoimentos 3x346 gap 0.5 · eventos 4x259 gap 0.5
//   modal 520 raio 20 · canvas 440x120
//
// Diferenças conscientes em relação ao mockup:
//  * o valor vem do orçamento (valor_total) ou do pacote recomendado do
//    Catálogo de casamento — os R$ 12.800 do mockup são de exemplo;
//  * fotos vêm do portfólio do Catálogo; sem portfólio, os slots ficam com
//    o tom de fundo em vez das fotos de referência do Unsplash;
//  * o countdown usa a validade real do orçamento, não 23:41:58 fixo;
//  * a copy institucional é do template, mas depoimentos e imagens são da
//    empresa quando ela tiver cadastrado.

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDateBR } from "@/lib/orcamentos";
import { expirado, type OrcamentoPublicoData } from "@/lib/orcamento-publico";
import { ModalAceiteProposta } from "@/components/orcamento-publico/ModalAceiteProposta";
import {
  NAV_MAISON, HERO_MAISON, QUEM_SOMOS_MAISON, INCLUSO_MAISON,
  COMO_FUNCIONA_MAISON, NO_DIA_MAISON, INVESTIMENTO_MAISON,
  DEPOIMENTOS_MAISON, PROXIMOS_MAISON, MODAL_MAISON,
} from "@/lib/proposta-maison-conteudo";

const ESPRESSO = "#2B1E16";
const MARROM = "#3C2415";
const TAUPE = "#8B7355";
const CAMEL = "#B8935A";
const CORPO = "#5C4033";
const OFF = "#FAF8F5";
const CARD = "#FDFBF7";
const BORDA = "#E8DDD2";

const brl = (v: number) =>
  `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export function PropostaCasamentoMaison({
  hash,
  inicial,
}: {
  hash: string;
  inicial: OrcamentoPublicoData;
}) {
  const dados = inicial;
  const inst = dados.institucional;
  const fotos = dados.fotos ?? [];
  const pacotes = useMemo(() => dados.pacotes ?? [], [dados.pacotes]);

  const depoimentos =
    (dados.depoimentos ?? []).length > 0 ? dados.depoimentos : DEPOIMENTOS_MAISON;

  // Valor único: o do orçamento; se ainda não houver, o pacote recomendado
  // do Catálogo. Este template não tem calculadora — é proposta fechada.
  const pacoteBase =
    pacotes.find((p) => p.recomendado) ?? pacotes[0] ?? null;
  const valor =
    Number(dados.valor_total) > 0
      ? Number(dados.valor_total)
      : Number(pacoteBase?.preco ?? 0);

  const entradaPct = inst?.condicao_entrada_percentual ?? 30;
  const parcelas = inst?.condicao_parcelas_maximo ?? 7;
  const entrada = (valor * entradaPct) / 100;
  const parcela = parcelas > 0 ? (valor - entrada) / parcelas : 0;

  const venceu = expirado(dados);
  const podeResponder = dados.status === "enviado" && !venceu;

  const [modal, setModal] = useState(false);
  const [aceite, setAceite] = useState(dados.aceite ?? null);
  const [ativo, setAtivo] = useState(NAV_MAISON[0].id);
  const [progresso, setProgresso] = useState(0);
  const [rolou, setRolou] = useState(false);

  // Countdown a partir da validade real; começa no cliente (evita mismatch).
  const [cd, setCd] = useState<{ h: string; m: string; s: string } | null>(null);
  useEffect(() => {
    if (!podeResponder) return;
    const fim = new Date(`${dados.data_validade}T23:59:59`).getTime();
    const tick = () => {
      const total = Math.max(0, Math.floor((fim - Date.now()) / 1000));
      const h = Math.floor(total / 3600);
      setCd({
        h: String(h).padStart(2, "0"),
        m: String(Math.floor((total % 3600) / 60)).padStart(2, "0"),
        s: String(total % 60).padStart(2, "0"),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dados.data_validade, podeResponder]);

  // Barra de progresso + sombra da sidebar
  useEffect(() => {
    const onScroll = () => {
      const alcance = document.documentElement.scrollHeight - window.innerHeight;
      setProgresso(alcance > 0 ? (window.scrollY / alcance) * 100 : 0);
      setRolou(window.scrollY > 10);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollspy — mesmos rootMargin do mockup
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setAtivo(e.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    for (const item of NAV_MAISON) {
      const el = document.getElementById(item.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);

  // O mockup usa scrollTo com offset de 46px (não scrollIntoView).
  const irPara = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.offsetTop - 46, behavior: "smooth" });
  }, []);

  const abrir = () => podeResponder && setModal(true);

  if (aceite) {
    return (
      <ReciboMaison
        aceite={aceite}
        nomeEmpresa={dados.nome_empresa}
        contato={dados.nome_contato}
        whatsapp={inst?.whatsapp_contato ?? null}
        entradaPct={entradaPct}
      />
    );
  }

  return (
    <div className="maison" style={{ background: OFF, color: ESPRESSO, minHeight: "100vh" }}>
      <style>{`
        .maison{font-family:var(--font-inter),system-ui,sans-serif}
        .maison .serif{font-family:var(--font-titulo),Georgia,serif}
        .maison .cursiva{font-family:var(--font-cursiva),cursive}
        @keyframes goldPulse{0%,100%{opacity:.45;transform:scale(1)}50%{opacity:1;transform:scale(1.35)}}
        .maison .dot-ouro{animation:goldPulse 2.5s ease-in-out infinite}
        @keyframes badgePulse{0%,100%{box-shadow:0 0 0 0 rgba(184,147,90,.35)}50%{box-shadow:0 0 0 10px rgba(184,147,90,0)}}
        .maison .badge-pulse{animation:badgePulse 3s ease-in-out infinite}
        @keyframes shimmer{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
        .maison .btn-shine{position:relative;overflow:hidden}
        .maison .btn-shine::after{content:"";position:absolute;top:0;bottom:0;width:40px;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);
          animation:shimmer 2.8s ease-in-out infinite}
        .maison .foto-hover{transition:transform .5s ease}
        .maison .foto-hover:hover{transform:scale(1.03)}
        @media (prefers-reduced-motion:reduce){
          .maison .dot-ouro,.maison .badge-pulse,.maison .btn-shine::after{animation:none}
          .maison .foto-hover{transition:none}
        }
      `}</style>

      {/* TOPBAR 44px */}
      <div
        className="fixed inset-x-0 top-0 z-[60] flex h-11 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 text-[11px] text-[#FAF8F5] sm:justify-between sm:px-6"
        style={{ background: MARROM }}
      >
        <div className="flex items-center gap-2">
          <span style={{ letterSpacing: "0.14em", color: "rgba(250,248,245,.65)" }}>
            PROPOSTA VÁLIDA POR:
          </span>
          {cd && (
            <span className="flex items-center gap-1 font-medium tabular-nums">
              <span>{cd.h}H</span>
              <span>{cd.m}M</span>
              <span className="rounded-full px-1.5 py-0.5" style={{ background: CAMEL, color: ESPRESSO }}>
                {cd.s}S
              </span>
            </span>
          )}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span className="dot-ouro h-1.5 w-1.5 rounded-full" style={{ background: CAMEL }} />
          <span style={{ letterSpacing: "0.12em", color: "rgba(250,248,245,.75)" }}>
            PREÇO TRAVA HOJE
          </span>
        </div>
        <div className="flex items-center gap-4">
          {inst?.stat_eventos_realizados ? (
            <span className="hidden lg:inline" style={{ color: "rgba(250,248,245,.6)" }}>
              +{inst.stat_eventos_realizados} casamentos
            </span>
          ) : null}
          <button
            onClick={abrir}
            disabled={!podeResponder}
            className="rounded-full px-3.5 py-1.5 text-[10px] font-semibold disabled:opacity-40"
            style={{ background: CAMEL, color: ESPRESSO, letterSpacing: "0.1em" }}
          >
            GARANTIR DATA
          </button>
        </div>
      </div>

      {/* BARRA DE PROGRESSO 2px */}
      <div className="fixed inset-x-0 top-11 z-[61] h-0.5" style={{ background: "rgba(184,147,90,.15)" }}>
        <div className="h-full transition-[width] duration-150" style={{ width: `${progresso}%`, background: MARROM }} />
      </div>

      {/* SIDEBAR 240 */}
      <aside
        className="fixed bottom-0 left-0 top-[46px] z-40 hidden w-60 flex-col overflow-y-auto px-6 py-8 lg:flex"
        style={{
          background: rolou ? "rgba(253,251,247,.85)" : CARD,
          backdropFilter: rolou ? "blur(12px)" : undefined,
          boxShadow: rolou ? "1px 0 0 0 rgba(184,147,90,.15)" : undefined,
          borderRight: `0.5px solid ${BORDA}`,
        }}
      >
        <div>
          <p className="text-[9px]" style={{ letterSpacing: "0.32em", color: TAUPE }}>ATELIÊ</p>
          <p className="serif mt-1 text-[19px] font-light leading-[1.1]" style={{ letterSpacing: "0.02em" }}>
            {dados.nome_empresa.toUpperCase()}
          </p>
          <div className="mt-4 h-px w-10" style={{ background: CAMEL, opacity: 0.5 }} />
        </div>

        <nav className="mt-8 flex flex-col gap-0.5">
          {NAV_MAISON.map((item) => {
            const on = ativo === item.id;
            return (
              <button
                key={item.id}
                onClick={() => irPara(item.id)}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-left text-[10px] transition-colors"
                style={{
                  background: on ? MARROM : "transparent",
                  color: on ? OFF : TAUPE,
                  letterSpacing: "0.12em",
                }}
              >
                {on && <span className="dot-ouro h-1 w-1 rounded-full" style={{ background: CAMEL }} />}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 pt-8">
          <div className="rounded-xl p-3.5" style={{ border: `0.5px solid ${BORDA}` }}>
            <p className="text-[8.5px]" style={{ letterSpacing: "0.22em", color: CAMEL }}>ESCASSEZ</p>
            <p className="serif mt-1.5 text-[13px] leading-snug">
              Datas limitadas
              <br />
              para a temporada
            </p>
            <p className="mt-1 text-[10px]" style={{ color: TAUPE }}>Alta procura</p>
          </div>
          <p className="text-[9px] leading-relaxed" style={{ color: TAUPE }}>
            Proposta confidencial
            <br />
            Validade limitada
          </p>
        </div>
      </aside>

      <main className="pt-[46px] lg:ml-60">
        <SecaoHero
          dados={dados}
          fotos={fotos}
          valor={valor}
          entradaPct={entradaPct}
          parcelas={parcelas}
          onAceitar={abrir}
          podeResponder={podeResponder}
        />
        <SecaoQuemSomos inst={inst} fotos={fotos} />
        <SecaoIncluso />
        <SecaoComoFunciona fotos={fotos} />
        <SecaoNoDia />
        <SecaoInvestimento
          valor={valor}
          entrada={entrada}
          entradaPct={entradaPct}
          parcela={parcela}
          parcelas={parcelas}
          pacote={pacoteBase}
          onAceitar={abrir}
          podeResponder={podeResponder}
        />
        <SecaoEventos fotos={fotos} />
        <SecaoDepoimentos depoimentos={depoimentos} />
        <SecaoProximos onAceitar={abrir} podeResponder={podeResponder} />
        <RodapeMaison nomeEmpresa={dados.nome_empresa} />
      </main>

      {/* CTA fixo no mobile — a sidebar some abaixo de lg */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 px-4 py-3 lg:hidden"
        style={{ background: CARD, borderTop: `0.5px solid ${BORDA}` }}
      >
        <div>
          <p className="text-[9px]" style={{ letterSpacing: "0.16em", color: TAUPE }}>INVESTIMENTO</p>
          <p className="serif text-[20px] font-light leading-none">{brl(valor)}</p>
        </div>
        <button
          onClick={abrir}
          disabled={!podeResponder}
          className="rounded-full px-5 py-3 text-[11px] font-medium disabled:opacity-40"
          style={{ background: MARROM, color: OFF, letterSpacing: "0.1em" }}
        >
          ACEITAR PROPOSTA
        </button>
      </div>

      {modal && (
        <ModalAceiteProposta
          hash={hash}
          tema={TEMA_MODAL_MAISON}
          titulo={MODAL_MAISON.subtitulo}
          subtitulo={MODAL_MAISON.titulo}
          resumo={`${brl(valor)} • Entrada ${entradaPct}%`}
          nomeInicial={dados.nome_contato}
          pacoteId={pacoteBase?.id ?? null}
          convidados={dados.numero_convidados}
          extrasIds={[]}
          parcelas={parcelas}
          tipoEvento={dados.tipo_evento}
          dataEvento={dados.data_evento}
          textoBotao={MODAL_MAISON.cta}
          rodape={MODAL_MAISON.rodape}
          onFechar={() => setModal(false)}
          onAceito={(recibo, total) =>
            setAceite({
              recibo_codigo: recibo,
              pacote_nome: pacoteBase?.nome ?? "Proposta",
              valor_total: total,
              created_at: new Date().toISOString(),
            })
          }
        />
      )}
    </div>
  );
}

// Container padrão das seções: 112px 72px, max 1320.
function Secao({
  id, children, fundo, className = "",
}: {
  id?: string;
  children: React.ReactNode;
  fundo?: string;
  className?: string;
}) {
  return (
    <section id={id} className={className} style={{ background: fundo }}>
      <div className="mx-auto max-w-[1320px] px-6 py-16 sm:px-[72px] sm:py-[112px]">
        {children}
      </div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px]" style={{ letterSpacing: "0.28em", color: CAMEL }}>
      {children}
    </p>
  );
}

// Slot de imagem: usa a foto do portfólio quando existe; senão, o tom de
// fundo. O mockup mostra uma pill com o tamanho — aqui não faz sentido,
// porque as fotos vêm do Catálogo e não são trocadas nesta tela.
function Foto({
  url, alt, ratio, className = "", radius = 4,
}: {
  url?: string;
  alt?: string;
  ratio: string;
  className?: string;
  radius?: number;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: ratio, background: BORDA, borderRadius: radius }}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt ?? ""} loading="lazy" className="foto-hover h-full w-full object-cover" />
      )}
    </div>
  );
}

type Fotos = OrcamentoPublicoData["fotos"];
type Inst = OrcamentoPublicoData["institucional"];
type Pacote = OrcamentoPublicoData["pacotes"][number];

// 1 — HERO
function SecaoHero({
  dados, fotos, valor, entradaPct, parcelas, onAceitar, podeResponder,
}: {
  dados: OrcamentoPublicoData;
  fotos: Fotos;
  valor: number;
  entradaPct: number;
  parcelas: number;
  onAceitar: () => void;
  podeResponder: boolean;
}) {
  const linhaData = [
    dados.data_evento ? formatDateBR(dados.data_evento).replace(/\//g, " . ") : null,
    dados.local_evento || dados.cidade_evento,
    dados.numero_convidados ? `${dados.numero_convidados} CONVIDADOS` : null,
  ].filter(Boolean).join(" • ");

  return (
    <section id="apresentacao" style={{ background: OFF }}>
      <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-6 py-14 sm:px-[72px] lg:grid-cols-[1.08fr_0.92fr] lg:gap-20 lg:py-20">
        <div>
          <span
            className="badge-pulse inline-block rounded-full px-3 py-1.5 text-[9.5px]"
            style={{ border: `0.5px solid ${CAMEL}`, color: CAMEL, letterSpacing: "0.2em" }}
          >
            {HERO_MAISON.badge}
          </span>

          <p className="serif mt-7 text-[42px] font-light leading-[0.9] sm:text-[56px]" style={{ color: TAUPE, letterSpacing: "-0.02em" }}>
            Proposta de
          </p>
          <p className="cursiva mt-1 text-[54px] leading-[0.95] sm:text-[72px]" style={{ color: ESPRESSO }}>
            {dados.nome_contato}
          </p>

          {linhaData && (
            <p className="mt-5 text-[10.5px]" style={{ letterSpacing: "0.2em", color: TAUPE }}>
              {linhaData.toUpperCase()}
            </p>
          )}

          <p className="mt-6 max-w-[520px] text-[14.5px] leading-[1.75]" style={{ color: CORPO }}>
            {HERO_MAISON.paragrafo}
          </p>

          <button
            onClick={onAceitar}
            disabled={!podeResponder}
            className="btn-shine mt-8 flex items-center gap-3 rounded-full px-7 py-4 text-[12px] font-medium disabled:opacity-40"
            style={{ background: MARROM, color: OFF, letterSpacing: "0.1em" }}
          >
            ACEITAR PROPOSTA • {brl(valor)} <span>→</span>
          </button>
          <p className="mt-3 text-[10.5px]" style={{ color: TAUPE }}>
            Entrada de {entradaPct}% • {parcelas}x sem juros • Contrato em 2h
          </p>
        </div>

        {/* imagem vertical com borda offset dourada */}
        <div className="relative">
          <div
            className="pointer-events-none absolute -bottom-4 -right-4 hidden lg:block"
            style={{ top: 16, left: 16, border: `0.5px solid ${CAMEL}`, borderRadius: 4 }}
          />
          <div className="relative">
            <Foto url={fotos[0]?.url ?? dados.hero_imagem_url ?? undefined} alt={dados.nome_contato} ratio="800 / 1100" />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(to top,rgba(43,30,22,.75),transparent 55%)", borderRadius: 4 }}
            />
            <div className="absolute inset-x-6 bottom-6">
              <p className="cursiva text-[40px] leading-none text-white sm:text-[48px]">
                {dados.nome_contato}
              </p>
              {dados.data_evento && (
                <p className="mt-2 text-[10px] text-white/75" style={{ letterSpacing: "0.2em" }}>
                  {formatDateBR(dados.data_evento).replace(/\//g, " • ")}
                </p>
              )}
            </div>
          </div>

          <div
            className="mt-4 rounded-xl p-4 lg:absolute lg:-left-8 lg:bottom-16 lg:mt-0 lg:w-[230px]"
            style={{ background: CARD, border: `0.5px solid ${BORDA}`, boxShadow: "0 20px 60px -20px rgba(60,36,21,.15)" }}
          >
            <p className="text-[8.5px]" style={{ letterSpacing: "0.22em", color: CAMEL }}>
              {HERO_MAISON.cardReferencia.rotulo}
            </p>
            <p className="serif mt-1.5 whitespace-pre-line text-[16px] leading-tight">
              {HERO_MAISON.cardReferencia.titulo}
            </p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: TAUPE }}>
              {HERO_MAISON.cardReferencia.descricao}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// 2 — QUEM SOMOS
function SecaoQuemSomos({ inst, fotos }: { inst: Inst; fotos: Fotos }) {
  const metricas = [
    { valor: inst?.stat_eventos_realizados ? `${inst.stat_eventos_realizados}` : "300+", rotulo: "casamentos\nentregues" },
    { valor: inst?.stat_anos_experiencia ? `${inst.stat_anos_experiencia}` : "12", rotulo: "anos de\nateliê" },
    { valor: `${inst?.stat_dedicacao_percentual ?? 100}%`, rotulo: "dedicação\nno dia" },
  ];
  return (
    <Secao id="quem-somos" fundo={CARD}>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
        <div>
          <Eyebrow>{QUEM_SOMOS_MAISON.eyebrow}</Eyebrow>
          <h2 className="serif mt-4 whitespace-pre-line text-[38px] font-light leading-[0.95] sm:text-[52px]" style={{ letterSpacing: "-0.02em" }}>
            {QUEM_SOMOS_MAISON.titulo}
          </h2>
          <p className="mt-6 max-w-[460px] text-[14.5px] leading-[1.75]" style={{ color: CORPO }}>
            {inst?.sobre_nos_texto || QUEM_SOMOS_MAISON.paragrafo}
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {metricas.map((m) => (
              <div key={m.rotulo}>
                <p className="serif text-[34px] font-light leading-none" style={{ color: CAMEL }}>{m.valor}</p>
                <p className="mt-2 whitespace-pre-line text-[10.5px] leading-snug" style={{ color: TAUPE }}>{m.rotulo}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Foto url={fotos[1]?.url} ratio="1200 / 800" />
          <div className="grid grid-cols-2 gap-4">
            <Foto url={fotos[2]?.url} ratio="1 / 1" />
            <div className="flex flex-col justify-center rounded-xl p-5" style={{ background: ESPRESSO }}>
              <p className="serif whitespace-pre-line text-[20px] font-light leading-tight" style={{ color: OFF }}>
                {QUEM_SOMOS_MAISON.citacao}
              </p>
              <p className="mt-3 text-[9px]" style={{ letterSpacing: "0.2em", color: CAMEL }}>
                {QUEM_SOMOS_MAISON.citacaoAutor}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Secao>
  );
}

// 3 — O QUE ESTÁ INCLUSO
function SecaoIncluso() {
  return (
    <Secao id="incluso" fundo={OFF}>
      <h2 className="serif text-[34px] font-light leading-none sm:text-[42px]">O que está incluso</h2>
      <p className="mt-3 text-[10px]" style={{ letterSpacing: "0.22em", color: CAMEL }}>
        CURADORIA COMPLETA • SEM TERCEIRIZAÇÃO
      </p>
      <div className="mt-10">
        {INCLUSO_MAISON.map((item, i) => (
          <div
            key={item.n}
            className="grid items-start gap-4 py-7 sm:grid-cols-[96px_1fr_1.2fr] sm:gap-8"
            style={{ borderTop: i === 0 ? undefined : `0.5px solid ${BORDA}` }}
          >
            <p className="serif text-[48px] font-light leading-none sm:text-[64px]" style={{ color: CAMEL, opacity: 0.55 }}>
              {item.n}
            </p>
            <h3 className="serif text-[22px] font-light leading-tight sm:text-[26px]">{item.titulo}</h3>
            <p className="text-[13.5px] leading-[1.7]" style={{ color: CORPO }}>{item.descricao}</p>
          </div>
        ))}
      </div>
    </Secao>
  );
}

// 4 — COMO FUNCIONA
function SecaoComoFunciona({ fotos }: { fotos: Fotos }) {
  return (
    <Secao id="como-funciona" fundo={CARD}>
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Eyebrow>{COMO_FUNCIONA_MAISON.eyebrow}</Eyebrow>
          <h2 className="serif mt-4 whitespace-pre-line text-[34px] font-light leading-[0.95] sm:text-[42px]">
            {COMO_FUNCIONA_MAISON.titulo}
          </h2>
          <div className="mt-8">
            <Foto url={fotos[3]?.url} ratio="900 / 600" />
          </div>
        </div>
        <div className="relative">
          {COMO_FUNCIONA_MAISON.passos.map((p, i) => (
            <div key={p.titulo} className="relative flex gap-5 pb-10 last:pb-0">
              {i < COMO_FUNCIONA_MAISON.passos.length - 1 && (
                <span className="absolute left-[17px] top-9 bottom-0 w-px" style={{ background: BORDA }} />
              )}
              <div
                className="serif relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px]"
                style={{ background: MARROM, color: OFF }}
              >
                {i + 1}
              </div>
              <div>
                <p className="text-[9.5px]" style={{ letterSpacing: "0.2em", color: CAMEL }}>{p.quando.toUpperCase()}</p>
                <h3 className="serif mt-1.5 text-[22px] font-light leading-tight">{p.titulo}</h3>
                <p className="mt-2 max-w-[420px] text-[13.5px] leading-[1.7]" style={{ color: CORPO }}>{p.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Secao>
  );
}

// 5 — NO DIA: grade 3x2 com hairlines de 0.5px (o gap sobre o fundo é a linha)
function SecaoNoDia() {
  return (
    <Secao id="no-dia" fundo={OFF}>
      <h2 className="serif text-[34px] font-light leading-none sm:text-[42px]">No dia do casamento</h2>
      <div className="mt-10 grid gap-[0.5px] sm:grid-cols-2 lg:grid-cols-3" style={{ background: BORDA }}>
        {NO_DIA_MAISON.map((h) => (
          <div key={h.hora} className="p-7" style={{ background: CARD }}>
            <p className="serif text-[26px] font-light leading-none" style={{ color: CAMEL }}>{h.hora}</p>
            <h3 className="mt-3 text-[13px] font-semibold">{h.titulo}</h3>
            <p className="mt-2 text-[12.5px] leading-[1.65]" style={{ color: CORPO }}>{h.descricao}</p>
          </div>
        ))}
      </div>
    </Secao>
  );
}

// 6 — INVESTIMENTO: valor único, sem calculadora
function SecaoInvestimento({
  valor, entrada, entradaPct, parcela, parcelas, pacote, onAceitar, podeResponder,
}: {
  valor: number;
  entrada: number;
  entradaPct: number;
  parcela: number;
  parcelas: number;
  pacote: Pacote | null;
  onAceitar: () => void;
  podeResponder: boolean;
}) {
  const itens = (pacote?.inclui ?? []).length > 0
    ? pacote!.inclui
    : INCLUSO_MAISON.map((i) => i.titulo);

  return (
    <Secao id="investimento" fundo="#F5F1EB">
      <div className="mx-auto max-w-[720px] text-center">
        <Eyebrow>{INVESTIMENTO_MAISON.eyebrow}</Eyebrow>
        <h2 className="serif mt-4 whitespace-pre-line text-[36px] font-light leading-[0.95] sm:text-[44px]">
          {INVESTIMENTO_MAISON.titulo}
        </h2>
        <p className="mx-auto mt-5 max-w-[520px] text-[14px] leading-[1.7]" style={{ color: CORPO }}>
          {INVESTIMENTO_MAISON.paragrafo}
        </p>

        <div
          className="relative mt-10 rounded-2xl p-7 text-left sm:p-10"
          style={{ background: CARD, border: `0.5px solid ${BORDA}`, boxShadow: "0 20px 60px -20px rgba(60,36,21,.15), 0 1px 0 0 rgba(184,147,90,.15) inset" }}
        >
          <span
            className="absolute -top-3 right-8 rounded-full px-3 py-1 text-[9px] font-medium"
            style={{ background: ESPRESSO, color: OFF, letterSpacing: "0.16em" }}
          >
            {INVESTIMENTO_MAISON.selo}
          </span>

          <p className="text-[10px]" style={{ letterSpacing: "0.2em", color: TAUPE }}>
            {(pacote?.nome ?? "PROPOSTA COMPLETA").toUpperCase()}
          </p>
          {pacote?.subtitulo && (
            <p className="mt-1 text-[12px]" style={{ color: TAUPE }}>{pacote.subtitulo}</p>
          )}

          <p className="serif mt-5 text-[42px] font-light leading-none sm:text-[48px]">{brl(valor)}</p>
          <p className="mt-2 text-[11.5px]" style={{ color: TAUPE }}>
            entrada de {entradaPct}% ({brl(entrada)}) para travar
          </p>
          {parcelas > 0 && parcela > 0 && (
            <p className="mt-1 text-[11.5px]" style={{ color: TAUPE }}>
              ou {parcelas}x de {brl(parcela)} sem juros • contrato em 2h
            </p>
          )}

          <div className="mt-7 space-y-3" style={{ borderTop: `0.5px solid ${BORDA}`, paddingTop: 28 }}>
            {itens.map((t, i) => (
              <div key={i} className="flex items-start gap-3 text-[13.5px]" style={{ color: CORPO }}>
                <span style={{ color: CAMEL }}>✓</span>
                {t}
              </div>
            ))}
          </div>

          <button
            onClick={onAceitar}
            disabled={!podeResponder}
            className="btn-shine mt-8 w-full rounded-full py-4 text-[12px] font-medium disabled:opacity-40"
            style={{ background: MARROM, color: OFF, letterSpacing: "0.1em" }}
          >
            {podeResponder ? "ACEITAR PROPOSTA E TRAVAR DATA →" : "PROPOSTA INDISPONÍVEL"}
          </button>
          <p className="mt-3 text-center text-[10.5px]" style={{ color: TAUPE }}>
            {INVESTIMENTO_MAISON.rodape}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {INVESTIMENTO_MAISON.selos.map((s) => (
              <span key={s} className="text-[10.5px]" style={{ color: TAUPE }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </Secao>
  );
}

// 7 — EVENTOS REALIZADOS
function SecaoEventos({ fotos }: { fotos: Fotos }) {
  if (fotos.length === 0) return null;
  return (
    <Secao id="eventos" fundo={OFF}>
      <h2 className="serif text-[34px] font-light leading-none sm:text-[42px]">Eventos realizados</h2>
      <div className="mt-10 grid gap-[0.5px] sm:grid-cols-2 lg:grid-cols-4" style={{ background: BORDA }}>
        {fotos.slice(0, 8).map((f) => (
          <Foto key={f.url} url={f.url} alt={f.legenda ?? ""} ratio="4 / 3" radius={0} />
        ))}
      </div>
    </Secao>
  );
}

// 8 — DEPOIMENTOS
function SecaoDepoimentos({
  depoimentos,
}: {
  depoimentos: { texto: string; autor: string; contexto: string | null }[];
}) {
  return (
    <Secao id="depoimentos" fundo={CARD}>
      <h2 className="serif text-[34px] font-light leading-none sm:text-[42px]">O que falam</h2>
      <div className="mt-10 grid gap-[0.5px] sm:grid-cols-2 lg:grid-cols-3" style={{ background: BORDA }}>
        {depoimentos.slice(0, 3).map((d, i) => (
          <div key={i} className="p-7" style={{ background: OFF }}>
            <p className="text-[13px]" style={{ color: CAMEL, letterSpacing: "0.1em" }}>★★★★★</p>
            <p className="serif mt-4 text-[19px] font-light leading-[1.45]">“{d.texto}”</p>
            <p className="mt-5 text-[10.5px]" style={{ letterSpacing: "0.14em", color: TAUPE }}>
              {d.autor.toUpperCase()}
            </p>
          </div>
        ))}
      </div>
    </Secao>
  );
}

// 9 — PRÓXIMOS PASSOS (bloco escuro)
function SecaoProximos({
  onAceitar, podeResponder,
}: {
  onAceitar: () => void;
  podeResponder: boolean;
}) {
  return (
    <section id="proximos" style={{ background: ESPRESSO }}>
      <div className="mx-auto grid max-w-[1320px] gap-12 px-6 py-16 sm:px-[72px] sm:py-[112px] lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div>
          <Eyebrow>{PROXIMOS_MAISON.eyebrow}</Eyebrow>
          <h2 className="serif mt-4 whitespace-pre-line text-[38px] font-light leading-[0.9] sm:text-[48px]" style={{ color: "#F5F1EB" }}>
            {PROXIMOS_MAISON.titulo}
          </h2>
          <p className="mt-6 max-w-[440px] text-[14px] leading-[1.75]" style={{ color: "rgba(245,241,235,.7)" }}>
            {PROXIMOS_MAISON.paragrafo}
          </p>
          <button
            onClick={onAceitar}
            disabled={!podeResponder}
            className="btn-shine mt-8 rounded-full px-7 py-4 text-[12px] font-medium disabled:opacity-40"
            style={{ background: OFF, color: ESPRESSO, letterSpacing: "0.1em" }}
          >
            {PROXIMOS_MAISON.cta}
          </button>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {PROXIMOS_MAISON.stats.map((s) => (
              <div key={s.valor}>
                <p className="serif text-[30px] font-light leading-none" style={{ color: CAMEL }}>{s.valor}</p>
                <p className="mt-2 whitespace-pre-line text-[10px] leading-snug" style={{ color: "rgba(245,241,235,.55)" }}>
                  {s.rotulo}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[9.5px]" style={{ letterSpacing: "0.22em", color: CAMEL }}>
            {PROXIMOS_MAISON.depoisTitulo}
          </p>
          <div className="mt-6 space-y-5">
            {PROXIMOS_MAISON.depois.map((d, i) => (
              <div key={d.titulo} className="flex gap-4">
                <span
                  className="serif flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px]"
                  style={{ border: `0.5px solid ${CAMEL}`, color: CAMEL }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "#F5F1EB" }}>{d.titulo}</p>
                  <p className="mt-1 text-[12.5px] leading-snug" style={{ color: "rgba(245,241,235,.55)" }}>
                    {d.descricao}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-xl p-5" style={{ border: `0.5px solid rgba(184,147,90,.3)` }}>
            <p className="text-[9px]" style={{ letterSpacing: "0.2em", color: CAMEL }}>
              {PROXIMOS_MAISON.garantiaTitulo}
            </p>
            <p className="mt-2 text-[12.5px] leading-snug" style={{ color: "rgba(245,241,235,.7)" }}>
              {PROXIMOS_MAISON.garantia}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Tema do modal compartilhado: o comportamento e igual em todos os
// templates, a identidade visual e que muda. Ver [[ModalAceiteProposta]].
const TEMA_MODAL_MAISON = {
  fundo: OFF,
  card: CARD,
  texto: ESPRESSO,
  textoSuave: TAUPE,
  borda: BORDA,
  acento: CAMEL,
  botaoFundo: MARROM,
  botaoTexto: OFF,
  raio: 20,
  classeTitulo: "serif font-light",
};


// Passo 2 do modal do handoff: recibo com breakdown e botão de WhatsApp.
function ReciboMaison({
  aceite, nomeEmpresa, contato, whatsapp, entradaPct,
}: {
  aceite: NonNullable<OrcamentoPublicoData["aceite"]>;
  nomeEmpresa: string;
  contato: string;
  whatsapp: string | null;
  entradaPct: number;
}) {
  const total = Number(aceite.valor_total);
  const entrada = (total * entradaPct) / 100;
  return (
    <div
      className="maison flex min-h-screen items-center justify-center p-6"
      style={{ background: OFF, color: ESPRESSO }}
    >
      <style>{`
        .maison{font-family:var(--font-inter),system-ui,sans-serif}
        .maison .serif{font-family:var(--font-titulo),Georgia,serif}
        .maison .cursiva{font-family:var(--font-cursiva),cursive}
      `}</style>
      <div
        className="w-full max-w-[520px] rounded-[20px] p-8 text-center"
        style={{ background: CARD, border: `0.5px solid ${BORDA}`, boxShadow: "0 20px 60px -20px rgba(60,36,21,.15)" }}
      >
        <p className="text-[9.5px]" style={{ letterSpacing: "0.22em", color: CAMEL }}>
          DATA CONFIRMADA
        </p>
        <p className="cursiva mt-3 text-[42px] leading-none">{contato}</p>
        <p className="mt-4 text-[13px]" style={{ color: CORPO }}>
          Sua data está reservada com {nomeEmpresa}.
        </p>

        <div className="mt-7 rounded-xl p-5 text-left" style={{ background: OFF, border: `0.5px solid ${BORDA}` }}>
          <div className="flex items-center justify-between text-[12px]" style={{ color: TAUPE }}>
            <span>Recibo</span>
            <span className="font-medium" style={{ color: ESPRESSO, letterSpacing: "0.08em" }}>
              {aceite.recibo_codigo}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[12px]" style={{ color: TAUPE }}>
            <span>Total</span>
            <span className="serif text-[18px]" style={{ color: ESPRESSO }}>{brl(total)}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[12px]" style={{ color: TAUPE }}>
            <span>Entrada {entradaPct}%</span>
            <span style={{ color: ESPRESSO }}>{brl(entrada)}</span>
          </div>
        </div>

        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block rounded-full py-3.5 text-[12px] font-medium"
            style={{ background: "#25D366", color: "#fff", letterSpacing: "0.08em" }}
          >
            ABRIR WHATSAPP VIP
          </a>
        )}
        <p className="mt-4 text-[10.5px]" style={{ color: TAUPE }}>
          Guarde este código. O contrato chega em até 2h.
        </p>
      </div>
    </div>
  );
}

function RodapeMaison({ nomeEmpresa }: { nomeEmpresa: string }) {
  return (
    <footer style={{ background: OFF, borderTop: `0.5px solid ${BORDA}` }}>
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-6 py-8 pb-24 sm:px-[72px] lg:pb-8">
        <p className="text-[10.5px]" style={{ color: TAUPE }}>
          © {new Date().getFullYear()} {nomeEmpresa}
        </p>
        <p className="text-[9.5px]" style={{ letterSpacing: "0.18em", color: TAUPE }}>
          PROPOSTA CONFIDENCIAL
        </p>
      </div>
    </footer>
  );
}
