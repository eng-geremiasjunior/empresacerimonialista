"use client";

// Gestão de Modelos de Precificação (Orçamentos, Etapa 2).
// Mesmo padrão de tabela de Fornecedores/Clientes: cabeçalho com título +
// botão, filtros, tabela com badges e menu de 3 pontos por linha.
// Filtros client-side: a lista de modelos de uma empresa é pequena.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Ban,
  CircleCheck,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { ModeloPrecificacaoFormModal } from "@/components/orcamentos/ModeloPrecificacaoFormModal";
import {
  excluirModelo,
  setModeloAtivo,
} from "@/app/(app)/orcamentos/modelos/actions";
import { categoriaLabel } from "@/lib/fornecedores-shared";
import {
  CATEGORIAS_MODELO,
  TIPO_CALCULO_LABELS,
  valorResumo,
  type ModeloPrecificacao,
} from "@/lib/modelos-precificacao";

function MenuAcoes({
  m,
  onEditar,
}: {
  m: ModeloPrecificacao;
  onEditar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const usado = m.usado_em_orcamentos > 0;

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
        setErro(null);
      }
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        disabled={pending}
        aria-label="Ações"
        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60"
      >
        <MoreVertical size={16} />
      </button>
      {aberto && (
        <div className="absolute right-0 top-8 z-20 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => {
              setAberto(false);
              onEditar();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={14} /> Editar
          </button>
          <button
            onClick={() =>
              startTransition(async () => {
                await setModeloAtivo(m.id, !m.ativo);
                setAberto(false);
              })
            }
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            {m.ativo ? (
              <>
                <Ban size={14} /> Desativar
              </>
            ) : (
              <>
                <CircleCheck size={14} /> Ativar
              </>
            )}
          </button>
          <button
            disabled={usado}
            title={
              usado
                ? "Já usado em orçamentos — desative em vez de excluir"
                : undefined
            }
            onClick={() => {
              if (!confirm(`Excluir o modelo "${m.nome}"?`)) return;
              startTransition(async () => {
                const res = await excluirModelo(m.id);
                if ("error" in res) setErro(res.error);
                else setAberto(false);
              });
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
          >
            <Trash2 size={14} /> Excluir
          </button>
          {usado && (
            <p className="px-3 py-1.5 text-xs text-gray-400">
              Usado em {m.usado_em_orcamentos} orçamento
              {m.usado_em_orcamentos === 1 ? "" : "s"} — só é possível
              desativar.
            </p>
          )}
          {erro && <p className="px-3 py-1.5 text-xs text-red-600">{erro}</p>}
        </div>
      )}
    </div>
  );
}

export function ModelosPrecificacaoTable({
  modelos,
}: {
  modelos: ModeloPrecificacao[];
}) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<ModeloPrecificacao | null>(null);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return modelos.filter((m) => {
      if (q && !m.nome.toLowerCase().includes(q)) return false;
      if (categoria && m.categoria !== categoria) return false;
      if (status === "ativo" && !m.ativo) return false;
      if (status === "inativo" && m.ativo) return false;
      return true;
    });
  }, [modelos, busca, categoria, status]);

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Modelos de Precificação
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Cadastre pacotes e serviços reutilizáveis para montar orçamentos
            rapidamente
          </p>
        </div>
        <button
          onClick={() => setCriando(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700"
        >
          <Plus size={16} /> Novo modelo
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome…"
            className="w-56 rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS_MODELO.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      {/* Tabela */}
      {modelos.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-600">Nenhum modelo cadastrado ainda.</p>
          <button
            onClick={() => setCriando(true)}
            className="mt-4 text-sm font-medium text-gray-900 underline underline-offset-4 hover:no-underline"
          >
            Cadastrar o primeiro modelo
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">Categoria</th>
                  <th className="px-4 py-2.5 font-medium">Tipo de cálculo</th>
                  <th className="px-4 py-2.5 font-medium">Valor</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="w-10 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-400"
                    >
                      Nenhum modelo corresponde aos filtros.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((m) => (
                    <tr
                      key={m.id}
                      className={`transition-colors hover:bg-gray-50 ${
                        m.ativo ? "" : "opacity-60"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{m.nome}</p>
                        {m.descricao && (
                          <p className="max-w-[260px] truncate text-xs text-gray-500">
                            {m.descricao}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {m.categoria ? (
                          <span className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-600">
                            {categoriaLabel(m.categoria)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.tipo_calculo === "fixo"
                              ? "bg-stone-100 text-stone-700"
                              : "bg-indigo-50 text-indigo-700"
                          }`}
                        >
                          {TIPO_CALCULO_LABELS[m.tipo_calculo]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {valorResumo(m)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.ativo
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              m.ativo ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          {m.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <MenuAcoes m={m} onEditar={() => setEditando(m)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {criando && (
        <ModeloPrecificacaoFormModal onClose={() => setCriando(false)} />
      )}
      {editando && (
        <ModeloPrecificacaoFormModal
          modelo={editando}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}
