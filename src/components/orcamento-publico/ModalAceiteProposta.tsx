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
// O aceite acontece no servidor (rota /api/orcamento/[hash]/aceite): é lá
// que ficam IP e navegador, que nasce o PDF do termo, que saem os e-mails
// e que o evento é criado. O navegador só monta o corpo e mostra o
// resultado — por isso o e-mail é obrigatório: é para onde vai o termo.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  assinantesDoTipo,
  rotuloAssinante,
  rotuloDocumentoAssinante,
} from "@/lib/papel";
// O mesmo texto que a rota grava na linha do aceite — módulo puro, sem
// cópia local: a caixa mostra exatamente o que o servidor registra.
import { termosAceiteTexto } from "@/lib/aceite-termo-texto";

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

/** O que a rota de aceite devolve e os templates recebem em `onAceito`. */
export type ResultadoAceite = {
  recibo: string;
  valorTotal: number;
  valorEntrada: number | null;
  valorParcela: number | null;
  jaExistia: boolean;
  /** Número cru da cerimonialista (com ou sem DDI), ou null sem Catálogo. */
  whatsapp: string | null;
  emailCerimonialista: string | null;
  /** E-mail da cliente quando o termo saiu; null quando o envio falhou. */
  emailEnviadoPara: string | null;
  /** Nome do contrato de prestação anexado ao aceite; null sem contrato. */
  contratoNome: string | null;
};

/** O contrato que a proposta mostra antes do aceite (consultar_orcamento_publico, 163). */
export type ContratoDaProposta = { nome: string; sha256: string } | null;

/** Validação mínima: tem @ e um ponto depois dele. O resto é do Resend. */
export function emailParece(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Motivos curtos da recusa — o rótulo vai como texto para a RPC. */
export const MOTIVOS_RECUSA = [
  { valor: "preco", rotulo: "Preço" },
  { valor: "data", rotulo: "Data" },
  { valor: "outra_empresa", rotulo: "Outra empresa" },
  { valor: "outro", rotulo: "Outro" },
] as const;

const ERRO_ACEITE_GENERICO =
  "Não conseguimos registrar agora. Tente de novo ou fale com a sua cerimonialista.";
const ERRO_RECUSA = "Não foi possível registrar agora. Avise sua cerimonialista.";

/**
 * Recusa pela RPC pública. Compartilhado com o modal Clássico para os dois
 * traduzirem a falha do mesmo jeito: erro de negócio vem em português da
 * própria RPC; falha de transporte (inclusive a assinatura antiga de dois
 * parâmetros ainda no banco) vira uma frase só.
 */
export async function recusarProposta(
  hash: string,
  motivo: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("responder_orcamento", {
    p_hash: hash,
    p_status: "recusado",
    p_motivo: motivo,
  });
  if (error) {
    console.error("[eorganizei:recusa]", error);
    return { ok: false, erro: ERRO_RECUSA };
  }
  const doNegocio = (data as { error?: string } | null)?.error;
  if (typeof doNegocio === "string" && doNegocio) {
    return { ok: false, erro: doNegocio };
  }
  return { ok: true };
}

/**
 * Chamada única de aceite. O corpo segue o contrato da rota; a resposta
 * volta já no formato que os templates consomem. Erro em português vem
 * de `{ erro }`; qualquer outra falha (rede, 500 sem corpo) cai na frase
 * genérica — mensagem de transporte não vai para a tela da cliente.
 */
export async function enviarAceite(
  hash: string,
  corpo: {
    pacoteId: string;
    convidados: number | null;
    extrasIds: string[];
    formaPagamento: "vista" | "parcelado";
    parcelas: number | null;
    nome: string;
    nome2: string | null;
    cpf: string;
    email: string;
    telefone: string | null;
    assinatura1: string;
    assinatura2: string | null;
    termosAceitos: true;
    tipoEvento: string;
    dataEvento: string | null;
    contratoSha256: string | null;
  }
): Promise<{ ok: true; resultado: ResultadoAceite } | { ok: false; erro: string }> {
  try {
    const res = await fetch(`/api/orcamento/${encodeURIComponent(hash)}/aceite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const json = (await res.json().catch(() => null)) as
      | ({ ok: true } & Record<string, unknown>)
      | { ok: false; erro?: string }
      | null;
    if (!res.ok || !json || json.ok !== true) {
      const erro = json && "erro" in json ? json.erro : undefined;
      return {
        ok: false,
        erro: typeof erro === "string" && erro ? erro : ERRO_ACEITE_GENERICO,
      };
    }
    const r = json as Record<string, unknown>;
    return {
      ok: true,
      resultado: {
        recibo: String(r.recibo ?? ""),
        valorTotal: Number(r.valorTotal ?? 0),
        valorEntrada: r.valorEntrada == null ? null : Number(r.valorEntrada),
        valorParcela: r.valorParcela == null ? null : Number(r.valorParcela),
        jaExistia: r.jaExistia === true,
        whatsapp: typeof r.whatsapp === "string" && r.whatsapp ? r.whatsapp : null,
        emailCerimonialista:
          typeof r.emailCerimonialista === "string" && r.emailCerimonialista
            ? r.emailCerimonialista
            : null,
        emailEnviadoPara:
          typeof r.emailEnviadoPara === "string" && r.emailEnviadoPara
            ? r.emailEnviadoPara
            : null,
        contratoNome:
          typeof r.contratoNome === "string" && r.contratoNome ? r.contratoNome : null,
      },
    };
  } catch (e) {
    console.error("[eorganizei:aceite]", e);
    return { ok: false, erro: ERRO_ACEITE_GENERICO };
  }
}

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
  temPixel = false,
  nomeEmpresa,
  contrato = null,
  onFechar,
  onAceito,
  onRecusado,
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
  /** A empresa mede a campanha dela com o aceite: a cliente fica sabendo. */
  temPixel?: boolean;
  nomeEmpresa?: string;
  /** O contrato dela, quando a proposta tem: citado no texto e aberto pelo link. */
  contrato?: ContratoDaProposta;
  onFechar: () => void;
  onAceito: (r: ResultadoAceite) => void;
  onRecusado?: () => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial ?? "");
  const [nome2, setNome2] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const jaEnviou = useRef(false);

  // "Não vou fechar agora": um motivo curto e pronto. Depois de registrada,
  // o modal vira a confirmação — e a página é relida (router.refresh) para
  // a proposta chegar com status recusado e o botão de aceite apagado;
  // sem isso a tela ficaria idêntica, como se nada tivesse acontecido.
  const [recusando, setRecusando] = useState(false);
  const [recusado, setRecusado] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviandoRecusa, setEnviandoRecusa] = useState(false);
  const [erroRecusa, setErroRecusa] = useState<string | null>(null);

  const canvas1 = useRef<HTMLCanvasElement>(null);
  const canvas2 = useRef<HTMLCanvasElement>(null);
  const [assinou1, setAssinou1] = useState(false);
  const [assinou2, setAssinou2] = useState(false);

  // Quem assina em um (empresa, família…) nunca vê o 2º assinante, mesmo
  // que o template peça assinatura dupla — a rota recebe o 2º como null.
  const umAssinante = assinantesDoTipo(tipoEvento) === 1;
  const dupla = assinaturaDupla && !umAssinante;

  const podeConfirmar =
    nome.trim() !== "" &&
    cpf.trim() !== "" &&
    emailParece(email) &&
    assinou1 &&
    (!dupla || assinou2) &&
    aceitouTermos &&
    !enviando;

  async function confirmar() {
    if (jaEnviou.current || !podeConfirmar) return;
    if (!pacoteId) {
      setErro("Esta proposta ainda não tem um pacote configurado.");
      return;
    }
    const assinatura1 = canvas1.current?.toDataURL("image/png");
    if (!assinatura1) {
      setErro("Desenhe a assinatura antes de confirmar.");
      return;
    }
    jaEnviou.current = true;
    setEnviando(true);
    setErro(null);

    const r = await enviarAceite(hash, {
      pacoteId,
      convidados,
      extrasIds,
      formaPagamento,
      parcelas: formaPagamento === "vista" ? null : parcelas,
      nome: nome.trim(),
      nome2: dupla ? nome2.trim() || null : null,
      cpf: cpf.trim(),
      email: email.trim(),
      telefone: telefone.trim() || null,
      assinatura1,
      assinatura2: dupla ? canvas2.current?.toDataURL("image/png") ?? null : null,
      termosAceitos: true,
      tipoEvento,
      dataEvento,
      contratoSha256: contrato?.sha256 ?? null,
    });

    if (!r.ok) {
      jaEnviou.current = false;
      setEnviando(false);
      return setErro(r.erro);
    }

    setEnviando(false);
    onAceito(r.resultado);
  }

  async function recusar() {
    if (!motivo || enviandoRecusa) return;
    setEnviandoRecusa(true);
    setErroRecusa(null);
    const rotulo = MOTIVOS_RECUSA.find((m) => m.valor === motivo)?.rotulo ?? motivo;
    const r = await recusarProposta(hash, rotulo);
    setEnviandoRecusa(false);
    if (!r.ok) return setErroRecusa(r.erro);
    setRecusado(true);
    onRecusado?.();
    router.refresh();
  }

  const campoStyle = {
    border: `1px solid ${tema.borda}`,
    background: tema.fundo,
    color: tema.texto,
  };

  if (recusado) {
    return (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-4"
        style={{ background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)" }}
        onClick={onFechar}
        role="dialog"
        aria-modal="true"
        aria-label="Resposta registrada"
      >
        <div
          className="relative my-auto w-full max-w-[420px] p-6 sm:p-8"
          style={{ background: tema.card, borderRadius: tema.raio, color: tema.texto }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className={`${tema.classeTitulo ?? ""} text-[24px] leading-tight`}>
            Resposta registrada
          </h3>
          <p className="mt-3 text-[13px]" style={{ color: tema.textoSuave }}>
            {`Sua resposta chegou a ${nomeEmpresa?.trim() || "sua cerimonialista"}.`}
          </p>
          <button
            type="button"
            onClick={onFechar}
            className="mt-6 w-full rounded-full py-3.5 text-[12.5px] font-medium"
            style={{ background: tema.botaoFundo, color: tema.botaoTexto, letterSpacing: "0.08em" }}
          >
            FECHAR
          </button>
        </div>
      </div>
    );
  }

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
            <Rotulo tema={tema}>
              {`${rotuloAssinante(tipoEvento).toUpperCase()} *`}
            </Rotulo>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1.5 w-full rounded-lg px-3 py-2.5 text-[13.5px] outline-none"
              style={campoStyle}
            />
          </div>

          {dupla && (
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
            <Rotulo tema={tema}>
              {`${rotuloDocumentoAssinante(tipoEvento).toUpperCase()} *`}
            </Rotulo>
            <input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder={
                rotuloDocumentoAssinante(tipoEvento) === "CPF"
                  ? "000.000.000-00"
                  : undefined
              }
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
            <Rotulo tema={tema}>E-MAIL *</Rotulo>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="email"
              className="mt-1.5 w-full rounded-lg px-3 py-2.5 text-[13.5px] outline-none"
              style={campoStyle}
            />
            <p className="mt-1 text-[10.5px]" style={{ color: tema.textoSuave }}>
              O termo de aceite vai para este e-mail.
            </p>
          </div>
        </div>

        <Assinatura
          refCanvas={canvas1}
          tema={tema}
          rotulo={`${rotuloAssinatura} *`}
          onMudou={setAssinou1}
        />
        {dupla && (
          <Assinatura
            refCanvas={canvas2}
            tema={tema}
            rotulo={`${rotuloAssinatura2} *`}
            onMudou={setAssinou2}
          />
        )}

        <label className="mt-5 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={aceitouTermos}
            onChange={(e) => setAceitouTermos(e.target.checked)}
            className="mt-[3px] shrink-0"
            style={{ accentColor: tema.acento }}
          />
          <span className="text-[11.5px] leading-snug" style={{ color: tema.textoSuave }}>
            {termosAceiteTexto(contrato?.nome)}
          </span>
        </label>
        {contrato && (
          <a
            href={`/api/orcamento/${encodeURIComponent(hash)}/contrato`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-6 mt-1.5 inline-block text-[11.5px] underline underline-offset-2"
            style={{ color: tema.texto }}
          >
            Ler o contrato
          </a>
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

        {temPixel && (
          <p className="mt-3 text-center text-[10.5px]" style={{ color: tema.textoSuave }}>
            {`Seus dados são usados por ${nomeEmpresa?.trim() || "sua cerimonialista"} para o contrato e para medir a campanha dela.`}
          </p>
        )}
        {rodape && (
          <p className="mt-3 text-center text-[10.5px]" style={{ color: tema.textoSuave }}>
            {rodape}
          </p>
        )}

        {!recusando ? (
          <button
            type="button"
            onClick={() => setRecusando(true)}
            disabled={enviando}
            className="mt-4 block w-full text-center text-[11px] underline underline-offset-2"
            style={{ color: tema.textoSuave, opacity: enviando ? 0.4 : 1 }}
          >
            Não vou fechar agora
          </button>
        ) : (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              aria-label="Motivo"
              className="w-full flex-1 rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
              style={campoStyle}
            >
              <option value="">Qual o motivo?</option>
              {MOTIVOS_RECUSA.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.rotulo}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={recusar}
              disabled={!motivo || enviandoRecusa}
              className="rounded-full px-5 py-2.5 text-[11px] font-medium"
              style={{
                border: `1px solid ${tema.borda}`,
                color: tema.texto,
                letterSpacing: "0.08em",
                opacity: !motivo || enviandoRecusa ? 0.4 : 1,
                cursor: !motivo || enviandoRecusa ? "not-allowed" : "pointer",
              }}
            >
              {enviandoRecusa ? "ENVIANDO…" : "ENVIAR"}
            </button>
          </div>
        )}
        {erroRecusa && (
          <p className="mt-2 text-[11.5px]" style={{ color: "#9B2C2C" }}>
            {erroRecusa}
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
//
// O PNG sai transparente e vai para um PDF de fundo branco, então o traço
// é sempre escuro, seja qual for o tema — e a área de assinar é clara por
// CSS (não entra no PNG), para o traço aparecer também nos templates
// escuros. O dpr para em 2: com 3 (celulares atuais) o PNG passa do
// tamanho que o banco aceita e o aceite falha.
const TRACO = "#1f1f1f";
const PAPEL = "#FFFFFF";

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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.offsetWidth * dpr;
    c.height = c.offsetHeight * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = TRACO;
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
  }, [refCanvas, onMudou]);

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
          background: PAPEL,
          touchAction: "none",
        }}
      />
      <p className="mt-1.5 text-[10px]" style={{ color: tema.textoSuave }}>
        Desenhe acima com o dedo ou mouse
      </p>
    </div>
  );
}
