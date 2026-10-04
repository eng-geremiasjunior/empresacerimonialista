import { cache } from "react";
import type { Metadata, Viewport } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { clienteAnonimoPublico } from "@/lib/supabase/anon-publico";
import { anfitrioesDoConvite } from "@/lib/anfitrioes-do-convite";
import { fotoDoCatalogo } from "@/lib/catalogo-de-presentes";
import { convitePara, dataLonga, nomeOuConvite } from "@/lib/rsvp-convite";
import { nomesDoSite } from "@/lib/site-conteudo";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { ListaPublica, type ItemDaVitrine } from "@/components/lista-presentes/ListaPublica";
import { temaDaLista } from "@/components/lista-presentes/tema";
import { chavePublicaDaLista } from "@/lib/pagarme-lista";

export const dynamic = "force-dynamic";

// A lista de presentes do casal: /c/<endereço>/presentes (o next.config
// reescreve para cá). Só existe com o site no ar e a lista publicada
// (lista_publica, 197): a RPC decide, e devolve só o que a página desenha.

type ListaDaRpc = {
  mensagem: string | null;
  taxa_do_casal: boolean;
  pode_pagar: boolean;
  itens: {
    id: string;
    codigo: string | null;
    categoria: string;
    titulo: string;
    valor_centavos: number;
    quantidade: number;
    comprados: number;
  }[];
};

const carregar = cache(async (slug: string) => {
  const db = clienteAnonimoPublico();
  const [{ data: siteBruto }, { data: listaBruta }] = await Promise.all([
    db.rpc("site_publico", { p_ref: slug }),
    db.rpc("lista_publica", { p_ref: slug }),
  ]);
  const site = (siteBruto as SitePublico | null) ?? null;
  if (!site) return null;
  const anfitrioes = await anfitrioesDoConvite(site.evento.anfitrioes, { siteRef: slug });
  return { site: { ...site, evento: { ...site.evento, anfitrioes } }, lista: (listaBruta as ListaDaRpc | null) ?? null };
});

/** "Ana & Bruno" no título; "Ana e Bruno" nas frases. */
function nomesDaLista(site: SitePublico): { titulo: string; frase: string; plural: boolean } {
  const { nome1, nome2 } = nomesDoSite(site);
  if (nome1 && nome2) return { titulo: `${nome1} & ${nome2}`, frase: `${nome1} e ${nome2}`, plural: true };
  const um = nome1 || nome2;
  if (um) return { titulo: um, frase: um, plural: false };
  const evento = nomeOuConvite(convitePara(site.evento.tipo), site.evento.anfitrioes);
  return { titulo: evento, frase: "os anfitriões", plural: true };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await carregar(params.slug);
  if (!c?.lista) return { title: "Lista de presentes", robots: { index: false, follow: false } };
  const n = nomesDaLista(c.site);
  return {
    title: `Lista de presentes · ${n.titulo}`,
    description: `Escolha um presente para ${n.frase}.`,
    robots: { index: false, follow: false },
    openGraph: { title: `Lista de presentes · ${n.titulo}`, description: `Escolha um presente para ${n.frase}.` },
  };
}

export async function generateViewport({ params }: { params: { slug: string } }): Promise<Viewport> {
  const c = await carregar(params.slug);
  const fundo = c ? temaDaLista(c.site)["--lp-fundo"] : undefined;
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: fundo && /^#[0-9a-f]{6}$/i.test(fundo) ? fundo : undefined,
  };
}

const inteiro = (v: unknown, min: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min ? n : min;
};

export default async function ListaDePresentesPage({ params }: { params: { slug: string } }) {
  const c = await carregar(params.slug);
  if (!c) notFound();
  const { site, lista } = c;
  // endereço aposentado: o link que já circulou continua abrindo
  if (site.ref_e_slug_antigo && site.slug_atual) permanentRedirect(`/c/${site.slug_atual}/presentes`);
  const slug = site.slug_atual ?? params.slug;
  // lista fora do ar: quem abriu vai para o site
  if (!lista) redirect(`/c/${slug}`);

  const itens: ItemDaVitrine[] = (Array.isArray(lista.itens) ? lista.itens : []).map((i) => ({
    id: String(i.id),
    categoria: String(i.categoria ?? ""),
    titulo: String(i.titulo ?? ""),
    valorCentavos: inteiro(i.valor_centavos, 0),
    quantidade: inteiro(i.quantidade, 1),
    comprados: inteiro(i.comprados, 0),
    foto: fotoDoCatalogo(i.codigo),
  }));
  const tema = temaDaLista(site);
  const n = nomesDaLista(site);

  return (
    <>
      {/* o fundo do site já no HTML: sem clarão branco nem ao puxar a página */}
      <style>{`html,body{background:${tema["--lp-fundo"]}}`}</style>
      <ListaPublica
        slug={slug}
        nomes={n.titulo}
        quemRecebe={n.frase}
        plural={n.plural}
        dataLegivel={/^\d{4}-\d{2}-\d{2}/.test(site.evento.data) ? dataLonga(site.evento.data) : null}
        mensagem={lista.mensagem?.trim() || null}
        taxaDoCasal={!!lista.taxa_do_casal}
        podePagar={!!lista.pode_pagar}
        chaveDoCartao={chavePublicaDaLista()}
        itens={itens}
        estilo={tema}
      />
    </>
  );
}
