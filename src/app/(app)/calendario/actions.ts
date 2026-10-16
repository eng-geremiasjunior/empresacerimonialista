"use server";

// A agenda livre (213): o compromisso que não é de evento nenhum. A RLS
// decide quem escreve e quem apaga; aqui só se confere o formato.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

export async function criarCompromissoLivre(entrada: {
  titulo: string;
  data: string;
  hora?: string | null;
  local?: string | null;
  observacao?: string | null;
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  const titulo = (entrada.titulo ?? "").trim().slice(0, 120);
  if (!titulo) return { ok: false, erro: "Escreva o que é o compromisso." };
  if (!DATA.test(entrada.data ?? "")) return { ok: false, erro: "Escolha o dia." };
  const hora = entrada.hora && HORA.test(entrada.hora) ? entrada.hora : null;
  const supabase = createClient();
  const { error } = await supabase.from("agenda_item").insert({
    titulo,
    data: entrada.data,
    hora,
    local: entrada.local?.trim().slice(0, 160) || null,
    observacao: entrada.observacao?.trim().slice(0, 500) || null,
  });
  if (error) {
    console.error("[agenda] criar:", error.code);
    return { ok: false, erro: "Não foi possível salvar agora." };
  }
  revalidatePath("/calendario");
  revalidatePath("/eventos/dashboard");
  return { ok: true };
}

export async function apagarCompromissoLivre(id: string): Promise<{ ok: boolean }> {
  if (!UUID.test(id)) return { ok: false };
  const supabase = createClient();
  const { error } = await supabase.from("agenda_item").delete().eq("id", id);
  if (error) console.error("[agenda] apagar:", error.code);
  revalidatePath("/calendario");
  revalidatePath("/eventos/dashboard");
  return { ok: !error };
}
