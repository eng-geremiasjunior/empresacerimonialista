"use server";

// Escolhas curadas — o lado da cerimonialista.
//
// Ela pesquisa fora do sistema, traz de 2 a 4 referências e publica. A
// cliente escolhe. Só QUANDO FECHA o fornecedor entra no CRM: mostrar
// três buffets não pode virar três cadastros para depois descartar dois.
//
// A RLS por evento (pode_editar_evento) é a guarda real; aqui validamos
// o que é regra de produto (quantas opções, uma recomendada) e
// revalidamos o cache.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCuradoriaDaDecisao, type Curadoria } from "@/lib/supabase/curadoria";

export type ResultadoCuradoria = { error: string } | { success: true; id?: string };

/** A rodada da decisão, para o drawer (que abre sob demanda). */
export async function carregarCuradoria(
  decisaoId: string
): Promise<Curadoria | null> {
  return getCuradoriaDaDecisao(decisaoId);
}

export type OpcaoInput = {
  id?: string;
  nome: string;
  descricao?: string | null;
  valor?: number | null;
  inclui?: string[];
  prazoReserva?: string | null;
  nota?: string | null;
  recomendada?: boolean;
};

/** Abre a rodada da decisão (ou devolve a que já existe). */
export async function abrirCuradoria(
  eventId: string,
  decisaoId: string
): Promise<ResultadoCuradoria> {
  const supabase = createClient();

  const { data: existente } = await supabase
    .from("decisao_curadoria")
    .select("id")
    .eq("evento_decisao_id", decisaoId)
    .maybeSingle();
  if (existente) return { success: true, id: existente.id };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("decisao_curadoria")
    .insert({
      evento_decisao_id: decisaoId,
      event_id: eventId,
      criado_por: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível abrir a seleção." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true, id: data.id };
}

export async function salvarOpcao(
  eventId: string,
  curadoriaId: string,
  opcao: OpcaoInput
): Promise<ResultadoCuradoria> {
  const nome = opcao.nome.trim();
  if (!nome) return { error: "A opção precisa de um nome." };

  const supabase = createClient();
  const campos = {
    nome,
    descricao: opcao.descricao?.trim() || null,
    valor: opcao.valor ?? null,
    inclui: opcao.inclui?.filter((i) => i.trim()) ?? [],
    prazo_reserva: opcao.prazoReserva || null,
    nota: opcao.nota?.trim() || null,
  };

  if (opcao.id) {
    const { error } = await supabase
      .from("decisao_opcao")
      .update(campos)
      .eq("id", opcao.id)
      .eq("curadoria_id", curadoriaId);
    if (error) return { error: "Não foi possível salvar a opção." };
  } else {
    // no fim da lista: a ordem em que ela montou é a ordem que a cliente vê
    const { count } = await supabase
      .from("decisao_opcao")
      .select("id", { count: "exact", head: true })
      .eq("curadoria_id", curadoriaId);
    if ((count ?? 0) >= 4) {
      return { error: "Quatro opções é o limite — mais que isso vira lista." };
    }
    const { error } = await supabase
      .from("decisao_opcao")
      .insert({ ...campos, curadoria_id: curadoriaId, ordem: count ?? 0 });
    if (error) return { error: "Não foi possível criar a opção." };
  }

  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}

export async function removerOpcao(
  eventId: string,
  curadoriaId: string,
  opcaoId: string
): Promise<ResultadoCuradoria> {
  const supabase = createClient();
  const { error } = await supabase
    .from("decisao_opcao")
    .delete()
    .eq("id", opcaoId)
    .eq("curadoria_id", curadoriaId);
  if (error) return { error: "Não foi possível remover a opção." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}

/**
 * A recomendada é uma só por rodada (índice único parcial no banco).
 * Desmarcar as outras vem ANTES de marcar a nova, senão o índice recusa.
 */
export async function marcarRecomendada(
  eventId: string,
  curadoriaId: string,
  opcaoId: string | null
): Promise<ResultadoCuradoria> {
  const supabase = createClient();
  const { error: e1 } = await supabase
    .from("decisao_opcao")
    .update({ recomendada: false })
    .eq("curadoria_id", curadoriaId)
    .eq("recomendada", true);
  if (e1) return { error: "Não foi possível atualizar a recomendação." };

  if (opcaoId) {
    const { error: e2 } = await supabase
      .from("decisao_opcao")
      .update({ recomendada: true })
      .eq("id", opcaoId)
      .eq("curadoria_id", curadoriaId);
    if (e2) return { error: "Não foi possível atualizar a recomendação." };
  }

  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}

export async function publicarCuradoria(
  eventId: string,
  curadoriaId: string
): Promise<ResultadoCuradoria> {
  const supabase = createClient();
  const { count } = await supabase
    .from("decisao_opcao")
    .select("id", { count: "exact", head: true })
    .eq("curadoria_id", curadoriaId);

  const n = count ?? 0;
  if (n < 2) return { error: "Duas opções é o mínimo — uma só não é escolha." };
  if (n > 4) return { error: "Quatro opções é o limite." };

  const { error } = await supabase
    .from("decisao_curadoria")
    .update({
      estado: "publicada",
      publicada_em: new Date().toISOString(),
      // reabrir limpa a resposta anterior: a cliente responde de novo
      escolhida_opcao_id: null,
      motivo_recusa: null,
      respondida_em: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", curadoriaId);

  if (error) return { error: "Não foi possível publicar." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  revalidatePath(`/portal/${eventId}/escolhas`);
  return { success: true };
}

/** Tira do ar sem apagar: volta a rascunho para ela remontar. */
export async function despublicarCuradoria(
  eventId: string,
  curadoriaId: string
): Promise<ResultadoCuradoria> {
  const supabase = createClient();
  const { error } = await supabase
    .from("decisao_curadoria")
    .update({ estado: "rascunho", updated_at: new Date().toISOString() })
    .eq("id", curadoriaId);
  if (error) return { error: "Não foi possível tirar do ar." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  revalidatePath(`/portal/${eventId}/escolhas`);
  return { success: true };
}

/**
 * O fechamento: a referência vira fornecedor de verdade.
 *
 * Cria (ou reaproveita, quando o nome já existe no CRM) o supplier,
 * preenche o campo de fornecedor da decisão e o valor contratado. NÃO
 * decide a decisão — decidir continua ato dela, e é o que dispara a
 * ponte financeira e a geração de tarefas.
 *
 * A escrita nos campos passa pela MESMA RPC do resto do sistema, então
 * o fechamento aparece no histórico como qualquer outra escrita.
 */
export async function fecharComFornecedor(
  eventId: string,
  decisaoId: string,
  opcaoId: string
): Promise<ResultadoCuradoria> {
  const supabase = createClient();

  const { data: opcao } = await supabase
    .from("decisao_opcao")
    .select("id, nome, valor, supplier_id, curadoria_id")
    .eq("id", opcaoId)
    .single();
  if (!opcao) return { error: "Opção não encontrada." };

  let supplierId = opcao.supplier_id as string | null;

  if (!supplierId) {
    const nome = (opcao.nome as string).trim();
    // O CRM já pode ter esse fornecedor de outro evento — cadastrar de
    // novo criaria duas fichas com o mesmo histórico partido.
    const { data: existente } = await supabase
      .from("suppliers")
      .select("id")
      .ilike("name", nome)
      .limit(1)
      .maybeSingle();

    if (existente) {
      supplierId = existente.id as string;
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: novo, error: eNovo } = await supabase
        .from("suppliers")
        .insert({ cerimonialista_id: user?.id, name: nome })
        .select("id")
        .single();
      if (eNovo || !novo) return { error: "Não foi possível cadastrar o fornecedor." };
      supplierId = novo.id as string;
    }

    await supabase
      .from("decisao_opcao")
      .update({ supplier_id: supplierId })
      .eq("id", opcaoId);
  }

  // Os campos da decisão que o fechamento preenche. Se a decisão não
  // tiver campo de fornecedor, o vínculo fica na opção e nada quebra.
  const { data: campos } = await supabase
    .from("evento_campo_valor")
    .select("id, tipo, codigo")
    .eq("evento_decisao_id", decisaoId);

  const campoFornecedor = (campos ?? []).find((c) => c.tipo === "fornecedor");
  if (campoFornecedor) {
    await supabase.rpc("portal_escrever_campo", {
      p_campo_id: campoFornecedor.id,
      p_valor: supplierId,
      p_updated_at_visto: null,
    });
  }

  const campoValor = (campos ?? []).find(
    (c) => c.codigo === "valor_contratado" || c.tipo === "moeda"
  );
  if (campoValor && opcao.valor !== null) {
    await supabase.rpc("portal_escrever_campo", {
      p_campo_id: campoValor.id,
      p_valor: Number(opcao.valor),
      p_updated_at_visto: null,
    });
  }

  revalidatePath(`/eventos/${eventId}/planejamento`);
  revalidatePath("/fornecedores");
  return { success: true, id: supplierId ?? undefined };
}
