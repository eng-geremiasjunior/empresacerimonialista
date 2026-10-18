"use server";

// Marcar reunião numa oportunidade (214, 18/10/2026): o compromisso entra
// na Agenda dela já ligado ao pedido ou à proposta, e o cartão passa a
// dizer quando é. A RLS da 213 decide quem pode marcar; o gatilho da 214
// recusa ligar a algo de outra empresa. O nome do título vem do banco,
// nunca do navegador.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

export async function marcarReuniao(entrada: {
  tipo: "pedido" | "proposta";
  id: string;
  data: string;
  hora?: string | null;
  local?: string | null;
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!UUID.test(entrada.id) || (entrada.tipo !== "pedido" && entrada.tipo !== "proposta")) {
    return { ok: false, erro: "Oportunidade não encontrada." };
  }
  if (!DATA.test(entrada.data ?? "")) return { ok: false, erro: "Escolha o dia." };
  const hora = entrada.hora && HORA.test(entrada.hora) ? entrada.hora : null;
  const supabase = createClient();

  const { data: alvo } =
    entrada.tipo === "pedido"
      ? await supabase.from("pedido_orcamento").select("nome").eq("id", entrada.id).maybeSingle()
      : await supabase.from("orcamentos").select("contato_nome").eq("id", entrada.id).maybeSingle();
  const nome =
    (alvo as { nome?: string; contato_nome?: string } | null)?.nome ??
    (alvo as { contato_nome?: string } | null)?.contato_nome;
  if (!nome) return { ok: false, erro: "Oportunidade não encontrada." };

  const base = {
    titulo: `Reunião com ${nome.trim()}`.slice(0, 120),
    data: entrada.data,
    hora,
    local: entrada.local?.trim().slice(0, 160) || null,
  };
  const ligacao = entrada.tipo === "pedido" ? { pedido_id: entrada.id } : { orcamento_id: entrada.id };
  let { error } = await supabase.from("agenda_item").insert({ ...base, ...ligacao });
  // antes da 214 aplicada a ligação não existe: o compromisso entra assim mesmo
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    ({ error } = await supabase.from("agenda_item").insert(base));
  }
  if (error) {
    console.error("[eorg:oportunidades] reunião:", error.code);
    return { ok: false, erro: "Não foi possível marcar agora." };
  }
  revalidatePath("/orcamentos/oportunidades");
  revalidatePath("/calendario");
  revalidatePath("/eventos/dashboard");
  return { ok: true };
}
