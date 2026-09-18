// A página pública da cerimonialista, pelo endereço dela.
//
// Três caminhos, decididos aqui:
//   1. publicada            → a leitura pública (pagina_publica, chave
//                             anônima); endereço antigo redireciona PARA
//                             SEMPRE ao atual, porque o link já circula.
//   2. não publicada, aberta pela dona → prévia, lida com a sessão dela
//                             (a RLS só deixa a proprietária ler a página),
//                             com a faixa de rascunho e sem contar visita.
//   3. qualquer outra coisa → "não encontrada", igual para endereço que
//                             nunca existiu e para página fora do ar.
//
// Quem é da casa não conta visita: a mesma régua da proposta (155).

import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { clienteAnonimoPublico } from "@/lib/supabase/anon-publico";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-url";
import { PaginaCerimonialista } from "@/components/comercial/pagina/PaginaCerimonialista";
import { PaginaCapitulos } from "@/components/comercial/pagina/capitulos/PaginaCapitulos";
import { PaginaCuradoria } from "@/components/comercial/pagina/curadoria/PaginaCuradoria";
import {
  modeloDaVitrine,
  type PaginaPublica,
  type ServicoDaPagina,
} from "@/lib/comercial/pagina-publica";
import type { EventType } from "@/lib/types";

export const dynamic = "force-dynamic";

const normalizar = (s: string) => decodeURIComponent(s ?? "").trim().toLowerCase();

const carregarPublica = cache(async (ref: string): Promise<PaginaPublica | null> => {
  const { data } = await clienteAnonimoPublico().rpc("pagina_publica", { p_ref: ref });
  return (data as PaginaPublica | null) ?? null;
});

/** A página ainda fora do ar, só para a proprietária. Mesma forma da pública. */
const carregarPrevia = cache(async (ref: string): Promise<PaginaPublica | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: endereco } = await supabase
    .from("empresa_pagina_slug")
    .select("empresa_id")
    .eq("slug", ref)
    .maybeSingle();
  const empresaId = (endereco as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return null;

  // o retrato e a paleta são da 165 reaplicada em 18/09/2026: sem as
  // colunas, a prévia continua de pé, só sem eles
  const COLUNAS =
    "titulo, posicionamento, para_quem, cidade, tipos_atendidos, servicos, motivos, whatsapp, instagram, pixel_meta, modelo";
  const lerPagina = async () => {
    const ler = (extras: string) =>
      supabase.from("empresa_pagina").select(`${COLUNAS}${extras}`).eq("empresa_id", empresaId).maybeSingle();
    const tudo = await ler(", retrato_url, paleta");
    if (!tudo.error) return tudo;
    const comRetrato = await ler(", retrato_url");
    if (!comRetrato.error) return comRetrato;
    return ler("");
  };

  const [pagRes, empRes, fotosRes, depRes, atualRes] = await Promise.all([
    lerPagina(),
    supabase.from("empresas").select("nome, logo_url").eq("id", empresaId).maybeSingle(),
    supabase
      .from("portfolio_fotos")
      .select("url, legenda, tipo_evento")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .eq("na_pagina", true)
      .order("tipo_evento")
      .order("ordem")
      .order("created_at")
      .limit(24),
    supabase
      .from("empresa_depoimentos")
      .select("texto, autor, contexto, tipo_evento")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .eq("na_pagina", true)
      .order("ordem")
      .order("created_at")
      .limit(12),
    supabase
      .from("empresa_pagina_slug")
      .select("slug")
      .eq("empresa_id", empresaId)
      .eq("atual", true)
      .maybeSingle(),
  ]);

  // a RLS só entrega a página à proprietária: coordenadora e equipe caem aqui
  const pag = pagRes.data as {
    titulo: string | null;
    posicionamento: string | null;
    para_quem: string | null;
    cidade: string | null;
    tipos_atendidos: EventType[] | null;
    servicos: ServicoDaPagina[] | null;
    motivos: string[] | null;
    whatsapp: string | null;
    instagram: string | null;
    pixel_meta: string | null;
    modelo: string | null;
    retrato_url?: string | null;
    paleta?: string | null;
  } | null;
  const atual = (atualRes.data as { slug?: string } | null)?.slug;
  if (!pag || !atual) return null;

  return {
    slug_atual: atual,
    por_slug_antigo: atual !== ref,
    nome_empresa: (empRes.data as { nome?: string } | null)?.nome ?? "",
    logo_url: (empRes.data as { logo_url?: string | null } | null)?.logo_url ?? null,
    titulo: pag.titulo,
    posicionamento: pag.posicionamento,
    para_quem: pag.para_quem,
    cidade: pag.cidade,
    tipos_atendidos: pag.tipos_atendidos ?? [],
    servicos: pag.servicos ?? [],
    motivos: pag.motivos ?? [],
    whatsapp: pag.whatsapp,
    instagram: pag.instagram,
    pixel_meta: pag.pixel_meta,
    modelo: pag.modelo,
    retrato_url: pag.retrato_url ?? null,
    paleta: pag.paleta ?? null,
    fotos: ((fotosRes.data ?? []) as PaginaPublica["fotos"]),
    depoimentos: ((depRes.data ?? []) as PaginaPublica["depoimentos"]),
  };
});

/** O desenho que ela escolheu; os dados são os mesmos em todos. */
function Vitrine(props: { pagina: PaginaPublica; contar: boolean; previa: boolean }) {
  const modelo = modeloDaVitrine(props.pagina.modelo);
  if (modelo === "curadoria") return <PaginaCuradoria {...props} />;
  if (modelo === "capitulos") return <PaginaCapitulos {...props} />;
  return <PaginaCerimonialista {...props} />;
}

/** Quem abre é da empresa dona do endereço? (a RLS responde) */
async function ehDaCasa(ref: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("empresa_pagina_slug")
    .select("slug")
    .eq("slug", ref)
    .maybeSingle();
  return Boolean(data);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const p = await carregarPublica(normalizar(params.slug));
  if (!p) return { title: "Página não encontrada", robots: { index: false, follow: false } };

  const titulo = p.cidade ? `${p.nome_empresa} · ${p.cidade}` : p.nome_empresa;
  const descricao = (p.posicionamento || p.titulo || "").slice(0, 160) || undefined;
  const imagem = p.fotos[0]?.url ?? p.logo_url ?? undefined;
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `${appUrl()}/cerimonialista/${p.slug_atual}` },
    // a única página do sistema feita para ser achada
    robots: { index: true, follow: true },
    openGraph: {
      title: titulo,
      description: descricao,
      type: "website",
      images: imagem ? [imagem] : [],
    },
  };
}

export default async function PaginaPublicaPage({ params }: { params: { slug: string } }) {
  const ref = normalizar(params.slug);

  const publica = await carregarPublica(ref);
  if (publica) {
    if (publica.por_slug_antigo) {
      permanentRedirect(`/cerimonialista/${publica.slug_atual}`);
    }
    const casa = await ehDaCasa(ref);
    return <Vitrine pagina={publica} contar={!casa} previa={false} />;
  }

  const previa = await carregarPrevia(ref);
  if (!previa) notFound();
  // prévia por endereço antigo: leva ao atual, sem marcar como permanente
  if (previa.por_slug_antigo) redirect(`/cerimonialista/${previa.slug_atual}`);
  return <Vitrine pagina={previa} contar={false} previa />;
}
