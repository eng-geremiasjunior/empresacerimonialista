"use client";

// O link do Reels em collab: a única etapa da parceria que o sistema não
// comprova sozinho, então o dono cola.

import { useFormState, useFormStatus } from "react-dom";
import { salvarReels, type ResultadoParceira } from "./actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar"}
    </button>
  );
}

export function CampoReels({ id, url }: { id: string; url: string | null }) {
  const [estado, acao] = useFormState<ResultadoParceira, FormData>(salvarReels, {});
  return (
    <form action={acao} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="reels"
        defaultValue={url ?? ""}
        placeholder="Link do Reels em collab"
        className="min-w-0 flex-1 rounded-md border border-stone-300 px-2.5 py-1.5 text-xs"
      />
      <Botao />
      {estado.error ? <span className="w-full text-xs text-red-700">{estado.error}</span> : null}
      {estado.ok ? <span className="text-xs text-emerald-700">salvo</span> : null}
    </form>
  );
}
