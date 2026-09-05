// O posto da recepção: a tela que fica na mão de quem está na porta.
//
// Sem login, sem app. O hash do posto na URL é a credencial (148): quem
// tem o link opera a porta enquanto o posto estiver vivo e dentro da
// janela do evento. Esta página só pergunta ao banco UMA coisa, pela
// chave anônima: "este posto está aberto?". Tudo o mais — a lista, as
// marcações — passa pela rota /api/recepcao com a chave de serviço.
//
// Posto revogado ou fora da janela responde NULL, e a tela diz só que o
// link não está mais ativo. Nem o nome do evento sai para um link morto.

import { cache } from "react";
import type { Metadata } from "next";
import { clienteAnonimoPublico } from "@/lib/supabase/anon-publico";
import { HEX64, type PostoPublico } from "@/lib/recepcao";
import { LinkInativo, PostoDeRecepcao } from "@/components/recepcao/PostoDeRecepcao";

export const dynamic = "force-dynamic";

// Duas leituras no mesmo render (título e página) viram uma só.
const carregarPosto = cache(async (hash: string): Promise<PostoPublico | null> => {
  if (!HEX64.test(hash)) return null;
  // no-store obrigatório: sem ele o Next congela a resposta e um posto
  // revogado continuaria abrindo (mesma classe do bug do guia e do
  // convite, medidos em produção)
  const supabase = clienteAnonimoPublico();
  const { data } = await supabase.rpc("recepcao_posto_publico", { p_hash: hash });
  return (data as PostoPublico | null) ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: { hash: string };
}): Promise<Metadata> {
  const posto = await carregarPosto(params.hash.toLowerCase());
  return {
    title: posto ? `${posto.posto_nome} · ${posto.evento_nome}` : "Recepção",
    // credencial de trabalho: fora do índice de buscadores
    robots: { index: false, follow: false },
  };
}

export default async function RecepcaoPage({
  params,
}: {
  params: { hash: string };
}) {
  const hash = params.hash.toLowerCase();
  const posto = await carregarPosto(hash);

  if (!posto) {
    return <LinkInativo />;
  }

  return <PostoDeRecepcao hash={hash} posto={posto} />;
}
