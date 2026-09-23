"use client";

// "Já falei" de quem parou no cartão (169): tira a pessoa do topo da
// lista sem apagar nada — e volta atrás, se ele marcou a pessoa errada.

import { useState, useTransition } from "react";
import { marcarContatado } from "./actions";

export function JaFalei({ id, falou }: { id: string; falou: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await marcarContatado(id, !falou);
          setErro(r.error ?? null);
        })
      }
      className="text-[#5c5d63] underline underline-offset-2 disabled:opacity-50"
      title={erro ?? undefined}
    >
      {pendente ? "…" : erro ? "não marcou" : falou ? "desfazer" : "já falei"}
    </button>
  );
}
