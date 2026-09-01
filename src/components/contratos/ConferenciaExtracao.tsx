"use client";

// A conferência da proposta de extração — o gate dela, item a item.
//
// Movida de ExtrairContrato.tsx (Fase 0 da área de Contratos) sem
// mudança de comportamento: cada item com o trecho do contrato ao lado,
// ela desmarca e edita, e o Aplicar escreve pelas actions existentes.
// As props já são por-linha (eventId incluso), então o mesmo componente
// serve à caixa da aba Fornecedores e à lista multi-evento de /contratos.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { mascararDinheiro, desmascararDinheiro } from "@/lib/format";
import type { PropostaExtracao } from "@/lib/contrato-extracao-core";
import {
  aplicarExtracao,
  descartarExtracao,
  type EscolhasAplicacao,
} from "@/app/(app)/eventos/[id]/fornecedores/extracao-actions";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ParcelaForm = {
  manter: boolean;
  valor: string;
  vencimento: string;
  descricao: string;
  trecho: string | null;
};
type QuantidadeForm = {
  manter: boolean;
  nome: string;
  quantidade: string;
  unidade: string;
  trecho: string | null;
};

export function ConferenciaExtracao({
  eventId,
  extracaoId,
  payload,
  itemRoteiroTitulo,
  aoFechar,
}: {
  eventId: string;
  extracaoId: string;
  payload: PropostaExtracao;
  itemRoteiroTitulo: string | null;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [parcelas, setParcelas] = useState<ParcelaForm[]>(() =>
    payload.parcelas.map((p) => ({
      manter: true,
      valor: mascararDinheiro(p.valor.toFixed(2).replace(".", ",")),
      vencimento: p.vencimento ?? "",
      descricao: p.descricao ?? "",
      trecho: p.trecho,
    }))
  );
  const [quantidades, setQuantidades] = useState<QuantidadeForm[]>(() =>
    payload.quantidades.map((q) => ({
      manter: true,
      nome: q.nome,
      quantidade: String(q.quantidade),
      unidade: q.unidade ?? "",
      trecho: q.trecho,
    }))
  );
  // o destino do horário é UM item (o mais cedo do fornecedor no roteiro)
  const [horarioIdx, setHorarioIdx] = useState<number>(
    itemRoteiroTitulo && payload.horarios.length > 0 ? 0 : -1
  );

  const somaMarcada = parcelas
    .filter((p) => p.manter)
    .reduce((s, p) => s + (desmascararDinheiro(p.valor) ?? 0), 0);
  const divergeDoTotal =
    payload.valor_total != null &&
    parcelas.some((p) => p.manter) &&
    Math.abs(somaMarcada - payload.valor_total) > 0.01;

  function aplicar() {
    setErro(null);
    const escolhas: EscolhasAplicacao = {
      parcelas: parcelas
        .filter((p) => p.manter)
        .map((p) => ({
          valor: desmascararDinheiro(p.valor) ?? 0,
          vencimento: p.vencimento,
          descricao: p.descricao.trim() || null,
        })),
      quantidades: quantidades
        .filter((q) => q.manter)
        .map((q) => ({
          nome: q.nome,
          quantidade: Number(q.quantidade.replace(",", ".")),
          unidade: q.unidade.trim() || null,
        })),
      horario:
        horarioIdx >= 0 && payload.horarios[horarioIdx]
          ? { hora: payload.horarios[horarioIdx].hora }
          : null,
    };
    const faltaData = escolhas.parcelas.some(
      (p) => !/^\d{4}-\d{2}-\d{2}$/.test(p.vencimento)
    );
    if (faltaData) {
      setErro("Preencha o vencimento das parcelas marcadas (o contrato não cravou a data).");
      return;
    }
    iniciar(async () => {
      const r = await aplicarExtracao(eventId, extracaoId, escolhas);
      if ("error" in r) setErro(r.error);
      else {
        aoFechar();
        router.refresh();
      }
    });
  }

  const trechoEl = (t: string | null) =>
    t ? (
      <p className="mt-0.5 truncate text-[10.5px] italic text-gray-400" title={t}>
        “{t}”
      </p>
    ) : null;

  const input =
    "rounded-md border border-gray-200 px-2 py-1 text-[12px] text-gray-900 outline-none focus:border-amber-400";

  return (
    <div className="mt-2.5 space-y-3 border-t border-amber-100 pt-2.5">
      {payload.valor_total != null && (
        <p className="text-[12px] text-gray-600">
          Valor total lido no contrato:{" "}
          <strong className="text-gray-900">{brl(payload.valor_total)}</strong>
          {divergeDoTotal && (
            <span className="ml-1.5 text-amber-700">
              — as parcelas marcadas somam {brl(somaMarcada)}, confira.
            </span>
          )}
          {trechoEl(payload.trecho_valor)}
        </p>
      )}

      {parcelas.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Parcelas → Financeiro (entram como não pagas)
          </p>
          <div className="mt-1.5 space-y-1.5">
            {parcelas.map((p, i) => (
              <div key={i} className="rounded-md border border-gray-100 px-2 py-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="checkbox"
                    checked={p.manter}
                    onChange={(e) =>
                      setParcelas(parcelas.map((x, j) => (j === i ? { ...x, manter: e.target.checked } : x)))
                    }
                  />
                  <input
                    className={`${input} w-28 text-right`}
                    value={p.valor}
                    disabled={!p.manter}
                    onChange={(e) =>
                      setParcelas(parcelas.map((x, j) => (j === i ? { ...x, valor: mascararDinheiro(e.target.value) } : x)))
                    }
                  />
                  <input
                    type="date"
                    className={input}
                    value={p.vencimento}
                    disabled={!p.manter}
                    onChange={(e) =>
                      setParcelas(parcelas.map((x, j) => (j === i ? { ...x, vencimento: e.target.value } : x)))
                    }
                  />
                  <input
                    className={`${input} min-w-0 flex-1`}
                    placeholder="descrição"
                    value={p.descricao}
                    disabled={!p.manter}
                    onChange={(e) =>
                      setParcelas(parcelas.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))
                    }
                  />
                </div>
                {trechoEl(p.trecho)}
              </div>
            ))}
          </div>
        </div>
      )}

      {quantidades.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Quantidades → Operação (entram como compradas)
          </p>
          <div className="mt-1.5 space-y-1.5">
            {quantidades.map((q, i) => (
              <div key={i} className="rounded-md border border-gray-100 px-2 py-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="checkbox"
                    checked={q.manter}
                    onChange={(e) =>
                      setQuantidades(quantidades.map((x, j) => (j === i ? { ...x, manter: e.target.checked } : x)))
                    }
                  />
                  <input
                    className={`${input} min-w-0 flex-1`}
                    value={q.nome}
                    disabled={!q.manter}
                    onChange={(e) =>
                      setQuantidades(quantidades.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))
                    }
                  />
                  <input
                    className={`${input} w-20 text-right`}
                    value={q.quantidade}
                    disabled={!q.manter}
                    onChange={(e) =>
                      setQuantidades(quantidades.map((x, j) => (j === i ? { ...x, quantidade: e.target.value } : x)))
                    }
                  />
                  <input
                    className={`${input} w-24`}
                    placeholder="unidade"
                    value={q.unidade}
                    disabled={!q.manter}
                    onChange={(e) =>
                      setQuantidades(quantidades.map((x, j) => (j === i ? { ...x, unidade: e.target.value } : x)))
                    }
                  />
                </div>
                {trechoEl(q.trecho)}
              </div>
            ))}
          </div>
        </div>
      )}

      {payload.horarios.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Horário → Roteiro
          </p>
          {itemRoteiroTitulo ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-gray-700">
              <select
                className={input}
                value={horarioIdx}
                onChange={(e) => setHorarioIdx(Number(e.target.value))}
              >
                <option value={-1}>não aplicar</option>
                {payload.horarios.map((h, i) => (
                  <option key={i} value={i}>
                    {h.titulo} {h.hora}
                  </option>
                ))}
              </select>
              <span className="text-gray-500">
                → “{itemRoteiroTitulo}” (o item deste fornecedor no roteiro)
              </span>
            </div>
          ) : (
            <p className="mt-1 text-[12px] text-gray-500">
              {payload.horarios.map((h) => `${h.titulo} ${h.hora}`).join(" · ")} — este
              fornecedor não tem item no roteiro, então o horário não tem onde
              entrar.
            </p>
          )}
        </div>
      )}

      {erro && <p className="text-[12px] text-red-600">{erro}</p>}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          onClick={aplicar}
          disabled={pendente}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {pendente ? "Aplicando…" : "Aplicar o que está marcado"}
        </button>
        <button
          onClick={() =>
            iniciar(async () => {
              const r = await descartarExtracao(eventId, extracaoId);
              if ("error" in r) setErro(r.error);
              else {
                aoFechar();
                router.refresh();
              }
            })
          }
          disabled={pendente}
          aria-label="Descartar proposta"
          title="Descartar (nada entra)"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-60"
        >
          <X size={15} />
        </button>
        <span className="text-[11px] text-gray-400">
          Só entra o que está marcado — e nada entra como pago.
        </span>
      </div>
    </div>
  );
}
