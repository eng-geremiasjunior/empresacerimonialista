import { notFound } from "next/navigation";
import { getEventoDoPortal, getInvestimento } from "@/lib/supabase/portal";
import { txStatus } from "@/lib/financeiro-const";
import { brl } from "@/components/planejamento/celebra";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { Divisor, Rotulo } from "@/components/portal/Nucleo";
import { LinhaParcela } from "@/components/portal/Linhas";
import { diaEMes } from "@/components/portal/datas";

export const dynamic = "force-dynamic";

// Investimento (handoff §8.7): o que os fornecedores esperam receber, e
// quando. SOMENTE leitura — sem botão de pagar, sem boleto, sem
// checkout. Só dinheiro de conta 'fornecedor'; os honorários da
// assessoria nunca aparecem aqui.
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
    <>
      <TopoInterno eventoId={evento.id} secao="Evento" titulo="Investimento" />
      <p
        style={{
          marginTop: "var(--esp-5)",
          maxWidth: 520,
          fontSize: "var(--ts-corpo-p)",
          lineHeight: "var(--el-corpo-p)",
          color: "var(--cor-texto-secundario)",
          textWrap: "pretty",
        }}
      >
        O que os fornecedores esperam receber, e quando. O pagamento acontece
        direto com eles; aqui é só o acompanhamento.
      </p>

      <Divisor />

      <div
        style={{
          display: "flex",
          gap: "var(--esp-8)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <Rotulo>Contratado</Rotulo>
          <p
            style={{
              margin: "var(--esp-2) 0 0",
              fontFamily: "var(--fonte-titulo)",
              fontWeight: 500,
              fontSize: 26,
              lineHeight: 1.2,
              color: "var(--cor-texto-principal)",
            }}
          >
            {brl(investimento?.contratado ?? 0)}
          </p>
        </div>
        <div>
          <Rotulo>Já pago</Rotulo>
          <p
            style={{
              margin: "var(--esp-2) 0 0",
              fontFamily: "var(--fonte-titulo)",
              fontWeight: 500,
              fontSize: 26,
              lineHeight: 1.2,
              color: "var(--cor-texto-secundario)",
            }}
          >
            {brl(investimento?.pago ?? 0)}
          </p>
        </div>
      </div>

      <Divisor />

      <Rotulo>Parcelas</Rotulo>
      {parcelas.length === 0 ? (
        <p
          style={{
            marginTop: "var(--esp-4)",
            fontSize: "var(--ts-corpo-p)",
            lineHeight: "var(--el-corpo-p)",
            color: "var(--cor-texto-secundario)",
          }}
        >
          As parcelas combinadas com os fornecedores vão aparecer aqui.
        </p>
      ) : (
        <div style={{ marginTop: "var(--esp-2)" }}>
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
    </>
  );
}
