"use server";

// O evento de exemplo (174): marcar as telas que ela já viu e tirar o
// exemplo de cena. A marca vai pela sessão dela (RLS de events); o apagar
// usa a chave de serviço porque leva junto o cliente e os fornecedores
// do exemplo — mas só depois de conferir que a empresa é a dela.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMeuCargo } from "@/lib/supabase/equipe";
import {
  AREAS_DO_EXEMPLO,
  apagarEventoDeExemplo,
  criarEventoDeExemplo,
  viuTudo,
  type AreaDoExemplo,
  type ModeloDoExemplo,
} from "@/lib/evento-exemplo";

export async function marcarExemploVisto(eventId: string, area: AreaDoExemplo): Promise<{ tudo: boolean }> {
  if (!AREAS_DO_EXEMPLO.some((a) => a.area === area)) return { tudo: false };
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("exemplo, exemplo_visto")
    .eq("id", eventId)
    .maybeSingle();
  if (!data?.exemplo) return { tudo: false };
  const visto = (data.exemplo_visto as string[] | null) ?? [];
  if (visto.includes(area)) return { tudo: viuTudo(visto) };
  const novo = [...visto, area];
  await supabase.from("events").update({ exemplo_visto: novo }).eq("id", eventId);
  return { tudo: viuTudo(novo) };
}

export async function apagarExemplo() {
  const { empresaId } = await getMeuCargo();
  if (empresaId) await apagarEventoDeExemplo(empresaId);
  revalidatePath("/eventos");
  revalidatePath("/eventos/dashboard");
  redirect("/eventos");
}

/**
 * Troca o exemplo pelo outro modelo (casamento ↔ 15 anos), pela faixa do
 * exemplo. Abre direto no Roteiro do dia do novo, como o cadastro faz.
 */
export async function trocarModeloDoExemplo(modelo: ModeloDoExemplo) {
  if (modelo !== "casamento" && modelo !== "debutante") return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { empresaId } = await getMeuCargo();
  if (!user || !empresaId) return;
  await apagarEventoDeExemplo(empresaId);
  const novo = await criarEventoDeExemplo(empresaId, user.id, modelo);
  revalidatePath("/eventos");
  revalidatePath("/eventos/dashboard");
  redirect(novo ? `/eventos/${novo}/roteiro` : "/eventos");
}

/**
 * Chamada pelas telas de Eventos e do Dashboard: se ela já passou por
 * todas as telas do exemplo, ele sai de cena agora.
 */
export async function limparExemploVisto(): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("exemplo_visto, empresa_id")
    .eq("exemplo", true)
    .limit(1);
  const ev = data?.[0] as { exemplo_visto: string[] | null; empresa_id: string } | undefined;
  if (!ev || !viuTudo(ev.exemplo_visto)) return;
  const { empresaId } = await getMeuCargo();
  if (empresaId && empresaId === ev.empresa_id) await apagarEventoDeExemplo(empresaId);
}
