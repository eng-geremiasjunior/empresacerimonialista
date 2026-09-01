"use client";

// O contrato chegou → a proposta de extração → a conferência dela.
//
// O PDF é lido AQUI, no navegador (pdfjs, molde da planta): o arquivo
// não viaja. O texto sai redigido (contatos e dados bancários viram
// marcadores) e ela VÊ o que será enviado antes de enviar. A resposta
// do modelo volta como proposta; nada entra no Financeiro, na Operação
// ou no roteiro sem ela marcar item a item e aplicar.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, X } from "lucide-react";
import { mascararDinheiro, desmascararDinheiro } from "@/lib/format";
import {
  redigirParaExtracao,
  type PropostaExtracao,
} from "@/lib/contrato-extracao-core";
import {
  aplicarExtracao,
  descartarExtracao,
  type EscolhasAplicacao,
} from "@/app/(app)/eventos/[id]/fornecedores/extracao-actions";

export type ContratoParaExtrair = {
  solicitacaoId: string;
  supplierId: string;
  fornecedorNome: string;
  arquivoPath: string;
  arquivoNome: string;
  /** o item mais cedo deste fornecedor no roteiro (destino do horário) */
  itemRoteiroTitulo: string | null;
  /** proposta pendente de conferência, se já foi lida */
  extracao: { id: string; payload: PropostaExtracao } | null;
};

export function ExtrairContrato({
  eventId,
  contratos,
}: {
  eventId: string;
  contratos: ContratoParaExtrair[];
}) {
  if (contratos.length === 0) return null;
  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
        <FileSearch size={15} />
        {contratos.length === 1
          ? "1 contrato recebido espera conferência"
          : `${contratos.length} contratos recebidos esperam conferência`}
      </h3>
      <div className="mt-3 space-y-2">
        {contratos.map((c) => (
          <CartaoContrato key={c.solicitacaoId} eventId={eventId} contrato={c} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function lerPdfNoNavegador(path: string): Promise<string> {
  const resp = await fetch(`/api/contrato?path=${encodeURIComponent(path)}`);
  if (!resp.ok) throw new Error("não consegui baixar o contrato");
  const buf = await resp.arrayBuffer();
  // import dinâmico: o leitor de PDF (1 MB) só entra para quem extrai
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let texto = "";
  const paginas = Math.min(doc.numPages, 30);
  for (let i = 1; i <= paginas; i++) {
    const pg = await doc.getPage(i);
    const tc = await pg.getTextContent();
    texto +=
      tc.items
        .map((it) => ("str" in it ? (it as { str: string }).str : ""))
        .join(" ") + "\n";
  }
  return texto;
}

type Fase =
  | { nome: "inicio" }
  | { nome: "lendo" }
  | { nome: "previa"; texto: string; redigidos: number }
  | { nome: "enviando"; texto: string };

function CartaoContrato({
  eventId,
  contrato,
}: {
  eventId: string;
  contrato: ContratoParaExtrair;
}) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>({ nome: "inicio" });
  const [erro, setErro] = useState<string | null>(null);
  const [proposta, setProposta] = useState<{ id: string; payload: PropostaExtracao } | null>(
    contrato.extracao
  );

  async function ler() {
    setErro(null);
    setFase({ nome: "lendo" });
    try {
      const bruto = await lerPdfNoNavegador(contrato.arquivoPath);
      if (bruto.trim().length < 50) {
        setFase({ nome: "inicio" });
        setErro(
          "Este PDF parece ser digitalizado (imagem, sem camada de texto). Nada foi enviado — lance os dados à mão."
        );
        return;
      }
      const { texto, redigidos } = redigirParaExtracao(bruto);
      setFase({ nome: "previa", texto, redigidos });
    } catch {
      setFase({ nome: "inicio" });
      setErro("Não consegui ler este arquivo. Abra o contrato e lance à mão.");
    }
  }

  async function enviar(texto: string) {
    setErro(null);
    setFase({ nome: "enviando", texto });
    try {
      const resp = await fetch("/api/ai/extrair-contrato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          solicitacaoId: contrato.solicitacaoId,
          texto,
        }),
      });
      const data = (await resp.json()) as {
        id?: string;
        proposta?: PropostaExtracao;
        error?: string;
      };
      if (!resp.ok || !data.id || !data.proposta) {
        setFase({ nome: "inicio" });
        setErro(data.error ?? "A leitura não respondeu agora. Tente de novo.");
        return;
      }
      setProposta({ id: data.id, payload: data.proposta });
      setFase({ nome: "inicio" });
      router.refresh();
    } catch {
      setFase({ nome: "inicio" });
      setErro("A leitura não respondeu agora. Tente de novo.");
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-[13.5px] font-medium text-gray-900">
          {contrato.fornecedorNome}
          <span className="ml-1.5 text-[11.5px] font-normal text-gray-500">
            {contrato.arquivoNome}
          </span>
        </span>
        {!proposta && fase.nome === "inicio" && (
          <button
            onClick={ler}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-amber-700"
          >
            Ler o contrato
          </button>
        )}
        {fase.nome === "lendo" && (
          <span className="text-[12px] text-gray-500">Lendo o PDF aqui no navegador…</span>
        )}
        {fase.nome === "enviando" && (
          <span className="text-[12px] text-gray-500">Extraindo…</span>
        )}
      </div>

      {erro && <p className="mt-1.5 text-[12px] text-red-600">{erro}</p>}

      {/* -------- prévia: o que será enviado -------- */}
      {fase.nome === "previa" && (
        <div className="mt-2.5 space-y-2">
          <p className="text-[12px] text-gray-600">
            O PDF ficou nesta máquina. O texto abaixo é o que será enviado para
            a leitura
            {fase.redigidos > 0
              ? ` — ${fase.redigidos} dado(s) sensível(is) já removido(s):`
              : ":"}
          </p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-700">
            {fase.texto}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={() => enviar(fase.texto)}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-amber-700"
            >
              Enviar para leitura
            </button>
            <button
              onClick={() => setFase({ nome: "inicio" })}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] font-medium text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* -------- a conferência -------- */}
      {proposta && (
        <Conferencia
          eventId={eventId}
          extracaoId={proposta.id}
          payload={proposta.payload}
          itemRoteiroTitulo={contrato.itemRoteiroTitulo}
          aoFechar={() => setProposta(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

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

function Conferencia({
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
