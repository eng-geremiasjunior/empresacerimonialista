// Ajustes — tudo o que o dono digita mora aqui, e só aqui: o portão do
// teste grátis, o gasto de marketing do mês, os custos, o saldo de caixa
// e os limites dos serviços. O resto do painel só lê o que o sistema
// percebe sozinho.

import Link from "next/link";
import { getPortaoDoTeste, getSerieMensal } from "@/lib/supabase/admin-painel";
import {
  CATEGORIAS_DE_CUSTO,
  getAjustes,
  getCustos,
  getSaldosDeCaixa,
} from "@/lib/supabase/admin-receita";
import { dataBR, mesPorExtenso, plural, reais } from "@/lib/admin/formatos";
import { hojeBR } from "@/lib/tempo";
import { Aviso, Cabecalho, Secao, Vazio } from "@/components/admin/pecas";
import {
  getDegrausParaEditar,
  getPlanosParaEditar,
  getQuantasAssinam,
} from "@/lib/supabase/admin-planos";
import { FormGastoMarketing } from "../FormGastoMarketing";
import { FormPortaoDoTeste } from "../FormPortaoDoTeste";
import {
  AcoesDoCusto,
  BotaoCopiarRecorrentes,
  FormAjustes,
  FormCusto,
  FormDegrau,
  FormPlano,
  FormSaldo,
} from "./Formularios";

export const dynamic = "force-dynamic";

const MONO = "var(--font-mono), ui-monospace, monospace";

function mesesDeEscolha(mesAtual: string, quantos = 13): string[] {
  const lista: string[] = [];
  let [a, m] = mesAtual.split("-").map(Number);
  for (let i = 0; i < quantos; i++) {
    lista.push(`${a}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      a -= 1;
    }
  }
  return lista;
}

export default async function AdminAjustesPage({
  searchParams,
}: {
  searchParams?: { mes?: string };
}) {
  const hoje = hojeBR();
  const mesAtual = hoje.slice(0, 7);
  const mes = /^\d{4}-\d{2}$/.test(searchParams?.mes ?? "") ? searchParams!.mes! : mesAtual;

  const [portao, serie, custos, caixa, ajustes, planos, degraus, assinam] = await Promise.all([
    getPortaoDoTeste(),
    getSerieMensal(mes, 1),
    getCustos(mes, mes),
    getSaldosDeCaixa(),
    getAjustes(),
    getPlanosParaEditar(),
    getDegrausParaEditar(),
    getQuantasAssinam(),
  ]);

  const doMes = custos.custos;
  const total = doMes.reduce((s, c) => s + c.valor, 0);
  const aPagar = doMes.filter((c) => !c.pago).reduce((s, c) => s + c.valor, 0);
  const rotuloDaCategoria = new Map(CATEGORIAS_DE_CUSTO.map((c) => [c.chave, c.rotulo]));

  return (
    <div data-adm-secao="ajustes" className="flex flex-col gap-4">
      <Cabecalho
        titulo="Ajustes"
        linha="O que você digita. O resto do painel só mostra o que o sistema percebe sozinho."
        lado={
          <form action="/admin/ajustes" method="get" className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-[11.5px] text-[#84858b]">
              Mês
              <select
                name="mes"
                defaultValue={mes}
                className="h-8 rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21]"
              >
                {mesesDeEscolha(mesAtual).map((x) => (
                  <option key={x} value={x}>
                    {mesPorExtenso(x)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="h-8 rounded-md border border-[#d3d3cf] bg-white px-3 text-[12.5px] font-medium text-[#3d3e44] hover:border-[#9a9ba1]">
              Ver
            </button>
          </form>
        }
      />

      <Secao titulo="Teste grátis" nota="Governa só quem chega: fechar não corta o teste de quem já está dentro.">
        {portao ? (
          <FormPortaoDoTeste aberto={portao.aberto} dias={portao.dias} />
        ) : (
          <Aviso>O portão do teste grátis ainda não existe neste banco: aplique a migração 154.</Aviso>
        )}
      </Secao>

      <Secao
        titulo="Planos e preços"
        nota={
          assinam > 0
            ? `Vale para quem assinar daqui para frente. ${assinam} ${
                assinam === 1 ? "conta que já assina continua" : "contas que já assinam continuam"
              } no valor combinado — mudar aqui não mexe nisso.`
            : "Vale para quem assinar daqui para frente. Quem já assina continua no valor combinado — mudar aqui não mexe nisso."
        }
      >
        {planos.length === 0 ? (
          <Aviso>O catálogo de planos ainda não existe neste banco: aplique a migração 147.</Aviso>
        ) : (
          <div className="-mt-1">
            {planos.map((p) => (
              <FormPlano key={p.codigo} plano={p} />
            ))}
            <p className="mt-2 text-[11.5px] text-[#84858b]">
              Deixe eventos ou logins em branco para "sem limite". Desmarcar "à venda" tira o plano da
              página de vendas sem apagar nada.
            </p>
          </div>
        )}
      </Secao>

      {degraus.length > 0 && (
        <Secao
          titulo="Promoção de lançamento"
          nota="Os primeiros meses por um preço menor. Desligar a promoção não sobe o preço de quem já está no meio dela."
        >
          <div className="-mt-1">
            {degraus.map((d) => (
              <FormDegrau key={`${d.codigo}-${d.ordem}`} degrau={d} />
            ))}
          </div>
        </Secao>
      )}

      <Secao
        titulo={`Gasto de marketing — ${mesPorExtenso(mes)}`}
        nota="O denominador do CAC. O sistema não tem como saber quanto você gastou com anúncio."
      >
        <FormGastoMarketing mes={mes} gastoAtual={serie.meses[0]?.gastoMarketing ?? null} />
      </Secao>

      <Secao
        titulo={`Custos — ${mesPorExtenso(mes)}`}
        nota="O que sai por mês. Entra no resultado e no caixa da tela Receita. Marketing fica no campo acima, para não contar duas vezes."
        lado={<BotaoCopiarRecorrentes mes={mes} />}
      >
        {!custos.tabela ? (
          <Aviso>Reaplique a migração 123 no Supabase para lançar custos.</Aviso>
        ) : (
          <>
            <FormCusto mes={mes} categorias={CATEGORIAS_DE_CUSTO.map((c) => ({ chave: c.chave, rotulo: c.rotulo }))} />
            <div className="mt-4">
              {doMes.length === 0 ? (
                <Vazio>Nenhum custo lançado neste mês. Sem eles, o resultado da tela Receita fica em “—”.</Vazio>
              ) : (
                <>
                  <ul className="flex flex-col gap-1.5">
                    {doMes.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-[#f0f0ec] pb-1.5 text-[13px] last:border-0">
                        <span className="min-w-0 text-[#1c1d21]">
                          {c.servico}
                          <span className="text-[#84858b]"> · {rotuloDaCategoria.get(c.categoria) ?? c.categoria}</span>
                          {c.recorrente && <span className="text-[#84858b]"> · todo mês</span>}
                          {!c.pago && <span className="text-[#6e3f5f]"> · a pagar</span>}
                          {c.nota && <span className="block text-[12px] text-[#5c5d63]">{c.nota}</span>}
                        </span>
                        <span className="flex items-baseline gap-3">
                          <span style={{ fontFamily: MONO }}>{reais(c.valor)}</span>
                          <AcoesDoCusto id={c.id} pago={c.pago} />
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[13px] font-semibold text-[#1c1d21]" style={{ fontFamily: MONO }}>
                    Total {reais(total)}
                    {aPagar > 0 && <span className="font-normal text-[#6e3f5f]"> · {reais(aPagar)} a pagar</span>}
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </Secao>

      <Secao titulo="Saldo de caixa" nota="O saldo do banco, informado por você. É dele que sai quantos meses o caixa aguenta.">
        {!caixa.tabela ? (
          <Aviso>Reaplique a migração 123 no Supabase para informar o caixa.</Aviso>
        ) : (
          <>
            <FormSaldo hoje={hoje} />
            {caixa.saldos.length > 0 && (
              <ul className="mt-3 flex flex-col gap-0.5 text-[12.5px] text-[#3d3e44]">
                {caixa.saldos.slice(0, 8).map((s) => (
                  <li key={s.dia}>
                    <span className="text-[#84858b]">{dataBR(s.dia)}</span> · {reais(s.valor)}
                    {s.nota ? ` · ${s.nota}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Secao>

      <Secao
        titulo="Impostos e limites dos serviços"
        nota="A alíquota só estima o imposto quando você não lançou o valor real como custo. Os limites são os do seu plano em cada serviço — o painel usa para mostrar quanto já foi usado."
      >
        {!ajustes.tabela ? (
          <Aviso>Reaplique a migração 123 no Supabase para guardar os ajustes.</Aviso>
        ) : (
          <FormAjustes
            aliquota={ajustes.aliquotaImposto}
            bancoMb={ajustes.supabaseBancoMb}
            arquivosMb={ajustes.supabaseArquivosMb}
            emailsMes={ajustes.resendEmailsMes}
          />
        )}
      </Secao>

      <p className="text-[12.5px] text-[#5c5d63]">
        {plural(doMes.length, "custo lançado", "custos lançados")} em {mesPorExtenso(mes)} ·{" "}
        <Link href={`/admin/receita?mes=${mes}`} className="text-[#6e3f5f] underline underline-offset-2">
          ver como isso fecha na Receita
        </Link>
      </p>
    </div>
  );
}
