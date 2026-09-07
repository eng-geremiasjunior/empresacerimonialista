"use client";

// O denominador do CAC: quanto foi gasto em marketing no mês. O sistema
// não tem como saber — o dono informa. Botão explícito, regra da casa.
//
// Estilo do painel chumbo (handoff 09/2026): é a única ação primária da
// tela, então é o único fundo escuro fora da barra lateral.

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
      className="rounded-md bg-[#33343a] px-3.5 py-[7px] text-[12px] font-semibold text-white hover:bg-[#4d4e55] disabled:opacity-50"
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
        className="rounded-md bg-[#33343a] px-3.5 py-[7px] text-[12px] font-semibold text-white hover:bg-[#4d4e55]"
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
      <span className="text-[12px] text-[#5c5d63]">Gasto do mês R$</span>
      <input
        name="valor"
        value={v}
        onChange={(e) => setV(mascararDinheiro(e.target.value))}
        inputMode="numeric"
        autoFocus
        className="h-8 w-28 rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21]"
        style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}
      />
      <Botao />
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="rounded-md border border-[#d3d3cf] px-2 py-[7px] text-[12px] text-[#5c5d63] hover:bg-white"
      >
        ✕
      </button>
      {estado.error && (
        <span className="text-[12px] text-red-600">{estado.error}</span>
      )}
    </form>
  );
}
