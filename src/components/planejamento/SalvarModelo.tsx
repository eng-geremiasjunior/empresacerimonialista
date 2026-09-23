"use client";

// "Salvar como meu modelo" (170). O que ela criou neste evento — assunto,
// decisão, campo — passa a nascer nos próximos do mesmo tipo; o que ela
// marcou "não se aplica" pode sair do modelo, se ela escolher. Primeiro a
// prévia (o que muda), depois o salvar: mexer no método de todos os
// eventos futuros não pode ser um clique às cegas.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previaDoModelo,
  salvarComoModelo,
  type PreviaDoModelo,
  type ResumoDoModelo,
} from "@/app/(app)/eventos/[id]/planejamento/actions";
import { C, F_MONO, F_TITLE, F_UI, monoLabel } from "./celebra";

function dataCurta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

const secao: React.CSSProperties = { ...monoLabel, color: C.secundario, marginBottom: 6 };
const linha: React.CSSProperties = {
  fontFamily: F_UI,
  fontSize: 13.5,
  lineHeight: "20px",
  color: C.tinta,
};
const onde: React.CSSProperties = { color: C.meta };

export function SalvarModelo({
  eventId,
  tipoRotulo,
  onFechar,
}: {
  eventId: string;
  /** "Casamento", "Debutante"… */
  tipoRotulo: string;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [previa, setPrevia] = useState<PreviaDoModelo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tirar, setTirar] = useState<Set<string>>(new Set());
  const [resumo, setResumo] = useState<ResumoDoModelo | null>(null);
  const [salvando, iniciar] = useTransition();

  useEffect(() => {
    let vivo = true;
    previaDoModelo(eventId).then((r) => {
      if (!vivo) return;
      if ("error" in r) setErro(r.error);
      else setPrevia(r.previa);
    });
    return () => {
      vivo = false;
    };
  }, [eventId]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  const nada =
    previa !== null &&
    previa.objetivos.length === 0 &&
    previa.decisoes.length === 0 &&
    previa.campos.length === 0 &&
    previa.podem_sair.length === 0 &&
    previa.voltam.length === 0;

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarComoModelo(eventId, [...tirar]);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setResumo(r.resumo);
      router.refresh();
    });
  }

  const tipo = tipoRotulo.toLowerCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Salvar como meu modelo de ${tipo}`}
      onClick={onFechar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(35,38,42,.38)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "72px 16px 16px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          background: C.card,
          border: `1px solid ${C.bordaMedia}`,
          borderRadius: 12,
          padding: "22px 24px",
          boxShadow: "0 24px 60px rgba(35,38,42,.22)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div>
          <h2 style={{ fontFamily: F_TITLE, fontWeight: 600, fontSize: 18, color: C.tinta }}>
            Salvar como meu modelo de {tipo}
          </h2>
          <a
            href={`/configuracoes/modelo?tipo=${previa?.tipo ?? ""}`}
            style={{ display: "inline-block", marginTop: 4, fontFamily: F_UI, fontSize: 12.5, color: C.secundario, textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            ver meu modelo
          </a>
          {previa?.ultimo && (
            <p style={{ marginTop: 4, fontFamily: F_MONO, fontSize: 11, color: C.meta }}>
              última vez {dataCurta(previa.ultimo.salvo_em)}
              {previa.ultimo.evento ? ` · a partir de ${previa.ultimo.evento}` : ""}
            </p>
          )}
        </div>

        {resumo ? (
          <>
            <p style={linha}>
              Modelo salvo. Os próximos eventos deste tipo já nascem assim.
              {resumo.sairam > 0 && ` ${plural(resumo.sairam, "decisão sai", "decisões saem")} do modelo.`}
            </p>
            <Rodape>
              <BotaoPrimario onClick={onFechar}>Fechar</BotaoPrimario>
            </Rodape>
          </>
        ) : !previa && !erro ? (
          <p style={{ ...linha, color: C.meta }}>Lendo o que mudou neste evento…</p>
        ) : previa && !previa.pode_salvar ? (
          <>
            <p style={linha}>Só a proprietária da conta muda o modelo.</p>
            <Rodape>
              <BotaoPrimario onClick={onFechar}>Fechar</BotaoPrimario>
            </Rodape>
          </>
        ) : nada ? (
          <>
            <p style={linha}>Nada de novo neste evento para o modelo.</p>
            <Rodape>
              <BotaoPrimario onClick={onFechar}>Fechar</BotaoPrimario>
            </Rodape>
          </>
        ) : previa ? (
          <>
            {(previa.objetivos.length > 0 || previa.decisoes.length > 0 || previa.campos.length > 0) && (
              <div>
                <p style={secao}>entram no modelo</p>
                <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {previa.objetivos.map((o) => (
                    <li key={`o-${o}`} style={linha}>
                      {o} <span style={onde}>· assunto</span>
                    </li>
                  ))}
                  {previa.decisoes.map((d, i) => (
                    <li key={`d-${i}`} style={linha}>
                      {d.titulo} <span style={onde}>· {d.objetivo}</span>
                    </li>
                  ))}
                  {previa.campos.map((c, i) => (
                    <li key={`c-${i}`} style={linha}>
                      {c.label} <span style={onde}>· campo de {c.decisao}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {previa.podem_sair.length > 0 && (
              <div>
                <p style={secao}>tirar também do modelo</p>
                <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {previa.podem_sair.map((d) => (
                    <li key={d.id}>
                      <label style={{ ...linha, display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={tirar.has(d.id)}
                          onChange={(e) => {
                            const novo = new Set(tirar);
                            if (e.target.checked) novo.add(d.id);
                            else novo.delete(d.id);
                            setTirar(novo);
                          }}
                          style={{ marginTop: 3, accentColor: C.ameixa }}
                        />
                        <span>
                          {d.titulo} <span style={onde}>· {d.objetivo}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p style={{ marginTop: 6, fontFamily: F_UI, fontSize: 12, color: C.meta }}>
                  Nos próximos eventos, nasce como “não se aplica”.
                </p>
              </div>
            )}

            {previa.voltam.length > 0 && (
              <div>
                <p style={secao}>voltam ao modelo</p>
                <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {previa.voltam.map((d, i) => (
                    <li key={`v-${i}`} style={linha}>
                      {d.titulo} <span style={onde}>· {d.objetivo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Rodape>
              <button
                type="button"
                onClick={onFechar}
                style={{
                  height: 38,
                  padding: "0 14px",
                  border: "none",
                  background: "transparent",
                  fontFamily: F_UI,
                  fontSize: 13,
                  color: C.secundario,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <BotaoPrimario onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar no modelo"}
              </BotaoPrimario>
            </Rodape>
          </>
        ) : null}

        {erro && <p style={{ fontFamily: F_UI, fontSize: 13, color: C.atrasadaFg }}>{erro}</p>}
      </div>
    </div>
  );
}

function Rodape({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>{children}</div>;
}

function BotaoPrimario({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 38,
        padding: "0 16px",
        border: "none",
        borderRadius: 8,
        background: C.ameixa,
        color: "#fff",
        fontFamily: F_TITLE,
        fontWeight: 600,
        fontSize: 13,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
