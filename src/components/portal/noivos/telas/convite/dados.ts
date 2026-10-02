import "server-only";

// O que a tela Convite precisa, lido pela sessão da família (ou da equipe):
// o convite salvo (portal_convite, 196), o site como está agora (a prévia:
// nomes, data, local) e, com o site no ar, as fotos que aparecem nele — só
// delas a noiva escolhe a do convite (já passaram pela revisão do dono).

import { createClient } from "@/lib/supabase/server";
import { publicBase } from "@/lib/app-url";
import { assinarMidiaDoSite } from "@/lib/supabase/assinar-midia-convite";
import { estruturaEfetiva } from "@/lib/site-blocos";
import { fotosDaEstrutura, nomesDoSite, soOQueAparece } from "@/lib/site-conteudo";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { dataLonga } from "@/lib/rsvp-convite";
import { fotoDaCapa, horaCurta, type ConviteSalvo } from "@/components/convite-digital/do-site";
import type { ModoDoNome } from "@/components/convite-digital/catalogo";

export type FotoParaEscolher = { caminho: string; url: string };

export type DadosDaTelaConvite = {
  eventoId: string;
  salvo: ConviteSalvo | null;
  /** a 196 ainda não foi aplicada: a tela avisa e não salva */
  semMigracao: boolean;
  podeSalvar: boolean;
  nomes: { nome1: string; nome2: string; modo: ModoDoNome };
  /** "sábado, 31 de outubro de 2026" */
  dataLegivel: string;
  data: string;
  horaDoEvento: string | null;
  doEvento: { local: string; endereco: string; cidade: string };
  site: { publicado: boolean; slug: string | null };
  /** as fotos do site no ar, a da capa primeiro */
  fotos: FotoParaEscolher[];
  fotoDaCapa: string | null;
  /** o endereço que vai para os convidados (só com o site no ar) */
  link: string | null;
};

const MODO_DA_FORMA = { nomes: "Nomes", iniciais: "Iniciais", "iniciais-nomes": "Iniciais + nomes" } as const;

type Previa = SitePublico & { publicado: boolean };

export async function getConviteDoCasal(eventoId: string): Promise<DadosDaTelaConvite | null> {
  const supabase = createClient();
  const [{ data: previaBruta }, conviteR, { data: nivel }] = await Promise.all([
    supabase.rpc("portal_previa_site", { p_event_id: eventoId }),
    supabase.rpc("portal_convite", { p_event_id: eventoId }),
    supabase.rpc("portal_meu_nivel", { p_event_id: eventoId }),
  ]);
  const previa = (previaBruta as Previa | null) ?? null;
  if (!previa) return null;
  const semMigracao = !!conviteR.error && /portal_convite/.test(conviteR.error.message ?? "");
  const salvo = (conviteR.data as ConviteSalvo | null) ?? null;

  const slug = previa.slug_atual ?? null;
  const publicado = previa.publicado === true && !!slug;

  // as fotos que podem ir no convite: as que aparecem no site NO AR
  let fotos: FotoParaEscolher[] = [];
  let capa: string | null = null;
  if (publicado) {
    const { data: noAr } = await supabase.rpc("site_publico", { p_ref: slug });
    const site = noAr ? soOQueAparece(noAr as SitePublico) : null;
    if (site) {
      const urls = await assinarMidiaDoSite(site, { soVisiveis: true });
      const ordem = fotosDaEstrutura(estruturaEfetiva(site.site?.estrutura));
      capa = fotoDaCapa(site);
      const vistos = new Set<string>();
      for (const c of [capa, ...ordem]) {
        if (!c || vistos.has(c) || !urls[c]) continue;
        vistos.add(c);
        fotos.push({ caminho: c, url: urls[c] });
      }
      fotos = fotos.slice(0, 40);
      if (capa && !urls[capa]) capa = null;
    }
  }

  const nomes = nomesDoSite(previa);
  return {
    eventoId,
    salvo,
    semMigracao,
    // só o casal salva (portal_salvar_convite, 196 — como o site desde a
    // 186, a equipe não escreve); o banco decide, aqui só some o botão
    podeSalvar: nivel === "casal",
    nomes: { nome1: nomes.nome1, nome2: nomes.nome2, modo: MODO_DA_FORMA[nomes.forma] },
    dataLegivel: dataLonga(previa.evento.data),
    data: previa.evento.data,
    horaDoEvento: horaCurta(previa.evento.hora),
    doEvento: {
      local: previa.evento.local ?? "",
      endereco: previa.evento.endereco ?? "",
      cidade: previa.evento.cidade ?? "",
    },
    site: { publicado, slug },
    fotos,
    fotoDaCapa: capa,
    link: publicado ? `${publicBase()}/c/${slug}/convite` : null,
  };
}
