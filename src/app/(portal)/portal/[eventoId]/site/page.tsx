import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { publicBase } from "@/lib/app-url";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { EditorSiteCasal } from "@/components/portal/EditorSiteCasal";

export const dynamic = "force-dynamic";

// O site do casamento, pelo lado do casal: a parte que é deles.
// O que é profissional (como chegar, hospedagem, publicação) fica com a
// cerimonialista — e nada vai ao ar sem a mão dela.

export default async function PortalSitePage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const supabase = createClient();
  const [{ data: site }, { data: ev }] = await Promise.all([
    supabase
      .from("evento_site")
      .select("mensagem, historia, dress_code, publicado, slug")
      .eq("event_id", evento.id)
      .maybeSingle(),
    supabase
      .from("events")
      .select("rsvp_hash")
      .eq("id", evento.id)
      .maybeSingle(),
  ]);

  const urlSite = site?.publicado
    ? site.slug
      ? publicBase() + `/c/${site.slug}`
      : ev?.rsvp_hash
        ? publicBase() + `/confirmar/evento/${ev.rsvp_hash}`
        : null
    : null;

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Site do casamento"
        apoio="A página que os convidados abrem. Esta parte é de vocês — sua cerimonialista publica quando estiver pronto."
      />
      <EditorSiteCasal
        eventoId={evento.id}
        inicial={{
          mensagem: site?.mensagem ?? "",
          historia: site?.historia ?? "",
          dressCode: site?.dress_code ?? "",
        }}
        publicado={site?.publicado === true}
        urlSite={urlSite}
      />
    </div>
  );
}
