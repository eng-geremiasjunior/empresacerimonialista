// Rotina diária: o cadastro da conta da festa que ninguém confirmou some
// depois de 3 dias (desde 01/10/2026).
//
// O cadastro nasce sem confirmar (187, criar-conta/actions.ts): o login,
// a senha e os dados da festa em app_metadata.familia_pendente — nada de
// empresa nem evento. Se o e-mail foi digitado errado, esse login ficaria
// para sempre no endereço de outra pessoa: o dono de verdade não
// conseguiria criar a conta dele ("já existe"), e um "esqueci a senha"
// dele abriria a festa de um estranho. Apagar o pendente antigo devolve
// o endereço. Só apaga login NÃO confirmado E com a marca de festa
// pendente: nenhuma conta de verdade passa por aqui.
//
// Mesmo padrão das outras rotinas: Authorization: Bearer CRON_SECRET +
// chave de serviço. Saída: só contagens.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const fetchCache = "force-no-store";

const PRAZO_MS = 3 * 24 * 60 * 60 * 1000;
const POR_PAGINA = 1000;
const PAGINAS_NO_MAXIMO = 20;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado no ambiente" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });
  }
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });

  const limite = Date.now() - PRAZO_MS;
  let lidos = 0;
  let apagados = 0;
  let falhas = 0;
  for (let pagina = 1; pagina <= PAGINAS_NO_MAXIMO; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: POR_PAGINA });
    if (error) {
      console.error("[eorganizei:contas-pendentes] listar:", error.code ?? "sem código");
      return NextResponse.json({ error: "não foi possível listar os logins", lidos, apagados }, { status: 500 });
    }
    const usuarios = data?.users ?? [];
    lidos += usuarios.length;
    for (const u of usuarios) {
      const pendente = (u.app_metadata as { familia_pendente?: unknown } | undefined)?.familia_pendente;
      if (u.email_confirmed_at || !pendente) continue;
      if (new Date(u.created_at).getTime() > limite) continue;
      const { error: erroApagar } = await db.auth.admin.deleteUser(u.id);
      if (erroApagar) {
        falhas++;
        console.error("[eorganizei:contas-pendentes] apagar:", erroApagar.code ?? "sem código");
      } else {
        apagados++;
      }
    }
    if (usuarios.length < POR_PAGINA) break;
  }
  return NextResponse.json({ lidos, apagados, falhas });
}
