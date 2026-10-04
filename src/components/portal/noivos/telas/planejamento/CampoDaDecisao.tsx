"use client";

// Uma pergunta de uma decisão, na tela do capítulo (04/10/2026). Escolha e
// sim/não viram opções para tocar e gravam no toque; o resto (texto,
// número, valor, data, hora, fornecedor) grava com "Salvar". Tudo pela
// porta de sempre (portal_escrever_campo), levando a versão que a tela
// viu: se outra pessoa salvou antes, volta o valor novo em vez de
// sobrescrever.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { desmascararDinheiro, mascararDinheiro } from "@/lib/format";
import { rotuloDaOpcao } from "@/lib/rotulo-da-opcao";
import type { CampoDaNoiva } from "@/lib/supabase/portal-planejamento";

type Resposta =
  | { ok: true; updated_at: string; valor: string | null }
  | { ok: false; erro?: string; conflito?: boolean; updated_at?: string; valor_atual?: string | null };

const ERROS: Record<string, string> = {
  valor_invalido: "Esse valor não parece certo. Confira e tente de novo.",
  data_invalida: "Essa data não parece certa.",
  opcao_invalida: "Escolha uma das opções.",
  texto_longo: "Ficou longo demais. Vale resumir um pouco.",
  fornecedor_invalido: "Escolha um fornecedor da lista.",
};

/** O valor que veio do banco, do jeito que o campo mostra. */
function paraTela(c: CampoDaNoiva): string {
  if (c.tipo === "moeda" && c.valor !== "") {
    const n = Number(c.valor);
    if (Number.isFinite(n)) return mascararDinheiro(Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
  }
  if (c.tipo === "numero" && c.valor !== "") return c.valor.replace(".", ",");
  return c.valor;
}

export function CampoDaDecisao({
  campo,
  podeEditar,
  fornecedores,
}: {
  campo: CampoDaNoiva;
  podeEditar: boolean;
  fornecedores: { id: string; nome: string }[];
}) {
  const inicial = paraTela(campo);
  const [valor, setValor] = useState(inicial);
  const [salvo, setSalvo] = useState(inicial);
  const [versao, setVersao] = useState(campo.updatedAt);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const id = `campo-${campo.id}`;

  async function gravar(bruto: string) {
    if (ocupado) return;
    const texto = bruto.trim();
    let p_valor: unknown = null;
    if (texto !== "") {
      if (campo.tipo === "moeda") {
        const n = desmascararDinheiro(texto);
        if (n === null) return setAviso(ERROS.valor_invalido);
        p_valor = n;
      } else if (campo.tipo === "numero") {
        const n = Number(texto.replace(/\./g, "").replace(",", "."));
        if (!Number.isFinite(n)) return setAviso(ERROS.valor_invalido);
        p_valor = n;
      } else if (campo.tipo === "sim_nao") {
        p_valor = texto === "true";
      } else {
        p_valor = texto;
      }
    }
    setOcupado(true);
    setAviso(null);
    setOk(false);
    const { data, error } = await createClient().rpc("portal_escrever_campo", {
      p_campo_id: campo.id,
      p_valor,
      p_updated_at_visto: versao,
    });
    setOcupado(false);
    const r = data as Resposta | null;
    if (error || !r) return setAviso("Não foi possível salvar agora. Tente de novo.");
    if (!r.ok) {
      if (r.conflito) {
        const atual = r.valor_atual ?? "";
        setValor(paraTela({ ...campo, valor: atual }));
        setSalvo(paraTela({ ...campo, valor: atual }));
        setVersao(r.updated_at ?? versao);
        return setAviso("Esta resposta mudou agora há pouco: confira o valor novo antes de mudar.");
      }
      return setAviso(ERROS[r.erro ?? ""] ?? "Não foi possível salvar.");
    }
    setVersao(r.updated_at);
    setSalvo(bruto);
    setOk(true);
  }

  const rotulo = (
    <label htmlFor={id} className="pn-plan-campo-rotulo">
      {campo.label}
      {campo.unidade ? <span> ({campo.unidade})</span> : null}
    </label>
  );

  // quem só acompanha vê a resposta, sem campo
  if (!podeEditar) {
    const mostra =
      campo.tipo === "sim_nao"
        ? salvo === "true"
          ? "Sim"
          : salvo === "false"
            ? "Não"
            : ""
        : campo.tipo === "escolha"
          ? salvo && rotuloDaOpcao(salvo)
          : campo.tipo === "fornecedor"
            ? fornecedores.find((f) => f.id === salvo)?.nome ?? ""
            : campo.tipo === "moeda" && salvo
              ? `R$ ${salvo}`
              : salvo;
    return (
      <div className="pn-plan-campo">
        <span className="pn-plan-campo-rotulo">{campo.label}</span>
        <p className="pn-plan-campo-valor">{mostra || "—"}</p>
      </div>
    );
  }

  const opcoes =
    campo.tipo === "sim_nao"
      ? [
          ["true", "Sim"],
          ["false", "Não"],
        ]
      : campo.tipo === "escolha"
        ? (campo.opcoes ?? []).map((o) => [o, rotuloDaOpcao(o)])
        : null;

  if (opcoes) {
    return (
      <div className="pn-plan-campo" role="group" aria-labelledby={`${id}-r`}>
        <span id={`${id}-r`} className="pn-plan-campo-rotulo">
          {campo.label}
        </span>
        <div className="pn-plan-opcoes">
          {opcoes.map(([v, r]) => (
            <button
              key={v}
              type="button"
              aria-pressed={valor === v}
              className={`pn-plan-opcao${valor === v ? " on" : ""}`}
              disabled={ocupado}
              onClick={() => {
                const novo = valor === v ? "" : v;
                setValor(novo);
                void gravar(novo);
              }}
            >
              {r}
            </button>
          ))}
        </div>
        {aviso && <p className="pn-plan-aviso">{aviso}</p>}
      </div>
    );
  }

  const sujo = valor.trim() !== salvo.trim();
  return (
    <div className="pn-plan-campo">
      {rotulo}
      {campo.tipo === "fornecedor" ? (
        <select
          id={id}
          value={valor}
          disabled={ocupado}
          onChange={(e) => {
            setValor(e.target.value);
            void gravar(e.target.value);
          }}
        >
          <option value="">{fornecedores.length ? "Escolher…" : "Nenhum fornecedor cadastrado"}</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      ) : campo.tipo === "texto" ? (
        <textarea id={id} value={valor} rows={valor.length > 70 ? 3 : 2} maxLength={4000} onChange={(e) => setValor(e.target.value)} />
      ) : (
        <div className={campo.tipo === "moeda" ? "pn-plan-moeda" : undefined}>
          {campo.tipo === "moeda" && <span aria-hidden="true">R$</span>}
          <input
            id={id}
            type={campo.tipo === "data" ? "date" : campo.tipo === "hora" ? "time" : "text"}
            inputMode={campo.tipo === "numero" || campo.tipo === "moeda" ? "decimal" : undefined}
            value={valor}
            onChange={(e) => setValor(campo.tipo === "moeda" ? mascararDinheiro(e.target.value) : e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void gravar(valor);
              }
            }}
          />
        </div>
      )}
      {campo.tipo !== "fornecedor" && sujo && (
        <button type="button" className="pn-plan-salvar" disabled={ocupado} onClick={() => void gravar(valor)}>
          {ocupado ? "Salvando…" : "Salvar"}
        </button>
      )}
      {aviso ? <p className="pn-plan-aviso">{aviso}</p> : ok && !sujo ? <p className="pn-plan-ok">Salvo</p> : null}
    </div>
  );
}
