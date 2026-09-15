import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEventoDoPortal, getLinhaDoTempo } from "@/lib/supabase/portal";
import { brl } from "@/components/planejamento/celebra";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { Cartao } from "@/components/portal/Nucleo";
import { ItemLinhaDoTempo } from "@/components/portal/Linhas";
import { dataCurta } from "@/components/portal/datas";
import { FileText, TAMANHO, TRACO } from "@/components/portal/icones";

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

  const [itens, contratos] = await Promise.all([
    getLinhaDoTempo(evento.id),
    contratosDoEvento(evento.id),
  ]);
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

      {contratos.map((c) => (
        <Cartao key={c.id} padding="var(--esp-6)">
          <a
            href={`/api/documento/${c.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--esp-4)",
              minHeight: "var(--toque-min)",
              color: "var(--cor-texto-forte)",
              textDecoration: "none",
              fontSize: "var(--ts-meta)",
            }}
          >
            <FileText size={TAMANHO} strokeWidth={TRACO} style={{ flexShrink: 0, color: "var(--cor-texto-suave)" }} />
            <span>Contrato de prestação de serviço</span>
          </a>
        </Cartao>
      ))}
    </div>
  );
}

/**
 * O contrato de prestação que a cliente aceitou junto da proposta (163).
 * Só o contrato: o modelo da cerimonialista, sem dado da cliente. O termo
 * assinado tem o valor aceito e o CPF — dado de pagamento e dado pessoal
 * são só de quem contrata, que recebe o termo por e-mail. O portal é aberto
 * a quem ela convida, e a própria RLS do portal (163) não entrega o termo.
 */
async function contratosDoEvento(eventId: string): Promise<{ id: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_documento")
    .select("id")
    .eq("event_id", eventId)
    .eq("categoria", "contrato_prestacao")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return [];
  return (data ?? []) as { id: string }[];
}
