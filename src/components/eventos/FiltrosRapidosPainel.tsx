"use client";

import { useRouter } from "next/navigation";
import { Circle } from "lucide-react";
import {
  buildEventosHref,
  type EventosParams,
} from "@/lib/eventos-url";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, type EventType } from "@/lib/types";

const selectClass =
  "w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-gray-500 focus:outline-none";

export function FiltrosRapidosPainel({
  current,
  responsaveis,
  cidades,
  saude,
}: {
  current: EventosParams;
  responsaveis: { id: string; nome: string }[];
  cidades: string[];
  saude: { criticos: number; atencao: number; saudaveis: number };
}) {
  const router = useRouter();
  const nav = (patch: Partial<EventosParams>) =>
    router.push(buildEventosHref(current, { ...patch, page: "1" }));

  const temFiltro = Boolean(
    current.q ||
      current.status ||
      current.type ||
      current.responsavel ||
      current.city ||
      current.saude ||
      current.arquivados
  );

  const faixas = [
    { key: "critico", label: "Críticos", n: saude.criticos, dot: "text-red-500" },
    { key: "atencao", label: "Atenção", n: saude.atencao, dot: "text-amber-500" },
    { key: "saudavel", label: "Saudáveis", n: saude.saudaveis, dot: "text-emerald-500" },
  ];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Filtros rápidos</h3>
        {temFiltro && (
          <button
            onClick={() =>
              router.push(
                buildEventosHref(current, {
                  q: "",
                  status: "",
                  type: "",
                  responsavel: "",
                  city: "",
                  saude: "",
                  arquivados: "",
                  page: "1",
                })
              )
            }
            className="text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <select
          value={current.responsavel}
          onChange={(e) => nav({ responsavel: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os responsáveis</option>
          {responsaveis.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </select>

        <select
          value={current.type}
          onChange={(e) => nav({ type: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os tipos</option>
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
            <option key={t} value={t}>
              {EVENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <select
          value={current.city}
          onChange={(e) => nav({ city: e.target.value })}
          className={selectClass}
        >
          <option value="">Todas as cidades</option>
          {cidades.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={current.status}
          onChange={(e) => nav({ status: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os status</option>
          {(Object.keys(EVENT_STATUS_LABELS) as (keyof typeof EVENT_STATUS_LABELS)[]).map(
            (s) => (
              <option key={s} value={s}>
                {EVENT_STATUS_LABELS[s]}
              </option>
            )
          )}
        </select>
      </div>

      {/* Saúde do evento — clicável para filtrar por faixa */}
      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-gray-400">Saúde do evento</p>
        <div className="space-y-0.5">
          {faixas.map((f) => {
            const ativo = current.saude === f.key;
            return (
              <button
                key={f.key}
                onClick={() => nav({ saude: ativo ? "" : f.key })}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                  ativo ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Circle size={9} className={`fill-current ${ativo ? "text-white" : f.dot}`} />
                  {f.label}
                </span>
                <span className="tabular-nums">{f.n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mostrar arquivados */}
      <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-gray-100 pt-3 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={current.arquivados === "sim"}
          onChange={(e) => nav({ arquivados: e.target.checked ? "sim" : "" })}
          className="h-4 w-4 rounded border-gray-300 accent-gray-800"
        />
        Mostrar arquivados
      </label>

      <button
        disabled
        title="Em breve"
        className="mt-3 w-full cursor-not-allowed rounded-lg border border-dashed border-gray-200 py-1.5 text-xs font-medium text-gray-400"
      >
        Salvar filtro (em breve)
      </button>
    </section>
  );
}
