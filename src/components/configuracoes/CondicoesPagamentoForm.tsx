"use client";

// Configurações > Conteúdo da Proposta > condições de pagamento padrão
// e WhatsApp de contato (usado nos botões de ação da proposta).

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { salvarCondicoes, type AcaoResult } from "@/lib/conteudo-institucional";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

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

export function CondicoesPagamentoForm({
  inicial,
}: {
  inicial: {
    condicao_entrada_percentual: number;
    condicao_parcelas_maximo: number;
    condicao_desconto_a_vista_percentual: number;
    condicao_prazo_parcelas_texto: string;
    whatsapp_contato: string | null;
  };
}) {
  const [state, formAction] = useFormState<AcaoResult | null, FormData>(
    salvarCondicoes,
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="condicao_entrada_percentual" className={labelClass}>
            Entrada (%)
          </label>
          <input
            id="condicao_entrada_percentual"
            name="condicao_entrada_percentual"
            type="number"
            min={0}
            max={100}
            defaultValue={inicial.condicao_entrada_percentual}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="condicao_parcelas_maximo" className={labelClass}>
            Máximo de parcelas
          </label>
          <input
            id="condicao_parcelas_maximo"
            name="condicao_parcelas_maximo"
            type="number"
            min={1}
            defaultValue={inicial.condicao_parcelas_maximo}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="condicao_desconto_a_vista_percentual"
            className={labelClass}
          >
            Desconto à vista (%)
          </label>
          <input
            id="condicao_desconto_a_vista_percentual"
            name="condicao_desconto_a_vista_percentual"
            type="number"
            min={0}
            max={100}
            defaultValue={inicial.condicao_desconto_a_vista_percentual}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="condicao_prazo_parcelas_texto" className={labelClass}>
          Prazo das parcelas
        </label>
        <input
          id="condicao_prazo_parcelas_texto"
          name="condicao_prazo_parcelas_texto"
          defaultValue={inicial.condicao_prazo_parcelas_texto}
          placeholder="Ex.: até 5 dias antes do evento"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="whatsapp_contato" className={labelClass}>
          WhatsApp para contato
        </label>
        <input
          id="whatsapp_contato"
          name="whatsapp_contato"
          defaultValue={inicial.whatsapp_contato ?? ""}
          placeholder="(33) 90000-0000"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Usado nos botões de contato da proposta enviada ao cliente.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Salvar />
        {salvo && (
          <span className="text-sm font-medium text-emerald-600">Salvo!</span>
        )}
        {state && "error" in state && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}
