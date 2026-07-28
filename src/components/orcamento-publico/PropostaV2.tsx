"use client";

// Proposta pública de casamento — implementação do handoff em
// design/template-1/design_handoff_proposta_casamento/README.md.
//
// Valores extraídos do README e confirmados no DOM da referência:
//   fundo #F9F5F0 · cards #FDFCFB · borda #E8DDD2 · texto #3C2415
//   secundário #6B5A4B · terciário #8B7355 · dourado #B8935A
//   Cormorant Garamond (títulos) + Inter (corpo)
//   barra de progresso 3px, trilho #E8DDD2, preenchimento #B8935A
//   pacotes: raio 24px, borda 2px, fundo FIXO por card
//   selecionado: sombra 0 20px 60px -20px rgba(60,36,21,.3) + scale(1.02)
//
// Diferenças conscientes em relação ao handoff:
//  * a caixa de comentários não entra (decisão do produto: dispersa a
//    conversão);
//  * nome do casal vem de orcamentos.contato_nome — na referência é
//    editável inline, mas aqui divergiria do contrato assinado;
//  * o recibo é gerado e gravado no banco (coluna unique), não sorteado
//    no cliente, senão o código muda a cada re-render;
//  * preços, pacotes, fotos e depoimentos vêm do Supabase; o conteúdo do
//    README é o fallback de quem ainda não cadastrou.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Check,
  Clock,
  Gift,
  Heart,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { criarEventoAPartirDoOrcamento } from "@/lib/orcamento-para-evento";
import { FichaCadastroAprovacao } from "@/components/orcamento-publico/FichaCadastroAprovacao";
import { AssinaturaCanvas } from "@/components/orcamento-publico/AssinaturaCanvas";
import { formatDateBR } from "@/lib/orcamentos";
import { expirado, type OrcamentoPublicoData } from "@/lib/orcamento-publico";
import { IMAGEM_PADRAO } from "@/lib/landing-imagens";
import {
  DEPOIMENTOS_PADRAO,
  ETAPAS_PADRAO,
  INCLUSO_PADRAO,
  NO_DIA_PADRAO,
  PROXIMOS_PASSOS,
} from "@/lib/proposta-conteudo";

const NAV = [
  "APRESENTAÇÃO",
  "QUEM SOMOS",
  "O QUE ESTÁ INCLUSO",
  "COMO FUNCIONA",
  "NO DIA DO CASAMENTO",
  "INVESTIMENTO",
  "EVENTOS REALIZADOS",
  "DEPOIMENTOS",
  "PRÓXIMOS PASSOS",
];
const idDe = (label: string) =>
  label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");

const brl = (v: number) =>
  `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ICONES = [Sparkles, Award, Heart, Clock, Gift];

export function PropostaV2({
  hash,
  inicial,
}: {
  hash: string;
  inicial: OrcamentoPublicoData;
}) {
  const [dados, setDados] = useState(inicial);
  const [fichaEnviada, setFichaEnviada] = useState(inicial.ficha_preenchida);
  const [ativa, setAtiva] = useState(idDe(NAV[0]));
  const [progresso, setProgresso] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);
  const [countdown, setCountdown] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [expandido, setExpandido] = useState<Record<number, boolean>>({});
  const [etapaModal, setEtapaModal] = useState<number | null>(null);
  const [processoModal, setProcessoModal] = useState(false);
  const [contratoAberto, setContratoAberto] = useState(false);
  const jaGerou = useRef(false);

  const venceu = expirado(dados);
  const podeResponder = dados.status === "enviado" && !venceu;

  const inst = dados.institucional;
  // useMemo: sem isso o array novo a cada render anula o memo do cálculo.
  const pacotes = useMemo(() => dados.pacotes ?? [], [dados.pacotes]);
  const extras = useMemo(() => dados.extras ?? [], [dados.extras]);
  const fotos = dados.fotos ?? [];

  const etapas = (dados.etapas ?? []).length > 0 ? dados.etapas : ETAPAS_PADRAO;
  const depoimentos =
    (dados.depoimentos ?? []).length > 0 ? dados.depoimentos : DEPOIMENTOS_PADRAO;

  const regra = {
    inclusos: inst?.convidados_inclusos ?? 150,
    porExtra: Number(inst?.valor_por_convidado_extra ?? 12),
    min: inst?.convidados_min ?? 50,
    max: inst?.convidados_max ?? 300,
  };
  const cond = {
    entrada: inst?.condicao_entrada_percentual ?? 30,
    maxParcelas: inst?.condicao_parcelas_maximo ?? 7,
    desconto: inst?.condicao_desconto_a_vista_percentual ?? 5,
  };

  const [pacoteId, setPacoteId] = useState<string | null>(
    () => (pacotes.find((p) => p.recomendado) ?? pacotes[0])?.id ?? null
  );
  const [convidados, setConvidados] = useState(dados.numero_convidados ?? regra.inclusos);
  const [extrasIds, setExtrasIds] = useState<string[]>([]);
  const [modo, setModo] = useState<"parcelado" | "vista">("parcelado");
  const [parcelas, setParcelas] = useState(Math.min(7, cond.maxParcelas || 7));

  const pacote = pacotes.find((p) => p.id === pacoteId) ?? null;

  // Selo da capa: o pacote marcado como recomendado no painel.
  const pacoteRecomendado = pacotes.find((p) => p.recomendado) ?? null;

  // Pacote topo de linha (maior preço entre os não recomendados): recebe o
  // fundo creme/dourado do handoff.
  const idTopoLinha = useMemo(() => {
    const candidatos = pacotes.filter((p) => !p.recomendado);
    if (candidatos.length < 2) return null;
    return candidatos.reduce((a, b) => (Number(b.preco) > Number(a.preco) ? b : a)).id;
  }, [pacotes]);

  // Fórmula do handoff:
  // subtotal = pacote + max(0, convidados-150)*12 + extras
  // desconto = vista ? subtotal*5% : 0 ; total = subtotal - desconto
  // entrada = total*30% ; parcela = (total-entrada)/n
  const calc = useMemo(() => {
    const base = Number(pacote?.preco ?? 0);
    const excedentes = Math.max(0, convidados - regra.inclusos);
    const porConvidados = excedentes * regra.porExtra;
    const somaExtras = extras
      .filter((x) => extrasIds.includes(x.id))
      .reduce((s, x) => s + Number(x.preco), 0);
    const subtotal = base + porConvidados + somaExtras;
    const desconto = modo === "vista" ? (subtotal * cond.desconto) / 100 : 0;
    const total = subtotal - desconto;
    const entrada = (total * cond.entrada) / 100;
    const resta = total - entrada;
    return {
      base, excedentes, porConvidados, somaExtras, subtotal, desconto, total, entrada, resta,
      parcela: modo === "vista" ? 0 : resta / parcelas,
    };
  }, [pacote, convidados, extrasIds, extras, modo, parcelas, regra.inclusos, regra.porExtra, cond.desconto, cond.entrada]);

  const diasRestantes =
    dados.dias_restantes ??
    Math.max(0, Math.ceil((new Date(dados.data_validade).getTime() - Date.now()) / 86_400_000));
  const whats = inst?.whatsapp_contato?.replace(/\D/g, "") || null;

  // countdown só no cliente (hora no SSR quebraria a hidratação)
  useEffect(() => {
    const fim = Date.now() + diasRestantes * 86_400_000;
    const tick = () => {
      const r = Math.max(0, fim - Date.now());
      setCountdown({
        d: Math.floor(r / 86_400_000),
        h: Math.floor((r % 86_400_000) / 3_600_000),
        m: Math.floor((r % 3_600_000) / 60_000),
        s: Math.floor((r % 60_000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [diasRestantes]);

  // progresso + scrollspy
  useEffect(() => {
    const aoRolar = () => {
      const h = document.documentElement;
      const t = h.scrollHeight - h.clientHeight;
      setProgresso(t > 0 ? Math.min(100, (h.scrollTop / t) * 100) : 0);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();
    const obs = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) setAtiva(v.target.id);
      },
      { rootMargin: "-12% 0px -78% 0px" }
    );
    NAV.forEach((l) => {
      const el = document.getElementById(idDe(l));
      if (el) obs.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", aoRolar);
      obs.disconnect();
    };
  }, []);

  async function aposFicha() {
    setFichaEnviada(true);
    if (jaGerou.current) return;
    jaGerou.current = true;
    await criarEventoAPartirDoOrcamento(hash, dados.tipo_evento, dados.data_evento);
  }

  const irPara = (label: string) => {
    document.getElementById(idDe(label))?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuAberto(false);
  };

  const iniciais = dados.nome_empresa.slice(0, 2).toUpperCase();
  const primeiroNome = dados.nome_empresa.split(" ")[0];

  return (
    <div className="min-h-screen bg-[#F9F5F0] text-[#3C2415]">
      <style>{`
        .serif{font-family:var(--font-titulo),Georgia,serif}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.75)}}
        .dot-pulse{animation:pulseDot 1.8s ease-in-out infinite}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .fade-up{animation:fadeUp .4s ease}
      `}</style>

      {/* 1 — barra de progresso */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-[#E8DDD2] z-[60]">
        <div className="h-full bg-[#B8935A] transition-[width] duration-150" style={{ width: `${progresso}%` }} />
      </div>

      {/* 2 — topo mobile */}
      <div className="lg:hidden sticky top-0 z-40 bg-[#FDFCFB] border-b border-[#E8DDD2] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border border-[#3C2415] flex items-center justify-center serif font-bold text-[12px]">
            {iniciais}
          </div>
          <span className="text-[11px] tracking-[0.2em] font-semibold">{dados.nome_empresa.toUpperCase()}</span>
        </div>
        <button onClick={() => setMenuAberto((v) => !v)} aria-label="Abrir navegação" className="p-1.5">
          {menuAberto ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuAberto && (
        <div className="lg:hidden sticky top-[57px] z-40 bg-[#FDFCFB] border-b border-[#E8DDD2] px-4 py-3 grid grid-cols-2 gap-1.5">
          {NAV.map((l) => (
            <button
              key={l}
              onClick={() => irPara(l)}
              className={`text-left text-[10px] tracking-[0.14em] px-3 py-2 rounded-full ${
                ativa === idDe(l) ? "bg-[#3C2415] text-white" : "text-[#6B5A4B]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      <div className="flex">
        {/* 2 — sidebar desktop */}
        <aside className="hidden lg:flex w-[240px] shrink-0 sticky top-0 h-screen flex-col bg-[#FDFCFB] border-r border-[#E8DDD2] px-5 py-7 overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#3C2415] flex items-center justify-center serif font-bold">
              {iniciais}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] tracking-[0.2em] font-semibold leading-none truncate">
                {dados.nome_empresa.toUpperCase()}
              </p>
              <p className="text-[9px] tracking-[0.18em] text-[#8B7355] mt-1">EVENTOS</p>
            </div>
          </div>

          <div className="h-[1px] my-6 bg-gradient-to-r from-[#E8DDD2] via-[#B8935A]/40 to-[#E8DDD2]" />

          <nav className="space-y-1">
            {NAV.map((l) => {
              const on = ativa === idDe(l);
              return (
                <button
                  key={l}
                  onClick={() => irPara(l)}
                  className={`w-full flex items-center justify-between gap-2 rounded-full text-left text-[11px] tracking-[0.14em] transition-colors ${
                    on ? "bg-[#3C2415] text-white px-4 py-2.5" : "text-[#6B5A4B] hover:text-[#3C2415] px-4 py-2"
                  }`}
                >
                  {l}
                  {on && <span className="w-1.5 h-1.5 rounded-full bg-[#B8935A] dot-pulse shrink-0" />}
                </button>
              );
            })}
          </nav>

          {whats && (
            <div className="mt-auto pt-6">
              <div className="bg-[#F9F5F0] border border-[#E8DDD2] rounded-[20px] p-4">
                <p className="text-[11px] tracking-[0.16em] font-semibold">💬 DÚVIDAS?</p>
                <p className="text-[11px] text-[#6B5A4B] leading-[1.45] mt-1">
                  Fale direto com {primeiroNome}. Resposta em até 2h.
                </p>
                <a
                  href={`https://wa.me/${whats}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center w-full mt-3 bg-white border border-[#E8DDD2] rounded-full py-2 text-[11px] tracking-[0.16em]"
                >
                  CHAMAR NO WHATS
                </a>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0">
          {/* 3 — countdown */}
          {podeResponder && (
            <div className="bg-[#3C2415] text-[#F9F5F0] flex flex-wrap items-center justify-center gap-2.5 px-4 py-2.5 text-[11px] tracking-[0.16em]">
              <span>⏱ PROPOSTA VÁLIDA POR:</span>
              <span className="flex gap-1.5 font-mono">
                {[
                  [`${countdown?.d ?? diasRestantes}d`, false],
                  [`${String(countdown?.h ?? 0).padStart(2, "0")}h`, false],
                  [`${String(countdown?.m ?? 0).padStart(2, "0")}m`, false],
                  [`${String(countdown?.s ?? 0).padStart(2, "0")}s`, true],
                ].map(([txt, gold], i) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 rounded ${gold ? "bg-[#B8935A] text-white" : "bg-white/10"}`}
                  >
                    {txt as string}
                  </span>
                ))}
              </span>
            </div>
          )}

          <div className="px-5 sm:px-6 py-10">
            {/* 4 — HERO: texto à esquerda, capa à direita. As proporções são
                as medidas na referência a 1440px (603/494 + 40 de gap). No
                mobile vira coluna única com a capa no topo, como o header. */}
            <section
              id={idDe(NAV[0])}
              className="scroll-mt-20 grid gap-8 lg:gap-10 lg:grid-cols-[1.22fr_1fr] lg:items-start"
            >
              <div className="order-2 lg:order-1">
                <span className="inline-flex items-center gap-2 bg-white border border-[#E8DDD2] rounded-full px-3.5 py-1.5 text-[10px] tracking-[0.18em] text-[#6B5A4B]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3CA37A]" />
                  PROPOSTA DE ASSESSORIA COMPLETA • V2.0 INTERATIVA
                </span>

                <h1 className="serif text-[38px] sm:text-[56px] leading-[1.05] font-medium mt-5">
                  Proposta de<br />
                  {dados.nome_contato} <span className="text-[#B8935A]">♥</span><br />
                  <span className="italic text-[#6B5A4B]">assessoria</span>
                </h1>

                <p className="serif italic text-[19px] leading-[1.5] text-[#6B5A4B] max-w-[520px] mt-5">
                  “Transformamos sonhos em experiências inesquecíveis — com tecnologia, afeto e método.”
                </p>

                {/* 3 × 152px na referência: os cards não esticam junto com a coluna. */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 max-w-[480px]">
                  <InfoCard icone="📅" rotulo="DATA" valor={dados.data_evento ? formatDateBR(dados.data_evento) : "A definir"} sub="Data do evento" />
                  <InfoCard icone="👥" rotulo="CONVIDADOS" valor={`${convidados} pessoas`} sub="Estimativa" />
                  <InfoCard
                    icone="📍"
                    rotulo="LOCAL"
                    valor={dados.local_evento || dados.cidade_evento || "A definir"}
                    sub={dados.local_evento ? dados.cidade_evento ?? "" : ""}
                  />
                </div>

                <div className="mt-6 bg-white border border-[#E8DDD2] rounded-[20px] p-5 flex flex-wrap items-center gap-4 shadow-[0_10px_40px_-15px_rgba(60,36,21,0.15)]">
                  <div className="w-11 h-11 rounded-full bg-[#3C2415] text-white flex items-center justify-center serif font-bold shrink-0">
                    {iniciais}
                  </div>
                  <p className="flex-1 min-w-[220px] text-[13px] leading-[1.55] text-[#6B5A4B]">
                    <strong className="text-[#3C2415]">Olá, {dados.nome_contato}!</strong> Preparamos
                    esta experiência interativa para vocês montarem a assessoria do jeito que sonharam.
                  </p>
                </div>
              </div>

              {/* Capa: a que a cerimonialista subiu em Configurações › Imagens
                  da proposta, ou o asset de fábrica quando a coluna é null. */}
              <div className="order-1 lg:order-2 relative rounded-[28px] overflow-hidden h-[260px] sm:h-[340px] lg:h-[420px] bg-[#E8DDD2] shadow-[0_20px_60px_-20px_rgba(60,36,21,0.3)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dados.hero_imagem_url || IMAGEM_PADRAO.hero}
                  alt={`Foto de capa de ${dados.nome_contato}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55),rgba(0,0,0,0)_45%)]" />

                <div className="absolute top-4 left-4 right-4 flex flex-wrap items-start justify-between gap-2">
                  <span className="bg-white/90 text-[#3C2415] rounded-full px-3 py-[5px] text-[10px] tracking-[0.1em]">
                    ● AO VIVO • V2.0 INTERATIVA
                  </span>
                  {pacoteRecomendado && (
                    <span className="bg-[#B8935A] text-white rounded-full px-3 py-[5px] text-[10px] tracking-[0.1em]">
                      {pacoteRecomendado.nome.toUpperCase()} • MAIS ESCOLHIDO
                    </span>
                  )}
                </div>

                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <p className="serif text-[22px] leading-tight font-medium drop-shadow">
                    {dados.nome_contato}
                  </p>
                  <p className="text-[10px] tracking-[0.16em] text-white/80 mt-1 uppercase">
                    {[
                      dados.data_evento ? formatDateBR(dados.data_evento) : null,
                      dados.local_evento || dados.cidade_evento,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>
              </div>
            </section>

            {/* 5 — INVESTIMENTO */}
            {pacotes.length > 0 && (
              <section id={idDe(NAV[5])} className="scroll-mt-20 mt-16">
                <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">
                  ⚡ CALCULADORA INTERATIVA V2.0
                </p>
                <h2 className="serif text-[34px] sm:text-[42px] leading-[1.1] font-medium mt-2">
                  Invista no dia<br />mais feliz da vida
                </h2>
                <p className="text-[13px] leading-[1.6] text-[#6B5A4B] max-w-[560px] mt-3">
                  Ajuste convidados, pacotes e adicionais. Veja entrada, parcelas e desconto à
                  vista recalculando ao vivo — sem surpresas.
                </p>

                <div className="flex flex-wrap gap-2 mt-5">
                  {([["parcelado", `ATÉ ${cond.maxParcelas}X SEM JUROS`], ["vista", `${cond.desconto}% DESCONTO À VISTA`]] as const).map(
                    ([k, txt]) => (
                      <button
                        key={k}
                        onClick={() => setModo(k)}
                        aria-pressed={modo === k}
                        className={`rounded-full px-4 py-2 text-[10px] tracking-[0.16em] border transition-colors ${
                          modo === k
                            ? "bg-[#3C2415] text-white border-[#3C2415]"
                            : "bg-white text-[#6B5A4B] border-[#E8DDD2]"
                        }`}
                      >
                        {txt}
                      </button>
                    )
                  )}
                </div>

                {/* cards de pacote — fundo FIXO por card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {pacotes.map((p) => {
                    const on = pacoteId === p.id;
                    const escuro = p.recomendado;
                    // O handoff define o fundo pelo PAPEL do pacote, não pela
                    // posição: recomendado escuro, topo de linha creme/dourado,
                    // demais claros. Amarrar ao índice quebrava quando a
                    // empresa cadastra mais de 3 pacotes.
                    const topoDeLinha = !escuro && p.id === idTopoLinha;
                    const fundo = escuro ? "#3C2415" : topoDeLinha ? "#FFF9F0" : "#F9F5F0";
                    const bordaBase = escuro
                      ? "#3C2415"
                      : topoDeLinha
                        ? "rgba(184,147,90,0.5)"
                        : "#E8DDD2";
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPacoteId(p.id)}
                        aria-pressed={on}
                        className="relative text-left rounded-[24px] p-6 border-2 transition-all duration-200"
                        style={{
                          background: fundo,
                          borderColor: on ? "#3C2415" : bordaBase,
                          color: escuro ? "#FFFFFF" : "#3C2415",
                          transform: on ? "scale(1.02)" : "none",
                          boxShadow: on ? "0 20px 60px -20px rgba(60,36,21,0.3)" : "none",
                        }}
                      >
                        {p.recomendado && (
                          <span className="absolute -top-3 left-6 bg-[#B8935A] text-white text-[9px] tracking-[0.16em] px-3 py-1 rounded-full">
                            MAIS ESCOLHIDO
                          </span>
                        )}
                        {p.subtitulo && (
                          <p className={`text-[10px] tracking-[0.16em] ${escuro ? "text-white/60" : "text-[#8B7355]"}`}>
                            {p.subtitulo}
                          </p>
                        )}
                        <p className="text-[11px] tracking-[0.2em] font-semibold mt-1">{p.nome}</p>
                        <p className="serif text-[30px] font-semibold mt-1">{brl(p.preco)}</p>
                        <p className={`text-[10px] ${escuro ? "text-white/50" : "text-[#8B7355]"}`}>/ pacote base</p>
                        <ul className="mt-4 space-y-1.5">
                          {p.inclui.map((f, j) => (
                            <li key={j} className={`flex gap-2 text-[11.5px] leading-[1.45] ${escuro ? "text-white/85" : "text-[#6B5A4B]"}`}>
                              <span className="text-[#B8935A]">✓</span> {f}
                            </li>
                          ))}
                          {p.nao_inclui.map((f, j) => (
                            <li key={`n${j}`} className={`flex gap-2 text-[11.5px] leading-[1.45] line-through ${escuro ? "text-white/35" : "text-[#8B7355]/60"}`}>
                              <span>✕</span> {f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>

                {/* ajustes finos + resumo */}
                <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] mt-6">
                  <div className="bg-white border border-[#E8DDD2] rounded-[24px] p-6">
                    <p className="text-[11px] tracking-[0.2em] font-semibold">AJUSTES FINOS</p>

                    <div className="mt-5">
                      <div className="flex justify-between text-[12px] text-[#6B5A4B]">
                        <span>Convidados: <strong className="text-[#3C2415]">{convidados}</strong></span>
                        <span className="text-[#B8935A]">
                          {calc.excedentes > 0 ? `+ ${brl(calc.porConvidados)}` : "incluído"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={regra.min}
                        max={regra.max}
                        value={convidados}
                        onChange={(e) => setConvidados(Number(e.target.value))}
                        aria-label="Número de convidados"
                        className="w-full mt-2 accent-[#3C2415]"
                      />
                      <div className="flex justify-between text-[10px] text-[#8B7355]">
                        <span>{regra.min}</span>
                        <span>base {regra.inclusos} · +{brl(regra.porExtra)}/convidado</span>
                        <span>{regra.max}</span>
                      </div>
                    </div>

                    {extras.length > 0 && (
                      <div className="mt-5 space-y-2">
                        {extras.map((x) => {
                          const on = extrasIds.includes(x.id);
                          return (
                            <button
                              key={x.id}
                              onClick={() =>
                                setExtrasIds((p) => (on ? p.filter((i) => i !== x.id) : [...p, x.id]))
                              }
                              aria-pressed={on}
                              className={`w-full flex items-center justify-between gap-3 rounded-full border px-4 py-2.5 text-[12px] transition-colors ${
                                on ? "border-[#B8935A] bg-[#FFF9F0]" : "border-[#E8DDD2] bg-white"
                              }`}
                            >
                              <span className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    on ? "bg-[#3C2415] border-[#3C2415]" : "border-[#E8DDD2]"
                                  }`}
                                >
                                  {on && <Check size={10} color="#fff" strokeWidth={3} />}
                                </span>
                                <span className="truncate text-[#3C2415]">{x.nome}</span>
                              </span>
                              <span className="text-[#B8935A] font-medium shrink-0">+{brl(x.preco)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {modo === "parcelado" && (
                      <div className="mt-5">
                        <p className="text-[10px] tracking-[0.16em] text-[#8B7355]">PARCELAMENTO</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {[3, 5, 7].filter((n) => n <= cond.maxParcelas).map((n) => (
                            <button
                              key={n}
                              onClick={() => setParcelas(n)}
                              aria-pressed={parcelas === n}
                              className={`rounded-full px-4 py-2 text-[12px] border transition-colors ${
                                parcelas === n
                                  ? "bg-[#3C2415] text-white border-[#3C2415]"
                                  : "bg-white text-[#6B5A4B] border-[#E8DDD2]"
                              }`}
                            >
                              {n}x
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* resumo escuro */}
                  <div className="bg-[#3C2415] text-white rounded-[24px] p-6">
                    <p className="text-[10px] tracking-[0.18em] text-white/60">RESUMO FINANCEIRO AO VIVO</p>
                    <p className="text-[9px] tracking-[0.16em] text-[#B8935A] mt-0.5">V2.0 • CÁLCULO INSTANTÂNEO</p>

                    <div className="mt-5 space-y-2 text-[12px] text-white/75">
                      <Linha rotulo={`Pacote ${pacote?.nome ?? ""}`} valor={brl(calc.base)} />
                      <Linha rotulo={`Convidados extras (${calc.excedentes})`} valor={`+ ${brl(calc.porConvidados)}`} />
                      {calc.somaExtras > 0 && <Linha rotulo="Adicionais" valor={`+ ${brl(calc.somaExtras)}`} />}
                      <Linha rotulo="Subtotal" valor={brl(calc.subtotal)} />
                      {calc.desconto > 0 && (
                        <Linha rotulo={`Desconto à vista (${cond.desconto}%)`} valor={`− ${brl(calc.desconto)}`} dourado />
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/15">
                      <p className="text-[10px] tracking-[0.18em] text-white/60">TOTAL</p>
                      <p className="serif text-[34px] font-semibold leading-none mt-1 text-[#B8935A]">
                        {brl(calc.total)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 mt-4">
                      <div className="bg-white/10 rounded-[14px] p-3">
                        <p className="text-[9px] tracking-[0.14em] text-white/60">ENTRADA {cond.entrada}%</p>
                        <p className="serif text-[18px] font-semibold mt-0.5">{brl(calc.entrada)}</p>
                        <p className="text-[9px] text-white/50 mt-0.5">para reserva da data</p>
                      </div>
                      <div className="bg-white/10 rounded-[14px] p-3">
                        <p className="text-[9px] tracking-[0.14em] text-white/60">
                          {modo === "vista" ? "PAGAMENTO" : `${parcelas}X DE`}
                        </p>
                        <p className="serif text-[18px] font-semibold mt-0.5">
                          {modo === "vista" ? "À vista" : brl(calc.parcela)}
                        </p>
                        <p className="text-[9px] text-white/50 mt-0.5">
                          {modo === "vista" ? "pagamento único" : "sem juros"}
                        </p>
                      </div>
                    </div>

                    {podeResponder && (
                      <button
                        onClick={() => setContratoAberto(true)}
                        disabled={!pacote}
                        className="w-full mt-5 bg-[#B8935A] text-white rounded-full py-3.5 text-[11px] tracking-[0.16em] font-semibold disabled:opacity-40"
                      >
                        ACEITAR E ASSINAR DIGITALMENTE
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* 6 — QUEM SOMOS */}
            <section id={idDe(NAV[1])} className="scroll-mt-20 mt-16">
              <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">QUEM SOMOS</p>
              <h2 className="serif text-[34px] sm:text-[38px] leading-[1.15] font-medium mt-2">
                {inst?.stat_anos_experiencia
                  ? `${inst.stat_anos_experiencia} anos transformando SIM em arte`
                  : "Transformando SIM em arte"}
              </h2>
              {inst?.sobre_nos_texto && (
                <p className="text-[14px] leading-[1.7] text-[#6B5A4B] max-w-[620px] mt-4">
                  {inst.sobre_nos_texto}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 max-w-[420px] mt-6">
                <Stat valor={inst?.stat_eventos_realizados ? `${inst.stat_eventos_realizados}+` : "320+"} rotulo="CASAMENTOS" />
                <Stat valor="4.9★" rotulo="AVALIAÇÃO MÉDIA" />
              </div>
            </section>

            {/* 7 — O QUE ESTÁ INCLUSO */}
            <section id={idDe(NAV[2])} className="scroll-mt-20 mt-16">
              <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">O QUE ESTÁ INCLUSO</p>
              <h2 className="serif text-[34px] sm:text-[38px] leading-[1.15] font-medium mt-2">
                Tudo que acompanha vocês
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 mt-6">
                {INCLUSO_PADRAO.map((it, i) => {
                  const Icone = ICONES[i % ICONES.length];
                  const aberto = !!expandido[i];
                  return (
                    <div key={i} className="bg-white border border-[#E8DDD2] rounded-[20px] p-5">
                      <div className="w-10 h-10 rounded-full bg-[#F9F5F0] flex items-center justify-center">
                        <Icone size={18} className="text-[#B8935A]" />
                      </div>
                      <p className="serif text-[19px] font-semibold mt-3">{it.titulo}</p>
                      <p className="text-[12px] leading-[1.6] text-[#6B5A4B] mt-1.5">
                        {aberto ? it.longo : it.curto}
                      </p>
                      <button
                        onClick={() => setExpandido((p) => ({ ...p, [i]: !p[i] }))}
                        className="text-[10px] tracking-[0.16em] text-[#B8935A] mt-3"
                      >
                        {aberto ? "VER MENOS" : "VER DETALHES"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 8 — COMO FUNCIONA */}
            <section id={idDe(NAV[3])} className="scroll-mt-20 mt-16">
              <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">COMO FUNCIONA</p>
              <h2 className="serif text-[34px] sm:text-[38px] leading-[1.15] font-medium mt-2">
                Do “aceito a proposta” ao “aceito você”
              </h2>

              <div className="relative mt-8">
                <div className="hidden lg:block absolute top-[22px] left-[8%] right-[8%] h-px bg-[#E8DDD2]" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 relative">
                  {etapas.map((e, i) => (
                    <button key={i} onClick={() => setEtapaModal(i)} className="text-center group">
                      <div className="w-11 h-11 rounded-full bg-white border border-[#E8DDD2] mx-auto flex items-center justify-center serif font-bold text-[13px] group-hover:border-[#B8935A] transition-colors">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <p className="serif text-[15px] font-semibold mt-3 leading-tight">{e.titulo}</p>
                      {e.descricao && (
                        <p className="text-[11px] leading-[1.45] text-[#6B5A4B] mt-1.5">{e.descricao}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setProcessoModal(true)}
                className="mx-auto mt-8 block bg-white border border-[#E8DDD2] rounded-full px-6 py-3 text-[11px] tracking-[0.16em] hover:border-[#B8935A] transition-colors"
              >
                VER EXPLICAÇÃO COMPLETA DO PROCESSO
              </button>
            </section>

            {/* 9 — NO DIA DO CASAMENTO */}
            <section id={idDe(NAV[4])} className="scroll-mt-20 mt-16">
              <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">NO DIA DO CASAMENTO</p>
              <h2 className="serif text-[34px] sm:text-[38px] leading-[1.15] font-medium mt-2">
                Vocês vivem. A gente garante.
              </h2>

              <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr] mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(inst?.responsabilidades_dia_evento?.length
                    ? inst.responsabilidades_dia_evento.map((t) => ({ titulo: t, descricao: "" }))
                    : NO_DIA_PADRAO
                  ).map((c, i) => (
                    <div key={i} className="bg-white border border-[#E8DDD2] rounded-[16px] p-4">
                      <Check size={18} className="text-[#B8935A]" strokeWidth={2.4} />
                      <p className="text-[13px] font-semibold mt-2">{c.titulo}</p>
                      {c.descricao && <p className="text-[11px] text-[#6B5A4B] mt-0.5">{c.descricao}</p>}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                  {[0, 1].map((i) =>
                    fotos[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={fotos[i].url}
                        alt={fotos[i].legenda ?? ""}
                        loading="lazy"
                        className="w-full h-[140px] lg:h-[170px] object-cover rounded-[16px]"
                      />
                    ) : (
                      <div key={i} className="w-full h-[140px] lg:h-[170px] rounded-[16px] bg-[#E8DDD2]" />
                    )
                  )}
                </div>
              </div>
            </section>

            {/* 10 — EVENTOS + DEPOIMENTOS (banda escura) */}
            <section
              id={idDe(NAV[6])}
              className="scroll-mt-20 mt-16 bg-[#3C2415] text-white rounded-[28px] p-6 sm:p-10"
            >
              <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">EVENTOS REALIZADOS</p>
              <h2 className="serif text-[30px] sm:text-[34px] leading-[1.15] font-medium mt-2">
                Últimos casamentos assinados
              </h2>

              <div className="grid grid-cols-3 gap-3 mt-6">
                {[0, 1, 2].map((i) =>
                  fotos[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={fotos[i].url}
                      alt={fotos[i].legenda ?? ""}
                      loading="lazy"
                      className="w-full h-[110px] sm:h-[150px] object-cover rounded-[16px]"
                    />
                  ) : (
                    <div key={i} className="w-full h-[110px] sm:h-[150px] rounded-[16px] bg-white/10" />
                  )
                )}
              </div>

              <div id={idDe(NAV[7])} className="scroll-mt-20 mt-10">
                <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">DEPOIMENTOS</p>
                <div className="grid gap-4 sm:grid-cols-3 mt-4">
                  {depoimentos.map((d, i) => (
                    <div key={i} className="bg-white/[0.07] rounded-[18px] p-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#B8935A] flex items-center justify-center serif font-bold text-[13px]">
                          {d.autor.slice(0, 1).toUpperCase()}
                        </div>
                        <p className="text-[12px] font-semibold truncate">{d.autor}</p>
                      </div>
                      <p className="serif italic text-[14px] leading-[1.55] text-white/80 mt-3">“{d.texto}”</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 11 — PRÓXIMOS PASSOS */}
            <section id={idDe(NAV[8])} className="scroll-mt-20 mt-16 mb-8">
              <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">PRÓXIMOS PASSOS</p>
              <h2 className="serif text-[34px] sm:text-[38px] leading-[1.15] font-medium mt-2">Como fechamos?</h2>

              <div className="grid gap-4 sm:grid-cols-3 mt-6">
                {PROXIMOS_PASSOS.map((t, i) => (
                  <div key={i} className="bg-white border border-[#E8DDD2] rounded-[20px] p-5">
                    <div className="w-9 h-9 rounded-full bg-[#3C2415] text-white flex items-center justify-center serif font-bold text-[14px]">
                      {i + 1}
                    </div>
                    <p className="text-[12.5px] leading-[1.55] text-[#6B5A4B] mt-3">
                      {i === 1 ? `Pagamento da entrada ${cond.entrada}% para travar a data` : t}
                    </p>
                  </div>
                ))}
              </div>

              {podeResponder && pacotes.length > 0 && (
                <button
                  onClick={() => setContratoAberto(true)}
                  className="w-full sm:w-auto mt-8 bg-[#3C2415] text-white rounded-full px-12 py-4 text-[12px] tracking-[0.2em] font-semibold"
                >
                  ACEITAR PROPOSTA AGORA
                </button>
              )}

              {dados.status === "aprovado" && (
                <div className="mt-8 bg-white border border-[#E8DDD2] rounded-[20px] p-6">
                  <p className="serif text-[24px] font-semibold">Proposta aceita!</p>
                  <p className="text-[12.5px] text-[#6B5A4B] mt-1">
                    {dados.aceite?.recibo_codigo
                      ? `Recibo ${dados.aceite.recibo_codigo} · ${brl(Number(dados.aceite.valor_total))}`
                      : "Em breve entraremos em contato."}
                  </p>
                </div>
              )}

              {venceu && (
                <p className="mt-8 text-[12.5px] text-[#8B7355]">
                  Esta proposta expirou em {formatDateBR(dados.data_validade)}.
                </p>
              )}

              {dados.status === "aprovado" && !fichaEnviada && (
                <div className="mt-6">
                  <FichaCadastroAprovacao hash={hash} nomeInicial={dados.nome_contato} onConcluido={aposFicha} />
                </div>
              )}
            </section>

            <footer className="border-t border-[#E8DDD2] pt-6 pb-10 flex flex-wrap gap-3 justify-between text-[11px] text-[#8B7355]">
              <span className="tracking-[0.16em]">{dados.nome_empresa.toUpperCase()} • EVENTOS</span>
              <span>{[inst?.whatsapp_contato, inst?.email_contato].filter(Boolean).join(" · ")}</span>
              <a href={`/orcamento/${hash}/pdf`} className="underline">Baixar PDF</a>
            </footer>
          </div>
        </main>
      </div>

      {/* modal: uma etapa */}
      {etapaModal !== null && etapas[etapaModal] && (
        <Modal onFechar={() => setEtapaModal(null)}>
          <p className="text-[10px] tracking-[0.18em] text-[#B8935A]">
            ETAPA {String(etapaModal + 1).padStart(2, "0")}
          </p>
          <h3 className="serif text-[26px] font-semibold mt-1">{etapas[etapaModal].titulo}</h3>
          <p className="text-[13px] leading-[1.7] text-[#6B5A4B] mt-3">
            {etapas[etapaModal].texto_longo || etapas[etapaModal].descricao}
          </p>
        </Modal>
      )}

      {/* modal: processo completo */}
      {processoModal && (
        <Modal onFechar={() => setProcessoModal(false)} largo>
          <h3 className="serif text-[26px] font-semibold">O processo completo</h3>
          <div className="mt-5 space-y-5">
            {etapas.map((e, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-9 h-9 shrink-0 rounded-full bg-[#F9F5F0] border border-[#E8DDD2] flex items-center justify-center serif font-bold text-[12px]">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <p className="serif text-[17px] font-semibold">{e.titulo}</p>
                  <p className="text-[12.5px] leading-[1.65] text-[#6B5A4B] mt-1">
                    {e.texto_longo || e.descricao}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* modal: contrato + recibo */}
      {contratoAberto && pacote && (
        <ModalContrato
          hash={hash}
          pacote={pacote}
          convidados={convidados}
          extrasIds={extrasIds}
          modo={modo}
          parcelas={parcelas}
          total={calc.total}
          entrada={calc.entrada}
          parcela={calc.parcela}
          nomeContato={dados.nome_contato}
          whats={whats}
          onFechar={() => setContratoAberto(false)}
          onAceito={(recibo, valor) =>
            setDados((d) => ({
              ...d,
              status: "aprovado",
              respondido_em: new Date().toISOString(),
              aceite: {
                recibo_codigo: recibo,
                pacote_nome: pacote.nome,
                valor_total: valor,
                created_at: new Date().toISOString(),
              },
            }))
          }
        />
      )}
    </div>
  );
}

// ---------- peças ----------
function InfoCard({
  icone,
  rotulo,
  valor,
  sub,
}: {
  icone?: string;
  rotulo: string;
  valor: string;
  sub: string;
}) {
  return (
    <div className="bg-white border border-[#E8DDD2] rounded-[16px] p-4">
      <p className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] text-[#8B7355]">
        {icone && <span aria-hidden>{icone}</span>}
        {rotulo}
      </p>
      <p className="serif text-[17px] font-semibold mt-1">{valor}</p>
      {sub && <p className="text-[11px] text-[#8B7355]">{sub}</p>}
    </div>
  );
}

function Stat({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="bg-white border border-[#E8DDD2] rounded-[16px] p-5 text-center">
      <p className="serif text-[24px] font-semibold">{valor}</p>
      <p className="text-[10px] tracking-[0.14em] text-[#8B7355] mt-0.5">{rotulo}</p>
    </div>
  );
}

function Linha({ rotulo, valor, dourado }: { rotulo: string; valor: string; dourado?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="truncate">{rotulo}</span>
      <span className={`shrink-0 tabular-nums ${dourado ? "text-[#B8935A]" : ""}`}>{valor}</span>
    </div>
  );
}

function Modal({
  children,
  onFechar,
  largo,
}: {
  children: React.ReactNode;
  onFechar: () => void;
  largo?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onFechar}
    >
      <div
        className={`fade-up relative bg-[#FDFCFB] border border-[#E8DDD2] rounded-[24px] p-7 w-full my-auto ${
          largo ? "max-w-[620px]" : "max-w-[480px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onFechar} aria-label="Fechar" className="absolute right-4 top-4 text-[#8B7355]">
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

function ModalContrato({
  hash,
  pacote,
  convidados,
  extrasIds,
  modo,
  parcelas,
  total,
  entrada,
  parcela,
  nomeContato,
  whats,
  onFechar,
  onAceito,
}: {
  hash: string;
  pacote: { id: string; nome: string };
  convidados: number;
  extrasIds: string[];
  modo: "parcelado" | "vista";
  parcelas: number;
  total: number;
  entrada: number;
  parcela: number;
  nomeContato: string;
  whats: string | null;
  onFechar: () => void;
  onAceito: (recibo: string, valor: number) => void;
}) {
  const [noiva, setNoiva] = useState(nomeContato);
  const [noivo, setNoivo] = useState("");
  const [assA, setAssA] = useState<string | null>(null);
  const [assB, setAssB] = useState<string | null>(null);
  const [termos, setTermos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recibo, setRecibo] = useState<{ codigo: string; valor: number } | null>(null);

  // handoff: confirmar fica desabilitado até os dois nomes e o aceite dos termos
  const podeConfirmar = noiva.trim() !== "" && noivo.trim() !== "" && termos && !enviando;

  async function confirmar() {
    setErro(null);
    if (!assA) return setErro("A assinatura é obrigatória.");
    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("registrar_aceite_proposta", {
      p_hash: hash,
      p_pacote_id: pacote.id,
      p_convidados: convidados,
      p_extras_ids: extrasIds,
      p_forma_pagamento: modo,
      p_parcelas: modo === "vista" ? null : parcelas,
      p_nome_noiva: noiva.trim(),
      p_nome_noivo: noivo.trim() || null,
      p_assinatura_noiva: assA,
      p_assinatura_noivo: assB,
      p_observacoes: null,
    });
    setEnviando(false);
    const falha = error?.message ?? (data as { error?: string })?.error;
    if (falha) return setErro(typeof falha === "string" ? falha : "Não foi possível registrar.");
    const d = data as { recibo: string; valor_total: number };
    setRecibo({ codigo: d.recibo, valor: Number(d.valor_total) });
    onAceito(d.recibo, Number(d.valor_total));
  }

  const linkWhats =
    whats && recibo
      ? `https://wa.me/${whats}?text=${encodeURIComponent(
          `Olá! Somos ${noiva}${noivo ? ` e ${noivo}` : ""}. Aceitamos a proposta ${pacote.nome} — recibo ${recibo.codigo}, total ${brl(recibo.valor)}.`
        )}`
      : null;

  return (
    <Modal onFechar={onFechar}>
      {recibo ? (
        <>
          <div className="w-12 h-12 rounded-full bg-[#B8935A] flex items-center justify-center">
            <Check size={24} color="#fff" strokeWidth={2.6} />
          </div>
          <h3 className="serif text-[26px] font-semibold mt-4">Proposta aceita!</h3>
          <div className="bg-[#F9F5F0] border border-[#E8DDD2] rounded-[16px] p-4 mt-4">
            <p className="text-[10px] tracking-[0.18em] text-[#8B7355]">RECIBO</p>
            <p className="text-[20px] font-bold text-[#B8935A] tracking-wide">{recibo.codigo}</p>
            <p className="text-[12.5px] text-[#6B5A4B] mt-1.5">
              {pacote.nome} · {brl(recibo.valor)}
            </p>
            <p className="text-[11px] text-[#8B7355]">
              Assinado por {noiva}
              {noivo ? ` e ${noivo}` : ""}
            </p>
          </div>
          {linkWhats && (
            <a
              href={linkWhats}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center w-full mt-4 bg-[#25D366] text-white rounded-full py-3.5 text-[11px] tracking-[0.16em] font-semibold"
            >
              ENVIAR NO WHATSAPP
            </a>
          )}
          <button
            onClick={onFechar}
            className="w-full mt-2.5 border border-[#E8DDD2] rounded-full py-3 text-[11px] tracking-[0.16em]"
          >
            FECHAR
          </button>
        </>
      ) : (
        <>
          <h3 className="serif text-[26px] font-semibold pr-8">Aceitar e assinar</h3>
          <p className="text-[12.5px] text-[#6B5A4B] mt-1">
            {pacote.nome} · {convidados} convidados · <strong className="text-[#3C2415]">{brl(total)}</strong>
          </p>
          <p className="text-[11px] text-[#8B7355]">
            Entrada {brl(entrada)}
            {modo === "parcelado" ? ` + ${parcelas}x de ${brl(parcela)}` : " · pagamento à vista"}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 mt-5">
            <input
              value={noiva}
              onChange={(e) => setNoiva(e.target.value)}
              placeholder="Nome completo"
              className="bg-white border border-[#E8DDD2] rounded-full px-4 py-2.5 text-[13px]"
            />
            <input
              value={noivo}
              onChange={(e) => setNoivo(e.target.value)}
              placeholder="Nome completo do parceiro(a)"
              className="bg-white border border-[#E8DDD2] rounded-full px-4 py-2.5 text-[13px]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 mt-4">
            <AssinaturaCanvas rotulo="Assinatura" onChange={setAssA} />
            <AssinaturaCanvas rotulo="Assinatura parceiro(a)" onChange={setAssB} />
          </div>

          <label className="flex items-start gap-2.5 mt-4 text-[11.5px] text-[#6B5A4B] cursor-pointer">
            <input
              type="checkbox"
              checked={termos}
              onChange={(e) => setTermos(e.target.checked)}
              className="mt-0.5 accent-[#3C2415]"
            />
            Li e aceito as condições da proposta. A reserva da data se confirma com o pagamento da entrada.
          </label>

          {erro && <p className="text-[12px] text-red-600 mt-3">{erro}</p>}

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button onClick={onFechar} className="flex-1 border border-[#E8DDD2] rounded-full py-3 text-[11px] tracking-[0.16em]">
              CANCELAR
            </button>
            <button
              onClick={confirmar}
              disabled={!podeConfirmar}
              className="flex-1 bg-[#3C2415] text-white rounded-full py-3 text-[11px] tracking-[0.16em] font-semibold disabled:opacity-40"
            >
              {enviando ? "REGISTRANDO…" : "CONFIRMAR E ASSINAR"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
