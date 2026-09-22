// O cliente de serviço da integração com o Google: as tabelas da 168 não
// têm policy nenhuma, e é de propósito — só o servidor lê a chave cifrada
// e mexe na fila.

import "server-only";

import { createClient } from "@supabase/supabase-js";

export function servicoGoogle() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: {
      fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }),
    },
  });
}

export type ServicoGoogle = ReturnType<typeof servicoGoogle>;

export type Conexao = {
  user_id: string;
  empresa_id: string;
  google_email: string | null;
  refresh_token_cifrado: string;
  calendario_id: string | null;
  pode_ler_ocupado: boolean;
  falha: "token" | "agenda" | null;
  avisado_em: string | null;
};
