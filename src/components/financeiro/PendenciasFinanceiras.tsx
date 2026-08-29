"use client";

// Pendências abertas pela automação (074): a tarefa foi concluída na
// Organização e deixou trabalho financeiro aqui. Fechar o ciclo é o que
// esta caixa faz — lançar a despesa (ou dar por revisado).
//
// Nada entra no Financeiro sem a cerimonialista informar valor, fornecedor
// e data: a automação abre o rascunho, quem decide o dinheiro é ela.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, X } from "lucide-react";
import {
  fecharPendencia,
  resolverPendenciaComLancamento,
} from "@/app/(app)/eventos/[id]/financeiro/actions";

export type Pendencia = {
  id: string;
  titulo: string;
  tipo: "pagamento" | "revisao";
  criadaEm: string;
  /** o que a origem já sabia — o formulário nasce preenchido */
  valorSugerido?: number | null;
  supplierId?: string | null;
  quantidade?: number | null;
  /** true = veio de um item comprado na Operação, não de uma tarefa */
  daOperacao?: boolean;
};

export function PendenciasFinanceiras({
  eventId,
  pendencias,
  fornecedores,
}: {
  eventId: string;
  pendencias: Pendencia[];
  fornecedores: { id: string; name: string }[];
}) {
  const [aberta, setAberta] = useState<string | null>(null);

  if (pendencias.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
        <CircleAlert size={15} />
        {pendencias.length === 1
          ? "1 tarefa concluída espera lançamento"
          : `${pendencias.length} tarefas concluídas esperam lançamento`}
      </h3>

      <div className="mt-3 space-y-2">
        {pendencias.map((p) => (
          <ItemPendencia
            key={p.id}
            eventId={eventId}
            pendencia={p}
            fornecedores={fornecedores}
            aberta={aberta === p.id}
            onAbrir={() => setAberta(aberta === p.id ? null : p.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ItemPendencia({
  eventId,
  pendencia,
  fornecedores,
  aberta,
  onAbrir,
}: {
  eventId: string;
  pendencia: Pendencia;
  fornecedores: { id: string; name: string }[];
  aberta: boolean;
  onAbrir: () => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pend, start] = useTransition();

  const ehRevisao = pendencia.tipo === "revisao";

  function fechar(status: "resolvida" | "descartada") {
    setErro(null);
    start(async () => {
      const r = await fecharPendencia(eventId, pendencia.id, status);
      if (r.error) setErro(r.error);
      else router.refresh();
    });
  }

  function lancar(formData: FormData) {
    setErro(null);
    start(async () => {
      const r = await resolverPendenciaComLancamento(
        eventId,
        pendencia.id,
        null,
        formData
      );
      if (r && "error" in r) setErro(r.error);
      else router.refresh();
    });
  }

  const input =
    "w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-amber-400";

  return (
    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-[13.5px] font-medium text-gray-900">
          {pendencia.titulo}
        </span>

        {ehRevisao ? (
          <button
            onClick={() => fechar("resolvida")}
            disabled={pend}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            Marcar como revisado
          </button>
        ) : (
          <button
            onClick={onAbrir}
            disabled={pend}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {aberta ? "Fechar" : "Lançar despesa"}
          </button>
        )}

        <button
          onClick={() => fechar("descartada")}
          disabled={pend}
          aria-label="Descartar pendência"
          title="Descartar"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-60"
        >
          <X size={15} />
        </button>
      </div>

      <p className="mt-0.5 text-[11.5px] text-gray-500">
        {ehRevisao
          ? "a contagem mudou — confira o custo de buffet e bar"
          : pendencia.daOperacao
            ? "vindo da Operação"
            : "vindo da Organização"}
      </p>

      {aberta && !ehRevisao && (
        <form action={lancar} className="mt-2.5 grid gap-2 sm:grid-cols-2">
          <input
            name="description"
            defaultValue={pendencia.titulo}
            placeholder="Descrição"
            className={`${input} sm:col-span-2`}
          />
          <input
            name="value"
            inputMode="decimal"
            defaultValue={
              pendencia.valorSugerido != null
                ? pendencia.valorSugerido.toFixed(2).replace(".", ",")
                : ""
            }
            placeholder="Valor (ex.: 1800,00)"
            className={input}
          />
          <input name="due_date" type="date" className={input} />
          <select
            name="supplier_id"
            defaultValue={pendencia.supplierId ?? ""}
            className={`${input} sm:col-span-2`}
          >
            <option value="">Sem fornecedor (conta da assessoria)</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-[12.5px] text-gray-700">
            <input type="checkbox" name="paid" value="true" />
            já foi pago
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pend}
              className="rounded-lg bg-gray-900 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {pend ? "Lançando…" : "Lançar e fechar pendência"}
            </button>
          </div>
        </form>
      )}

      {erro && <p className="mt-1 text-[12px] text-rose-600">{erro}</p>}
    </div>
  );
}
