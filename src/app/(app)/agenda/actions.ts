"use server";

// Ações da Agenda de Fornecedores: grade semanal, config de slots e
// exceções. Tudo pessoal (RLS user_id = auth.uid()); salvar a grade
// substitui as janelas de uma vez — o estado da tela é a verdade.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AcaoResult = { error: string } | { success: true };

export type DiaGrade = {
  dia_semana: number; // 0-6
  hora_inicio: string; // HH:mm
  hora_fim: string;
};

export async function salvarGrade(
  dias: DiaGrade[],
  slotPadraoMin: number,
  bufferMin: number
): Promise<AcaoResult> {
  for (const d of dias) {
    if (d.hora_fim <= d.hora_inicio) {
      return { error: "Em todas as janelas, o fim precisa ser depois do início." };
    }
  }
  if (![30, 45, 60].includes(slotPadraoMin))
    return { error: "Duração inválida." };
  if (![0, 15, 30].includes(bufferMin))
    return { error: "Intervalo inválido." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // substitui a grade inteira (idempotente e sem estados fantasmas)
  const { error: eDel } = await supabase
    .from("disponibilidade")
    .delete()
    .eq("user_id", user.id);
  if (eDel) return { error: "Não foi possível salvar a grade." };

  if (dias.length > 0) {
    const { error: eIns } = await supabase.from("disponibilidade").insert(
      dias.map((d) => ({
        user_id: user.id,
        dia_semana: d.dia_semana,
        hora_inicio: d.hora_inicio,
        hora_fim: d.hora_fim,
      }))
    );
    if (eIns) return { error: "Não foi possível salvar a grade." };
  }

  const { error: eCfg } = await supabase.from("agenda_config").upsert({
    user_id: user.id,
    slot_padrao_min: slotPadraoMin,
    buffer_min: bufferMin,
    updated_at: new Date().toISOString(),
  });
  if (eCfg) return { error: "Grade salva, mas a configuração de slots falhou." };

  revalidatePath("/agenda");
  return { success: true };
}

export async function adicionarExcecao(
  data: string,
  label: string
): Promise<AcaoResult & { id?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Informe a data." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: row, error } = await supabase
    .from("disponibilidade_excecao")
    .upsert(
      { user_id: user.id, data, label: label.trim() || null },
      { onConflict: "user_id,data" }
    )
    .select("id")
    .single();

  if (error || !row) return { error: "Não foi possível adicionar a exceção." };
  revalidatePath("/agenda");
  return { success: true, id: row.id };
}

export async function removerExcecao(id: string): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("disponibilidade_excecao")
    .delete()
    .eq("id", id);
  if (error) return { error: "Não foi possível remover a exceção." };
  revalidatePath("/agenda");
  return { success: true };
}
