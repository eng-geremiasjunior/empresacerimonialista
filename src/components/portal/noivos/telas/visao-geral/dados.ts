import "server-only";

// O que a Visão geral lê além dos carregadores do portal: o nível de quem
// está logado (189). Sem a 189 aplicada (ou para a equipe, que não tem
// linha em evento_acesso), null — e a tela trata como o casal, que vê e
// faz tudo, como era antes da 189.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// 'vitrine' (195): o visitante do catálogo vivo — vê o que o casal vê e não grava
export type NivelNoPortal = "casal" | "familia" | "aprova" | "leitura" | "padrinho" | "vitrine";

const NIVEIS: readonly string[] = ["casal", "familia", "aprova", "leitura", "padrinho", "vitrine"];

export const getNivelNoPortal = cache(async (eventId: string): Promise<NivelNoPortal | null> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_meu_nivel", { p_event_id: eventId });
  if (error || typeof data !== "string" || !NIVEIS.includes(data)) return null;
  return data as NivelNoPortal;
});
