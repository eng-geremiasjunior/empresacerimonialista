import "server-only";

// A medição de anúncio, vista de dentro do ambiente (22/09/2026).
//
// As chaves de medição moram nas variáveis da Vercel, e o código que as
// usa DESISTE CALADO quando falta uma — de propósito, porque medir nunca
// pode derrubar um cadastro ou uma cobrança. O preço disso: faltar o
// GA_API_SECRET deixava a venda do oitavo dia sem chegar ao Google, e
// ninguém tinha como saber de fora.
//
// Esta leitura responde "está configurado?" com sim ou não. Os valores
// SECRETOS nunca saem daqui; os públicos (o id do GA4 e o do pixel, que
// qualquer visitante vê no código da página) aparecem para ele conferir
// que é a propriedade certa.

import { exigirSuperAdmin, servico } from "@/lib/supabase/admin-painel";

export type ItemDaMedicao = {
  nome: string;
  /** o que acontece quando está configurado */
  para: string;
  ok: boolean;
  /** valor público, quando existe; nunca um segredo */
  valor?: string | null;
};

export type MedicaoDeAnuncio = {
  itens: ItemDaMedicao[];
  /** das contas de fora mais recentes, quantas guardaram o id do Google */
  comIdDoGoogle: number;
  comOrigem: number;
};

const preenchida = (nome: string) => Boolean(process.env[nome]?.trim());

export async function getMedicaoDeAnuncio(): Promise<MedicaoDeAnuncio> {
  await exigirSuperAdmin();

  const ga = process.env.NEXT_PUBLIC_GA_ID?.trim() || null;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || null;
  const itens: ItemDaMedicao[] = [
    {
      nome: "Google Analytics nas páginas de venda",
      para: "visita, clique, conta criada e teste iniciado",
      ok: Boolean(ga && /^G-[A-Z0-9]+$/i.test(ga)),
      valor: ga,
    },
    {
      nome: "Google pelo servidor (GA_API_SECRET)",
      para: "a venda do oitavo dia chegar ao Google Ads",
      ok: preenchida("GA_API_SECRET"),
    },
    {
      nome: "Pixel da Meta nas páginas de venda",
      para: "visita, cadastro e teste iniciado na Meta",
      ok: Boolean(pixel && /^\d{6,20}$/.test(pixel)),
      valor: pixel,
    },
    {
      nome: "Meta pelo servidor (META_CAPI_TOKEN)",
      para: "a venda do oitavo dia chegar à Meta",
      ok: preenchida("META_CAPI_TOKEN"),
    },
  ];

  // As 20 contas de fora mais recentes: sem o id do Google gravado na
  // origem, o servidor não tem como mandar a venda delas ao Google.
  let comIdDoGoogle = 0;
  let comOrigem = 0;
  try {
    const db = servico();
    const [{ data: casa }, { data: origens }] = await Promise.all([
      db.from("contas_da_casa").select("empresa_id"),
      db
        .from("origem_do_clique")
        .select("empresa_id, ga_client_id")
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
    const daCasa = new Set(((casa ?? []) as { empresa_id: string }[]).map((c) => c.empresa_id));
    const fora = ((origens ?? []) as { empresa_id: string; ga_client_id: string | null }[])
      .filter((o) => !daCasa.has(o.empresa_id))
      .slice(0, 20);
    comOrigem = fora.length;
    comIdDoGoogle = fora.filter((o) => o.ga_client_id).length;
  } catch {
    // sem a contagem, a tela mostra só as chaves
  }

  return { itens, comIdDoGoogle, comOrigem };
}
