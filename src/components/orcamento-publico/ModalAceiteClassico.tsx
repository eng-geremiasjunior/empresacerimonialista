"use client";

// Modal de aceite do template Clássico — Creme e Dourado.
//
// Layout do handoff: painel escuro com o resumo financeiro ao vivo à
// esquerda, formulário creme à direita com as duas assinaturas lado a
// lado e checkbox de termos travando o botão. O comportamento (mesma
// validação, mesma RPC atômica, mesmo retry de janela de deploy) espelha
// o ModalAceiteProposta — só a pele é do design.
//
// Campos além do design (CPF, telefone, e-mail): o aceite real gera a
// ficha do contrato na mesma transação, então eles ficam — estilizados
// como o restante do formulário.

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { criarEventoAPartirDoOrcamento } from "@/lib/orcamento-para-evento";
import { formatDateBR } from "@/lib/orcamentos";
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
  localEvento,
  onFechar,
  onAceito,
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
  onFechar: () => void;
  onAceito: (recibo: string, valorTotal: number) => void;
}) {
  const [noiva, setNoiva] = useState("");
  const [noivo, setNoivo] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const jaEnviou = useRef(false);

  const canvasNoiva = useRef<HTMLCanvasElement>(null);
  const canvasNoivo = useRef<HTMLCanvasElement>(null);
  const [assinouNoiva, setAssinouNoiva] = useState(false);
  const [assinouNoivo, setAssinouNoivo] = useState(false);

  const podeConfirmar =
    noiva.trim() !== "" &&
    noivo.trim() !== "" &&
    cpf.trim() !== "" &&
    assinouNoiva &&
    assinouNoivo &&
    aceitouTermos &&
    !enviando;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onFechar]);

  async function confirmar() {
    if (jaEnviou.current || !podeConfirmar) return;
    jaEnviou.current = true;
    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const base = {
      p_hash: hash,
      p_pacote_id: pacoteId,
      p_convidados: convidados,
      p_extras_ids: extrasIds,
      p_forma_pagamento: forma,
      p_parcelas: forma === "vista" ? null : parcelas,
      p_nome_noiva: noiva.trim(),
      p_nome_noivo: noivo.trim() || null,
      p_assinatura_noiva: canvasNoiva.current?.toDataURL("image/png") ?? null,
      p_assinatura_noivo: canvasNoivo.current?.toDataURL("image/png") ?? null,
      p_observacoes: null,
    };

    let { data, error } = await supabase.rpc("registrar_aceite_proposta", {
      ...base,
      p_cpf: cpf.trim() || null,
      p_email: email.trim() || null,
      p_telefone: telefone.trim() || null,
    });

    // Janela de deploy: código novo no ar antes da migração com os campos
    // de cadastro — o retry sem eles mantém o aceite de pé nesse intervalo.
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

    // Evento automático — uma falha aqui não derruba o aceite já gravado.
    try {
      await criarEventoAPartirDoOrcamento(hash, tipoEvento, dataEvento);
    } catch {
      /* a cerimonialista gera pelo painel se precisar */
    }

    setEnviando(false);
    const d = data as { recibo: string; valor_total: number };
    onAceito(d.recibo, Number(d.valor_total));
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
              📄 CONFIRMAÇÃO DE PROPOSTA
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
              Revise o resumo financeiro ao vivo e assine digitalmente. Seu
              casamento será travado após a entrada.
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
                NOME DA NOIVA
                <input
                  value={noiva}
                  onChange={(e) => setNoiva(e.target.value)}
                  placeholder="Nome completo"
                  style={campo}
                />
              </label>
              <label style={rotulo}>
                NOME DO NOIVO
                <input
                  value={noivo}
                  onChange={(e) => setNoivo(e.target.value)}
                  placeholder="Nome completo"
                  style={campo}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={rotulo}>
                  CPF
                  <input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
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
                E-MAIL
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  inputMode="email"
                  style={campo}
                />
              </label>
            </div>

            <div className="kd-modal-assin" style={{ marginTop: 16 }}>
              <Assinatura
                refCanvas={canvasNoiva}
                rotulo="ASSINATURA NOIVA"
                onMudou={setAssinouNoiva}
              />
              <Assinatura
                refCanvas={canvasNoivo}
                rotulo="ASSINATURA NOIVO"
                onMudou={setAssinouNoivo}
              />
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
                Li e aceito os <b>termos da assessoria</b> e autorizo o uso das
                assinaturas para travamento da data
                {dataEvento ? ` de ${formatDateBR(dataEvento)}` : ""}
                {localEvento ? ` no ${localEvento}` : ""}.
              </span>
            </label>

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
              {enviando ? "ENVIANDO..." : "CONFIRMAR E GERAR CONTRATO →"}
            </button>
            <button
              onClick={onFechar}
              style={{
                marginTop: 8, width: "100%", background: "none", border: "none",
                fontSize: 11, color: COR.texto3, letterSpacing: "0.1em",
                cursor: "pointer", padding: "8px 0",
              }}
            >
              CANCELAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Canvas de assinatura no traço do design: caixa 110px, borda dourada
// tracejada, fundo quase-branco. devicePixelRatio para não borrar e
// touch-action none para o dedo desenhar em vez de rolar.
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
    const dpr = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr;
    c.height = c.offsetHeight * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = COR.escuro;
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
