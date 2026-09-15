// Imagens que entram num PDF do @react-pdf.
//
// O renderizador não tolera imagem inacessível: uma URL que responde 404,
// ou que devolve HTML em vez de imagem, derruba o PDF inteiro. Então quem
// monta o documento baixa cada imagem ANTES, aqui, e recebe ou um data URI
// pronto ou `null` — e decide por conta própria o que fazer sem ela. É
// melhor entregar a proposta sem a foto do que não entregar.
//
// Nasceu em `src/app/orcamento/[hash]/pdf/route.ts`; saiu de lá quando o
// termo de aceite passou a precisar da mesma coisa (a logo da empresa).

const MAX_IMAGEM = 4 * 1024 * 1024;

/**
 * Baixa a imagem e devolve `data:<tipo>;base64,...`. `null` em QUALQUER
 * falha: URL vazia, rede, status diferente de 2xx, conteúdo que não é
 * imagem, arquivo vazio ou acima de `maxBytes` (4 MB por padrão).
 */
export async function comoDataUri(
  url: string | null | undefined,
  maxBytes: number = MAX_IMAGEM
): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const tipo = r.headers.get("content-type") ?? "";
    if (!tipo.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0 || buf.length > maxBytes) return null;
    return `data:${tipo};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
