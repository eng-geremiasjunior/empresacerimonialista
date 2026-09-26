import "server-only";

// A trilha da noite (180), lida pela sessão da família (RLS da 180).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { MusicaEscolhida } from "@/lib/trilha";

export type EscolhaDaTrilha = MusicaEscolhida & { porNome: string | null; em: string };

export const getTrilha = cache(async (eventId: string): Promise<Record<string, EscolhaDaTrilha>> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_trilha")
    .select("momento, titulo, artista, capa_url, preview_url, duracao_s, link, escolhido_por_nome, updated_at")
    .eq("event_id", eventId);
  if (error || !data) return {};
  const mapa: Record<string, EscolhaDaTrilha> = {};
  for (const t of data as Record<string, unknown>[]) {
    mapa[t.momento as string] = {
      titulo: t.titulo as string,
      artista: (t.artista as string) ?? null,
      capa: (t.capa_url as string) ?? null,
      preview: (t.preview_url as string) ?? null,
      duracao: (t.duracao_s as number) ?? null,
      link: (t.link as string) ?? null,
      porNome: (t.escolhido_por_nome as string) ?? null,
      em: t.updated_at as string,
    };
  }
  return mapa;
});
