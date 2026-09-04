import { notFound } from "next/navigation";
import {
  getContatoCerimonialista,
  getEventoDoPortal,
  getHomePortal,
  nomeDeExibicao,
} from "@/lib/supabase/portal";
import { CabecalhoEvento, BarraConta } from "@/components/portal/CabecalhoEvento";
import { Contagem } from "@/components/portal/Contagem";
import {
  Cartao,
  CartaoOuro,
  Fio,
  LinkAcao,
  TituloSecao,
} from "@/components/portal/Nucleo";
import { CartaoEntrada, LinhaDecisao } from "@/components/portal/Linhas";
import {
  ChevronRight,
  FileText,
  Quote,
  TAMANHO,
  TAMANHO_PEQUENO,
  TRACO,
  Wallet,
} from "@/components/portal/icones";
import { dataLonga, diaEMes, prazoPortal } from "@/components/portal/datas";
import { hojeBR } from "@/lib/tempo";
import { aberturaDaAssinatura, fraseDeCuidado } from "@/lib/papel";

export const dynamic = "force-dynamic";

// Visão geral (handoff "luxo silencioso"): cabeçalho + contagem,
// Próximas decisões, faixa de assinatura, e a coluna direita com
// Perguntas e Investimento. O bloco de percentuais do protótipo NÃO
// existe aqui — decisão do dono: métrica de operação não é assunto da
// cliente.
export default async function PortalEventoPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const [home, contato] = await Promise.all([
    getHomePortal(evento.id, evento.data),
    getContatoCerimonialista(evento.id),
  ]);
  const base = `/portal/${evento.id}`;
  const nome = nomeDeExibicao(evento);

  // resumo do investimento: a próxima parcela em aberto
  const hoje = hojeBR();
  const abertas = (home.investimento?.parcelas ?? []).filter((p) => !p.paid);
  const proxima = abertas.find((p) => p.dueDate >= hoje) ?? abertas[0] ?? null;

  // a abertura muda com o tipo: um produtor de show nao e assinado
  // "com carinho"
  const abertura = aberturaDaAssinatura(evento.tipo);
  const assinatura = contato.nome
    ? `${abertura}\n${contato.nome}`
    : `${abertura}\nsua cerimonialista`;

  return (
    <>
      {/* topo: sino + iniciais (só computador; no celular o topo fixo já os tem) */}
      <div className="portal-so-pc">
        <div style={{ padding: "22px 40px 0" }}>
          <BarraConta nome={nome} />
        </div>
      </div>

      {/* cabeçalho + contagem */}
      <div className="portal-cabecalho-grade">
        <CabecalhoEvento
          nome={nome}
          dataFormatada={dataLonga(evento.data)}
          local={[evento.local, evento.cidade].filter(Boolean).join(" · ") || null}
        />
        {evento.diasRestantes !== null && evento.diasRestantes >= 0 && (
          <Contagem dias={evento.diasRestantes} tipo={evento.tipo} />
        )}
      </div>

      <div className="portal-grade-conteudo">
        {/* coluna principal */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--esp-7)" }}>
          <Cartao
            style={{ position: "relative", overflow: "hidden" }}
            padding="var(--esp-8) var(--esp-8) var(--esp-6)"
          >
            <Fio tempo="decisoes" />
            <TituloSecao
              titulo="Próximas decisões"
              apoio="Itens que precisam da sua atenção"
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {home.faltaDecidir.length === 0 ? (
                <p
                  style={{
                    padding: "var(--esp-4) 0",
                    fontSize: "var(--ts-desc)",
                    color: "var(--cor-texto-suave)",
                  }}
                >
                  Nada esperando por vocês agora.
                </p>
              ) : (
                home.faltaDecidir.map((d) => (
                  <LinhaDecisao
                    key={d.id}
                    // só vira link quando há o que responder — e aí cai na
                    // pergunta DESTA decisão: a tela mostra 5 por vez e a
                    // dela poderia ficar fora do corte
                    href={d.temPergunta ? `${base}/perguntas?decisao=${d.id}` : null}
                    assunto={d.objetivoNome}
                    titulo={d.objetivoNome ?? d.titulo}
                    descricao={d.titulo}
                    prazo={prazoPortal(d.prazoPrevisto)}
                    urgente={prazoPortal(d.prazoPrevisto) === "para agora"}
                  />
                ))
              )}
            </div>
            {/* o rodapé dizia "Ver todas as decisões" e levava a
                /perguntas, que nunca foi a lista de decisões — e num show
                levava a uma tela vazia para sempre. Agora só aparece
                quando há pergunta esperando, e diz para onde vai. */}
            {home.perguntas > 0 && (
              <div
                style={{
                  borderTop: "1px solid var(--cor-borda-linha)",
                  paddingTop: "var(--esp-4)",
                }}
              >
                <LinkAcao href={`${base}/perguntas`}>
                  Responder as perguntas
                  <ChevronRight size={TAMANHO_PEQUENO} strokeWidth={TRACO} />
                </LinkAcao>
              </div>
            )}
          </Cartao>

          {/* faixa de assinatura */}
          <CartaoOuro
            fio="assinatura"
            padding="20px 26px"
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--esp-7)",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--esp-3)",
                color: "#7C7269",
                fontSize: "var(--ts-item-desc)",
                fontWeight: 300,
                minWidth: 220,
                flex: 1,
              }}
            >
              <span style={{ color: "var(--cor-ponto)", display: "flex" }} aria-hidden>
                <Quote size={TAMANHO_PEQUENO} strokeWidth={TRACO} />
              </span>
              {fraseDeCuidado(evento.tipo)}
            </div>
            <div
              style={{
                fontFamily: "var(--fonte-titulo)",
                fontStyle: "italic",
                fontSize: "var(--ts-assinatura)",
                color: "var(--cor-ouro-profundo)",
                textAlign: "right",
                lineHeight: 1.3,
                whiteSpace: "pre-line",
              }}
            >
              {assinatura}
            </div>
          </CartaoOuro>
        </div>

        {/* coluna direita */}
        <div className="portal-coluna-direita">
          {/* "Meu evento" saiu daqui: o cartão apontava para esta mesma
              página, então clicar nele só recarregava a tela, e o nome do
              evento já está no cabeçalho logo acima. Com ele foi embora o
              único lugar da home que escrevia o TIPO do evento — e não faz
              falta: a cliente sabe que evento é o dela. */}
          {/* este cartão é o ÚNICO caminho para /perguntas (a tela não
              está em menu nenhum), então só some quando lá não há mesmo
              nada: nem pergunta agora, nem por vir, nem resposta antiga
              para reeditar. É o caso do show, e só dele. */}
          {(home.perguntas > 0 ||
            home.perguntasFuturas > 0 ||
            home.perguntasRespondidas > 0) && (
          <CartaoEntrada
            href={`${base}/perguntas`}
            icone={<FileText size={TAMANHO} strokeWidth={TRACO} />}
            titulo="Perguntas do momento"
            resumo={
              home.perguntas > 0
                ? `${home.perguntas} pergunta${home.perguntas > 1 ? "s" : ""}${
                    home.proximaPergunta
                      ? ` · ${home.proximaPergunta.label.toLowerCase()}`
                      : ""
                  }`
                : "Nada para responder agora"
            }
            acao="Ver perguntas"
          />
          )}
          <CartaoEntrada
            href={`${base}/investimento`}
            icone={<Wallet size={TAMANHO} strokeWidth={TRACO} />}
            titulo="Investimento"
            resumo={
              proxima
                ? `Próxima parcela em ${diaEMes(proxima.dueDate)}`
                : "Nenhuma parcela em aberto"
            }
            acao="Ver pagamentos"
          />
        </div>
      </div>
    </>
  );
}
