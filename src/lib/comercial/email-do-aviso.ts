import "server-only";

// Para onde vai o aviso de "chegou um pedido de orçamento".
//
// A mesma prioridade de `emailDaCerimonialista` (lib/orcamento-evento),
// que decide para onde vai o e-mail do aceite: primeiro o e-mail de
// contato que ela cadastrou nas propostas (o do tipo do evento, se
// houver), depois o da proprietária. Mora aqui, separada, porque aquele
// módulo carrega a geração de PDF inteira, e o editor da página não
// precisa disso para dizer "os pedidos chegam em tal e-mail".
//
// O cliente passado decide até onde se enxerga: com a sessão da dona, a
// RLS deixa ler o Catálogo e a equipe da empresa dela; com a chave de
// serviço, a rota do formulário ainda pode cair no e-mail de login da
// dona como último recurso.

import type { SupabaseClient } from "@supabase/supabase-js";

const limpo = (v: string | null | undefined) => (v ?? "").trim() || null;

export async function emailDoAvisoDePedido(
  db: SupabaseClient,
  empresaId: string,
  tipoEvento: string | null,
  { usarLoginDaDona = false }: { usarLoginDaDona?: boolean } = {}
): Promise<string | null> {
  const { data: conteudo } = await db
    .from("empresa_conteudo_institucional")
    .select("tipo_evento, email_contato")
    .eq("empresa_id", empresaId);
  const linhas = (conteudo ?? []) as { tipo_evento: string; email_contato: string | null }[];
  const doTipo = tipoEvento
    ? limpo(linhas.find((l) => l.tipo_evento === tipoEvento)?.email_contato)
    : null;
  const qualquer = linhas.map((l) => limpo(l.email_contato)).find(Boolean) ?? null;
  if (doTipo ?? qualquer) return doTipo ?? qualquer;

  const { data: dona } = await db
    .from("membros_equipe")
    .select("email")
    .eq("empresa_id", empresaId)
    .eq("is_owner", true)
    .eq("status", "ativo")
    .limit(1);
  const daDona = limpo(((dona ?? [])[0] as { email: string | null } | undefined)?.email);
  if (daDona) return daDona;

  if (!usarLoginDaDona) return null;
  const { data: empresa } = await db
    .from("empresas")
    .select("owner_user_id")
    .eq("id", empresaId)
    .maybeSingle();
  const ownerId = (empresa as { owner_user_id?: string } | null)?.owner_user_id;
  if (!ownerId) return null;
  const { data } = await db.auth.admin.getUserById(ownerId);
  return limpo(data?.user?.email);
}
