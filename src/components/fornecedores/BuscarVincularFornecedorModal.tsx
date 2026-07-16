"use client";

// Modal de BUSCA + VÍNCULO de fornecedor ao evento (Etapa 3).
// Substitui a criação de fornecedor "solto" que existia no roteiro.
// Busca no cadastro global da empresa e cria o vínculo (roteiro_links);
// se não achar, abre o FornecedorFormModal reaproveitado da Etapa 2 e
// vincula automaticamente o novo cadastro ao evento.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search, X } from "lucide-react";
import { FornecedorFormModal } from "@/components/fornecedores/FornecedorFormModal";
import {
  buscarFornecedoresParaVincular,
  vincularFornecedor,
  type FornecedorGlobalBusca,
} from "@/app/(app)/eventos/[id]/fornecedores/actions";
import { categoriaLabel } from "@/lib/fornecedores-shared";

export function BuscarVincularFornecedorModal({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<FornecedorGlobalBusca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [cadastrando, setCadastrando] = useState(false);
  const [pending, startTransition] = useTransition();

  // Busca com debounce simples.
  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    const t = setTimeout(async () => {
      const r = await buscarFornecedoresParaVincular(eventId, termo);
      if (vivo) {
        setResultados(r);
        setCarregando(false);
      }
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [eventId, termo]);

  function vincular(supplierId: string) {
    startTransition(async () => {
      await vincularFornecedor(eventId, supplierId);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Adicionar fornecedor ao evento
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative mt-4">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            autoFocus
            placeholder="Buscar no cadastro de fornecedores…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="mt-3 flex-1 overflow-y-auto">
          {carregando ? (
            <p className="py-6 text-center text-sm text-gray-400">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Nenhum fornecedor encontrado no cadastro.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {resultados.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {f.name}
                    </p>
                    {f.categorias.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {f.categorias.slice(0, 4).map((c) => (
                          <span
                            key={c}
                            className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600"
                          >
                            {categoriaLabel(c)}
                          </span>
                        ))}
                      </div>
                    )}
                    {f.descricao && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {f.descricao}
                      </p>
                    )}
                  </div>
                  {f.vinculado ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600">
                      <Check size={13} /> Vinculado
                    </span>
                  ) : (
                    <button
                      onClick={() => vincular(f.id)}
                      disabled={pending}
                      className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      Vincular
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 border-t border-gray-100 pt-3">
          <button
            onClick={() => setCadastrando(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            <Plus size={14} />
            Cadastrar novo fornecedor
          </button>
        </div>
      </div>

      {cadastrando && (
        <FornecedorFormModal
          onClose={() => setCadastrando(false)}
          onCreated={async (id) => {
            await vincularFornecedor(eventId, id);
            onClose();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
