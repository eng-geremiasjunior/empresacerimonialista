import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { SitePublico } from "@/lib/site-publico-tipos";

// As fotos do convite moram em buckets PRIVADOS (o álbum e as
// inspirações). Quem abre o convite não tem sessão — então o servidor
// assina as URLs, e só os caminhos que a RPC já autorizou. Mesmo padrão
// do guia do fornecedor: service role aqui dentro, nunca no navegador.

const HORA = 60 * 60;

function servico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (i: RequestInfo | URL, x?: RequestInit) =>
          fetch(i, { ...x, cache: "no-store" }),
      },
    }
  );
}

export async function assinarMidiaDoConvite(dados: SitePublico): Promise<{
  fotosAlbum: { url: string; autor: string | null }[];
  fotoCasalUrl: string | null;
}> {
  const admin = servico();

  const caminhos = (dados.album ?? []).map((f) => f.path).filter(Boolean);
  let fotosAlbum: { url: string; autor: string | null }[] = [];
  if (caminhos.length > 0) {
    const { data } = await admin.storage
      .from("album")
      .createSignedUrls(caminhos, HORA);
    const porCaminho = new Map(
      (data ?? []).map((d) => [d.path ?? "", d.signedUrl])
    );
    fotosAlbum = (dados.album ?? [])
      .map((f) => ({ url: porCaminho.get(f.path) ?? "", autor: f.autor }))
      .filter((f) => f.url);
  }

  // a foto do casal vive no bucket das inspirações (é a curadoria dela)
  let fotoCasalUrl: string | null = null;
  const caminhoCasal = dados.site?.foto_casal_path;
  if (caminhoCasal) {
    const { data } = await admin.storage
      .from("inspiracoes")
      .createSignedUrl(caminhoCasal, HORA);
    fotoCasalUrl = data?.signedUrl ?? null;
  }

  return { fotosAlbum, fotoCasalUrl };
}
