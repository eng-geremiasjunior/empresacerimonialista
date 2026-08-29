import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { publicBase } from "@/lib/app-url";
import { assinarFotosDoAlbum } from "@/lib/supabase/assinar-midia-convite";
import { TopoInterno } from "@/components/portal/TopoInterno";
import {
  EditorSiteCasal,
  type FotoModeracao,
  type MusicaModeracao,
  type RecadoModeracao,
} from "@/components/portal/EditorSiteCasal";

export const dynamic = "force-dynamic";

// O convite pelo lado do casal: o que eles escrevem, como fica e o que
// chega durante a festa. O que é profissional (como chegar, hospedagem,
// endereço, publicação) fica com a cerimonialista.

export default async function PortalSitePage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const supabase = createClient();
  const [{ data: site }, { data: ev }, { data: fotosRaw }, { data: musicas }, { data: recados }] =
    await Promise.all([
      supabase
        .from("evento_site")
        .select(
          "mensagem, historia, historia_titulo, dress_code, dress_code_titulo, cor_acento, cor_tinta, cor_fundo, presentes_texto, pix_chave, pix_titular, presentes_link, publicado, slug, album_aberto, playlist_aberta, recados_aberto"
        )
        .eq("event_id", evento.id)
        .maybeSingle(),
      supabase.from("events").select("rsvp_hash").eq("id", evento.id).maybeSingle(),
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
  const linhas = (fotosRaw ?? []) as {
    id: string;
    storage_path: string;
    autor: string | null;
    oculta: boolean;
  }[];
  const urls = await assinarFotosDoAlbum(linhas.map((f) => f.storage_path));
  const fotos: FotoModeracao[] = linhas
    .map((f) => ({
      id: f.id,
      url: urls.get(f.storage_path) ?? "",
      autor: f.autor,
      oculta: f.oculta,
    }))
    .filter((f) => f.url);

  const urlSite = site?.publicado
    ? site.slug
      ? `${publicBase()}/c/${site.slug}`
      : ev?.rsvp_hash
        ? `${publicBase()}/confirmar/evento/${ev.rsvp_hash}`
        : null
    : null;

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Convite"
        apoio="A página que os convidados abrem. Esta parte é de vocês — sua cerimonialista publica quando estiver pronto."
      />
      <EditorSiteCasal
        eventoId={evento.id}
        inicial={{
          mensagem: site?.mensagem ?? "",
          historia: site?.historia ?? "",
          dressCode: site?.dress_code ?? "",
        }}
        convite={{
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
        blocos={{
          album: site?.album_aberto === true,
          playlist: site?.playlist_aberta === true,
          recados: site?.recados_aberto === true,
        }}
        publicado={site?.publicado === true}
        urlSite={urlSite}
        fotos={fotos}
        musicas={(musicas ?? []) as MusicaModeracao[]}
        recados={(recados ?? []) as RecadoModeracao[]}
      />
    </div>
  );
}
