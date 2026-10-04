"use server";

// O planejamento da noiva que abriu a conta sozinha (04/10/2026): marcar
// uma decisão como feita, "não vamos ter isso", ou reabrir. Grava na
// MESMA linha que a cerimonialista usa (evento_decisao) — decidir "Contratar
// X" leva o previsto ao Financeiro pelo gatilho do banco, como no sistema.
//
// Só no evento da conta da família e só a dona da conta; a RLS
// (pode_editar_evento) confere de novo. As respostas dos campos não
// passam por aqui: vão do navegador pela porta de sempre
// (portal_escrever_campo, com a versão que a tela viu).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { donaDaFesta } from "@/lib/supabase/portal-planejamento";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ESTADOS = ["pendente", "decidida", "nao_se_aplica"] as const;
type Estado = (typeof ESTADOS)[number];

export async function mudarDecisaoDaNoiva(
  eventoId: string,
  decisaoId: string,
  estado: Estado
): Promise<{ ok: true } | { error: string }> {
  if (!UUID.test(eventoId) || !UUID.test(decisaoId) || !ESTADOS.includes(estado)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para continuar." };
  if (!(await donaDaFesta(eventoId))) return { error: "Só quem abriu a conta muda o planejamento." };

  const agora = new Date().toISOString();
  const { data, error } = await supabase
    .from("evento_decisao")
    .update({ estado, decidida_em: estado === "decidida" ? agora : null, updated_at: agora })
    .eq("id", decisaoId)
    .eq("event_id", eventoId)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível salvar agora. Tente de novo." };

  revalidatePath(`/portal/${eventoId}/planejamento`, "layout");
  return { ok: true };
}
