import type { Metadata } from "next";
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
  type FaixaDaEscada,
  type PlanoDoCatalogo,
} from "@/lib/planos";
import { portaoDoTeste } from "@/lib/supabase/teste-gratis";
import { RECURSOS_DO_SISTEMA, NOMES_DOS_RECURSOS } from "@/lib/recursos-do-sistema";
import { Cabecalho } from "@/components/planos/Cabecalho";
import { CSS_PLANOS } from "@/components/planos/estilo";
import { Medicao } from "@/components/marketing/Medicao";
import { Origem } from "@/components/marketing/Origem";
import { MedirCliques } from "@/components/marketing/MedirCliques";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planos e preços — eorganizei",
  description:
    "O sistema é o mesmo e inteiro nos três planos. O que muda é quantos eventos você tem em andamento ao mesmo tempo. Usuários sem limite em todos.",
};

// A PÁGINA DE PREÇOS, separada da página de vendas (10/09/2026).
//
// Até aqui os planos moravam no fim de /planos, depois de quinze mil
// pixels de narrativa — quem entrava querendo saber o preço tinha de
// percorrer tudo, e quem já sabia o que o produto faz não tinha para
// onde ir. O dono comparou com o site da concorrente e resumiu: "muito
// feia, e pouco profissional". Antes de qualquer questão de gosto, o que
// faltava era isto: um lugar onde o preço é o assunto.
//
// A LISTA INTEIRA EM CADA PLANO, e não uma tabela de comparação com
// tiques e cruzes. É uma decisão de produto, não de desenho: o sistema é
// o mesmo nos três, e a lista repetida três vezes DIZ isso sem precisar
// escrever. Quem lê entende na hora que não vai descobrir depois que a
// função de que precisa mora no plano de cima.
//
// NENHUM NÚMERO VIVE AQUI. Preço, teto de evento e teto de login vêm de
// `plano_catalogo`; os degraus, de `plano_promocao`. Mudou lá, mudou
// aqui — inclusive a frase da escada, que é obrigação legal e não
// enfeite: o preço do quarto mês precisa estar dito onde ela decide.

const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const TITULO = "var(--font-title, Inter, sans-serif)";

type Conta = {
  plano: string | null;
  status: string | null;
  ultimo_pagamento_em: string | null;
} | null;

/** "Até 6 eventos" / "Eventos sem limite" — o que separa um plano do outro. */
function tetoDeEventos(p: PlanoDoCatalogo): string {
  return p.eventosEmAndamento === null
    ? "Eventos sem limite"
    : `Até ${p.eventosEmAndamento} eventos`;
}

export default async function PrecosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: assinatura } = user ? await supabase.rpc("minha_assinatura") : { data: null };
  const conta = (assinatura ?? null) as Conta;
  const dona = conta !== null;
  const jaPaga = conta?.status === "ativa" || conta?.status === "inadimplente";
  const visitante = !user;
  const podeAssinar = visitante || (dona && !jaPaga);

  const { data: linhaDaAssinatura } = dona
    ? await supabase.from("assinaturas").select("cancelada_em").maybeSingle()
    : { data: null };

  const planos = await getCatalogoDePlanos();
  const escada = await getEscadaDaPromocao(PROMOCAO_LANCAMENTO);
  const planoPromovido = planos.find((p) => p.codigo === PLANO_DA_PROMOCAO) ?? null;
  const faixasCruas: FaixaDaEscada[] | null =
    escada && escada.degraus.length > 0 && planoPromovido
      ? faixasDaEscada(escada, planoPromovido.valorMensal)
      : null;

  // As mesmas duas réguas de /planos: degrau que não desconta não é
  // promoção, e lançamento é para quem chega, não para quem volta.
  const promocaoDesconta =
    faixasCruas !== null &&
    planoPromovido !== null &&
    faixasCruas[0].valorMensal > 0 &&
    faixasCruas[0].valorMensal < planoPromovido.valorMensal;
  const elegivel =
    visitante ||
    podeEntrarNaPromocao({
      status: conta?.status ?? null,
      cancelada_em: linhaDaAssinatura?.cancelada_em ?? null,
      ultimo_pagamento_em: conta?.ultimo_pagamento_em ?? null,
    });
  const promo = promocaoDesconta && elegivel;
  const faixas = promo ? faixasCruas : null;
  const primeiraFaixa = faixas?.[0] ?? null;

  const portao = await portaoDoTeste();
  const testeAberto = portao.aberto && visitante;

  const acaoDoTopo = !podeAssinar
    ? null
    : testeAberto
      ? { href: "/criar-conta", rotulo: "Criar conta grátis" }
      : { href: visitante ? "/comecar" : "/assinatura", rotulo: "Assinar" };

  function botaoDoPlano(p: PlanoDoCatalogo, destaque: boolean) {
    if (!podeAssinar) {
      const meu = conta?.plano === p.codigo;
      return (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "48px",
            borderRadius: "8px",
            border: "1px solid #E6E0D8",
            color: "#6B6259",
            fontWeight: "600",
            fontSize: "15px",
          }}
        >
          {meu ? "Seu plano" : "—"}
        </span>
      );
    }
    const href = visitante
      ? testeAberto
        ? "/criar-conta"
        : `/comecar?plano=${p.codigo}`
      : `/assinatura?plano=${p.codigo}`;
    const rotulo = visitante
      ? testeAberto
        ? "Começar grátis"
        : `Assinar o ${p.nome}`
      : `Assinar o ${p.nome}`;
    return (
      <a
        href={href}
        className={destaque ? "pl-h-ameixa pl-cta" : "pl-h-branco"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "48px",
          padding: "0 18px",
          borderRadius: "8px",
          border: destaque ? "none" : "1px solid #D9D2C8",
          background: destaque ? "#6E3F5F" : "#FFFFFF",
          color: destaque ? "#FAF8F5" : "#221E1B",
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "15px",
          textAlign: "center",
        }}
      >
        {rotulo}
      </a>
    );
  }

  // O plano em destaque: o da promoção, se houver; senão o do meio, que é
  // o que a maioria escolhe.
  const iDestaque = Math.max(
    0,
    promo
      ? planos.findIndex((p) => p.codigo === PLANO_DA_PROMOCAO)
      : Math.min(1, planos.length - 1)
  );

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
      <style dangerouslySetInnerHTML={{ __html: CSS_PLANOS }} />
      {/* Mesmo bloco de topo da página de vendas: cabeçalho e título com
          o mesmo fundo, sem linha entre eles. Os cartões começam depois,
          no claro — a mudança de tom é que diz "aqui começa o preço". */}
      <Cabecalho ondeEstou="precos" acao={acaoDoTopo} entrar={visitante} fundo="#F2EEE9" emBloco />

      <main>
        {/* ---------- título ---------- */}
        <section
          style={{
            background: "#F2EEE9",
            borderBottom: "1px solid #E6E0D8",
            padding: "clamp(40px,5.5vw,66px) clamp(20px,4vw,28px) clamp(40px,5.5vw,62px)",
            textAlign: "center",
          }}
        >
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <h1
            style={{
              margin: "0 auto 14px",
              maxWidth: "20ch",
              fontFamily: TITULO,
              fontWeight: "700",
              fontSize: "clamp(30px,5vw,52px)",
              lineHeight: "1.06",
              letterSpacing: "-0.036em",
              textWrap: "balance",
            }}
          >
            Planos e preços
          </h1>
          <p
            style={{
              margin: "0 auto",
              maxWidth: "56ch",
              fontSize: "clamp(16.5px,1.9vw,19px)",
              lineHeight: "1.55",
              color: "#6B6259",
              textWrap: "pretty",
            }}
          >
            O sistema é o mesmo e inteiro nos três. O que muda é quantos eventos você
            tem em andamento ao mesmo tempo — e usuários não têm limite em nenhum.
          </p>
          {promo && primeiraFaixa && faixas && (
            <p
              style={{
                display: "inline-block",
                margin: "22px 0 0",
                padding: "9px 16px",
                borderRadius: "999px",
                background: "#F3EBF0",
                color: "#4A2A40",
                fontSize: "14px",
                fontWeight: "600",
                lineHeight: "1.4",
              }}
            >
              {`Condição de lançamento: ${fraseDasFaixas(faixas)}.`}
            </p>
          )}
        </div>
        </section>

        {/* ---------- os planos ---------- */}
        <section
          style={{
            maxWidth: "1080px",
            margin: "clamp(30px,4vw,44px) auto 0",
            padding: "0 clamp(20px,4vw,28px)",
          }}
        >
          <div
            data-precos-grade="1"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(planos.length, 3)},minmax(0,1fr))`,
              gap: "clamp(16px,2vw,22px)",
              alignItems: "start",
            }}
          >
            {planos.map((p, i) => {
              const destaque = i === iDestaque;
              return (
                <div
                  key={p.codigo}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    border: destaque ? "1.5px solid #6E3F5F" : "1px solid #E6E0D8",
                    borderRadius: "16px",
                    background: "#FFFFFF",
                    padding: "clamp(22px,2.6vw,30px)",
                    boxShadow: destaque
                      ? "0 2px 4px rgba(34,30,27,.05),0 18px 40px rgba(110,63,95,.13)"
                      : "0 1px 2px rgba(34,30,27,.04)",
                  }}
                >
                  <span style={{ display: "block", height: "23px", marginBottom: "13px" }}>
                    {destaque && (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 11px",
                        borderRadius: "999px",
                        background: "#6E3F5F",
                        color: "#FAF8F5",
                        fontFamily: MONO,
                        fontSize: "10.5px",
                        fontWeight: "500",
                        letterSpacing: ".07em",
                        textTransform: "uppercase",
                      }}
                    >
                      {promo ? "Condição de lançamento" : "O mais escolhido"}
                    </span>
                    )}
                  </span>

                  <p
                    style={{
                      margin: "0",
                      fontFamily: TITULO,
                      fontWeight: "600",
                      fontSize: "20px",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {p.nome}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: "13.5px", color: "#6B6259" }}>
                    Usuários sem limite
                  </p>

                  <p
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "5px",
                      margin: "18px 0 0",
                      fontFamily: MONO,
                      color: "#221E1B",
                    }}
                  >
                    <span style={{ fontSize: "15px", fontWeight: "500" }}>R$</span>
                    <span style={{ fontSize: "clamp(34px,4vw,46px)", fontWeight: "600", letterSpacing: "-0.03em" }}>
                      {reais(p.valorMensal).replace("R$ ", "").split(",")[0]}
                    </span>
                    <span style={{ fontSize: "clamp(17px,1.9vw,21px)", fontWeight: "600", letterSpacing: "-0.02em" }}>
                      {"," + (reais(p.valorMensal).replace("R$ ", "").split(",")[1] ?? "00")}
                    </span>
                    <span style={{ fontSize: "13.5px", color: "#6B6259", fontFamily: "inherit" }}>/mês</span>
                  </p>
                  {promo && primeiraFaixa && p.codigo === PLANO_DA_PROMOCAO && (
                    <p style={{ margin: "6px 0 0", fontSize: "13.5px", color: "#4A2A40", fontWeight: "600" }}>
                      {`${reais(primeiraFaixa.valorMensal)} nos ${primeiraFaixa.ate} primeiros meses`}
                    </p>
                  )}

                  <p
                    style={{
                      margin: "16px 0 0",
                      paddingTop: "16px",
                      borderTop: "1px solid #EFEAE3",
                      fontFamily: TITULO,
                      fontWeight: "600",
                      fontSize: "15.5px",
                    }}
                  >
                    {tetoDeEventos(p)}
                  </p>

                  <ul
                    style={{
                      listStyle: "none",
                      margin: "14px 0 22px",
                      padding: "0",
                      display: "flex",
                      flexDirection: "column",
                      gap: "7px",
                      flex: "1",
                    }}
                  >
                    {NOMES_DOS_RECURSOS.map((nome) => (
                      <li
                        key={nome}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          fontSize: "14px",
                          lineHeight: "1.45",
                          color: "#3D3835",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            flex: "none",
                            marginTop: "6px",
                            width: "5px",
                            height: "5px",
                            borderRadius: "999px",
                            background: "#6E3F5F",
                          }}
                        />
                        {nome}
                      </li>
                    ))}
                  </ul>

                  {botaoDoPlano(p, destaque)}
                </div>
              );
            })}
          </div>

          {testeAberto && (
            <p
              style={{
                margin: "18px 0 0",
                textAlign: "center",
                fontSize: "14px",
                lineHeight: "1.55",
                color: "#6B6259",
              }}
            >
              {`Todos começam com ${portao.dias} dias grátis, sem cartão de crédito. `}
              <a href="/comecar" style={{ color: "#6E3F5F", fontWeight: 600 }}>
                Prefere assinar agora
              </a>
              ?
            </p>
          )}
        </section>

        {/* ---------- a lista, com o que cada coisa é ---------- */}
        <section
          id="o-que-tem"
          style={{
            scrollMarginTop: "68px",
            maxWidth: "1080px",
            margin: "clamp(56px,7vw,88px) auto 0",
            padding: "0 clamp(20px,4vw,28px)",
          }}
        >
          <span
            style={{
              display: "block",
              margin: "0 0 10px",
              fontFamily: MONO,
              fontSize: "11px",
              fontWeight: "500",
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "#928A81",
            }}
          >
            O que tem dentro
          </span>
          <h2
            style={{
              margin: "0 0 12px",
              maxWidth: "26ch",
              fontFamily: TITULO,
              fontWeight: "600",
              fontSize: "clamp(24px,3.4vw,36px)",
              lineHeight: "1.13",
              letterSpacing: "-0.03em",
              textWrap: "pretty",
            }}
          >
            Tudo isto está nos três planos.
          </h2>
          <p style={{ margin: "0 0 clamp(26px,3.4vw,38px)", maxWidth: "60ch", fontSize: "16.5px", lineHeight: "1.6", color: "#6B6259" }}>
            Nenhuma etapa da operação fica atrás de um plano maior. O que muda entre eles
            é escala, não recurso.
          </p>

          <div
            data-recursos-grade="1"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: "1px",
              background: "#E6E0D8",
              border: "1px solid #E6E0D8",
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            {RECURSOS_DO_SISTEMA.map((r) => (
              <div key={r.nome} style={{ background: "#FFFFFF", padding: "clamp(18px,2vw,22px)" }}>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontFamily: TITULO,
                    fontWeight: "600",
                    fontSize: "16px",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {r.nome}
                </p>
                <p style={{ margin: "0", fontSize: "14.5px", lineHeight: "1.5", color: "#6B6259", textWrap: "pretty" }}>
                  {r.descricao}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- perguntas ---------- */}
        <section
          style={{
            maxWidth: "1080px",
            margin: "clamp(56px,7vw,88px) auto 0",
            padding: "0 clamp(20px,4vw,28px)",
          }}
        >
          <h2
            style={{
              margin: "0 0 clamp(18px,2.4vw,26px)",
              fontFamily: TITULO,
              fontWeight: "600",
              fontSize: "clamp(22px,3vw,30px)",
              lineHeight: "1.15",
              letterSpacing: "-0.028em",
            }}
          >
            O que costuma travar a decisão
          </h2>
          <div style={{ borderTop: "1px solid #E6E0D8" }}>
            {[
              {
                p: "O que conta como evento em andamento?",
                r: "Contam os eventos em orçamento e os confirmados. Concluídos e cancelados não contam — quando um evento conclui, a vaga volta.",
              },
              {
                p: "Cheguei no limite. O que acontece?",
                r: "Nada some e nada trava para consulta: seus eventos, e tudo dentro deles, continuam abertos. O que pede plano maior é criar o próximo evento.",
              },
              {
                p: "Quantas pessoas podem usar?",
                r: "Quantas você quiser, em qualquer plano. Cada pessoa da equipe entra com o próprio acesso e vê a mesma informação que você.",
              },
              {
                p: "Posso mudar de plano depois?",
                r: "Pode, para cima ou para baixo, quando quiser. O que já está criado continua seu.",
              },
              {
                p: "E se eu quiser cancelar?",
                r: "Cancela quando quiser, sem multa e sem fidelidade. Não pedimos motivo e não ligamos para tentar convencer.",
              },
              {
                p: "Preciso instalar alguma coisa?",
                r: "Não. Funciona no navegador do computador e do celular. O fornecedor também não instala nada: ele abre um link.",
              },
            ].map((q) => (
              <details key={q.p} style={{ borderBottom: "1px solid #E6E0D8" }}>
                <summary
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    padding: "18px 0",
                    cursor: "pointer",
                    listStyle: "none",
                    fontFamily: TITULO,
                    fontWeight: "600",
                    fontSize: "17px",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {q.p}
                  <span aria-hidden="true" style={{ flex: "none", color: "#928A81", fontSize: "20px", lineHeight: "1" }}>
                    +
                  </span>
                </summary>
                <p style={{ margin: "0 0 18px", maxWidth: "68ch", fontSize: "15.5px", lineHeight: "1.6", color: "#6B6259" }}>
                  {q.r}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ---------- fecho ---------- */}
        {podeAssinar && (
          <section
            style={{
              marginTop: "clamp(56px,7vw,88px)",
              padding: "clamp(48px,6vw,72px) 0",
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
                  fontSize: "clamp(24px,3.4vw,36px)",
                  lineHeight: "1.12",
                  letterSpacing: "-0.03em",
                  textWrap: "balance",
                }}
              >
                Comece pelo evento que você já está organizando.
              </h2>
              {acaoDoTopo && (
                <a
                  href={acaoDoTopo.href}
                  className="pl-h-ameixa pl-cta"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "52px",
                    marginTop: "10px",
                    padding: "0 30px",
                    borderRadius: "8px",
                    background: "#6E3F5F",
                    color: "#FAF8F5",
                    textDecoration: "none",
                    fontWeight: "600",
                    fontSize: "17px",
                  }}
                >
                  {testeAberto ? `Criar conta grátis — ${portao.dias} dias, sem cartão` : acaoDoTopo.rotulo}
                </a>
              )}
            </div>
          </section>
        )}
      </main>

      <footer
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "24px clamp(20px,4vw,28px) 48px",
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
          <a href="/planos" className="pl-h-tinta" style={{ color: "#6B6259", textDecoration: "none" }}>
            Início
          </a>
          <a href="/termos" className="pl-h-tinta" style={{ color: "#6B6259", textDecoration: "none" }}>
            Termos e Condições
          </a>
          <a href="/privacidade" className="pl-h-tinta" style={{ color: "#6B6259", textDecoration: "none" }}>
            Política de Privacidade
          </a>
        </nav>
      </footer>

      <Origem />
      <MedirCliques />
      <Medicao />
    </div>
  );
}
