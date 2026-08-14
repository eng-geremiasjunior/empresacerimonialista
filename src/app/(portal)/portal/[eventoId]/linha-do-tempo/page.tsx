import { notFound } from "next/navigation";
import { getEventoDoPortal, getLinhaDoTempo } from "@/lib/supabase/portal";
import { brl } from "@/components/planejamento/celebra";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { Cartao } from "@/components/portal/Nucleo";
import { ItemLinhaDoTempo } from "@/components/portal/Linhas";
import { dataCurta } from "@/components/portal/datas";

export const dynamic = "force-dynamic";

// Linha do tempo: do mais recente para o mais antigo — aceite da
// proposta, contratações e os compromissos em que vocês comparecem.
// Marcador cheio = aconteceu; vazado = previsto.
export default async function PortalLinhaDoTempoPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const itens = await getLinhaDoTempo(evento.id);
  const agora = new Date().toISOString();

  const descricaoDe = (item: (typeof itens)[number]): string | null => {
    if (item.tipo === "contratacao") {
      const partes = [item.detalhe, item.valor ? brl(item.valor) : null].filter(
        Boolean
      );
      return partes.length ? `${partes.join(", ")}.` : null;
    }
    if (item.tipo === "aceite") {
      return item.detalhe ? `${item.detalhe}.` : null;
    }
    return item.detalhe; // compromisso: o local, quando existe
  };

  const tituloDe = (item: (typeof itens)[number]): string =>
    item.tipo === "contratacao" ? `Decidido: ${item.titulo}` : item.titulo;

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Linha do tempo"
        apoio={
          itens.length > 0
            ? "Os passos do seu evento, do mais recente ao mais antigo."
            : "Os passos do seu evento vão aparecer aqui: contratações, escolhas suas e os compromissos marcados."
        }
      />

      {itens.length > 0 && (
        <Cartao padding="var(--esp-8)">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {itens.map((item, i) => (
              <ItemLinhaDoTempo
                key={`${item.tipo}-${i}`}
                data={item.quando ? dataCurta(item.quando) : "—"}
                titulo={tituloDe(item)}
                descricao={descricaoDe(item)}
                concluido={item.quando !== null && item.quando <= agora}
                ultimo={i === itens.length - 1}
              />
            ))}
          </div>
        </Cartao>
      )}
    </div>
  );
}
