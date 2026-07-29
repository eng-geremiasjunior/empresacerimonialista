"use client";

// Proposta pública de debutante — implementação do handoff em
// design/template-2 debbut/design_handoff_proposta_karina_dries.
//
// Tokens confirmados no DOM do protótipo a 1440px:
//   fundo #FFFEFB · seções alternadas #FBF8F2 · borda #EDE9E3
//   ink #2B2723 · secundário #6B6560 · mudo #8A8479 · fraco #A8A29A/#C9C2B6
//   dourado #C4A265 (gradiente até #E8CFA0) · pill #F3EEE5 sobre #B08D4F
//   Playfair Display (títulos) + Inter (corpo)
//   sidebar 270px · seções padding 90px 56px · hero grid 1.05fr/1fr
//   cuidados 5 col gap 18 · galeria 6 col gap 14 · pacotes 3 col gap 20
//
// Diferenças conscientes em relação ao handoff:
//  * os botões "💬 Comentar" não entram — decisão do produto, a mesma do
//    template de casamento: dispersam a conversão. No próprio handoff são
//    placeholders sem destino;
//  * o nome no topo não é editável pela cliente: ele vai para o contrato
//    assinado, e deixá-lo editável abriria divergência entre o que ela
//    leu e o que assinou;
//  * pacotes, extras, processo, fotos e depoimentos vêm do Supabase por
//    tipo de evento (Catálogo › Debutante); os valores do handoff são o
//    seed da migração 058, não números cravados aqui.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ModalAceiteProposta } from "@/components/orcamento-publico/ModalAceiteProposta";
import { formatDateBR } from "@/lib/orcamentos";
import { expirado, type OrcamentoPublicoData } from "@/lib/orcamento-publico";
import { calcularProposta } from "@/lib/proposta";
import { IMAGEM_PADRAO } from "@/lib/landing-imagens";
import {
  NAV_DEBUTANTE,
  CUIDADOS_PADRAO,
  PROCESSO_DEBUTANTE_PADRAO,
  DEPOIMENTOS_DEBUTANTE_PADRAO,
  GARANTIA_DEBUTANTE,
  SELOS_CONFIANCA,
  FECHAMENTO_DEBUTANTE,
} from "@/lib/proposta-debutante-conteudo";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const OURO = "#C4A265";
const BORDA = "#EDE9E3";
const INK = "#2B2723";

export function PropostaDebutante({
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
  const fotos = dados.fotos ?? [];

  const etapas =
    (dados.etapas ?? []).length > 0 ? dados.etapas : PROCESSO_DEBUTANTE_PADRAO;
  const depoimentos =
    (dados.depoimentos ?? []).length > 0
      ? dados.depoimentos
      : DEPOIMENTOS_DEBUTANTE_PADRAO;

  const regra = {
    inclusos: inst?.convidados_inclusos ?? 150,
    valorPorExtra: Number(inst?.valor_por_convidado_extra ?? 15),
    min: inst?.convidados_min ?? 80,
    max: inst?.convidados_max ?? 300,
  };
  const condicoes = {
    entradaPercentual: inst?.condicao_entrada_percentual ?? 0,
    parcelasMaximo: inst?.condicao_parcelas_maximo ?? 6,
    descontoAVista: inst?.condicao_desconto_a_vista_percentual ?? 0,
  };

  const venceu = expirado(dados);
  const podeResponder = dados.status === "enviado" && !venceu;

  const [pacoteId, setPacoteId] = useState<string | null>(
    () => (pacotes.find((p) => p.recomendado) ?? pacotes[0])?.id ?? null
  );
  const [convidados, setConvidados] = useState(
    dados.numero_convidados ?? regra.inclusos
  );
  const [extrasIds, setExtrasIds] = useState<string[]>([]);
  const [etapaAberta, setEtapaAberta] = useState(0);
  const [depoIndex, setDepoIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [aceite, setAceite] = useState(dados.aceite ?? null);

  const pacote = pacotes.find((p) => p.id === pacoteId) ?? null;

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
        {
          entradaPercentual: condicoes.entradaPercentual,
          parcelasMaximo: condicoes.parcelasMaximo,
          descontoAVista: condicoes.descontoAVista,
          prazoParcelasTexto: "",
        }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pacote, convidados, extrasIds, extras, regra.inclusos, regra.valorPorExtra]
  );

  // Countdown: começa no cliente para não divergir do HTML do servidor.
  const [restante, setRestante] = useState<string | null>(null);
  useEffect(() => {
    if (!podeResponder) return;
    const fim = new Date(`${dados.data_validade}T23:59:59`).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((fim - Date.now()) / 1000));
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      setRestante(`${d}d ${h}h ${m}m ${s % 60}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dados.data_validade, podeResponder]);

  // Carrossel automático, como no handoff.
  useEffect(() => {
    if (depoimentos.length < 2) return;
    const id = setInterval(
      () => setDepoIndex((i) => (i + 1) % depoimentos.length),
      6000
    );
    return () => clearInterval(id);
  }, [depoimentos.length]);

  // Lightbox: Esc fecha, setas navegam.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => ((i ?? 0) + 1) % fotos.length);
      if (e.key === "ArrowLeft")
        setLightbox((i) => ((i ?? 0) - 1 + fotos.length) % fotos.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, fotos.length]);

  const irPara = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const parcelaExibida =
    valores.parcela ?? valores.total / Math.max(1, condicoes.parcelasMaximo);

  if (aceite) {
    return (
      <Recibo
        aceite={aceite}
        nomeEmpresa={dados.nome_empresa}
        contato={dados.nome_contato}
      />
    );
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "#FFFEFB", color: INK }}
    >
      <style>{`
        .playfair{font-family:var(--font-playfair),Georgia,serif}
        @keyframes subirFade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        section{animation:subirFade .45s ease both}
        input[type=range]{-webkit-appearance:none;height:4px;background:${BORDA};border-radius:999px;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:999px;background:${OURO};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer}
        input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:999px;background:${OURO};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer}
        @media (prefers-reduced-motion:reduce){section{animation:none}}
      `}</style>

      {/* SIDEBAR — 270px, sticky, some no mobile */}
      <aside
        className="hidden lg:flex w-[270px] shrink-0 flex-col gap-7 sticky top-0 h-screen overflow-y-auto px-6 py-8"
        style={{ borderRight: `1px solid ${BORDA}` }}
      >
        <div className="flex flex-col gap-1">
          {dados.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dados.logo_url}
              alt={dados.nome_empresa}
              className="h-9 w-auto object-contain self-start"
            />
          ) : (
            <div
              className="playfair text-[34px] leading-none"
              style={{ color: OURO }}
            >
              {dados.nome_empresa.slice(0, 2).toUpperCase()}.
            </div>
          )}
          <div
            className="text-[9px] leading-[1.5] mt-1.5"
            style={{ letterSpacing: "0.18em", color: "#A8A29A" }}
          >
            {dados.nome_empresa.toUpperCase()}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${BORDA}` }} />

        <nav className="flex flex-col gap-0.5">
          {NAV_DEBUTANTE.map((item) => (
            <button
              key={item.id}
              onClick={() => irPara(item.id)}
              className="flex items-baseline gap-2.5 rounded-md px-1.5 py-2.5 text-left text-[12px] hover:bg-[#FBF8F2]"
              style={{ letterSpacing: "0.06em" }}
            >
              <span className="text-[10px]" style={{ color: OURO }}>
                {item.num}
              </span>
              <span style={{ fontWeight: 500 }}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Resumo dinâmico — acompanha a calculadora ao vivo */}
        <div
          className="mt-auto flex flex-col gap-3 rounded-[14px] p-[18px]"
          style={{ border: `1px solid ${BORDA}`, background: "#FFFEFB" }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px]"
              style={{ letterSpacing: "0.1em", color: "#A8A29A" }}
            >
              RESUMO DINÂMICO
            </span>
            <span
              className="rounded-full px-2 py-[3px] text-[9px] font-semibold"
              style={{ background: "#F3EEE5", color: "#B08D4F" }}
            >
              AO VIVO
            </span>
          </div>
          <div className="flex flex-col gap-2 text-[12px]">
            <div className="flex justify-between">
              <span style={{ color: "#A8A29A" }}>Pacote</span>
              <span className="font-semibold">{pacote?.nome ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#A8A29A" }}>Convidados</span>
              <span className="font-semibold">{convidados}</span>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDA}` }} className="pt-2.5">
            <div
              className="text-[9px]"
              style={{ letterSpacing: "0.12em", color: "#A8A29A" }}
            >
              TOTAL
            </div>
            <div className="playfair text-[26px]">{brl(valores.total)}</div>
            <div className="mt-0.5 text-[10px]" style={{ color: "#A8A29A" }}>
              {condicoes.entradaPercentual > 0
                ? `entrada de ${brl(valores.entrada)} + ${condicoes.parcelasMaximo}x de ${brl(parcelaExibida)}`
                : `em até ${condicoes.parcelasMaximo}x de ${brl(parcelaExibida)} sem juros`}
            </div>
          </div>
          <button
            onClick={() => (podeResponder ? setModalAberto(true) : irPara("investimento"))}
            disabled={!podeResponder}
            className="flex items-center justify-center gap-1.5 rounded-full py-[13px] text-[12px] font-semibold text-white disabled:opacity-50"
            style={{
              background: `linear-gradient(90deg, ${OURO}, #E8CFA0)`,
              letterSpacing: "0.04em",
            }}
          >
            ACEITAR AGORA →
          </button>
          <div className="text-center text-[9.5px]" style={{ color: "#A8A29A" }}>
            garantia e contrato digital
          </div>
        </div>

        {podeResponder && restante && (
          <div
            className="flex items-center gap-2 rounded-[12px] px-3.5 py-3 text-[10.5px]"
            style={{ border: `1px solid ${BORDA}`, color: "#A8A29A" }}
          >
            ⏱ EXPIRA EM{" "}
            <span style={{ color: INK, fontWeight: 600 }}>{restante}</span>
          </div>
        )}

        <div
          className="text-[9px] leading-[1.6]"
          style={{ letterSpacing: "0.08em", color: "#C9C2B6" }}
        >
          ORGANIZAMOS SONHOS,
          <br />
          CRIAMOS MEMÓRIAS.
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {/* 1 — HERO */}
        <section
          id="hero"
          className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]"
        >
          <div className="order-2 flex flex-col justify-center gap-[26px] px-6 py-12 sm:px-14 lg:order-1 lg:py-16">
            <div
              className="inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-[7px] text-[10.5px]"
              style={{
                border: `1px solid ${BORDA}`,
                letterSpacing: "0.08em",
                color: "#A8A29A",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: OURO }}
              />
              PROPOSTA EXCLUSIVA PARA{" "}
              <span
                style={{
                  color: INK,
                  fontWeight: 600,
                  borderBottom: `1px dashed ${OURO}`,
                }}
              >
                {dados.nome_contato}
              </span>
            </div>

            <h1 className="playfair m-0 text-[38px] font-medium leading-[1.08] sm:text-[52px]">
              15 ANOS.
              <br />
              UM MOMENTO
              <br />
              PARA FICAR
              <br />
              <span className="italic" style={{ color: OURO }}>
                PARA SEMPRE.
              </span>
            </h1>

            <p
              className="max-w-[480px] text-[15px] leading-[1.7]"
              style={{ color: "#6B6560" }}
            >
              Uma celebração cinematográfica para marcar a transição mais linda.
              Cuidamos de cada segundo para que{" "}
              <strong style={{ color: INK }}>{dados.nome_contato}</strong> viva
              um dia leve, emocionante e absolutamente inesquecível.
            </p>

            <div className="flex flex-wrap gap-8 pt-1.5">
              <MetaHero
                icone="📅"
                titulo={
                  dados.data_evento
                    ? formatDateBR(dados.data_evento).toUpperCase()
                    : "A DEFINIR"
                }
                sub="Data do evento"
              />
              <MetaHero
                icone="👥"
                titulo={`${convidados} CONVIDADOS`}
                sub={pacote ? `Base ${pacote.nome}` : "Estimativa"}
              />
              <MetaHero
                icone="📍"
                titulo={(dados.local_evento || "A DEFINIR").toUpperCase()}
                sub={dados.cidade_evento ?? ""}
              />
            </div>

            <div className="flex flex-wrap gap-3.5 pt-2.5">
              <button
                onClick={() => irPara("investimento")}
                className="rounded-full px-6 py-[15px] text-[13px] font-semibold text-white"
                style={{ background: `linear-gradient(90deg, ${OURO}, #E8CFA0)` }}
              >
                ⚡ VER PACOTES
              </button>
              {inst?.video_url && (
                <a
                  href={inst.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full bg-white px-6 py-[15px] text-[13px] font-semibold"
                  style={{ border: `1px solid ${BORDA}`, color: INK }}
                >
                  ▷ ASSISTA O TEASER
                </a>
              )}
            </div>
          </div>

          {/* Capa: a imagem do Catálogo › Debutante, com o pacote escolhido
              sobreposto. O play só aparece quando há vídeo configurado. */}
          <div
            className="relative order-1 min-h-[280px] lg:order-2 lg:min-h-0"
            style={{ background: INK }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dados.hero_imagem_url || IMAGEM_PADRAO.hero}
              alt={`Capa da proposta de ${dados.nome_contato}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {inst?.video_url && (
              <>
                <a
                  href={inst.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Assistir ao teaser"
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span
                    className="flex h-[84px] w-[84px] items-center justify-center rounded-full text-[26px]"
                    style={{ background: "rgba(255,255,255,0.92)", color: INK }}
                  >
                    ▷
                  </span>
                </a>
                <div
                  className="absolute bottom-[90px] left-1/2 -translate-x-1/2 rounded-full px-4 py-[7px] text-[10.5px] text-white"
                  style={{ background: "rgba(0,0,0,0.55)", letterSpacing: "0.08em" }}
                >
                  TEASER
                </div>
              </>
            )}

            {pacote && (
              <div
                className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-[14px] px-[18px] py-3.5 backdrop-blur"
                style={{ background: "rgba(20,18,16,0.82)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: "rgba(255,255,255,0.12)", color: "#E8CFA0" }}
                  >
                    👑
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-white">
                      PACOTE {pacote.nome}
                    </div>
                    <div className="text-[11px]" style={{ color: "#9a948c" }}>
                      {brl(Number(pacote.preco))}
                    </div>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 text-[10.5px]"
                  style={{ color: "#C7E8C4" }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "#7CC97A" }}
                  />
                  {podeResponder ? "DISPONÍVEL" : "INDISPONÍVEL"}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 2 — COMO CUIDAMOS */}
        <Secao id="cuidados">
          <h2 className="playfair m-0 mb-10 text-[24px] sm:text-[30px]">
            COMO VAMOS CUIDAR DA SUA FESTA
          </h2>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-5">
            {CUIDADOS_PADRAO.map((c) => (
              <div
                key={c.titulo}
                className="flex flex-col gap-3.5 rounded-[16px] px-5 py-[26px] transition-transform hover:-translate-y-1"
                style={{ border: `1px solid ${BORDA}` }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[17px]"
                  style={{ background: "#F3EEE5" }}
                >
                  {c.icone}
                </div>
                <div
                  className="text-[12px] font-bold"
                  style={{ letterSpacing: "0.04em" }}
                >
                  {c.titulo}
                </div>
                <div
                  className="text-[12px] leading-[1.55]"
                  style={{ color: "#8A8479" }}
                >
                  {c.descricao}
                </div>
              </div>
            ))}
          </div>
        </Secao>

        {/* 3 — PROCESSO */}
        <Secao id="processo">
          <h2 className="playfair m-0 mb-2 text-[24px] sm:text-[30px]">
            NOSSO PROCESSO
          </h2>
          <p
            className="m-0 mb-9 max-w-[460px] text-[13px]"
            style={{ color: "#8A8479" }}
          >
            Clique em cada etapa para expandir.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {etapas.map((e, i) => {
              const aberta = etapaAberta === i;
              return (
                <button
                  key={`${e.titulo}-${i}`}
                  onClick={() => setEtapaAberta(aberta ? -1 : i)}
                  className="-ml-px cursor-pointer px-[18px] py-[22px] text-left align-top"
                  style={{
                    border: `1px solid ${BORDA}`,
                    borderTop: `2px solid ${aberta ? OURO : BORDA}`,
                  }}
                >
                  <div className="mb-3.5 flex items-center gap-2.5">
                    <div
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[12px]"
                      style={{ background: "#F3EEE5" }}
                    >
                      ●
                    </div>
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: OURO }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div
                    className="mb-2 text-[12px] font-bold"
                    style={{ letterSpacing: "0.03em" }}
                  >
                    {e.titulo}
                  </div>
                  {aberta && (e.descricao || e.texto_longo) && (
                    <div
                      className="text-[12px] leading-[1.55]"
                      style={{ color: "#8A8479" }}
                    >
                      {e.texto_longo || e.descricao}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Secao>

        {/* 4 — GALERIA */}
        {fotos.length > 0 && (
          <Secao id="galeria">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <h2 className="playfair m-0 text-[24px] sm:text-[30px]">
                EXCELÊNCIA EM CADA DETALHE
              </h2>
              <span
                className="text-[10.5px]"
                style={{ letterSpacing: "0.1em", color: "#C9C2B6" }}
              >
                GALERIA • CLIQUE PARA EXPANDIR
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
              {fotos.map((f, i) => (
                <button
                  key={f.url}
                  onClick={() => setLightbox(i)}
                  className="aspect-[3/4] overflow-hidden rounded-[10px] transition-transform hover:-translate-y-1"
                  style={{ background: "#F3EEE5" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.url}
                    alt={f.legenda ?? ""}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </Secao>
        )}

        {/* 5 — INVESTIMENTO */}
        <Secao id="investimento" fundo="#FBF8F2">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="playfair m-0 text-[24px] sm:text-[30px]">
                INVESTIMENTO
              </h2>
              <span
                className="rounded-full px-2.5 py-1 text-[9.5px] font-semibold"
                style={{ background: "#F3EEE5", color: "#B08D4F" }}
              >
                CALCULADORA AO VIVO
              </span>
            </div>
            {podeResponder && restante && (
              <div
                className="rounded-full bg-white px-4 py-2 text-[11px]"
                style={{ border: `1px solid ${BORDA}`, color: "#8A8479" }}
              >
                ⏱ VALIDADE: {restante}
              </div>
            )}
          </div>
          <p
            className="m-0 mb-9 max-w-[520px] text-[13px]"
            style={{ color: "#8A8479" }}
          >
            Escolha o pacote, ajuste convidados e adicione os extras. Preço
            recalcula instantaneamente. Sem surpresas.
          </p>

          <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {pacotes.map((p) => {
              const on = p.id === pacoteId;
              return (
                <button
                  key={p.id}
                  onClick={() => setPacoteId(p.id)}
                  className="relative cursor-pointer rounded-[18px] bg-white p-7 text-left transition-transform hover:-translate-y-1"
                  style={{ border: `${on ? 2 : 1}px solid ${on ? OURO : BORDA}` }}
                >
                  {p.recomendado && (
                    <div
                      className="absolute -top-[13px] left-6 rounded-full px-3 py-1 text-[9.5px] font-bold text-white"
                      style={{ background: OURO, letterSpacing: "0.05em" }}
                    >
                      MAIS ESCOLHIDA
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <div
                        className="text-[13px] font-bold"
                        style={{ letterSpacing: "0.05em" }}
                      >
                        {p.nome}
                      </div>
                      {p.subtitulo && (
                        <div
                          className="mt-1 text-[11.5px]"
                          style={{ color: "#8A8479" }}
                        >
                          {p.subtitulo}
                        </div>
                      )}
                    </div>
                    <div
                      className="h-5 w-5 shrink-0 rounded-full"
                      style={{
                        border: `2px solid ${on ? OURO : "#DAD3C7"}`,
                        background: on ? OURO : "transparent",
                      }}
                    />
                  </div>
                  <div className="playfair mb-1 mt-[18px] text-[30px]">
                    {brl(Number(p.preco))}
                  </div>
                  <div className="mb-[18px] text-[11px]" style={{ color: "#A8A29A" }}>
                    à vista
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {(p.inclui ?? []).map((f, i) => (
                      <div
                        key={i}
                        className="flex gap-2 text-[12px]"
                        style={{ color: "#4A453F" }}
                      >
                        <span style={{ color: OURO }}>✓</span>
                        {f}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Personalize */}
            <div
              className="rounded-[18px] bg-white p-7"
              style={{ border: `1px solid ${BORDA}` }}
            >
              <div
                className="mb-[22px] flex items-center gap-2 text-[12px] font-bold"
                style={{ letterSpacing: "0.04em" }}
              >
                👤 PERSONALIZE SUA FESTA
              </div>
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[12px] font-semibold">
                  NÚMERO DE CONVIDADOS: {convidados}
                </span>
                <span
                  className="rounded-full px-3 py-[5px] text-[11px]"
                  style={{ border: `1px solid ${BORDA}`, color: "#8A8479" }}
                >
                  {regra.min} — {regra.max}
                </span>
              </div>
              <input
                type="range"
                min={regra.min}
                max={regra.max}
                step={10}
                value={convidados}
                onChange={(e) => setConvidados(Number(e.target.value))}
                aria-label="Número de convidados"
                className="mb-2 w-full accent-[#C4A265]"
              />
              <div
                className="mb-[22px] flex justify-between text-[10.5px]"
                style={{ color: "#A8A29A" }}
              >
                <span>{regra.min} intimista</span>
                <span>{regra.inclusos} base inclusa</span>
                <span>{regra.max} grande gala</span>
              </div>

              {extras.map((x) => {
                const on = extrasIds.includes(x.id);
                return (
                  <div
                    key={x.id}
                    className="flex items-center justify-between pt-[18px]"
                    style={{ borderTop: `1px solid ${BORDA}` }}
                  >
                    <div className="pr-3">
                      <div className="text-[12.5px] font-semibold">
                        {x.nome} incluso?
                      </div>
                      <div
                        className="mt-0.5 text-[11px]"
                        style={{ color: "#8A8479" }}
                      >
                        {x.descricao ? `${x.descricao} • ` : ""}+{brl(Number(x.preco))}
                      </div>
                    </div>
                    <button
                      role="switch"
                      aria-checked={on}
                      aria-label={`Incluir ${x.nome}`}
                      onClick={() =>
                        setExtrasIds((ids) =>
                          on ? ids.filter((i) => i !== x.id) : [...ids, x.id]
                        )
                      }
                      className="relative h-6 w-[42px] shrink-0 rounded-full"
                      style={{ background: on ? OURO : "#DAD3C7" }}
                    >
                      <span
                        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]"
                        style={{ left: on ? 20 : 2 }}
                      />
                    </button>
                  </div>
                );
              })}

              {convidados > 200 && (
                <div
                  className="mt-[18px] flex gap-2.5 rounded-[12px] px-4 py-3.5 text-[12px]"
                  style={{ border: `1px solid ${BORDA}`, color: "#6B6560" }}
                >
                  🎁{" "}
                  <span>
                    <strong style={{ color: INK }}>Dica:</strong> acima de 200
                    convidados recomendamos o pacote mais completo para garantir
                    equipe suficiente no dia.
                  </span>
                </div>
              )}
            </div>

            {/* Resumo financeiro */}
            <div
              className="flex flex-col rounded-[18px] bg-white p-7"
              style={{ border: `1px solid ${BORDA}` }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div
                  className="text-[12px] font-bold"
                  style={{ letterSpacing: "0.04em" }}
                >
                  RESUMO FINANCEIRO
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[9.5px] font-semibold"
                  style={{ background: "#F3EEE5", color: "#B08D4F" }}
                >
                  ● ATUALIZA AO VIVO
                </span>
              </div>

              <Linha rotulo={`Pacote ${pacote?.nome ?? "—"}`} valor={brl(valores.precoPacote)} />
              <Linha
                rotulo={`Convidados (${convidados})`}
                valor={
                  valores.valorConvidadosExtra > 0
                    ? `+ ${brl(valores.valorConvidadosExtra)}`
                    : "incluso"
                }
              />
              {extras
                .filter((x) => extrasIds.includes(x.id))
                .map((x) => (
                  <Linha
                    key={x.id}
                    rotulo={x.nome}
                    valor={`+ ${brl(Number(x.preco))}`}
                  />
                ))}

              <div style={{ borderTop: `1px solid ${BORDA}` }} className="my-2.5 mb-4" />
              <div className="flex items-baseline justify-between">
                <span
                  className="text-[12px]"
                  style={{ letterSpacing: "0.08em", color: "#A8A29A" }}
                >
                  TOTAL
                </span>
                <span className="playfair text-[28px]">{brl(valores.total)}</span>
              </div>
              <div
                className="mb-5 text-right text-[11px]"
                style={{ color: "#A8A29A" }}
              >
                {condicoes.entradaPercentual > 0
                  ? `entrada de ${brl(valores.entrada)} + ${condicoes.parcelasMaximo}x de ${brl(parcelaExibida)}`
                  : `ou ${condicoes.parcelasMaximo}x de ${brl(parcelaExibida)} sem juros`}
              </div>

              <button
                onClick={() => setModalAberto(true)}
                disabled={!podeResponder || !pacote}
                className="mb-2 rounded-full py-[15px] text-[13px] font-semibold text-white disabled:opacity-50"
                style={{ background: `linear-gradient(90deg, ${OURO}, #E8CFA0)` }}
              >
                {podeResponder ? "ACEITAR PROPOSTA →" : "PROPOSTA INDISPONÍVEL"}
              </button>
              <div
                className="mb-[18px] text-center text-[10.5px]"
                style={{ color: "#A8A29A" }}
              >
                assinatura digital • comprovante imediato
              </div>

              <div className="mt-auto grid grid-cols-3 gap-2">
                {SELOS_CONFIANCA.map((s) => (
                  <div
                    key={s.texto}
                    className="rounded-[10px] px-1.5 py-2.5 text-center text-[10.5px]"
                    style={{ border: `1px solid ${BORDA}`, color: "#6B6560" }}
                  >
                    {s.icone}
                    <br />
                    {s.texto}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="mt-5 flex items-center gap-3.5 rounded-[14px] bg-white px-[22px] py-[18px]"
            style={{ border: `1px solid ${BORDA}` }}
          >
            <span className="text-[18px]">🛡️</span>
            <div>
              <div className="text-[12.5px] font-bold">
                {GARANTIA_DEBUTANTE.titulo}
              </div>
              <div className="text-[12px]" style={{ color: "#8A8479" }}>
                {GARANTIA_DEBUTANTE.texto}
              </div>
            </div>
          </div>
        </Secao>

        {/* 6 — DEPOIMENTOS */}
        <Secao id="depoimentos">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="playfair m-0 text-[24px] sm:text-[30px]">
              O QUE AS FAMÍLIAS DIZEM
            </h2>
            {depoimentos.length > 1 && (
              <div className="flex gap-2.5">
                <button
                  aria-label="Depoimento anterior"
                  onClick={() =>
                    setDepoIndex((i) => (i - 1 + depoimentos.length) % depoimentos.length)
                  }
                  className="h-[34px] w-[34px] rounded-full bg-white"
                  style={{ border: `1px solid ${BORDA}` }}
                >
                  ‹
                </button>
                <button
                  aria-label="Próximo depoimento"
                  onClick={() => setDepoIndex((i) => (i + 1) % depoimentos.length)}
                  className="h-[34px] w-[34px] rounded-full bg-white"
                  style={{ border: `1px solid ${BORDA}` }}
                >
                  ›
                </button>
              </div>
            )}
          </div>

          {depoimentos[depoIndex] && (
            <div
              className="rounded-[18px] p-6 sm:p-10"
              style={{ border: `1px solid ${BORDA}`, background: "#FBF8F2" }}
            >
              <div className="mb-3.5 text-[14px]" style={{ color: OURO }}>
                ★★★★★
              </div>
              <div className="playfair mb-[22px] max-w-[720px] text-[18px] italic leading-[1.5] sm:text-[22px]">
                “{depoimentos[depoIndex].texto}”
              </div>
              <div className="flex items-center gap-3">
                <div className="h-px w-[26px]" style={{ background: OURO }} />
                <div>
                  <div className="text-[12.5px] font-bold">
                    {depoimentos[depoIndex].autor}
                  </div>
                  {depoimentos[depoIndex].contexto && (
                    <div className="text-[11.5px]" style={{ color: "#8A8479" }}>
                      {depoimentos[depoIndex].contexto}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-[22px] flex gap-1.5">
                {depoimentos.map((_, i) => (
                  <span
                    key={i}
                    className="inline-block h-1.5 rounded-full transition-[width]"
                    style={{
                      width: i === depoIndex ? 20 : 6,
                      background: i === depoIndex ? OURO : BORDA,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="px-0 pb-8 pt-16 text-center">
            <div className="playfair text-[20px] sm:text-[24px]">
              {FECHAMENTO_DEBUTANTE.linha1}
              <br />
              <span className="italic" style={{ color: OURO }}>
                {FECHAMENTO_DEBUTANTE.linha2}
              </span>
            </div>
            <div
              className="mt-4 text-[11px]"
              style={{ letterSpacing: "0.1em", color: "#A8A29A" }}
            >
              {dados.nome_empresa.toUpperCase()}
              {inst?.stat_eventos_realizados
                ? ` • ${inst.stat_eventos_realizados} FESTAS`
                : ""}
              {inst?.stat_anos_experiencia
                ? ` • ${inst.stat_anos_experiencia} ANOS`
                : ""}
            </div>
          </div>
        </Secao>
      </main>

      {/* Barra fixa no mobile: a sidebar some, o total não pode sumir junto */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 bg-white px-4 py-3 lg:hidden"
        style={{ borderTop: `1px solid ${BORDA}` }}
      >
        <div>
          <div className="text-[9px]" style={{ letterSpacing: "0.12em", color: "#A8A29A" }}>
            TOTAL
          </div>
          <div className="playfair text-[20px]">{brl(valores.total)}</div>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          disabled={!podeResponder || !pacote}
          className="rounded-full px-6 py-3 text-[12px] font-semibold text-white disabled:opacity-50"
          style={{ background: `linear-gradient(90deg, ${OURO}, #E8CFA0)` }}
        >
          ACEITAR →
        </button>
      </div>

      {lightbox !== null && fotos[lightbox] && (
        <div
          role="dialog"
          aria-label="Foto ampliada"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotos[lightbox].url}
            alt={fotos[lightbox].legenda ?? ""}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
          <button
            aria-label="Fechar"
            className="absolute right-5 top-5 text-3xl text-white"
          >
            ×
          </button>
        </div>
      )}

      {modalAberto && pacote && (
        <ModalAceiteProposta
          hash={hash}
          tema={TEMA_MODAL_DEBUTANTE}
          titulo="Aceitar proposta"
          subtitulo="Confirme seus dados e assine para reservar a data"
          resumo={`Pacote ${pacote.nome} • ${convidados} convidados • ${brl(valores.total)}`}
          nomeInicial={dados.nome_contato}
          pacoteId={pacote.id}
          convidados={convidados}
          extrasIds={extrasIds}
          parcelas={condicoes.parcelasMaximo}
          tipoEvento={dados.tipo_evento}
          dataEvento={dados.data_evento}
          textoBotao="CONFIRMAR E ASSINAR →"
          rodape="assinatura digital • comprovante imediato"
          onFechar={() => setModalAberto(false)}
          onAceito={(recibo, valor) =>
            setAceite({
              recibo_codigo: recibo,
              pacote_nome: pacote.nome,
              valor_total: valor,
              created_at: new Date().toISOString(),
            })
          }
        />
      )}
    </div>
  );
}

function Secao({
  id,
  fundo,
  children,
}: {
  id: string;
  fundo?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-4 px-6 py-16 sm:px-14 sm:py-[90px]"
      style={{ borderTop: `1px solid ${BORDA}`, background: fundo }}
    >
      {children}
    </section>
  );
}

function MetaHero({
  icone,
  titulo,
  sub,
}: {
  icone: string;
  titulo: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-[15px]" aria-hidden>
        {icone}
      </span>
      <div>
        <div className="text-[13px] font-semibold">{titulo}</div>
        {sub && (
          <div className="text-[11px]" style={{ color: "#A8A29A" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="mb-3 flex justify-between text-[13px]">
      <span style={{ color: "#6B6560" }}>{rotulo}</span>
      <span className="font-semibold">{valor}</span>
    </div>
  );
}

// Tema do modal compartilhado: comportamento igual em todos os templates,
// identidade visual propria de cada um. Ver [[ModalAceiteProposta]].
const TEMA_MODAL_DEBUTANTE = {
  fundo: "#FFFEFB",
  card: "#FFFFFF",
  texto: INK,
  textoSuave: "#8A8479",
  borda: BORDA,
  acento: OURO,
  botaoFundo: OURO,
  botaoTexto: "#FFFFFF",
  raio: 18,
  classeTitulo: "playfair font-medium",
};


function Recibo({
  aceite,
  nomeEmpresa,
  contato,
}: {
  aceite: NonNullable<OrcamentoPublicoData["aceite"]>;
  nomeEmpresa: string;
  contato: string;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: "#FFFEFB", color: INK }}
    >
      <div
        className="w-full max-w-[520px] rounded-[18px] bg-white p-8 text-center"
        style={{ border: `1px solid ${BORDA}` }}
      >
        <div className="text-[40px]">👑</div>
        <h1 className="playfair mt-3 text-[28px]">Proposta aceita!</h1>
        <p className="mt-2 text-[13px]" style={{ color: "#6B6560" }}>
          {contato}, sua festa está reservada com a {nomeEmpresa}.
        </p>
        <div
          className="mt-6 rounded-[14px] p-5"
          style={{ background: "#FBF8F2", border: `1px solid ${BORDA}` }}
        >
          <div className="text-[10px]" style={{ letterSpacing: "0.14em", color: "#A8A29A" }}>
            COMPROVANTE
          </div>
          <div className="playfair mt-1 text-[24px]">{aceite.recibo_codigo}</div>
          <div className="mt-3 text-[13px]" style={{ color: "#6B6560" }}>
            {aceite.pacote_nome} • {brl(Number(aceite.valor_total))}
          </div>
        </div>
        <p className="mt-5 text-[11.5px]" style={{ color: "#A8A29A" }}>
          Guarde este código. Entraremos em contato para os próximos passos.
        </p>
      </div>
    </div>
  );
}
