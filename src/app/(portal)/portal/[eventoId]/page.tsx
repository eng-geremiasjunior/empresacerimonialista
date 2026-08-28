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
  CalendarCheck,
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

export const dynamic = "force-dynamic";

const TIPO_ROTULO: Record<string, string> = {
  casamento: "Casamento",
  debutante: "Debutante",
  aniversario: "Aniversário",
  corporativo: "Evento corporativo",
};

// Visão geral (handoff "luxo silencioso"): cabeçalho + contagem,
// Próximas decisões, faixa de assinatura, e a coluna direita com Meu
// evento, Perguntas, Investimento. O bloco de percentuais do protótipo
// NÃO existe aqui — decisão do dono: métrica de operação não é assunto
// da noiva.
export default async function PortalEventoPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const [home, contato] = await Promise.all([
    getHomePortal(evento.id),
    getContatoCerimonialista(evento.id),
  ]);
  const base = `/portal/${evento.id}`;
  const nome = nomeDeExibicao(evento);

  // resumo do investimento: a próxima parcela em aberto
  const hoje = hojeBR();
  const abertas = (home.investimento?.parcelas ?? []).filter((p) => !p.paid);
  const proxima = abertas.find((p) => p.dueDate >= hoje) ?? abertas[0] ?? null;

  const assinatura = contato.nome
    ? `Com carinho,\n${contato.nome}`
    : "Com carinho,\nsua cerimonialista";

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
          <Contagem dias={evento.diasRestantes} />
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
                home.faltaDecidir.map((d, i) => (
                  <LinhaDecisao
                    key={d.id}
                    href={`${base}/perguntas`}
                    assunto={d.objetivoNome}
                    titulo={d.objetivoNome ?? d.titulo}
                    descricao={d.titulo}
                    prazo={prazoPortal(d.prazoPrevisto)}
                    urgente={prazoPortal(d.prazoPrevisto) === "para agora"}
                    ultima={i === home.faltaDecidir.length - 1}
                  />
                ))
              )}
            </div>
            {home.totalAFechar > home.faltaDecidir.length && (
              <div
                style={{
                  borderTop: "1px solid var(--cor-borda-linha)",
                  paddingTop: "var(--esp-4)",
                }}
              >
                <LinkAcao href={`${base}/perguntas`}>
                  Ver todas as decisões
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
              Cada detalhe conta uma história. Estamos cuidando de tudo para que
              vocês vivam o inesquecível.
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
          <CartaoEntrada
            href={base}
            icone={<CalendarCheck size={TAMANHO} strokeWidth={TRACO} />}
            titulo="Meu evento"
            resumo={`${nome} · ${TIPO_ROTULO[evento.tipo] ?? evento.tipo}`}
          />
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
