import type { createClient } from "@/lib/supabase/server";

/**
 * O link público do fornecedor nasce junto com o vínculo (158).
 *
 * DUAS TABELAS, e a confusão entre elas deixou o recurso morto por
 * semanas: `roteiro_links` é o VÍNCULO do fornecedor com um evento (e a
 * confirmação dele, 157); `fornecedor_acesso` é o ACESSO dele ao link
 * sem login — por FORNECEDOR, não por evento, porque a página pública
 * atravessa os eventos dela ("o único link que atravessa os eventos").
 *
 * A tela oferecia o link montado com o hash do vínculo, e a página
 * resolvia pelo hash do acesso. Medido em 11/09/2026: dos 74 vínculos do
 * banco, zero abriam — todo fornecedor que recebeu esse link viu "Link
 * inválido". A 158 conserta o passado (uma linha de acesso para cada
 * vínculo existente); esta função conserta o futuro.
 *
 * IDEMPOTENTE, e nunca troca o hash de quem já tem: o link que já está
 * no WhatsApp de um fornecedor não pode virar pó porque ela o vinculou a
 * um segundo evento.
 *
 * A validade cobre o evento com folga. Link que expira antes da festa é
 * pior que link nenhum: morre exatamente no dia em que seria usado.
 */
export async function garantirAcessoDoFornecedor(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  supplierIds: string[]
): Promise<void> {
  const ids = [...new Set(supplierIds.filter(Boolean))];
  if (!eventId || ids.length === 0) return;

  const { data: ev } = await supabase
    .from("events")
    .select("empresa_id, date")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev?.empresa_id) return;

  const depoisDoEvento = ev.date
    ? new Date(`${ev.date}T12:00:00-03:00`).getTime() + 30 * 86_400_000
    : 0;
  const expira_em = new Date(
    Math.max(Date.now() + 180 * 86_400_000, depoisDoEvento)
  ).toISOString();

  // Falha aqui não desfaz o vínculo: o fornecedor está no evento, que é
  // o que ela pediu. Sem a 158 aplicada, a tabela pode nem aceitar a
  // escrita — e a tela continua funcionando.
  await supabase
    .from("fornecedor_acesso")
    .upsert(
      ids.map((supplier_id) => ({
        empresa_id: ev.empresa_id as string,
        supplier_id,
        expira_em,
        revogado_em: null,
      })),
      { onConflict: "empresa_id,supplier_id", ignoreDuplicates: true }
    );

  // E ESTENDER QUEM JÁ EXISTIA.
  //
  // `ignoreDuplicates` protege o hash de quem já tem link no WhatsApp —
  // mas também faz o upsert não tocar em NADA, inclusive na validade. Um
  // fornecedor que ganhou acesso por uma solicitação (90 dias, escritos à
  // mão em solicitacoes/actions.ts) e depois é vinculado a um casamento
  // de oito meses ficaria com o link morrendo antes da festa — que é
  // justamente o defeito que a 158 conserta no passado.
  //
  // Só estende, nunca encurta, e não ressuscita link revogado.
  await supabase
    .from("fornecedor_acesso")
    .update({ expira_em })
    .eq("empresa_id", ev.empresa_id as string)
    .in("supplier_id", ids)
    .is("revogado_em", null)
    .lt("expira_em", expira_em);
}
