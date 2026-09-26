import "server-only";

// Paleta e estilo do portal v2 (181): o guia de estilo de sempre (096),
// as paletas da cerimonialista e as referências da família (092).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CorDaPaleta = { nome: string; hex: string };
export type PaletaDaCerimonialista = { id: string; nome: string; sensacao: string | null; cores: CorDaPaleta[] };
export type Referencia = { id: string; path: string; url: string | null; assunto: string; legenda: string | null; autor: string | null };

export type PaletaDoPortal = {
  guia: { id: string; situacao: "montagem" | "aguardando" | "aprovado" | "alterado"; sensacao: string | null; aprovadoNome: string | null } | null;
  cores: CorDaPaleta[];
  paletas: PaletaDaCerimonialista[];
  referencias: Referencia[];
};

export const getPaletaDoPortal = cache(async (eventId: string): Promise<PaletaDoPortal> => {
  const supabase = createClient();
  const [pal, refs] = await Promise.all([
    supabase.rpc("portal_paleta", { p_event_id: eventId }),
    supabase
      .from("evento_inspiracao")
      .select("id, storage_path, assunto, legenda, autor, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  const d = (pal.error ? null : pal.data) as {
    guia: { id: string; situacao: NonNullable<PaletaDoPortal["guia"]>["situacao"]; sensacao: string | null; aprovado_nome: string | null } | null;
    cores: CorDaPaleta[];
    paletas: PaletaDaCerimonialista[];
  } | null;

  const linhas = (refs.data ?? []) as { id: string; storage_path: string; assunto: string | null; legenda: string | null; autor: string | null }[];
  const urls = new Map<string, string>();
  if (linhas.length) {
    const { data: assinadas } = await supabase.storage.from("inspiracoes").createSignedUrls(linhas.map((l) => l.storage_path), 60 * 60);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);
  }

  return {
    guia: d?.guia ? { id: d.guia.id, situacao: d.guia.situacao, sensacao: d.guia.sensacao, aprovadoNome: d.guia.aprovado_nome } : null,
    cores: d?.cores ?? [],
    paletas: (d?.paletas ?? []).filter((p) => p.cores.length > 0),
    referencias: linhas.map((l) => ({ id: l.id, path: l.storage_path, url: urls.get(l.storage_path) ?? null, assunto: l.assunto ?? "geral", legenda: l.legenda, autor: l.autor })),
  };
});
