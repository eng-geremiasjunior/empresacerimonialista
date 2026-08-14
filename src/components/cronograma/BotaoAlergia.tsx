"use client";

// O ato de compartilhar a restrição alimentar com um fornecedor.
//
// Antes de mandar, ela vê exatamente o texto que vai aparecer no link
// dele. Não é um toggle solto: compartilhar dado de saúde de outra
// pessoa é decisão, e decisão pede ver o que se está decidindo.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  compartilharAlergia,
  pararDeCompartilharAlergia,
} from "@/app/(app)/eventos/[id]/roteiro/alergia-actions";

export function BotaoAlergia({
  eventId,
  supplierId,
  supplierNome,
  compartilhado,
  texto,
  conferida,
}: {
  eventId: string;
  supplierId: string;
  supplierNome: string;
  compartilhado: boolean;
  /** o que vai aparecer no link dele; null = ninguém respondeu ainda */
  texto: string | null;
  /** false = a resposta da cliente ainda não foi conferida */
  conferida: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  if (!texto) return null;

  if (compartilhado) {
    return (
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            await pararDeCompartilharAlergia(eventId, supplierId);
            router.refresh();
          })
        }
        title={`${supplierNome} está vendo a restrição no link dele`}
        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:border-amber-400 disabled:opacity-50"
      >
        Vendo a restrição
      </button>
    );
  }

  if (confirmando) {
    return (
      <span className="flex flex-col items-end gap-1.5">
        <span className="max-w-xs text-right text-xs text-stone-600">
          {supplierNome} vai ver: “{texto}”
          {!conferida && " — depois de você conferir a resposta"}
        </span>
        <span className="flex gap-1.5">
          <button
            type="button"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                await compartilharAlergia(eventId, supplierId);
                setConfirmando(false);
                router.refresh();
              })
            }
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Compartilhar
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          >
            Cancelar
          </button>
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-stone-400"
    >
      Restrição alimentar
    </button>
  );
}
