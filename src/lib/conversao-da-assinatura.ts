import "server-only";

// A venda que acontece SEM ninguém na tela: a primeira cobrança do teste
// com cartão sai no oitavo dia, pela operadora, e quem fica sabendo é o
// webhook (ou a rotina diária, se o aviso não chegar). É aqui que essa
// venda vira a conversão que o anúncio otimiza — o mesmo `Purchase` que o
// checkout manda, com o mesmo id de deduplicação (o da assinatura na
// operadora), para nunca contar em dobro.
//
// Nunca lança: medir não pode atrapalhar o que já está pago.

import type { SupabaseClient } from "@supabase/supabase-js";
import { registrarConversao } from "@/lib/conversoes";

export async function conversaoDaAssinatura(
  db: SupabaseClient,
  empresaId: string,
  assinaturaGatewayId: string,
  valor: number | null
): Promise<void> {
  try {
    const { data: empresa } = await db
      .from("empresas")
      .select("owner_user_id")
      .eq("id", empresaId)
      .maybeSingle();
    const dono = (empresa as { owner_user_id?: string } | null)?.owner_user_id;
    if (!dono) return;
    const { data: u } = await db.auth.admin.getUserById(dono);
    const email = u?.user?.email ?? null;
    const { data: origem } = await db
      .from("origem_do_clique")
      .select("fbp, fbc, ga_client_id")
      .eq("empresa_id", empresaId)
      .maybeSingle();
    const o = origem as { fbp?: string | null; fbc?: string | null; ga_client_id?: string | null } | null;
    await registrarConversao({
      tipo: "assinatura",
      email,
      idExterno: empresaId,
      ...(valor && valor > 0 ? { valor } : {}),
      idDoEvento: `assinatura:${assinaturaGatewayId}`,
      origem: {
        fbp: o?.fbp ?? null,
        fbc: o?.fbc ?? null,
        gaClientId: o?.ga_client_id ?? null,
        ip: null,
        userAgent: null,
      },
    });
  } catch (e) {
    console.error("[vela:conversao] assinatura pela operadora:", String(e).slice(0, 200));
  }
}
