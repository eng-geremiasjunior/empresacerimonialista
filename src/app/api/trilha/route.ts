// A busca da trilha (portal v2, 180): o catálogo da Apple (iTunes Search,
// com o trecho de 30 s) e o título de um link colado (oEmbed do Spotify e
// do YouTube). Pelo servidor: o navegador não depende de CORS nem vê
// nada além do que a tela precisa. Só para quem está logado.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { linkAceito } from "@/lib/trilha";

export const dynamic = "force-dynamic";

type ItemItunes = {
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  trackViewUrl?: string;
};

export async function GET(req: NextRequest) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ erro: "sem_sessao" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  const link = req.nextUrl.searchParams.get("link")?.trim().slice(0, 300);

  if (q) {
    try {
      const r = await fetch(
        `https://itunes.apple.com/search?media=music&entity=song&limit=8&country=BR&term=${encodeURIComponent(q)}`,
        { next: { revalidate: 86400 } }
      );
      const j = (await r.json()) as { results?: ItemItunes[] };
      const itens = (j.results ?? [])
        .filter((x) => x.trackName)
        .map((x) => ({
          titulo: x.trackName!,
          artista: x.artistName ?? null,
          capa: x.artworkUrl100?.replace("100x100bb", "200x200bb") ?? null,
          preview: x.previewUrl ?? null,
          duracao: x.trackTimeMillis ? Math.round(x.trackTimeMillis / 1000) : null,
          link: x.trackViewUrl?.split("?")[0] ?? null,
        }));
      return NextResponse.json({ itens });
    } catch {
      return NextResponse.json({ itens: [], erro: "fora_do_ar" });
    }
  }

  if (link) {
    if (!linkAceito(link)) return NextResponse.json({ erro: "link" }, { status: 400 });
    const oembed = /spotify\.com/.test(link)
      ? `https://open.spotify.com/oembed?url=${encodeURIComponent(link)}`
      : /youtu/.test(link)
        ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link)}`
        : null;
    if (!oembed) return NextResponse.json({ titulo: null });
    try {
      const r = await fetch(oembed, { next: { revalidate: 86400 } });
      const j = (await r.json()) as { title?: string; author_name?: string };
      return NextResponse.json({ titulo: j.title?.slice(0, 160) ?? null, artista: j.author_name?.slice(0, 160) ?? null });
    } catch {
      return NextResponse.json({ titulo: null });
    }
  }

  return NextResponse.json({ erro: "sem_busca" }, { status: 400 });
}
