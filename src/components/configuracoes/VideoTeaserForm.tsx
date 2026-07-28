"use client";

// Catálogo > [tipo] > Vídeo teaser.
// Com URL preenchida o hero da proposta ganha o botão de play; vazio,
// mostra só a imagem de capa. Hoje quem usa é o template de debutante.

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { salvarVideoTeaser, type AcaoResult } from "@/lib/conteudo-institucional";
import type { EventType } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400";

export function VideoTeaserForm({
  tipoEvento,
  urlInicial,
}: {
  tipoEvento: EventType;
  urlInicial: string | null;
}) {
  const [state, formAction] = useFormState<AcaoResult | null, FormData>(
    salvarVideoTeaser,
    null
  );
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      setSalvo(true);
      const id = setTimeout(() => setSalvo(false), 2500);
      return () => clearTimeout(id);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tipo_evento" value={tipoEvento} />
      <input
        name="video_url"
        type="url"
        inputMode="url"
        defaultValue={urlInicial ?? ""}
        placeholder="https://youtube.com/watch?v=..."
        className={inputClass}
      />
      <p className="text-xs text-gray-500">
        Cole o link do YouTube ou Vimeo. Deixe em branco para a capa aparecer
        sem botão de play.
      </p>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Salvar
        </button>
        {salvo && <span className="text-xs text-green-700">Salvo</span>}
      </div>
    </form>
  );
}
