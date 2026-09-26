import { notFound } from "next/navigation";
import { getContatoCerimonialista, getEventoDoPortal } from "@/lib/supabase/portal";
import { getCuradoriasDoPortal } from "@/lib/supabase/curadoria";
import { rotuloEscolhas } from "@/lib/papel";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { Cartao } from "@/components/portal/Nucleo";
import { SelecaoCurada } from "@/components/portal/SelecaoCurada";
import { EscolhasV2 } from "@/components/portal/v2/EscolhasV2";
import { getEscolhasDoPortal } from "@/lib/supabase/portal-escolhas";
import { usaPortalV2 } from "@/lib/portal-v2";
import { getTrilha } from "@/lib/supabase/portal-trilha";
import { MOMENTOS_DA_TRILHA } from "@/lib/trilha";
import { hojeBR } from "@/lib/tempo";

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

  // portal v2 (177): mão dupla — escolher, propor e responder aqui
  if (usaPortalV2(evento.tipo)) {
    const [{ listadas, outras }, contatoV2, trilha] = await Promise.all([
      getEscolhasDoPortal(evento.id, evento.data),
      getContatoCerimonialista(evento.id),
      getTrilha(evento.id),
    ]);
    const escolhidas = Object.values(trilha).sort((a, b) => b.em.localeCompare(a.em));
    return (
      <EscolhasV2
        eventoId={evento.id}
        escolhas={listadas}
        outras={outras}
        cerimonialista={contatoV2.nome?.split(" ")[0] ?? "Sua cerimonialista"}
        hoje={hojeBR()}
        trilha={{ comMusica: escolhidas.length, total: MOMENTOS_DA_TRILHA.length, ultima: escolhidas[0]?.titulo ?? null }}
      />
    );
  }

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
