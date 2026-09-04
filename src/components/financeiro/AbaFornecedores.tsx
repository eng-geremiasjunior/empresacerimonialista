"use client";

// Aba Fornecedores do financeiro do evento (063): verba alocada por
// fornecedor, quanto já foi pago e as parcelas de cada um.
//
// O detalhamento por item NUNCA aparece por padrão. Quando existe, o nome
// do fornecedor ganha um indicador discreto que abre um popover — é
// informação de bastidor da negociação, não algo para poluir a lista.

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ListTree,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { formatBRL } from "@/lib/orcamentos";
import {
  montarLinhas,
  resumoVerba,
  totalDoFornecedor,
  type LinhaFornecedor,
  type ParcelaFornecedor,
  type VerbaFornecedor,
} from "@/lib/verba-fornecedores";
import { FormVerbaFornecedor } from "@/components/financeiro/FormVerbaFornecedor";
import { LancarPagamentoFornecedor } from "@/components/financeiro/LancarPagamentoFornecedor";
import { MarcarPagoInline } from "@/components/financeiro/MarcarPagoInline";
import { excluirVerbaFornecedor } from "@/app/(app)/eventos/[id]/financeiro/verba-actions";
import {
  desmarcarPago,
  excluirTransacao,
} from "@/app/(app)/eventos/[id]/financeiro/actions";

function Card({
  rotulo,
  valor,
  destaque,
  nota,
}: {
  rotulo: string;
  valor: string;
  destaque?: "verde" | "ambar";
  nota?: string;
}) {
  const cor =
    destaque === "verde"
      ? "text-emerald-700"
      : destaque === "ambar"
        ? "text-amber-700"
        : "text-gray-900";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {rotulo}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${cor}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-gray-400">{nota}</p>}
    </div>
  );
}

function PopoverItens({ linha }: { linha: LinhaFornecedor }) {
  const [aberto, setAberto] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Detalhamento de ${linha.fornecedor}`}
        onMouseEnter={() => setAberto(true)}
        onMouseLeave={() => setAberto(false)}
        onClick={(e) => {
          e.stopPropagation();
          setAberto((v) => !v);
        }}
        className="ml-1.5 rounded p-0.5 text-gray-300 transition-colors hover:text-gray-600"
      >
        <ListTree size={14} />
      </button>
      {aberto && (
        <span
          className="absolute left-0 top-6 z-30 w-[300px] rounded-xl border border-gray-200 bg-white p-3 text-left shadow-lg"
          onMouseEnter={() => setAberto(true)}
          onMouseLeave={() => setAberto(false)}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Detalhamento
          </span>
          <span className="mt-2 block space-y-1.5">
            {linha.itens.map((i) => (
              <span key={i.id} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-gray-700">{i.descricao}</span>
                <span className="shrink-0 whitespace-nowrap">
                  {i.valor_estimado_inicial != null && (
                    <span className="text-gray-400 line-through">
                      {formatBRL(Number(i.valor_estimado_inicial))}
                    </span>
                  )}{" "}
                  <span className="font-medium text-gray-900">
                    {formatBRL(Number(i.valor_negociado ?? 0))}
                  </span>
                </span>
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

function LinhaFornecedorUI({
  linha,
  eventId,
  todayIso,
  onMudou,
}: {
  linha: LinhaFornecedor;
  eventId: string;
  todayIso: string;
  onMudou: () => void;
}) {
  // Abre sozinha quando há o que lançar: a linha fechada com "Pago R$ 0"
  // e sem porta nenhuma foi o que escondeu esta função até agora.
  const [aberto, setAberto] = useState(false);
  const [lancando, setLancando] = useState(false);
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const total = totalDoFornecedor(linha);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          onClick={() => setAberto((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={aberto}
        >
          {/* o expansor existe sempre: mesmo sem parcela, é por dentro
              que se lança o primeiro pagamento */}
          {aberto ? (
            <ChevronDown size={15} className="shrink-0 text-gray-400" />
          ) : (
            <ChevronRight size={15} className="shrink-0 text-gray-400" />
          )}
          <span className="min-w-0">
            <span className="flex items-center">
              <span className="truncate text-sm font-medium text-gray-900">
                {linha.fornecedor}
              </span>
              {/* só aparece quando há itens cadastrados */}
              {linha.temDetalhe && <PopoverItens linha={linha} />}
            </span>
            {linha.observacao && (
              <span className="block truncate text-xs text-gray-400">
                {linha.observacao}
              </span>
            )}
          </span>
        </button>

        <div className="flex items-center gap-5 text-right">
          <span>
            <span className="block text-[10px] uppercase tracking-wide text-gray-400">
              Alocado
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {formatBRL(total)}
            </span>
          </span>
          <span>
            <span className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wide text-gray-400">
              Pago
              {/* Estouro: pago acima do alocado. Não bloqueia — só alerta. */}
              {linha.estourou && (
                <AlertTriangle
                  size={11}
                  className="text-red-600"
                  aria-label="Pago acima do alocado"
                />
              )}
            </span>
            <span
              className={`text-sm font-medium ${linha.estourou ? "text-red-600" : "text-emerald-700"}`}
            >
              {formatBRL(linha.pago)}
            </span>
            {linha.estourou && (
              <span className="block text-[10px] font-medium text-red-600">
                +{formatBRL(linha.excesso)} do previsto
              </span>
            )}
          </span>
          <span>
            <span className="block text-[10px] uppercase tracking-wide text-gray-400">
              Estimado inicial
            </span>
            <span className="text-sm font-medium text-gray-500">
              {linha.valor_estimado_inicial != null
                ? formatBRL(Number(linha.valor_estimado_inicial))
                : "—"}
            </span>
          </span>
          <button
            onClick={() => {
              if (!confirm(`Remover a verba de "${linha.fornecedor}"?`)) return;
              excluirVerbaFornecedor(eventId, linha.id).then(onMudou);
            }}
            aria-label={`Remover verba de ${linha.fornecedor}`}
            className="rounded p-1.5 text-gray-300 hover:bg-gray-100 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {aberto && (
        <div className="bg-gray-50 px-4 py-2">
          {linha.parcelas.length === 0 && !lancando && (
            <p className="py-2 text-xs text-gray-500">
              Nenhum pagamento lançado para este fornecedor ainda.
            </p>
          )}

          {linha.parcelas.map((p) => (
            <div key={p.id} className="border-b border-gray-100 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs">
                <span className="text-gray-700">
                  {p.description || "Parcela"}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-gray-500">
                    {p.paid && p.paid_at
                      ? `pago em ${p.paid_at.slice(0, 10).split("-").reverse().join("/")}`
                      : `venc. ${p.due_date.split("-").reverse().join("/")}`}
                  </span>
                  {p.paid ? (
                    <button
                      onClick={() =>
                        desmarcarPago(eventId, p.id).then(onMudou)
                      }
                      title="Desfazer o pagamento"
                      className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      Pago
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        setPagandoId(pagandoId === p.id ? null : p.id)
                      }
                      className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 hover:bg-amber-100"
                    >
                      Marcar pago
                    </button>
                  )}
                  <span className="w-20 text-right font-medium text-gray-900">
                    {formatBRL(Number(p.value))}
                  </span>
                  <button
                    onClick={() => {
                      if (!confirm("Excluir este lançamento?")) return;
                      excluirTransacao(eventId, p.id).then(onMudou);
                    }}
                    aria-label="Excluir lançamento"
                    className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              </div>

              {pagandoId === p.id && (
                <div className="pb-2">
                  <MarcarPagoInline
                    eventId={eventId}
                    transactionId={p.id}
                    todayIso={todayIso}
                    onClose={() => {
                      setPagandoId(null);
                      onMudou();
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          {lancando ? (
            <div className="-mx-4 mt-1">
              <LancarPagamentoFornecedor
                eventId={eventId}
                supplierId={linha.supplier_id}
                fornecedor={linha.fornecedor}
                todayIso={todayIso}
                onFechar={() => setLancando(false)}
                onSalvo={onMudou}
              />
            </div>
          ) : (
            <button
              onClick={() => setLancando(true)}
              className="mt-1 flex items-center gap-1.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              <Plus size={13} /> Lançar pagamento
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AbaFornecedores({
  eventId,
  verbas,
  parcelas,
  fornecedoresDisponiveis,
  migracaoPendente,
  todayIso,
  onMudou,
}: {
  eventId: string;
  verbas: VerbaFornecedor[];
  parcelas: ParcelaFornecedor[];
  fornecedoresDisponiveis: { id: string; name: string }[];
  migracaoPendente: boolean;
  /** hoje calculado no servidor — o cliente pode estar em outro fuso */
  todayIso: string;
  onMudou: () => void;
}) {
  const [formAberto, setFormAberto] = useState(false);
  const linhas = montarLinhas(verbas, parcelas);
  const resumo = resumoVerba(linhas);

  if (migracaoPendente) {
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
      >
        A verba por fornecedor ainda não foi liberada nesta conta.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card rotulo="Verba total alocada" valor={formatBRL(resumo.alocado)} />
        <Card
          rotulo="Pago aos fornecedores"
          valor={formatBRL(resumo.pago)}
          destaque="verde"
        />
        <Card rotulo="A pagar" valor={formatBRL(resumo.aPagar)} destaque="ambar" />
        <Card
          rotulo="Economia"
          valor={formatBRL(resumo.economia)}
          destaque={resumo.economia >= 0 ? "verde" : "ambar"}
          nota={
            resumo.comEstimativa === 0
              ? "sem estimativa inicial informada"
              : `de ${resumo.comEstimativa} ${
                  resumo.comEstimativa === 1 ? "fornecedor" : "fornecedores"
                }`
          }
        />
      </div>

      {/* Política do saldo — decisão fechada: dinheiro nunca é redistribuído
          em cascata pelo sistema. Texto fixo, não um valor calculado: a
          verba aqui é a soma das alocações, não há reserva a recalcular. */}
      <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
        <ShieldCheck size={15} className="mt-px shrink-0 text-gray-400" />
        <span>
          O saldo é protegido — o eorganizei nunca o redistribui automaticamente.
          Ajustes no orçamento (como mudança de convidados) apenas sugerem
          revisão; você confirma cada realocação.
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Verba por fornecedor
          </h3>
          {!formAberto && (
            <button
              onClick={() => setFormAberto(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
            >
              <Plus size={14} /> Adicionar fornecedor à verba
            </button>
          )}
        </div>

        {formAberto && (
          <div className="border-b border-gray-100 p-4">
            <FormVerbaFornecedor
              eventId={eventId}
              fornecedores={fornecedoresDisponiveis}
              jaAlocados={verbas.map((v) => v.supplier_id)}
              onFechar={() => setFormAberto(false)}
              onSalvo={() => {
                setFormAberto(false);
                onMudou();
              }}
            />
          </div>
        )}

        {linhas.length === 0 && !formAberto ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">
            Nenhuma verba alocada ainda. Adicione um fornecedor para começar a
            acompanhar quanto foi negociado e quanto já foi pago.
          </p>
        ) : (
          linhas.map((l) => (
            <LinhaFornecedorUI
              key={l.id}
              linha={l}
              eventId={eventId}
              todayIso={todayIso}
              onMudou={onMudou}
            />
          ))
        )}
      </div>
    </div>
  );
}
