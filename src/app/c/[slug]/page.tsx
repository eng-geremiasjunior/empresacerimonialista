import { cache } from "react";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { ConviteCompleto } from "@/components/convite/ConviteCompleto";
import { assinarMidiaDoConvite } from "@/lib/supabase/assinar-midia-convite";
import { clienteAnonimoPublico } from "@/lib/supabase/anon-publico";
import { convitePara, quandoLegivel } from "@/lib/rsvp-convite";
import type { SitePublico } from "@/lib/site-publico-tipos";

export const dynamic = "force-dynamic";

/**
 * O site pelo endereço bonito. Slug aposentado redireciona PARA SEMPRE
 * ao atual — link de casamento vai para convite impresso e não pode
 * morrer. A RPC resolve slug atual e histórico; o gate (publicado) é
 * dela.
 */
const carregarSite = cache(async (slug: string): Promise<SitePublico | null> => {
  const { data } = await clienteAnonimoPublico().rpc("site_publico", {
    p_ref: slug,
  });
  return (data as SitePublico | null) ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const site = await carregarSite(params.slug);
  if (!site) return { title: "Convite" };
  const titulo = `${site.evento.anfitrioes} — ${quandoLegivel(site.evento.data, site.evento.hora)}`;
  return {
    title: titulo,
    description: `Você está convidado para ${convitePara(site.evento.tipo)} ${site.evento.anfitrioes}.`,
    robots: { index: false, follow: false },
    openGraph: {
      title: titulo,
      images: site.evento.capa_url ? [site.evento.capa_url] : [],
    },
  };
}

export default async function ConviteSlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const site = await carregarSite(params.slug);

  if (!site) {
    return (
      <main className="rsvp-fora">
        <div className="rsvp-cartao">
          <h1 className="rsvp-titulo">Este convite não está disponível.</h1>
          <p className="rsvp-texto">
            Confira o endereço com quem enviou — pode ter mudado.
          </p>
        </div>
      </main>
    );
  }

  // endereço aposentado: o convite impresso continua funcionando,
  // mas o navegador aprende o atual
  if (site.ref_e_slug_antigo && site.slug_atual) {
    permanentRedirect(`/c/${site.slug_atual}`);
  }

  const midia = await assinarMidiaDoConvite(site);
  return (
    <ConviteCompleto
      dados={site}
      fotosAlbum={midia.fotosAlbum}
      fotoCasalUrl={midia.fotoCasalUrl}
    />
  );
}
