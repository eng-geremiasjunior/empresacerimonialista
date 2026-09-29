"use client";

// A foto de capa à esquerda do cabeçalho do evento (Modelo A).
//
// Sem foto o espaço fica VAZIO, com "Adicionar foto de capa" — sem capa
// padrão de propósito: o vazio é o que convida a enviar. Com foto, a
// imagem ocupa a altura toda do cartão, e trocar/remover aparecem ao
// passar o mouse.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { removeEventCover, uploadEventCover } from "@/lib/event-cover";

export function CapaDoEvento({
  eventId,
  atual,
}: {
  eventId: string;
  atual: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(atual);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErro(null);
    setEnviando(true);
    const r = await uploadEventCover(eventId, file);
    setEnviando(false);
    if (r.error) {
      setErro(r.error);
      return;
    }
    setUrl(r.url ?? null);
    router.refresh();
  }

  async function remover() {
    setEnviando(true);
    await removeEventCover(eventId);
    setEnviando(false);
    setUrl(null);
    router.refresh();
  }

  return (
    <div
      className="ev-capa group"
      style={{
        flex: "0 1 30%",
        maxWidth: 340,
        minWidth: 140,
        position: "relative",
        background: "var(--ev-nevoa)",
        overflow: "hidden",
        // os cantos do cartão do cabeçalho, que não recorta os filhos
        borderRadius: "13px 0 0 13px",
      }}
    >
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div
            className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            style={{
              position: "absolute",
              left: 10,
              bottom: 10,
              display: "flex",
              gap: 6,
            }}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={enviando}
              style={botaoSobreFoto}
            >
              {enviando ? <Loader2 size={12} className="animate-spin" /> : null}
              Trocar foto
            </button>
            <button type="button" onClick={remover} disabled={enviando} style={botaoSobreFoto}>
              Remover
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          aria-label="Adicionar foto de capa"
          className="ev-foco"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            border: "none",
            background: "transparent",
            color: "var(--ev-text-muted)",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {enviando ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <ImageIcon size={22} strokeWidth={1.5} style={{ color: "var(--ev-text-faint)" }} />
          )}
          {enviando ? "Enviando…" : "Adicionar foto de capa"}
        </button>
      )}
      {erro && (
        <p
          role="alert"
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            bottom: 10,
            margin: 0,
            padding: "6px 8px",
            borderRadius: 8,
            background: "rgba(255,255,255,.92)",
            fontSize: 12,
            color: "var(--ev-late)",
          }}
        >
          {erro}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={escolher}
        className="hidden"
      />
    </div>
  );
}

const botaoSobreFoto: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  height: 28,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,.4)",
  background: "rgba(34,30,27,.72)",
  color: "#fff",
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
