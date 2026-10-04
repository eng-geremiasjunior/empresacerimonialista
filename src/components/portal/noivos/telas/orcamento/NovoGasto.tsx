"use client";

// O gasto novo do Orçamento da noiva (04/10/2026): o que é, com quem, para
// qual parte da festa, quanto e como paga (à vista ou parcelado, com
// entrada). Com quem e para quê são opcionais; no parcelado, com quem é
// obrigatório (as parcelas são de alguém). Vindo de "Lançar os
// pagamentos", o fornecedor e o valor já chegam e o contrato não muda.

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { desmascararDinheiro, mascararDinheiro } from "@/lib/format";
import { brl } from "@/components/planejamento/celebra";
import { somarMeses } from "@/lib/portal-orcamento";
import { lancarGastoDaNoiva, type NovoGasto as Gasto } from "@/app/(portal)/portal/[eventoId]/investimento/orcamento-actions";
import { usePortalNoivos } from "../../contexto";

export type InicioDoGasto = {
  oQue?: string;
  fornecedor?: string;
  objetivoId?: string | null;
  valor?: number;
  modo?: "avista" | "parcelado";
  contrato: "somar" | "manter";
};

const dinheiro = (v: number) => mascararDinheiro(Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ","));

export function NovoGasto({
  inicio,
  assuntos,
  fornecedores,
  hoje,
  fechar,
}: {
  inicio: InicioDoGasto;
  assuntos: { capitulo: string; opcoes: { id: string; nome: string }[] }[];
  fornecedores: string[];
  hoje: string;
  fechar: () => void;
}) {
  const { eventoId, avisar } = usePortalNoivos();
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const manter = inicio.contrato === "manter";

  const [oQue, setOQue] = useState(inicio.oQue ?? "");
  const [fornecedor, setFornecedor] = useState(inicio.fornecedor ?? "");
  const [objetivoId, setObjetivoId] = useState(inicio.objetivoId ?? "");
  const [valor, setValor] = useState(inicio.valor ? dinheiro(inicio.valor) : "");
  const [modo, setModo] = useState<"avista" | "parcelado">(inicio.modo ?? "avista");
  const [data, setData] = useState(hoje);
  const [jaPago, setJaPago] = useState(true);
  const [entrada, setEntrada] = useState("");
  const [vezes, setVezes] = useState("3");
  const [primeira, setPrimeira] = useState(somarMeses(hoje, 1));

  const total = desmascararDinheiro(valor) ?? 0;
  const deEntrada = desmascararDinheiro(entrada) ?? 0;
  const n = Number(vezes);
  const cada = modo === "parcelado" && total > deEntrada && Number.isInteger(n) && n >= 1 && n <= 24 ? (total - deEntrada) / n : null;

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!oQue.trim()) return avisar("Diga o que é o gasto.", true);
    if (total <= 0) return avisar("Diga o valor.", true);
    if (modo === "parcelado" && !fornecedor.trim()) return avisar("No parcelado, diga com quem é.", true);
    const g: Gasto = {
      oQue,
      fornecedor,
      objetivoId: objetivoId || null,
      valor: total,
      modo,
      data: modo === "avista" ? data : primeira,
      jaPago: modo === "avista" && jaPago && data <= hoje,
      entrada: modo === "parcelado" ? deEntrada : 0,
      vezes: modo === "parcelado" ? n : 1,
      contrato: inicio.contrato,
    };
    iniciar(async () => {
      const r = await lancarGastoDaNoiva(eventoId, g);
      if ("error" in r) {
        avisar(r.error, true);
        return;
      }
      avisar(manter ? "Pagamentos lançados" : "Gasto lançado");
      fechar();
      router.refresh();
    });
  }

  return (
    <form className="pn-orc-form" onSubmit={salvar} aria-label={manter ? "Lançar os pagamentos" : "Novo gasto"}>
      <div className="pn-orc-campo">
        <label htmlFor="pn-orc-oque">O que é</label>
        <input id="pn-orc-oque" value={oQue} maxLength={80} onChange={(e) => setOQue(e.target.value)} placeholder="Buffet, vestido, convites…" />
      </div>
      <div className="pn-orc-campo">
        <label htmlFor="pn-orc-quem">
          Com quem {modo === "avista" && <span className="opcional">(se tiver)</span>}
        </label>
        <input
          id="pn-orc-quem"
          value={fornecedor}
          maxLength={80}
          readOnly={manter}
          list="pn-orc-fornecedores"
          onChange={(e) => setFornecedor(e.target.value)}
          placeholder="O fornecedor ou a loja"
        />
        <datalist id="pn-orc-fornecedores">
          {fornecedores.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </div>
      {!manter && assuntos.length > 0 && (
        <div className="pn-orc-campo">
          <label htmlFor="pn-orc-paraque">
            Para quê <span className="opcional">(se quiser)</span>
          </label>
          <select id="pn-orc-paraque" value={objetivoId} onChange={(e) => setObjetivoId(e.target.value)}>
            <option value="">—</option>
            {assuntos.map((g) => (
              <optgroup key={g.capitulo} label={g.capitulo}>
                {g.opcoes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
      <div className="pn-orc-campo">
        <label htmlFor="pn-orc-valor">{manter ? "Quanto falta pagar" : "Valor total"}</label>
        <div className="pn-orc-dinheiro">
          <span aria-hidden="true">R$</span>
          <input id="pn-orc-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(mascararDinheiro(e.target.value))} placeholder="0" />
        </div>
      </div>

      <div className="pn-orc-campo">
        <span className="rot" id="pn-orc-modo-rot">
          Como paga
        </span>
        <div className="pn-orc-modo" role="group" aria-labelledby="pn-orc-modo-rot">
          <button type="button" aria-pressed={modo === "avista"} onClick={() => setModo("avista")}>
            À vista
          </button>
          <button type="button" aria-pressed={modo === "parcelado"} onClick={() => setModo("parcelado")}>
            Parcelado
          </button>
        </div>
      </div>

      {modo === "avista" ? (
        <div className="pn-orc-dupla">
          <div className="pn-orc-campo">
            <label htmlFor="pn-orc-data">Data</label>
            <input id="pn-orc-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="pn-orc-campo" style={{ justifyContent: "flex-end" }}>
            <label className="pn-orc-marca">
              <input type="checkbox" checked={jaPago && data <= hoje} disabled={data > hoje} onChange={(e) => setJaPago(e.target.checked)} />
              Já paguei
            </label>
          </div>
        </div>
      ) : (
        <>
          <div className="pn-orc-campo">
            <label htmlFor="pn-orc-entrada">
              Entrada já paga <span className="opcional">(se teve)</span>
            </label>
            <div className="pn-orc-dinheiro">
              <span aria-hidden="true">R$</span>
              <input id="pn-orc-entrada" inputMode="decimal" value={entrada} onChange={(e) => setEntrada(mascararDinheiro(e.target.value))} placeholder="0" />
            </div>
          </div>
          <div className="pn-orc-dupla">
            <div className="pn-orc-campo">
              <label htmlFor="pn-orc-vezes">Em quantas vezes</label>
              <input id="pn-orc-vezes" type="number" inputMode="numeric" min={1} max={24} value={vezes} onChange={(e) => setVezes(e.target.value)} />
            </div>
            <div className="pn-orc-campo">
              <label htmlFor="pn-orc-primeira">1ª parcela em</label>
              <input id="pn-orc-primeira" type="date" value={primeira} onChange={(e) => setPrimeira(e.target.value)} />
            </div>
          </div>
          {cada !== null && (
            <p className="pn-orc-conta">
              {deEntrada > 0 ? `Entrada de ${brl(deEntrada)} e ` : ""}
              {n} × {brl(Math.round(cada * 100) / 100)}
            </p>
          )}
        </>
      )}

      <div className="pn-orc-acoes" style={{ marginTop: 0 }}>
        <button type="submit" className="pn-btn" disabled={enviando}>
          {manter ? "Lançar" : "Salvar gasto"}
        </button>
        <button type="button" className="pn-orc-link" onClick={fechar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
