// Os quatro números do topo do Relatório.
//
// Mesmo contêiner dos números de Propostas: uma caixa só, com divisórias.
// Nada de seta, selo ou percentual colorido — a comparação com o período
// anterior vem em cinza, como informação, não como torcida.

import { emReais, type Numeros, type Periodo } from "@/lib/comercial/relatorio";
import { CORES } from "@/lib/orcamentos-ui";

const SERIF = "var(--font-serif-orcamentos), Georgia, serif";

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

type Quadro = {
  rotulo: string;
  valor: string;
  sufixo?: string | null;
  linhas: string[];
  /** a comparação, um tom abaixo */
  nota?: string | null;
};

export function NumerosDoPeriodo({ numeros: n, periodo }: { numeros: Numeros; periodo: Periodo }) {
  const esperando: string[] = [];
  if (n.pedidosAbertos > 0) {
    esperando.push(`${n.pedidosAbertos} ${plural(n.pedidosAbertos, "pedido espera", "pedidos esperam")} você`);
  }
  if (n.propostasAbertas > 0) {
    esperando.push(
      `${n.propostasAbertas} ${plural(n.propostasAbertas, "proposta espera", "propostas esperam")} a cliente`
    );
  }

  const quadros: Quadro[] = [
    {
      rotulo: "Propostas enviadas",
      valor: String(n.enviadas),
      linhas: [],
      nota: `${periodo.descricaoAnterior}: ${n.enviadasAntes}`,
    },
    {
      rotulo: "Taxa de aceite",
      valor: n.enviadas === 0 ? "—" : `${n.aceitasDaTurma} de ${n.enviadas}`,
      sufixo: n.taxa === null ? null : `${n.taxa}%`,
      linhas: [n.enviadas === 0 ? "nenhuma proposta enviada no período" : "das enviadas no período"],
      nota:
        n.abertasDaTurma > 0
          ? `${n.abertasDaTurma} ${plural(n.abertasDaTurma, "ainda pode fechar", "ainda podem fechar")}`
          : null,
    },
    {
      rotulo: "Valor fechado",
      valor: emReais(n.valorFechado),
      linhas: [
        n.aceites === 0
          ? "nenhum aceite no período"
          : `${n.aceites} ${plural(n.aceites, "aceite", "aceites")} · média ${emReais(n.media ?? 0)}`,
      ],
      nota: `${periodo.descricaoAnterior}: ${emReais(n.valorFechadoAntes)}`,
    },
    {
      rotulo: "Em aberto agora",
      valor: String(n.pedidosAbertos + n.propostasAbertas),
      linhas: esperando.length > 0 ? esperando : ["nada esperando resposta"],
    },
  ];

  return (
    <section aria-label="Resumo do período" className="mt-6">
      {/* o fundo da grade é a cor da divisória: 1 px entre as células,
          em duas ou quatro colunas, sem borda dobrada. Quatro só a partir
          de 1280 px: abaixo disso, com o menu lateral, o valor em reais
          não cabe numa célula estreita */}
      <dl
        className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border xl:grid-cols-4"
        style={{ borderColor: CORES.borda, background: CORES.borda }}
      >
        {quadros.map((q) => (
          <div key={q.rotulo} className="flex flex-col px-4 py-4 sm:px-5" style={{ background: CORES.fundo }}>
            <dt
              className="text-[10.5px] uppercase"
              style={{ letterSpacing: "1px", color: CORES.secundario }}
            >
              {q.rotulo}
            </dt>
            <dd
              className="mt-1.5 text-[22px] font-medium leading-tight [overflow-wrap:anywhere] sm:text-[28px] xl:text-[30px]"
              style={{ fontFamily: SERIF }}
            >
              {q.valor}
              {q.sufixo && (
                <>
                  {" "}
                  <span className="ml-1 text-[15px] sm:text-[17px]" style={{ color: CORES.secundario }}>
                    {q.sufixo}
                  </span>
                </>
              )}
            </dd>
            {q.linhas.map((l) => (
              <dd key={l} className="mt-1.5 text-[12.5px] leading-snug" style={{ color: CORES.nav }}>
                {l}
              </dd>
            ))}
            {q.nota && (
              <dd className="mt-1 text-[12px] leading-snug" style={{ color: CORES.secundario }}>
                {q.nota}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
