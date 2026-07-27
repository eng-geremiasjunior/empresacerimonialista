"use client";

// Proposta pública — layout fiel à arte de referência
// (design/template-1). As medidas, pesos e cores vieram do DOM renderizado
// da arte, não de estimativa: eyebrow 11px/600 dourado, título de seção
// 38-40px Cormorant, cards brancos raio 16-20, pills raio total.
//
// Os textos autorais ("11 anos transformando SIM em arte") são fixos
// deste template de casamento, por decisão do produto.

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { criarEventoAPartirDoOrcamento } from "@/lib/orcamento-para-evento";
import { FichaCadastroAprovacao } from "@/components/orcamento-publico/FichaCadastroAprovacao";
import { Calculadora } from "@/components/orcamento-publico/Calculadora";
import { ModalAceite } from "@/components/orcamento-publico/ModalAceite";
import { formatBRL, formatDateBR } from "@/lib/orcamentos";
import { expirado, type OrcamentoPublicoData } from "@/lib/orcamento-publico";
import type { SelecaoProposta } from "@/lib/proposta";

const NAV = [
  { id: "apresentacao", label: "APRESENTAÇÃO" },
  { id: "investimento", label: "INVESTIMENTO" },
  { id: "quem-somos", label: "QUEM SOMOS" },
  { id: "como-funciona", label: "COMO FUNCIONA" },
  { id: "dia-evento", label: "NO DIA DO CASAMENTO" },
  { id: "eventos", label: "EVENTOS REALIZADOS" },
  { id: "depoimentos", label: "DEPOIMENTOS" },
  { id: "proximos-passos", label: "PRÓXIMOS PASSOS" },
];

// ---------- peças de tipografia da arte ----------
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-semibold uppercase tracking-[2px]"
      style={{ color: "var(--cor-acento)" }}
    >
      {children}
    </div>
  );
}

function TituloSecao({
  children,
  tamanho = 40,
}: {
  children: React.ReactNode;
  tamanho?: number;
}) {
  return (
    <h2
      className="mt-3 leading-[1.18] [font-family:var(--font-titulo)]"
      style={{ fontSize: tamanho, color: "var(--cor-texto-principal)", fontWeight: 400 }}
    >
      {children}
    </h2>
  );
}

function Pill({
  children,
  escuro,
}: {
  children: React.ReactNode;
  escuro?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[1px]"
      style={{
        background: escuro ? "var(--cor-escuro)" : "#FFFFFF",
        color: escuro ? "#FFFFFF" : "var(--cor-texto-principal)",
        border: escuro ? "none" : "1px solid var(--cor-borda)",
      }}
    >
      {children}
    </span>
  );
}

// ---------- contagem regressiva ----------
function BarraValidade({ diasRestantes }: { diasRestantes: number }) {
  const [t, setT] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    // Só começa no cliente: renderizar hora no servidor causaria mismatch
    // de hidratação, e a diferença apareceria como erro no console.
    const fim = Date.now() + diasRestantes * 86_400_000;
    const tick = () => {
      const resta = Math.max(0, fim - Date.now());
      setT({
        d: Math.floor(resta / 86_400_000),
        h: Math.floor((resta % 86_400_000) / 3_600_000),
        m: Math.floor((resta % 3_600_000) / 60_000),
        s: Math.floor((resta % 60_000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [diasRestantes]);

  const bloco = (v: number, u: string, ultimo?: boolean) => (
    <span
      className="rounded px-1.5 py-0.5 tabular-nums"
      style={{
        background: ultimo ? "var(--cor-acento)" : "rgba(255,255,255,0.1)",
        color: "#FFFFFF",
      }}
    >
      {v}
      {u}
    </span>
  );

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-[11px]"
      style={{ background: "var(--cor-escuro)", color: "var(--cor-fundo)" }}
    >
      <span className="font-medium uppercase tracking-[1.5px]">
        Proposta válida por:
      </span>
      <span className="flex items-center gap-1.5 [font-family:ui-monospace,monospace]">
        {t ? (
          <>
            {bloco(t.d, "d")}
            {bloco(t.h, "h")}
            {bloco(t.m, "m")}
            {bloco(t.s, "s", true)}
          </>
        ) : (
          bloco(diasRestantes, "d")
        )}
      </span>
    </div>
  );
}

// ---------- modal de detalhe da etapa ----------
function ModalEtapa({
  etapa,
  onFechar,
}: {
  etapa: { titulo: string; descricao: string | null; texto_longo?: string | null };
  onFechar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(60,36,21,0.55)" }}
      onClick={onFechar}
    >
      <div
        className="relative w-full max-w-[520px] rounded-2xl p-7"
        style={{ background: "var(--cor-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onFechar}
          aria-label="Fechar"
          className="absolute right-4 top-4"
          style={{ color: "var(--cor-texto-terciario)" }}
        >
          <X size={20} />
        </button>
        <h3
          className="pr-8 text-[26px] leading-tight [font-family:var(--font-titulo)]"
          style={{ color: "var(--cor-texto-principal)" }}
        >
          {etapa.titulo}
        </h3>
        <p
          className="mt-3 text-[14px] leading-[1.65]"
          style={{ color: "var(--cor-texto-secundario)" }}
        >
          {etapa.texto_longo || etapa.descricao}
        </p>
      </div>
    </div>
  );
}

export function PropostaV2({
  hash,
  inicial,
}: {
  hash: string;
  inicial: OrcamentoPublicoData;
}) {
  const [dados, setDados] = useState(inicial);
  const [fichaEnviada, setFichaEnviada] = useState(inicial.ficha_preenchida);
  const [modalAceite, setModalAceite] = useState(false);
  const [etapaAberta, setEtapaAberta] = useState<number | null>(null);
  const [ativa, setAtiva] = useState("apresentacao");
  const [progresso, setProgresso] = useState(0);
  const jaGerou = useRef(false);

  const venceu = expirado(dados);
  const podeResponder = dados.status === "enviado" && !venceu;

  const inst = dados.institucional;
  const pacotes = dados.pacotes ?? [];
  const extras = dados.extras ?? [];
  const etapas = dados.etapas ?? [];
  const fotos = dados.fotos ?? [];
  const depoimentos = dados.depoimentos ?? [];
  const itens = dados.itens ?? [];

  const regra = {
    inclusos: inst?.convidados_inclusos ?? 150,
    valorPorExtra: Number(inst?.valor_por_convidado_extra ?? 0),
    min: inst?.convidados_min ?? 50,
    max: inst?.convidados_max ?? 300,
  };
  const condicoes = {
    entradaPercentual: inst?.condicao_entrada_percentual ?? 30,
    parcelasMaximo: inst?.condicao_parcelas_maximo ?? 7,
    descontoAVista: inst?.condicao_desconto_a_vista_percentual ?? 5,
    prazoParcelasTexto: inst?.condicao_prazo_parcelas_texto ?? "",
  };

  const [selecao, setSelecao] = useState<SelecaoProposta>(() => ({
    pacote: pacotes.find((p) => p.recomendado) ?? pacotes[0] ?? null,
    convidados: dados.numero_convidados ?? regra.inclusos,
    extrasIds: [],
    formaPagamento: "parcelado",
    parcelas: Math.min(7, condicoes.parcelasMaximo || 7),
  }));

  const diasRestantes =
    dados.dias_restantes ??
    Math.max(0, Math.ceil((new Date(dados.data_validade).getTime() - Date.now()) / 86_400_000));

  const whats = inst?.whatsapp_contato?.replace(/\D/g, "") || null;
  const pacoteSel = selecao.pacote;

  // progresso de leitura + seção ativa
  useEffect(() => {
    const aoRolar = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setProgresso(total > 0 ? Math.min(100, (h.scrollTop / total) * 100) : 0);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();

    const obs = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) setAtiva(v.target.id);
      },
      { rootMargin: "-15% 0px -75% 0px" }
    );
    NAV.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", aoRolar);
      obs.disconnect();
    };
  }, []);

  // gera o evento depois da ficha (fluxo das Etapas 5/6, preservado)
  async function aposFicha() {
    setFichaEnviada(true);
    if (jaGerou.current) return;
    jaGerou.current = true;
    await criarEventoAPartirDoOrcamento(hash, dados.tipo_evento, dados.data_evento);
  }

  async function aceitarSemCalculadora() {
    const supabase = createClient();
    await supabase.rpc("responder_orcamento", { p_hash: hash, p_status: "aprovado" });
    setDados((d) => ({ ...d, status: "aprovado", respondido_em: new Date().toISOString() }));
  }

  const irPara = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ background: "var(--cor-fundo)", color: "var(--cor-texto-principal)" }}>
      {/* progresso de leitura */}
      <div
        className="fixed left-0 top-0 z-[60] h-[3px] transition-[width] duration-150"
        style={{ width: `${progresso}%`, background: "var(--cor-acento)" }}
      />

      <div className="flex min-h-screen">
        {/* ---------------- SIDEBAR ---------------- */}
        <aside
          className="fixed left-0 top-0 hidden h-screen w-[240px] flex-col justify-between overflow-y-auto px-5 py-8 lg:flex"
          style={{ background: "var(--cor-card)", borderRight: "1px solid var(--cor-borda)" }}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] font-bold [font-family:var(--font-titulo)]"
                style={{ border: "1px solid var(--cor-acento)", color: "var(--cor-acento)" }}
              >
                {dados.nome_empresa.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div
                  className="truncate text-[13px] font-semibold uppercase tracking-[1px] [font-family:var(--font-titulo)]"
                  style={{ color: "var(--cor-texto-principal)" }}
                >
                  {dados.nome_empresa}
                </div>
                <div className="text-[9px] tracking-[3px]" style={{ color: "var(--cor-texto-terciario)" }}>
                  EVENTOS
                </div>
              </div>
            </div>

            <nav className="mt-8 flex flex-col gap-0.5">
              {NAV.map((s) => {
                const atual = ativa === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => irPara(s.id)}
                    className="rounded-md px-3 py-2.5 text-left text-[11px] font-medium tracking-[0.5px] transition-colors"
                    style={{
                      background: atual ? "var(--cor-escuro)" : "transparent",
                      color: atual ? "#FFFFFF" : "var(--cor-texto-secundario)",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {whats && (
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--cor-fundo)" }}
            >
              <div
                className="text-[11px] font-semibold uppercase tracking-[1px]"
                style={{ color: "var(--cor-texto-principal)" }}
              >
                Dúvidas?
              </div>
              <p className="mt-1 text-[11px] leading-[1.5]" style={{ color: "var(--cor-texto-terciario)" }}>
                Fale direto com {dados.nome_empresa.split(" ")[0]}.
              </p>
              <a
                href={`https://wa.me/${whats}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[11px] font-semibold"
                style={{ background: "#FFFFFF", color: "var(--cor-texto-principal)" }}
              >
                <MessageCircle size={13} /> CHAMAR NO WHATS
              </a>
            </div>
          )}
        </aside>

        {/* ---------------- MAIN ---------------- */}
        <main className="min-w-0 flex-1 lg:ml-[240px]">
          {podeResponder && <BarraValidade diasRestantes={diasRestantes} />}

          {/* ---------- HERO ---------- */}
          <section id="apresentacao" className="scroll-mt-4 px-6 py-12 sm:px-12 lg:py-16">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <Pill>
                  <Sparkles size={12} style={{ color: "var(--cor-acento)" }} />
                  Proposta de assessoria completa
                </Pill>

                <h1
                  className="mt-6 leading-[0.95] [font-family:var(--font-titulo)]"
                  style={{ fontSize: "clamp(44px,7vw,80px)", color: "var(--cor-texto-principal)", fontWeight: 400 }}
                >
                  <span className="block text-[0.42em] tracking-[1px]" style={{ color: "var(--cor-texto-terciario)" }}>
                    Proposta de
                  </span>
                  {dados.nome_contato}
                  <span className="block text-[0.42em] italic" style={{ color: "var(--cor-acento)" }}>
                    assessoria
                  </span>
                </h1>

                <p
                  className="mt-6 max-w-[440px] text-[22px] italic leading-[1.4] [font-family:var(--font-titulo)]"
                  style={{ color: "var(--cor-texto-secundario)" }}
                >
                  “Transformamos sonhos em experiências inesquecíveis — com
                  tecnologia, afeto e método.”
                </p>

                <div className="mt-8 grid max-w-[440px] grid-cols-2 gap-4 sm:grid-cols-3">
                  <DadoHero
                    rotulo="Data"
                    valor={dados.data_evento ? formatDateBR(dados.data_evento) : "A definir"}
                  />
                  {dados.numero_convidados != null && (
                    <DadoHero rotulo="Convidados" valor={`${dados.numero_convidados} pessoas`} />
                  )}
                  {(dados.local_evento || dados.cidade_evento) && (
                    <DadoHero
                      rotulo="Local"
                      valor={dados.local_evento || dados.cidade_evento || ""}
                      sub={dados.local_evento ? dados.cidade_evento : null}
                    />
                  )}
                </div>

                <div
                  className="mt-8 max-w-[440px] rounded-[20px] p-6"
                  style={{ background: "#FFFFFF", boxShadow: "0 2px 14px rgba(60,36,21,0.06)" }}
                >
                  <p className="text-[14px] leading-[1.6]" style={{ color: "var(--cor-texto-secundario)" }}>
                    <strong style={{ color: "var(--cor-texto-principal)" }}>
                      Olá, {dados.nome_contato}!
                    </strong>{" "}
                    Preparamos esta experiência interativa para vocês montarem a
                    assessoria do jeito que sonharam.
                  </p>
                  {podeResponder && pacotes.length > 0 && (
                    <button
                      onClick={() => irPara("investimento")}
                      className="mt-4 flex items-center gap-2 rounded-full px-5 py-3 text-[12px] font-bold uppercase tracking-[1px] text-white"
                      style={{ background: "var(--cor-escuro)" }}
                    >
                      Montar minha proposta <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* card do pacote em destaque */}
              {pacoteSel && (
                <div
                  className="rounded-[32px] p-8"
                  style={{ background: "#FFFFFF", boxShadow: "0 18px 50px -28px rgba(60,36,21,0.45)" }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1.5px]"
                      style={{ color: "var(--cor-acento)" }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--cor-acento)" }} />
                      Ao vivo
                    </span>
                    {pacoteSel.recomendado && (
                      <span className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: "var(--cor-texto-terciario)" }}>
                        Mais escolhido
                      </span>
                    )}
                  </div>

                  <div className="mt-5 text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: "var(--cor-texto-terciario)" }}>
                    {pacoteSel.nome}
                  </div>
                  <div
                    className="mt-1 text-[46px] leading-none [font-family:var(--font-titulo)]"
                    style={{ color: "var(--cor-texto-principal)" }}
                  >
                    {formatBRL(Number(pacoteSel.preco))}
                  </div>
                  <div className="mt-1 text-[12px]" style={{ color: "var(--cor-texto-terciario)" }}>
                    pacote base · {selecao.convidados} convidados
                  </div>

                  <ul className="mt-6 space-y-2.5">
                    {pacoteSel.inclui.slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: "var(--cor-texto-secundario)" }}>
                        <Check size={14} strokeWidth={2.6} className="mt-0.5 flex-shrink-0" style={{ color: "var(--cor-acento)" }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {podeResponder && (
                    <button
                      onClick={() => irPara("investimento")}
                      className="mt-6 w-full rounded-full py-3.5 text-[12px] font-bold uppercase tracking-[1px] text-white"
                      style={{ background: "var(--cor-acento)" }}
                    >
                      Personalizar valores
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ---------- CALCULADORA ---------- */}
          {pacotes.length > 0 && (
            <section
              id="investimento"
              className="scroll-mt-4 px-6 py-14 sm:px-12"
              style={{ background: "#FFFFFF" }}
            >
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="max-w-[520px]">
                  <Eyebrow>Calculadora interativa</Eyebrow>
                  <TituloSecao>Invista no dia mais feliz da vida</TituloSecao>
                  <p className="mt-3 text-[14px] leading-[1.6]" style={{ color: "var(--cor-texto-secundario)" }}>
                    Escolha o pacote, ajuste os convidados e veja o valor na hora.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill>Até {condicoes.parcelasMaximo}x sem juros</Pill>
                  <Pill>{condicoes.descontoAVista}% desconto à vista</Pill>
                </div>
              </div>

              <div className="mt-10">
                <Calculadora
                  pacotes={pacotes}
                  extras={extras}
                  regra={regra}
                  condicoes={condicoes}
                  selecao={selecao}
                  onSelecao={setSelecao}
                  onAceitar={() => setModalAceite(true)}
                  podeAceitar={podeResponder}
                />
              </div>
            </section>
          )}

          {/* ---------- QUEM SOMOS ---------- */}
          <section id="quem-somos" className="scroll-mt-4 px-6 py-14 sm:px-12">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1fr]">
              <div>
                <Eyebrow>Quem somos</Eyebrow>
                <TituloSecao tamanho={38}>
                  {inst?.stat_anos_experiencia
                    ? `${inst.stat_anos_experiencia} anos transformando SIM em arte`
                    : "Transformando SIM em arte"}
                </TituloSecao>
                {inst?.sobre_nos_texto && (
                  <p className="mt-4 text-[14px] leading-[1.7]" style={{ color: "var(--cor-texto-secundario)" }}>
                    {inst.sobre_nos_texto}
                  </p>
                )}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {inst?.stat_eventos_realizados ? (
                    <StatCard valor={`${inst.stat_eventos_realizados}+`} rotulo="Casamentos" />
                  ) : null}
                  <StatCard valor="4.9★" rotulo="Avaliação média" />
                </div>
              </div>

              {itens.length > 0 && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3
                      className="text-[28px] [font-family:var(--font-titulo)]"
                      style={{ color: "var(--cor-texto-principal)", fontWeight: 400 }}
                    >
                      O que está incluso
                    </h3>
                    <span
                      className="rounded-full px-3.5 py-1.5 text-[11px]"
                      style={{ background: "var(--cor-fundo)", color: "var(--cor-texto-secundario)" }}
                    >
                      {itens.length} itens
                      {pacoteSel ? ` · pacote ${pacoteSel.nome}` : ""}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {itens.slice(0, 6).map((it, i) => (
                      <div
                        key={i}
                        className="rounded-[20px] p-5 transition-transform duration-200 hover:-translate-y-0.5"
                        style={{ background: "#FFFFFF", boxShadow: "0 2px 12px rgba(60,36,21,0.05)" }}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full"
                          style={{ background: "var(--cor-fundo)" }}
                        >
                          <Sparkles size={18} style={{ color: "var(--cor-acento)" }} />
                        </div>
                        <div
                          className="mt-3 text-[18px] font-semibold [font-family:var(--font-titulo)]"
                          style={{ color: "var(--cor-texto-principal)" }}
                        >
                          {it.nome}
                        </div>
                        {it.descricao && (
                          <p className="mt-1.5 text-[12px] leading-[1.6]" style={{ color: "var(--cor-texto-secundario)" }}>
                            {it.descricao}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ---------- COMO FUNCIONA ---------- */}
          {etapas.length > 0 && (
            <section
              id="como-funciona"
              className="scroll-mt-4 px-6 py-14 sm:px-12"
              style={{ background: "var(--cor-card)" }}
            >
              <div className="max-w-[420px]">
                <Eyebrow>Como funciona</Eyebrow>
                <TituloSecao>Do “aceito a proposta” ao “aceito você”</TituloSecao>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {etapas.map((e, i) => (
                  <button
                    key={i}
                    onClick={() => setEtapaAberta(i)}
                    className="rounded-2xl p-4 text-left transition-transform duration-200 hover:-translate-y-1"
                    style={{ background: "var(--cor-fundo)" }}
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-bold [font-family:var(--font-titulo)]"
                      style={{ background: "#FFFFFF", color: "var(--cor-texto-principal)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div
                      className="mt-3 text-[16px] font-semibold leading-tight [font-family:var(--font-titulo)]"
                      style={{ color: "var(--cor-texto-principal)" }}
                    >
                      {e.titulo}
                    </div>
                    {e.descricao && (
                      <p className="mt-2 text-[12px] leading-[1.5]" style={{ color: "var(--cor-texto-secundario)" }}>
                        {e.descricao}
                      </p>
                    )}
                    <span
                      className="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[1px]"
                      style={{ color: "var(--cor-acento)" }}
                    >
                      Clique para detalhes <ChevronRight size={11} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ---------- NO DIA ---------- */}
          {(inst?.responsabilidades_dia_evento?.length ?? 0) > 0 && (
            <section id="dia-evento" className="scroll-mt-4 px-6 py-14 sm:px-12">
              <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
                <div>
                  <Eyebrow>No dia do casamento</Eyebrow>
                  <TituloSecao>Vocês vivem. A gente garante.</TituloSecao>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {inst!.responsabilidades_dia_evento.map((r, i) => (
                      <div
                        key={i}
                        className="rounded-2xl p-5"
                        style={{ background: "#FFFFFF", boxShadow: "0 2px 12px rgba(60,36,21,0.05)" }}
                      >
                        <Check size={20} strokeWidth={2.2} style={{ color: "var(--cor-acento)" }} />
                        <div
                          className="mt-2.5 text-[13px] font-semibold"
                          style={{ color: "var(--cor-texto-principal)" }}
                        >
                          {r}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {fotos[0] && (
                  <div
                    className="hidden min-h-[320px] rounded-[24px] bg-cover bg-center lg:block"
                    style={{ backgroundImage: `url(${fotos[0].url})`, backgroundColor: "var(--cor-placeholder)" }}
                  />
                )}
              </div>
            </section>
          )}

          {/* ---------- EVENTOS REALIZADOS (fundo escuro) ---------- */}
          {fotos.length > 0 && (
            <section
              id="eventos"
              className="scroll-mt-4 px-6 py-14 sm:px-12"
              style={{ background: "var(--cor-escuro)" }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: "var(--cor-acento)" }}>
                Eventos realizados
              </div>
              <h2
                className="mt-3 text-[38px] leading-[1.15] text-white [font-family:var(--font-titulo)]"
                style={{ fontWeight: 400 }}
              >
                Últimos casamentos assinados
              </h2>

              <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {fotos.slice(0, 8).map((f, i) => (
                  <figure key={i} className="overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.url}
                      alt={f.legenda ?? `Evento ${i + 1}`}
                      loading="lazy"
                      className="h-[150px] w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    {f.legenda && (
                      <figcaption className="mt-2 text-[11px] uppercase tracking-[1px] text-white/60">
                        {f.legenda}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* ---------- DEPOIMENTOS ---------- */}
          {depoimentos.length > 0 && (
            <section id="depoimentos" className="scroll-mt-4 px-6 py-14 sm:px-12">
              <Eyebrow>Depoimentos reais</Eyebrow>
              <TituloSecao tamanho={38}>Quem já viveu com a gente</TituloSecao>

              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {depoimentos.map((d, i) => (
                  <div
                    key={i}
                    className="rounded-[20px] p-6"
                    style={{ background: "#FFFFFF", boxShadow: "0 2px 12px rgba(60,36,21,0.05)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold [font-family:var(--font-titulo)]"
                        style={{ background: "var(--cor-fundo)", color: "var(--cor-acento)" }}
                      >
                        {d.autor.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold" style={{ color: "var(--cor-texto-principal)" }}>
                          {d.autor}
                        </div>
                        {d.contexto && (
                          <div className="truncate text-[11px]" style={{ color: "var(--cor-texto-terciario)" }}>
                            {d.contexto}
                          </div>
                        )}
                      </div>
                    </div>
                    <p
                      className="mt-4 text-[14px] italic leading-[1.6] [font-family:var(--font-titulo)]"
                      style={{ color: "var(--cor-texto-secundario)" }}
                    >
                      “{d.texto}”
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---------- PRÓXIMOS PASSOS ---------- */}
          <section id="proximos-passos" className="scroll-mt-4 px-6 py-14 sm:px-12">
            <div className="max-w-[420px]">
              <Eyebrow>Próximos passos</Eyebrow>
              <TituloSecao>Como fechamos?</TituloSecao>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                "Aceite a proposta e assine digitalmente",
                `Pagamento da entrada ${condicoes.entradaPercentual}% para travar a data`,
                "Onboarding e início do planejamento",
              ].map((t, i) => (
                <div
                  key={i}
                  className="rounded-[20px] p-6"
                  style={{ background: "#FFFFFF", boxShadow: "0 2px 12px rgba(60,36,21,0.05)" }}
                >
                  <div
                    className="text-[30px] leading-none [font-family:var(--font-titulo)]"
                    style={{ color: "var(--cor-acento)" }}
                  >
                    {i + 1}
                  </div>
                  <p className="mt-3 text-[13px] leading-[1.55]" style={{ color: "var(--cor-texto-secundario)" }}>
                    {t}
                  </p>
                </div>
              ))}
            </div>

            {/* estado / ações */}
            <div className="mt-10">
              {podeResponder ? (
                <button
                  onClick={() => (pacotes.length > 0 ? setModalAceite(true) : aceitarSemCalculadora())}
                  className="w-full rounded-full py-5 text-[13px] font-bold uppercase tracking-[2px] text-white sm:w-auto sm:px-16"
                  style={{ background: "var(--cor-escuro)" }}
                >
                  Aceitar proposta agora
                </button>
              ) : dados.status === "aprovado" ? (
                <div
                  className="rounded-[20px] p-6"
                  style={{ background: "var(--cor-fundo-destaque)" }}
                >
                  <div
                    className="text-[22px] [font-family:var(--font-titulo)]"
                    style={{ color: "var(--cor-acento)" }}
                  >
                    Proposta aceita!
                  </div>
                  <p className="mt-1 text-[13px]" style={{ color: "var(--cor-texto-secundario)" }}>
                    {dados.aceite?.recibo_codigo
                      ? `Recibo ${dados.aceite.recibo_codigo} · ${formatBRL(Number(dados.aceite.valor_total))}`
                      : "Em breve entraremos em contato."}
                  </p>
                </div>
              ) : venceu ? (
                <p className="text-[13px]" style={{ color: "var(--cor-texto-terciario)" }}>
                  Esta proposta expirou em {formatDateBR(dados.data_validade)}.
                </p>
              ) : null}

              {dados.status === "aprovado" && !fichaEnviada && (
                <div className="mt-6">
                  <FichaCadastroAprovacao
                    hash={hash}
                    nomeInicial={dados.nome_contato}
                    onConcluido={aposFicha}
                  />
                </div>
              )}
            </div>
          </section>

          <footer
            className="px-6 py-8 text-[11px] sm:px-12"
            style={{ borderTop: "1px solid var(--cor-borda)", color: "var(--cor-texto-terciario)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="uppercase tracking-[1.5px]">
                {dados.nome_empresa} · Eventos
              </span>
              <span>
                {[inst?.whatsapp_contato, inst?.email_contato].filter(Boolean).join(" · ")}
              </span>
              <a href={`/orcamento/${hash}/pdf`} className="underline">
                Baixar PDF
              </a>
            </div>
          </footer>
        </main>
      </div>

      {etapaAberta !== null && etapas[etapaAberta] && (
        <ModalEtapa etapa={etapas[etapaAberta]} onFechar={() => setEtapaAberta(null)} />
      )}

      {modalAceite && selecao.pacote && (
        <ModalAceite
          hash={hash}
          selecao={selecao}
          extras={extras}
          regra={regra}
          condicoes={condicoes}
          nomeContato={dados.nome_contato}
          whatsapp={inst?.whatsapp_contato ?? null}
          nomeEmpresa={dados.nome_empresa}
          onFechar={() => setModalAceite(false)}
          onAceito={() =>
            setDados((d) => ({ ...d, status: "aprovado", respondido_em: new Date().toISOString() }))
          }
        />
      )}
    </div>
  );
}

function DadoHero({
  rotulo,
  valor,
  sub,
}: {
  rotulo: string;
  valor: string;
  sub?: string | null;
}) {
  return (
    <div>
      <div
        className="text-[10px] font-semibold uppercase tracking-[1.5px]"
        style={{ color: "var(--cor-acento)" }}
      >
        {rotulo}
      </div>
      <div className="mt-1 text-[14px] font-semibold" style={{ color: "var(--cor-texto-principal)" }}>
        {valor}
      </div>
      {sub && (
        <div className="text-[11px]" style={{ color: "var(--cor-texto-terciario)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function StatCard({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div
      className="rounded-2xl px-5 py-5 text-center"
      style={{ background: "#FFFFFF", boxShadow: "0 2px 12px rgba(60,36,21,0.05)" }}
    >
      <div
        className="text-[22px] font-semibold [font-family:var(--font-titulo)]"
        style={{ color: "var(--cor-texto-principal)" }}
      >
        {valor}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[1px]" style={{ color: "var(--cor-texto-terciario)" }}>
        {rotulo}
      </div>
    </div>
  );
}
