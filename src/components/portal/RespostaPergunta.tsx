"use client";

// A resposta da cliente, campo a campo. Cada tipo tem seu controle;
// todos gravam pela MESMA porta (portal_escrever_campo, 091), levando a
// versão que a tela viu — se a cerimonialista mexeu no meio tempo, a
// resposta volta como conflito e a tela mostra o valor novo em vez de
// sobrescrever em silêncio.
//
// "Não conferido" é vocabulário interno: aqui a resposta dela aparece
// salva, sem selo nenhum. O aviso de conferência é da tela da
// cerimonialista.

import { mascararDinheiro } from "@/lib/format";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PerguntaDoPortal } from "@/lib/supabase/portal";
import { Rotulo } from "./Nucleo";
import { prazoPortal } from "./datas";

type Resposta =
  | { ok: true; updated_at: string; valor: string | null }
  | { ok: false; erro?: string; conflito?: boolean; updated_at?: string; valor_atual?: string | null };

const ERROS: Record<string, string> = {
  bloco_fechado: "Essa parte já foi fechada com a sua cerimonialista.",
  valor_invalido: "Esse valor não parece certo — confira e tente de novo.",
  data_invalida: "Essa data não parece certa.",
  opcao_invalida: "Escolha uma das opções.",
  texto_longo: "Ficou longo demais — vale resumir um pouco.",
};

const campoStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "11px 14px",
  minHeight: "var(--toque-min)",
  fontSize: "var(--ts-item-desc)",
  fontFamily: "var(--fonte-corpo)",
  color: "var(--cor-texto)",
};

export function RespostaPergunta({
  pergunta,
  ultima = false,
}: {
  pergunta: PerguntaDoPortal;
  ultima?: boolean;
}) {
  const router = useRouter();
  const [versao, setVersao] = useState(pergunta.updatedAt);
  const [valor, setValor] = useState<string>(
    pergunta.valor === null ? "" : String(pergunta.valor)
  );
  const [salvo, setSalvo] = useState(pergunta.valor !== null);
  const [valorSalvo, setValorSalvo] = useState(
    pergunta.valor === null ? "" : String(pergunta.valor)
  );
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function gravar(bruto: string) {
    if (ocupado) return;
    const texto = bruto.trim();
    // sem mudança real, sem ida ao servidor
    const atual = pergunta.valor === null ? "" : String(pergunta.valor);
    if (salvo && texto === atual.trim() && aviso === null) return;

    setOcupado(true);
    setAviso(null);

    let p_valor: unknown = null;
    if (texto !== "") {
      if (pergunta.tipo === "numero" || pergunta.tipo === "moeda") {
        const n = Number(texto.replace(/\./g, "").replace(",", "."));
        if (!Number.isFinite(n)) {
          setAviso(ERROS.valor_invalido);
          setOcupado(false);
          return;
        }
        p_valor = n;
      } else if (pergunta.tipo === "sim_nao") {
        p_valor = texto === "true";
      } else {
        p_valor = texto;
      }
    }

    const supabase = createClient();
    const { data, error } = await supabase.rpc("portal_escrever_campo", {
      p_campo_id: pergunta.campoId,
      p_valor,
      p_updated_at_visto: versao,
    });
    setOcupado(false);

    const r = data as Resposta | null;
    if (error || !r) {
      setAviso("Não foi possível salvar agora. Tente de novo.");
      return;
    }
    if (!r.ok) {
      if (r.conflito) {
        // alguém gravou primeiro: mostra o valor novo, não sobrescreve
        setValor(r.valor_atual ?? "");
        setValorSalvo(r.valor_atual ?? "");
        setVersao(r.updated_at ?? versao);
        setAviso("Sua cerimonialista atualizou esta resposta agora há pouco — confira o valor novo antes de mudar.");
        return;
      }
      setAviso(ERROS[r.erro ?? ""] ?? "Não foi possível salvar.");
      return;
    }
    setVersao(r.updated_at);
    setSalvo(r.valor !== null);
    setValorSalvo(r.valor === null ? "" : String(r.valor));
    router.refresh();
  }

  const prazo = prazoPortal(pergunta.prazoPrevisto);
  // há algo diferente do que está salvo?
  const sujo = valor.trim() !== valorSalvo.trim();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--esp-2)",
        padding: "var(--esp-5) 0",
        borderBottom: ultima ? "none" : "1px solid var(--cor-borda-linha)",
      }}
    >
      {prazo && (
        <Rotulo cor={prazo === "para agora" ? "var(--cor-atencao)" : "var(--cor-texto-rotulo)"}>
          {prazo}
        </Rotulo>
      )}
      <label
        htmlFor={`p-${pergunta.campoId}`}
        style={{ fontSize: "var(--ts-meta)", color: "var(--cor-texto-forte)" }}
      >
        {pergunta.label}
        {pergunta.unidade ? (
          <span style={{ color: "var(--cor-texto-suave)" }}> ({pergunta.unidade})</span>
        ) : null}
      </label>
      <span style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
        {pergunta.decisaoTitulo}
      </span>

      {pergunta.tipo === "sim_nao" ? (
        <select
          id={`p-${pergunta.campoId}`}
          value={valor}
          disabled={ocupado}
          onChange={(e) => {
            setValor(e.target.value);
            void gravar(e.target.value);
          }}
          style={campoStyle}
        >
          <option value="">— escolher —</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      ) : pergunta.tipo === "escolha" ? (
        <select
          id={`p-${pergunta.campoId}`}
          value={valor}
          disabled={ocupado}
          onChange={(e) => {
            setValor(e.target.value);
            void gravar(e.target.value);
          }}
          style={campoStyle}
        >
          <option value="">— escolher —</option>
          {(pergunta.opcoes ?? []).map((o) => (
            <option key={o} value={o}>
              {o.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      ) : pergunta.tipo === "data" ? (
        <input
          id={`p-${pergunta.campoId}`}
          type="date"
          value={valor}
          disabled={ocupado}
          onChange={(e) => setValor(e.target.value)}
          style={campoStyle}
        />
      ) : pergunta.tipo === "numero" || pergunta.tipo === "moeda" ? (
        <input
          id={`p-${pergunta.campoId}`}
          type="text"
          inputMode="decimal"
          value={valor}
          disabled={ocupado}
          onChange={(e) =>
            setValor(
              pergunta.tipo === "moeda"
                ? mascararDinheiro(e.target.value)
                : e.target.value
            )
          }
          onKeyDown={(e) => e.key === "Enter" && void gravar(valor)}
          style={campoStyle}
        />
      ) : (
        <textarea
          id={`p-${pergunta.campoId}`}
          value={valor}
          rows={valor.length > 80 ? 3 : 2}
          maxLength={4000}
          disabled={ocupado}
          onChange={(e) => setValor(e.target.value)}
          style={{ ...campoStyle, resize: "vertical" }}
        />
      )}

      {/* Digitou, decide quando manda. Antes o campo gravava no blur —
          na prática, "encostou fora, foi": ela parava para pensar no meio
          da frase e a resposta viajava incompleta para a cerimonialista.
          Só os selects continuam imediatos: escolher numa lista JÁ É o
          gesto de confirmação. */}
      {pergunta.tipo !== "sim_nao" && pergunta.tipo !== "escolha" && sujo && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => void gravar(valor)}
          style={{
            alignSelf: "flex-start",
            minHeight: "var(--toque-min)",
            border: "1px solid var(--cor-borda-botao-ouro)",
            borderRadius: "var(--raio-botao)",
            background: "var(--cor-card-suave)",
            padding: "10px 22px",
            fontSize: "var(--ts-botao)",
            fontFamily: "var(--fonte-corpo)",
            color: "var(--cor-ouro-texto-hover)",
            cursor: ocupado ? "wait" : "pointer",
          }}
        >
          {ocupado ? "Enviando…" : "Enviar"}
        </button>
      )}

      {aviso ? (
        <span style={{ fontSize: "var(--ts-desc)", color: "var(--cor-atencao)" }}>
          {aviso}
        </span>
      ) : sujo && pergunta.tipo !== "sim_nao" && pergunta.tipo !== "escolha" ? (
        <span style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
          Ainda não enviado.
        </span>
      ) : salvo ? (
        <span style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-rotulo)" }}>
          Salvo. Pode ajustar quando quiser.
        </span>
      ) : null}
    </div>
  );
}
