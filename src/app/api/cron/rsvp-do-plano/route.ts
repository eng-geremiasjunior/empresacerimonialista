// A confirmação de presença só nos planos pagos (204, 09/10/2026): todo
// dia, os eventos de quem está no Gratuito (o teste que venceu, o plano
// que caiu) ficam com o link de confirmação fechado. Mesmo padrão do
// /api/cron/orcamentos-expirados: Authorization: Bearer CRON_SECRET +
// service role.

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

  const { data, error } = await supabase.rpc("fechar_rsvp_do_gratuito");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ fechados: data ?? 0 });
}
