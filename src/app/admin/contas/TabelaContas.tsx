"use client";

// A tabela de contas e as duas alavancas: assinatura (editor inline) e
// banimento (com confirmação explícita — é a ação mais dura do sistema).

import { useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { mascararDinheiro } from "@/lib/format";
import { dinheiroParaMascara } from "@/lib/admin-metricas";
import type { ContaAdmin } from "@/lib/supabase/admin-painel";
import {
  definirBanimento,
  salvarAssinatura,
  type ResultadoAdmin,
} from "../actions";

const STATUS_ROTULO: Record<string, string> = {
  trial: "trial",
  ativa: "ativa",
  pausada: "pausada",
  cancelada: "cancelada",
};

function dataBr(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function banida(c: ContaAdmin): boolean {
  return Boolean(c.banidaAte && new Date(c.banidaAte) > new Date());
}

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

function EditorAssinatura({
  conta,
  onFechar,
}: {
  conta: ContaAdmin;
  onFechar: () => void;
}) {
  const a = conta.assinatura;
  // dinheiroParaMascara, não String(): 150.5 tem PONTO e a máscara só
  // entende vírgula — virava "1.505" e salvar sem tocar gravava 10×.
  const [valor, setValor] = useState(
    a ? dinheiroParaMascara(a.valorMensal) : ""
  );
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(
    salvarAssinatura,
    {}
  );

  // setState do pai não pode acontecer durante o render deste componente
  useEffect(() => {
    if (estado.ok) onFechar();
  }, [estado.ok, onFechar]);
  if (estado.ok) return null;

  return (
    <form
      action={agir}
      className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3"
    >
      <input type="hidden" name="empresa_id" value={conta.empresaId} />
      <label className="text-xs text-stone-500">
        Plano
        <input
          name="plano"
          defaultValue={a?.plano ?? "piloto"}
          className="mt-1 block h-8 w-28 rounded-lg border border-stone-300 px-2 text-sm"
        />
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
          defaultValue={a?.status ?? "trial"}
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
          defaultValue={a?.observacao ?? ""}
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
      {estado.error && (
        <p className="w-full text-xs text-red-600">{estado.error}</p>
      )}
    </form>
  );
}

function Linha({ conta }: { conta: ContaAdmin }) {
  const [editando, setEditando] = useState(false);
  const [confirmandoBan, setConfirmandoBan] = useState(false);
  const [ocupado, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const estaBanida = banida(conta);
  const a = conta.assinatura;

  function alternarBan() {
    setErro(null);
    comecar(async () => {
      const r = await definirBanimento(conta.empresaId, !estaBanida);
      if (r.error) setErro(r.error);
      setConfirmandoBan(false);
    });
  }

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        estaBanida ? "border-red-200" : "border-stone-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-stone-900">
            {conta.nome}
            {estaBanida && (
              <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                banida
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            {conta.donaEmail ?? "sem e-mail"} · desde {dataBr(conta.criadaEm)}
          </p>
          <p className="mt-1 font-mono text-xs text-stone-400">
            {conta.membros} {conta.membros === 1 ? "pessoa" : "pessoas"} ·{" "}
            {conta.eventos} eventos · última atividade{" "}
            {dataBr(conta.ultimaAtividade)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${
              a?.status === "ativa"
                ? "bg-emerald-50 text-emerald-700"
                : a?.status === "cancelada"
                  ? "bg-red-50 text-red-700"
                  : "bg-stone-100 text-stone-600"
            }`}
          >
            {a
              ? `${a.plano} · ${
                  a.valorMensal > 0
                    ? `R$ ${dinheiroParaMascara(a.valorMensal)}/mês`
                    : "R$ 0"
                } · ${STATUS_ROTULO[a.status] ?? a.status}`
              : "sem assinatura"}
          </span>
          <button
            type="button"
            onClick={() => setEditando((v) => !v)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
          >
            {a ? "Editar" : "Registrar assinatura"}
          </button>
          {confirmandoBan ? (
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={ocupado}
                onClick={alternarBan}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {ocupado ? "…" : estaBanida ? "Confirmar reativação" : "Confirmar banimento"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoBan(false)}
                className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-500"
              >
                ✕
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoBan(true)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                estaBanida
                  ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  : "border-red-200 text-red-600 hover:bg-red-50"
              }`}
            >
              {estaBanida ? "Reativar" : "Banir"}
            </button>
          )}
        </div>
      </div>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
      {editando && (
        <EditorAssinatura conta={conta} onFechar={() => setEditando(false)} />
      )}
    </div>
  );
}

export function TabelaContas({ contas }: { contas: ContaAdmin[] }) {
  if (contas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
        Nenhuma empresa cadastrada ainda.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {contas.map((c) => (
        <Linha key={c.empresaId} conta={c} />
      ))}
    </div>
  );
}
