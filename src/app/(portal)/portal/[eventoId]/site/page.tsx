import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { publicBase } from "@/lib/app-url";
import { assinarFotosDoAlbum, assinarMidiaDoConvite } from "@/lib/supabase/assinar-midia-convite";
import { tem } from "@/lib/capacidades";
import { qrSvg } from "@/lib/qr";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { NossoSite, type EstadoDaRevisao } from "@/components/portal/NossoSite";
import type { FotoModeracao, MusicaModeracao, RecadoModeracao } from "@/components/portal/EditorSiteCasal";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { TelaMantida } from "@/components/portal/noivos/telas/mantidas/TelaMantida";

export const dynamic = "force-dynamic";

// "Nosso site" (30/09/2026, migrações 185 e 186): a família monta o site
// por blocos e publica; cada publicação passa pela revisão do dono do
// sistema antes de ir ao ar. O que é da cerimonialista (o local, a
// hospedagem do espaço) vem do evento, ao vivo.

type Previa = SitePublico & {
  revisao: EstadoDaRevisao & { retirado?: boolean };
  publicado: boolean;
  publicado_em: string | null;
};

export default async function PortalSitePage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  if (!tem(evento.tipo, "siteDoEvento")) notFound();

  const supabase = createClient();

  // a prévia monta a página com o que está salvo agora; site que ainda
  // não existe nasce vazio aqui (a função só cria a linha)
  let { data: previaBruta } = await supabase.rpc("portal_previa_site", { p_event_id: evento.id });
  if (!previaBruta) {
    await supabase.rpc("portal_definir_blocos", {
      p_event_id: evento.id,
      p_album: null,
      p_playlist: null,
      p_recados: null,
    });
    ({ data: previaBruta } = await supabase.rpc("portal_previa_site", { p_event_id: evento.id }));
  }
  const previa = previaBruta as Previa | null;
  if (!previa) notFound();

  const [{ data: site }, { data: fotosRaw }, { data: musicas }, { data: recados }] = await Promise.all([
    supabase
      .from("evento_site")
      .select(
        "mensagem, historia, historia_titulo, dress_code, dress_code_titulo, cor_acento, cor_tinta, cor_fundo, presentes_texto, pix_chave, pix_titular, presentes_link, slug, slug_congelado_em, album_aberto, playlist_aberta, recados_aberto"
      )
      .eq("event_id", evento.id)
      .maybeSingle(),
    supabase
      .from("evento_album_foto")
      .select("id, storage_path, autor, oculta")
      .eq("event_id", evento.id)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("evento_musica")
      .select("id, titulo, artista, sugerida_por, estado")
      .eq("event_id", evento.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("evento_recado")
      .select("id, nome, texto, oculto")
      .eq("event_id", evento.id)
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  // as fotos moram em bucket privado — o servidor assina para a tela
  const linhas = (fotosRaw ?? []) as { id: string; storage_path: string; autor: string | null; oculta: boolean }[];
  const urls = await assinarFotosDoAlbum(linhas.map((f) => f.storage_path));
  const fotos: FotoModeracao[] = linhas
    .map((f) => ({ id: f.id, url: urls.get(f.storage_path) ?? "", autor: f.autor, oculta: f.oculta }))
    .filter((f) => f.url);
  const midia = await assinarMidiaDoConvite(previa);

  const base = publicBase();
  const urlNoAr = previa.publicado && site?.slug ? `${base}/c/${site.slug}` : null;
  const qr = urlNoAr ? await qrSvg(urlNoAr) : null;

  // O conteúdo é o mesmo nos dois portais; só o cabeçalho muda. A carga
  // acima (que cria a linha do site quando ela ainda não existe) é uma só.
  const conteudo = (
    <NossoSite
      eventoId={evento.id}
      tipoEvento={evento.tipo}
      previa={previa}
      revisao={{
        status: previa.revisao.status,
        enviada_em: previa.revisao.enviada_em,
        motivo: previa.revisao.motivo,
        revisado_em: previa.revisao.revisado_em,
        retirado: previa.revisao.retirado === true,
      }}
      publicado={previa.publicado}
      publicadoEm={previa.publicado_em}
      fotosAlbum={midia.fotosAlbum}
      fotoCasalUrl={midia.fotoCasalUrl}
      textosIniciais={{
        mensagem: site?.mensagem ?? "",
        historia: site?.historia ?? "",
        dressCode: site?.dress_code ?? "",
      }}
      lookInicial={{
        historiaTitulo: site?.historia_titulo ?? "",
        dressCodeTitulo: site?.dress_code_titulo ?? "",
        corAcento: site?.cor_acento ?? "",
        corTinta: site?.cor_tinta ?? "",
        corFundo: site?.cor_fundo ?? "",
        presentesTexto: site?.presentes_texto ?? "",
        pixChave: site?.pix_chave ?? "",
        pixTitular: site?.pix_titular ?? "",
        presentesLink: site?.presentes_link ?? "",
      }}
      blocosDaFesta={{
        album: site?.album_aberto === true,
        playlist: site?.playlist_aberta === true,
        recados: site?.recados_aberto === true,
      }}
      endereco={{
        slug: site?.slug ?? null,
        congelado: !!site?.slug_congelado_em || previa.publicado,
        base,
      }}
      urlNoAr={urlNoAr}
      qrSvg={qr}
      fotos={fotos}
      musicas={(musicas ?? []) as MusicaModeracao[]}
      recados={(recados ?? []) as RecadoModeracao[]}
    />
  );

  // O portal dos noivos (desenho v4): o site de sempre com o cabeçalho
  // novo. O convite animado (o que chega no WhatsApp) é outra tela: /convite.
  if (usaPortalNoivos(evento.tipo)) {
    return (
      <TelaMantida eyebrow="Site" titulo="Site do casamento" sub="Onde os convidados confirmam presença.">
        {conteudo}
      </TelaMantida>
    );
  }

  return (
    <div className="portal-tela">
      <TopoInterno eventoId={evento.id} titulo="Nosso site" apoio="O site que os convidados abrem." />
      {conteudo}
    </div>
  );
}
