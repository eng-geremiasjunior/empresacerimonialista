// A varredura diária da fila do Google Agenda (168): o que o aviso na
// hora não conseguiu (pg_net desligado, Google fora, recuo depois de uma
// falha) sai daqui. Mesma função da rota /api/google/fila.

import { NextRequest, NextResponse } from "next/server";
import { googleConfigurado } from "@/lib/google/oauth";
import { chamarDeNovoSeSobrou, processarFila } from "@/lib/google/fila";
import { servicoGoogle } from "@/lib/google/servico";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado no ambiente" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!googleConfigurado()) return NextResponse.json({ ok: true, pulou: "GOOGLE_CLIENT_ID ausente" });

  const db = servicoGoogle();
  // sem a 168 aplicada a função não existe: dizer isso é melhor que
  // derrubar o despachante
  const { error } = await db.from("google_agenda_fila").select("id", { count: "exact", head: true });
  if (error) return NextResponse.json({ ok: true, pulou: `fila indisponível: ${error.message.slice(0, 80)}` });

  try {
    const resumo = await processarFila(db, { max: 150, tempoMaxMs: 50_000 });
    // o que sobrar segue pelo caminho rápido, sem esperar amanhã
    const continua = await chamarDeNovoSeSobrou(db);
    return NextResponse.json({ ok: true, ...resumo, continua });
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 200);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
