// O aviso "na hora" do banco (168): o gatilho da fila chama esta rota
// pelo pg_net com o segredo que só o banco conhece. A rota confere o
// segredo contra a linha de ajuste e processa a fila — a mesma função da
// rotina diária.
//
// Pública no middleware SÓ por causa disso; sem o segredo é 401.

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { googleConfigurado } from "@/lib/google/oauth";
import { processarFila } from "@/lib/google/fila";
import { servicoGoogle } from "@/lib/google/servico";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: NextRequest) {
  const db = servicoGoogle();
  const { data } = await db.from("google_agenda_ajuste").select("segredo").eq("id", 1).maybeSingle();
  const esperado = (data as { segredo?: string } | null)?.segredo ?? "";
  const recebido = request.headers.get("x-eorg-fila") ?? "";
  if (!esperado || !recebido || !iguais(recebido, esperado)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!googleConfigurado()) return NextResponse.json({ ok: true, pulou: "GOOGLE_CLIENT_ID ausente" });

  try {
    const resumo = await processarFila(db, { max: 40, tempoMaxMs: 45_000 });
    return NextResponse.json({ ok: true, ...resumo });
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 200);
    console.error("[vela:google] fila:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
