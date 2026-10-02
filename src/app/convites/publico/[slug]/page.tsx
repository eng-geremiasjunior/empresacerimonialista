import { cache } from "react";
import type { Metadata, Viewport } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { ConviteAnimado } from "@/components/convite-digital/ConviteAnimado";
import { corDeFundo } from "@/components/convite-digital/fundos";
import {
  dadosDoConvite,
  fonteDoSalvo,
  fotoDaCapa,
  horaDoConvite,
  modeloDoSalvo,
  type ConviteSalvo,
} from "@/components/convite-digital/do-site";
import { assinarCaminhosDoSite } from "@/lib/supabase/assinar-midia-convite";
import { clienteAnonimoPublico } from "@/lib/supabase/anon-publico";
import { anfitrioesDoConvite } from "@/lib/anfitrioes-do-convite";
import { convitePara, nomeOuConvite, quandoLegivel } from "@/lib/rsvp-convite";
import { lerEstrutura } from "@/lib/site-blocos";
import { fotosDaEstrutura, soOQueAparece } from "@/lib/site-conteudo";
import { modeloDesenha, modeloDoTema } from "@/lib/site-modelos";
import type { SitePublico } from "@/lib/site-publico-tipos";

export const dynamic = "force-dynamic";

// O convite animado do casal: /c/<endereço>/convite (o next.config reescreve
// para cá, longe do layout e do CSS do site). Só existe com o site no ar e
// o convite salvo (convite_publico, 196). A foto é uma das que aparecem no
// site publicado — conferido aqui, que é quem assina a URL: a que saiu do
// site sai do convite junto.

const carregar = cache(async (slug: string) => {
  const db = clienteAnonimoPublico();
  const [{ data: siteBruto }, { data: conviteBruto }] = await Promise.all([
    db.rpc("site_publico", { p_ref: slug }),
    db.rpc("convite_publico", { p_ref: slug }),
  ]);
  const site = (siteBruto as SitePublico | null) ?? null;
  if (!site) return null;
  const anfitrioes = await anfitrioesDoConvite(site.evento.anfitrioes, { siteRef: slug });
  return {
    site: soOQueAparece({ ...site, evento: { ...site.evento, anfitrioes } }),
    salvo: (conviteBruto as ConviteSalvo | null) ?? null,
  };
});

/** As fotos que aparecem no site no ar (a mesma régua de assinarMidiaDoSite com soVisiveis). */
function fotosQueAparecem(site: SitePublico): Set<string> {
  const modelo = modeloDoTema(site.site?.tema ?? null);
  if (modelo === "convite") return new Set();
  const blocos = lerEstrutura(site.site?.estrutura).filter((b) => b.visivel !== false && modeloDesenha(modelo, b.tipo));
  return new Set(fotosDaEstrutura(blocos));
}

/**
 * A foto do convite: a escolhida, se aparece no site no ar; senão a da
 * capa; senão nenhuma. Assina SÓ essa, uma vez por visita (a página e os
 * metadados pedem a mesma).
 */
const fotoPublica = cache(async (slug: string) => {
  const c = await carregar(slug);
  if (!c?.salvo) return null;
  const aparecem = fotosQueAparecem(c.site);
  const caminho = [c.salvo.foto, fotoDaCapa(c.site)].find((x): x is string => !!x && aparecem.has(x));
  if (!caminho) return null;
  const urls = await assinarCaminhosDoSite([caminho]);
  return urls[caminho] ? { url: urls[caminho] } : null;
});

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await carregar(params.slug);
  if (!c?.salvo) return { title: "Convite", robots: { index: false, follow: false } };
  const { site, salvo } = c;
  const titulo = `${nomeOuConvite(convitePara(site.evento.tipo), site.evento.anfitrioes)} — ${quandoLegivel(
    site.evento.data,
    horaDoConvite(site, salvo)
  )}`;
  const foto = await fotoPublica(params.slug);
  return {
    title: titulo,
    description: "Você recebeu um convite.",
    robots: { index: false, follow: false },
    openGraph: { title: titulo, description: "Você recebeu um convite.", images: foto ? [foto.url] : [] },
  };
}

export async function generateViewport({ params }: { params: { slug: string } }): Promise<Viewport> {
  const c = await carregar(params.slug);
  const cor = c?.salvo ? corDeFundo(modeloDoSalvo(c.salvo), c.salvo.paleta) : undefined;
  return { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: cor };
}

export default async function ConvitePublico({ params }: { params: { slug: string } }) {
  const c = await carregar(params.slug);
  if (!c) notFound();
  const { site, salvo } = c;
  // endereço aposentado: o link que já circulou continua abrindo
  if (site.ref_e_slug_antigo && site.slug_atual) permanentRedirect(`/c/${site.slug_atual}/convite`);
  const slug = site.slug_atual ?? params.slug;
  // site no ar, convite ainda não feito: quem abriu vai para o site
  if (!salvo) redirect(`/c/${slug}`);

  const modelo = modeloDoSalvo(salvo);
  const foto = await fotoPublica(params.slug);
  return (
    <>
      {/* o fundo do desenho já no HTML: sem clarão branco até o convite montar */}
      <style>{`html,body{background:${corDeFundo(modelo, salvo.paleta)}}`}</style>
      <ConviteAnimado
        modelo={modelo}
        dados={dadosDoConvite(site, salvo, `/c/${slug}`)}
        fonte={fonteDoSalvo(salvo)}
        paleta={salvo.paleta}
        foto={foto}
      />
    </>
  );
}
