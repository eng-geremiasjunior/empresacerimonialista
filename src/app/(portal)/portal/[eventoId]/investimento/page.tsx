import { notFound } from "next/navigation";
import { getEventoDoPortal, getInvestimento } from "@/lib/supabase/portal";
import { txStatus } from "@/lib/financeiro-const";
import { brl } from "@/components/planejamento/celebra";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { Cartao, ChipIcone, Rotulo, TituloSecao } from "@/components/portal/Nucleo";
import { LinhaParcela } from "@/components/portal/Linhas";
import {
  CircleDollarSign,
  TAMANHO,
  TRACO,
  Wallet,
} from "@/components/portal/icones";
import { diaEMes } from "@/components/portal/datas";

export const dynamic = "force-dynamic";

// Resumo financeiro: o que os fornecedores esperam receber, e quando.
// SOMENTE leitura — sem botão de pagar, sem boleto, sem checkout. Só
// dinheiro de conta 'fornecedor'; os honorários da assessoria nunca
// aparecem aqui.
export default async function PortalInvestimentoPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const investimento = await getInvestimento(evento.id);
  const parcelas = investimento?.parcelas ?? [];
  const hoje = new Date().toISOString().slice(0, 10);

  const estadoDe = (paid: boolean, due: string) => {
    const s = txStatus(paid, due, hoje);
    return s === "pago" ? "paga" : s === "atrasado" ? "vencida" : "aVencer";
  };

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Resumo financeiro"
        apoio="O que os fornecedores esperam receber, e quando. O pagamento acontece direto com eles; aqui é só o acompanhamento."
      />

      <div className="portal-grade-2">
        <Cartao padding="18px 16px" style={{ flexDirection: "row", alignItems: "center", gap: "var(--esp-4)" }}>
          <ChipIcone tamanho={38} redondo>
            <Wallet size={17} strokeWidth={TRACO} />
          </ChipIcone>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "var(--fonte-titulo)",
                fontSize: "var(--ts-metrica)",
                lineHeight: 1.15,
                color: "var(--cor-texto-forte)",
              }}
            >
              {brl(investimento?.contratado ?? 0)}
            </div>
            <div style={{ fontSize: "var(--ts-stat-rotulo)", color: "var(--cor-texto-suave)", lineHeight: 1.35 }}>
              Contratado
            </div>
          </div>
        </Cartao>
        <Cartao padding="18px 16px" style={{ flexDirection: "row", alignItems: "center", gap: "var(--esp-4)" }}>
          <ChipIcone tamanho={38} redondo>
            <CircleDollarSign size={17} strokeWidth={TRACO} />
          </ChipIcone>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "var(--fonte-titulo)",
                fontSize: "var(--ts-metrica)",
                lineHeight: 1.15,
                color: "var(--cor-texto-forte)",
              }}
            >
              {brl(investimento?.pago ?? 0)}
            </div>
            <div style={{ fontSize: "var(--ts-stat-rotulo)", color: "var(--cor-texto-suave)", lineHeight: 1.35 }}>
              Já pago
            </div>
          </div>
        </Cartao>
      </div>

      <Cartao padding="var(--esp-8)">
        <TituloSecao titulo="Parcelas" />
        {parcelas.length === 0 ? (
          <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
            Nenhuma parcela em aberto.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {parcelas.map((p, i) => (
              <LinhaParcela
                key={`${p.dueDate}-${i}`}
                fornecedor={p.fornecedor ?? "Fornecedor"}
                descricao={p.descricao}
                valorFormatado={brl(p.valor)}
                dataFormatada={diaEMes(p.dueDate)}
                estado={estadoDe(p.paid, p.dueDate)}
                ultima={i === parcelas.length - 1}
              />
            ))}
          </div>
        )}
      </Cartao>
    </div>
  );
}
