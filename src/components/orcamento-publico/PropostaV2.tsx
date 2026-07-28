"use client";

// Proposta pública.
//
// O TOPO (sidebar, contador, hero, cards de dados, calculadora, card de
// aceite e imagem lateral) reproduz classe a classe o design/template-1/
// page.tsx — larguras, raios, sombras e cores literais vieram de lá e não
// devem ser "arrumados": são a arte.
//
// As seções seguintes (quem somos, como funciona, no dia, eventos,
// depoimentos, próximos passos) vieram do DOM da arte HTML, porque o
// page.tsx cobre só o topo.
//
// O que mudou em relação ao arquivo de referência, e por quê:
//  * nome do casal vem do cadastro, não é contentEditable — senão a
//    proposta diverge do contrato assinado;
//  * o código KD-XXXX é gerado no banco (unique), não com Math.random()
//    no render, que trocava o ID a cada re-render;
//  * preços, convidados e extras vêm do Supabase, não hard-coded.

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { criarEventoAPartirDoOrcamento } from "@/lib/orcamento-para-evento";
import { FichaCadastroAprovacao } from "@/components/orcamento-publico/FichaCadastroAprovacao";
import { AssinaturaCanvas } from "@/components/orcamento-publico/AssinaturaCanvas";
import { formatDateBR } from "@/lib/orcamentos";
import { expirado, type OrcamentoPublicoData } from "@/lib/orcamento-publico";
import { calcularProposta, type SelecaoProposta } from "@/lib/proposta";

const NAV = [
  { id: "apresentacao", label: "APRESENTAÇÃO" },
  { id: "quem-somos", label: "QUEM SOMOS" },
  { id: "incluso", label: "O QUE ESTÁ INCLUSO" },
  { id: "como-funciona", label: "COMO FUNCIONA" },
  { id: "dia-evento", label: "NO DIA DO CASAMENTO" },
  { id: "investimento", label: "INVESTIMENTO" },
  { id: "eventos", label: "EVENTOS REALIZADOS" },
  { id: "depoimentos", label: "DEPOIMENTOS" },
  { id: "proximos-passos", label: "PRÓXIMOS PASSOS" },
];

const brl = (v: number) =>
  `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export function PropostaV2({
  hash,
  inicial,
}: {
  hash: string;
  inicial: OrcamentoPublicoData;
}) {
  const [dados, setDados] = useState(inicial);
  const [fichaEnviada, setFichaEnviada] = useState(inicial.ficha_preenchida);
  const [showAccept, setShowAccept] = useState(false);
  const [ativa, setAtiva] = useState("apresentacao");
  const [etapaAberta, setEtapaAberta] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
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

  const valores = calcularProposta(selecao, extras, regra, condicoes);
  const diasRestantes =
    dados.dias_restantes ??
    Math.max(0, Math.ceil((new Date(dados.data_validade).getTime() - Date.now()) / 86_400_000));

  const whats = inst?.whatsapp_contato?.replace(/\D/g, "") || null;

  // Contador só no cliente: hora renderizada no servidor daria mismatch.
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

  useEffect(() => {
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
    return () => obs.disconnect();
  }, []);

  async function aposFicha() {
    setFichaEnviada(true);
    if (jaGerou.current) return;
    jaGerou.current = true;
    await criarEventoAPartirDoOrcamento(hash, dados.tipo_evento, dados.data_evento);
  }

  const irPara = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const dataFmt = dados.data_evento ? formatDateBR(dados.data_evento) : "A definir";

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex">
      <style>{`
        .serif{font-family:var(--font-titulo),serif}
        @keyframes pulse-gold{0%,100%{box-shadow:0 0 0 0 rgba(184,147,90,.5)}50%{box-shadow:0 0 0 12px rgba(184,147,90,0)}}
        .pulse{animation:pulse-gold 2.2s infinite}
      `}</style>

      {/* SIDEBAR 240px */}
      <aside className="hidden lg:flex w-[240px] shrink-0 bg-[#FFFCF8] border-r border-[#E8DDD2] p-6 flex-col sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full border border-[#3C2415] flex items-center justify-center serif font-bold text-[#3C2415] shrink-0">
            {dados.nome_empresa.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] tracking-[0.2em] font-semibold text-[#3C2415] leading-none truncate">
              {dados.nome_empresa.toUpperCase()}
            </p>
            <p className="text-[9px] tracking-[0.18em] text-[#8B7355] mt-1">EVENTOS</p>
          </div>
        </div>
        <div className="h-[1px] bg-gradient-to-r from-[#E8DDD2] via-[#B8935A]/40 to-[#E8DDD2] mb-6" />
        <nav className="space-y-1">
          {NAV.map((i) =>
            ativa === i.id ? (
              <button
                key={i.id}
                onClick={() => irPara(i.id)}
                className="w-full bg-[#3C2415] text-white px-4 py-2.5 rounded-full text-[11px] tracking-widest flex justify-between items-center"
              >
                {i.label} <span className="w-1.5 h-1.5 bg-[#B8935A] rounded-full" />
              </button>
            ) : (
              <button
                key={i.id}
                onClick={() => irPara(i.id)}
                className="w-full text-left px-4 py-2 text-[11px] tracking-[0.12em] text-[#6B5A4B] hover:text-[#3C2415]"
              >
                {i.label}
              </button>
            )
          )}
        </nav>
        {whats && (
          <div className="mt-auto bg-[#F9F5F0] border border-[#E8DDD2] rounded-[20px] p-4">
            <p className="text-[11px] tracking-widest font-semibold text-[#3C2415]">💬 DÚVIDAS?</p>
            <p className="text-[11px] text-[#6B5A4B] mt-1 leading-[1.4]">
              Fale direto com {dados.nome_empresa.split(" ")[0]}. Resposta em até 2h.
            </p>
            <a
              href={`https://wa.me/${whats}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center w-full mt-3 border border-[#E8DDD2] bg-white rounded-full py-2 text-[11px] tracking-widest text-[#3C2415]"
            >
              CHAMAR NO WHATS
            </a>
          </div>
        )}
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0">
        {podeResponder && (
          <div className="bg-[#3C2415] text-white flex flex-wrap items-center justify-center gap-3 py-2.5 text-[11px] tracking-widest sticky top-0 z-20">
            <span className="text-[#B8935A]">◷</span> PROPOSTA VÁLIDA POR:
            <div className="flex gap-2 font-mono">
              <span className="bg-white/10 px-2 py-0.5 rounded">{countdown?.d ?? diasRestantes}d</span>
              <span className="bg-white/10 px-2 py-0.5 rounded">{String(countdown?.h ?? 0).padStart(2, "0")}h</span>
              <span className="bg-white/10 px-2 py-0.5 rounded">{String(countdown?.m ?? 0).padStart(2, "0")}m</span>
              <span className="bg-white/10 px-2 py-0.5 rounded">{String(countdown?.s ?? 0).padStart(2, "0")}s</span>
            </div>
          </div>
        )}

        <div className="flex">
          <div className="flex-1 min-w-0 p-6 sm:p-10 max-w-[720px]">
            {/* ---------- HERO ---------- */}
            <section id="apresentacao" className="scroll-mt-16">
              <div className="inline-flex bg-white border border-[#E8DDD2] rounded-full px-3 py-1 text-[10px] tracking-widest text-[#6B5A4B] mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mt-[2px] mr-2" /> PROPOSTA DE ASSESSORIA COMPLETA • V2.0 INTERATIVA
              </div>

              <h1 className="serif text-[46px] sm:text-[80px] leading-[0.9] tracking-[-0.02em] text-[#3C2415] font-bold">
                Proposta de<br />
                {dados.nome_contato}
                <span className="flex items-center gap-3 mt-2">
                  <span className="text-[#B8935A] text-[36px]">♥</span>
                  <span className="font-light text-[48px]">assessoria</span>
                </span>
              </h1>

              <p className="serif italic text-[18px] leading-[1.4] text-[#6B5A4B] my-8">
                “Transformamos sonhos em experiências inesquecíveis — com tecnologia, afeto e método.”
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                <div className="bg-white border border-[#E8DDD2] rounded-[16px] p-4">
                  <p className="text-[10px] tracking-widest text-[#8B7355]">DATA</p>
                  <p className="serif font-semibold text-[#3C2415] mt-1">{dataFmt}</p>
                  <p className="text-[11px] text-[#8B7355]">Data do evento</p>
                </div>
                <div className="bg-white border border-[#E8DDD2] rounded-[16px] p-4">
                  <p className="text-[10px] tracking-widest text-[#8B7355]">CONVIDADOS</p>
                  <p className="serif font-semibold text-[#3C2415] mt-1">{selecao.convidados} pessoas</p>
                  <p className="text-[11px] text-[#8B7355]">Estimativa</p>
                </div>
                <div className="bg-white border border-[#E8DDD2] rounded-[16px] p-4">
                  <p className="text-[10px] tracking-widest text-[#8B7355]">LOCAL</p>
                  <p className="serif font-semibold text-[#3C2415] mt-1">
                    {dados.local_evento || dados.cidade_evento || "A definir"}
                  </p>
                  <p className="text-[11px] text-[#8B7355]">{dados.cidade_evento || " "}</p>
                </div>
              </div>
            </section>

            {/* ---------- CALCULADORA ---------- */}
            {pacotes.length > 0 && (
              <section id="investimento" className="scroll-mt-16">
                <div className="bg-white border border-[#E8DDD2] rounded-[24px] p-6 shadow-[0_10px_40px_-15px_rgba(60,36,21,0.15)]">
                  <h3 className="text-[11px] tracking-[0.2em] font-semibold text-[#3C2415] mb-4">
                    INVESTIMENTO • CALCULADORA AO VIVO
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {pacotes.map((p) => {
                      const sel = selecao.pacote?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelecao({ ...selecao, pacote: p })}
                          className={`text-left border-2 rounded-[16px] p-4 cursor-pointer relative transition-all ${
                            sel
                              ? "border-[#3C2415] bg-[#FFFCF8] scale-[1.02]"
                              : "border-[#E8DDD2] hover:border-[#B8935A]/50"
                          } ${p.recomendado && sel ? "pulse" : ""}`}
                        >
                          {p.recomendado && (
                            <div className="absolute -top-3 left-3 bg-[#B8935A] text-white text-[9px] tracking-widest px-2.5 py-1 rounded-full">
                              {p.subtitulo || "MAIS ESCOLHIDO"}
                            </div>
                          )}
                          <p className="text-[10px] tracking-widest text-[#6B5A4B] mt-1">{p.nome}</p>
                          <p className="serif text-[22px] font-bold text-[#3C2415]">{brl(p.preco)}</p>
                          <ul className="mt-2 space-y-1">
                            {p.inclui.slice(0, 2).map((f, i) => (
                              <li key={i} className="text-[10px] text-[#6B5A4B] leading-[1.3]">• {f}</li>
                            ))}
                          </ul>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mb-5">
                    <div className="flex justify-between text-[11px] text-[#6B5A4B] mb-2">
                      <span>Convidados: {selecao.convidados}</span>
                      <span>{regra.min} a {regra.max}</span>
                    </div>
                    <input
                      type="range"
                      min={regra.min}
                      max={regra.max}
                      value={selecao.convidados}
                      onChange={(e) => setSelecao({ ...selecao, convidados: Number(e.target.value) })}
                      aria-label="Número de convidados"
                      className="w-full accent-[#3C2415] h-1"
                    />
                  </div>

                  {extras.length > 0 && (
                    <div className="space-y-2 mb-5">
                      {extras.map((x) => {
                        const marcado = selecao.extrasIds.includes(x.id);
                        return (
                          <label
                            key={x.id}
                            className="flex items-center justify-between border border-[#E8DDD2] rounded-full px-4 py-2.5 text-[12px] cursor-pointer hover:border-[#B8935A]/50"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={marcado}
                                onChange={(e) =>
                                  setSelecao({
                                    ...selecao,
                                    extrasIds: e.target.checked
                                      ? [...selecao.extrasIds, x.id]
                                      : selecao.extrasIds.filter((id) => id !== x.id),
                                  })
                                }
                                className="accent-[#3C2415]"
                              />
                              <span className="truncate">{x.nome}</span>
                            </span>
                            <span className="text-[#B8935A] font-medium shrink-0">+{brl(x.preco)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div className="bg-[#3C2415] text-white rounded-[16px] p-4 flex flex-wrap gap-3 justify-between items-center">
                    <div>
                      <p className="text-[10px] tracking-widest text-white/60">TOTAL AO VIVO</p>
                      <p className="serif text-[28px] font-bold leading-none mt-1">{brl(valores.total)}</p>
                    </div>
                    <div className="text-right text-[11px] text-white/70 leading-[1.4]">
                      <p>até {condicoes.parcelasMaximo}x sem juros</p>
                      <p>
                        {condicoes.descontoAVista}% à vista:{" "}
                        {brl(valores.subtotal * (1 - condicoes.descontoAVista / 100))}
                      </p>
                    </div>
                  </div>
                </div>

                {podeResponder && (
                  <div className="mt-6 bg-white border border-[#E8DDD2] rounded-[20px] p-5 flex flex-wrap gap-4 items-center shadow-[0_10px_40px_-15px_rgba(60,36,21,0.1)]">
                    <div className="w-10 h-10 rounded-full bg-[#3C2415] text-white flex items-center justify-center font-bold shrink-0">
                      {dados.nome_empresa.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-[13px] text-[#4A3728] leading-[1.4]">
                        Olá, {dados.nome_contato}! Preparamos esta experiência interativa só
                        para vocês. Escolham o pacote e calculem o investimento ao vivo.
                      </p>
                      <p className="text-[11px] text-[#8B7355] mt-1">
                        Proposta com assinatura digital
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAccept(true)}
                      disabled={!selecao.pacote}
                      className="shrink-0 bg-[#3C2415] text-white rounded-full px-5 py-3 text-[11px] tracking-widest hover:bg-[#4A3728] disabled:opacity-40"
                    >
                      ACEITAR PROPOSTA →
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* ---------- QUEM SOMOS ---------- */}
            <section id="quem-somos" className="scroll-mt-16 mt-14">
              <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">QUEM SOMOS</p>
              <h2 className="serif text-[38px] leading-[1.15] text-[#3C2415] font-bold mt-3">
                {inst?.stat_anos_experiencia
                  ? `${inst.stat_anos_experiencia} anos transformando SIM em arte`
                  : "Transformando SIM em arte"}
              </h2>
              {inst?.sobre_nos_texto && (
                <p className="text-[14px] leading-[1.7] text-[#6B5A4B] mt-4">{inst.sobre_nos_texto}</p>
              )}
              <div className="grid grid-cols-2 gap-3 mt-6">
                {inst?.stat_eventos_realizados ? (
                  <div className="bg-white border border-[#E8DDD2] rounded-[16px] p-4 text-center">
                    <p className="serif text-[22px] font-bold text-[#3C2415]">{inst.stat_eventos_realizados}+</p>
                    <p className="text-[10px] tracking-widest text-[#8B7355]">CASAMENTOS</p>
                  </div>
                ) : null}
                <div className="bg-white border border-[#E8DDD2] rounded-[16px] p-4 text-center">
                  <p className="serif text-[22px] font-bold text-[#3C2415]">
                    {inst?.stat_dedicacao_percentual ?? 100}%
                  </p>
                  <p className="text-[10px] tracking-widest text-[#8B7355]">DEDICAÇÃO</p>
                </div>
              </div>
            </section>

            {/* ---------- O QUE ESTÁ INCLUSO ---------- */}
            {itens.length > 0 && (
              <section id="incluso" className="scroll-mt-16 mt-14">
                <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">O QUE ESTÁ INCLUSO</p>
                <h2 className="serif text-[38px] leading-[1.15] text-[#3C2415] font-bold mt-3">
                  Tudo que acompanha vocês
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                  {itens.map((it, i) => (
                    <div key={i} className="bg-white border border-[#E8DDD2] rounded-[16px] p-4">
                      <p className="serif text-[18px] font-semibold text-[#3C2415]">{it.nome}</p>
                      {it.descricao && (
                        <p className="text-[12px] text-[#6B5A4B] leading-[1.5] mt-1">{it.descricao}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ---------- COMO FUNCIONA ---------- */}
            {etapas.length > 0 && (
              <section id="como-funciona" className="scroll-mt-16 mt-14">
                <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">COMO FUNCIONA</p>
                <h2 className="serif text-[38px] leading-[1.15] text-[#3C2415] font-bold mt-3">
                  Do “aceito a proposta” ao “aceito você”
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                  {etapas.map((e, i) => (
                    <button
                      key={i}
                      onClick={() => setEtapaAberta(i)}
                      className="text-left bg-white border border-[#E8DDD2] rounded-[16px] p-4 hover:border-[#B8935A]/50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#F9F5F0] flex items-center justify-center serif font-bold text-[13px] text-[#3C2415]">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <p className="serif text-[16px] font-semibold text-[#3C2415] mt-2 leading-tight">{e.titulo}</p>
                      {e.descricao && (
                        <p className="text-[11px] text-[#6B5A4B] leading-[1.4] mt-1">{e.descricao}</p>
                      )}
                      <p className="text-[10px] tracking-widest text-[#B8935A] mt-2">CLIQUE PARA DETALHES →</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ---------- NO DIA ---------- */}
            {(inst?.responsabilidades_dia_evento?.length ?? 0) > 0 && (
              <section id="dia-evento" className="scroll-mt-16 mt-14">
                <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">NO DIA DO CASAMENTO</p>
                <h2 className="serif text-[38px] leading-[1.15] text-[#3C2415] font-bold mt-3">
                  Vocês vivem. A gente garante.
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                  {inst!.responsabilidades_dia_evento.map((r, i) => (
                    <div key={i} className="bg-white border border-[#E8DDD2] rounded-[16px] p-4 flex gap-3">
                      <span className="text-[#B8935A] shrink-0">✓</span>
                      <p className="text-[13px] text-[#4A3728] leading-[1.4]">{r}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ---------- EVENTOS REALIZADOS ---------- */}
            {fotos.length > 0 && (
              <section id="eventos" className="scroll-mt-16 mt-14 bg-[#3C2415] rounded-[24px] p-6">
                <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">EVENTOS REALIZADOS</p>
                <h2 className="serif text-[32px] leading-[1.15] text-white font-bold mt-3">
                  Últimos casamentos assinados
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  {fotos.slice(0, 8).map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={f.url}
                      alt={f.legenda ?? `Evento ${i + 1}`}
                      loading="lazy"
                      className="w-full h-[120px] object-cover rounded-[16px]"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ---------- DEPOIMENTOS ---------- */}
            {depoimentos.length > 0 && (
              <section id="depoimentos" className="scroll-mt-16 mt-14">
                <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">DEPOIMENTOS</p>
                <h2 className="serif text-[38px] leading-[1.15] text-[#3C2415] font-bold mt-3">
                  Quem já viveu com a gente
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                  {depoimentos.map((d, i) => (
                    <div key={i} className="bg-white border border-[#E8DDD2] rounded-[16px] p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#F9F5F0] flex items-center justify-center serif font-bold text-[#B8935A]">
                          {d.autor.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#3C2415] truncate">{d.autor}</p>
                          {d.contexto && <p className="text-[11px] text-[#8B7355] truncate">{d.contexto}</p>}
                        </div>
                      </div>
                      <p className="serif italic text-[14px] leading-[1.6] text-[#6B5A4B] mt-3">“{d.texto}”</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ---------- PRÓXIMOS PASSOS ---------- */}
            <section id="proximos-passos" className="scroll-mt-16 mt-14 mb-6">
              <p className="text-[11px] tracking-[0.2em] font-semibold text-[#B8935A]">PRÓXIMOS PASSOS</p>
              <h2 className="serif text-[38px] leading-[1.15] text-[#3C2415] font-bold mt-3">Como fechamos?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                {[
                  "Aceite a proposta e assine digitalmente",
                  `Pagamento da entrada ${condicoes.entradaPercentual}% para travar a data`,
                  "Onboarding e início do planejamento",
                ].map((t, i) => (
                  <div key={i} className="bg-white border border-[#E8DDD2] rounded-[16px] p-4">
                    <p className="serif text-[26px] font-bold text-[#B8935A] leading-none">{i + 1}</p>
                    <p className="text-[12px] text-[#6B5A4B] leading-[1.5] mt-2">{t}</p>
                  </div>
                ))}
              </div>

              {dados.status === "aprovado" && (
                <div className="mt-6 bg-[#F9F5F0] border border-[#E8DDD2] rounded-[20px] p-5">
                  <p className="serif text-[22px] font-bold text-[#3C2415]">Proposta aceita!</p>
                  <p className="text-[12px] text-[#6B5A4B] mt-1">
                    {dados.aceite?.recibo_codigo
                      ? `Recibo ${dados.aceite.recibo_codigo} · ${brl(Number(dados.aceite.valor_total))}`
                      : "Em breve entraremos em contato."}
                  </p>
                </div>
              )}

              {venceu && (
                <p className="mt-6 text-[12px] text-[#8B7355]">
                  Esta proposta expirou em {formatDateBR(dados.data_validade)}.
                </p>
              )}

              {dados.status === "aprovado" && !fichaEnviada && (
                <div className="mt-6">
                  <FichaCadastroAprovacao
                    hash={hash}
                    nomeInicial={dados.nome_contato}
                    onConcluido={aposFicha}
                  />
                </div>
              )}
            </section>

            <footer className="border-t border-[#E8DDD2] pt-5 pb-8 text-[11px] text-[#8B7355] flex flex-wrap gap-3 justify-between">
              <span className="tracking-widest">{dados.nome_empresa.toUpperCase()} • EVENTOS</span>
              <span>{[inst?.whatsapp_contato, inst?.email_contato].filter(Boolean).join(" · ")}</span>
              <a href={`/orcamento/${hash}/pdf`} className="underline">Baixar PDF</a>
            </footer>
          </div>

          {/* RIGHT IMAGE 380px */}
          <div className="hidden xl:block w-[380px] shrink-0 m-4 rounded-[28px] overflow-hidden relative min-h-[680px] bg-[#E8DDD2] sticky top-16 self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dados.hero_imagem_url || "/images/hero-padrao.png"}
              className="absolute inset-0 w-full h-full object-cover"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute top-4 left-4 right-4 flex justify-between gap-2">
              <span className="bg-white/90 backdrop-blur rounded-full px-3 py-1 text-[10px] tracking-widest text-[#3C2415]">
                ● AO VIVO
              </span>
              {selecao.pacote?.recomendado && (
                <span className="bg-[#B8935A] text-white rounded-full px-3 py-1 text-[10px] tracking-widest">
                  MAIS ESCOLHIDO
                </span>
              )}
            </div>
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <p className="serif text-[26px] leading-none">{dados.nome_contato}</p>
              <p className="text-[11px] tracking-widest text-white/70 mt-2">
                {dataFmt}
                {dados.local_evento ? ` • ${dados.local_evento.toUpperCase()}` : ""}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ---------- modal de etapa ---------- */}
      {etapaAberta !== null && etapas[etapaAberta] && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6"
          onClick={() => setEtapaAberta(null)}
        >
          <div
            className="bg-[#FFFCF8] rounded-[24px] p-8 max-w-[520px] w-full border border-[#E8DDD2]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="serif text-[24px] text-[#3C2415] font-bold">{etapas[etapaAberta].titulo}</h3>
            <p className="text-[13px] text-[#6B5A4B] mt-3 leading-[1.6]">
              {etapas[etapaAberta].texto_longo || etapas[etapaAberta].descricao}
            </p>
            <button
              onClick={() => setEtapaAberta(null)}
              className="w-full mt-6 border border-[#E8DDD2] rounded-full py-3 text-[12px] text-[#3C2415]"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ---------- modal de aceite ---------- */}
      {showAccept && selecao.pacote && (
        <ModalAceiteV2
          hash={hash}
          selecao={selecao}
          total={valores.total}
          nomeContato={dados.nome_contato}
          whats={whats}
          onFechar={() => setShowAccept(false)}
          onAceito={(recibo, valor) =>
            setDados((d) => ({
              ...d,
              status: "aprovado",
              respondido_em: new Date().toISOString(),
              aceite: {
                recibo_codigo: recibo,
                pacote_nome: selecao.pacote?.nome ?? "",
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

// Modal com as classes do arquivo de referência, mas com canvas real e o
// recibo vindo do banco.
function ModalAceiteV2({
  hash,
  selecao,
  total,
  nomeContato,
  whats,
  onFechar,
  onAceito,
}: {
  hash: string;
  selecao: SelecaoProposta;
  total: number;
  nomeContato: string;
  whats: string | null;
  onFechar: () => void;
  onAceito: (recibo: string, valor: number) => void;
}) {
  const [noiva, setNoiva] = useState(nomeContato);
  const [noivo, setNoivo] = useState("");
  const [assNoiva, setAssNoiva] = useState<string | null>(null);
  const [assNoivo, setAssNoivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recibo, setRecibo] = useState<{ codigo: string; valor: number } | null>(null);

  async function confirmar() {
    setErro(null);
    if (!noiva.trim()) return setErro("Informe o nome de quem está aceitando.");
    if (!assNoiva) return setErro("A assinatura é obrigatória.");

    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("registrar_aceite_proposta", {
      p_hash: hash,
      p_pacote_id: selecao.pacote?.id,
      p_convidados: selecao.convidados,
      p_extras_ids: selecao.extrasIds,
      p_forma_pagamento: selecao.formaPagamento,
      p_parcelas: selecao.formaPagamento === "vista" ? null : selecao.parcelas,
      p_nome_noiva: noiva.trim(),
      p_nome_noivo: noivo.trim() || null,
      p_assinatura_noiva: assNoiva,
      p_assinatura_noivo: assNoivo,
      p_observacoes: null,
    });
    setEnviando(false);

    const falha = error?.message ?? (data as { error?: string })?.error;
    if (falha) return setErro(typeof falha === "string" ? falha : "Não foi possível registrar.");

    const d = data as { recibo: string; valor_total: number };
    setRecibo({ codigo: d.recibo, valor: Number(d.valor_total) });
    onAceito(d.recibo, Number(d.valor_total));
  }

  const linkWhats = whats
    ? `https://wa.me/${whats}?text=${encodeURIComponent(
        `Olá! Sou ${noiva} e aceitei a proposta ${selecao.pacote?.nome ?? ""}. Recibo ${recibo?.codigo ?? ""} — total ${brl(recibo?.valor ?? total)}.`
      )}`
    : null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-[#FFFCF8] rounded-[24px] p-8 max-w-[520px] w-full border border-[#E8DDD2] my-auto">
        {recibo ? (
          <>
            <h3 className="serif text-[24px] text-[#3C2415] font-bold">Proposta aceita!</h3>
            <p className="text-[13px] text-[#6B5A4B] mt-2">
              ID: <strong className="text-[#B8935A]">{recibo.codigo}</strong> • Total: {brl(recibo.valor)}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button onClick={onFechar} className="flex-1 border border-[#E8DDD2] rounded-full py-3 text-[12px] text-[#3C2415]">
                Fechar
              </button>
              {linkWhats && (
                <a
                  href={linkWhats}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#25D366] text-white rounded-full py-3 text-[12px] font-medium text-center"
                >
                  Enviar no WhatsApp
                </a>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="serif text-[24px] text-[#3C2415] font-bold">
              Aceitar proposta • {nomeContato}
            </h3>
            <p className="text-[13px] text-[#6B5A4B] mt-2">
              {selecao.pacote?.nome} • Total: {brl(total)}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <input
                value={noiva}
                onChange={(e) => setNoiva(e.target.value)}
                placeholder="Nome completo"
                className="border border-[#E8DDD2] rounded-full px-4 py-2.5 text-[13px] bg-white"
              />
              <input
                value={noivo}
                onChange={(e) => setNoivo(e.target.value)}
                placeholder="Nome do parceiro(a)"
                className="border border-[#E8DDD2] rounded-full px-4 py-2.5 text-[13px] bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <AssinaturaCanvas rotulo="Assinatura" onChange={setAssNoiva} />
              <AssinaturaCanvas rotulo="Assinatura parceiro(a)" onChange={setAssNoivo} />
            </div>

            {erro && <p className="text-[12px] text-red-600 mt-3">{erro}</p>}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button onClick={onFechar} className="flex-1 border border-[#E8DDD2] rounded-full py-3 text-[12px] text-[#3C2415]">
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={enviando}
                className="flex-1 bg-[#3C2415] text-white rounded-full py-3 text-[12px] font-medium disabled:opacity-60"
              >
                {enviando ? "Registrando…" : "Assinar e aceitar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
