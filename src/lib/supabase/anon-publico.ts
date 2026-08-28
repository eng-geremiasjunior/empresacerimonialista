import { createClient } from "@supabase/supabase-js";

/**
 * Cliente anônimo para PÁGINA PÚBLICA sem sessão.
 *
 * O `no-store` não é opcional: sem ele o Next guarda a resposta da RPC
 * no Data Cache e serve a MESMA versão para sempre — medido em produção
 * duas vezes (o guia de estilo em 27/08 e a página do convidado em
 * 28/08: fechava as confirmações no banco e o formulário continuava no
 * ar). Página com cookies escapa porque a requisição vira dinâmica;
 * página sem sessão só escapa por aqui.
 */
export function clienteAnonimoPublico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (i: RequestInfo | URL, x?: RequestInit) =>
          fetch(i, { ...x, cache: "no-store" }),
      },
    }
  );
}
