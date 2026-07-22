"use client";

// Configurações > Conteúdo da Proposta > "Sobre nós" + estatísticas.

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { salvarSobreNos, type AcaoResult } from "@/lib/conteudo-institucional";

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

export function SobreNosForm({
  inicial,
}: {
  inicial: {
    sobre_nos_texto: string | null;
    stat_anos_experiencia: number | null;
    stat_eventos_realizados: number | null;
    stat_dedicacao_percentual: number;
    stat_equipe_texto: string;
  };
}) {
  const [state, formAction] = useFormState<AcaoResult | null, FormData>(
    salvarSobreNos,
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
      <div>
        <label htmlFor="sobre_nos_texto" className={labelClass}>
          Sobre nós
        </label>
        <textarea
          id="sobre_nos_texto"
          name="sobre_nos_texto"
          rows={4}
          defaultValue={inicial.sobre_nos_texto ?? ""}
          placeholder="Conte quem é você e como cuida dos eventos dos seus clientes…"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Este texto aparece em todas as propostas enviadas aos clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="stat_anos_experiencia" className={labelClass}>
            Anos de experiência
          </label>
          <input
            id="stat_anos_experiencia"
            name="stat_anos_experiencia"
            type="number"
            min={0}
            defaultValue={inicial.stat_anos_experiencia ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="stat_eventos_realizados" className={labelClass}>
            Eventos realizados
          </label>
          <input
            id="stat_eventos_realizados"
            name="stat_eventos_realizados"
            type="number"
            min={0}
            defaultValue={inicial.stat_eventos_realizados ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="stat_dedicacao_percentual" className={labelClass}>
            % de dedicação
          </label>
          <input
            id="stat_dedicacao_percentual"
            name="stat_dedicacao_percentual"
            type="number"
            min={0}
            max={100}
            defaultValue={inicial.stat_dedicacao_percentual}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="stat_equipe_texto" className={labelClass}>
          Destaque da equipe
        </label>
        <input
          id="stat_equipe_texto"
          name="stat_equipe_texto"
          defaultValue={inicial.stat_equipe_texto}
          placeholder="Ex.: Equipe Especializada"
          className={inputClass}
        />
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
