"use client";

// Detalhes do "Nosso site": os nomes do casal (nos modelos novos, que os
// desenham; gravados na capa, como a 191 aceita) e o endereço do site.
// Data, hora, local e endereço do espaço vêm do evento e não aparecem aqui.

import { useState } from "react";
import { Rotulo } from "@/components/portal/Nucleo";
import { LIMITES } from "@/lib/site-conteudo";
import { Campo, botao, campo, nota } from "./editores/pecas";

export function Detalhes({
  mostrarNomes,
  nomes,
  onNomes,
  onSalvarNomes,
  endereco,
  emAnalise,
  pendente,
  onSalvarEndereco,
}: {
  /** só os modelos novos desenham os nomes digitados */
  mostrarNomes: boolean;
  nomes: { nome1: string; nome2: string };
  onNomes: (n: { nome1: string; nome2: string }) => void;
  onSalvarNomes: () => void;
  endereco: { slug: string | null; congelado: boolean; base: string };
  emAnalise: boolean;
  pendente: boolean;
  onSalvarEndereco: (slug: string) => void;
}) {
  const [slug, setSlug] = useState(endereco.slug ?? "");

  return (
    <>
      {mostrarNomes && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 140px" }}>
              <Campo nome="Nome 1">
                <input
                  style={campo}
                  maxLength={LIMITES.nome}
                  value={nomes.nome1}
                  disabled={pendente}
                  onChange={(e) => onNomes({ ...nomes, nome1: e.target.value })}
                />
              </Campo>
            </div>
            <div style={{ flex: "1 1 140px" }}>
              <Campo nome="Nome 2">
                <input
                  style={campo}
                  maxLength={LIMITES.nome}
                  value={nomes.nome2}
                  disabled={pendente}
                  onChange={(e) => onNomes({ ...nomes, nome2: e.target.value })}
                />
              </Campo>
            </div>
          </div>
          <div>
            <button type="button" style={botao} disabled={pendente} onClick={onSalvarNomes}>
              {pendente ? "Salvando…" : "Salvar nomes"}
            </button>
          </div>
        </>
      )}

      <Rotulo>O endereço do site</Rotulo>
      {emAnalise && !endereco.congelado ? (
        <p style={nota}>
          {endereco.base}/c/{endereco.slug} · o site está em análise; o endereço muda depois da resposta.
        </p>
      ) : endereco.congelado ? (
        <p style={nota}>
          {endereco.base}/c/{endereco.slug} · já foi publicado e não muda mais (o convite impresso usa este).
        </p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ ...nota, wordBreak: "break-all" }}>{endereco.base}/c/</span>
            <input
              style={{ ...campo, flex: "1 1 160px", width: "auto" }}
              value={slug}
              maxLength={40}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="marina-e-teo"
            />
          </div>
          <div>
            <button
              type="button"
              style={botao}
              disabled={pendente || !slug.trim()}
              onClick={() => onSalvarEndereco(slug.replace(/^-+|-+$/g, ""))}
            >
              Salvar endereço
            </button>
          </div>
          <p style={nota}>Letras, números e hífens. Depois da primeira publicação ele fica fixo.</p>
        </>
      )}
    </>
  );
}
