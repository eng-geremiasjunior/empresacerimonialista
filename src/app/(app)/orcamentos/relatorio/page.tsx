// Relatório — o resultado da Gestão comercial num período.
//
// Visão ao lado de Propostas e Pedidos. Em cima, quatro números; no meio,
// o quadro por etapa (só leitura: a etapa vem do que o sistema percebeu,
// não da mão dela); embaixo, mês a mês, origem, tempo, perdas e vitrine.
//
// Só dona e coordenadora: a tela mostra o valor fechado da empresa. A
// trava é aqui, no servidor; a aba escondida no menu é só conforto.

import Link from "next/link";
import { SubNav } from "@/components/SubNav";
import { VISOES_ORCAMENTOS } from "@/lib/visoes";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { lerDadosDoRelatorio } from "@/lib/supabase/relatorio";
import {
  PERIODOS,
  janelaDoRelatorio,
  lerChavePeriodo,
  montarRelatorio,
  periodoDe,
} from "@/lib/comercial/relatorio";
import { NumerosDoPeriodo } from "@/components/comercial/relatorio/NumerosDoPeriodo";
import { QuadroPorEtapa } from "@/components/comercial/relatorio/QuadroPorEtapa";
import { SecoesDoRelatorio } from "@/components/comercial/relatorio/SecoesDoRelatorio";
import { CORES } from "@/lib/orcamentos-ui";
import { hojeBR } from "@/lib/tempo";
import { serifComercial as serif } from "@/lib/fontes-comercial";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatório comercial — eorganizei" };

const VEEM = ["proprietaria", "coordenadora"];
const SERIF = "var(--font-serif-orcamentos), Georgia, serif";

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: { periodo?: string };
}) {
  const { cargo } = await getMeuCargo();

  if (!cargo || !VEEM.includes(cargo)) {
    return (
      <div className="mx-auto max-w-[1080px]" style={{ color: CORES.texto }}>
        <SubNav itens={VISOES_ORCAMENTOS} cargo={cargo} className="mb-5" />
        <h1 className="text-xl font-semibold">Relatório</h1>
        <p
          className="mt-4 rounded-lg border bg-white p-6 text-sm"
          style={{ borderColor: CORES.borda, color: CORES.nav }}
        >
          O relatório fica com a proprietária e a coordenação.
        </p>
      </div>
    );
  }

  const agora = new Date();
  const hoje = hojeBR(agora);
  const chave = lerChavePeriodo(searchParams.periodo);
  const periodo = periodoDe(chave, hoje);
  const { dados, falhou, incompleto } = await lerDadosDoRelatorio(
    janelaDoRelatorio(periodo, hoje),
    periodo
  );
  const relatorio = montarRelatorio(dados, chave, agora);

  return (
    <div className={`${serif.variable} mx-auto max-w-[1080px]`} style={{ color: CORES.texto }}>
      {/* o menu das visões vem primeiro, no mesmo lugar em todas elas */}
      <SubNav itens={VISOES_ORCAMENTOS} cargo={cargo} className="mb-5" />

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1
            className="text-[28px] font-medium leading-tight sm:text-[34px]"
            style={{ fontFamily: SERIF, letterSpacing: "-0.3px" }}
          >
            Relatório
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: CORES.secundario }}>
            {relatorio.periodo.descricao}
          </p>
        </div>

        <nav aria-label="Período do relatório" className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => {
            const ativo = p.chave === chave;
            return (
              <Link
                key={p.chave}
                href={p.chave === "mes" ? "/orcamentos/relatorio" : `/orcamentos/relatorio?periodo=${p.chave}`}
                aria-current={ativo ? "page" : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors ${
                  ativo ? "" : "bg-white hover:bg-[#F7F7F5]"
                }`}
                style={
                  ativo
                    ? { background: CORES.texto, borderColor: CORES.texto, color: CORES.suave }
                    : { borderColor: CORES.borda, color: CORES.nav }
                }
              >
                {p.rotulo}
              </Link>
            );
          })}
        </nav>
      </div>

      {falhou ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar o relatório agora. Recarregue a página em alguns instantes.
        </div>
      ) : (
        <>
          <NumerosDoPeriodo numeros={relatorio.numeros} periodo={relatorio.periodo} />
          <QuadroPorEtapa colunas={relatorio.quadro} />
          <SecoesDoRelatorio relatorio={relatorio} />
          {incompleto && (
            <p className="mt-8 text-[12.5px]" style={{ color: CORES.secundario }}>
              A empresa tem mais registros do que esta tela soma de uma vez: os números
              consideram os 1.000 mais recentes de cada tipo.
            </p>
          )}
        </>
      )}
    </div>
  );
}
