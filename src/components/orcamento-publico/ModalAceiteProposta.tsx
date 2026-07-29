"use client";

// Modal de aceite — único para os quatro templates.
//
// A regra de produto é a mesma em todos: dados pessoais só DEPOIS de a
// cliente decidir aceitar. Aqui ela confirma nome, CPF, e-mail e telefone
// e assina; nada disso é pedido antes.
//
// Cada template tem identidade visual própria, então as cores entram por
// prop (`tema`) — o que é compartilhado é o comportamento: os mesmos
// campos, a mesma validação e uma só chamada de aceite. Antes cada
// template tinha o seu modal, e só um deles coletava cadastro.
//
// O aceite é atômico do lado do banco (061): assinatura, ficha e a
// notificação para a cerimonialista caem na mesma transação. A criação do
// evento vem logo depois, do cliente, porque o checklist/roteiro sugerido
// é gerado em TypeScript ([[orcamento-para-evento]]).

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { criarEventoAPartirDoOrcamento } from "@/lib/orcamento-para-evento";

export type TemaModal = {
  fundo: string;
  card: string;
  texto: string;
  textoSuave: string;
  borda: string;
  acento: string;
  botaoFundo: string;
  botaoTexto: string;
  raio: number;
  /** Fonte dos títulos: classe utilitária que o template já define. */
  classeTitulo?: string;
};

export type DadosAceite = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
};

export function ModalAceiteProposta({
  hash,
  tema,
  titulo,
  subtitulo,
  resumo,
  nomeInicial,
  pacoteId,
  convidados,
  extrasIds,
  formaPagamento = "parcelado",
  parcelas,
  tipoEvento,
  dataEvento,
  assinaturaDupla = false,
  rotuloAssinatura = "Assinatura",
  rotuloAssinatura2 = "Assinatura (2ª pessoa)",
  textoBotao = "ASSINAR E CONFIRMAR",
  rodape,
  onFechar,
  onAceito,
}: {
  hash: string;
  tema: TemaModal;
  titulo: string;
  subtitulo?: string;
  resumo?: string;
  nomeInicial?: string;
  pacoteId: string | null;
  convidados: number | null;
  extrasIds: string[];
  formaPagamento?: "vista" | "parcelado";
  parcelas: number | null;
  tipoEvento: string;
  dataEvento: string | null;
  assinaturaDupla?: boolean;
  rotuloAssinatura?: string;
  rotuloAssinatura2?: string;
  textoBotao?: string;
  rodape?: string;
  onFechar: () => void;
  onAceito: (recibo: string, valorTotal: number) => void;
}) {
  const [nome, setNome] = useState(nomeInicial ?? "");
  const [nome2, setNome2] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const jaEnviou = useRef(false);

  const canvas1 = useRef<HTMLCanvasElement>(null);
  const canvas2 = useRef<HTMLCanvasElement>(null);
  const [assinou1, setAssinou1] = useState(false);
  const [assinou2, setAssinou2] = useState(false);

  const podeConfirmar =
    nome.trim() !== "" &&
    cpf.trim() !== "" &&
    assinou1 &&
    (!assinaturaDupla || assinou2) &&
    !enviando;

  async function confirmar() {
    if (jaEnviou.current) return;
    if (!pacoteId) {
      setErro("Esta proposta ainda não tem um pacote configurado.");
      return;
    }
    jaEnviou.current = true;
    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const base = {
      p_hash: hash,
      p_pacote_id: pacoteId,
      p_convidados: convidados,
      p_extras_ids: extrasIds,
      p_forma_pagamento: formaPagamento,
      p_parcelas: formaPagamento === "vista" ? null : parcelas,
      p_nome_noiva: nome.trim(),
      p_nome_noivo: nome2.trim() || null,
      p_assinatura_noiva: canvas1.current?.toDataURL("image/png") ?? null,
      p_assinatura_noivo: assinaturaDupla
        ? canvas2.current?.toDataURL("image/png") ?? null
        : null,
      p_observacoes: null,
    };

    let { data, error } = await supabase.rpc("registrar_aceite_proposta", {
      ...base,
      p_cpf: cpf.trim() || null,
      p_email: email.trim() || null,
      p_telefone: telefone.trim() || null,
    });

    // Janela de deploy: o código sobe antes de a 061 ser aplicada, e a
    // versão antiga da função não conhece os três campos de cadastro.
    // Sem este retry, todo aceite quebraria nesse intervalo. A ficha fica
    // para a tela de cadastro pós-aceite até a migração rodar.
    if (error && /Could not find the function/i.test(error.message)) {
      ({ data, error } = await supabase.rpc("registrar_aceite_proposta", base));
    }

    const falha = error?.message ?? (data as { error?: string })?.error;
    if (falha) {
      jaEnviou.current = false;
      setEnviando(false);
      return setErro(
        typeof falha === "string" ? falha : "Não foi possível registrar."
      );
    }

    // Evento automático a partir da proposta aceita. Uma falha aqui não
    // pode derrubar o aceite, que já está gravado — a cerimonialista
    // consegue gerar o evento pelo painel depois.
    try {
      await criarEventoAPartirDoOrcamento(hash, tipoEvento, dataEvento);
    } catch {
      /* silencioso de propósito: ver comentário acima */
    }

    setEnviando(false);
    const d = data as { recibo: string; valor_total: number };
    onAceito(d.recibo, Number(d.valor_total));
  }

  const campoStyle = {
    border: `1px solid ${tema.borda}`,
    background: tema.fundo,
    color: tema.texto,
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-4"
      style={{ background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)" }}
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="relative my-auto w-full max-w-[520px] p-6 sm:p-8"
        style={{ background: tema.card, borderRadius: tema.raio, color: tema.texto }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Fechar"
          onClick={onFechar}
          className="absolute right-5 top-5 text-[18px] leading-none"
          style={{ color: tema.textoSuave }}
        >
          ✕
        </button>

        <h3 className={`${tema.classeTitulo ?? ""} text-[24px] leading-tight`}>
          {titulo}
        </h3>
        {subtitulo && (
          <p className="mt-1.5 text-[12.5px]" style={{ color: tema.textoSuave }}>
            {subtitulo}
          </p>
        )}
        {resumo && (
          <p
            className="mt-4 rounded-lg px-3 py-2.5 text-[12.5px]"
            style={{ background: tema.fundo, color: tema.textoSuave }}
          >
            {resumo}
          </p>
        )}

        <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Rotulo tema={tema}>NOME COMPLETO *</Rotulo>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1.5 w-full rounded-lg px-3 py-2.5 text-[13.5px] outline-none"
              style={campoStyle}
            />
          </div>

          {assinaturaDupla && (
            <div className="sm:col-span-2">
              <Rotulo tema={tema}>NOME DA 2ª PESSOA</Rotulo>
              <input
                value={nome2}
                onChange={(e) => setNome2(e.target.value)}
                className="mt-1.5 w-full rounded-lg px-3 py-2.5 text-[13.5px] outline-none"
                style={campoStyle}
              />
            </div>
          )}

          <div>
            <Rotulo tema={tema}>CPF *</Rotulo>
            <input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className="mt-1.5 w-full rounded-lg px-3 py-2.5 text-[13.5px] outline-none"
              style={campoStyle}
            />
          </div>
          <div>
            <Rotulo tema={tema}>TELEFONE / WHATSAPP</Rotulo>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 90000-0000"
              inputMode="tel"
              className="mt-1.5 w-full rounded-lg px-3 py-2.5 text-[13.5px] outline-none"
              style={campoStyle}
            />
          </div>
          <div className="sm:col-span-2">
            <Rotulo tema={tema}>E-MAIL</Rotulo>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg px-3 py-2.5 text-[13.5px] outline-none"
              style={campoStyle}
            />
          </div>
        </div>

        <Assinatura
          refCanvas={canvas1}
          tema={tema}
          rotulo={`${rotuloAssinatura} *`}
          onMudou={setAssinou1}
        />
        {assinaturaDupla && (
          <Assinatura
            refCanvas={canvas2}
            tema={tema}
            rotulo={`${rotuloAssinatura2} *`}
            onMudou={setAssinou2}
          />
        )}

        {erro && (
          <p className="mt-4 rounded-lg p-2.5 text-[12px]" style={{ background: "#FDECEC", color: "#9B2C2C" }}>
            {erro}
          </p>
        )}

        <button
          onClick={confirmar}
          disabled={!podeConfirmar}
          className="mt-6 w-full rounded-full py-4 text-[12.5px] font-medium transition-opacity"
          style={{
            background: tema.botaoFundo,
            color: tema.botaoTexto,
            letterSpacing: "0.08em",
            opacity: podeConfirmar ? 1 : 0.4,
            cursor: podeConfirmar ? "pointer" : "not-allowed",
          }}
        >
          {enviando ? "REGISTRANDO…" : textoBotao}
        </button>
        {rodape && (
          <p className="mt-3 text-center text-[10.5px]" style={{ color: tema.textoSuave }}>
            {rodape}
          </p>
        )}
      </div>
    </div>
  );
}

function Rotulo({ tema, children }: { tema: TemaModal; children: React.ReactNode }) {
  return (
    <label className="text-[9.5px]" style={{ letterSpacing: "0.16em", color: tema.textoSuave }}>
      {children}
    </label>
  );
}

// Canvas de assinatura: devicePixelRatio para o traço não sair borrado e
// touch-action none para o dedo desenhar em vez de rolar a página.
function Assinatura({
  refCanvas,
  tema,
  rotulo,
  onMudou,
}: {
  refCanvas: React.RefObject<HTMLCanvasElement>;
  tema: TemaModal;
  rotulo: string;
  onMudou: (assinou: boolean) => void;
}) {
  useEffect(() => {
    const c = refCanvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr;
    c.height = c.offsetHeight * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = tema.texto;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let desenhando = false;
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const inicio = (e: PointerEvent) => {
      desenhando = true;
      c.setPointerCapture(e.pointerId);
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };
    const mover = (e: PointerEvent) => {
      if (!desenhando) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      onMudou(true);
    };
    const fim = () => { desenhando = false; };
    const semScroll = (e: TouchEvent) => e.preventDefault();

    c.addEventListener("pointerdown", inicio);
    c.addEventListener("pointermove", mover);
    c.addEventListener("pointerup", fim);
    c.addEventListener("pointerleave", fim);
    c.addEventListener("touchmove", semScroll, { passive: false });
    return () => {
      c.removeEventListener("pointerdown", inicio);
      c.removeEventListener("pointermove", mover);
      c.removeEventListener("pointerup", fim);
      c.removeEventListener("pointerleave", fim);
      c.removeEventListener("touchmove", semScroll);
    };
  }, [refCanvas, tema.texto, onMudou]);

  function limpar() {
    const c = refCanvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    onMudou(false);
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <Rotulo tema={tema}>{rotulo.toUpperCase()}</Rotulo>
        <button onClick={limpar} className="text-[10.5px] underline" style={{ color: tema.textoSuave }}>
          Limpar
        </button>
      </div>
      <canvas
        ref={refCanvas}
        className="mt-1.5 w-full rounded-lg"
        style={{
          height: 120,
          border: `1px solid ${tema.borda}`,
          background: tema.fundo,
          touchAction: "none",
        }}
      />
      <p className="mt-1.5 text-[10px]" style={{ color: tema.textoSuave }}>
        Desenhe acima com o dedo ou mouse
      </p>
    </div>
  );
}
