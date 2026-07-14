// Job diário de confirmação de fornecedores.
// Chamado pelo agendador (Vercel Cron ou pg_cron → net.http_post) com
// Authorization: Bearer CRON_SECRET. Usa a service role key porque roda
// sem sessão de usuário (varre eventos de todas as cerimonialistas).
//
// Regra: evento confirmado, ainda sem envio (confirmation_sent_at null),
// cuja data está a até `confirmation_days_before` dias (e não passou).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  enviarConfirmacaoFornecedor,
  fornecedoresDoEvento,
  type EventoParaConfirmar,
} from "@/lib/confirmacoes";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // O Next.js cacheia fetches GET em route handlers; sem isto o job
      // relê resultados velhos do Supabase entre execuções.
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
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente" },
      { status: 500 }
    );
  }

  // Janela de disparo: hoje já entrou no prazo do evento e o evento ainda
  // não aconteceu. Como days_before é configurável por evento, filtramos
  // grosseiramente no SQL (maior janela possível) e refinamos em código.
  const hoje = new Date();
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + 60); // teto: ninguém configura mais que 60 dias
  const limiteIso = limite.toISOString().slice(0, 10);

  const { data: eventos, error } = await supabase
    .from("events")
    .select(
      "id, type, date, time, location, confirmation_days_before, clients(name)"
    )
    .eq("status", "confirmado")
    .is("confirmation_sent_at", null)
    .gte("date", hojeIso)
    .lte("date", limiteIso);

  if (error) {
    return NextResponse.json(
      { error: `falha ao buscar eventos: ${error.message}` },
      { status: 500 }
    );
  }

  const resultados: {
    eventId: string;
    enviados: number;
    pulados: { supplier: string; motivo?: string }[];
  }[] = [];

  for (const raw of eventos ?? []) {
    const ev = raw as unknown as {
      id: string;
      type: string;
      date: string;
      time: string | null;
      location: string | null;
      confirmation_days_before: number | null;
      clients: { name: string } | null;
    };

    // Refino: hoje >= data - days_before?
    const diasAntes = ev.confirmation_days_before ?? 7;
    const dataEvento = new Date(`${ev.date}T00:00:00`);
    const disparo = new Date(dataEvento);
    disparo.setDate(disparo.getDate() - diasAntes);
    if (hoje < disparo) continue;

    const evento: EventoParaConfirmar = {
      id: ev.id,
      type: ev.type as EventoParaConfirmar["type"],
      date: ev.date,
      time: ev.time,
      location: ev.location,
      client_name: ev.clients?.name ?? null,
    };

    const fornecedores = await fornecedoresDoEvento(supabase, ev.id);
    let enviados = 0;
    const pulados: { supplier: string; motivo?: string }[] = [];

    for (const f of fornecedores) {
      const r = await enviarConfirmacaoFornecedor(supabase, evento, f);
      if (r.enviado) enviados += 1;
      else pulados.push({ supplier: r.supplierName, motivo: r.motivo });
    }

    // Marca o evento como processado mesmo sem fornecedores com e-mail,
    // para o job não reprocessar todo dia; o reenvio manual continua
    // disponível na aba Fornecedores.
    await supabase
      .from("events")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", ev.id);

    resultados.push({ eventId: ev.id, enviados, pulados });
  }

  return NextResponse.json({
    ok: true,
    processados: resultados.length,
    resultados,
  });
}
