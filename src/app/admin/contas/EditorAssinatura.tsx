"use client";

// O editor de assinatura do painel do dono (plano, valor, status,
// observação). Mora aqui para a ficha da conta e a lista usarem o mesmo.

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { mascararDinheiro } from "@/lib/format";
import { dinheiroParaMascara } from "@/lib/admin-metricas";
import { salvarAssinatura, type ResultadoAdmin } from "../actions";

// O que o <select> de plano recebe do servidor: os três do catálogo com
// preço e tetos já em texto, mais 'cortesia' e 'piloto' (valorMensal
// nulo = o dono digita). Só esses cinco passam no CHECK da 147.
export type OpcaoDePlano = {
  codigo: string;
  rotulo: string;
  valorMensal: number | null;
};

export type AssinaturaEditavel = {
  plano: string;
  valorMensal: number;
  status: string;
  observacao: string | null;
} | null;

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
    >
      {pending ? "…" : "Salvar assinatura"}
    </button>
  );
}

export function EditorAssinatura({
  empresaId,
  atual,
  planos,
  onFechar,
}: {
  empresaId: string;
  atual: AssinaturaEditavel;
  planos: OpcaoDePlano[];
  onFechar: () => void;
}) {
  // Uma conta antiga pode carregar um plano que não está na lista (ex.:
  // 'mensal' antes da 147 rodar). Cai no primeiro do catálogo em vez de
  // mandar um valor que o CHECK do banco recusaria.
  const planoInicial =
    atual && planos.some((p) => p.codigo === atual.plano)
      ? atual.plano
      : (planos[0]?.codigo ?? "piloto");
  const [plano, setPlano] = useState(planoInicial);
  // dinheiroParaMascara, não String(): 150.5 tem PONTO e a máscara só
  // entende vírgula — virava "1.505" e salvar sem tocar gravava 10×.
  const [valor, setValor] = useState(atual ? dinheiroParaMascara(atual.valorMensal) : "");
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(salvarAssinatura, {});

  // setState do pai não pode acontecer durante o render deste componente
  useEffect(() => {
    if (estado.ok) onFechar();
  }, [estado.ok, onFechar]);
  if (estado.ok) return null;

  // Escolher um plano do catálogo preenche o preço dele; o dono ainda
  // pode mexer no valor depois (é ele quem decide desconto, cortesia).
  function escolherPlano(codigo: string) {
    setPlano(codigo);
    const p = planos.find((x) => x.codigo === codigo);
    if (p && p.valorMensal !== null) setValor(dinheiroParaMascara(p.valorMensal));
  }

  return (
    <form
      action={agir}
      className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3"
    >
      <input type="hidden" name="empresa_id" value={empresaId} />
      <label className="text-xs text-stone-500">
        Plano
        <select
          name="plano"
          value={plano}
          onChange={(e) => escolherPlano(e.target.value)}
          className="mt-1 block h-8 rounded-lg border border-stone-300 bg-white px-2 text-sm"
        >
          {planos.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-stone-500">
        Valor mensal (R$)
        <input
          name="valor"
          value={valor}
          onChange={(e) => setValor(mascararDinheiro(e.target.value))}
          inputMode="numeric"
          className="mt-1 block h-8 w-28 rounded-lg border border-stone-300 px-2 font-mono text-sm"
        />
      </label>
      <label className="text-xs text-stone-500">
        Status
        <select
          name="status"
          defaultValue={atual?.status ?? "trial"}
          className="mt-1 block h-8 rounded-lg border border-stone-300 bg-white px-2 text-sm"
        >
          <option value="trial">trial</option>
          <option value="ativa">ativa</option>
          <option value="pausada">pausada</option>
          <option value="cancelada">cancelada</option>
        </select>
      </label>
      <label className="min-w-[180px] flex-1 text-xs text-stone-500">
        Observação
        <input
          name="observacao"
          defaultValue={atual?.observacao ?? ""}
          className="mt-1 block h-8 w-full rounded-lg border border-stone-300 px-2 text-sm"
        />
      </label>
      <BotaoSalvar />
      <button
        type="button"
        onClick={onFechar}
        className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-500 hover:bg-white"
      >
        Cancelar
      </button>
      {estado.error && <p className="w-full text-xs text-red-600">{estado.error}</p>}
    </form>
  );
}
