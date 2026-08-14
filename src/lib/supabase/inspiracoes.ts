// O mural de inspirações: as imagens que a cliente junta para explicar o
// que ela quer, quando a palavra não dá conta.
//
// Bucket PRIVADO. Nenhuma imagem tem endereço fixo — a leitura sai por
// URL assinada de dez minutos, gerada a cada visita.
//
// SÓ SERVIDOR: usa next/headers. Assuntos e tipos moram em
// inspiracoes-shared, que componentes "use client" podem importar.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Inspiracao } from "@/lib/inspiracoes-shared";

export type { Assunto, Inspiracao } from "@/lib/inspiracoes-shared";
export { ASSUNTOS, ASSUNTO_ROTULO } from "@/lib/inspiracoes-shared";

export const getInspiracoes = cache(
  async (eventId: string): Promise<Inspiracao[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("evento_inspiracao")
      .select("id, assunto, legenda, storage_path, origem, ordem, created_at")
      .eq("event_id", eventId)
      .order("assunto")
      .order("created_at", { ascending: false });

    const linhas = (data ?? []) as Record<string, unknown>[];
    if (linhas.length === 0) return [];

    const { data: assinadas } = await supabase.storage
      .from("inspiracoes")
      .createSignedUrls(
        linhas.map((l) => l.storage_path as string),
        60 * 10
      );

    const urlPorPath = new Map<string, string>();
    for (const a of assinadas ?? []) {
      if (a.path && a.signedUrl) urlPorPath.set(a.path, a.signedUrl);
    }

    return linhas.map((l) => ({
      id: l.id as string,
      assunto: l.assunto as string,
      legenda: (l.legenda as string) ?? null,
      storagePath: l.storage_path as string,
      url: urlPorPath.get(l.storage_path as string) ?? null,
      origem: l.origem as "cliente" | "equipe",
    }));
  }
);
