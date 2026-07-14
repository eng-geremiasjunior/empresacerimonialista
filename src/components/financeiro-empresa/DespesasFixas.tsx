"use client";

// Seção "Despesas da empresa": categorias comuns pré-cadastradas como
// atalhos — a cerimonialista só preenche valor + data (+ recorrente).
// Recorrentes destacam o último valor com o atalho "Lançar mesmo valor".

import { useState, useTransition } from "react";
import {
  Coffee,
  Cookie,
  Droplets,
  Fuel,
  Home,
  Landmark,
  Plus,
  RefreshCw,
  Users,
  UtensilsCrossed,
  Wifi,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { lancarDespesaFixa } from "@/app/(app)/financeiro/actions";
import { NovaDespesaEmpresaModal } from "@/components/financeiro-empresa/NovaDespesaEmpresaModal";
import {
  DESPESA_CATEGORIAS,
  type DespesaFixaInfo,
} from "@/lib/financeiro-empresa-shared";
import { formatCurrency } from "@/lib/format";

const ICONS: Record<string, LucideIcon> = {
  agua: Droplets,
  luz: Zap,
  internet: Wifi,
  impostos: Landmark,
  funcionarios: Users,
  combustivel: Fuel,
  aluguel: Home,
  alimentacao_manha: Coffee,
  alimentacao_tarde: Cookie,
  almoco: UtensilsCrossed,
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

function MiniModal({
  slug,
  info,
  onClose,
}: {
  slug: string;
  info: DespesaFixaInfo | undefined;
  onClose: () => void;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [valor, setValor] = useState(
    info?.ultimoValor ? String(info.ultimoValor) : ""
  );
  const [data, setData] = useState(hoje);
  const [recorrente, setRecorrente] = useState(info?.recorrente ?? false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const r = await lancarDespesaFixa(
        slug,
        Number(valor.replace(",", ".")),
        data,
        recorrente
      );
      if (r.error) setErro(r.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {DESPESA_CATEGORIAS[slug]}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Valor (R$)
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              autoFocus
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Data do custo
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={inputClass}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={recorrente}
              onChange={(e) => setRecorrente(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
            />
            Recorrente (todo mês)
          </label>

          {erro && <p className="text-sm text-rose-600">{erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={pending}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {pending ? "Salvando…" : "Lançar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DespesasFixas({ fixas }: { fixas: DespesaFixaInfo[] }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [outra, setOutra] = useState(false);
  const [pending, startTransition] = useTransition();
  const hoje = new Date().toISOString().slice(0, 10);

  const info = (slug: string) => fixas.find((f) => f.slug === slug);

  function lancarMesmoValor(f: DespesaFixaInfo) {
    if (!f.ultimoValor) return;
    startTransition(async () => {
      await lancarDespesaFixa(f.slug, f.ultimoValor!, hoje, true);
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">
            Despesas da empresa
          </h2>
          <p className="text-xs text-gray-500">
            Clique em uma categoria para lançar o custo do mês
          </p>
        </div>
        <button
          onClick={() => setOutra(true)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          <Plus size={14} />
          Outra despesa
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {fixas.map((f) => {
          const Icon = ICONS[f.slug] ?? Plus;
          return (
            <div
              key={f.slug}
              className={`rounded-lg border p-3 text-left transition-colors ${
                f.lancadaEsteMes
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <button
                onClick={() => setAberta(f.slug)}
                className="flex w-full items-start gap-2 text-left"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Icon size={14} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-gray-900">
                    {DESPESA_CATEGORIAS[f.slug]}
                  </span>
                  <span className="block text-[11px] text-gray-500">
                    {f.lancadaEsteMes
                      ? "Lançada este mês"
                      : f.ultimoValor
                        ? `Último: ${formatCurrency(f.ultimoValor)}`
                        : "Nunca lançada"}
                  </span>
                </span>
              </button>
              {f.recorrente && f.ultimoValor && !f.lancadaEsteMes && (
                <button
                  onClick={() => lancarMesmoValor(f)}
                  disabled={pending}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                >
                  <RefreshCw size={11} />
                  Lançar mesmo valor
                </button>
              )}
            </div>
          );
        })}
      </div>

      {aberta && (
        <MiniModal
          slug={aberta}
          info={info(aberta)}
          onClose={() => setAberta(null)}
        />
      )}
      {outra && <NovaDespesaEmpresaModal onClose={() => setOutra(false)} />}
    </section>
  );
}
