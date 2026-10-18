"use client";

// "Marcar reunião" no cartão da oportunidade: dia, hora e local, e o
// compromisso entra na Agenda já ligado a ela.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarReuniao } from "@/app/(app)/orcamentos/oportunidades/actions";

export function MarcarReuniao({ tipo, id }: { tipo: "pedido" | "proposta"; id: string }) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  if (!aberto) {
    return (
      <button type="button" className="op-encerrar" onClick={() => setAberto(true)}>
        Marcar reunião
      </button>
    );
  }
  return (
    <div className="op-encerrar-caixa">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 130px" }}>
          <span>Dia</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        <label style={{ flex: "0 1 100px" }}>
          <span>Hora</span>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </label>
      </div>
      <label>
        <span>Onde (opcional)</span>
        <input value={local} maxLength={160} onChange={(e) => setLocal(e.target.value)} placeholder="Videochamada, escritório…" />
      </label>
      <div className="op-encerrar-botoes">
        <button
          type="button"
          disabled={pendente || !data}
          onClick={() =>
            iniciar(async () => {
              setErro(null);
              const r = await marcarReuniao({ tipo, id, data, hora: hora || null, local: local || null });
              if (!r.ok) setErro(r.erro);
              else {
                setAberto(false);
                router.refresh();
              }
            })
          }
        >
          {pendente ? "Marcando…" : "Marcar na agenda"}
        </button>
        <button type="button" className="op-voltar" onClick={() => setAberto(false)} disabled={pendente}>
          Voltar
        </button>
      </div>
      {erro && <p className="op-erro">{erro}</p>}
    </div>
  );
}
