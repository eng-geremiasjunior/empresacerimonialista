"use client";

// O que os editores de bloco dividem: o jeito dos campos e dos botões do
// "Nosso site" (os mesmos valores do NossoSite.tsx: cinza + a cor forte
// do portal), os ↑↓ de cada item e o "Adicionar" da lista.

import type { CSSProperties, ReactNode } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { TRACO } from "@/components/portal/icones";

export const campo: CSSProperties = {
  width: "100%",
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "10px 12px",
  fontSize: "var(--ts-item-desc)",
  fontFamily: "var(--fonte-corpo)",
  color: "var(--cor-texto)",
};

export const botao: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "10px 16px",
  minHeight: "var(--toque-min)",
  fontSize: "var(--ts-botao)",
  color: "var(--cor-texto-secundario)",
  cursor: "pointer",
  fontFamily: "var(--fonte-corpo)",
};

/** botão de texto, sem borda ("Trocar", "Tirar") */
export const botaoLeve: CSSProperties = { ...botao, border: "none", background: "none", padding: "6px 8px", minHeight: 0 };

export const nota: CSSProperties = { fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-suave)", margin: 0 };

export const iconeBotao: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "var(--toque-min)",
  height: "var(--toque-min)",
  border: "none",
  background: "none",
  color: "var(--cor-texto-suave)",
  cursor: "pointer",
  flex: "none",
};

export const coluna: CSSProperties = { display: "flex", flexDirection: "column", gap: 8 };

/** Troca dois itens de lugar; fora dos limites, a lista fica igual. */
export function mover<T>(lista: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return lista;
  const nova = lista.slice();
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}

/** Um item de lista: o miolo e, ao lado do rótulo, ↑ ↓ e tirar. Sem
 *  caixa — uma linha fina separa um item do outro. */
export function ItemDaLista({
  rotulo,
  indice,
  total,
  onMover,
  onTirar,
  desabilitado,
  podeTirar = true,
  children,
}: {
  rotulo: string;
  indice: number;
  total: number;
  onMover: (delta: -1 | 1) => void;
  onTirar: () => void;
  desabilitado?: boolean;
  podeTirar?: boolean;
  children: ReactNode;
}) {
  return (
    <div style={{ ...coluna, paddingTop: indice === 0 ? 0 : 10, borderTop: indice === 0 ? "none" : "1px solid var(--cor-borda-linha)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: "var(--ts-nota)", color: "var(--cor-texto-suave)" }}>{rotulo}</span>
        <button
          type="button"
          style={iconeBotao}
          aria-label={`Subir ${rotulo}`}
          disabled={desabilitado || indice === 0}
          onClick={() => onMover(-1)}
        >
          <ChevronUp size={18} strokeWidth={TRACO} />
        </button>
        <button
          type="button"
          style={iconeBotao}
          aria-label={`Descer ${rotulo}`}
          disabled={desabilitado || indice === total - 1}
          onClick={() => onMover(1)}
        >
          <ChevronDown size={18} strokeWidth={TRACO} />
        </button>
        {podeTirar && (
          <button type="button" style={iconeBotao} aria-label={`Tirar ${rotulo}`} disabled={desabilitado} onClick={onTirar}>
            <X size={16} strokeWidth={TRACO} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/** "Adicionar marco" etc. Some quando a lista chega ao teto. */
export function BotaoAdicionar({
  children,
  onClick,
  desabilitado,
}: {
  children: ReactNode;
  onClick: () => void;
  desabilitado?: boolean;
}) {
  return (
    <div>
      <button type="button" style={botao} disabled={desabilitado} onClick={onClick}>
        {children}
      </button>
    </div>
  );
}

/** Um campo com o nome pequeno em cima (o placeholder some ao digitar). */
export function Campo({ nome, children }: { nome: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "var(--ts-nota)", color: "var(--cor-texto-suave)" }}>{nome}</span>
      {children}
    </label>
  );
}
