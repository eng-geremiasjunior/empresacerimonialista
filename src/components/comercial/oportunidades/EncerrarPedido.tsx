"use client";

// Encerrar um pedido direto no cartão das Oportunidades: um clique abre o
// motivo (opcional), outro confirma. A RLS da 165 decide quem pode.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { encerrarPedido } from "@/app/(app)/orcamentos/pedidos/actions";

export function EncerrarPedido({ id }: { id: string }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  if (!aberto) {
    return (
      <button type="button" className="op-encerrar" onClick={() => setAberto(true)}>
        Encerrar
      </button>
    );
  }
  return (
    <div className="op-encerrar-caixa">
      <label>
        <span>Por que não segue? (opcional)</span>
        <input
          value={motivo}
          maxLength={200}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Fechou com outra, data ocupada…"
          autoFocus
        />
      </label>
      <div className="op-encerrar-botoes">
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              setErro(null);
              const r = await encerrarPedido(id, motivo || null);
              if ("error" in r) setErro(r.error);
              else router.refresh();
            })
          }
        >
          {pendente ? "Encerrando…" : "Encerrar o pedido"}
        </button>
        <button type="button" className="op-voltar" onClick={() => setAberto(false)} disabled={pendente}>
          Voltar
        </button>
      </div>
      {erro && <p className="op-erro">{erro}</p>}
    </div>
  );
}
