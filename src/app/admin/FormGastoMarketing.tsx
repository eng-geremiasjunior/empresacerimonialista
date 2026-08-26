"use client";

// O denominador do CAC: quanto foi gasto em marketing no mês. O sistema
// não tem como saber — o dono informa. Botão explícito, regra da casa.

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { mascararDinheiro } from "@/lib/format";
import { dinheiroParaMascara } from "@/lib/admin-metricas";
import { salvarGasto, type ResultadoAdmin } from "./actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
    >
      {pending ? "…" : "Salvar"}
    </button>
  );
}

export function FormGastoMarketing({
  mes,
  gastoAtual,
}: {
  mes: string;
  gastoAtual: number | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(
    gastoAtual !== null ? dinheiroParaMascara(gastoAtual) : ""
  );
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(salvarGasto, {});

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
      >
        {gastoAtual === null
          ? "Informar gasto de marketing"
          : `Marketing: R$ ${dinheiroParaMascara(gastoAtual)} · editar`}
      </button>
    );
  }

  return (
    <form action={agir} className="flex items-center gap-2">
      <input type="hidden" name="mes" value={mes} />
      <span className="text-xs text-stone-500">Gasto do mês R$</span>
      <input
        name="valor"
        value={v}
        onChange={(e) => setV(mascararDinheiro(e.target.value))}
        inputMode="numeric"
        autoFocus
        className="h-8 w-28 rounded-lg border border-stone-300 px-2 font-mono text-sm"
      />
      <Botao />
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-500 hover:bg-stone-50"
      >
        ✕
      </button>
      {estado.error && (
        <span className="text-xs text-red-600">{estado.error}</span>
      )}
    </form>
  );
}
