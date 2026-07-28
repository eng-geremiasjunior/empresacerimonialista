"use server";

// Configuração da proposta interativa: pacotes, extras e a regra do
// slider de convidados. Só a proprietária mexe (a RLS da 056 garante;
// aqui é a camada de escrita, que confere o cargo antes).
//
// Pacotes e extras salvam por SUBSTITUIÇÃO COMPLETA, como o FAQ e as
// etapas: a ordem na tela é a ordem salva.
//
// Isso NÃO afeta propostas já aceitas — orcamento_aceites guarda snapshot
// de nome e preço, então reajustar aqui não mexe no que alguém assinou.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tipoValido } from "@/lib/catalogo";
import type { EventType } from "@/lib/types";

export type AcaoResult = { error: string } | { success: true };

async function contexto() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.rpc("meu_cargo");
  const cargo = (data as { empresa_id: string; cargo: string }[] | null)?.[0];
  return { supabase, empresaId: cargo?.empresa_id, cargo: cargo?.cargo };
}

function numero(v: unknown, padrao = 0): number {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : padrao;
}

// ---------- Pacotes ----------
export type PacoteEntrada = {
  nome: string;
  subtitulo: string;
  preco: string;
  inclui: string;      // uma linha por item
  naoInclui: string;
  recomendado: boolean;
  ativo: boolean;
};

const linhas = (texto: string) =>
  texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export async function salvarPacotes(
  tipoEvento: EventType,
  itens: PacoteEntrada[]
): Promise<AcaoResult> {
  const { supabase, empresaId, cargo } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };
  if (cargo !== "proprietaria") return { error: "Sem permissão." };
  const tipo = tipoValido(tipoEvento);
  if (!tipo) return { error: "Tipo de evento inválido." };

  const validos = itens.filter((p) => p.nome.trim());

  // Só um pode ser o recomendado: dois selos "Mais escolhido" na mesma
  // proposta anulam o efeito de âncora que o selo existe para criar.
  let jaTemRecomendado = false;

  // O filtro por tipo é o que impede que salvar debutante apague os
  // pacotes de casamento: este delete é a primeira metade da substituição.
  const { error: delErr } = await supabase
    .from("empresa_pacotes")
    .delete()
    .eq("empresa_id", empresaId)
    .eq("tipo_evento", tipo);
  if (delErr) return { error: "Não foi possível salvar os pacotes." };

  if (validos.length > 0) {
    const { error } = await supabase.from("empresa_pacotes").insert(
      validos.map((p, i) => {
        const recomendado = p.recomendado && !jaTemRecomendado;
        if (recomendado) jaTemRecomendado = true;
        return {
          empresa_id: empresaId,
          tipo_evento: tipo,
          ordem: i + 1,
          nome: p.nome.trim(),
          subtitulo: p.subtitulo.trim() || null,
          preco: numero(p.preco),
          inclui: linhas(p.inclui),
          nao_inclui: linhas(p.naoInclui),
          recomendado,
          ativo: p.ativo,
        };
      })
    );
    if (error) return { error: "Não foi possível salvar os pacotes." };
  }

  revalidatePath(`/catalogo/${tipo}`);
  return { success: true };
}

// ---------- Extras ----------
export type ExtraEntrada = {
  nome: string;
  descricao: string;
  preco: string;
  ativo: boolean;
};

export async function salvarExtras(
  tipoEvento: EventType,
  itens: ExtraEntrada[]
): Promise<AcaoResult> {
  const { supabase, empresaId, cargo } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };
  if (cargo !== "proprietaria") return { error: "Sem permissão." };
  const tipo = tipoValido(tipoEvento);
  if (!tipo) return { error: "Tipo de evento inválido." };

  const validos = itens.filter((x) => x.nome.trim());

  const { error: delErr } = await supabase
    .from("empresa_extras")
    .delete()
    .eq("empresa_id", empresaId)
    .eq("tipo_evento", tipo);
  if (delErr) return { error: "Não foi possível salvar os extras." };

  if (validos.length > 0) {
    const { error } = await supabase.from("empresa_extras").insert(
      validos.map((x, i) => ({
        empresa_id: empresaId,
        tipo_evento: tipo,
        ordem: i + 1,
        nome: x.nome.trim(),
        descricao: x.descricao.trim() || null,
        preco: numero(x.preco),
        ativo: x.ativo,
      }))
    );
    if (error) return { error: "Não foi possível salvar os extras." };
  }

  revalidatePath(`/catalogo/${tipo}`);
  return { success: true };
}

// ---------- Regra do slider de convidados ----------
export async function salvarRegraConvidados(
  _prev: AcaoResult | null,
  formData: FormData
): Promise<AcaoResult> {
  const { supabase, empresaId, cargo } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };
  if (cargo !== "proprietaria") return { error: "Sem permissão." };
  const tipo = tipoValido(String(formData.get("tipo_evento") ?? ""));
  if (!tipo) return { error: "Tipo de evento inválido." };

  const min = Math.round(numero(formData.get("convidados_min"), 50));
  const max = Math.round(numero(formData.get("convidados_max"), 300));
  const inclusos = Math.round(numero(formData.get("convidados_inclusos"), 150));

  if (max <= min) {
    return { error: "O máximo de convidados precisa ser maior que o mínimo." };
  }
  // Se os inclusos ficassem fora da faixa, o cliente veria cobrança de
  // excedente já no início do slider — ou nunca veria.
  if (inclusos < min || inclusos > max) {
    return { error: "Os convidados inclusos precisam estar entre o mínimo e o máximo." };
  }

  // upsert: um tipo de evento aberto pela primeira vez ainda não tem
  // linha de conteúdo, e um update não gravaria nada nem avisaria.
  const { error } = await supabase
    .from("empresa_conteudo_institucional")
    .upsert(
      {
        empresa_id: empresaId,
        tipo_evento: tipo,
        convidados_min: min,
        convidados_max: max,
        convidados_inclusos: inclusos,
        valor_por_convidado_extra: numero(
          formData.get("valor_por_convidado_extra"),
          0
        ),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "empresa_id,tipo_evento" }
    );

  if (error) return { error: "Não foi possível salvar." };
  revalidatePath(`/catalogo/${tipo}`);
  return { success: true };
}
