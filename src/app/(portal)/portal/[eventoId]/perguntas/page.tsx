import { notFound } from "next/navigation";
import { getEventoDoPortal, getPerguntas } from "@/lib/supabase/portal";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { Cartao, TituloSecao } from "@/components/portal/Nucleo";
import { RespostaPergunta } from "@/components/portal/RespostaPergunta";

export const dynamic = "force-dynamic";

// Perguntas do momento: 3 a 5 por vez, puxadas do prazo — nunca um
// formulário longo. A resposta entra AQUI e cai no mesmo campo que a
// cerimonialista vê no Planejamento, sem ninguém redigitar. O que ela já
// respondeu fica embaixo, editável enquanto o bloco estiver aberto.
export default async function PortalPerguntasPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const { abertas, respondidas } = await getPerguntas(evento.id);
  const doMomento = abertas.slice(0, 5);

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Perguntas do momento"
        apoio={
          doMomento.length > 0
            ? "O que só vocês sabem responder. As respostas chegam direto para a sua cerimonialista."
            : respondidas.length > 0
              ? "Tudo respondido por enquanto. Quando a data se aproximar, aparecem perguntas novas."
              : "Nada para responder agora. Quando a data se aproximar, as perguntas aparecem aqui."
        }
      />

      {doMomento.length > 0 && (
        <Cartao padding="var(--esp-2) var(--esp-8)">
          {doMomento.map((p, i) => (
            <RespostaPergunta
              key={p.campoId}
              pergunta={p}
              ultima={i === doMomento.length - 1}
            />
          ))}
        </Cartao>
      )}

      {respondidas.length > 0 && (
        <Cartao padding="var(--esp-6) var(--esp-8)">
          <TituloSecao
            titulo="Já respondidas"
            apoio="Pode ajustar enquanto o assunto estiver em aberto."
          />
          <div>
            {respondidas.map((p, i) => (
              <RespostaPergunta
                key={p.campoId}
                pergunta={p}
                ultima={i === respondidas.length - 1}
              />
            ))}
          </div>
        </Cartao>
      )}
    </div>
  );
}
