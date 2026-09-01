"use client";

// A prestação de contas do casal — revisão e entrega.
//
// O sistema monta o documento a partir do que o banco já sabe; ela lê
// EXATAMENTE o que o casal vai receber, escreve as observações dela por
// seção, e decide quando entrega. Nada sai sozinho.
//
// As três regras na tela: pendência aparece como pendência; "valor
// contratado (não conferido)" enquanto a conferência pós-evento não
// existe; e a entrega congela — os números daqui de cima podem mudar
// depois, o documento entregue não.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, Send } from "lucide-react";
import type { PrestacaoPayload } from "@/lib/prestacao-core";
import { SECOES_NOTA, type SecaoNota } from "@/lib/prestacao-core";
import {
  entregarPrestacao,
  salvarNotaPrestacao,
  type ResultadoPrestacao,
} from "@/app/(app)/eventos/[id]/financeiro/prestacao-actions";
import type { VersaoEntregue } from "@/lib/supabase/prestacao";

const brl = (v: number | null | undefined) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dataBR = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

const ROTULO_SECAO: Record<SecaoNota, string> = {
  resumo: "Observação sobre o resumo",
  fornecedores: "Observação sobre os fornecedores",
  parcelas: "Observação sobre os pagamentos",
  dia: "Observação sobre o dia",
  geral: "Mensagem final ao casal",
};

export function PrestacaoDeContas({
  eventId,
  payload,
  notas,
  versoes,
}: {
  eventId: string;
  payload: PrestacaoPayload;
  notas: Record<string, string>;
  versoes: VersaoEntregue[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [aberta, setAberta] = useState(false);

  const ultima = versoes[0] ?? null;

  function rodar(fn: () => Promise<ResultadoPrestacao>) {
    setErro(null);
    setOk(null);
    iniciar(async () => {
      const r = await fn();
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      if (r.versao) {
        setOk(`Entregue ao casal — versão ${r.versao}. O documento está congelado.`);
      }
      router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <FileCheck2 size={16} />
            Prestação de contas do casal
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            {ultima
              ? `Versão ${ultima.versao} entregue em ${dataBR(ultima.entregue_em.slice(0, 10))}. Os números abaixo são os de agora — reemitir cria a versão ${ultima.versao + 1}.`
              : "O casal ainda não recebeu. Revise, escreva suas observações e entregue quando estiver pronta."}
          </p>
        </div>
        <button
          onClick={() => setAberta(!aberta)}
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-stone-300"
        >
          {aberta ? "Fechar prévia" : "Revisar documento"}
        </button>
      </div>

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      {ok && !erro && <p className="mt-3 text-sm font-medium text-stone-900">{ok}</p>}

      {aberta && (
        <div className="mt-4 space-y-5 border-t border-stone-100 pt-4">
          {/* ---------------- resumo ---------------- */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Resumo
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi rotulo="Contratado" valor={brl(payload.resumo.contratado)} />
              <Kpi rotulo="Pago" valor={brl(payload.resumo.pago)} />
              <Kpi
                rotulo="Em aberto"
                valor={brl(payload.resumo.em_aberto)}
                destaque={payload.resumo.em_aberto > 0}
              />
              <Kpi
                rotulo="Economia"
                valor={brl(payload.resumo.economia)}
                nota={
                  payload.resumo.fornecedores_com_estimativa > 0
                    ? `de ${payload.resumo.fornecedores_com_estimativa} fornecedores`
                    : undefined
                }
              />
            </dl>
            <Nota eventId={eventId} secao="resumo" inicial={notas.resumo ?? ""} rodar={rodar} pendente={pendente} />
          </div>

          {/* ---------------- fornecedores ---------------- */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Por fornecedor
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
                    <th className="py-1.5 pr-3 font-medium">Fornecedor</th>
                    <th className="w-28 px-2 py-1.5 text-right font-medium">Estimado</th>
                    <th className="w-32 px-2 py-1.5 text-right font-medium">Contratado</th>
                    <th className="w-28 px-2 py-1.5 text-right font-medium">Pago</th>
                    <th className="w-28 px-2 py-1.5 text-right font-medium">Em aberto</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.fornecedores.map((f) => (
                    <tr key={f.nome} className="border-b border-stone-100">
                      <td className="py-1.5 pr-3 font-medium text-stone-800">{f.nome}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-stone-500">
                        {brl(f.estimado)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-stone-800">
                        {brl(f.contratado)}
                        {!f.conferido && (
                          <span className="block text-[10px] leading-tight text-stone-400">
                            não conferido
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-stone-800">
                        {brl(f.pago)}
                      </td>
                      <td
                        className={`px-2 py-1.5 text-right tabular-nums ${f.em_aberto > 0 ? "font-medium text-amber-700" : "text-stone-500"}`}
                      >
                        {brl(f.em_aberto)}
                      </td>
                    </tr>
                  ))}
                  {payload.fornecedores.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-sm text-stone-400">
                        Nenhum fornecedor com verba registrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Nota eventId={eventId} secao="fornecedores" inicial={notas.fornecedores ?? ""} rodar={rodar} pendente={pendente} />
          </div>

          {/* ---------------- pendências, ditas ---------------- */}
          {payload.pendencias.parcelas_abertas > 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {payload.pendencias.parcelas_abertas === 1
                ? "1 parcela em aberto"
                : `${payload.pendencias.parcelas_abertas} parcelas em aberto`}{" "}
              ({brl(payload.pendencias.valor_em_aberto)}) — o documento vai
              dizer isso ao casal, não esconder.
            </p>
          )}
          <Nota eventId={eventId} secao="parcelas" inicial={notas.parcelas ?? ""} rodar={rodar} pendente={pendente} />

          {/* ---------------- o dia ---------------- */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              O dia
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {payload.dia.total > 0
                ? `${payload.dia.concluidos} de ${payload.dia.total} etapas concluídas · ${payload.convidados.confirmados} ${payload.convidados.origem}`
                : `Sem roteiro registrado · ${payload.convidados.confirmados} ${payload.convidados.origem}`}
            </p>
            <Nota eventId={eventId} secao="dia" inicial={notas.dia ?? ""} rodar={rodar} pendente={pendente} />
          </div>

          {/* ---------------- mensagem final + entrega ---------------- */}
          <Nota eventId={eventId} secao="geral" inicial={notas.geral ?? ""} rodar={rodar} pendente={pendente} />

          <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
            <button
              onClick={() => {
                const confirma = window.confirm(
                  ultima
                    ? `Entregar a versão ${ultima.versao + 1}? A anterior continua guardada; a nova congela os números como estão agora.`
                    : "Entregar a prestação de contas ao casal? Os números serão congelados como estão agora."
                );
                if (confirma) rodar(() => entregarPrestacao(eventId));
              }}
              disabled={pendente}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Send size={14} />
              {pendente
                ? "Entregando…"
                : ultima
                  ? `Reemitir (versão ${ultima.versao + 1})`
                  : "Entregar ao casal"}
            </button>
            <span className="text-xs text-stone-400">
              O casal vê no portal, em Investimento → Prestação de contas.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function Kpi({
  rotulo,
  valor,
  nota,
  destaque,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-stone-400">{rotulo}</dt>
      <dd
        className={`mt-0.5 text-sm font-semibold tabular-nums ${destaque ? "text-amber-700" : "text-stone-900"}`}
      >
        {valor}
      </dd>
      {nota && <p className="text-[10px] text-stone-400">{nota}</p>}
    </div>
  );
}

function Nota({
  eventId,
  secao,
  inicial,
  rodar,
  pendente,
}: {
  eventId: string;
  secao: SecaoNota;
  inicial: string;
  rodar: (fn: () => Promise<ResultadoPrestacao>) => void;
  pendente: boolean;
}) {
  return (
    <label className="mt-2 block">
      <span className="text-xs text-stone-400">{ROTULO_SECAO[secao]}</span>
      <textarea
        rows={2}
        defaultValue={inicial}
        disabled={pendente}
        onBlur={(e) => {
          if (e.target.value !== inicial) {
            rodar(() => salvarNotaPrestacao(eventId, secao, e.target.value));
          }
        }}
        placeholder="Opcional — entra no documento do jeito que você escrever."
        className="mt-1 w-full resize-y rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm outline-none focus:border-stone-400"
      />
    </label>
  );
}
