"use server";

// Os contratos e os comprovantes da noiva que abriu a conta sozinha
// (04/10/2026). As portas são as do sistema:
//   · o contrato do fornecedor sobe como o da cerimonialista quando ela
//     anexa (prepararAnexoContrato → o navegador envia → confirmarAnexoContrato):
//     mesmo balde privado, mesma solicitação de contrato;
//   · o comprovante do pagamento é o do Financeiro (salvarComprovante),
//     no balde de comprovantes, na pasta do evento.
// Só a dona da conta de família (donaDaFesta); a RLS confere de novo.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { donaDaFesta } from "@/lib/supabase/portal-planejamento";
import {
  confirmarAnexoContrato,
  prepararAnexoContrato,
  type PreparoAnexo,
} from "@/app/(app)/eventos/[id]/fornecedores/anexo-actions";
import { salvarComprovante } from "@/app/(app)/eventos/[id]/financeiro/comprovante-actions";

type Retorno = { ok: true } | { error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMPROVANTE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|webp)$/i;

function revalidar(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/documentos`);
  revalidatePath(`/portal/${eventoId}/investimento`);
}

async function guarda(eventoId: string): Promise<{ empresaId: string } | { error: string }> {
  if (!UUID.test(eventoId)) return { error: "Pedido inválido." };
  return (await donaDaFesta(eventoId)) ?? { error: "Só quem abriu a conta mexe nos documentos." };
}

/**
 * O primeiro passo do contrato: o fornecedor (o da lista ou um nome novo,
 * que entra no cadastro dela) e a permissão para o navegador enviar.
 */
export async function prepararContratoDaNoiva(
  eventoId: string,
  fornecedor: { supplierId: string | null; nome: string },
  arquivo: { nome: string; tipo: string }
): Promise<PreparoAnexo> {
  const dona = await guarda(eventoId);
  if ("error" in dona) return dona;
  const supabase = createClient();

  let supplierId = fornecedor.supplierId;
  if (supplierId) {
    if (!UUID.test(supplierId)) return { error: "Pedido inválido." };
    const { data: dela } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplierId)
      .eq("empresa_id", dona.empresaId)
      .maybeSingle();
    if (!dela) return { error: "Não encontramos esse fornecedor." };
  } else {
    const nome = fornecedor.nome.trim().slice(0, 80);
    if (!nome) return { error: "Diga de quem é o contrato." };
    // o mesmo nome é o mesmo fornecedor: sem cadastro em dobro
    const padrao = nome.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data: achados } = await supabase
      .from("suppliers")
      .select("id")
      .eq("empresa_id", dona.empresaId)
      .ilike("name", padrao)
      .limit(1);
    supplierId = (achados?.[0] as { id: string } | undefined)?.id ?? null;
    if (!supplierId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: "Entre de novo para continuar." };
      const { data: novo } = await supabase
        .from("suppliers")
        .insert({ cerimonialista_id: user.id, name: nome })
        .select("id")
        .single();
      supplierId = (novo as { id: string } | null)?.id ?? null;
      if (!supplierId) return { error: "Não foi possível salvar agora. Tente de novo." };
    }
  }

  return prepararAnexoContrato(eventoId, supplierId, arquivo.nome, arquivo.tipo);
}

/** O segundo passo: o arquivo já está no balde; a solicitação aponta para ele. */
export async function confirmarContratoDaNoiva(
  eventoId: string,
  solicitacaoId: string,
  caminho: string,
  nome: string
): Promise<Retorno> {
  const g = await guarda(eventoId);
  if ("error" in g) return g;
  if (!UUID.test(solicitacaoId)) return { error: "Pedido inválido." };
  const r = await confirmarAnexoContrato(eventoId, solicitacaoId, caminho, nome.slice(0, 200));
  if ("error" in r) return { error: r.error };
  revalidar(eventoId);
  return { ok: true };
}

/**
 * O comprovante de um pagamento feito. O arquivo já subiu do navegador
 * para a pasta do evento (eventoId/<uuid>.<ext>); aqui ele se pendura no
 * lançamento.
 */
export async function salvarComprovanteDaNoiva(
  eventoId: string,
  transacaoId: string,
  caminho: string,
  nome: string
): Promise<Retorno> {
  const g = await guarda(eventoId);
  if ("error" in g) return g;
  if (!UUID.test(transacaoId)) return { error: "Pedido inválido." };
  if (!COMPROVANTE.test(caminho) || !caminho.startsWith(`${eventoId}/`)) return { error: "Arquivo inválido." };
  const supabase = createClient();
  const { data: pagamento } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", transacaoId)
    .eq("event_id", eventoId)
    .eq("conta", "fornecedor")
    .eq("type", "despesa")
    .eq("paid", true)
    .maybeSingle();
  if (!pagamento) return { error: "Esse pagamento não está marcado como feito." };
  const r = await salvarComprovante(eventoId, transacaoId, {
    path: caminho,
    nome: nome.slice(0, 200),
    dados: { origem: "noiva" },
  });
  if ("error" in r) return { error: r.error };
  revalidar(eventoId);
  return { ok: true };
}
