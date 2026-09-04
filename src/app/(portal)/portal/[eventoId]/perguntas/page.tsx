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
  searchParams,
}: {
  params: { eventoId: string };
  searchParams?: { decisao?: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const { abertas, respondidas, futuras } = await getPerguntas(
    evento.id,
    evento.data
  );
  // A home manda ?decisao= quando a cliente clica numa linha de
  // "Próximas decisões". Sem isso ela cairia aqui e a pergunta daquela
  // decisão poderia estar fora das cinco — o clique levaria a uma tela
  // certa mostrando a coisa errada. As demais continuam logo abaixo,
  // na mesma ordem de prazo de sempre.
  const foco = searchParams?.decisao;
  const ordenadas = foco
    ? [
        ...abertas.filter((p) => p.decisaoId === foco),
        ...abertas.filter((p) => p.decisaoId !== foco),
      ]
    : abertas;
  const doMomento = ordenadas.slice(0, 5);

  // A tela vazia prometia pergunta futura sempre. Agora só promete quando
  // há mesmo pergunta sem resposta esperando a data chegar (`futuras`):
  // num show não existe nenhuma, numa formatura existe uma no método
  // inteiro, e a cliente que respondeu tudo lia para sempre que viriam
  // perguntas novas.
  const apoio =
    doMomento.length > 0
      ? "O que só vocês sabem responder. As respostas chegam direto para a sua cerimonialista."
      : futuras === 0
        ? "Nada para responder aqui. Sua cerimonialista chama quando precisar de algo."
        : respondidas.length > 0
          ? "Tudo respondido por enquanto. Quando a data se aproximar, aparecem perguntas novas."
          : "Nada para responder agora. Quando a data se aproximar, as perguntas aparecem aqui.";

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Perguntas do momento"
        apoio={apoio}
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
