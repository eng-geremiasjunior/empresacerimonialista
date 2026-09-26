"use client";

// A resposta de uma pergunta, ali mesmo (desenho v2): respondida vira
// citação com "Mudar"; em aberto, sugestões em chips, o campo e Salvar.
// Grava pela mesma RPC do portal de hoje (portal_escrever_campo), com a
// trava otimista: se a cerimonialista mudou antes, a tela mostra o novo.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rotuloDaOpcao } from "@/lib/rotulo-da-opcao";
import type { PerguntaDoPortal } from "@/lib/supabase/portal";

// as sugestões do desenho, pelas perguntas da 175
const SUGESTOES: Record<string, string[]> = {
  "Qual é a música da valsa?": ["Tempo de Viver", "A Thousand Years", "Perfect", "Can’t Help Falling in Love"],
  "Qual música vai tocar no parabéns?": ["Versão acústica", "Parabéns da banda ao vivo", "Remix da balada"],
  "Como a debutante quer entrar na festa?": ["De carro antigo com o pai", "Pela escada do jardim", "Com as damas abrindo caminho"],
  "Que drinks sem álcool não podem faltar?": ["Soda italiana", "Limonada suíça", "Mojito sem álcool", "Pink lemonade"],
};

type Resposta = {
  ok: boolean;
  erro?: string;
  conflito?: boolean;
  valor?: unknown;
  valor_atual?: string | null;
  updated_at?: string;
};

export function RespostaV2({ pergunta }: { pergunta: PerguntaDoPortal }) {
  const router = useRouter();
  const inicial = pergunta.valor === null ? "" : String(pergunta.valor);
  const [salvo, setSalvo] = useState(inicial);
  const [rascunho, setRascunho] = useState(inicial);
  const [editando, setEditando] = useState(pergunta.valor === null);
  const [versao, setVersao] = useState(pergunta.updatedAt);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function gravar(bruto: string) {
    const texto = bruto.trim();
    if (!texto || ocupado) return;
    let p_valor: unknown = texto;
    if (pergunta.tipo === "numero" || pergunta.tipo === "moeda") {
      const n = Number(texto.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(n)) {
        setAviso("Escreva só o número.");
        return;
      }
      p_valor = n;
    } else if (pergunta.tipo === "sim_nao") {
      p_valor = texto === "true";
    }
    setOcupado(true);
    setAviso(null);
    const { data, error } = await createClient().rpc("portal_escrever_campo", {
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
        setSalvo(r.valor_atual ?? "");
        setRascunho(r.valor_atual ?? "");
        setVersao(r.updated_at ?? versao);
        setAviso("Sua cerimonialista mudou esta resposta agora há pouco. Confira antes de mudar.");
        return;
      }
      setAviso("Não foi possível salvar.");
      return;
    }
    setVersao(r.updated_at ?? versao);
    setSalvo(texto);
    setEditando(false);
    router.refresh();
  }

  if (!editando && salvo) {
    const mostrar =
      pergunta.tipo === "sim_nao" ? (salvo === "true" ? "Sim" : "Não") : pergunta.tipo === "escolha" ? rotuloDaOpcao(salvo) : salvo;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontFamily: "var(--pv2-titulo)", fontStyle: "italic", fontSize: 18, lineHeight: 1.4, color: "#332b24" }}>
          “{mostrar}{pergunta.unidade ? ` ${pergunta.unidade}` : ""}”
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12.5, color: "#776d60" }}>
          respondido
          <button
            type="button"
            onClick={() => {
              setRascunho(salvo);
              setEditando(true);
            }}
            style={{ minHeight: 40, border: 0, background: "none", padding: 0, fontSize: 13, color: "var(--destaque-texto)", textDecoration: "underline", cursor: "pointer" }}
          >
            Mudar
          </button>
        </div>
        {aviso && <div role="alert" style={{ fontSize: 13, color: "#96605a" }}>{aviso}</div>}
      </div>
    );
  }

  const chips =
    pergunta.tipo === "escolha" ? (pergunta.opcoes ?? []) : pergunta.tipo === "sim_nao" ? ["true", "false"] : (SUGESTOES[pergunta.label] ?? []);
  const rotuloChip = (c: string) =>
    pergunta.tipo === "sim_nao" ? (c === "true" ? "Sim" : "Não") : pergunta.tipo === "escolha" ? rotuloDaOpcao(c) : c;
  const soChips = pergunta.tipo === "escolha" || pergunta.tipo === "sim_nao";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              disabled={ocupado}
              onClick={() => (soChips ? void gravar(c) : setRascunho(c))}
              style={{
                height: 34, padding: "0 12px", borderRadius: 17, fontSize: 13, cursor: "pointer",
                border: "1px solid var(--destaque-linha)",
                background: rascunho === c ? "var(--destaque-fundo)" : "#fff", color: "var(--destaque-texto)",
              }}
            >
              {rotuloChip(c)}
            </button>
          ))}
        </div>
      )}
      {!soChips && (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void gravar(rascunho)}
            placeholder={pergunta.label}
            aria-label={pergunta.label}
            type={pergunta.tipo === "data" ? "date" : "text"}
            inputMode={pergunta.tipo === "numero" || pergunta.tipo === "moeda" ? "numeric" : undefined}
            style={{ flex: 1, minWidth: 0, height: 48, padding: "0 14px", border: "1px solid #e7dfd2", borderRadius: 14, background: "#fff", fontSize: 15, color: "#332b24" }}
          />
          <button
            type="button"
            disabled={ocupado || !rascunho.trim()}
            onClick={() => void gravar(rascunho)}
            style={{
              flex: "none", height: 48, padding: "0 18px", border: 0, borderRadius: 14, fontSize: 14, fontWeight: 500, cursor: "pointer",
              background: "var(--destaque-texto)", color: "#fff", opacity: ocupado || !rascunho.trim() ? 0.55 : 1,
            }}
          >
            {ocupado ? "Salvando…" : "Salvar"}
          </button>
        </div>
      )}
      {aviso && <div role="alert" style={{ fontSize: 13, color: "#96605a" }}>{aviso}</div>}
    </div>
  );
}
