// Rotina diária dos e-mails do teste grátis (email-ativacao.ts).
//
// Chamada pelo despachante (/api/cron/diario) com o mesmo segredo. Olha só
// contas em teste e manda, no máximo, uma mensagem por conta por dia —
// dia 2 ou fim do teste, e o de boas-vindas que não saiu na hora.

import { NextRequest, NextResponse } from "next/server";
import { rodarAtivacao } from "@/lib/email-ativacao";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

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

  try {
    const resumo = await rodarAtivacao();
    return NextResponse.json({ ok: true, ...resumo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[eorg:cron] ativacao:", msg);
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}
