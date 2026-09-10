import type { Metadata } from "next";
import { Fragment } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  faixasDaEscada,
  fraseDasFaixas,
  getCatalogoDePlanos,
  getEscadaDaPromocao,
  PLANO_DA_PROMOCAO,
  podeEntrarNaPromocao,
  PROMOCAO_LANCAMENTO,
  reais,
  tetoEmTexto,
  type FaixaDaEscada,
  type PlanoDoCatalogo,
} from "@/lib/planos";
import { Cabecalho } from "@/components/planos/Cabecalho";
import { Medicao } from "@/components/marketing/Medicao";
import { Origem } from "@/components/marketing/Origem";
import { MedirCliques } from "@/components/marketing/MedirCliques";
import { CSS_PLANOS } from "@/components/planos/estilo";
import { Demonstracao } from "@/components/planos/Demonstracao";
import { DemoNascer } from "@/components/planos/DemoNascer";
import { DemoCroqui } from "@/components/planos/DemoCroqui";
import { DemoMapaMental } from "@/components/planos/DemoMapaMental";
import { portaoDoTeste } from "@/lib/supabase/teste-gratis";
import { Chamada } from "@/components/planos/Chamada";
import { ConviteDoTeste } from "@/components/planos/ConviteDoTeste";
import { BotaoFlutuante } from "@/components/planos/BotaoFlutuante";
import { Palco } from "@/components/planos/Palco";
import { Solucao } from "@/components/planos/Solucao";
import { Cadeia } from "@/components/planos/Cadeia";
import { FinanceiroDoEvento } from "@/components/planos/FinanceiroDoEvento";
import { Execucao } from "@/components/planos/Execucao";
import { PortalDaCliente } from "@/components/planos/PortalDaCliente";
import { SistemaInteiro } from "@/components/planos/SistemaInteiro";
import { Perguntas } from "@/components/planos/Perguntas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "eorganizei — a gestão dos seus eventos, em um só lugar",
  description:
    "O sistema em que a cerimonialista organiza clientes, fornecedores, cronograma, financeiro e tudo o que acontece antes e durante o evento. Do primeiro briefing à execução.",
};

// A página de vendas — e o destino do anúncio pago, no Meta e no Google.
//
// Quem cai aqui não conhece a marca: a página conta UM evento
// atravessando o sistema (briefing → informação → planejamento →
// contratação → organização → financeiro → execução) e repete a mesma
// ação três vezes — no topo, na oferta e no fim.
//
// NENHUM NÚMERO DE PLANO VIVE AQUI. Preço cheio e tetos vêm de
// `plano_catalogo` (147); os degraus, de `plano_promocao` (153). O dono
// muda no admin e a página acompanha — inclusive a frase da escada, que
// é obrigação e não enfeite: o preço do quarto mês precisa estar dito na
// tela onde a pessoa decide, não descoberto na quarta cobrança.
//
// O desenho (Claude Design, 07/09/2026) foi traduzido campo a campo. As
// seções de argumento são componentes em components/planos; as cinco
// demonstrações animadas são CSS puro, e os quadros vivem em estilo.ts.

type Conta = {
  plano: string | null;
  status: string | null;
  ultimo_pagamento_em: string | null;
} | null;

// "Para quem é", montado a partir dos tetos — nunca literal, porque o
// dono muda os tetos no admin e a frase tem que continuar verdadeira.
function paraQuemE(p: PlanoDoCatalogo): string {
  const agenda =
    p.eventosEmAndamento === null
      ? "com a agenda cheia o ano inteiro"
      : `com até ${p.eventosEmAndamento} eventos ao mesmo tempo`;
  if (p.logins === 1) return `Só você, ${agenda}.`;
  if (p.eventosEmAndamento === null) {
    const equipe = p.logins === null ? "" : ` de até ${p.logins} pessoas`;
    return `Escritório com equipe${equipe}, ${agenda}.`;
  }
  if (p.logins === null) return `Você e toda a equipe, ${agenda}.`;
  const outras = p.logins - 1;
  return `Você e mais ${outras} ${outras === 1 ? "pessoa" : "pessoas"}, ${agenda}.`;
}

const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const TITULO = "var(--font-title, Inter, sans-serif)";

export default async function PlanosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Quem assina é a proprietária: `minha_assinatura()` (147) só devolve
  // linha para esse cargo. Sem esta leitura, a coordenadora logada ganha
  // botões que levam a lugar nenhum.
  const { data: assinatura } = user
    ? await supabase.rpc("minha_assinatura")
    : { data: null };
  const conta = (assinatura ?? null) as Conta;
  const dona = conta !== null;
  const jaPaga = conta?.status === "ativa" || conta?.status === "inadimplente";

  // `minha_assinatura()` não devolve `cancelada_em`, e sem ela a régua da
  // promoção fica cega para quem já cancelou uma vez. A linha é lida
  // direto, como faz /assinatura — pela sessão dela, sob RLS.
  const { data: linhaDaAssinatura } = dona
    ? await supabase.from("assinaturas").select("cancelada_em").maybeSingle()
    : { data: null };

  const visitante = !user;
  const equipe = Boolean(user) && !dona;
  // Quem tem uma assinatura para FAZER. A coordenadora nunca assina, e
  // quem já paga não precisa de um botão de "começar" — precisa do
  // caminho para a assinatura dela.
  const podeAssinar = visitante || (dona && !jaPaga);

  const planos = await getCatalogoDePlanos();
  const n = planos.length;
  // Duas formas porque o desenho usa as duas: o título da seção diz "nos
  // três planos" e o parágrafo da grade, só "nos três". Se o dono tirar
  // um plano de venda, as duas mudam juntas.
  const nosNPlanos =
    n === 3 ? "nos três planos" : n === 2 ? "nos dois planos" : "em todos os planos";
  const nosNSeco = n === 3 ? "nos três" : n === 2 ? "nos dois" : "em todos";

  // A ESCADA DE LANÇAMENTO (153). Se ela sair de venda, `escada` volta
  // null e a página inteira cai sozinha no preço cheio: some o cartão da
  // oferta, some o selo na coluna do plano, e os botões voltam a dizer o
  // valor do catálogo. Sem tocar em código.
  const escada = await getEscadaDaPromocao(PROMOCAO_LANCAMENTO);
  const planoPromovido = planos.find((p) => p.codigo === PLANO_DA_PROMOCAO) ?? null;
  const faixasCruas: FaixaDaEscada[] | null =
    escada && escada.degraus.length > 0 && planoPromovido
      ? faixasDaEscada(escada, planoPromovido.valorMensal)
      : null;

  // A VITRINE SÓ ANUNCIA O QUE O CHECKOUT COBRA. Duas réguas, as mesmas
  // que /assinatura e a action usam:
  //
  // 1) degrau que não desconta (ou que zera a mensalidade) não é
  //    promoção — anunciar "condição de lançamento" com o preço cheio é
  //    promessa vazia;
  // 2) lançamento é para quem chega, não para quem volta: quem já pagou,
  //    quem paga e quem já cancelou uma vez não entram de novo. Sem esta
  //    régua, a página prometia R$ 27,90 a uma conta que o checkout
  //    cobraria R$ 97,00 — que é exatamente de onde nasce contestação de
  //    cartão.
  //
  // Para o visitante — que é quem vem do anúncio — nada disso muda nada:
  // ele não tem conta, e a promoção aparece inteira.
  const promocaoDesconta =
    faixasCruas !== null &&
    planoPromovido !== null &&
    faixasCruas[0].valorMensal > 0 &&
    faixasCruas[0].valorMensal < planoPromovido.valorMensal;
  const elegivelAPromocao =
    visitante ||
    podeEntrarNaPromocao({
      status: conta?.status ?? null,
      cancelada_em: linhaDaAssinatura?.cancelada_em ?? null,
      ultimo_pagamento_em: conta?.ultimo_pagamento_em ?? null,
    });
  const promo = promocaoDesconta && elegivelAPromocao;
  // Uma decisão só: se a promoção não vale para quem está olhando, ela
  // não existe para o resto da página — preço, frase, selo e barra do
  // celular saem todos daqui.
  const faixas: FaixaDaEscada[] | null = promo ? faixasCruas : null;

  // O que os botões e as frases dizem. Com promoção, o preço de entrada
  // é o primeiro degrau; sem ela, o preço cheio do plano de entrada — e
  // "plano de entrada" é o mais barato do catálogo, não um código fixo.
  const planoDeEntrada =
    planoPromovido ?? [...planos].sort((a, b) => a.valorMensal - b.valorMensal)[0] ?? null;
  const primeiraFaixa = faixas?.[0] ?? null;
  const ultimaFaixa = faixas?.[faixas.length - 1] ?? null;
  // null só se o catálogo vier vazio — o que `getCatalogoDePlanos` também
  // devolve quando a LEITURA falha, porque ela descarta o erro. Numa
  // página de anúncio isso é caro: o clique já foi pago. Então o preço
  // some do botão, mas o botão fica — a pessoa ainda entra, e o resto da
  // página continua vendendo. Preço nenhum é melhor do que preço errado.
  const precoDeEntrada = primeiraFaixa
    ? primeiraFaixa.valorMensal
    : (planoDeEntrada?.valorMensal ?? null);
  const fraseDaEscadaEmFaixas = faixas ? fraseDasFaixas(faixas) : null;
  const mesesDoPrimeiroDegrau = primeiraFaixa?.ate ?? 0;

  // AS CHAMADAS NOVAS (07/09/2026). A vendedora apontou que a página
  // explica muito e chama pouco: entre o hero e a oferta havia oito
  // seções sem um botão. Três faixas no percurso, o botão flutuante e o
  // link "Experimente" do cabeçalho nascem daqui — um destino só, para
  // que o visitante caia no checkout e a dona sem pagamento caia na
  // assinatura dela, como nos botões que já existiam. Quem já paga e a
  // equipe não veem nada disso.
  const precoCurto = precoDeEntrada !== null ? reais(precoDeEntrada) : null;
  const destinoDaAssinatura = visitante
    ? "/comecar"
    : planoDeEntrada
      ? `/assinatura?plano=${planoDeEntrada.codigo}`
      : "/assinatura";
  const rotuloDeAssinar = visitante
    ? "Assine agora"
    : planoDeEntrada
      ? `Assinar o ${planoDeEntrada.nome}`
      : "Assinar agora";
  const assineAgora = { href: destinoDaAssinatura, rotulo: rotuloDeAssinar };
  const assinePeloPreco = {
    href: destinoDaAssinatura,
    rotulo: visitante && precoCurto ? `Assine por ${precoCurto}` : rotuloDeAssinar,
  };
  const experimente = { href: "#experimente", rotulo: "Experimente agora" };

  // O TESTE DE SETE DIAS (154). Com o portão aberto, a entrada principal
  // do visitante deixa de ser o checkout e passa a ser o cadastro sem
  // cartão — a promoção não sai de cena, sai do lugar de porta. Para a
  // dona já logada nada muda: ela tem conta, o caminho dela é a
  // assinatura. Portão fechado devolve a página ao que era.
  const portao = await portaoDoTeste();
  const testeAberto = portao.aberto && visitante;
  const entradaPrincipal = testeAberto
    ? { href: "/criar-conta", rotulo: `Criar conta grátis — ${portao.dias} dias, sem cartão` }
    : {
        href: destinoDaAssinatura,
        rotulo: visitante && precoCurto ? `Começar por ${precoCurto}` : rotuloDeAssinar,
      };
  const entradaSecundaria = testeAberto
    ? { href: "/comecar", rotulo: precoCurto ? `Já quero assinar por ${precoCurto}` : "Já quero assinar" }
    : null;
  // o rótulo curto, para as chamadas que se repetem no percurso: o longo
  // ("Criar conta grátis — 7 dias, sem cartão") só no hero e no fecho
  const entradaCurta = testeAberto
    ? { href: "/criar-conta", rotulo: "Criar conta grátis" }
    : assineAgora;
  const entradaCurtaComPreco = testeAberto ? entradaCurta : assinePeloPreco;

  // O plano em destaque na grade: o da promoção, se houver; senão, o
  // primeiro da vitrine. É ele que ganha o botão cheio.
  const iDestaque = Math.max(
    0,
    promo ? planos.findIndex((p) => p.codigo === PLANO_DA_PROMOCAO) : 0
  );

  // O botão de cada coluna da grade. A visitante vê exatamente o que o
  // desenho escreveu; a dona vê o que faz sentido para a conta dela —
  // "Seu plano" no que ela já paga, em vez de um botão que não leva a
  // nada.
  function botaoDoPlano(p: PlanoDoCatalogo, destaque: boolean) {
    const estilo = destaque
      ? {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "44px",
          padding: "10px 12px",
          boxSizing: "border-box" as const,
          borderRadius: "8px",
          border: "1px solid #6E3F5F",
          background: "#6E3F5F",
          color: "#FAF8F5",
          textAlign: "center" as const,
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "14px",
          transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
        }
      : {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "44px",
          padding: "10px 12px",
          boxSizing: "border-box" as const,
          borderRadius: "8px",
          border: "1px solid #E6E0D8",
          background: "#FFFFFF",
          color: "#221E1B",
          textAlign: "center" as const,
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "14px",
          transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
        };
    const classe = destaque ? "pl-h-ameixa pl-cta" : "pl-h-branco";

    if (equipe) return null;
    if (!dona) {
      return (
        <a href={`/comecar?plano=${p.codigo}`} style={estilo} className={classe}>
          {destaque ? "Começar agora" : `Começar no ${p.nome}`}
        </a>
      );
    }
    if (jaPaga && conta?.plano === p.codigo) {
      return (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "44px",
            padding: "10px 12px",
            fontWeight: 600,
            fontSize: "14px",
            color: "#6B6259",
          }}
        >
          Seu plano
        </span>
      );
    }
    return (
      <a href={`/assinatura?plano=${p.codigo}`} style={estilo} className={classe}>
        {jaPaga ? `Mudar para o ${p.nome}` : `Assinar o ${p.nome}`}
      </a>
    );
  }

  const rotuloMono = {
    padding: "20px 22px 16px 0",
    fontFamily: MONO,
    fontSize: "11px",
    fontWeight: "500",
    letterSpacing: ".06em",
    textTransform: "uppercase" as const,
    color: "#928A81",
  };
  const rotuloMonoNevoa = {
    padding: "20px 22px 16px 0",
    background: "#F2EEE9",
    fontFamily: MONO,
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: ".06em",
    textTransform: "uppercase" as const,
    color: "#6B6259",
  };
  // O mesmo rótulo, repetido dentro da célula: no celular a grade vira
  // uma coluna e a linha de cabeçalho some, então cada valor precisa
  // dizer de novo do que está falando.
  const rotuloCelular = {
    display: "none",
    fontFamily: MONO,
    fontSize: "11px",
    fontWeight: "500",
    letterSpacing: ".06em",
    textTransform: "uppercase" as const,
    color: "#928A81",
    marginBottom: "4px",
  };
  const rotuloCelularForte = { ...rotuloCelular, fontWeight: "600", color: "#6B6259" };
  const numeroDoTeto = { fontFamily: MONO, fontWeight: "600", fontSize: "20px", color: "#221E1B" };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF8F5",
        color: "#221E1B",
        fontFamily: "var(--font-ui, 'Instrument Sans', sans-serif)",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Não <style>{css}</style>: o servidor escapa as aspas do texto
          (' vira &#x27;), o cliente lê a aspa crua, e o React acusa
          "Text content did not match" e refaz a página no navegador.
          Medido no dev em 06/09/2026. Como innerHTML o CSS chega igual
          dos dois lados — e não há nada de usuário nele. */}
      <style dangerouslySetInnerHTML={{ __html: CSS_PLANOS }} />

      {/* O TOPO É UM BLOCO SÓ (10/09/2026): cabeçalho, título e a janela
          do sistema dividem o mesmo fundo, sem linha entre eles. Antes o
          cabeçalho era uma tira clara, o título vinha noutro tom e a
          demonstração começava com borda — três faixas para dizer uma
          coisa só. O dono viu isso no site da concorrente: "gostei da
          header dele, achei mais profissional, não digo a cor, digo a
          ideia". A cor é a nossa; a ideia é essa.

          O fundo vai em cada peça em vez de num <div> em volta: o <main>
          começa entre o cabeçalho e o título, e uma caixa que abrisse
          antes dele e fechasse depois teria de cruzar essa fronteira. */}
      {/* O cabeçalho com menu é compartilhado com /precos: era uma barra
          sem navegação nenhuma, e quem entrava querendo o preço tinha de
          rolar a página inteira. */}
      <Cabecalho
        ondeEstou="vendas"
        fundo="#F2EEE9"
        emBloco
        acao={
          podeAssinar
            ? { href: entradaCurta.href, rotulo: testeAberto ? "Criar conta grátis" : "Assinar" }
            : equipe
              ? { href: "/eventos/dashboard", rotulo: "Voltar ao painel" }
              : { href: "/assinatura", rotulo: "Minha assinatura" }
        }
        entrar={visitante}
      />

      <main>
        {/* ============ 1 · HERO ============ */}
        <section
          style={{
            background: "#F2EEE9",
            padding: "clamp(46px,6vw,74px) clamp(20px,4vw,28px) 0",
            textAlign: "center",
          }}
        >
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <p
            style={{
              display: "inline-block",
              margin: "0 0 20px",
              padding: "5px 12px",
              borderRadius: "999px",
              background: "#F3EBF0",
              color: "#6E3F5F",
              fontFamily: MONO,
              fontSize: "11px",
              fontWeight: "500",
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Para cerimonialistas e assessorias de eventos
          </p>
          <h1
            style={{
              margin: "0 auto 20px",
              maxWidth: "20ch",
              fontFamily: TITULO,
              fontWeight: "700",
              fontSize: "clamp(31px,5.2vw,54px)",
              lineHeight: "1.05",
              letterSpacing: "-0.035em",
              textWrap: "balance",
            }}
          >
            A gestão dos seus eventos, em um só lugar.
          </h1>
          <p
            style={{
              margin: "0 auto",
              maxWidth: "58ch",
              fontSize: "clamp(16.5px,1.9vw,19px)",
              lineHeight: "1.5",
              color: "#6B6259",
              textWrap: "pretty",
            }}
          >
            O sistema em que a cerimonialista organiza clientes, fornecedores,
            cronograma, financeiro e tudo o que acontece antes e durante o evento. Do
            primeiro briefing à execução.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              marginTop: "32px",
            }}
            data-cta-hero="1"
          >
            {visitante && (
              <a
                href={entradaPrincipal.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "52px",
                  padding: "0 30px",
                  borderRadius: "8px",
                  background: "#6E3F5F",
                  color: "#FAF8F5",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "17px",
                  textAlign: "center",
                  transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
                }}
                className="pl-h-ameixa pl-cta"
              >
                {entradaPrincipal.rotulo}
              </a>
            )}
            {entradaSecundaria && (
              <a
                href={entradaSecundaria.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  padding: "0 18px",
                  borderRadius: "8px",
                  border: "1px solid #6E3F5F",
                  color: "#6E3F5F",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "15px",
                  transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
                }}
                className="pl-h-contorno"
              >
                {entradaSecundaria.rotulo}
              </a>
            )}
            {testeAberto && (
              // As três objeções, na ordem em que ela as tem. A terceira é
              // a de verdade: "vou perder o que eu montar?".
              <ul
                data-tres-linhas="1"
                style={{
                  listStyle: "none",
                  margin: "2px 0 0",
                  padding: "0",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "6px 14px",
                  fontSize: "13.5px",
                  lineHeight: "1.5",
                  color: "#6B6259",
                }}
              >
                <li>Sem cartão de crédito</li>
                <li>{`Acaba sozinho no dia ${portao.dias}`}</li>
                <li>O que você cadastrar continua salvo se assinar</li>
              </ul>
            )}
            {dona && planoDeEntrada && (
              <a
                href={jaPaga ? "/assinatura" : `/assinatura?plano=${planoDeEntrada.codigo}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "52px",
                  padding: "0 30px",
                  borderRadius: "8px",
                  background: "#6E3F5F",
                  color: "#FAF8F5",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "17px",
                }}
                className="pl-h-ameixa pl-cta"
              >
                {jaPaga ? "Minha assinatura" : `Assinar o ${planoDeEntrada.nome}`}
              </a>
            )}
            {equipe && (
              <p style={{ margin: "0", fontSize: "13.5px", lineHeight: "1.5", color: "#6B6259" }}>
                Quem assina ou muda de plano é a proprietária da conta.
              </p>
            )}
            {promo && (
              <p
                style={{
                  margin: "0",
                  maxWidth: "56ch",
                  fontSize: "13.5px",
                  lineHeight: "1.55",
                  color: "#6B6259",
                }}
              >
                {`${fraseDaEscadaEmFaixas}. Cancela quando quiser, sem multa.`}
              </p>
            )}
          </div>
          <p
            style={{
              margin: "36px auto 0",
              maxWidth: "62ch",
              fontSize: "15.5px",
              lineHeight: "1.6",
              color: "#928A81",
              textWrap: "pretty",
            }}
          >
            Porque organizar um evento não deveria depender de procurar informação em
            dezenas de conversas, planilhas e anotações.
          </p>
        </div>
        </section>

        <Demonstracao />
        {podeAssinar && (
          <Chamada
            titulo="Quer ver isso com o seu evento?"
            texto="Escreva o nome, escolha casamento ou debutante e veja tudo nascer na tela do sistema. Sem cadastro, sem cartão."
            primaria={experimente}
            secundaria={entradaCurtaComPreco}
          />
        )}
        <Palco />
        <Solucao />
        <Cadeia />
        {podeAssinar && (
          <Chamada
            titulo="Comece pelo evento que você já está organizando."
            texto={
              promo && fraseDaEscadaEmFaixas
                ? `${fraseDaEscadaEmFaixas}. Cancela quando quiser, sem multa.`
                : "Cancela quando quiser, sem multa."
            }
            primaria={entradaCurta}
            secundaria={{ href: "#planos", rotulo: "Veja os planos" }}
          />
        )}
        <FinanceiroDoEvento />
        <Execucao />
        {podeAssinar && (
          <Chamada
            titulo="O próximo evento já pode entrar no sistema hoje."
            texto="Conta, cartão e o primeiro evento em vinte minutos. Cancela quando quiser."
            primaria={entradaCurtaComPreco}
            secundaria={{ href: "#experimente", rotulo: "Experimente antes" }}
          />
        )}
        <PortalDaCliente />
        <div id="o-sistema" style={{ scrollMarginTop: "68px" }}>
          <SistemaInteiro nosN={nosNPlanos} />
        </div>
        {/* A demonstração que ela mexe, logo antes da oferta: nome, tipo,
            data — e o evento nasce na tela REAL do sistema, com o método
            real. Roda toda no navegador; nada é salvo. */}
        <DemoNascer
          precoDeEntrada={precoDeEntrada !== null ? reais(precoDeEntrada) : null}
          saida={testeAberto ? { href: "/criar-conta", rotulo: "Criar a minha de verdade, grátis" } : null}
        />
        {/* Duas telas do sistema, renderizadas pelos COMPONENTES REAIS com
            dados fictícios: o croqui do salão (aba Mesas) e o mapa mental do
            Planejamento. Nada de banco nem de IA. */}
        <DemoCroqui />
        <DemoMapaMental />
        {/* O convite do teste, em faixa escura e inteira: é a mudança de
            oferta da página, e o dono pediu que não passasse batida. Vem
            depois das telas do sistema, quando a pergunta seguinte é
            "quanto custa para eu fazer isso com o meu evento?". */}
        {testeAberto && (
          <ConviteDoTeste dias={portao.dias} precoDeEntrada={precoCurto} />
        )}

        {/* ============ 11 · OFERTA E PLANOS ============ */}
        <section
          id="planos"
          style={{
            scrollMarginTop: "64px",
            maxWidth: "1080px",
            margin: "clamp(56px,7vw,88px) auto 0",
            padding: "0 clamp(20px,4vw,28px)",
          }}
        >
          {promo && faixas && planoPromovido && primeiraFaixa && ultimaFaixa && (
            <div
              style={{
                border: "1px solid #E6E0D8",
                borderRadius: "14px",
                background: "#FFFFFF",
                padding: "clamp(24px,3.5vw,36px)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                  gap: "clamp(24px,3.5vw,44px)",
                  alignItems: "center",
                }}
                data-stack="1"
              >
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      margin: "0 0 14px",
                      padding: "5px 12px",
                      borderRadius: "999px",
                      background: "#F3EBF0",
                      color: "#6E3F5F",
                      fontFamily: MONO,
                      fontSize: "11px",
                      fontWeight: "500",
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Condição de lançamento
                  </span>
                  <h2
                    style={{
                      margin: "0 0 12px",
                      fontFamily: TITULO,
                      fontWeight: "600",
                      fontSize: "clamp(24px,3.4vw,36px)",
                      lineHeight: "1.13",
                      letterSpacing: "-0.03em",
                      textWrap: "pretty",
                    }}
                  >
                    {`Comece por ${reais(primeiraFaixa.valorMensal)} por mês.`}
                  </h2>
                  <p
                    style={{
                      margin: "0 0 10px",
                      maxWidth: "48ch",
                      fontSize: "16.5px",
                      lineHeight: "1.6",
                      color: "#6B6259",
                    }}
                  >
                    Uma condição especial para as primeiras cerimonialistas que entrarem
                    no sistema.
                  </p>
                  <p
                    style={{
                      margin: "0",
                      maxWidth: "48ch",
                      fontSize: "15px",
                      lineHeight: "1.6",
                      color: "#6B6259",
                    }}
                  >
                    {/* "Sobe gradualmente" era verdade com três preços.
                        Com um degrau só o valor sobe UMA vez, e dizer
                        "gradualmente" seria suavizar um salto de 3,5× —
                        exatamente o tipo de frase que a pessoa lembra na
                        fatura do quarto mês. A frase segue o número de
                        degraus, e não o contrário. */}
                    {faixas.length > 2
                      ? `Você começa pagando ${reais(primeiraFaixa.valorMensal)} para conhecer e implementar o sistema na sua rotina. O valor sobe gradualmente até o preço normal de ${reais(ultimaFaixa.valorMensal)} por mês.`
                      : `Você começa pagando ${reais(primeiraFaixa.valorMensal)} por mês para conhecer e implementar o sistema na sua rotina. A partir do ${ultimaFaixa.de}º mês vale o preço normal, ${reais(ultimaFaixa.valorMensal)} por mês.`}
                  </p>
                </div>
                <div>
                  <div
                    style={{
                      border: "1px solid #E6E0D8",
                      borderRadius: "10px",
                      overflow: "hidden",
                    }}
                  >
                    {faixas.map((f, i) => (
                      <div
                        key={f.rotulo}
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: "12px",
                          padding: "14px 16px",
                          ...(i === 0
                            ? { background: "#F3EBF0" }
                            : { borderTop: "1px solid #E6E0D8" }),
                        }}
                      >
                        <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                          {f.rotulo}
                        </span>
                        <b
                          style={{
                            fontFamily: MONO,
                            fontWeight: "600",
                            fontSize: "18px",
                            color: "#221E1B",
                          }}
                        >
                          {reais(f.valorMensal)}
                        </b>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "12px",
                      marginTop: "20px",
                    }}
                  >
                    {visitante && (
                      <a
                        href="/comecar"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "50px",
                          padding: "0 26px",
                          borderRadius: "8px",
                          background: "#6E3F5F",
                          color: "#FAF8F5",
                          textDecoration: "none",
                          fontWeight: "600",
                          fontSize: "16px",
                          transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
                        }}
                        className="pl-h-ameixa pl-cta"
                      >
                        Quero conhecer o sistema
                      </a>
                    )}
                    {dona && (
                      <a
                        href={`/assinatura?plano=${planoPromovido.codigo}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "50px",
                          padding: "0 26px",
                          borderRadius: "8px",
                          background: "#6E3F5F",
                          color: "#FAF8F5",
                          textDecoration: "none",
                          fontWeight: "600",
                          fontSize: "16px",
                        }}
                        className="pl-h-ameixa pl-cta"
                      >
                        {jaPaga
                          ? `Mudar para o ${planoPromovido.nome}`
                          : `Assinar o ${planoPromovido.nome}`}
                      </a>
                    )}
                    {equipe && (
                      <p
                        style={{
                          margin: "0",
                          fontSize: "13.5px",
                          lineHeight: "1.5",
                          color: "#6B6259",
                        }}
                      >
                        Quem assina ou muda de plano é a proprietária da conta.
                      </p>
                    )}
                    <p
                      style={{
                        margin: "0",
                        fontSize: "13.5px",
                        lineHeight: "1.55",
                        color: "#6B6259",
                      }}
                    >
                      Cancela quando quiser, sem multa e sem fidelidade. O que já está
                      criado continua seu.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <h3
            style={{
              margin: "clamp(40px,5vw,56px) 0 8px",
              fontFamily: TITULO,
              fontWeight: "600",
              fontSize: "clamp(20px,2.6vw,26px)",
              lineHeight: "1.2",
              letterSpacing: "-0.025em",
            }}
          >
            Qual plano é o seu
          </h3>
          <p style={{ margin: "0", maxWidth: "60ch", fontSize: "16px", lineHeight: "1.6", color: "#6B6259" }}>
            {`O produto é o mesmo e inteiro ${nosNSeco}. O que muda são duas coisas: quantos eventos ficam em andamento ao mesmo tempo e quantas pessoas têm login próprio.`}
          </p>

          <section
            style={{
              display: "grid",
              gridAutoFlow: "column",
              gridTemplateRows: "repeat(6,auto)",
              gridTemplateColumns: "minmax(176px,.78fr)",
              gridAutoColumns: "1fr",
              marginTop: "28px",
              borderTop: "1px solid #E6E0D8",
            }}
            data-grade="1"
            aria-label="Os planos lado a lado"
          >
            <div data-hide-sm="1" style={{ padding: "20px 22px 16px 0" }}></div>
            <div data-hide-sm="1" style={rotuloMono}>
              Por mês
            </div>
            <div data-hide-sm="1" style={rotuloMono}>
              Para quem é
            </div>
            <div data-hide-sm="1" style={rotuloMonoNevoa}>
              Eventos em andamento ao mesmo tempo
            </div>
            <div data-hide-sm="1" style={rotuloMonoNevoa}>
              Pessoas com login
            </div>
            <div data-hide-sm="1" style={{ padding: "20px 22px 16px 0" }}></div>

            {planos.map((p, i) => {
              const destaque = i === iDestaque;
              const comPromo = promo && p.codigo === PLANO_DA_PROMOCAO && faixas;
              return (
                <Fragment key={p.codigo}>
                  <div
                    data-cel="1"
                    data-cel-borda="1"
                    {...(i === 0 ? { "data-cel-borda-1": "1" } : {})}
                    style={{ padding: "22px 22px 16px", borderLeft: "1px solid #E6E0D8" }}
                  >
                    <h4
                      style={{
                        margin: "0",
                        fontFamily: TITULO,
                        fontWeight: "600",
                        fontSize: "19px",
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {p.nome}
                    </h4>
                    {comPromo && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: "8px",
                          padding: "3px 8px",
                          borderRadius: "999px",
                          background: "#F3EBF0",
                          fontFamily: MONO,
                          fontSize: "11px",
                          fontWeight: "500",
                          letterSpacing: ".04em",
                          color: "#6E3F5F",
                        }}
                      >
                        condição de lançamento
                      </span>
                    )}
                  </div>

                  <div
                    data-cel="1"
                    style={{
                      padding: "16px 22px",
                      borderLeft: "1px solid #E6E0D8",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span data-plano-cel="1" style={rotuloCelular}>
                      Por mês
                    </span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontWeight: "600",
                        fontSize: "30px",
                        lineHeight: "1.1",
                        letterSpacing: "-0.02em",
                        color: "#221E1B",
                      }}
                    >
                      {reais(comPromo && faixas ? faixas[0].valorMensal : p.valorMensal)}
                    </span>
                    {comPromo && faixas && faixas[0].ate !== null && (
                      <span style={{ fontSize: "12.5px", lineHeight: "1.4", color: "#3D3835" }}>
                        {faixas[0].de === faixas[0].ate
                          ? `no mês ${faixas[0].de}`
                          : `nos meses ${faixas[0].de} a ${faixas[0].ate}`}
                      </span>
                    )}
                    {comPromo && faixas && (
                      <span
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          marginTop: "8px",
                          fontFamily: MONO,
                          fontSize: "12.5px",
                          lineHeight: "1.45",
                          color: "#6B6259",
                        }}
                      >
                        {faixas.slice(1).map((f) => (
                          <span key={f.rotulo}>
                            {f.ate === null
                              ? `${reais(f.valorMensal)} do ${f.de}º mês em diante`
                              : f.de === f.ate
                                ? `${reais(f.valorMensal)} no mês ${f.de}`
                                : `${reais(f.valorMensal)} nos meses ${f.de} a ${f.ate}`}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>

                  <div
                    data-cel="1"
                    style={{
                      padding: "16px 22px",
                      borderLeft: "1px solid #E6E0D8",
                      fontSize: "14.5px",
                      lineHeight: "1.55",
                      color: "#3D3835",
                    }}
                  >
                    <span data-plano-cel="1" style={rotuloCelular}>
                      Para quem é
                    </span>
                    {paraQuemE(p)}
                  </div>

                  <div
                    data-cel="1"
                    data-nevoa="1"
                    style={{
                      padding: "16px 22px",
                      borderLeft: "1px solid #E6E0D8",
                      background: "#F2EEE9",
                    }}
                  >
                    <span data-plano-cel="1" style={rotuloCelularForte}>
                      Eventos em andamento ao mesmo tempo
                    </span>
                    <span style={numeroDoTeto}>{tetoEmTexto(p.eventosEmAndamento)}</span>
                  </div>

                  <div
                    data-cel="1"
                    data-nevoa="1"
                    style={{
                      padding: "16px 22px",
                      borderLeft: "1px solid #E6E0D8",
                      background: "#F2EEE9",
                    }}
                  >
                    <span data-plano-cel="1" style={rotuloCelularForte}>
                      Pessoas com login
                    </span>
                    <span style={numeroDoTeto}>{tetoEmTexto(p.logins)}</span>
                  </div>

                  <div
                    data-cel="1"
                    style={{ padding: "20px 22px 8px", borderLeft: "1px solid #E6E0D8" }}
                  >
                    {botaoDoPlano(p, destaque)}
                  </div>
                </Fragment>
              );
            })}
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: "32px 44px",
              marginTop: "44px",
            }}
            data-stack="1"
          >
            <div>
              <h4
                style={{
                  margin: "0 0 8px",
                  fontFamily: TITULO,
                  fontWeight: "600",
                  fontSize: "16px",
                  letterSpacing: "-0.01em",
                }}
              >
                O que conta como evento em andamento
              </h4>
              <p style={{ margin: "0 0 8px", fontSize: "15px", lineHeight: "1.6", color: "#3D3835" }}>
                Contam os eventos em orçamento e os confirmados. Concluídos e cancelados
                não contam.
              </p>
              <p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#3D3835" }}>
                Quando um evento conclui, a vaga volta.
              </p>
            </div>
            <div>
              <h4
                style={{
                  margin: "0 0 8px",
                  fontFamily: TITULO,
                  fontWeight: "600",
                  fontSize: "16px",
                  letterSpacing: "-0.01em",
                }}
              >
                Chegou no limite?
              </h4>
              <p style={{ margin: "0 0 8px", fontSize: "15px", lineHeight: "1.6", color: "#3D3835" }}>
                Nada some e nada trava para consulta: seus eventos, e tudo dentro deles,
                continuam abertos.
              </p>
              <p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#3D3835" }}>
                O que pede plano maior é criar o próximo evento ou dar o próximo login.
              </p>
            </div>
          </div>
        </section>

        <Perguntas />

        {/* ============ 13 · CTA FINAL ============ */}
        <section
          data-cta-final="1"
          style={{
            marginTop: "clamp(56px,7vw,88px)",
            padding: "clamp(56px,7vw,84px) 0",
            background: "#F2EEE9",
            borderTop: "1px solid #E6E0D8",
            borderBottom: "1px solid #E6E0D8",
          }}
        >
          <div
            style={{
              maxWidth: "1080px",
              margin: "0 auto",
              padding: "0 clamp(20px,4vw,28px)",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                margin: "0 auto 14px",
                maxWidth: "24ch",
                fontFamily: TITULO,
                fontWeight: "700",
                fontSize: "clamp(26px,3.8vw,40px)",
                lineHeight: "1.1",
                letterSpacing: "-0.032em",
                textWrap: "balance",
              }}
            >
              Coloque um evento no sistema hoje.
            </h2>
            <p
              style={{
                margin: "0 auto",
                maxWidth: "52ch",
                fontSize: "17px",
                lineHeight: "1.55",
                color: "#6B6259",
                textWrap: "pretty",
              }}
            >
              Comece por um evento que você já está organizando. Cole a conversa e veja a
              operação dele montada.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "14px",
                marginTop: "30px",
              }}
            >
              {visitante && (
                <a
                  href={entradaPrincipal.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "52px",
                    padding: "0 30px",
                    borderRadius: "8px",
                    background: "#6E3F5F",
                    color: "#FAF8F5",
                    textDecoration: "none",
                    fontWeight: "600",
                    fontSize: "17px",
                    textAlign: "center",
                    transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
                  }}
                  className="pl-h-ameixa pl-cta"
                >
                  {entradaPrincipal.rotulo}
                </a>
              )}
              {entradaSecundaria && (
                <a
                  href={entradaSecundaria.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "44px",
                    padding: "0 18px",
                    borderRadius: "8px",
                    border: "1px solid #6E3F5F",
                    color: "#6E3F5F",
                    textDecoration: "none",
                    fontWeight: "600",
                    fontSize: "15px",
                  }}
                  className="pl-h-contorno"
                >
                  {entradaSecundaria.rotulo}
                </a>
              )}
              {dona && planoDeEntrada && (
                <a
                  href={jaPaga ? "/assinatura" : `/assinatura?plano=${planoDeEntrada.codigo}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "52px",
                    padding: "0 30px",
                    borderRadius: "8px",
                    background: "#6E3F5F",
                    color: "#FAF8F5",
                    textDecoration: "none",
                    fontWeight: "600",
                    fontSize: "17px",
                  }}
                  className="pl-h-ameixa pl-cta"
                >
                  {jaPaga ? "Minha assinatura" : `Assinar o ${planoDeEntrada.nome}`}
                </a>
              )}
              {equipe && (
                <p style={{ margin: "0", fontSize: "13.5px", lineHeight: "1.5", color: "#6B6259" }}>
                  Quem assina ou muda de plano é a proprietária da conta.
                </p>
              )}
              {promo && (
                <p
                  style={{
                    margin: "0",
                    maxWidth: "56ch",
                    fontSize: "13.5px",
                    lineHeight: "1.55",
                    color: "#6B6259",
                  }}
                >
                  {`${fraseDaEscadaEmFaixas}. Cancela quando quiser, sem multa.`}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "20px clamp(20px,4vw,28px) 44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          fontSize: "13px",
          color: "#6B6259",
        }}
      >
        <span>eorganizei</span>
        <nav style={{ display: "flex", gap: "18px" }}>
          <a
            href="/termos"
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: "44px",
              color: "#6B6259",
              textDecoration: "none",
            }}
            className="pl-h-tinta"
          >
            Termos e Condições
          </a>
          <a
            href="/privacidade"
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: "44px",
              color: "#6B6259",
              textDecoration: "none",
            }}
            className="pl-h-tinta"
          >
            Política de Privacidade
          </a>
        </nav>
      </footer>

      {/* No celular a página tem cinco telas de rolagem entre um CTA e o
          seguinte; a barra fixa mantém a ação sempre a um toque. Só
          existe para quem pode assinar — a coordenadora logada não ganha
          botão. */}
      {podeAssinar && <div data-cta-espaco="1" style={{ display: "none", height: "76px" }}></div>}
      {podeAssinar && (
        <div
          data-cta-fixo="1"
          style={{
            display: "none",
            position: "fixed",
            left: "0",
            right: "0",
            bottom: "0",
            zIndex: "40",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            padding: "11px 16px",
            background: "#FAF8F5",
            borderTop: "1px solid #E6E0D8",
            boxShadow: "0 -6px 20px rgba(34,30,27,.08)",
          }}
        >
          <span style={{ minWidth: "0" }}>
            {testeAberto && (
              <>
                <b
                  style={{
                    display: "block",
                    fontFamily: MONO,
                    fontWeight: "600",
                    fontSize: "15px",
                    letterSpacing: "-0.01em",
                    color: "#221E1B",
                  }}
                >
                  {portao.dias + " dias grátis"}
                </b>
                <em
                  style={{
                    display: "block",
                    fontStyle: "normal",
                    fontSize: "11.5px",
                    lineHeight: "1.35",
                    color: "#6B6259",
                  }}
                >
                  sem cartão de crédito
                </em>
              </>
            )}
            {!testeAberto && precoDeEntrada !== null && (
              <b
                style={{
                  display: "block",
                  fontFamily: MONO,
                  fontWeight: "600",
                  fontSize: "16px",
                  letterSpacing: "-0.01em",
                  color: "#221E1B",
                }}
              >
                {reais(precoDeEntrada)}
              </b>
            )}
            {!testeAberto && promo && mesesDoPrimeiroDegrau > 0 && (
              <em
                style={{
                  display: "block",
                  fontStyle: "normal",
                  fontSize: "11.5px",
                  lineHeight: "1.35",
                  color: "#6B6259",
                }}
              >
                {`${
                  mesesDoPrimeiroDegrau === 1
                    ? "no primeiro mês"
                    : `nos ${mesesDoPrimeiroDegrau} primeiros meses`
                } · cancela quando quiser`}
              </em>
            )}
          </span>
          {visitante && (
            <a
              href={entradaCurta.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
                minHeight: "46px",
                padding: "0 20px",
                borderRadius: "8px",
                background: "#6E3F5F",
                color: "#FAF8F5",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "15px",
              }}
              className="pl-h-ameixa pl-cta"
            >
              {testeAberto ? "Criar conta grátis" : "Começar agora"}
            </a>
          )}
          {dona && planoDeEntrada && (
            <a
              href={`/assinatura?plano=${planoDeEntrada.codigo}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
                minHeight: "46px",
                padding: "0 20px",
                borderRadius: "8px",
                background: "#6E3F5F",
                color: "#FAF8F5",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "15px",
              }}
              className="pl-h-ameixa pl-cta"
            >
              Assinar
            </a>
          )}
        </div>
      )}

      {podeAssinar && (
        <BotaoFlutuante
          href={entradaCurta.href}
          rotulo={entradaCurta.rotulo}
          preco={testeAberto ? `${portao.dias} dias` : visitante ? precoCurto : null}
        />
      )}

      {/* a marca do anúncio guardada aqui, na primeira tela — no
          cadastro a URL já não a carrega mais */}
      <Origem />
      {/* toda âncora desta página vira evento medido, sem precisar marcar
          botão por botão — e chamada nova nasce medida */}
      <MedirCliques />
      <Medicao />
    </div>
  );
}
