// Rotina diária: o uso do sistema (painel do dono, 123 seção 5) some
// depois de 13 meses, como diz a política de privacidade. Mesmo padrão das
// outras rotinas: Authorization: Bearer CRON_SECRET + service role.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hojeBR, somarDias } from "@/lib/tempo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const fetchCache = "force-no-store";

/** 13 meses, contados por folga em dias. */
const GUARDAR_DIAS = 400;

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

  const limite = somarDias(hojeBR(), -GUARDAR_DIAS);
  const { count, error } = await supabase
    .from("uso_diario")
    .delete({ count: "exact" })
    .lt("dia", limite);
  if (error) {
    // sem a 123 reaplicada não há o que apagar
    if (/could not find the table|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ apagados: 0, semTabela: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ apagados: count ?? 0 });
}
