import "server-only";

// O que a tela Presentes lê: a parte de presentes do site do casamento
// (evento_site, 128), pela sessão da família — a RLS do site decide se a
// linha volta. O endereço público só existe com o site publicado.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { publicBase } from "@/lib/app-url";
import { lojaDoLink, type PresentesDoCasal } from "./montar";

export const getPresentesDoCasal = cache(async (eventId: string): Promise<PresentesDoCasal> => {
  const { data, error } = await createClient()
    .from("evento_site")
    .select("pix_chave, pix_titular, presentes_link, slug, publicado")
    .eq("event_id", eventId)
    .maybeSingle();
  const s = (error ? null : data) as {
    pix_chave: string | null;
    pix_titular: string | null;
    presentes_link: string | null;
    slug: string | null;
    publicado: boolean | null;
  } | null;
  const limpo = (v: string | null | undefined) => (v ?? "").trim() || null;
  const loja = lojaDoLink(s?.presentes_link);
  const slug = limpo(s?.slug);
  return {
    pixChave: limpo(s?.pix_chave),
    pixTitular: limpo(s?.pix_titular),
    lojas: loja ? [loja] : [],
    linkDoSite: s?.publicado === true && slug ? `${publicBase()}/c/${slug}` : null,
  };
});
