import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getGuiaDoEvento } from "@/lib/supabase/guia-estilo";
import { createClient } from "@/lib/supabase/server";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { GuiaDeEstilo } from "@/components/portal/GuiaDeEstilo";
import { AdicionarReferencia } from "@/components/portal/AdicionarReferencia";
import "./guia.css";

export const dynamic = "force-dynamic";

export default async function PortalGuiaEstiloPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const supabase = createClient();
  const [guia, { data: acesso }] = await Promise.all([
    getGuiaDoEvento(evento.id),
    // quem está lendo: a cliente tem vínculo em evento_acesso; a equipe
    // abre a mesma tela para conferir, e aí não aparece ação de aprovar
    supabase
      .from("evento_acesso")
      .select("nome")
      .eq("event_id", evento.id)
      .maybeSingle(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: souCliente } = await supabase.rpc("sou_cliente_do_evento", {
    p_event_id: evento.id,
  });
  const ehCliente = Boolean(souCliente) && Boolean(user);

  // Sem guia ainda: nada de tela de erro nem de promessa vaga. A conversa
  // sobre estilo acontece antes do documento existir.
  if (!guia) {
    return (
      <div className="portal-tela">
        <TopoInterno
          eventoId={evento.id}
          titulo="Guia de estilo"
          apoio="A identidade visual do casamento reunida num lugar só — paleta, flores, materiais, trajes e as referências de vocês."
        />
        <div className="guia-raiz">
          <div className="guia-veto">
            <p style={{ margin: 0, fontSize: 14, color: "#463E36" }}>
              Sua cerimonialista ainda vai montar o guia com vocês. Enquanto
              isso, podem ir guardando as imagens que gostarem — elas entram
              como referência.
            </p>
          </div>
          <div style={{ marginTop: 16 }}>
            <AdicionarReferencia
              eventoId={evento.id}
              nomeSugerido={acesso?.nome ?? null}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Guia de estilo"
        apoio="A identidade visual do casamento de vocês. Depois de aprovado, é o que cada fornecedor recebe."
      />
      <GuiaDeEstilo eventoId={evento.id} guia={guia} ehCliente={ehCliente} />
      {ehCliente && (
        <div className="guia-raiz" style={{ marginTop: 20 }}>
          <AdicionarReferencia
            eventoId={evento.id}
            nomeSugerido={acesso?.nome ?? null}
          />
        </div>
      )}
    </div>
  );
}
