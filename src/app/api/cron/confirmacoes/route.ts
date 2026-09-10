// Job diário de confirmação de fornecedores.
// Chamado pelo agendador (Vercel Cron ou pg_cron → net.http_post) com
// Authorization: Bearer CRON_SECRET. Usa a service role key porque roda
// sem sessão de usuário (varre eventos de todas as cerimonialistas).
//
// A REGRA, DESDE A 157: a vez é de cada FORNECEDOR, não do evento. Cada
// vínculo pode ter a sua data (`roteiro_links.confirmar_em`); quem não
// tem segue o padrão do evento (`confirmation_days_before`, 7 por
// omissão). O buffet confirma com um mês, a banda com uma semana.
//
// O QUE MUDOU NA MECÂNICA. Antes o job só olhava eventos com
// `confirmation_sent_at` nulo e carimbava essa coluna ao fim: um envio
// por evento. Com datas diferentes, esse carimbo viraria uma tranca — o
// primeiro fornecedor a sair fecharia a porta para todos os outros, em
// silêncio. Agora o "já foi" é lido por fornecedor, em
// supplier_confirmations.sent_at, e o carimbo do evento só é escrito
// quando não sobra ninguém a enviar: virou registro, não tranca.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  enviarConfirmacaoFornecedor,
  fornecedoresDoEvento,
  jaConvidados,
  type EventoParaConfirmar,
} from "@/lib/confirmacoes";
import { hojeBR, somarDias } from "@/lib/tempo";

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

  // Janela de disparo: o evento ainda não aconteceu e está perto o
  // bastante para alguém dele poder ter chegado a vez. Filtramos
  // grosseiramente no SQL (maior janela possível) e refinamos em código,
  // fornecedor por fornecedor.
  //
  // `confirmation_sent_at` saiu do filtro: ele era a tranca por evento, e
  // manter aqui esconderia justamente o fornecedor cuja data ainda não
  // tinha chegado quando o primeiro saiu. Quem impede a repetição agora é
  // o sent_at de cada um.
  const hojeIso = hojeBR();
  // teto: ninguém configura mais que 60 dias
  const limiteIso = somarDias(hojeIso, 60);

  const { data: eventos, error } = await supabase
    .from("events")
    .select(
      "id, type, date, time, location, confirmation_days_before, whatsapp_auto, clients(name)"
    )
    .eq("status", "confirmado")
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
    aguardandoAVez?: number;
    repetiraAmanha?: boolean;
  }[] = [];

  for (const raw of eventos ?? []) {
    const ev = raw as unknown as {
      id: string;
      type: string;
      date: string;
      time: string | null;
      location: string | null;
      confirmation_days_before: number | null;
      whatsapp_auto: boolean | null;
      clients: { name: string } | null;
    };

    // O padrão do evento — vale para quem não escolheu data própria.
    // Comparação por string ISO: sem Date e sem o fuso do runtime no meio.
    const diasAntes = ev.confirmation_days_before ?? 7;
    const padraoIso = somarDias(ev.date, -diasAntes);

    const evento: EventoParaConfirmar = {
      id: ev.id,
      type: ev.type as EventoParaConfirmar["type"],
      date: ev.date,
      time: ev.time,
      location: ev.location,
      client_name: ev.clients?.name ?? null,
      whatsapp_auto: ev.whatsapp_auto ?? true,
    };

    const fornecedores = await fornecedoresDoEvento(supabase, ev.id);
    const convidados = await jaConvidados(supabase, ev.id);
    let enviados = 0;
    let falhouEntrega = false;
    let aguardandoAVez = 0;
    const pulados: { supplier: string; motivo?: string }[] = [];

    for (const f of fornecedores) {
      // Já recebeu o convite automático: repetir é decisão dela, no
      // botão da tela. O job não insiste.
      if (convidados.has(f.id)) continue;

      // A data dele, ou o padrão do evento.
      const quandoIso = f.confirmarEm ?? padraoIso;
      if (hojeIso < quandoIso) {
        aguardandoAVez += 1;
        continue;
      }

      const r = await enviarConfirmacaoFornecedor(supabase, evento, f);
      if (r.enviado) enviados += 1;
      else {
        if (r.falhouEntrega) falhouEntrega = true;
        pulados.push({ supplier: r.supplierName, motivo: r.motivo });
      }
    }

    // O carimbo do evento não tranca mais nada (o sent_at de cada
    // fornecedor faz isso); ele registra "este evento terminou a rodada".
    // Por isso só é escrito quando não sobra ninguém esperando a vez — e
    // nunca quando uma entrega FALHOU, porque amanhã pode funcionar (é o
    // caso enquanto o domínio de e-mail não está verificado).
    if (!falhouEntrega && aguardandoAVez === 0) {
      await supabase
        .from("events")
        .update({ confirmation_sent_at: new Date().toISOString() })
        .eq("id", ev.id);
    }

    // Evento em que ninguém tinha vez hoje não vira linha de relatório:
    // com a janela de 60 dias, isso seria a maioria deles todo dia.
    if (enviados === 0 && pulados.length === 0) continue;

    resultados.push({
      eventId: ev.id,
      enviados,
      pulados,
      ...(aguardandoAVez ? { aguardandoAVez } : {}),
      ...(falhouEntrega ? { repetiraAmanha: true } : {}),
    });
  }

  return NextResponse.json({
    ok: true,
    processados: resultados.length,
    resultados,
  });
}
