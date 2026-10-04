// Os presentes que ficaram sem resposta (197). Quem confirma o Pix é a
// página do convidado (pergunta à rota de estado) e o aviso da Pagar.me;
// se o convidado fechou a página e o aviso não chegou — ou chegou quando a
// leitura falhou —, o presente pago ficaria de fora dos recebidos e
// voltaria a aparecer livre na lista. Uma vez por dia, a verdade é relida
// na Pagar.me:
//   · o Pix "aguardando" que já venceu;
//   · o "expirado" ou "falhou" das últimas 48 h (a confirmação que chegou
//     depois do prazo: o dinheiro está com a família).
// A fila gira: cada leitura marca conferido_em, e quem foi conferido há
// mais tempo vem primeiro — um pedido que nunca se deixa ler não trava os
// outros.
//
// E duas limpezas:
//   · o que ficou aguardando SEM pedido (a rota caiu entre gravar e falar
//     com a Pagar.me) vira "falhou" depois de uma hora: nunca houve Pix;
//   · o Pix que não foi pago não guarda e-mail nem recado depois de 7 dias.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lerPedido } from "@/lib/pagarme-lista";
import { gravarEstadoDoPresente } from "@/lib/supabase/presente-pagamento";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const fetchCache = "force-no-store";

// leituras por rodada: cabe nos 60 s com folga (cada uma leva ~0,3 s)
const POR_RODADA = 80;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

type Linha = { id: string; status: string; pagarme_order_id: string; expira_em: string | null; meio: string | null };

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado no ambiente" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });

  const minutosAtras = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
  const campos = "id, status, pagarme_order_id, expira_em, meio";

  // aguardando, vencido há mais de 10 min (o Pix pago no último minuto já caiu)
  const vencidos = await db
    .from("presente_pagamento")
    .select(campos)
    .eq("status", "aguardando")
    .not("pagarme_order_id", "is", null)
    .lt("expira_em", minutosAtras(10))
    .order("conferido_em", { ascending: true, nullsFirst: true })
    .limit(POR_RODADA);
  if (vencidos.error) {
    // sem a 197 aplicada a tabela não existe: nada a conferir
    if (/does not exist|schema cache|could not find/i.test(vencidos.error.message)) return NextResponse.json({ conferidos: 0 });
    return NextResponse.json({ error: vencidos.error.code ?? "leitura" }, { status: 500 });
  }
  const sobra = POR_RODADA - (vencidos.data?.length ?? 0);
  const tardios =
    sobra > 0
      ? await db
          .from("presente_pagamento")
          .select(campos)
          .in("status", ["expirado", "falhou"])
          .not("pagarme_order_id", "is", null)
          .gt("created_at", minutosAtras(48 * 60))
          .or(`conferido_em.is.null,conferido_em.lt."${minutosAtras(6 * 60)}"`)
          .order("conferido_em", { ascending: true, nullsFirst: true })
          .limit(sobra)
      : { data: [] };

  let pagos = 0;
  let semLeitura = 0;
  const contagem: Record<string, number> = {};
  for (const p of [...((vencidos.data ?? []) as Linha[]), ...((tardios.data ?? []) as Linha[])]) {
    const r = await lerPedido(p.pagarme_order_id);
    if (!r.ok) {
      semLeitura++;
      // a fila gira: este vai para o fim
      await db.from("presente_pagamento").update({ conferido_em: new Date().toISOString() }).eq("id", p.id);
      continue;
    }
    const estado = await gravarEstadoDoPresente(db, p, r.dados);
    if (estado !== p.status) contagem[estado] = (contagem[estado] ?? 0) + 1;
    if (estado === "pago" && p.status !== "pago") pagos++;
    // o que não mudou também conta como conferido (vai para o fim da fila)
    if (estado === p.status) {
      await db.from("presente_pagamento").update({ conferido_em: new Date().toISOString() }).eq("id", p.id);
    }
  }

  // aguardando sem pedido há mais de 1 h: o Pix nunca existiu
  const { data: orfaos } = await db
    .from("presente_pagamento")
    .update({ status: "falhou", updated_at: new Date().toISOString() })
    .eq("status", "aguardando")
    .is("pagarme_order_id", null)
    .lt("created_at", minutosAtras(60))
    .select("id");

  // o Pix que não foi pago não guarda e-mail nem recado depois de 7 dias
  const { data: limpos } = await db
    .from("presente_pagamento")
    .update({ email: null, recado: null })
    .in("status", ["expirado", "falhou"])
    .lt("created_at", minutosAtras(7 * 24 * 60))
    .or("email.not.is.null,recado.not.is.null")
    .select("id");

  return NextResponse.json({
    conferidos: (vencidos.data?.length ?? 0) + (tardios.data?.length ?? 0),
    pagos,
    expirados: contagem.expirado ?? 0,
    falharam: contagem.falhou ?? 0,
    sem_leitura: semLeitura,
    sem_pedido: orfaos?.length ?? 0,
    dados_apagados: limpos?.length ?? 0,
  });
}
