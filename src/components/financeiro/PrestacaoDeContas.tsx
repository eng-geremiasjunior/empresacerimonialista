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
import { FileCheck2, Send, X } from "lucide-react";
import type { PrestacaoPayload } from "@/lib/prestacao-core";
import { SECOES_NOTA, type SecaoNota } from "@/lib/prestacao-core";
import {
  conferirValorFornecedor,
  entregarPrestacao,
  salvarNotaPrestacao,
} from "@/app/(app)/eventos/[id]/financeiro/prestacao-actions";
import {
  atualizarOcorrencia,
  criarOcorrencia,
  excluirOcorrencia,
} from "@/app/(app)/eventos/[id]/ocorrencia-actions";
import { TIPOS_OCORRENCIA } from "@/lib/ocorrencia";
import type {
  ConferenciaFornecedor,
  OcorrenciaEvento,
  VersaoEntregue,
} from "@/lib/supabase/prestacao";
import { mascararDinheiro, desmascararDinheiro } from "@/lib/format";

const brl = (v: number | null | undefined) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dataBR = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

/** união larga: as actions da prestação e das ocorrências cabem aqui */
type Resultado = { error: string } | { success: true; versao?: number };

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
  conferencia,
  ocorrencias,
}: {
  eventId: string;
  payload: PrestacaoPayload;
  notas: Record<string, string>;
  versoes: VersaoEntregue[];
  conferencia: ConferenciaFornecedor[];
  ocorrencias: OcorrenciaEvento[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [aberta, setAberta] = useState(false);

  const ultima = versoes[0] ?? null;

  function rodar(fn: () => Promise<Resultado>) {
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
                        <span className="block text-[10px] leading-tight text-stone-400">
                          {f.conferido
                            ? f.realizado !== null && f.realizado !== f.contratado
                              ? `valor final ${brl(f.realizado)}`
                              : "conferido"
                            : "não conferido"}
                        </span>
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

          {/* ---------------- conferência pós-evento (139) ---------------- */}
          {conferencia.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Conferência pós-evento
              </p>
              <p className="mt-1 text-xs text-stone-500">
                O valor final acertado com cada fornecedor. Conferido, o
                documento troca &quot;não conferido&quot; por &quot;conferido&quot;.
              </p>
              <div className="mt-2 space-y-1.5">
                {conferencia.map((c) => (
                  <LinhaConferencia
                    key={c.orcamentoId}
                    eventId={eventId}
                    linha={c}
                    rodar={rodar}
                    pendente={pendente}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ---------------- ocorrências (139) ---------------- */}
          <PainelOcorrencias
            eventId={eventId}
            ocorrencias={ocorrencias}
            rodar={rodar}
            pendente={pendente}
          />

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
            {(payload.resumo.custo_por_pessoa ?? 0) > 0 && (
              <p className="mt-0.5 text-sm text-stone-600">
                {brl(payload.resumo.custo_por_pessoa)} por pessoa
                {(payload.convidados.presentes ?? 0) > 0
                  ? ` · ${payload.convidados.presentes} presentes`
                  : ""}
              </p>
            )}
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

const ROTULO_TIPO: Record<string, string> = {
  avaria: "Avaria",
  perda: "Perda",
  pertence: "Pertence",
  outro: "Outro",
};

function LinhaConferencia({
  eventId,
  linha,
  rodar,
  pendente,
}: {
  eventId: string;
  linha: ConferenciaFornecedor;
  rodar: (fn: () => Promise<Resultado>) => void;
  pendente: boolean;
}) {
  const inicial =
    linha.realizado ?? linha.contratado;
  const [valor, setValor] = useState(() =>
    mascararDinheiro(inicial.toFixed(2).replace(".", ","))
  );
  const conferido = linha.realizado !== null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-stone-100 px-2 py-1.5 text-sm">
      <span className="min-w-0 flex-1 text-stone-800">{linha.fornecedor}</span>
      <span className="text-xs text-stone-400">
        contratado {brl(linha.contratado)}
      </span>
      <input
        className="w-28 rounded-md border border-stone-200 px-2 py-1 text-right text-[12.5px] tabular-nums outline-none focus:border-stone-400"
        value={valor}
        disabled={pendente}
        onChange={(e) => setValor(mascararDinheiro(e.target.value))}
      />
      <button
        onClick={() => {
          const v = desmascararDinheiro(valor);
          if (v === null) return;
          rodar(() => conferirValorFornecedor(eventId, linha.orcamentoId, v));
        }}
        disabled={pendente}
        className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${
          conferido
            ? "border border-stone-200 text-stone-500"
            : "bg-stone-900 text-white"
        } disabled:opacity-50`}
      >
        {conferido ? "Conferir de novo" : "Conferir"}
      </button>
      {conferido && (
        <button
          onClick={() =>
            rodar(() => conferirValorFornecedor(eventId, linha.orcamentoId, null))
          }
          disabled={pendente}
          className="text-[11px] text-stone-400 underline underline-offset-2"
        >
          desfazer
        </button>
      )}
    </div>
  );
}

function PainelOcorrencias({
  eventId,
  ocorrencias,
  rodar,
  pendente,
}: {
  eventId: string;
  ocorrencias: OcorrenciaEvento[];
  rodar: (fn: () => Promise<Resultado>) => void;
  pendente: boolean;
}) {
  const [tipo, setTipo] = useState<string>("avaria");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
        Ocorrências
      </p>
      <p className="mt-1 text-xs text-stone-500">
        Só as marcadas com &quot;o casal vê&quot; entram no documento.
      </p>

      {ocorrencias.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {ocorrencias.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-stone-100 px-2 py-1.5 text-sm"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
                {ROTULO_TIPO[o.tipo] ?? o.tipo}
              </span>
              <span className="min-w-0 flex-1 text-stone-800">
                {o.descricao}
                {o.fornecedor && (
                  <span className="text-stone-400"> · {o.fornecedor}</span>
                )}
                {o.valor !== null && (
                  <span className="text-stone-500"> · {brl(o.valor)}</span>
                )}
              </span>
              <label className="flex items-center gap-1 text-[11.5px] text-stone-500">
                <input
                  type="checkbox"
                  checked={o.resolvida}
                  disabled={pendente}
                  onChange={(e) =>
                    rodar(() =>
                      atualizarOcorrencia(eventId, o.id, {
                        resolvida: e.target.checked,
                      })
                    )
                  }
                />
                resolvida
              </label>
              <label className="flex items-center gap-1 text-[11.5px] font-medium text-stone-600">
                <input
                  type="checkbox"
                  checked={o.visivelAoCasal}
                  disabled={pendente}
                  onChange={(e) =>
                    rodar(() =>
                      atualizarOcorrencia(eventId, o.id, {
                        visivelAoCasal: e.target.checked,
                      })
                    )
                  }
                />
                o casal vê
              </label>
              <button
                onClick={() => {
                  if (window.confirm("Excluir esta ocorrência?")) {
                    rodar(() => excluirOcorrencia(eventId, o.id));
                  }
                }}
                disabled={pendente}
                aria-label="Excluir ocorrência"
                className="rounded p-0.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded-md border border-stone-200 px-2 py-1 text-[12.5px] outline-none focus:border-stone-400"
        >
          {TIPOS_OCORRENCIA.map((t) => (
            <option key={t} value={t}>
              {ROTULO_TIPO[t]}
            </option>
          ))}
        </select>
        <input
          className="min-w-0 flex-1 rounded-md border border-stone-200 px-2 py-1 text-[12.5px] outline-none focus:border-stone-400"
          placeholder="o que aconteceu"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <input
          className="w-24 rounded-md border border-stone-200 px-2 py-1 text-right text-[12.5px] tabular-nums outline-none focus:border-stone-400"
          placeholder="valor"
          value={valor}
          onChange={(e) => setValor(mascararDinheiro(e.target.value))}
        />
        <button
          onClick={() => {
            if (!descricao.trim()) return;
            rodar(async () => {
              const r = await criarOcorrencia(eventId, {
                tipo,
                descricao,
                valor: desmascararDinheiro(valor),
                supplierId: null,
              });
              if ("success" in r) {
                setDescricao("");
                setValor("");
              }
              return r;
            });
          }}
          disabled={pendente || !descricao.trim()}
          className="rounded-md border border-stone-200 px-2.5 py-1 text-[12px] font-medium text-stone-700 hover:border-stone-300 disabled:opacity-50"
        >
          Registrar
        </button>
      </div>
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
  rodar: (fn: () => Promise<Resultado>) => void;
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
