"use server";

// Registrar contato: o gesto que ela toca depois de ligar.
//
// É o que alimenta "último contato", a visão de frios e a contagem do
// Copiloto — por isso ele grava de verdade e devolve erro quando falha,
// em vez de fingir que deu certo (o padrão da casa desde o financeiro).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hojeBR } from "@/lib/tempo";

export type ResultadoContato = { ok?: boolean; error?: string };

const CANAIS = ["whatsapp", "telefone", "email", "presencial", "outro"];

export async function registrarContato(
  clienteIds: string[],
  canal: string,
  nota: string | null
): Promise<ResultadoContato> {
  if (clienteIds.length === 0) return { error: "Nenhum cliente selecionado." };
  const canalOk = CANAIS.includes(canal) ? canal : "outro";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hoje = hojeBR();
  const linhas = clienteIds.map((id) => ({
    client_id: id,
    em: hoje,
    canal: canalOk,
    nota: nota?.trim() || null,
    criado_por: user?.id ?? null,
  }));

  // `.select()` para distinguir "gravou" de "a RLS recusou em silêncio":
  // o PostgREST devolve error=null com zero linhas quando a policy filtra.
  const { data, error } = await supabase
    .from("cliente_contato")
    .insert(linhas)
    .select("id");

  if (error) {
    console.error("[vela:clientes] registrarContato:", error.code, error.message);
    // Discriminar pelo CÓDIGO, não pelo texto: a mensagem de RLS negada
    // ("new row violates row-level security policy for table
    // \"cliente_contato\"") também contém o nome da tabela, então a
    // primeira versão dizia "não está disponível nesta conta" para quem
    // simplesmente não tinha permissão — e mandava a cerimonialista
    // procurar migração onde o problema era cargo.
    if (error.code === "PGRST205" || error.code === "42P01") {
      return { error: "O registro de contato ainda não está disponível nesta conta." };
    }
    if (error.code === "42501") {
      return { error: "Você não tem permissão para registrar contato aqui." };
    }
    return { error: "Não foi possível registrar o contato." };
  }
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para registrar contato aqui." };
  }

  revalidatePath("/clientes");
  return { ok: true };
}
