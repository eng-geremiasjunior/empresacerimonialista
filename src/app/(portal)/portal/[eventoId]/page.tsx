import { notFound } from "next/navigation";
import {
  getContatoCerimonialista,
  getEventoDoPortal,
  getHomePortal,
  nomeDeExibicao,
} from "@/lib/supabase/portal";
import { waLink } from "@/lib/fornecedores-shared";
import { prazoRelativo } from "@/components/planejamento/celebra";
import { CabecalhoEvento } from "@/components/portal/CabecalhoEvento";
import { OrnamentoRamo, OrnamentoRodape } from "@/components/portal/Ornamento";
import { Botao, Cartao, Divisor, Rotulo } from "@/components/portal/Nucleo";
import { BlocoEntrada, LinhaDecisao } from "@/components/portal/Linhas";
import { dataLonga, diaEMes } from "@/components/portal/datas";

export const dynamic = "force-dynamic";

// Tela Evento (home, handoff §8.1): hero + o que falta decidir + blocos
// de entrada + já contratado + cerimonialista. Cortejo e Inspirações só
// entram quando existirem de verdade — nenhum contador falso.
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
  const zap = waLink(contato.whatsapp);
  const base = `/portal/${evento.id}`;

  // resumo do bloco Investimento: a próxima parcela em aberto e as vencidas
  const hoje = new Date().toISOString().slice(0, 10);
  const abertas = (home.investimento?.parcelas ?? []).filter((p) => !p.paid);
  const vencidas = abertas.filter((p) => p.dueDate < hoje).length;
  const proxima = abertas.find((p) => p.dueDate >= hoje);

  // resumo do bloco Perguntas: a primeira pergunta da tela (§8.1)
  const proximaPergunta = home.proximaPergunta;

  return (
    <>
      {/* hero com o ramo atrás (máximo dois ornamentos por tela: este e o
          do rodapé) */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <OrnamentoRamo className="portal-ornamento-ramo" />
        <div style={{ position: "relative" }}>
          <CabecalhoEvento
            nome={nomeDeExibicao(evento)}
            dataFormatada={dataLonga(evento.data)}
            dias={evento.diasRestantes}
            localLinha={
              [evento.local, evento.cidade].filter(Boolean).join(" · ") || null
            }
          />
        </div>
      </div>

      {home.totalAFechar > 0 && (
        <>
          <Divisor />
          <Cartao destaque>
            <Rotulo>O que falta decidir</Rotulo>
            <div style={{ marginTop: "var(--esp-2)" }}>
              {home.faltaDecidir.map((d, i) => (
                <LinhaDecisao
                  key={d.id}
                  titulo={d.titulo}
                  apoio={prazoRelativo(d.prazoPrevisto)}
                  estado="decidir"
                  ultima={i === home.faltaDecidir.length - 1}
                />
              ))}
            </div>
            {home.perguntas > 0 && (
              <div style={{ marginTop: "var(--esp-6)" }}>
                <Botao href={`${base}/perguntas`}>Ver perguntas</Botao>
              </div>
            )}
          </Cartao>
        </>
      )}

      <Divisor />

      <div className="portal-grade-2">
        <BlocoEntrada
          href={`${base}/perguntas`}
          titulo="Perguntas do momento"
          resumo={
            proximaPergunta
              ? proximaPergunta.prazoPrevisto
                ? `${prazoRelativo(proximaPergunta.prazoPrevisto)}: ${proximaPergunta.label.toLowerCase()}`
                : proximaPergunta.label
              : "O que só vocês sabem responder."
          }
          indicador={
            home.perguntas > 0
              ? `${home.perguntas} pergunta${home.perguntas > 1 ? "s" : ""}`
              : null
          }
        />
        <BlocoEntrada
          href={`${base}/investimento`}
          titulo="Investimento"
          resumo={
            proxima
              ? `Próxima parcela em ${diaEMes(proxima.dueDate)}`
              : "Nenhuma parcela em aberto"
          }
          indicador={
            vencidas > 0 ? `${vencidas} vencida${vencidas > 1 ? "s" : ""}` : null
          }
        />
      </div>

      {home.contratados.length > 0 && (
        <>
          <Divisor />
          <section>
            <Rotulo>Já contratado</Rotulo>
            <div style={{ marginTop: "var(--esp-2)" }}>
              {home.contratados.map((c, i) => (
                <LinhaDecisao
                  key={`${c.supplierId}-${i}`}
                  titulo={c.fornecedor}
                  apoio={c.categoria}
                  estado="resolvido"
                  ultima={i === home.contratados.length - 1}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {contato.nome && (
        <>
          <Divisor />
          <section>
            <Rotulo>Sua cerimonialista</Rotulo>
            <p
              style={{
                margin: "var(--esp-3) 0 0",
                fontSize: "var(--ts-corpo)",
                color: "var(--cor-texto-principal)",
              }}
            >
              {contato.nome}
            </p>
            {zap && (
              <div style={{ marginTop: "var(--esp-4)" }}>
                <Botao
                  variante="secundario"
                  href={zap}
                  className="portal-botao-flex"
                  bloco={false}
                >
                  Falar com {contato.nome.split(" ")[0]}
                </Botao>
              </div>
            )}
          </section>
        </>
      )}

      <div style={{ marginTop: "var(--esp-9)" }}>
        <OrnamentoRodape />
      </div>
    </>
  );
}
