// A defasagem do público, verificada uma vez por dia.
// Mesmo padrão do /api/cron/orcamentos-expirados: Authorization: Bearer
// CRON_SECRET + service role (roda sem sessão, varre todas as empresas).
//
// A conta inteira mora no banco (RPC da 137): compara o público de hoje
// com a base que dimensionou cada item da Operação e abre/atualiza/
// resolve a pendência de revisão. Aqui só se dispara e se reporta.
// Dinheiro não se move: pendência é rascunho, quem decide é ela.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
// Sem isto cai no padrão do plano (10s no Hobby) e um 504 mata a rotina
// no meio, em silêncio — o despachante nem saberia dizer qual parou.
export const maxDuration = 60;
export const fetchCache = "force-no-store";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no ambiente" },
      { status: 500 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase.rpc("abrir_pendencias_defasagem");
  if (error) {
    // função ainda não existe = migração 137 pendente. Degrada dizendo
    // isso, em vez de derrubar o despachante inteiro todo dia às 9h.
    if (error.code === "PGRST202") {
      return NextResponse.json({ pulado: "migração 137 ainda não aplicada" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? { abertas: 0, resolvidas: 0 });
}
