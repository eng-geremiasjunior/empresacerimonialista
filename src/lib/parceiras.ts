import "server-only";
import { createClient } from "@supabase/supabase-js";

// As parceiras (183, site navegável fase 3, 27/09/2026): quem ensina
// cerimonial se candidata em /parceiras; a aprovada ganha o link
// /p/<slug>, que marca utm_source=parceira&utm_campaign=<slug> — e a
// origem do clique (152) conta as contas que chegam por ele.

export const ENSINA = {
  curso: "Curso",
  mentoria: "Mentoria",
  conteudo: "Conteúdo para colegas",
  outro: "Outro",
} as const;
export type Ensina = keyof typeof ENSINA;
export const ehEnsina = (v: string): v is Ensina => v in ENSINA;

/** A marca que o link da parceira põe na URL — e que o painel procura. */
export const UTM_DA_PARCEIRA = "parceira";

export function servicoParceiras() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: {
      fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }),
    },
  });
}

/** "@Ana.Cerimonial_" → "ana-cerimonial" (o trecho do link /p/…). */
export function slugDoInstagram(instagram: string): string {
  const base = instagram
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return base.length >= 2 ? base : `parceira-${base || "x"}`;
}

/** O link existe e é de uma parceira aprovada? */
export async function parceiraAprovada(slug: string): Promise<boolean> {
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return false;
  const { data } = await servicoParceiras()
    .from("parceiras")
    .select("id")
    .eq("slug", slug)
    .eq("status", "aprovada")
    .maybeSingle();
  return Boolean(data);
}
