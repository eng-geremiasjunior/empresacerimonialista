"use client";

// Alocar verba a um fornecedor. O detalhamento em itens fica atrás de um
// botão secundário: a maioria dos casos é só "negociei X com fulano", e
// obrigar a detalhar transformaria um lançamento de 10 segundos numa
// planilha.

import { useState } from "react";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { mascararDinheiro } from "@/lib/format";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import {
  salvarVerbaFornecedor,
  type ItemVerba,
  type VerbaFormState,
} from "@/app/(app)/eventos/[id]/financeiro/verba-actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100";
const labelClass = "mb-1 block text-xs font-medium text-gray-600";

type Linha = ItemVerba & { key: string };
let seq = 0;
const novaLinha = (): Linha => ({
  key: `item-${++seq}`,
  descricao: "",
  valorEstimadoInicial: null,
  valorNegociado: null,
});

function Botao({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
    >
      {pending ? "Salvando…" : label}
    </button>
  );
}

export function FormVerbaFornecedor({
  eventId,
  fornecedores,
  jaAlocados,
  inicial,
  onFechar,
  onSalvo,
}: {
  eventId: string;
  fornecedores: { id: string; name: string }[];
  jaAlocados: string[];
  inicial?: {
    supplierId: string;
    valorEstimadoInicial: number | null;
    // null = linha veio do Planejamento, ainda sem contrato
    valorAlocado: number | null;
    observacao: string | null;
    itens: ItemVerba[];
  };
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [itens, setItens] = useState<Linha[]>(
    (inicial?.itens ?? []).map((i) => ({ ...i, key: `item-${++seq}` }))
  );
  const [detalhando, setDetalhando] = useState((inicial?.itens ?? []).length > 0);
  const [estimado, setEstimado] = useState(() =>
    inicial?.valorEstimadoInicial != null
      ? mascararDinheiro(String(inicial.valorEstimadoInicial).replace(".", ","))
      : ""
  );
  const [alocado, setAlocado] = useState(() =>
    inicial?.valorAlocado != null
      ? mascararDinheiro(String(inicial.valorAlocado).replace(".", ","))
      : ""
  );

  const [state, formAction] = useFormState<VerbaFormState, FormData>(
    async (prev, formData) => {
      const res = await salvarVerbaFornecedor(
        eventId,
        itens.map(({ key: _k, ...i }) => i),
        prev,
        formData
      );
      if (res && "ok" in res) onSalvo();
      return res;
    },
    null
  );

  // Um fornecedor entra uma vez por evento; os já alocados saem da lista
  // (menos o que está sendo editado).
  const disponiveis = fornecedores.filter(
    (f) => !jaAlocados.includes(f.id) || f.id === inicial?.supplierId
  );

  const somaItens = itens.reduce((s, i) => s + (i.valorNegociado ?? 0), 0);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label htmlFor="supplier_id" className={labelClass}>
            Fornecedor *
          </label>
          <select
            id="supplier_id"
            name="supplier_id"
            defaultValue={inicial?.supplierId ?? ""}
            className={inputClass}
          >
            <option value="">Selecione…</option>
            {disponiveis.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {disponiveis.length === 0 && (
            <p className="mt-1 text-xs text-amber-700">
              Todos os fornecedores do evento já têm verba alocada.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="valor_estimado_inicial" className={labelClass}>
            Estimativa inicial{" "}
            <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <InputMoeda
            id="valor_estimado_inicial"
            name="valor_estimado_inicial"
            valor={estimado}
            onChange={setEstimado}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">
            Quanto se imaginava gastar. É o que gera a economia.
          </p>
        </div>

        <div>
          <label htmlFor="valor_alocado" className={labelClass}>
            Valor alocado *
          </label>
          <InputMoeda
            id="valor_alocado"
            name="valor_alocado"
            valor={alocado}
            onChange={setAlocado}
            disabled={detalhando && itens.length > 0}
            className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
          />
          {detalhando && itens.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Somando os itens: {somaItens.toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="observacao" className={labelClass}>
          Observação <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <input
          id="observacao"
          name="observacao"
          defaultValue={inicial?.observacao ?? ""}
          placeholder="Ex.: inclui taxa de deslocamento"
          className={inputClass}
        />
      </div>

      {/* Detalhamento: secundário e opcional */}
      {!detalhando ? (
        <button
          type="button"
          onClick={() => {
            setDetalhando(true);
            if (itens.length === 0) setItens([novaLinha()]);
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Detalhar custos
        </button>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">
              Detalhamento (opcional)
            </p>
            <button
              type="button"
              onClick={() => {
                setDetalhando(false);
                setItens([]);
              }}
              className="text-xs text-gray-500 underline"
            >
              Remover detalhamento
            </button>
          </div>

          {itens.map((item, idx) => (
            <div key={item.key} className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr,110px,110px,32px]">
              <input
                value={item.descricao}
                onChange={(e) =>
                  setItens((l) =>
                    l.map((x, i) => (i === idx ? { ...x, descricao: e.target.value } : x))
                  )
                }
                placeholder="Descrição"
                className={inputClass}
              />
              <input
                value={item.valorEstimadoInicial ?? ""}
                onChange={(e) =>
                  setItens((l) =>
                    l.map((x, i) =>
                      i === idx
                        ? { ...x, valorEstimadoInicial: e.target.value ? Number(e.target.value) : null }
                        : x
                    )
                  )
                }
                inputMode="decimal"
                placeholder="Estimado"
                className={inputClass}
              />
              <input
                value={item.valorNegociado ?? ""}
                onChange={(e) =>
                  setItens((l) =>
                    l.map((x, i) =>
                      i === idx
                        ? { ...x, valorNegociado: e.target.value ? Number(e.target.value) : null }
                        : x
                    )
                  )
                }
                inputMode="decimal"
                placeholder="Negociado"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setItens((l) => l.filter((_, i) => i !== idx))}
                aria-label="Remover item"
                className="rounded p-1.5 text-gray-400 hover:bg-white hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setItens((l) => [...l, novaLinha()])}
            className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:underline"
          >
            <Plus size={13} /> Adicionar item
          </button>
        </div>
      )}

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Botao label={inicial ? "Salvar" : "Adicionar"} />
        <button
          type="button"
          onClick={onFechar}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
