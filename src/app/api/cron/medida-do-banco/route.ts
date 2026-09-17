// Rotina diária: a foto do tamanho do banco e dos arquivos (painel do dono,
// 123 seção 10). Uma linha por dia; é dela que a tela Sistema tira o
// crescimento. Mesmo padrão das outras rotinas: Bearer CRON_SECRET +
// service role.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const fetchCache = "force-no-store";

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 500 }
    );
  }
  const db = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i, x) => fetch(i, { ...x, cache: "no-store" }) },
  });

  const { error } = await db.rpc("registrar_medida_diaria");
  if (error) {
    // sem a 123 reaplicada, a função ainda não existe: nada a medir
    if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) {
      return NextResponse.json({ medido: false, semFuncao: true });
    }
    return NextResponse.json({ error: error.code ?? "falha" }, { status: 500 });
  }
  return NextResponse.json({ medido: true });
}
