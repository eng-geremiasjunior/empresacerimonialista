"use client";

// "Investimento": a informação mais importante da proposta, com peso
// visual proporcional — card inteiro na cor de destaque (var(--cor-fundo-destaque)) contra
// o fundo bege da página, e o valor na maior tipografia da página inteira
// (56px; o título do hero tem 44px).
//
// O valor é SEMPRE orcamentos.valor_total, calculado pelo trigger da
// Etapa 1. Não há soma dinâmica por seleção do cliente.
// As condições vêm da empresa (Etapa 7); a Etapa 3 não permitiu
// customizá-las por orçamento.

import { motion, useReducedMotion } from "framer-motion";
import { Check, ShieldCheck } from "lucide-react";
import { Secao } from "./SecaoBase";
import { formatBRL } from "@/lib/orcamentos";
import type {
  InstitucionalPublico,
  OrcamentoPublicoItem,
} from "@/lib/orcamento-publico";

// Fade suave ao entrar na tela. NÃO conta de zero até o valor: o preço
// subindo como painel de posto dá ares de promoção, não de proposta — e
// exibe valores que nunca foram acordados.
//
// O texto renderizado é sempre o valor final; a animação mexe só na
// opacidade. O pequeno atraso deixa o número aparecer depois do resto da
// seção, que já entra com o fade do <Revelar>.
function ValorAnimado({ valor }: { valor: number }) {
  const semMovimento = useReducedMotion();

  return (
    <motion.span
      data-revelar
      className="inline-block"
      initial={semMovimento ? { opacity: 1 } : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
    >
      {formatBRL(valor)}
    </motion.span>
  );
}

function Condicao({ numero, label }: { numero: string; label: string }) {
  return (
    <div>
      <div
        className="text-[22px] leading-none sm:text-[26px] [font-family:var(--font-playfair)]"
        style={{ color: "var(--cor-texto-principal)" }}
      >
        {numero}
      </div>
      <div className="mt-1.5 text-[11.5px] leading-snug" style={{ color: "var(--cor-texto-terciario)" }}>
        {label}
      </div>
    </div>
  );
}

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
      <div
        className="rounded-[24px] px-6 py-8 sm:px-10 sm:py-10"
        style={{
          background: "var(--cor-fundo-destaque)",
          border: "1px solid var(--cor-borda-destaque)",
          boxShadow: "0 12px 32px -24px var(--sombra-acento)",
        }}
      >
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
          {/* Valor — continua o maior número da página, mas o destaque
              vem do tamanho e da cor de acento, não de painel sólido +
              negrito + caixa alta somados. Serifada no lugar do bold:
              chama atenção sem gritar. */}
          <div>
            <div>
              <div
                className="text-[11px] font-semibold uppercase tracking-[1.5px]"
                style={{ color: "var(--cor-acento)" }}
              >
                Investimento total
              </div>

              <div
                className="mt-2 text-[42px] font-medium leading-none sm:text-[58px] [font-family:var(--font-playfair)]"
                style={{ color: "var(--cor-acento)" }}
              >
                <ValorAnimado valor={Number(valorTotal)} />
              </div>

              {convidados != null && (
                <div
                  className="mt-2.5 text-[13px]"
                  style={{ color: "var(--cor-texto-terciario)" }}
                >
                  Até {convidados} convidados
                </div>
              )}
            </div>

            {/* Condições: presentes, mas claramente abaixo do valor */}
            <div
              className="mt-7 grid grid-cols-3 gap-4 border-t pt-6"
              style={{ borderColor: "var(--cor-borda-destaque)" }}
            >
              <Condicao
                numero={`${condicoes.condicao_entrada_percentual}%`}
                label="Entrada no fechamento"
              />
              <Condicao
                numero={`${condicoes.condicao_parcelas_maximo}x`}
                label={`Sem juros, ${condicoes.condicao_prazo_parcelas_texto}`}
              />
              <Condicao
                numero={`${condicoes.condicao_desconto_a_vista_percentual}%`}
                label="Desconto à vista"
              />
            </div>

            <div
              className="mt-6 flex items-start gap-2 text-xs"
              style={{ color: "var(--cor-texto-terciario)" }}
            >
              <ShieldCheck size={15} className="mt-px flex-shrink-0" />
              Reserva de data somente com assinatura do contrato e pagamento da
              entrada.
            </div>
          </div>

          {/* Checklist: fundo branco para separar, sem competir com o valor */}
          {itens.length > 0 && (
            <div
              className="rounded-2xl bg-white p-6"
              style={{ border: "1px solid var(--cor-borda)" }}
            >
              <div
                className="mb-4 text-[11px] font-semibold uppercase tracking-[1.2px]"
                style={{ color: "var(--cor-texto-terciario)" }}
              >
                O que está incluso
              </div>
              <ul className="flex flex-col gap-3">
                {itens.map((item, i) => (
                  <li
                    key={`${item.nome}-${i}`}
                    className="flex items-start gap-2.5 text-[13px]"
                    style={{ color: "var(--cor-texto-secundario)" }}
                  >
                    <Check
                      size={15}
                      strokeWidth={2.5}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: "var(--cor-acento)" }}
                    />
                    {item.nome}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Secao>
  );
}
