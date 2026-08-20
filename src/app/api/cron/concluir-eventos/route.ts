// Rotina diária: evento que já aconteceu vira "concluído".
//
// Antes disso não existia mecanismo nenhum de conclusão — nem gatilho,
// nem rotina. Um evento confirmado ficava "confirmado" para sempre, e
// como a lista ordenava por data crescente, os que já tinham acontecido
// ocupavam o topo. Na conta de teste eram 26 eventos passados, 25 deles
// ainda marcados como confirmados.
//
// Regra: conclui quando a data JÁ PASSOU (date < hoje), nunca no próprio
// dia — no dia do evento a cerimonialista ainda está trabalhando nele, e
// vê-lo virar "concluído" às 00h01 seria errado.
//
// Só mexe em 'confirmado'. Orçamento que não virou evento e cancelado
// ficam como estão: o passar do tempo não decide por eles.
//
// É reversível: a cerimonialista muda o status na tela de editar evento.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// A data de corte é a de Brasília, não a do servidor (UTC). Sem isso,
// entre 21h e 00h o servidor já estaria "no dia seguinte" e concluiria
// eventos que ainda estão acontecendo.
function hojeEmBrasilia() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
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

  const hoje = hojeEmBrasilia();

  const { data, error } = await supabase
    .from("events")
    .update({ status: "concluido" })
    .eq("status", "confirmado")
    .lt("date", hoje)
    .select("id, name, date");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    corte: hoje,
    concluidos: data?.length ?? 0,
    eventos: (data ?? []).slice(0, 20).map((e) => ({ data: e.date, nome: e.name })),
  });
}
