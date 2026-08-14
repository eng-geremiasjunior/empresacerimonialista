"use client";

// O programa do dia, na voz da cliente. Ela lê e sugere — nunca edita.
//
// Cada momento aceita "sugerir outro horário"; no fim, "pedir um
// momento". A sugestão fica visível com a resposta da cerimonialista
// quando vier: nada é enviado para um vazio.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  MomentoDoDia,
  SugestaoCronograma,
} from "@/lib/supabase/programa-do-dia";
import {
  pedirMomento,
  sugerirHorario,
} from "@/app/(portal)/portal/[eventoId]/cronograma/actions";
import { Cartao, Rotulo } from "./Nucleo";

const campoStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "10px 12px",
  minHeight: "var(--toque-min)",
  fontSize: "var(--ts-item-desc)",
  fontFamily: "var(--fonte-corpo)",
  color: "var(--cor-texto)",
};

const botaoStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "9px 14px",
  minHeight: "var(--toque-min)",
  fontSize: "var(--ts-botao)",
  color: "var(--cor-texto-secundario)",
  cursor: "pointer",
  fontFamily: "var(--fonte-corpo)",
};

function hhmm(hora: string | null): string {
  return hora ? hora.slice(0, 5) : "";
}

export function ProgramaDoDia({
  eventoId,
  momentos,
  sugestoes,
}: {
  eventoId: string;
  momentos: MomentoDoDia[];
  sugestoes: SugestaoCronograma[];
}) {
  const [pedindo, setPedindo] = useState(false);

  // as sugestões que ainda esperam resposta, por momento
  const pendentePorItem = new Map<string, SugestaoCronograma>();
  for (const s of sugestoes) {
    if (s.estado === "pendente" && s.roteiroItemId) {
      pendentePorItem.set(s.roteiroItemId, s);
    }
  }
  const respondidas = sugestoes.filter((s) => s.estado !== "pendente");
  const momentosNovos = sugestoes.filter(
    (s) => s.tipo === "momento_novo" && s.estado === "pendente"
  );

  return (
    <>
      {momentos.length === 0 ? (
        <Cartao padding="var(--esp-6)">
          <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
            A sua cerimonialista ainda está montando o programa. Assim que ele
            existir, vocês veem tudo por aqui.
          </p>
        </Cartao>
      ) : (
        <Cartao padding="var(--esp-6) var(--esp-8)">
          {momentos.map((m, i) => (
            <Momento
              key={m.id}
              eventoId={eventoId}
              momento={m}
              ultimo={i === momentos.length - 1}
              pendente={pendentePorItem.get(m.id) ?? null}
            />
          ))}
        </Cartao>
      )}

      {momentosNovos.length > 0 && (
        <Cartao padding="var(--esp-6) var(--esp-8)">
          <Rotulo>Vocês pediram</Rotulo>
          {momentosNovos.map((s) => (
            <p
              key={s.id}
              style={{
                margin: "var(--esp-2) 0 0",
                fontSize: "var(--ts-item-desc)",
                color: "var(--cor-texto-secundario)",
              }}
            >
              {s.tituloSugerido}
              {s.horarioSugerido ? ` · ${hhmm(s.horarioSugerido)}` : ""} — com a
              cerimonialista
            </p>
          ))}
        </Cartao>
      )}

      {respondidas.length > 0 && (
        <Cartao padding="var(--esp-6) var(--esp-8)">
          <Rotulo>Já respondido</Rotulo>
          {respondidas.map((s) => (
            <p
              key={s.id}
              style={{
                margin: "var(--esp-2) 0 0",
                fontSize: "var(--ts-item-desc)",
                color: "var(--cor-texto-secundario)",
              }}
            >
              {s.tipo === "momento_novo"
                ? s.tituloSugerido
                : `Mudança para ${hhmm(s.horarioSugerido)}`}
              {" — "}
              {s.estado === "aceita"
                ? "entrou no programa"
                : `não deu: ${s.motivoRecusa}`}
            </p>
          ))}
        </Cartao>
      )}

      <Cartao padding="var(--esp-6)">
        {pedindo ? (
          <FormMomento eventoId={eventoId} onFechar={() => setPedindo(false)} />
        ) : (
          <button
            type="button"
            style={{ ...botaoStyle, alignSelf: "flex-start" }}
            onClick={() => setPedindo(true)}
          >
            Pedir um momento
          </button>
        )}
      </Cartao>
    </>
  );
}

function Momento({
  eventoId,
  momento,
  ultimo,
  pendente,
}: {
  eventoId: string;
  momento: MomentoDoDia;
  ultimo: boolean;
  pendente: SugestaoCronograma | null;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [processando, iniciar] = useTransition();
  const [hora, setHora] = useState(hhmm(momento.hora));
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function enviar() {
    if (!hora) return;
    setErro(null);
    iniciar(async () => {
      const r = await sugerirHorario(eventoId, momento.id, hora, mensagem);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setAberto(false);
      setMensagem("");
      router.refresh();
    });
  }

  return (
    <div
      style={{
        padding: "var(--esp-5) 0",
        borderBottom: ultimo ? "none" : "1px solid var(--cor-borda-linha)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--esp-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--esp-4)" }}>
        <span
          style={{
            fontFamily: "var(--fonte-titulo)",
            fontSize: "var(--ts-titulo-lateral)",
            color: "var(--cor-texto-forte)",
            minWidth: 56,
            flexShrink: 0,
          }}
        >
          {hhmm(momento.hora) || "—"}
        </span>
        <span
          style={{
            fontSize: "var(--ts-item-desc)",
            color: "var(--cor-texto)",
          }}
        >
          {momento.titulo}
        </span>
      </div>

      {pendente ? (
        <p
          style={{
            margin: 0,
            paddingLeft: 68,
            fontSize: "var(--ts-desc)",
            color: "var(--cor-texto-suave)",
          }}
        >
          Vocês sugeriram {hhmm(pendente.horarioSugerido)} — com a cerimonialista.
        </p>
      ) : aberto ? (
        <div
          style={{
            paddingLeft: 68,
            display: "flex",
            flexDirection: "column",
            gap: "var(--esp-3)",
          }}
        >
          <input
            style={{ ...campoStyle, maxWidth: 160 }}
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
          <input
            style={campoStyle}
            placeholder="Por quê? (opcional)"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
          />
          {erro && (
            <p style={{ margin: 0, fontSize: "var(--ts-desc)", color: "var(--cor-atencao)" }}>
              {erro}
            </p>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              style={botaoStyle}
              onClick={enviar}
              disabled={processando || !hora}
            >
              Enviar sugestão
            </button>
            <button type="button" style={botaoStyle} onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          style={{
            alignSelf: "flex-start",
            marginLeft: 68,
            border: "none",
            background: "none",
            padding: 0,
            fontSize: "var(--ts-desc)",
            color: "var(--cor-texto-suave)",
            cursor: "pointer",
            fontFamily: "var(--fonte-corpo)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          sugerir outro horário
        </button>
      )}
    </div>
  );
}

function FormMomento({
  eventoId,
  onFechar,
}: {
  eventoId: string;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [processando, iniciar] = useTransition();
  const [titulo, setTitulo] = useState("");
  const [hora, setHora] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  return (
    <>
      <Rotulo>O que vocês gostariam de incluir</Rotulo>
      <input
        style={campoStyle}
        placeholder="Ex.: dança com o pai da noiva"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        autoFocus
      />
      <input
        style={{ ...campoStyle, maxWidth: 160 }}
        type="time"
        value={hora}
        onChange={(e) => setHora(e.target.value)}
      />
      <input
        style={campoStyle}
        placeholder="Algum detalhe que ajude (opcional)"
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
      />
      {erro && (
        <p style={{ margin: 0, fontSize: "var(--ts-desc)", color: "var(--cor-atencao)" }}>
          {erro}
        </p>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          style={botaoStyle}
          disabled={processando || !titulo.trim()}
          onClick={() => {
            setErro(null);
            iniciar(async () => {
              const r = await pedirMomento(eventoId, titulo, hora, mensagem);
              if ("error" in r) {
                setErro(r.error);
                return;
              }
              onFechar();
              router.refresh();
            });
          }}
        >
          Enviar
        </button>
        <button type="button" style={botaoStyle} onClick={onFechar}>
          Cancelar
        </button>
      </div>
    </>
  );
}
