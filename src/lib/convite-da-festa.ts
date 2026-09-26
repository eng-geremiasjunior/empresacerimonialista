import "server-only";

// O convite do portal v2 (180) visto pelo convidado: a cor da festa, o
// retrato (só quando o responsável ligou "usar no convite"), a música da
// entrada e a resposta que ele já deu. A consulta é a pública, pelo hash;
// só a assinatura do retrato (balde privado) usa a chave de serviço, aqui
// no servidor — e só depois que a consulta pública liberou o caminho.

import { createClient } from "@supabase/supabase-js";
import { clienteAnonimoPublico } from "@/lib/supabase/anon-publico";

export type ConviteDaFesta = {
  nomeEvento: string | null;
  cor: { l: number; c: number; h: number } | null;
  retratoUrl: string | null;
  entrada: { titulo: string; artista: string | null; preview: string | null } | null;
  faixa: "adulto" | "6-12" | "0-5" | null;
  sexo: "feminino" | "masculino" | "nd" | null;
  pessoas: { nome: string; faixa: "adulto" | "6-12" | "0-5"; sexo: "feminino" | "masculino" | "nd" | null }[];
  restricoes: string[];
  recado: string | null;
};

export async function getConviteDaFesta(hash: string): Promise<ConviteDaFesta | null> {
  const { data, error } = await clienteAnonimoPublico().rpc("convite_da_festa", { p_hash: hash });
  if (error || !data) return null;
  const d = data as {
    nome_evento: string | null;
    cor: { l: number; c: number; h: number } | null;
    retrato_path: string | null;
    entrada: { titulo: string; artista: string | null; preview_url: string | null } | null;
    faixa: ConviteDaFesta["faixa"];
    sexo: ConviteDaFesta["sexo"];
    pessoas: ConviteDaFesta["pessoas"] | null;
    restricoes: string[] | null;
    recado: string | null;
  };

  let retratoUrl: string | null = null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (d.retrato_path && url && chave) {
    const servico = createClient(url, chave, { auth: { persistSession: false } });
    const { data: s } = await servico.storage.from("inspiracoes").createSignedUrl(d.retrato_path, 60 * 60);
    retratoUrl = s?.signedUrl ?? null;
  }

  return {
    nomeEvento: d.nome_evento,
    cor: d.cor && Number.isFinite(d.cor.l) ? d.cor : null,
    retratoUrl,
    entrada: d.entrada ? { titulo: d.entrada.titulo, artista: d.entrada.artista, preview: d.entrada.preview_url } : null,
    faixa: d.faixa,
    sexo: d.sexo,
    pessoas: d.pessoas ?? [],
    restricoes: d.restricoes ?? [],
    recado: d.recado,
  };
}
