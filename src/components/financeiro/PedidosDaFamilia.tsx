"use client";

// "A família pediu" (178), no alto da verba: o ajuste que a família pediu
// num fornecedor e o gasto que ela enviou do lado dela. Carrega sozinho e
// some quando não há nada esperando.

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { brl } from "@/components/planejamento/celebra";
import {
  carregarPedidosDaFamilia,
  lancarPedidoDaFamilia,
  responderPedidoDaFamilia,
  type PedidoDaFamilia,
} from "@/app/(app)/eventos/[id]/financeiro/familia-actions";

export function PedidosDaFamilia({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoDaFamilia[]>([]);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const recarregar = useCallback(async () => {
    setPedidos(await carregarPedidosDaFamilia(eventId));
  }, [eventId]);

  useEffect(() => {
    let vivo = true;
    carregarPedidosDaFamilia(eventId).then((p) => vivo && setPedidos(p));
    return () => {
      vivo = false;
    };
  }, [eventId]);

  const abertos = pedidos.filter((p) => p.estado === "aguardando");
  if (abertos.length === 0) return null;

  function agir(acao: () => Promise<{ ok: true } | { error: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setRespondendo(null);
      setTexto("");
      await recarregar();
      // fora da transição: senão os botões ficam presos em "pendente"
      // até a página inteira recarregar
      setTimeout(() => router.refresh(), 0);
    });
  }

  return (
    <div className="fe-card fe-acao-card" style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="fe-aux-rotulo">A família pediu</div>
      {abertos.map((p) => (
        <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", borderRadius: 8, background: "#fff", border: "1px solid var(--linha)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--tinta)" }}>
              {p.tipo === "ajuste" ? `Ajuste em ${p.rotulo}` : p.rotulo}
            </div>
            {p.tipo === "gasto" && <div className="fe-mono" style={{ fontSize: 14 }}>{brl(p.valor ?? 0)}</div>}
          </div>
          {p.texto && <div style={{ fontSize: 13, color: "var(--cinza-3, #4c443c)" }}>{p.texto}</div>}
          <div className="fe-meta">
            {p.autor ? `${p.autor.split(" ")[0]} ` : "A família "}
            {p.tipo === "ajuste" ? "pediu pelo portal" : `enviou do lado dela · ${p.pago ? "já pago" : "a pagar"}`}
          </div>
          {respondendo === p.id ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea
                className="fe-campo"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={2}
                maxLength={600}
                placeholder="Sua resposta para a família"
                style={{ height: "auto", padding: 8, resize: "vertical" }}
              />
              <div className="fe-acoes">
                <button type="button" className="fe-btn fe-btn-sm fe-btn-primario" disabled={pendente} onClick={() => agir(() => responderPedidoDaFamilia(eventId, p.id, texto))}>
                  Enviar resposta
                </button>
                <button type="button" className="fe-btn fe-btn-sm" onClick={() => setRespondendo(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="fe-acoes">
              {p.tipo === "gasto" && (
                <button type="button" className="fe-btn fe-btn-sm fe-btn-primario" disabled={pendente} onClick={() => agir(() => lancarPedidoDaFamilia(eventId, p.id))}>
                  Lançar na verba
                </button>
              )}
              <button
                type="button"
                className="fe-btn fe-btn-sm"
                onClick={() => {
                  setTexto("");
                  setRespondendo(p.id);
                }}
              >
                Responder
              </button>
            </div>
          )}
        </div>
      ))}
      {erro && <div className="fe-erro">{erro}</div>}
    </div>
  );
}
