import { notFound } from "next/navigation";
import { getContatoCerimonialista, getEventoDoPortal } from "@/lib/supabase/portal";
import { getCuradoriasDoPortal } from "@/lib/supabase/curadoria";
import { rotuloEscolhas } from "@/lib/papel";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { Cartao } from "@/components/portal/Nucleo";
import { SelecaoCurada } from "@/components/portal/SelecaoCurada";

export const dynamic = "force-dynamic";

// As opções que a cerimonialista separou. Nada aparece aqui até ela
// publicar — rascunho é trabalho dela, não expectativa da cliente.
export default async function PortalEscolhasPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const [curadorias, contato] = await Promise.all([
    getCuradoriasDoPortal(evento.id),
    getContatoCerimonialista(evento.id),
  ]);

  const abertas = curadorias.filter((c) => c.estado === "publicada");
  const respondidas = curadorias.filter((c) => c.estado !== "publicada");

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo={rotuloEscolhas(evento.tipo)}
        apoio={
          abertas.length > 0
            ? "O que já foi pesquisado para vocês. Escolham com calma — e se nada agradar, é só dizer."
            : curadorias.length > 0
              ? "Tudo respondido. Quando houver opções novas, elas aparecem aqui."
              : `Quando ${contato.nome?.split(" ")[0] ?? "sua cerimonialista"} separar opções para vocês, elas aparecem aqui — com foto, valor e o que está incluído.`
        }
      />

      {abertas.map((c) => (
        <SelecaoCurada
          key={c.id}
          eventoId={evento.id}
          curadoria={c}
          cerimonialista={contato.nome}
        />
      ))}

      {respondidas.length > 0 && (
        <>
          {abertas.length > 0 && <div style={{ height: 1, background: "var(--cor-borda-linha)" }} />}
          {respondidas.map((c) => (
            <SelecaoCurada
              key={c.id}
              eventoId={evento.id}
              curadoria={c}
              cerimonialista={contato.nome}
            />
          ))}
        </>
      )}

      {curadorias.length === 0 && (
        <Cartao padding="var(--esp-6)">
          <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
            Nada para escolher agora.
          </p>
        </Cartao>
      )}
    </div>
  );
}
