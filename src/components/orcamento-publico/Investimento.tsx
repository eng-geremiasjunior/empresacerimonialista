// "Investimento": o valor é SEMPRE orcamentos.valor_total, calculado pelo
// trigger da Etapa 1. Não há soma dinâmica por seleção do cliente — a
// seção de extras do protótipo ficou fora de escopo de propósito.
// As condições (entrada/parcelas/desconto) são as da empresa (Etapa 7);
// a Etapa 3 não permitiu customizá-las por orçamento.

import { ShieldCheck } from "lucide-react";
import { Card, Secao } from "./SecaoBase";
import { formatBRL } from "@/lib/orcamentos";
import type {
  InstitucionalPublico,
  OrcamentoPublicoItem,
} from "@/lib/orcamento-publico";

export function Investimento({
  valorTotal,
  convidados,
  itens,
  condicoes,
}: {
  valorTotal: number;
  convidados: number | null;
  itens: OrcamentoPublicoItem[];
  condicoes: InstitucionalPublico;
}) {
  return (
    <Secao id="investimento" titulo="Investimento">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-2xl p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div
                className="text-[24px] [font-family:var(--font-playfair)]"
                style={{ color: "#A85950" }}
              >
                {formatBRL(Number(valorTotal))}
              </div>
              <div className="text-[11.5px]" style={{ color: "#8A7B73" }}>
                {convidados != null
                  ? `Até ${convidados} convidados`
                  : "Valor total da proposta"}
              </div>
            </div>
            <div>
              <div
                className="text-[20px] [font-family:var(--font-playfair)]"
                style={{ color: "#2E2621" }}
              >
                {condicoes.condicao_entrada_percentual}%
              </div>
              <div className="text-[11.5px]" style={{ color: "#8A7B73" }}>
                Entrada no fechamento
              </div>
            </div>
            <div>
              <div
                className="text-[20px] [font-family:var(--font-playfair)]"
                style={{ color: "#2E2621" }}
              >
                {condicoes.condicao_parcelas_maximo}x
              </div>
              <div className="text-[11.5px]" style={{ color: "#8A7B73" }}>
                Sem juros, {condicoes.condicao_prazo_parcelas_texto}
              </div>
            </div>
            <div>
              <div
                className="text-[20px] [font-family:var(--font-playfair)]"
                style={{ color: "#2E2621" }}
              >
                {condicoes.condicao_desconto_a_vista_percentual}%
              </div>
              <div className="text-[11.5px]" style={{ color: "#8A7B73" }}>
                Desconto no pagamento à vista
              </div>
            </div>
          </div>

          <div
            className="mt-5 flex items-start gap-2 text-xs"
            style={{ color: "#8A7B73" }}
          >
            <ShieldCheck size={15} className="mt-px flex-shrink-0" />
            Reserva de data somente com assinatura do contrato e pagamento da
            entrada.
          </div>
        </Card>

        {itens.length > 0 && (
          <div
            className="rounded-2xl p-6"
            style={{ background: "#F6E9E6" }}
          >
            <div
              className="mb-3 text-[13.5px] font-semibold"
              style={{ color: "#2E2621" }}
            >
              O que está incluso
            </div>
            <ul className="flex flex-col gap-2.5 text-[13px]" style={{ color: "#5B4A43" }}>
              {itens.map((item, i) => (
                <li key={`${item.nome}-${i}`} className="flex gap-2">
                  <span style={{ color: "#A85950" }}>✓</span>
                  {item.nome}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Secao>
  );
}
