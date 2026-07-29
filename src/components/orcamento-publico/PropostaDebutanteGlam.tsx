"use client";

// Proposta pública de debutante — template "Debut Festa Glam"
// (design/template-3 Debbut). Alto contraste, neon, foco na balada.
//
// Tokens confirmados no DOM do reference-original a 1440px:
//   rosa #E91E8C · dourado #D4AF37 · ink #111111 · deep #0c0c0c
//   cinza #F8F8F8 · verde #22c55e · borda clara rgba(0,0,0,.1)
//   Syne (display 700/800/900) + Inter (corpo). Container 1320 (invest 1120,
//   card de preço 760, modal 520), padding lateral 24/40.
//   hero grid 690/510 gap 40 · includes 3x400 gap 20 · dia 3x397 gap 24.
//
// Diferenças conscientes em relação ao mockup:
//  * usa os MESMOS dados de debutante do Catálogo (pacotes, regra de
//    convidados, extras da 058) que o template clássico — é um reskin
//    visual, não um backend novo. Os números do mockup (R$35/convidado,
//    base por pacote) são referência de design; os valores reais vêm do
//    Catálogo;
//  * o nome no topo NÃO é editável pela cliente: vai para o contrato
//    assinado, e editar abriria divergência com o que ela assinou. O mesmo
//    critério dos outros templates;
//  * a assinatura do modal é o nome digitado (input), como no mockup, e é
//    o que a RPC de aceite grava;
//  * o countdown usa a validade real do orçamento, não os 10 dias fixos do
//    mockup.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock, ArrowRight, Sparkles, Calendar, Users, MapPin, Star, Check, X,
  Music, Crown, Camera, Zap, Wine,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateBR } from "@/lib/orcamentos";
import { expirado, type OrcamentoPublicoData } from "@/lib/orcamento-publico";
import { calcularProposta } from "@/lib/proposta";
import {
  INCLUSO_GLAM, ETAPAS_GLAM, CARDS_DIA_GLAM,
  HERO_PARAGRAFO_GLAM, VIDEO_LEGENDA_GLAM,
} from "@/lib/proposta-glam-conteudo";

const ROSA = "#E91E8C";
const OURO = "#D4AF37";
const INK = "#111111";

const ICONES_INCLUSO: Record<string, typeof Check> = {
  musica: Music, coroa: Crown, pessoas: Users, camera: Camera, luz: Zap, taca: Wine,
};

const brl = (v: number) => v.toLocaleString("pt-BR");

export function PropostaDebutanteGlam({
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
  const nome = (dados.nome_contato || "DEBUTANTE").toUpperCase();

  const regra = {
    inclusos: inst?.convidados_inclusos ?? 150,
    valorPorExtra: Number(inst?.valor_por_convidado_extra ?? 15),
    min: inst?.convidados_min ?? 50,
    max: inst?.convidados_max ?? 250,
  };
  const condicoes = {
    entradaPercentual: inst?.condicao_entrada_percentual ?? 0,
    parcelasMaximo: inst?.condicao_parcelas_maximo ?? 12,
    descontoAVista: inst?.condicao_desconto_a_vista_percentual ?? 0,
  };

  const venceu = expirado(dados);
  const podeResponder = dados.status === "enviado" && !venceu;

  const [pacoteId, setPacoteId] = useState<string | null>(
    () => (pacotes.find((p) => p.recomendado) ?? pacotes[0])?.id ?? null
  );
  const [guests, setGuests] = useState(dados.numero_convidados ?? regra.inclusos);
  const [extrasIds, setExtrasIds] = useState<string[]>([]);
  const [modal, setModal] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const [aceite, setAceite] = useState(dados.aceite ?? null);

  const pacote = pacotes.find((p) => p.id === pacoteId) ?? null;

  const valores = useMemo(
    () =>
      calcularProposta(
        { pacote, convidados: guests, extrasIds, formaPagamento: "parcelado", parcelas: condicoes.parcelasMaximo },
        extras,
        regra,
        { ...condicoes, prazoParcelasTexto: "" }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pacote, guests, extrasIds, extras, regra.inclusos, regra.valorPorExtra]
  );

  // Countdown a partir da validade real; começa no cliente (evita mismatch).
  const [cd, setCd] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (!podeResponder) return;
    const fim = new Date(`${dados.data_validade}T23:59:59`).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((fim - Date.now()) / 1000));
      setCd({ d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dados.data_validade, podeResponder]);

  const verPreco = useCallback(() => {
    document.getElementById("investimento")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlight(true);
    setTimeout(() => setHighlight(false), 1600);
  }, []);

  const abrir = () => podeResponder && setModal(true);

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const parcela = valores.total / Math.max(1, condicoes.parcelasMaximo);
  const extrasCount = Math.max(0, guests - regra.inclusos);

  if (aceite) {
    return <ReciboGlam aceite={aceite} nomeEmpresa={dados.nome_empresa} nome={nome} />;
  }

  return (
    <div className="glam-root min-h-screen bg-white text-[#111111]">
      <style>{`
        .glam-root{font-family:var(--font-inter),system-ui,sans-serif}
        .display{font-family:var(--font-syne),var(--font-inter),sans-serif}
        .glam-root ::selection{background:${ROSA};color:#fff}
        .glam-root input[type=range]{-webkit-appearance:none;height:8px;border-radius:9999px;outline:none}
        .glam-root input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:9999px;background:${OURO};border:3px solid #111;cursor:pointer}
        .glam-root input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:9999px;background:${OURO};border:3px solid #111;cursor:pointer}
        @keyframes glamPulse{0%,100%{opacity:1}50%{opacity:.35}}
        .glam-pulse{animation:glamPulse 1.6s ease-in-out infinite}
        @keyframes glamUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .glam-modal-card{animation:glamUp .3s ease}
        @media (prefers-reduced-motion:reduce){.glam-pulse,.glam-modal-card{animation:none}}
      `}</style>

      {/* 1 — TOPBAR rosa */}
      {podeResponder && (
        <div
          className="flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-bold text-white"
          style={{ background: ROSA }}
        >
          <Clock size={15} />
          <span>PROPOSTA VÁLIDA POR:</span>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-black tabular-nums" style={{ color: INK }}>
            {cd ? `${pad2(cd.d)}D : ${pad2(cd.h)}H : ${pad2(cd.m)}M : ${pad2(cd.s)}S` : "—"}
          </span>
          <span className="opacity-90">• Preço trava hoje</span>
        </div>
      )}

      {/* 2 — HEADER */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3 px-6 py-3 sm:px-10">
          <div className="flex items-center gap-2.5">
            <div className="display flex h-9 w-9 items-center justify-center rounded-full bg-[#111] text-[15px] font-black text-white">
              15
            </div>
            <div className="leading-none">
              <div className="text-[13px] font-black tracking-tight">
                {dados.nome_empresa.toUpperCase()}
              </div>
              <div className="text-[9px] font-bold tracking-[0.2em] text-black/40">TEMPLATE 02</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-[#111] px-3.5 py-1.5 text-[11px] font-bold text-white">
              {guests} CONVIDADOS
            </span>
            <span className="rounded-full border border-black/15 px-3.5 py-1.5 text-[11px] font-bold">
              R$ {brl(valores.total)}
            </span>
          </div>
          <button
            onClick={abrir}
            disabled={!podeResponder}
            className="flex items-center gap-1.5 rounded-full bg-[#111] px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-black disabled:opacity-40"
          >
            GARANTIR DATA <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* 3 — HERO */}
      <section className="mx-auto grid max-w-[1320px] items-center gap-8 px-6 py-12 sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:py-16">
        <div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white"
            style={{ background: ROSA }}
          >
            <Sparkles size={13} /> TEMPLATE FESTA | MAIS PEDIDO
          </span>

          <p className="mt-6 text-[18px] font-bold tracking-[0.32em] text-black/70">A NOITE DA</p>
          <h1 className="display mt-1 text-[52px] font-black uppercase leading-[0.85] tracking-[-0.03em] sm:text-[72px]">
            {nome}
          </h1>
          <p className="display mt-3 text-[40px] font-black leading-[0.9] tracking-[-0.02em] sm:text-[52px]" style={{ color: OURO }}>
            15 ANOS
          </p>

          <p className="mt-6 max-w-[520px] text-[18px] font-semibold leading-[1.5] text-black/80 sm:text-[20px]">
            {HERO_PARAGRAFO_GLAM}
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <PilulaHero icone={<Calendar size={14} style={{ color: OURO }} />} texto={dados.data_evento ? formatDateBR(dados.data_evento).toUpperCase() : "A DEFINIR"} />
            <PilulaHero icone={<Users size={14} style={{ color: OURO }} />} texto={`${guests} CONVIDADOS`} />
            <PilulaHero icone={<MapPin size={14} style={{ color: OURO }} />} texto={(dados.local_evento || dados.cidade_evento || "A DEFINIR").toUpperCase()} />
          </div>

          {/* balão de chat */}
          <div className="mt-7 flex items-start gap-3 rounded-2xl bg-[#111] p-4 text-white">
            <div className="display flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-black text-[#111]" style={{ background: OURO }}>
              Oi
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold leading-snug">
                Oi, {dados.nome_contato || "Linda"}! Sua festa vai ser ÉPICA 🔥
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="glam-pulse h-1.5 w-1.5 rounded-full" style={{ background: "#22c55e" }} />
                Cerimonialista {dados.nome_empresa.split(" ")[0]} • online agora
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={abrir}
              disabled={!podeResponder}
              className="flex items-center gap-2 rounded-full bg-[#111] px-6 py-3.5 text-[13px] font-bold text-white transition-colors hover:bg-black disabled:opacity-40"
            >
              QUERO ESSA FESTA <ArrowRight size={15} />
            </button>
            <button
              onClick={verPreco}
              className="rounded-full border-2 px-6 py-3.5 text-[13px] font-bold transition-colors"
              style={highlight ? { background: OURO, borderColor: OURO, color: INK } : { borderColor: "#111" }}
            >
              {highlight ? "↓ DESCENDO..." : "VER PREÇO"}
            </button>
          </div>
        </div>

        <PainelVideo dados={dados} />
      </section>

      <IncluiSection nome={nome} />
      <ComoVaiSerSection />
      <NoDiaSection />
      <InvestimentoSection
        nome={nome}
        pacotes={pacotes}
        pacoteId={pacoteId}
        setPacoteId={setPacoteId}
        pacote={pacote}
        guests={guests}
        setGuests={setGuests}
        regra={regra}
        extras={extras}
        extrasIds={extrasIds}
        setExtrasIds={setExtrasIds}
        valores={valores}
        parcela={parcela}
        parcelasMaximo={condicoes.parcelasMaximo}
        extrasCount={extrasCount}
        highlight={highlight}
        podeResponder={podeResponder}
        onAbrir={abrir}
        cd={cd}
        pad2={pad2}
      />
      <FooterGlam dados={dados} nome={nome} onAbrir={abrir} podeResponder={podeResponder} />

      {modal && pacote && (
        <ModalContrato
          hash={hash}
          nome={nome}
          pacote={pacote}
          guests={guests}
          extrasIds={extrasIds}
          parcelas={condicoes.parcelasMaximo}
          total={valores.total}
          validadeDias={dados.validade_dias}
          onFechar={() => setModal(false)}
          onAceito={(recibo, valor) =>
            setAceite({ recibo_codigo: recibo, pacote_nome: pacote.nome, valor_total: valor, created_at: new Date().toISOString() })
          }
        />
      )}
    </div>
  );
}

function PilulaHero({ icone, texto }: { icone: React.ReactNode; texto: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#111] px-3.5 py-2 text-[12px] font-bold text-white">
      {icone}
      {texto}
    </span>
  );
}

// Painel de vídeo do hero — 100% CSS (gradientes + blobs + glow), como o
// mockup. Se a empresa subiu uma capa em Catálogo › Debutante, ela entra
// como fundo sob os overlays; senão fica só o CSS.
function PainelVideo({ dados }: { dados: OrcamentoPublicoData }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{ aspectRatio: "4 / 5.2", background: "#0c0c0c" }}
    >
      {dados.hero_imagem_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dados.hero_imagem_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      )}
      {/* gradientes radiais */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 20%,rgba(233,30,140,.35),transparent 45%),radial-gradient(circle at 75% 30%,rgba(212,175,55,.3),transparent 40%),radial-gradient(circle at 50% 80%,rgba(255,255,255,.12),transparent 50%)",
        }}
      />
      {/* blobs desfocados */}
      <div className="absolute left-6 top-10 h-[120px] w-[120px] rounded-full" style={{ background: ROSA, filter: "blur(45px)", opacity: 0.6 }} />
      <div className="absolute right-8 top-24 h-[90px] w-[90px] rounded-full" style={{ background: OURO, filter: "blur(40px)", opacity: 0.6 }} />
      <div className="absolute bottom-24 left-1/3 h-[160px] w-[160px] rounded-full" style={{ background: "#fff", filter: "blur(50px)", opacity: 0.15 }} />
      {/* pontos de brilho neon */}
      <span className="absolute left-[22%] top-[38%] h-2 w-2 rounded-full bg-white" style={{ boxShadow: "0 0 20px #fff,0 0 40px #fff" }} />
      <span className="absolute right-[28%] top-[26%] h-2 w-2 rounded-full" style={{ background: OURO, boxShadow: `0 0 20px ${OURO},0 0 40px ${OURO}` }} />
      <span className="absolute bottom-[34%] right-[24%] h-2 w-2 rounded-full" style={{ background: ROSA, boxShadow: `0 0 20px ${ROSA},0 0 40px ${ROSA}` }} />
      {/* gradiente escuro de baixo */}
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "linear-gradient(to top,rgba(0,0,0,.85),transparent)" }} />

      {/* badges topo */}
      <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#111]">
        <span className="glam-pulse h-1.5 w-1.5 rounded-full" style={{ background: ROSA }} />
        AO VIVO • PISTA LOTADA
      </div>
      <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full" style={{ background: ROSA }}>
        <Star size={16} className="text-white" fill="#fff" />
      </div>

      {/* legenda embaixo */}
      <div className="absolute inset-x-5 bottom-5 text-white">
        <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold backdrop-blur">
          {VIDEO_LEGENDA_GLAM.badge}
        </span>
        <p className="display mt-2.5 text-[20px] font-black leading-tight sm:text-[22px]">
          {VIDEO_LEGENDA_GLAM.titulo}
        </p>
      </div>

      {/* selo dourado flutuante */}
      <div
        className="absolute -bottom-3 left-4 rounded-xl px-3 py-2 text-[11px] font-black text-[#111]"
        style={{ background: OURO, transform: "rotate(-2deg)" }}
      >
        + 300 FESTAS FEITAS ✨
      </div>
    </div>
  );
}

// 4 — O QUE TÁ INCLUSO (seção escura)
function IncluiSection({ nome }: { nome: string }) {
  return (
    <section className="bg-[#111] text-white">
      <div className="mx-auto max-w-[1320px] px-6 py-16 sm:px-10 sm:py-24">
        <p className="text-[12px] font-black tracking-[0.28em]" style={{ color: OURO }}>O QUE TÁ INCLUSO</p>
        <h2 className="display mt-3 max-w-[820px] text-[40px] font-black leading-[0.9] tracking-[-0.03em] sm:text-[56px]">
          O QUE VAI TER NA SUA FESTA DE <span style={{ color: OURO }}>{nome}</span>
        </h2>
        <p className="mt-4 max-w-[560px] text-[15px] font-medium text-white/60">
          Cada detalhe pensado pra sua festa bombar e você só aproveitar.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUSO_GLAM.map((item) => {
            const Icone = ICONES_INCLUSO[item.icone] ?? Check;
            return (
              <div
                key={item.titulo}
                className="rounded-[20px] p-6 transition-colors"
                style={{ background: "rgba(255,255,255,.06)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.09)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: OURO }}>
                  <Icone size={26} className="text-[#111]" strokeWidth={2.5} />
                </div>
                <h3 className="mt-4 text-[16px] font-black">{item.titulo}</h3>
                <p className="mt-1.5 text-[13px] font-medium text-white/55">{item.descricao}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// 5 — COMO VAI SER, NA PRÁTICA (cinza)
function ComoVaiSerSection() {
  return (
    <section style={{ background: "#F8F8F8" }}>
      <div className="mx-auto max-w-[1320px] px-6 py-16 sm:px-10 sm:py-24">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111] text-white">
              <ArrowRight size={18} />
            </div>
            <h2 className="display text-[32px] font-black leading-none tracking-[-0.02em] sm:text-[42px]">
              COMO VAI SER, NA PRÁTICA
            </h2>
          </div>
          <span className="text-[12px] font-bold tracking-[0.16em] text-black/40">5 ETAPAS • ZERO STRESS</span>
        </div>

        <div className="mt-10 grid grid-cols-1 overflow-hidden rounded-3xl border border-black/10 bg-white sm:grid-cols-2 lg:grid-cols-5">
          {ETAPAS_GLAM.map((e, i) => (
            <div
              key={e.n}
              className="relative p-6 sm:p-7"
              style={{ borderRight: i < ETAPAS_GLAM.length - 1 ? "1px solid rgba(0,0,0,.08)" : undefined }}
            >
              <div className="display text-[36px] font-black leading-none" style={{ color: OURO }}>{e.n}</div>
              <h3 className="mt-3 text-[14px] font-black">{e.titulo}</h3>
              <p className="mt-1.5 text-[13px] font-medium text-black/50">{e.descricao}</p>
              {i < ETAPAS_GLAM.length - 1 && (
                <div className="absolute right-[-12px] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#111] text-white lg:flex">
                  <ArrowRight size={13} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type Pacotes = OrcamentoPublicoData["pacotes"];
type Extras = OrcamentoPublicoData["extras"];
type Valores = ReturnType<typeof calcularProposta>;

// 7 — INVESTIMENTO (seção escura)
function InvestimentoSection({
  nome, pacotes, pacoteId, setPacoteId, pacote, guests, setGuests, regra,
  extras, extrasIds, setExtrasIds, valores, parcela, parcelasMaximo,
  extrasCount, highlight, podeResponder, onAbrir,
}: {
  nome: string;
  pacotes: Pacotes;
  pacoteId: string | null;
  setPacoteId: (id: string) => void;
  pacote: Pacotes[number] | null;
  guests: number;
  setGuests: (n: number) => void;
  regra: { inclusos: number; valorPorExtra: number; min: number; max: number };
  extras: Extras;
  extrasIds: string[];
  setExtrasIds: (fn: (ids: string[]) => string[]) => void;
  valores: Valores;
  parcela: number;
  parcelasMaximo: number;
  extrasCount: number;
  highlight: boolean;
  podeResponder: boolean;
  onAbrir: () => void;
  cd: { d: number; h: number; m: number; s: number } | null;
  pad2: (n: number) => string;
}) {
  const pct = ((guests - regra.min) / Math.max(1, regra.max - regra.min)) * 100;
  const fill = `linear-gradient(to right, ${OURO} ${pct}%, rgba(255,255,255,.2) ${pct}%)`;

  return (
    <section id="investimento" className="bg-[#111] text-white">
      <div
        className="mx-auto max-w-[1120px] px-6 py-16 sm:px-10 sm:py-24"
      >
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 text-[11px] font-bold">
            <span className="glam-pulse h-1.5 w-1.5 rounded-full" style={{ background: OURO }} />
            INVESTIMENTO • TRANSPARENTE
          </span>
        </div>
        <h2 className="display mx-auto mt-5 max-w-[900px] text-center text-[40px] font-black leading-[0.9] tracking-[-0.03em] sm:text-[64px]">
          QUANTO CUSTA FAZER A FESTA <span style={{ color: OURO }}>MAIS FALADA?</span>
        </h2>

        <div
          className="mx-auto mt-12 max-w-[760px] rounded-[28px] p-6 transition-shadow sm:p-9"
          style={{
            background: "rgba(255,255,255,.06)",
            boxShadow: highlight ? `inset 0 0 0 4px ${OURO}` : "none",
          }}
        >
          <p className="text-center text-[12px] font-bold tracking-[0.16em] text-white/50">
            PACOTE {pacote?.nome ?? "—"} • {guests} CONVIDADOS
          </p>
          <p className="display mt-3 text-center text-[52px] font-black leading-none tracking-[-0.03em] sm:text-[72px]">
            R$ {brl(valores.total)}
          </p>
          <p className="mt-3 text-center text-[13px] font-medium text-white/50">
            Em até {parcelasMaximo}x no cartão • Trava de preço hoje • Contrato digital
          </p>

          {/* 3 botões de pacote */}
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {pacotes.map((p) => {
              const on = p.id === pacoteId;
              return (
                <button
                  key={p.id}
                  onClick={() => setPacoteId(p.id)}
                  className="relative rounded-2xl p-4 text-left transition-all"
                  style={{
                    background: on ? OURO : "rgba(255,255,255,.05)",
                    color: on ? INK : "#fff",
                    boxShadow: on ? `0 0 0 4px rgba(212,175,55,.25)` : "none",
                  }}
                >
                  {p.recomendado && (
                    <span className="absolute right-3 top-3 text-[11px] font-black" style={{ color: on ? INK : OURO }}>★</span>
                  )}
                  {on && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#111]">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </span>
                  )}
                  <div className="text-[15px] font-black">{p.nome}</div>
                  <div className="mt-1 text-[13px] font-bold" style={{ color: on ? INK : OURO }}>
                    R$ {brl(Number(p.preco))}
                  </div>
                  {p.subtitulo && (
                    <div className="mt-1.5 text-[11px] font-medium" style={{ color: on ? "rgba(0,0,0,.6)" : "rgba(255,255,255,.5)" }}>
                      {p.subtitulo}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* caixa preta: ajustar convidados + extras */}
          <div className="mt-5 rounded-2xl bg-black p-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black tracking-[0.14em] text-white/70">AJUSTAR CONVIDADOS</span>
              <span className="rounded-full px-3 py-1 text-[12px] font-black text-[#111]" style={{ background: OURO }}>
                {guests} PESSOAS
              </span>
            </div>
            <input
              type="range"
              min={regra.min}
              max={regra.max}
              step={5}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              aria-label="Número de convidados"
              className="mt-4 w-full"
              style={{ background: fill }}
            />
            <div className="mt-2 flex justify-between text-[10.5px] font-bold text-white/40">
              <span>{regra.min} PESSOAS</span>
              <span>BASE {regra.inclusos}</span>
              <span>{regra.max} PESSOAS</span>
            </div>
            {extrasCount > 0 && (
              <p className="mt-3 text-[12px] font-bold" style={{ color: OURO }}>
                + {extrasCount} extras × R$ {brl(regra.valorPorExtra)} = + R$ {brl(valores.valorConvidadosExtra)} no total
              </p>
            )}

            {extras.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                {extras.map((x) => {
                  const on = extrasIds.includes(x.id);
                  return (
                    <button
                      key={x.id}
                      onClick={() => setExtrasIds((ids) => (on ? ids.filter((i) => i !== x.id) : [...ids, x.id]))}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="text-[13px] font-bold text-white/80">
                        {x.nome} <span className="text-white/40">+ R$ {brl(Number(x.preco))}</span>
                      </span>
                      <span className="relative h-6 w-11 shrink-0 rounded-full transition-colors" style={{ background: on ? OURO : "rgba(255,255,255,.2)" }}>
                        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]" style={{ left: on ? 22 : 2 }} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={onAbrir}
            disabled={!podeResponder}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-[14px] font-black text-[#111] transition-transform hover:scale-[1.01] disabled:opacity-40"
          >
            GARANTIR MINHA DATA COM {nome} <ArrowRight size={16} />
          </button>
          <p className="mt-3 text-center text-[11px] font-medium text-white/40">
            Sem compromisso agora • Você fecha quando quiser • Contrato digital
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#111]">✓ SEM TAXA ESCONDIDA</span>
            <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#111]">✓ EQUIPE INCLUSA</span>
            <span className="rounded-full px-3 py-1.5 text-[11px] font-bold text-white" style={{ background: ROSA }}>✓ DATA TRAVADA HOJE</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// 6 — NO DIA... VOCÊ SÓ BRILHA (branco)
function NoDiaSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1320px] px-6 py-16 sm:px-10 sm:py-24">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="display text-[34px] font-black leading-[0.95] tracking-[-0.02em] sm:text-[50px]">
            NO DIA, A GENTE FAZ TUDO. VOCÊ SÓ{" "}
            <span className="inline-block rounded-[10px] bg-[#111] px-3 text-white">BRILHA.</span>
          </h2>
          <span className="rounded-full px-3 py-1.5 text-[11px] font-bold text-white" style={{ background: ROSA }}>
            CHECKLIST REAL DA EQUIPE
          </span>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CARDS_DIA_GLAM.map((card) => (
            <div key={card.titulo} className="overflow-hidden rounded-[20px] border border-black/10">
              <div className="relative flex h-[220px] items-end p-5" style={{ background: card.gradiente }}>
                <div className="absolute right-6 top-6 h-16 w-16 rounded-full" style={{ background: card.acento, filter: "blur(28px)", opacity: 0.7 }} />
                <div className="absolute left-8 top-10 h-px w-24" style={{ background: card.acento, opacity: 0.5, transform: "rotate(-18deg)" }} />
                <span className="absolute right-6 top-6 h-2 w-2 rounded-full" style={{ background: card.acento, boxShadow: `0 0 16px ${card.acento}` }} />
                <h3 className="display relative text-[22px] font-black leading-tight text-white">{card.titulo}</h3>
              </div>
              <ul className="space-y-2.5 p-5">
                {card.itens.map((it) => (
                  <li key={it} className="flex items-center gap-2.5 text-[13.5px] font-bold">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: "#22c55e" }}>
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 8 — FOOTER
function FooterGlam({
  dados, nome, onAbrir, podeResponder,
}: {
  dados: OrcamentoPublicoData;
  nome: string;
  onAbrir: () => void;
  podeResponder: boolean;
}) {
  const iniciais = dados.nome_empresa.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <footer className="border-t border-black/10 bg-white">
      <div className="mx-auto max-w-[1320px] px-6 py-12 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="display flex h-11 w-11 items-center justify-center rounded-full bg-[#111] text-[14px] font-black text-white">
              {iniciais}
            </div>
            <div>
              <p className="text-[14px] font-black">{dados.nome_empresa} • {nome}</p>
              <p className="text-[12px] font-medium text-black/50">
                Respondo em até 2h • 300 festas • 4.9★ no Google
              </p>
            </div>
          </div>
          <button
            onClick={onAbrir}
            disabled={!podeResponder}
            className="flex items-center gap-2 rounded-full bg-[#111] px-6 py-3.5 text-[13px] font-bold text-white transition-colors hover:bg-black disabled:opacity-40"
          >
            FECHAR MINHA FESTA AGORA <ArrowRight size={15} />
          </button>
        </div>
        <p className="mt-10 text-center text-[11px] font-bold tracking-[0.16em] text-black/30">
          TEMPLATE 02 • DEBUT FESTA GLAM • CONTRASTE AAA • LEGIBILIDADE MÁXIMA
        </p>
      </div>
    </footer>
  );
}

// 9 — MODAL (contrato digital com assinatura digitada)
function ModalContrato({
  hash, nome, pacote, guests, extrasIds, parcelas, total, validadeDias, onFechar, onAceito,
}: {
  hash: string;
  nome: string;
  pacote: Pacotes[number];
  guests: number;
  extrasIds: string[];
  parcelas: number;
  total: number;
  validadeDias: number;
  onFechar: () => void;
  onAceito: (recibo: string, valor: number) => void;
}) {
  const [sig, setSig] = useState("");
  const [agree, setAgree] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const jaEnviou = useRef(false);

  const podeAssinar = sig.trim() !== "" && agree && !enviando;

  async function confirmar() {
    if (jaEnviou.current) return;
    jaEnviou.current = true;
    setEnviando(true);
    setErro(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("registrar_aceite_proposta", {
      p_hash: hash,
      p_pacote_id: pacote.id,
      p_convidados: guests,
      p_extras_ids: extrasIds,
      p_forma_pagamento: "parcelado",
      p_parcelas: parcelas,
      p_nome_noiva: sig.trim(),
      p_nome_noivo: null,
      p_assinatura_noiva: sig.trim(),
      p_assinatura_noivo: null,
      p_observacoes: null,
    });
    setEnviando(false);
    const falha = error?.message ?? (data as { error?: string })?.error;
    if (falha) {
      jaEnviou.current = false;
      return setErro(typeof falha === "string" ? falha : "Não foi possível registrar.");
    }
    const d = data as { recibo: string; valor_total: number };
    onAceito(d.recibo, Number(d.valor_total));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur"
      onClick={onFechar}
    >
      <div
        className="glam-modal-card relative w-full max-w-[520px] rounded-[28px] bg-[#111] p-6 text-white sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button aria-label="Fechar" onClick={onFechar} className="absolute right-5 top-5 text-white/60 hover:text-white">
          <X size={22} />
        </button>
        <span className="inline-block rounded-full px-3 py-1.5 text-[10px] font-black text-[#111]" style={{ background: OURO }}>
          CONTRATO DIGITAL • ASSINATURA
        </span>
        <h3 className="display mt-4 text-[26px] font-black leading-tight sm:text-[30px]">
          Fechar a festa da {nome}?
        </h3>

        <div className="mt-5 space-y-2 rounded-2xl bg-white/5 p-4 text-[13px]">
          <div className="flex justify-between"><span className="text-white/50">Pacote</span><span className="font-bold">{pacote.nome}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Convidados</span><span className="font-bold">{guests}</span></div>
          <div className="flex justify-between border-t border-white/10 pt-2"><span className="text-white/50">Total</span><span className="display text-[18px] font-black">R$ {brl(total)}</span></div>
          <p className="pt-1 text-[11px] text-white/40">Em até {parcelas}x • Preço travado por {validadeDias} dias</p>
        </div>

        <label className="mt-5 block text-[11px] font-bold tracking-[0.12em] text-white/50">SUA ASSINATURA (nome completo)</label>
        <input
          value={sig}
          onChange={(e) => setSig(e.target.value)}
          placeholder="Digite seu nome"
          className="mt-2 w-full rounded-xl border-2 border-white/15 bg-white px-3.5 py-3 text-[15px] font-semibold text-[#111] outline-none focus:border-[#D4AF37]"
        />
        <p className="display mt-2 text-[24px] font-black sm:text-[28px]" style={{ color: sig.trim() ? OURO : "rgba(255,255,255,.25)" }}>
          {sig.trim() || "Sua assinatura aqui"}
        </p>

        <label className="mt-4 flex items-start gap-2.5 text-[12.5px]">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D4AF37]" />
          <span className="text-white/70">
            Li e concordo com os valores e condições desta proposta e autorizo a reserva da data.
          </span>
        </label>

        {erro && <p className="mt-3 rounded-lg bg-red-500/15 p-2.5 text-[12.5px] text-red-300">{erro}</p>}

        <button
          onClick={confirmar}
          disabled={!podeAssinar}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full py-4 text-[14px] font-black transition-transform hover:scale-[1.01]"
          style={podeAssinar ? { background: OURO, color: INK } : { background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.4)" }}
        >
          {enviando ? "TRAVANDO…" : "ASSINAR E TRAVAR MINHA DATA →"}
        </button>
        <p className="mt-3 text-center text-[10.5px] text-white/35">
          DOCUMENTO VÁLIDO JURIDICAMENTE • ASSINATURA DIGITAL
        </p>
      </div>
    </div>
  );
}

function ReciboGlam({
  aceite, nomeEmpresa, nome,
}: {
  aceite: NonNullable<OrcamentoPublicoData["aceite"]>;
  nomeEmpresa: string;
  nome: string;
}) {
  return (
    <div className="glam-root flex min-h-screen items-center justify-center bg-[#111] p-6 text-white">
      <style>{`.glam-root .display{font-family:var(--font-syne),sans-serif}`}</style>
      <div className="w-full max-w-[520px] rounded-[28px] p-8 text-center" style={{ background: "rgba(255,255,255,.06)" }}>
        <div className="text-[44px]">🎉</div>
        <h1 className="display mt-3 text-[32px] font-black leading-tight">DATA TRAVADA!</h1>
        <p className="mt-2 text-[14px] font-medium text-white/60">
          {nome}, sua festa está reservada com a {nomeEmpresa}.
        </p>
        <div className="mt-6 rounded-2xl bg-black p-5">
          <div className="text-[10px] font-bold tracking-[0.18em] text-white/40">COMPROVANTE</div>
          <div className="display mt-1 text-[26px] font-black" style={{ color: OURO }}>{aceite.recibo_codigo}</div>
          <div className="mt-3 text-[13px] font-medium text-white/60">
            {aceite.pacote_nome} • R$ {brl(Number(aceite.valor_total))}
          </div>
        </div>
        <p className="mt-5 text-[11.5px] text-white/40">
          Guarde este código. A gente já vai te chamar pra combinar os próximos passos. 🔥
        </p>
      </div>
    </div>
  );
}
