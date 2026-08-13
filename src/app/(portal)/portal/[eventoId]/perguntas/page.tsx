import { notFound } from "next/navigation";
import { getEventoDoPortal, getPerguntas } from "@/lib/supabase/portal";
import { prazoRelativo } from "@/components/planejamento/celebra";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { Divisor } from "@/components/portal/Nucleo";
import { Pergunta } from "@/components/portal/Linhas";

export const dynamic = "force-dynamic";

// Perguntas do momento (handoff §8.8): 3 a 5 por vez, puxadas do prazo —
// nunca um formulário longo. São os campos ainda vazios das decisões que
// pertencem a vocês. "Responder" chega com a escrita, na fase seguinte;
// até lá o item informa o prazo.
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
    <>
      <TopoInterno
        eventoId={evento.id}
        secao="Evento"
        titulo="Perguntas do momento"
      />
      <p
        style={{
          marginTop: "var(--esp-5)",
          maxWidth: 520,
          fontSize: "var(--ts-corpo-p)",
          lineHeight: "var(--el-corpo-p)",
          color: "var(--cor-texto-secundario)",
          textWrap: "pretty",
        }}
      >
        {perguntas.length > 0
          ? "O que só vocês sabem responder. Aparecem conforme a data se aproxima — nada de formulário longo."
          : "Nada para responder agora. Quando a data se aproximar, as perguntas aparecem aqui."}
      </p>

      {perguntas.length > 0 && (
        <>
          <Divisor />
          <div>
            {perguntas.map((p, i) => (
              <Pergunta
                key={p.campoId}
                prazo={prazoRelativo(p.prazoPrevisto)}
                pergunta={p.label}
                apoio={p.decisaoTitulo}
                ultima={i === perguntas.length - 1}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
