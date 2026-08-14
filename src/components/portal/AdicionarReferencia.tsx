"use client";

// As referências são a parte do guia que a CLIENTE escreve: a imagem que
// ela achou e a frase do que agradou nela. O resto do guia é leitura.
//
// O arquivo sobe direto do navegador para o bucket privado; a policy da
// 092 é quem decide se ela pode escrever naquela pasta.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ASSUNTOS, ASSUNTO_ROTULO } from "@/lib/inspiracoes-shared";
import {
  registrarReferencia,
  removerReferencia,
} from "@/app/(portal)/portal/[eventoId]/guia-estilo/actions";

export function AdicionarReferencia({
  eventoId,
  nomeSugerido,
}: {
  eventoId: string;
  /** o nome de quem está logada, para não pedir que ela digite o próprio */
  nomeSugerido: string | null;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);
  const [assunto, setAssunto] = useState("geral");
  const [agradou, setAgradou] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function subir(file: File) {
    setErro(null);
    setEnviando(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      // o caminho começa pelo evento: é o que a policy do bucket lê
      const path = `${eventoId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("inspiracoes")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setErro("Não foi possível enviar a imagem.");
        return;
      }

      const r = await registrarReferencia(
        eventoId,
        path,
        assunto,
        agradou,
        nomeSugerido ?? ""
      );
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setAgradou("");
      setAberto(false);
      router.refresh();
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        className="guia-botao"
        style={{ alignSelf: "flex-start" }}
        onClick={() => setAberto(true)}
      >
        Guardar uma imagem
      </button>
    );
  }

  return (
    <div className="guia-comentario">
      <select
        className="guia-campo"
        style={{ minHeight: 48 }}
        value={assunto}
        onChange={(e) => setAssunto(e.target.value)}
      >
        {ASSUNTOS.map((a) => (
          <option key={a} value={a}>
            {ASSUNTO_ROTULO[a]}
          </option>
        ))}
      </select>
      <textarea
        className="guia-campo"
        rows={2}
        placeholder="O que agradou vocês nessa imagem?"
        value={agradou}
        onChange={(e) => setAgradou(e.target.value)}
      />
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) subir(f);
        }}
      />
      <div className="guia-acoes">
        <button
          type="button"
          className="guia-botao"
          onClick={() => setAberto(false)}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="guia-botao guia-botao-ouro"
          disabled={enviando}
          onClick={() => entrada.current?.click()}
        >
          {enviando ? "Enviando…" : "Escolher imagem"}
        </button>
      </div>
      {erro && <p className="guia-erro">{erro}</p>}
    </div>
  );
}

/** Remover uma referência que a própria cliente guardou. */
export function RemoverReferencia({
  eventoId,
  id,
  storagePath,
}: {
  eventoId: string;
  id: string;
  storagePath: string;
}) {
  const router = useRouter();
  const [indo, setIndo] = useState(false);
  return (
    <button
      type="button"
      disabled={indo}
      onClick={async () => {
        setIndo(true);
        await removerReferencia(eventoId, id, storagePath);
        router.refresh();
      }}
      style={{
        alignSelf: "flex-start",
        border: "none",
        background: "none",
        padding: 0,
        fontFamily: "var(--fonte-corpo)",
        fontSize: 12,
        color: "#8B8072",
        cursor: "pointer",
        textDecoration: "underline",
        textUnderlineOffset: 3,
      }}
    >
      remover
    </button>
  );
}
