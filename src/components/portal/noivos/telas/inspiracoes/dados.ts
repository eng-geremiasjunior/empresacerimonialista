import "server-only";

// O mural de inspirações lê a mesma tabela das referências do guia de
// estilo (evento_inspiracao, 092/096) pela sessão da família: a RLS
// decide o que volta. As fotos moram no balde privado `inspiracoes`, na
// pasta do evento; a URL sai assinada por uma hora, a cada visita (o
// molde de portal-paleta.ts).
//
// "O comentário" de uma foto é a `legenda`: a frase de quem guardou a
// imagem, com o `autor`. Quando a linha é da equipe (origem 'equipe'), é
// a fala da cerimonialista sobre a foto.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** O que a tela recebe de cada foto (só dados simples: vai ao cliente). */
export type FotoDoMural = {
  id: string;
  /** caminho no balde (pasta = evento): é o que a remoção precisa */
  path: string;
  url: string;
  assunto: string;
  legenda: string | null;
  /** a inicial de quem escreveu a legenda, quando o autor foi guardado */
  inicial: string | null;
  /** a foto veio da equipe (a legenda é a fala da cerimonialista) */
  daEquipe: boolean;
};

/** As mais novas primeiro na leitura; na tela, a ordem em que entraram. */
const LIMITE = 120;
const HORA = 60 * 60;

type Linha = {
  id: string;
  storage_path: string;
  assunto: string | null;
  legenda: string | null;
  autor: string | null;
  origem: string | null;
};

export const getMural = cache(async (eventId: string): Promise<FotoDoMural[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_inspiracao")
    .select("id, storage_path, assunto, legenda, autor, origem")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(LIMITE);
  const linhas = (error ? [] : data ?? []) as Linha[];
  if (linhas.length === 0) return [];

  const urls = new Map<string, string>();
  const { data: assinadas } = await supabase.storage
    .from("inspiracoes")
    .createSignedUrls(
      linhas.map((l) => l.storage_path),
      HORA
    );
  for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);

  return linhas
    .slice()
    .reverse()
    .flatMap((l) => {
      const url = urls.get(l.storage_path);
      // sem URL a foto não abre: um espaço vazio no mural não ajuda ninguém
      if (!url) return [];
      const legenda = l.legenda?.trim() || null;
      const autor = l.autor?.trim() || "";
      return [
        {
          id: l.id,
          path: l.storage_path,
          url,
          assunto: l.assunto ?? "geral",
          legenda,
          inicial: autor ? autor.charAt(0).toUpperCase() : null,
          daEquipe: l.origem === "equipe",
        },
      ];
    });
});
