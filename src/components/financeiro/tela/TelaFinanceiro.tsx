"use client";

// Financeiro do evento — a casca.
//
// Uma rota, três contas, e o menu que troca entre elas. O menu é o
// componente mais importante da tela: o problema nº 1 da versão antiga
// era não parecer menu, e por isso a cerimonialista somava dois dinheiros
// que nunca podem ser somados.
//
// Nenhum total mora aqui. Tudo vem de financeiro-tela.ts, que é a única
// conta da aplicação — foi assim que sumiu o "A pagar R$ 0" no card com
// "a pagar R$ 17.225,75" no seletor logo abaixo.

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fmtData, money } from "@/lib/financeiro-core";
import {
  JANELA_PADRAO,
  daAgenda,
  entradasDoCaixa,
  montarItens,
  soma,
  type PendenciaAberta,
} from "@/lib/financeiro-tela";
import type { FinanceiroDoEvento } from "@/lib/supabase/financeiro-evento";
import { fecharPendencia } from "@/app/(app)/eventos/[id]/financeiro/actions";
import { AbaVerba } from "./AbaVerba";
import { AbaAssessoria } from "./AbaAssessoria";
import { AbaEncerramento } from "./AbaEncerramento";
import { ModalFinanceiro, type Operacao } from "./ModalFinanceiro";
import "./tela.css";

export type Conta = "verba" | "assessoria" | "encerramento";

export function TelaFinanceiro({
  eventId,
  dados,
  contexto,
  contaInicial = "verba",
  janelaDias = JANELA_PADRAO,
  fornecedoresCadastro,
  pendencias,
  linkCobranca,
  encerramento,
  itensDoOrcamento,
}: {
  eventId: string;
  dados: FinanceiroDoEvento;
  contexto: { evento: string; data: string; diasAte: number };
  contaInicial?: Conta;
  janelaDias?: number;
  fornecedoresCadastro: { id: string; name: string }[];
  pendencias: PendenciaAberta[];
  linkCobranca: string | null;
  encerramento: React.ComponentProps<typeof AbaEncerramento>;
  itensDoOrcamento?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [conta, setConta] = useState<Conta>(contaInicial);
  const [exportar, setExportar] = useState(false);
  const [operacao, setOperacao] = useState<Operacao | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const hoje = dados.hoje;

  const { agenda, entradas, assessoria, custos } = useMemo(() => {
    const daVerba = montarItens(
      dados.lancamentos.filter((l) => l.conta === "verba"),
      hoje,
      janelaDias
    );
    const daAssessoria = montarItens(
      dados.lancamentos.filter((l) => l.conta === "assessoria"),
      hoje,
      janelaDias
    );
    return {
      agenda: daAgenda(daVerba),
      entradas: entradasDoCaixa(daVerba),
      assessoria: daAssessoria.filter((l) => l.direcao === "entrada"),
      custos: daAssessoria.filter((l) => l.direcao === "saida"),
    };
  }, [dados.lancamentos, hoje, janelaDias]);

  const aPagar = soma(agenda.filter((i) => !i.pagoEm));
  const aReceber = Math.max(
    0,
    (dados.assessoria.contrato ?? soma(assessoria)) -
      soma(assessoria.filter((p) => p.pagoEm))
  );

  const emAbertoDaVerba = useMemo(
    () => agenda.filter((i) => !i.pagoEm),
    [agenda]
  );
  const emAbertoDaAssessoria = useMemo(
    () => assessoria.filter((i) => !i.pagoEm),
    [assessoria]
  );

  function trocar(nova: Conta) {
    setConta(nova);
    // history, e não router.replace: a aba é estado de tela, e um
    // replace faria o servidor renderizar a página inteira de novo a
    // cada clique. O endereço continua servindo de link direto.
    window.history.replaceState(null, "", `${pathname}?conta=${nova}`);
  }

  function avisar(mensagem: string) {
    setToast(mensagem);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function concluir(mensagem: string) {
    const pendenciaId =
      operacao && operacao.tipo === "despesa" ? operacao.pendenciaId : undefined;
    setOperacao(null);
    avisar(mensagem);
    // a pendência que a automação abriu se fecha com o lançamento que a
    // resolveu (074) — senão ela ficaria pedindo a mesma coisa de novo
    if (pendenciaId) await fecharPendencia(eventId, pendenciaId, "resolvida");
    router.refresh();
  }

  // a sub-linha tem duas partes: o contexto some no celular para os três
  // itens caberem sem rolar de lado; o número, que é o que importa, fica
  const contas: { chave: Conta; nome: string; contexto: string; numero: string }[] = [
    {
      chave: "verba",
      nome: "Verba do evento",
      contexto: "dinheiro do casal · ",
      numero: `a pagar ${money(aPagar)}`,
    },
    {
      chave: "assessoria",
      nome: "Minha assessoria",
      contexto: "sua receita · ",
      numero: `a receber ${money(aReceber)}`,
    },
    {
      chave: "encerramento",
      nome: "Encerramento",
      contexto: "conciliação · fechamento · ",
      numero: "prestação",
    },
  ];

  return (
    <div className="fe">
      <div className="fe-topo">
        <div>
          <p className="fe-meta-evento">
            {contexto.evento} · {fmtData(contexto.data)} ·{" "}
            {contexto.diasAte >= 0
              ? `faltam ${contexto.diasAte} dias`
              : `há ${Math.abs(contexto.diasAte)} dias`}
          </p>
          <h1 className="fe-h1">Financeiro</h1>
        </div>

        <div className="fe-topo-dir">
          <span className="fe-hoje">
            hoje
            <b>{fmtData(hoje)}</b>
          </span>
          <button
            type="button"
            className="fe-btn"
            aria-expanded={exportar}
            onClick={() => setExportar((v) => !v)}
          >
            Exportar ▾
          </button>
          {exportar && (
            <div className="fe-dropdown">
              <a
                href={`/eventos/${eventId}/financeiro/extrato`}
                onClick={() => setExportar(false)}
              >
                <strong>Extrato em CSV</strong>
                <span>todos os lançamentos da verba, para a planilha</span>
              </a>
              <a
                href={`/eventos/${eventId}/financeiro/prestacao/pdf`}
                target="_blank"
                rel="noreferrer"
                onClick={() => setExportar(false)}
              >
                <strong>Prestação de contas em PDF</strong>
                <span>relatório para o casal, com o que já foi pago</span>
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="fe-contas" role="tablist" aria-label="Contas do evento">
        {contas.map((c) => (
          <button
            key={c.chave}
            type="button"
            role="tab"
            className="fe-conta"
            aria-current={conta === c.chave}
            aria-selected={conta === c.chave}
            onClick={() => trocar(c.chave)}
          >
            <span className="fe-conta-nome">{c.nome}</span>
            <span className="fe-conta-sub">
              <span className="fe-so-pc">{c.contexto}</span>
              {c.numero}
            </span>
          </button>
        ))}
      </div>

      {conta === "verba" && (
        <AbaVerba
          eventId={eventId}
          hoje={hoje}
          janela={janelaDias}
          agenda={agenda}
          entradas={entradas}
          contratos={dados.contratos}
          objetivos={dados.objetivos}
          verbaTotal={dados.verbaTotal}
          registros={dados.registros}
          pendencias={pendencias}
          linkCobranca={linkCobranca}
          abrir={setOperacao}
        />
      )}

      {conta === "assessoria" && (
        <AbaAssessoria
          parcelas={assessoria}
          custos={custos}
          contrato={dados.assessoria.contrato}
          assinadoEm={dados.assessoria.assinadoEm}
          abrir={setOperacao}
          extra={itensDoOrcamento}
        />
      )}

      {conta === "encerramento" && <AbaEncerramento {...encerramento} />}

      {operacao && (
        <ModalFinanceiro
          eventId={eventId}
          operacao={operacao}
          hoje={hoje}
          objetivos={dados.objetivos}
          fornecedoresCadastro={fornecedoresCadastro}
          emAberto={
            operacao.tipo === "receber" ? emAbertoDaAssessoria : emAbertoDaVerba
          }
          temCaixa={dados.saldoCaixa.recebidoDaCliente > 0}
          onFechar={() => setOperacao(null)}
          onPronto={concluir}
        />
      )}

      {toast && <div className="fe-toast">{toast}</div>}
    </div>
  );
}
