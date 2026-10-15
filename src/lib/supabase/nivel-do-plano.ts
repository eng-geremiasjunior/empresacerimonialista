import "server-only";

// O nível do plano da conta (nivel_do_plano, 203), para as travas por
// recurso (src/lib/recursos-do-plano.ts). Duas portas:
//   · meuNivelDoPlano — a sessão de quem está no sistema;
//   · nivelDoPlanoDaEmpresa — as páginas públicas (o convidado, a cliente
//     da proposta), que não têm sessão: chave de serviço, aqui dentro.
// Erro de leitura devolve null, e `pode(null, …)` não tranca.

import { cache } from "react";
import { createClient as criarSupabase } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { ehNivelDoPlano, pode, type NivelDoPlano, type Recurso } from "@/lib/recursos-do-plano";

function servico() {
  return criarSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

export const meuNivelDoPlano = cache(async (): Promise<NivelDoPlano | null> => {
  try {
    const { empresaId } = await getMeuCargo();
    if (!empresaId) return null;
    const { data, error } = await createClient().rpc("nivel_do_plano", { p_empresa_id: empresaId });
    return !error && ehNivelDoPlano(data) ? data : null;
  } catch {
    return null;
  }
});

export const nivelDoPlanoDaEmpresa = cache(async (empresaId: string | null | undefined): Promise<NivelDoPlano | null> => {
  if (!empresaId) return null;
  try {
    const { data, error } = await servico().rpc("nivel_do_plano", { p_empresa_id: empresaId });
    return !error && ehNivelDoPlano(data) ? data : null;
  } catch {
    return null;
  }
});

/** O nível do plano da empresa dona do evento (as páginas públicas). */
export const nivelDoPlanoDoEvento = cache(async (eventoId: string | null | undefined): Promise<NivelDoPlano | null> => {
  if (!eventoId) return null;
  try {
    const { data } = await servico().from("events").select("empresa_id").eq("id", eventoId).maybeSingle();
    return nivelDoPlanoDaEmpresa((data as { empresa_id?: string | null } | null)?.empresa_id ?? null);
  } catch {
    return null;
  }
});

/** Quem está no sistema pode usar o recurso? (Na dúvida, pode.) */
export async function possoUsar(recurso: Recurso): Promise<boolean> {
  return pode(await meuNivelDoPlano(), recurso);
}
