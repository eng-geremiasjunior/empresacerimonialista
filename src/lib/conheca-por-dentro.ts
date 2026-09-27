import "server-only";
import { createClient } from "@/lib/supabase/server";

// Quem vê o bloco "Conheça o eOrganizei por dentro" no painel (27/09/2026):
// a conta nova (criada nos últimos 7 dias — as de hoje incluídas) e quem
// ainda tem evento de exemplo. Na Ajuda ele aparece sempre.

const DIAS_DE_CONTA_NOVA = 7;

export async function conhecaPorDentroDaConta(empresaId: string | null): Promise<{
  mostrar: boolean;
  exemploCasamento: string | null;
}> {
  const supabase = createClient();
  const { data } = await supabase.from("events").select("id, type").eq("exemplo", true);
  const exemplos = (data ?? []) as { id: string; type: string | null }[];
  const exemploCasamento = exemplos.find((e) => e.type === "casamento")?.id ?? null;
  if (exemplos.length) return { mostrar: true, exemploCasamento };

  let nova = false;
  if (empresaId) {
    const { data: emp } = await supabase.from("empresas").select("created_at").eq("id", empresaId).maybeSingle();
    const criada = (emp as { created_at?: string } | null)?.created_at;
    nova = Boolean(criada) && Date.now() - new Date(criada as string).getTime() < DIAS_DE_CONTA_NOVA * 864e5;
  }
  return { mostrar: nova, exemploCasamento };
}
