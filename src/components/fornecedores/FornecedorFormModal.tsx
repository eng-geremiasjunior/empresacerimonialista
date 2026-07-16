"use client";

// Formulário único de fornecedor (criar e editar), em modal.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { CategoriasMultiSelect } from "@/components/fornecedores/CategoriasMultiSelect";
import {
  criarFornecedor,
  editarFornecedor,
  type FornecedorInput,
} from "@/app/(app)/fornecedores/actions";
import { buscarCep } from "@/lib/cep";
import {
  FAIXA_PRECO_LABELS,
  STATUS_LABELS,
  TIPO_OPERACIONAL_LABELS,
  type Fornecedor,
} from "@/lib/fornecedores-shared";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export function FornecedorFormModal({
  editar,
  onClose,
}: {
  editar?: Fornecedor;
  onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState<FornecedorInput>({
    name: editar?.name ?? "",
    descricao: editar?.descricao ?? "",
    tipo_operacional: editar?.tipo_operacional ?? "operacional",
    status: editar?.status ?? "ativo",
    faixa_preco: editar?.faixa_preco ?? "",
    phone: editar?.phone ?? "",
    whatsapp: editar?.whatsapp ?? "",
    email: editar?.email ?? "",
    cpf: editar?.cpf ?? "",
    endereco: editar?.endereco ?? "",
    cidade: editar?.cidade ?? "",
    categorias: editar?.categorias ?? [],
  });
  const [cep, setCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (patch: Partial<FornecedorInput>) =>
    setF((prev) => ({ ...prev, ...patch }));

  async function preencherCep(valor: string) {
    setCep(valor);
    if (valor.replace(/\D/g, "").length === 8) {
      setBuscandoCep(true);
      const end = await buscarCep(valor);
      setBuscandoCep(false);
      if (end) set({ endereco: end.endereco, cidade: end.cidade });
    }
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const r = editar
        ? await editarFornecedor(editar.id, f)
        : await criarFornecedor(f);
      if (r.error) {
        setErro(r.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {editar ? "Editar fornecedor" : "Cadastrar fornecedor"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Nome *</label>
            <input
              value={f.name}
              onChange={(e) => set({ name: e.target.value })}
              autoFocus
              placeholder="Ex.: Grupo Prime"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Categorias de serviço *</label>
            <CategoriasMultiSelect
              value={f.categorias}
              onChange={(categorias) => set({ categorias })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tipo operacional *</label>
              <select
                value={f.tipo_operacional}
                onChange={(e) => set({ tipo_operacional: e.target.value })}
                className={inputClass}
              >
                {Object.entries(TIPO_OPERACIONAL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={f.status}
                onChange={(e) => set({ status: e.target.value })}
                className={inputClass}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="-mt-2 text-xs text-gray-400">
            Operacional = participa da execução no dia do evento. Apoio =
            atende o evento mas normalmente não está presente no dia.
          </p>

          <div>
            <label className={labelClass}>
              Descrição{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={f.descricao}
              onChange={(e) => set({ descricao: e.target.value })}
              rows={2}
              placeholder="Ex.: Velas de porcelana pintada à mão, especializado em casamentos ao ar livre…"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Faixa de preço</label>
            <select
              value={f.faixa_preco}
              onChange={(e) => set({ faixa_preco: e.target.value })}
              className={inputClass}
            >
              <option value="">Não informado</option>
              <option value="economico">Econômico ($)</option>
              <option value="intermediario">Intermediário ($$)</option>
              <option value="premium">Premium ($$$)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Telefone</label>
              <input
                value={f.phone}
                onChange={(e) => set({ phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>WhatsApp</label>
              <input
                value={f.whatsapp}
                onChange={(e) => set({ whatsapp: e.target.value })}
                placeholder="(11) 99999-9999"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>E-mail</label>
            <input
              type="email"
              value={f.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="contato@fornecedor.com"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>CEP</label>
              <input
                value={cep}
                onChange={(e) => preencherCep(e.target.value)}
                placeholder="00000-000"
                className={inputClass}
              />
              {buscandoCep && (
                <p className="mt-1 text-xs text-gray-400">Buscando…</p>
              )}
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Endereço</label>
              <input
                value={f.endereco}
                onChange={(e) => set({ endereco: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Cidade</label>
              <input
                value={f.cidade}
                onChange={(e) => set({ cidade: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                CPF{" "}
                <span className="font-normal text-gray-400">(nunca público)</span>
              </label>
              <input
                value={f.cpf}
                onChange={(e) => set({ cpf: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

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
              {pending ? "Salvando…" : editar ? "Salvar alterações" : "Cadastrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
