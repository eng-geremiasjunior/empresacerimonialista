"use client";

// Modal de aceite do template Clássico — Creme e Dourado.
//
// Layout do handoff: painel escuro com o resumo financeiro ao vivo à
// esquerda, formulário creme à direita com as duas assinaturas lado a
// lado e a caixa dos termos travando o botão. O comportamento (mesma
// validação, mesma rota de aceite, mesma recusa com motivo) espelha o
// ModalAceiteProposta — só a pele é do design.
//
// Campos além do design (CPF, telefone, e-mail): o aceite vira um termo
// assinado com esses dados, e o e-mail é para onde ele vai — então os
// três ficam, estilizados como o restante do formulário.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  emailParece,
  enviarAceite,
  MOTIVOS_RECUSA,
  recusarProposta,
  type ContratoDaProposta,
  type ResultadoAceite,
} from "@/components/orcamento-publico/ModalAceiteProposta";
import { termosAceiteTexto } from "@/lib/aceite-termo-texto";
import {
  assinantesDoTipo,
  rotuloAssinante,
  rotuloDocumentoAssinante,
} from "@/lib/papel";
import { brl } from "@/lib/proposta";

const SERIF = "var(--font-titulo), 'Cormorant Garamond', serif";

const COR = {
  escuro: "#3C2415",
  pagina: "#F9F5F0",
  texto2: "#6B5A4B",
  texto3: "#8B7355",
  dourado: "#B8935A",
  borda: "#E8DDD2",
  assinatura: "#FFFCF8",
};

export function ModalAceiteClassico({
  hash,
  nomeContato,
  pacoteId,
  pacoteNome,
  convidados,
  extrasIds,
  extrasNomes,
  forma,
  parcelas,
  total,
  entrada,
  parcela,
  entradaPct,
  tipoEvento,
  dataEvento,
  temPixel = false,
  nomeEmpresa,
  contrato = null,
  onFechar,
  onAceito,
  onRecusado,
}: {
  hash: string;
  nomeContato: string;
  pacoteId: string;
  pacoteNome: string;
  convidados: number;
  extrasIds: string[];
  extrasNomes: string[];
  forma: "vista" | "parcelado";
  parcelas: number;
  total: number;
  entrada: number;
  parcela: number | null;
  entradaPct: number;
  tipoEvento: string;
  dataEvento: string | null;
  localEvento: string | null;
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
  const [noiva, setNoiva] = useState("");
  const [noivo, setNoivo] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
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

  const canvasNoiva = useRef<HTMLCanvasElement>(null);
  const canvasNoivo = useRef<HTMLCanvasElement>(null);
  const [assinouNoiva, setAssinouNoiva] = useState(false);
  const [assinouNoivo, setAssinouNoivo] = useState(false);

  // Um casal assina em dois; uma empresa (ou qualquer outro contratante)
  // assina em um. A rota é a mesma — o 2º assinante vai null.
  const umAssinante = assinantesDoTipo(tipoEvento) === 1;

  const podeConfirmar =
    noiva.trim() !== "" &&
    (umAssinante || noivo.trim() !== "") &&
    cpf.trim() !== "" &&
    emailParece(email) &&
    assinouNoiva &&
    (umAssinante || assinouNoivo) &&
    aceitouTermos &&
    !enviando;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onFechar]);

  async function confirmar() {
    if (jaEnviou.current || !podeConfirmar) return;
    const assinatura1 = canvasNoiva.current?.toDataURL("image/png");
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
      formaPagamento: forma,
      parcelas: forma === "vista" ? null : parcelas,
      nome: noiva.trim(),
      nome2: umAssinante ? null : noivo.trim() || null,
      cpf: cpf.trim(),
      email: email.trim(),
      telefone: telefone.trim() || null,
      assinatura1,
      // Com um assinante o 2º canvas nem existe — e mandar um PNG vazio
      // dobraria o corpo à toa.
      assinatura2: umAssinante
        ? null
        : canvasNoivo.current?.toDataURL("image/png") ?? null,
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
    const rotuloMotivo =
      MOTIVOS_RECUSA.find((m) => m.valor === motivo)?.rotulo ?? motivo;
    const r = await recusarProposta(hash, rotuloMotivo);
    setEnviandoRecusa(false);
    if (!r.ok) return setErroRecusa(r.erro);
    setRecusado(true);
    onRecusado?.();
    router.refresh();
  }

  const rotulo: React.CSSProperties = {
    display: "block", fontSize: 11, letterSpacing: "0.1em",
    color: COR.texto3, textTransform: "uppercase",
  };
  const campo: React.CSSProperties = {
    display: "block", width: "100%", marginTop: 4, boxSizing: "border-box",
    border: `1px solid ${COR.borda}`, borderRadius: 12, padding: "10px 14px",
    fontSize: 14, outline: "none", background: "#fff", color: COR.escuro,
    fontFamily: "inherit",
  };
  const linkDiscreto: React.CSSProperties = {
    width: "100%", background: "none", border: "none",
    fontSize: 11, color: COR.texto3, letterSpacing: "0.1em",
    cursor: "pointer", padding: "8px 0",
  };

  if (recusado) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resposta registrada"
        onClick={(e) => e.target === e.currentTarget && onFechar()}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(249,245,240,0.95)", backdropFilter: "blur(20px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16, overflow: "auto",
        }}
      >
        <div
          style={{
            background: "#fff", borderRadius: 28, maxWidth: 440, width: "100%",
            border: `1px solid ${COR.borda}`, padding: 32,
            boxShadow: "0 30px 100px -20px rgba(60,36,21,0.4)",
          }}
        >
          <h4
            style={{
              margin: 0, fontFamily: SERIF, fontWeight: 600,
              fontSize: 28, lineHeight: 1, color: COR.escuro,
            }}
          >
            Resposta registrada
          </h4>
          <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: COR.texto2 }}>
            {`Sua resposta chegou a ${nomeEmpresa?.trim() || "sua cerimonialista"}.`}
          </p>
          <button
            type="button"
            onClick={onFechar}
            style={{
              marginTop: 20, width: "100%", border: "none", cursor: "pointer",
              background: COR.escuro, color: "#fff", borderRadius: 999,
              padding: "14px 0", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.14em",
            }}
          >
            FECHAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirmação de proposta"
      onClick={(e) => e.target === e.currentTarget && onFechar()}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(249,245,240,0.95)", backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, overflow: "auto",
      }}
    >
      <style>{`
        .kd-modal2{display:grid;grid-template-columns:1fr}
        @media (min-width:1024px){.kd-modal2{grid-template-columns:0.9fr 1.1fr}}
        .kd-modal-assin{display:grid;grid-template-columns:1fr;gap:12px}
        @media (min-width:640px){.kd-modal-assin{grid-template-columns:repeat(2,1fr)}}
      `}</style>
      <div
        style={{
          background: "#fff", borderRadius: 28, maxWidth: 980, width: "100%",
          border: `1px solid ${COR.borda}`,
          boxShadow: "0 30px 100px -20px rgba(60,36,21,0.4)",
          animation: "kdFadeUp 0.4s ease", overflow: "hidden",
          margin: "16px 0", maxHeight: "94vh", overflowY: "auto",
        }}
      >
        <div className="kd-modal2">
          {/* ---------------- painel escuro: resumo ao vivo ---------------- */}
          <div style={{ background: COR.escuro, color: COR.pagina, padding: 32 }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 11, letterSpacing: "0.1em", color: COR.dourado,
              }}
            >
              CONFIRMAÇÃO DE PROPOSTA
            </div>
            <h4
              style={{
                margin: "12px 0 0", fontFamily: SERIF, fontWeight: 600,
                fontSize: 30, lineHeight: 0.95,
              }}
            >
              Quase lá,
              <br />
              {nomeContato}!
            </h4>
            <p
              style={{
                margin: "12px 0 0", fontSize: 12, lineHeight: 1.5,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Revise o resumo financeiro ao vivo e assine digitalmente. A data
              fica reservada após a entrada.
            </p>
            <div
              style={{
                marginTop: 24, background: "rgba(255,255,255,0.1)",
                borderRadius: 16, padding: 16, display: "flex",
                flexDirection: "column", gap: 8, fontSize: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>Pacote</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>
                  {pacoteNome} • {convidados} convidados
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>Adicionais</span>
                <span style={{ textAlign: "right" }}>
                  {extrasNomes.length > 0 ? extrasNomes.join(" · ") : "—"}
                </span>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "4px 0" }} />
              <div
                style={{
                  display: "flex", justifyContent: "space-between",
                  fontFamily: SERIF, fontSize: 20,
                }}
              >
                <span>Total</span>
                <span>{brl(total)}</span>
              </div>
              <div
                style={{
                  display: "grid", gridTemplateColumns: "repeat(2,1fr)",
                  gap: 8, paddingTop: 8,
                }}
              >
                <div style={{ background: "#fff", color: COR.escuro, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.1em", opacity: 0.6 }}>
                    ENTRADA {entradaPct}%
                  </div>
                  <div style={{ fontWeight: 600 }}>{brl(entrada)}</div>
                </div>
                <div style={{ background: COR.dourado, borderRadius: 12, padding: 10 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.8)" }}>
                    {forma === "parcelado" ? `${parcelas}x SEM JUROS` : "RESTANTE À VISTA"}
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {forma === "parcelado" && parcela !== null
                      ? brl(parcela)
                      : brl(total - entrada)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- formulário ---------------- */}
          <div style={{ padding: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={rotulo}>
                {umAssinante
                  ? `${rotuloAssinante(tipoEvento).toUpperCase()} *`
                  : "NOME DA NOIVA *"}
                <input
                  value={noiva}
                  onChange={(e) => setNoiva(e.target.value)}
                  placeholder="Nome completo"
                  style={campo}
                />
              </label>
              {!umAssinante && (
                <label style={rotulo}>
                  NOME DO NOIVO *
                  <input
                    value={noivo}
                    onChange={(e) => setNoivo(e.target.value)}
                    placeholder="Nome completo"
                    style={campo}
                  />
                </label>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={rotulo}>
                  {`${rotuloDocumentoAssinante(tipoEvento).toUpperCase()} *`}
                  <input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder={
                      rotuloDocumentoAssinante(tipoEvento) === "CPF"
                        ? "000.000.000-00"
                        : undefined
                    }
                    inputMode="numeric"
                    style={campo}
                  />
                </label>
                <label style={rotulo}>
                  TELEFONE / WHATSAPP
                  <input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 90000-0000"
                    inputMode="tel"
                    style={campo}
                  />
                </label>
              </div>
              <label style={rotulo}>
                E-MAIL *
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  inputMode="email"
                  autoComplete="email"
                  style={campo}
                />
                <span
                  style={{
                    display: "block", marginTop: 4, fontSize: 11,
                    letterSpacing: 0, textTransform: "none", color: COR.texto2,
                  }}
                >
                  O termo de aceite vai para este e-mail.
                </span>
              </label>
            </div>

            <div
              className="kd-modal-assin"
              style={{ marginTop: 16, gridTemplateColumns: umAssinante ? "1fr" : undefined }}
            >
              <Assinatura
                refCanvas={canvasNoiva}
                rotulo={umAssinante ? "ASSINATURA *" : "ASSINATURA NOIVA *"}
                onMudou={setAssinouNoiva}
              />
              {!umAssinante && (
                <Assinatura
                  refCanvas={canvasNoivo}
                  rotulo="ASSINATURA NOIVO *"
                  onMudou={setAssinouNoivo}
                />
              )}
            </div>

            <label
              style={{
                marginTop: 20, display: "flex", gap: 8, alignItems: "flex-start",
                background: COR.pagina, border: `1px solid ${COR.borda}`,
                borderRadius: 16, padding: 12, cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={(e) => setAceitouTermos(e.target.checked)}
                style={{ marginTop: 2, accentColor: COR.escuro }}
              />
              <span style={{ fontSize: 11, lineHeight: 1.4, color: COR.texto2 }}>
                {termosAceiteTexto(contrato?.nome)}
              </span>
            </label>
            {contrato && (
              <a
                href={`/api/orcamento/${encodeURIComponent(hash)}/contrato`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block", marginTop: 8, marginLeft: 12,
                  fontSize: 11.5, color: COR.escuro, textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                Ler o contrato
              </a>
            )}

            {erro && (
              <p style={{ margin: "12px 0 0", fontSize: 12, color: "#A5544B" }}>
                {erro}
              </p>
            )}

            <button
              disabled={!podeConfirmar}
              onClick={confirmar}
              style={{
                marginTop: 20, width: "100%", border: "none", cursor: "pointer",
                background: COR.escuro, color: "#fff", borderRadius: 999,
                padding: "14px 0", fontSize: 12, fontWeight: 600,
                letterSpacing: "0.14em",
                opacity: podeConfirmar ? 1 : 0.4,
              }}
            >
              {enviando ? "ENVIANDO..." : "CONFIRMAR E ASSINAR"}
            </button>

            {temPixel && (
              <p
                style={{
                  margin: "10px 0 0", fontSize: 11, lineHeight: 1.4,
                  color: COR.texto3, textAlign: "center",
                }}
              >
                {`Seus dados são usados por ${nomeEmpresa?.trim() || "sua cerimonialista"} para o contrato e para medir a campanha dela.`}
              </p>
            )}

            {!recusando ? (
              <button
                type="button"
                onClick={() => setRecusando(true)}
                disabled={enviando}
                style={{
                  ...linkDiscreto, marginTop: 8,
                  textDecoration: "underline", textUnderlineOffset: 3,
                  opacity: enviando ? 0.4 : 1,
                }}
              >
                Não vou fechar agora
              </button>
            ) : (
              <div
                style={{
                  marginTop: 12, display: "flex", gap: 8, alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  aria-label="Motivo"
                  style={{ ...campo, marginTop: 0, flex: "1 1 160px", width: "auto" }}
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
                  style={{
                    border: `1px solid ${COR.borda}`, background: "#fff",
                    color: COR.escuro, borderRadius: 999, padding: "10px 20px",
                    fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                    cursor: !motivo || enviandoRecusa ? "not-allowed" : "pointer",
                    opacity: !motivo || enviandoRecusa ? 0.4 : 1,
                  }}
                >
                  {enviandoRecusa ? "ENVIANDO..." : "ENVIAR"}
                </button>
              </div>
            )}
            {erroRecusa && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#A5544B" }}>
                {erroRecusa}
              </p>
            )}

            <button onClick={onFechar} style={{ ...linkDiscreto, marginTop: 4 }}>
              CANCELAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Canvas de assinatura no traço do design: caixa 110px, borda dourada
// tracejada, fundo quase-branco. touch-action none para o dedo desenhar
// em vez de rolar.
//
// O traço é sempre escuro porque o PNG (transparente) vai para um PDF de
// fundo branco. O dpr para em 2: com 3 (celulares atuais) o PNG passa do
// tamanho que o banco aceita e o aceite falha.
const TRACO = "#1f1f1f";

function Assinatura({
  refCanvas,
  rotulo,
  onMudou,
}: {
  refCanvas: React.RefObject<HTMLCanvasElement>;
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
    ctx.lineWidth = 1.5;
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.1em", color: COR.texto3 }}>
          {rotulo}
        </span>
        <button
          type="button"
          onClick={limpar}
          style={{
            fontSize: 10, color: COR.dourado, letterSpacing: "0.1em",
            background: "none", border: "none", cursor: "pointer",
          }}
        >
          LIMPAR
        </button>
      </div>
      <div
        style={{
          marginTop: 4, border: "1px dashed rgba(184,147,90,0.5)",
          borderRadius: 16, background: COR.assinatura,
          height: 110, overflow: "hidden",
        }}
      >
        <canvas
          ref={refCanvas}
          style={{
            width: "100%", height: "100%", touchAction: "none",
            cursor: "crosshair", display: "block",
          }}
        />
      </div>
    </div>
  );
}
