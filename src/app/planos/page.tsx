import type { Metadata } from "next";
import { Fragment } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  comTetoDoPlano,
  fraseDaEscada,
  getCatalogoDePlanos,
  getEscadaDaPromocao,
  PLANO_DA_PROMOCAO,
  PROMOCAO_LANCAMENTO,
  reais,
  tetoEmTexto,
  type EscadaDaPromocao,
  type PlanoDoCatalogo,
} from "@/lib/planos";
import { Marca } from "@/components/marca/Marca";
import { Medicao } from "@/components/marketing/Medicao";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planos — eorganizei",
  description:
    "O mesmo sistema inteiro em todos os planos. O que muda é quantos eventos ficam em andamento ao mesmo tempo e quantas pessoas têm login.",
};

// Página pública, liberada no middleware: ela existe para a pessoa
// escolher ANTES de ter conta. A vitrine da tela de assinatura só diz o
// preço — "os planos secos só falam preço; a pessoa nem sabe qual
// escolher" (dono, 06/09/2026). Aqui ela escolhe pela situação dela e
// vê, lado a lado, as DUAS coisas que mudam. Nada de tabela de "✓" com
// as mesmas funções nas três colunas: o produto é o mesmo inteiro, e a
// página diz isso uma vez, num bloco só.
//
// Nenhum número vive aqui — nem a contagem de planos. Preço e tetos vêm
// de plano_catalogo (147): o dono muda no admin e esta página acompanha;
// se ele tirar um plano de venda, "nos três" vira "nos dois" sozinho.

// "Para quem é", montado a partir dos tetos — nunca literal, porque o
// dono muda os tetos no admin e a frase tem que continuar verdadeira.
// A célula responde "é para mim?", numa linha; os números ficam nas duas
// linhas de baixo, que existem para isso.
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

// O menu real do app, nos nomes que ela vê na barra lateral. É um bloco
// só porque é a mesma coisa em todos os planos. Só o que existe: o
// portal ainda não tem "Pagamentos" (destinos.ts marca emBreve), então a
// linha diz o que a cliente vê hoje — o resumo financeiro.
const INCLUSO: [string, string][] = [
  ["Dashboard e Copiloto", "o radar do dia: “2 eventos precisam de ação hoje”"],
  [
    "Eventos",
    "com Planejamento por tipo (casamento, debutante, formatura, show, corporativo): o que decidir e até quando, e o guia de estilo que o fornecedor abre pelo link",
  ],
  ["Orçamentos e propostas", "com aceite pela cliente"],
  [
    "Clientes e Portal da Cliente",
    "login próprio dela: perguntas, cronograma, escolhas, resumo financeiro (parcelas e o que já foi pago) e prestação de contas",
  ],
  ["Cerimonialistas", "a equipe"],
  [
    "Fornecedores",
    "Solicitações com confirmação por WhatsApp ou e-mail, Agenda de Fornecedores e Contratos (leitura do PDF: parcelas, quantidades, horários)",
  ],
  ["Tarefas e Calendário", ""],
  ["Financeiro por evento", "receita, custos, rentabilidade e parcelas"],
  ["Roteiro do dia", "link por fornecedor e Modo Evento"],
  [
    "Convidados",
    "convite e site, confirmação de presença, recepção por QR Code e mapa de mesas",
  ],
  ["Catálogo", "o conteúdo das propostas por tipo de evento, precificação e paletas"],
  ["Configurações", ""],
];

type Conta = { status: string; plano: string };

export default async function PlanosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Quem assina é a proprietária: minha_assinatura() (147) só devolve
  // linha para esse cargo, e /assinatura manda os outros para o painel
  // sem dizer nada. Sem esta leitura, a coordenadora logada ganhava três
  // botões que levavam a lugar nenhum. A mesma linha diz se a dona já
  // paga — aí o botão é "mudar", não "assinar".
  const { data: assinatura } = user
    ? await supabase.rpc("minha_assinatura")
    : { data: null };
  const conta = (assinatura ?? null) as Conta | null;
  const dona = conta !== null;
  const jaPaga = conta?.status === "ativa" || conta?.status === "inadimplente";

  // O catálogo é lido pelo caminho normal, com ou sem sessão: a policy
  // de leitura para visitante entrou com a 150 (aplicada em 06/09/2026).
  // Antes dela esta página precisava de um desvio pela chave de serviço,
  // que morreu junto — chave de serviço em página pública é superfície
  // que não se deixa aberta por conveniência.
  const planos = await getCatalogoDePlanos();
  const n = planos.length;
  const nosN = n === 3 ? "nos três" : n === 2 ? "nos dois" : "em todos os planos";

  // A ESCADA DE LANÇAMENTO (153). Esta página é o destino do anúncio: se
  // ela anuncia o preço cheio e a promoção só aparece depois de criar
  // conta, o clique que você pagou lê R$ 97,00 e vai embora — e quem
  // chegou pelo anúncio dos R$ 27,90 se sente enganado na primeira tela.
  //
  // Só o plano da promoção muda de cara; os outros seguem no preço do
  // catálogo. Se a promoção sair de venda, `getEscadaDaPromocao` devolve
  // null e a página volta sozinha ao preço cheio, sem tocar em código.
  const escada = await getEscadaDaPromocao(PROMOCAO_LANCAMENTO);
  const planoPromovido = planos.find((p) => p.codigo === PLANO_DA_PROMOCAO) ?? null;
  const emPromocao =
    escada && escada.degraus.length > 0 && planoPromovido ? escada : null;
  const primeiroDegrau =
    emPromocao && planoPromovido
      ? comTetoDoPlano(emPromocao.degraus[0].valorMensal, planoPromovido.valorMensal)
      : null;
  const fraseDaPromocao =
    emPromocao && planoPromovido
      ? fraseDaEscada(emPromocao, planoPromovido.valorMensal)
      : null;

  const topo = !user
    ? { href: "/login", texto: "Entrar" }
    : dona
      ? { href: "/assinatura", texto: "Minha assinatura" }
      : { href: "/eventos/dashboard", texto: "Voltar ao painel" };

  // O botão de cada coluna diz o que o clique faz. Sem conta, o próximo
  // passo é criar uma (a assinatura vem depois, dentro dela). Com conta,
  // o plano escolhido vai na URL e a tela de assinatura abre direto nele
  // — a escolha feita aqui não é pedida de novo lá.
  function acao(p: PlanoDoCatalogo) {
    if (!user) {
      return (
        <a className="pl-btn" href="/login">
          Criar conta e assinar
        </a>
      );
    }
    if (!dona) return null;
    if (jaPaga && conta?.plano === p.codigo) {
      return <span className="pl-seu">Seu plano</span>;
    }
    return (
      <a className="pl-btn" href={`/assinatura?plano=${p.codigo}`}>
        {jaPaga ? `Mudar para o ${p.nome}` : `Assinar o ${p.nome}`}
      </a>
    );
  }

  return (
    <div className="pl-page">
      {/* Não <style>{css}</style>: o servidor escapa as aspas do texto
          (' vira &#x27;), o cliente lê a aspa crua, e o React acusa
          "Text content did not match" e refaz a página inteira no
          navegador. Medido no dev em 06/09/2026. Como innerHTML o CSS
          chega igual dos dois lados — e não há nada de usuário nele. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header className="pl-wrap pl-topo">
        <a href="/" aria-label="eorganizei" style={{ textDecoration: "none" }}>
          <Marca tamanho={19} />
        </a>
        <a className="pl-entrar" href={topo.href}>
          {topo.texto}
        </a>
      </header>

      <main className="pl-wrap">
        <h1 className="pl-h1">Qual plano é o seu?</h1>
        <p className="pl-lede">
          {`O sistema é o mesmo ${nosN}; o que muda é o tamanho da agenda e quantas pessoas trabalham nela.`}
        </p>

        {/* A escada dita por extenso, logo abaixo da abertura — antes de
            qualquer botão. Quem chega do anúncio precisa ler aqui o que
            vai pagar em cada mês, não descobrir na quarta cobrança. */}
        {fraseDaPromocao && (
          <p className="pl-promo">
            <b>Preço de lançamento:</b> {fraseDaPromocao}. Cancela quando quiser,
            sem multa.
          </p>
        )}

        {planos.length === 0 ? (
          <p className="pl-p" style={{ marginTop: 36 }}>
            Não conseguimos carregar os planos agora. Tente de novo em alguns
            minutos.
          </p>
        ) : (
          // Uma grade só, com as células emitidas COLUNA a coluna (a de
          // rótulos e depois cada plano): no computador o fluxo é por
          // coluna e as linhas são compartilhadas — os três planos ficam
          // com a mesma altura em cada linha; no celular o fluxo vira por
          // linha, as células empilham na ordem em que foram emitidas
          // (Essencial inteiro, depois Profissional, depois Master) e
          // cada célula mostra o próprio rótulo. Nunca rola de lado.
          <section className="pl-grade" aria-label="Os planos lado a lado">
            <div className="pl-rotulo" />
            <div className="pl-rotulo">Por mês</div>
            <div className="pl-rotulo">Para quem é</div>
            <div className="pl-rotulo pl-muda">Eventos em andamento ao mesmo tempo</div>
            <div className="pl-rotulo pl-muda">Pessoas com login</div>
            <div className="pl-rotulo" />

            {planos.map((p, i) => (
              <Fragment key={p.codigo}>
                <div className={`pl-cel pl-nome${i === 0 ? " pl-primeiro" : ""}`}>
                  <h2 className="pl-nome-h">{p.nome}</h2>
                </div>
                <div className="pl-cel">
                  <span className="pl-rotulo-m">Por mês</span>
                  {/* o plano da promoção mostra o primeiro degrau em
                      destaque, com o preço cheio riscado ao lado: esconder
                      o valor futuro é o que vira contestação de cartão */}
                  {emPromocao && p.codigo === PLANO_DA_PROMOCAO && primeiroDegrau !== null ? (
                    <>
                      <span className="pl-preco">{reais(primeiroDegrau)}</span>
                      <span className="pl-cheio">{reais(p.valorMensal)}</span>
                    </>
                  ) : (
                    <span className="pl-preco">{reais(p.valorMensal)}</span>
                  )}
                </div>
                <div className="pl-cel pl-quem">
                  <span className="pl-rotulo-m">Para quem é</span>
                  {paraQuemE(p)}
                </div>
                <div className="pl-cel pl-muda">
                  <span className="pl-rotulo-m">Eventos em andamento ao mesmo tempo</span>
                  <span className="pl-num">{tetoEmTexto(p.eventosEmAndamento)}</span>
                </div>
                <div className="pl-cel pl-muda">
                  <span className="pl-rotulo-m">Pessoas com login</span>
                  <span className="pl-num">{tetoEmTexto(p.logins)}</span>
                </div>
                <div className="pl-cel pl-acao">{acao(p)}</div>
              </Fragment>
            ))}
          </section>
        )}

        {user && !dona && (
          <p className="pl-p" style={{ marginTop: 12 }}>
            Quem assina ou muda de plano é a proprietária da conta.
          </p>
        )}

        <section className="pl-incluso">
          <h2 className="pl-h2">{`Incluso ${nosN}, sem exceção`}</h2>
          <ul className="pl-lista-incluso">
            {INCLUSO.map(([nome, desc]) => (
              <li key={nome}>
                <b>{nome}</b>
                {desc ? ` — ${desc}` : ""}
              </li>
            ))}
          </ul>
        </section>

        <div className="pl-duas">
          <section className="pl-secao">
            <h2 className="pl-h2">O que conta como evento em andamento</h2>
            <p className="pl-p">Contam os eventos em orçamento e os confirmados.</p>
            <p className="pl-p">Concluídos e cancelados não contam.</p>
            <p className="pl-p">Quando um evento conclui, a vaga volta.</p>
          </section>

          <section className="pl-secao">
            <h2 className="pl-h2">Chegou no limite?</h2>
            <p className="pl-p">
              Nada some e nada trava para consulta: seus eventos, e tudo o que
              está dentro deles, continuam abertos.
            </p>
            <p className="pl-p">
              O que pede plano maior é criar o próximo evento ou dar o próximo
              login. Para evento, você também pode esperar um concluir; para
              login, desativar um acesso.
            </p>
            {/* "pelo link dela" não é enfeite: o gatilho (147) só deixa
                passar acima do teto quando não há sessão — é o caso do
                aceite no aparelho da cliente. No navegador da
                cerimonialista logada, o aceite esbarra no teto como
                qualquer criação pela mão dela. */}
            <p className="pl-p">
              O aceite de uma proposta pela sua cliente, pelo link dela, nunca
              é barrado: o evento entra mesmo acima do teto, e você recebe um
              aviso.
            </p>
          </section>
        </div>

        <section className="pl-secao">
          <h2 className="pl-h2">Regras iguais para todos</h2>
          <ul className="pl-lista">
            <li>
              Seu primeiro evento é por nossa conta: você cria um sem assinar,
              para conhecer o sistema. Depois dele, você continua vendo tudo;
              só criar o segundo pede um plano.
            </li>
            <li>
              Você muda de plano quando quiser, pela tela de assinatura. O novo
              valor vale a partir da próxima cobrança, sem cobrança
              proporcional. Para descer de plano, basta caber nos logins do
              plano de destino.
            </li>
            {/* O cancelamento vale no dia (actions.ts grava 'cancelada' na
                hora e o teto volta a 1 evento / 1 login). Prometer "o mês
                pago vai até o fim" seria dizer o que o sistema não faz. */}
            <li>
              Você cancela quando quiser, sem multa, sem taxa e sem fidelidade.
              Nenhuma cobrança nova é feita, tudo o que já está criado continua
              seu, e você volta quando quiser.
            </li>
            <li>
              Assinatura mensal, pré-paga, no cartão, pela Pagar.me. O cartão
              não passa pelos nossos servidores.
            </li>
          </ul>
        </section>

        <section className="pl-secao">
          <h2 className="pl-h2">Na dúvida</h2>
          <p className="pl-p">
            Conte quantos eventos você tem hoje entre orçamento e confirmado, e
            quantas pessoas, além de você, precisam da própria senha. O plano em
            que os dois números cabem é o seu.
          </p>
        </section>
      </main>

      <footer className="pl-wrap pl-rodape">
        <span>eorganizei</span>
        <nav className="pl-rodape-nav">
          <a href="/termos">Termos e Condições</a>
          <a href="/privacidade">Política de Privacidade</a>
        </nav>
      </footer>
      <Medicao />
    </div>
  );
}

// Estilo inline não faz :hover nem media query; o bloco fica aqui, com o
// prefixo pl-, para não vazar para o resto do app. Fontes vêm do layout
// raiz (--font-title / --font-ui / --font-mono). Todo alvo de toque tem
// pelo menos 44px de altura — a página é aberta no celular.
const css = `
  .pl-page{min-height:100vh;background:#FAF7F2;color:#221E1B;
    font-family:var(--font-ui),'Instrument Sans',sans-serif;-webkit-font-smoothing:antialiased}
  .pl-wrap{max-width:1040px;margin:0 auto;padding:0 24px;box-sizing:content-box}
  .pl-topo{display:flex;align-items:center;justify-content:space-between;padding-top:22px;padding-bottom:22px}
  .pl-entrar{display:inline-flex;align-items:center;min-height:44px;padding:0 4px;
    font:500 14px var(--font-ui),'Instrument Sans',sans-serif;color:#6E3F5F;
    text-decoration:underline;text-underline-offset:3px}
  .pl-entrar:hover{color:#4A2A40}

  .pl-h1{font:700 34px/1.15 var(--font-title),Inter,sans-serif;letter-spacing:-0.02em;margin:32px 0 10px}
  .pl-lede{font:400 17px/1.5 var(--font-ui),'Instrument Sans',sans-serif;color:#6B6259;max-width:640px;margin:0}

  /* a grade: 1 coluna explícita (rótulos) + uma implícita por plano */
  .pl-grade{display:grid;grid-auto-flow:column;grid-template-rows:repeat(6,auto);
    grid-template-columns:minmax(170px,.8fr);grid-auto-columns:1fr;margin-top:36px}
  .pl-rotulo{padding:17px 20px 14px 0;font:500 11px/1.4 var(--font-mono),'IBM Plex Mono',monospace;
    letter-spacing:.06em;text-transform:uppercase;color:#928A81}
  .pl-rotulo-m{display:none}
  .pl-cel{padding:14px 20px;border-left:1px solid #E6E1DA;min-width:0}
  .pl-nome-h{font:600 18px/1.3 var(--font-title),Inter,sans-serif;letter-spacing:-0.01em;margin:0}
  /* o preço em tinta, não em ameixa: a marca reserva a ameixa para ação
     principal, link e estado ativo — e preço é dado, não ação */
  .pl-preco{font:600 26px/1.15 var(--font-mono),'IBM Plex Mono',monospace;letter-spacing:-0.01em;color:#221E1B}
  /* o preço cheio ao lado do promocional: riscado, menor e em cinza —
     ele não some, porque é o que ela vai pagar depois da escada */
  .pl-cheio{display:inline-block;margin-left:8px;font:500 15px var(--font-mono),'IBM Plex Mono',monospace;
    color:#928A81;text-decoration:line-through}
  .pl-promo{margin:14px 0 0;max-width:640px;
    font:400 15px/1.6 var(--font-ui),'Instrument Sans',sans-serif;color:#3D3835}
  .pl-promo b{color:#221E1B;font-weight:600}
  .pl-quem{font:400 14.5px/1.5 var(--font-ui),'Instrument Sans',sans-serif;color:#3D3835}
  /* as duas linhas que mudam: peso e um fundo suave, em cinza quente —
     hierarquia por cinza, a ameixa fica para os links */
  .pl-muda{background:#F2EEE9}
  .pl-rotulo.pl-muda{color:#6B6259;font-weight:600}
  .pl-num{font:600 20px/1.3 var(--font-mono),'IBM Plex Mono',monospace;color:#221E1B}
  .pl-acao{padding-top:18px;padding-bottom:6px}
  /* altura mínima, não fixa: o rótulo quebra em duas linhas na coluna
     estreita do tablet e o botão cresce junto */
  .pl-btn{display:flex;align-items:center;justify-content:center;min-height:44px;padding:10px 12px;
    box-sizing:border-box;border-radius:8px;background:#221E1B;color:#FAF8F5;text-align:center;
    font:500 14px/1.25 var(--font-ui),'Instrument Sans',sans-serif;text-decoration:none}
  .pl-btn:hover{background:#000}
  .pl-seu{display:flex;align-items:center;justify-content:center;min-height:44px;
    font:500 14px/1.25 var(--font-ui),'Instrument Sans',sans-serif;color:#928A81}

  .pl-incluso{margin-top:36px;padding-top:24px;border-top:1px solid #E6E1DA}
  .pl-h2{font:600 17px/1.3 var(--font-title),Inter,sans-serif;letter-spacing:-0.01em;margin:0 0 8px;color:#221E1B}
  .pl-lista-incluso{list-style:none;margin:12px 0 0;padding:0;columns:3;column-gap:32px;
    font:400 14px/1.5 var(--font-ui),'Instrument Sans',sans-serif;color:#3D3835}
  .pl-lista-incluso li{break-inside:avoid;margin:0 0 10px}
  .pl-lista-incluso b{font-weight:600;color:#221E1B}

  .pl-duas{display:grid;grid-template-columns:1fr 1fr;gap:0 40px}
  .pl-secao{margin-top:40px;max-width:720px}
  .pl-p{margin:0 0 8px;font:400 15px/1.6 var(--font-ui),'Instrument Sans',sans-serif;color:#3D3835}
  /* list-style explícito: o preflight do Tailwind zera os marcadores do ul */
  .pl-lista{list-style:disc;margin:8px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:8px;
    font:400 15px/1.6 var(--font-ui),'Instrument Sans',sans-serif;color:#3D3835}

  .pl-rodape{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
    margin-top:56px;padding-top:16px;padding-bottom:40px;border-top:1px solid #E6E1DA;font-size:13px;color:#928A81}
  .pl-rodape-nav{display:flex;gap:16px}
  .pl-rodape a{display:inline-flex;align-items:center;min-height:44px;color:#928A81;
    text-decoration:underline;text-underline-offset:3px}
  .pl-rodape a:hover{color:#221E1B}

  @media (max-width:899px){
    .pl-lista-incluso{columns:2}
  }
  @media (max-width:719px){
    .pl-h1{font-size:28px}
    .pl-grade{grid-auto-flow:row;grid-template-rows:none;grid-template-columns:1fr}
    .pl-rotulo{display:none}
    .pl-rotulo-m{display:block;font:500 11px/1.4 var(--font-mono),'IBM Plex Mono',monospace;
      letter-spacing:.06em;text-transform:uppercase;color:#928A81;margin-bottom:4px}
    .pl-muda .pl-rotulo-m{color:#6B6259;font-weight:600}
    .pl-cel{border-left:0;padding-left:0;padding-right:0}
    /* a faixa sangra 14px para cada lado e o texto continua alinhado
       com as outras células */
    .pl-muda{margin:0 -14px;padding-left:14px;padding-right:14px}
    .pl-nome{border-top:1px solid #E6E1DA;padding-top:28px;margin-top:20px}
    .pl-nome.pl-primeiro{border-top:0;padding-top:0;margin-top:0}
    .pl-lista-incluso{columns:1}
    .pl-duas{grid-template-columns:1fr}
  }
`;
