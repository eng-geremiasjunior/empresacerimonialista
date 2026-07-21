"use client";

// Formulário de criação/edição de Orçamento (Etapa 3): dados do evento
// potencial + validade + itens (modelos ou avulsos) com total ao vivo.
// Ao salvar, os itens vão como snapshot; o trigger do banco recalcula o
// valor_total oficial.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  salvarOrcamento,
  type OrcamentoPayload,
} from "@/app/(app)/orcamentos/actions";
import { AdicionarItemModal } from "@/components/orcamentos/AdicionarItemModal";
import { ItemOrcamentoCard } from "@/components/orcamentos/ItemOrcamentoCard";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import type { ModeloPrecificacao } from "@/lib/modelos-precificacao";
import {
  VALIDADE_OPCOES,
  formatBRL,
  formatDateBR,
  type ItemDraft,
  type Orcamento,
  type OrcamentoItem,
} from "@/lib/orcamentos";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

let seq = 0;
const novoDraftId = () => `draft-${++seq}-${Date.now()}`;

function paraDrafts(itens: OrcamentoItem[]): ItemDraft[] {
  return itens.map((i) => ({
    draftId: novoDraftId(),
    modelo_precificacao_id: i.modelo_precificacao_id,
    nome: i.nome,
    descricao: i.descricao,
    tipo_calculo: i.tipo_calculo,
    valor_unitario: i.valor_unitario,
    quantidade_convidados_aplicada: i.quantidade_convidados_aplicada,
    taxa_fixa: Number(i.taxa_fixa) || 0,
    valor_calculado: Number(i.valor_calculado) || 0,
    ordem: i.ordem,
  }));
}

export function OrcamentoForm({
  orcamento,
  itensIniciais,
  modelos,
}: {
  orcamento?: Orcamento;
  itensIniciais?: OrcamentoItem[];
  modelos: ModeloPrecificacao[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Seção 1
  const [contatoNome, setContatoNome] = useState(orcamento?.contato_nome ?? "");
  const [contatoTelefone, setContatoTelefone] = useState(
    orcamento?.contato_telefone ?? ""
  );
  const [contatoEmail, setContatoEmail] = useState(
    orcamento?.contato_email ?? ""
  );
  const [tipoEvento, setTipoEvento] = useState(orcamento?.tipo_evento ?? "");
  const [dataEvento, setDataEvento] = useState(orcamento?.data_evento ?? "");
  const [localEvento, setLocalEvento] = useState(
    orcamento?.local_evento ?? ""
  );
  const [cidadeEvento, setCidadeEvento] = useState(
    orcamento?.cidade_evento ?? ""
  );
  const [convidados, setConvidados] = useState(
    orcamento?.numero_convidados != null
      ? String(orcamento.numero_convidados)
      : ""
  );

  // Seção 2
  const [validadeDias, setValidadeDias] = useState(
    orcamento?.validade_dias ?? 30
  );

  // Seção 3
  const [itens, setItens] = useState<ItemDraft[]>(
    itensIniciais ? paraDrafts(itensIniciais) : []
  );

  const nConvidados = convidados.trim() ? Number(convidados) : null;
  const total = useMemo(
    () => itens.reduce((s, i) => s + (Number(i.valor_calculado) || 0), 0),
    [itens]
  );

  const dataCriacao = orcamento?.data_criacao ?? new Date().toISOString().slice(0, 10);
  const validoAte = useMemo(() => {
    const d = new Date(`${dataCriacao}T00:00:00`);
    d.setDate(d.getDate() + validadeDias);
    return d.toISOString().slice(0, 10);
  }, [dataCriacao, validadeDias]);

  // Mudou o nº de convidados com itens por_convidado já adicionados:
  // perguntar antes de recalcular (pode haver desconto manual proposital).
  function aoMudarConvidados(valor: string) {
    setConvidados(valor);
    const novo = valor.trim() ? Number(valor) : null;
    if (novo == null || !Number.isFinite(novo)) return;

    const porConvidado = itens.filter(
      (i) => i.tipo_calculo === "por_convidado"
    );
    if (porConvidado.length === 0) return;
    const mudou = porConvidado.some(
      (i) => i.quantidade_convidados_aplicada !== novo
    );
    if (!mudou) return;

    const recalcular = confirm(
      `Você alterou o número de convidados para ${novo}. Recalcular os ${porConvidado.length} item(ns) "por convidado" com o novo número?\n\n(Escolha Cancelar para manter os valores atuais.)`
    );
    if (!recalcular) return;

    setItens((prev) =>
      prev.map((i) =>
        i.tipo_calculo === "por_convidado"
          ? {
              ...i,
              quantidade_convidados_aplicada: novo,
              valor_calculado:
                (Number(i.valor_unitario) || 0) * novo +
                (Number(i.taxa_fixa) || 0),
            }
          : i
      )
    );
  }

  function salvar() {
    setErro(null);
    const payload: OrcamentoPayload = {
      contato_nome: contatoNome,
      contato_telefone: contatoTelefone || null,
      contato_email: contatoEmail || null,
      tipo_evento: tipoEvento,
      data_evento: dataEvento || null,
      local_evento: localEvento || null,
      cidade_evento: cidadeEvento || null,
      numero_convidados: nConvidados,
      validade_dias: validadeDias,
      itens: itens.map(({ draftId: _d, ...i }, idx) => ({ ...i, ordem: idx })),
    };
    startTransition(async () => {
      const res = await salvarOrcamento(orcamento?.id ?? null, payload);
      if (res && "error" in res) {
        setErro(res.error);
        return;
      }
      router.push("/orcamentos");
    });
  }

  return (
    <div className="space-y-6">
      {/* SEÇÃO 1 — contato e evento potencial */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          Dados de contato e evento
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className={labelClass}>Nome do contato *</label>
            <input
              value={contatoNome}
              onChange={(e) => setContatoNome(e.target.value)}
              placeholder="Ex.: Marina Silva"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input
              value={contatoTelefone}
              onChange={(e) => setContatoTelefone(e.target.value)}
              placeholder="(33) 90000-0000"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={contatoEmail}
              onChange={(e) => setContatoEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo de evento *</label>
            <select
              value={tipoEvento}
              onChange={(e) => setTipoEvento(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione…</option>
              {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Data prevista{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="date"
              value={dataEvento}
              onChange={(e) => setDataEvento(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Nº de convidados *</label>
            <input
              type="number"
              min={0}
              value={convidados}
              onChange={(e) => aoMudarConvidados(e.target.value)}
              placeholder="Ex.: 150"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Local</label>
            <input
              value={localEvento}
              onChange={(e) => setLocalEvento(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Cidade</label>
            <input
              value={cidadeEvento}
              onChange={(e) => setCidadeEvento(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* SEÇÃO 2 — validade */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          Validade do orçamento
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={validadeDias}
            onChange={(e) => setValidadeDias(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-gray-500 focus:outline-none"
          >
            {VALIDADE_OPCOES.map((d) => (
              <option key={d} value={d}>
                {d} dias
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            Válido até <strong>{formatDateBR(validoAte)}</strong>
          </span>
        </div>
      </section>

      {/* SEÇÃO 3 — itens */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Itens</h2>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            <Plus size={15} /> Adicionar item
          </button>
        </div>

        {itens.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            Nenhum item ainda — adicione um modelo cadastrado ou um item
            avulso.
          </p>
        ) : (
          <div>
            {itens.map((item) => (
              <ItemOrcamentoCard
                key={item.draftId}
                item={item}
                onRemover={() =>
                  setItens((prev) =>
                    prev.filter((i) => i.draftId !== item.draftId)
                  )
                }
                onValorManual={(v) =>
                  setItens((prev) =>
                    prev.map((i) =>
                      i.draftId === item.draftId
                        ? { ...i, valor_calculado: v }
                        : i
                    )
                  )
                }
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
          <span className="text-sm font-medium text-gray-500">Total</span>
          <span className="text-lg font-semibold text-gray-900">
            {formatBRL(total)}
          </span>
        </div>
      </section>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {/* Ações */}
      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={pending}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar como rascunho"}
        </button>
        <button
          onClick={salvar}
          disabled={pending}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50"
        >
          Salvar e continuar
        </button>
        <button
          onClick={() => router.push("/orcamentos")}
          className="rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          Cancelar
        </button>
      </div>

      {modalAberto && (
        <AdicionarItemModal
          modelos={modelos}
          convidados={nConvidados}
          onAdicionar={(novo) =>
            setItens((prev) => [
              ...prev,
              { ...novo, draftId: novoDraftId(), ordem: prev.length },
            ])
          }
          onClose={() => setModalAberto(false)}
        />
      )}
    </div>
  );
}
