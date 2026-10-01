"use client";

// "Perguntas do momento" (desenho v4, README §9; protótipo, template
// 321–325 e lógica 1014): o cartão pêssego com a pergunta em Marcellus,
// o campo e "Responder", que vira "Anotado". A resposta entra pela mesma
// porta da tela de Perguntas (portal_escrever_campo, 091), com a versão
// que a tela viu: se a cerimonialista mexeu no meio tempo, volta o valor
// novo em vez de sobrescrever. Respondida, a próxima das cinco entra.

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mascararDinheiro } from "@/lib/format";
import { usePortalNoivos } from "../../contexto";
import type { PerguntaDoMomento } from "./montar";

type Resposta =
  | { ok: true; updated_at: string; valor: string | null }
  | { ok: false; erro?: string; conflito?: boolean; updated_at?: string; valor_atual?: string | null };

const ERROS: Record<string, string> = {
  bloco_fechado: "Essa parte já foi fechada com a sua cerimonialista.",
  valor_invalido: "Esse valor não parece certo. Confira e tente de novo.",
  data_invalida: "Essa data não parece certa.",
  opcao_invalida: "Escolha uma das opções.",
  texto_longo: "Ficou longo demais. Vale resumir um pouco.",
};

export function PerguntasDoMomento({
  perguntas,
  exemploHashtag,
}: {
  perguntas: PerguntaDoMomento[];
  /** "marinaeteo2027" */
  exemploHashtag: string;
}) {
  const { avisar } = usePortalNoivos();
  const [idx, setIdx] = useState(0);
  const [valor, setValor] = useState("");
  const [estado, setEstado] = useState<"livre" | "enviando" | "anotado">("livre");
  // a versão de cada pergunta (a escrita devolve a nova)
  const [versoes, setVersoes] = useState<Record<string, string>>({});
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (relogio.current) clearTimeout(relogio.current);
    },
    []
  );

  const p = perguntas[Math.min(idx, perguntas.length - 1)];
  if (!p) return null;

  function trocar(v: string) {
    setValor(p.hashtag ? v.replace(/[#\s]/g, "") : p.tipo === "moeda" ? mascararDinheiro(v) : v);
    if (estado === "anotado") setEstado("livre");
  }

  async function responder() {
    const texto = valor.trim();
    if (!texto || estado === "enviando") return;

    let p_valor: unknown = texto;
    if (p.tipo === "numero" || p.tipo === "moeda") {
      const n = Number(texto.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(n)) {
        avisar(ERROS.valor_invalido, true);
        return;
      }
      p_valor = n;
    } else if (p.tipo === "sim_nao") {
      p_valor = texto === "true";
    }

    setEstado("enviando");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("portal_escrever_campo", {
      p_campo_id: p.campoId,
      p_valor,
      p_updated_at_visto: versoes[p.campoId] ?? p.updatedAt,
    });
    const r = data as Resposta | null;
    if (error || !r) {
      setEstado("livre");
      avisar("Não foi possível salvar agora. Tente de novo.", true);
      return;
    }
    if (!r.ok) {
      setEstado("livre");
      if (r.conflito) {
        // alguém gravou primeiro: mostra o valor novo, não sobrescreve
        setValor(r.valor_atual ?? "");
        if (r.updated_at) setVersoes((v) => ({ ...v, [p.campoId]: r.updated_at as string }));
        avisar("Esta resposta mudou agora há pouco. Confira o valor novo antes de mudar.", true);
        return;
      }
      avisar(ERROS[r.erro ?? ""] ?? "Não foi possível salvar.", true);
      return;
    }
    setVersoes((v) => ({ ...v, [p.campoId]: r.updated_at }));
    setEstado("anotado");
    // a próxima pergunta, depois de ver o "Anotado"
    if (idx < perguntas.length - 1) {
      if (relogio.current) clearTimeout(relogio.current);
      relogio.current = setTimeout(() => {
        setIdx((i) => i + 1);
        setValor("");
        setEstado("livre");
      }, 1400);
    }
  }

  const rotulo = estado === "anotado" ? "Anotado" : estado === "enviando" ? "Enviando…" : "Responder";
  const idCampo = `pn-visao-geral-pergunta-${p.campoId}`;

  return (
    <div className="pn-visao-geral-perguntas">
      <div className="pn-visao-geral-perguntas-topo">
        <span className="pn-visao-geral-perguntas-eyebrow">Perguntas do momento</span>
        {perguntas.length > 1 && (
          <span className="pn-visao-geral-perguntas-conta">
            {idx + 1} de {perguntas.length}
          </span>
        )}
      </div>
      <label key={p.campoId} htmlFor={idCampo} className="pn-t pn-visao-geral-perguntas-texto">
        {p.label}
      </label>
      <form
        className="pn-visao-geral-perguntas-campo"
        onSubmit={(e) => {
          e.preventDefault();
          void responder();
        }}
      >
        {p.hashtag && <span className="pn-visao-geral-perguntas-cerquilha">#</span>}
        {p.tipo === "sim_nao" || p.tipo === "escolha" ? (
          <select id={idCampo} value={valor} onChange={(e) => trocar(e.target.value)} disabled={estado === "enviando"}>
            <option value="">Escolher…</option>
            {p.tipo === "sim_nao" ? (
              <>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </>
            ) : (
              p.opcoes.map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))
            )}
          </select>
        ) : (
          <input
            id={idCampo}
            type={p.tipo === "data" ? "date" : p.tipo === "hora" ? "time" : "text"}
            inputMode={p.tipo === "numero" || p.tipo === "moeda" ? "decimal" : undefined}
            value={valor}
            onChange={(e) => trocar(e.target.value)}
            placeholder={
              p.hashtag
                ? exemploHashtag
                : p.tipo === "moeda"
                  ? "R$ 0,00"
                  : p.tipo === "numero"
                    ? p.unidade ?? ""
                    : p.tipo === "texto"
                      ? "Escreva aqui"
                      : undefined
            }
            maxLength={p.tipo === "texto" ? 4000 : undefined}
            disabled={estado === "enviando"}
            autoComplete="off"
          />
        )}
        <button type="submit" className="pn-visao-geral-perguntas-botao" disabled={estado === "enviando"}>
          {rotulo}
        </button>
      </form>
    </div>
  );
}
