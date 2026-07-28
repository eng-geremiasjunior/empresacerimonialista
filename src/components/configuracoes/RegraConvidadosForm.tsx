"use client";

// Configurações > Proposta > Convidados.
// Define o slider da calculadora: faixa, quantos já vêm no preço do
// pacote e quanto custa cada convidado acima disso.

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { salvarRegraConvidados, type AcaoResult } from "@/lib/proposta-config";
import type { EventType } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-gray-600";

function Salvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
    >
      {pending ? "Salvando…" : "Salvar"}
    </button>
  );
}

export function RegraConvidadosForm({
  tipoEvento,
  inicial,
}: {
  tipoEvento: EventType;
  inicial: {
    convidados_min: number;
    convidados_max: number;
    convidados_inclusos: number;
    valor_por_convidado_extra: number;
  };
}) {
  const [state, formAction] = useFormState<AcaoResult | null, FormData>(
    salvarRegraConvidados,
    null
  );
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      setSalvo(true);
      const t = setTimeout(() => setSalvo(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {/* a action grava só no tipo de evento desta tela */}
      <input type="hidden" name="tipo_evento" value={tipoEvento} />
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label htmlFor="convidados_min" className={labelClass}>
            Mínimo
          </label>
          <input
            id="convidados_min"
            name="convidados_min"
            inputMode="numeric"
            defaultValue={inicial.convidados_min}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="convidados_max" className={labelClass}>
            Máximo
          </label>
          <input
            id="convidados_max"
            name="convidados_max"
            inputMode="numeric"
            defaultValue={inicial.convidados_max}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="convidados_inclusos" className={labelClass}>
            Já inclusos no pacote
          </label>
          <input
            id="convidados_inclusos"
            name="convidados_inclusos"
            inputMode="numeric"
            defaultValue={inicial.convidados_inclusos}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="valor_por_convidado_extra" className={labelClass}>
            R$ por convidado extra
          </label>
          <input
            id="valor_por_convidado_extra"
            name="valor_por_convidado_extra"
            inputMode="decimal"
            defaultValue={inicial.valor_por_convidado_extra}
            className={inputClass}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Exemplo: com {inicial.convidados_inclusos} inclusos e R${" "}
        {inicial.valor_por_convidado_extra} por extra, uma festa de{" "}
        {inicial.convidados_inclusos + 50} convidados soma R${" "}
        {50 * inicial.valor_por_convidado_extra} ao pacote.
      </p>

      <div className="flex items-center gap-3">
        <Salvar />
        {salvo && <span className="text-sm font-medium text-emerald-600">Salvo!</span>}
        {state && "error" in state && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}
