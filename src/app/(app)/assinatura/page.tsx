import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  comTetoDoPlano,
  fraseDaEscada,
  fraseDoDegrauAtual,
  getCatalogoDePlanos,
  getEscadaDaPromocao,
  podeEntrarNaPromocao,
  reais,
  tetoEmTexto,
  PLANO_DA_PROMOCAO,
  PROMOCAO_LANCAMENTO,
} from "@/lib/planos";
import { hojeBR } from "@/lib/tempo";
import {
  AssinaturaTela,
  type EstadoAssinatura,
  type PlanoDaVitrine,
  type PromocaoDaVitrine,
} from "@/components/assinatura/AssinaturaTela";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assinatura" };

// O plano da conta, para quem paga por ele. Só a proprietária: a RPC
// devolve vazio para os outros cargos, e a tela manda para o painel.

// O ?plano= (vindo de /planos) é lido AQUI, no servidor, e desce como
// prop. Com useSearchParams() lá dentro, o servidor renderizava sem o
// parâmetro e o navegador com ele — duas telas diferentes, e o React
// refazia a página inteira acusando erro de hidratação. Medido em
// 06/09/2026.
export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams?: { plano?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase.rpc("minha_assinatura");
  const estado = data as EstadoAssinatura | null;

  if (!estado) redirect("/eventos/dashboard");

  // O formulário de cobrança começa com o que a conta já sabe — ela troca
  // se quem paga for outra pessoa (o financeiro da empresa, por exemplo).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membro } = await supabase
    .from("membros_equipe")
    .select("nome")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  // A vitrine vem do catálogo (147), não de variável de ambiente. O texto
  // já sai pronto daqui porque planos.ts é módulo de servidor (lê cookies)
  // e a tela é cliente: atravessa a fronteira só o que é string e número.
  const catalogo = await getCatalogoDePlanos();
  const planos: PlanoDaVitrine[] = catalogo.map((p) => ({
    codigo: p.codigo,
    nome: p.nome,
    valorMensal: p.valorMensal,
    precoTexto: reais(p.valorMensal),
    eventosTexto: tetoEmTexto(p.eventosEmAndamento),
    loginsTexto: tetoEmTexto(p.logins),
  }));

  // A PROMOÇÃO DE LANÇAMENTO (153), já em texto.
  //
  // Duas perguntas diferentes, respondidas aqui porque as duas dependem
  // do banco: esta conta ainda PODE entrar na escada (e então o cartão do
  // plano anuncia o primeiro degrau e o checkout diz a escada inteira), e
  // esta conta JÁ ESTÁ na escada (e então ela lê o degrau de hoje e o dia
  // em que muda).
  //
  // A régua da elegibilidade é a mesma da action — `podeEntrarNaPromocao`
  // sobre as mesmas colunas. Preço anunciado e preço cobrado não podem
  // divergir: é disso que nasce contestação de cartão.
  const { data: assinatura } = await supabase
    .from("assinaturas")
    .select("cancelada_em, promocao_codigo, promocao_inicio")
    .maybeSingle();

  const escada = await getEscadaDaPromocao(PROMOCAO_LANCAMENTO);
  const planoDaPromocao = catalogo.find((p) => p.codigo === PLANO_DA_PROMOCAO) ?? null;
  const primeiroDegrau = escada?.degraus[0] ?? null;

  // quem já está na escada pode estar em OUTRA promoção e em outro plano:
  // a linha dela se lê pelo que está gravado, não pelo que está à venda
  const escadaDela =
    assinatura?.promocao_codigo == null
      ? null
      : assinatura.promocao_codigo === PROMOCAO_LANCAMENTO
        ? escada
        : await getEscadaDaPromocao(assinatura.promocao_codigo);
  const planoDela = catalogo.find((p) => p.codigo === estado.plano) ?? planoDaPromocao;
  const emCurso =
    escadaDela && assinatura?.promocao_inicio && planoDela
      ? fraseDoDegrauAtual(
          escadaDela,
          assinatura.promocao_inicio,
          planoDela.valorMensal,
          hojeBR()
        )
      : null;

  const promocao: PromocaoDaVitrine | null =
    planoDaPromocao && escada && primeiroDegrau
      ? {
          planoCodigo: planoDaPromocao.codigo,
          precoTexto: reais(
            comTetoDoPlano(primeiroDegrau.valorMensal, planoDaPromocao.valorMensal)
          ),
          precoCheioTexto: reais(planoDaPromocao.valorMensal),
          fraseTexto: fraseDaEscada(escada, planoDaPromocao.valorMensal),
          // a mesma régua da action: degrau que não desconta (ou que zera
          // a mensalidade) não é promoção, e a tela não anuncia o que a
          // action não vai cobrar
          disponivel:
            primeiroDegrau.valorMensal > 0 &&
            comTetoDoPlano(primeiroDegrau.valorMensal, planoDaPromocao.valorMensal) <
              planoDaPromocao.valorMensal &&
            podeEntrarNaPromocao({
              status: estado.status,
              cancelada_em: assinatura?.cancelada_em ?? null,
              ultimo_pagamento_em: estado.ultimo_pagamento_em,
            }),
          emCurso,
        }
      : emCurso
        ? {
            planoCodigo: "",
            precoTexto: "",
            precoCheioTexto: "",
            fraseTexto: "",
            disponivel: false,
            emCurso,
          }
        : null;

  return (
    <AssinaturaTela
      estado={estado}
      planos={planos}
      promocao={promocao}
      emailDaConta={user?.email ?? ""}
      nomeDaConta={membro?.nome ?? ""}
      planoDaUrl={searchParams?.plano ?? null}
    />
  );
}
