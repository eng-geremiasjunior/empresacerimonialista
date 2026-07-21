"use client";

// Modal Novo/Editar Modelo de Precificação. Tipo de cálculo alterna os
// campos; no "por convidado" há um preview ao vivo para 150 convidados.

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { X } from "lucide-react";
import {
  criarModelo,
  editarModelo,
  type ModeloFormState,
} from "@/app/(app)/orcamentos/modelos/actions";
import {
  CATEGORIAS_MODELO,
  calcularValorModelo,
  formatBRL,
  type ModeloPrecificacao,
  type TipoCalculo,
} from "@/lib/modelos-precificacao";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

const CONVIDADOS_PREVIEW = 150;

function SubmitButton({ editando }: { editando: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-700 disabled:opacity-50"
    >
      {pending ? "Salvando…" : editando ? "Salvar" : "Cadastrar"}
    </button>
  );
}

export function ModeloPrecificacaoFormModal({
  modelo,
  onClose,
}: {
  modelo?: ModeloPrecificacao;
  onClose: () => void;
}) {
  const action = modelo ? editarModelo.bind(null, modelo.id) : criarModelo;
  const [state, formAction] = useFormState<ModeloFormState, FormData>(
    action,
    null
  );

  const [tipo, setTipo] = useState<TipoCalculo>(
    modelo?.tipo_calculo ?? "fixo"
  );
  const [valorConvidado, setValorConvidado] = useState(
    modelo?.valor_por_convidado != null ? String(modelo.valor_por_convidado) : ""
  );
  const [taxaFixa, setTaxaFixa] = useState(
    modelo?.taxa_fixa_adicional ? String(modelo.taxa_fixa_adicional) : ""
  );

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  const num = (s: string) => Number(s.replace(",", ".")) || 0;
  const preview = calcularValorModelo(
    {
      tipo_calculo: "por_convidado",
      valor_fixo: null,
      valor_por_convidado: num(valorConvidado),
      taxa_fixa_adicional: num(taxaFixa),
    },
    CONVIDADOS_PREVIEW
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {modelo ? "Editar modelo" : "Novo modelo"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="nome" className={labelClass}>
              Nome *
            </label>
            <input
              id="nome"
              name="nome"
              required
              defaultValue={modelo?.nome}
              placeholder='Ex.: "Pacote Buffet Completo"'
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="categoria" className={labelClass}>
                Categoria
              </label>
              <select
                id="categoria"
                name="categoria"
                defaultValue={modelo?.categoria ?? ""}
                className={inputClass}
              >
                <option value="">Sem categoria</option>
                {CATEGORIAS_MODELO.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ativo" className={labelClass}>
                Status
              </label>
              <select
                id="ativo"
                name="ativo"
                defaultValue={modelo ? String(modelo.ativo) : "true"}
                className={inputClass}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="descricao" className={labelClass}>
              Descrição{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              id="descricao"
              name="descricao"
              rows={2}
              defaultValue={modelo?.descricao ?? ""}
              placeholder="O que está incluído neste pacote…"
              className={inputClass}
            />
          </div>

          {/* Tipo de cálculo */}
          <div>
            <span className={labelClass}>Tipo de cálculo *</span>
            <input type="hidden" name="tipo_calculo" value={tipo} />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipo("fixo")}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${
                  tipo === "fixo"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                }`}
              >
                Valor fixo
              </button>
              <button
                type="button"
                onClick={() => setTipo("por_convidado")}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${
                  tipo === "por_convidado"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                }`}
              >
                Por convidado
              </button>
            </div>
          </div>

          {tipo === "fixo" ? (
            <div>
              <label htmlFor="valor_fixo" className={labelClass}>
                Valor (R$) *
              </label>
              <input
                id="valor_fixo"
                name="valor_fixo"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={modelo?.valor_fixo ?? ""}
                placeholder="Ex.: 5000"
                className={inputClass}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="valor_por_convidado" className={labelClass}>
                    Valor por convidado (R$) *
                  </label>
                  <input
                    id="valor_por_convidado"
                    name="valor_por_convidado"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={valorConvidado}
                    onChange={(e) => setValorConvidado(e.target.value)}
                    placeholder="Ex.: 80"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="taxa_fixa_adicional" className={labelClass}>
                    Taxa fixa adicional{" "}
                    <span className="font-normal text-gray-400">(R$)</span>
                  </label>
                  <input
                    id="taxa_fixa_adicional"
                    name="taxa_fixa_adicional"
                    type="number"
                    min={0}
                    step="0.01"
                    value={taxaFixa}
                    onChange={(e) => setTaxaFixa(e.target.value)}
                    placeholder="Ex.: 500"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-indigo-50/60 px-3.5 py-2.5 text-sm text-indigo-900">
                Exemplo: para {CONVIDADOS_PREVIEW} convidados, ficaria{" "}
                <strong>{formatBRL(preview)}</strong>
              </div>
            </>
          )}

          {state && "error" in state && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <SubmitButton editando={Boolean(modelo)} />
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
