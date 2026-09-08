"use client";

// A faixa que só a dona da conta vê, e só enquanto a proposta é rascunho.
//
// POR QUE ELA EXISTE. A tela do orçamento oferece "Acessar orçamento" ao
// lado da caixa de enviar, e nada dizia que abrir o link antes de enviar
// leva a uma proposta que ninguém consegue aceitar. O dono tropeçou nisso
// três vezes seguidas, no meio de uma gravação de tela: criava o
// orçamento, abria o link, clicava no botão de aceite e não acontecia
// nada. "Agora foi, mas isso causou confusão" — 08/09/2026.
//
// A proposta pública em si continua correta: rascunho não vira contrato.
// O que faltava era a saída estar onde o erro acontece.
//
// A CLIENTE NUNCA VÊ ESTA FAIXA. Ela só é renderizada quando o servidor
// confirmou, pela sessão e pela RLS, que quem está olhando é da empresa
// dona do orçamento. E some no instante em que a proposta é enviada — não
// aparece em gravação de tela nem em link mandado para cliente.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enviarOrcamento } from "@/app/(app)/orcamentos/actions";

// Sem altura reservada: o cartão flutua sobre a peça e não empurra nada.
// A primeira versão era uma faixa fixa no topo, e ela escondia o
// cabeçalho do modelo (o nome da empresa, o selo do template) — quem
// está conferindo a proposta precisa justamente disso à vista.
export const ALTURA_FAIXA_RASCUNHO = 0;

export function FaixaDoRascunho({ orcamentoId }: { orcamentoId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [enviando, startTransition] = useTransition();

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const r = await enviarOrcamento(orcamentoId);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setPronto(true);
      // recarrega do servidor: a proposta volta como "enviado" e o botão
      // de aceite acende sozinho, sem ela precisar entender o porquê
      router.refresh();
    });
  }

  return (
    <div
      style={{
        // acima da barra fixa dos modelos (que tem ~80px), à esquerda,
        // longe do botão de aceite: o cartão explica sem cobrir a peça
        position: "fixed",
        left: 16,
        bottom: 104,
        zIndex: 90,
        maxWidth: "min(420px, calc(100vw - 32px))",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "10px 14px",
        padding: "12px 14px",
        borderRadius: 12,
        background: "#1C1917",
        color: "#FAF8F5",
        boxShadow: "0 10px 30px rgba(0,0,0,.45)",
        fontFamily: "var(--font-ui, 'Instrument Sans', system-ui, sans-serif)",
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      {pronto ? (
        <span style={{ fontWeight: 600 }}>
          Proposta enviada. O aceite já está liberado nesta página.
        </span>
      ) : (
        <>
          <span style={{ minWidth: 0 }}>
            <b style={{ fontWeight: 700 }}>Rascunho.</b>{" "}
            <span style={{ color: "rgba(250,248,245,.72)" }}>
              A cliente não consegue aceitar até você enviar.
            </span>
          </span>
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            style={{
              flex: "none",
              height: 30,
              padding: "0 14px",
              borderRadius: 6,
              border: "none",
              background: "#FAF8F5",
              color: "#1C1917",
              fontFamily: "inherit",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: enviando ? "default" : "pointer",
              opacity: enviando ? 0.6 : 1,
            }}
          >
            {enviando ? "Enviando…" : "Enviar proposta"}
          </button>
          {erro && (
            <span style={{ color: "#F0B4B4", fontSize: 12.5 }}>{erro}</span>
          )}
        </>
      )}
    </div>
  );
}
