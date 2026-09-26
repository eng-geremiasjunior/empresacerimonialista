"use client";

// A entrada do portal v2 (desenho "Portal da Família v2"): "Antes de
// começar" para o responsável, no primeiro acesso, e "Quase lá" para a
// debutante enquanto nenhum responsável confirmou (175). Cartão de vidro
// sobre o fundo escolhido pela família.

import { useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { confirmarResponsavel } from "@/app/(portal)/portal/[eventoId]/termo-actions";
import { sairDoPortal } from "@/app/(portal)/portal/actions";
import { tokensDaCor, type EstiloDoPortal } from "@/lib/cor-da-festa";
import { Atmosfera } from "./Atmosfera";
import { Icone } from "./icones";

const TEXTO_DO_TERMO =
  "Sou pai, mãe ou responsável legal pela debutante e autorizo que ela e a família usem este portal para organizar a festa com a cerimonialista";

export function EntradaV2({
  eventoId,
  tipo,
  modo,
  estilo,
  marcaNome,
  titulo,
  pessoa,
  nomeDeQuemAbriu,
  whatsappLink,
  contatoNome,
}: {
  eventoId: string;
  tipo: string;
  modo: "confirmar" | "esperar";
  estilo: EstiloDoPortal;
  marcaNome: string | null;
  titulo: string;
  pessoa: string | null;
  nomeDeQuemAbriu: string | null;
  whatsappLink: string | null;
  contatoNome: string | null;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [marcado, setMarcado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const primeiro = nomeDeQuemAbriu?.split(" ")[0] ?? null;

  const botao: CSSProperties = {
    minHeight: 52, border: 0, borderRadius: 16, fontSize: 15, fontWeight: 500, cursor: "pointer",
    transition: "background .3s",
  };

  return (
    <div className="pv2 portal-raiz" data-tipo={tipo} style={tokensDaCor(estilo.cor) as CSSProperties}>
      <Atmosfera fundo={estilo.fundo} escuro={false} retratoUrl={null} monograma={(pessoa ?? titulo).charAt(0).toUpperCase()} />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
        <div
          style={{
            width: "100%", maxWidth: 420, padding: "32px 26px", borderRadius: 30, display: "flex", flexDirection: "column", gap: 22,
            background: "rgba(255,255,255,.78)", WebkitBackdropFilter: "blur(22px)", backdropFilter: "blur(22px)",
            border: "1px solid rgba(255,255,255,.9)", boxShadow: "0 40px 80px -40px rgba(40,30,36,.55)",
            animation: "pv2-entrar .9s cubic-bezier(.2,.8,.2,1) .1s backwards",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--pv2-titulo)", fontSize: 30, lineHeight: 1, letterSpacing: ".2em", textTransform: "uppercase", color: "#2b241f" }}>
              {marcaNome ?? ""}
            </div>
          </div>

          {modo === "confirmar" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontFamily: "var(--pv2-titulo)", fontSize: 32, lineHeight: 1.1, color: "#2b241f" }}>Antes de começar</div>
              <div style={{ fontSize: 15, color: "#4c443c" }}>
                {primeiro ? `${primeiro}, este é o portal da festa${pessoa ? ` da ${pessoa}` : ""}.` : `Este é o portal da festa${pessoa ? ` da ${pessoa}` : ""}.`}
              </div>
              <button
                type="button"
                role="checkbox"
                aria-checked={marcado}
                onClick={() => setMarcado((m) => !m)}
                style={{
                  display: "flex", gap: 14, alignItems: "flex-start", padding: 18, borderRadius: 18, background: "#fff",
                  textAlign: "left", cursor: "pointer", transition: "border-color .3s",
                  border: `1.5px solid ${marcado ? "var(--destaque-texto)" : "#e7dfd2"}`,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 26, height: 26, flex: "none", borderRadius: 8, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 15, color: "#fff", transition: "background .3s",
                    border: `1.5px solid ${marcado ? "var(--destaque-texto)" : "#cfc6ba"}`,
                    background: marcado ? "var(--destaque-texto)" : "#fff",
                  }}
                >
                  {marcado ? "✓" : ""}
                </span>
                <span style={{ fontSize: 15, lineHeight: 1.55, color: "#3a312a" }}>{TEXTO_DO_TERMO}</span>
              </button>
              {erro && (
                <p role="alert" style={{ margin: 0, fontSize: 14, color: "#96605a" }}>
                  {erro}
                </p>
              )}
              <button
                type="button"
                disabled={!marcado || pendente}
                onClick={() => {
                  setErro(null);
                  iniciar(async () => {
                    const r = await confirmarResponsavel(eventoId);
                    if ("error" in r) {
                      setErro(r.error);
                      return;
                    }
                    router.refresh();
                  });
                }}
                style={{
                  ...botao,
                  background: marcado ? "var(--destaque-texto)" : "#ede8e2",
                  color: marcado ? "#fff" : "#b4ada4",
                  cursor: marcado ? "pointer" : "default",
                }}
              >
                {pendente ? "Confirmando…" : "Continuar"}
              </button>
              <form action={sairDoPortal} style={{ textAlign: "center" }}>
                <button type="submit" style={{ minHeight: 44, border: 0, background: "none", fontSize: 14, color: "#6b6259", cursor: "pointer" }}>
                  Sair
                </button>
              </form>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
              {primeiro && (
                <div style={{ fontFamily: "var(--pv2-titulo)", fontStyle: "italic", fontSize: 22, color: "#4c443c" }}>Oi, {primeiro}.</div>
              )}
              <div style={{ fontFamily: "var(--pv2-titulo)", fontSize: 36, lineHeight: 1.1, color: "#2b241f" }}>Quase lá</div>
              <div style={{ fontSize: 16, lineHeight: 1.55, color: "#3a312a" }}>
                Quem abre o portal primeiro é o pai, a mãe ou o responsável.
              </div>
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    minHeight: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16,
                    background: "var(--destaque-fundo)", fontSize: 15, color: "var(--destaque-texto)", textDecoration: "none",
                  }}
                >
                  <Icone nome="zap" tamanho={18} traco={1.6} />
                  WhatsApp {contatoNome ? `da ${contatoNome.split(" ")[0]}` : "da cerimonialista"}
                </a>
              )}
              <button
                type="button"
                disabled={pendente}
                onClick={() => iniciar(() => router.refresh())}
                style={{ ...botao, background: "var(--destaque-texto)", color: "#fff", opacity: pendente ? 0.6 : 1 }}
              >
                Tentar de novo
              </button>
              <form action={sairDoPortal}>
                <button type="submit" style={{ minHeight: 44, border: 0, background: "none", fontSize: 14, color: "#6b6259", cursor: "pointer" }}>
                  Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
