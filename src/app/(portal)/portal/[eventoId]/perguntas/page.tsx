import { notFound } from "next/navigation";
import { getEventoDoPortal, getPerguntas } from "@/lib/supabase/portal";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { Cartao } from "@/components/portal/Nucleo";
import { Pergunta } from "@/components/portal/Linhas";
import { prazoPortal } from "@/components/portal/datas";

export const dynamic = "force-dynamic";

// Perguntas do momento: 3 a 5 por vez, puxadas do prazo — nunca um
// formulário longo. São os campos marcados como pergunta da cliente
// (pergunta_cliente) das decisões que pertencem a vocês. "Responder"
// chega com a escrita, na fase seguinte.
export default async function PortalPerguntasPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const todas = await getPerguntas(evento.id);
  const perguntas = todas.slice(0, 5);

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Perguntas do momento"
        apoio={
          perguntas.length > 0
            ? "O que só vocês sabem responder. Aparecem conforme a data se aproxima."
            : "Nada para responder agora. Quando a data se aproximar, as perguntas aparecem aqui."
        }
      />

      {perguntas.length > 0 && (
        <Cartao padding="var(--esp-2) var(--esp-8)">
          {perguntas.map((p, i) => {
            const prazo = prazoPortal(p.prazoPrevisto);
            return (
              <Pergunta
                key={p.campoId}
                prazo={prazo}
                urgente={prazo === "para agora"}
                pergunta={p.label}
                apoio={p.decisaoTitulo}
                ultima={i === perguntas.length - 1}
              />
            );
          })}
        </Cartao>
      )}
    </div>
  );
}
