// Job diário do lembrete aos convidados.
//
// Mesmo molde do cron de confirmação de fornecedores: Bearer
// CRON_SECRET, service role (roda sem sessão, varre eventos de todas as
// cerimonialistas), fetch sem cache.
//
// A diferença é quem manda: aqui o gatilho é da CLIENTE, que escolheu
// quantos dias antes o lembrete sai. Quem não configurou não recebe
// nada — silêncio é o padrão.
//
// Cada convidado recebe no máximo um lembrete. A marca é gravada por
// pessoa (não por evento), então uma lista que cresce depois do disparo
// ainda alcança quem entrou.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enviarLembreteConvidado } from "@/lib/email-convidado";

export const dynamic = "force-dynamic";
// Sem isto cai no padrão do plano (10s no Hobby) e um 504 mata a rotina
// no meio, em silêncio — o despachante nem saberia dizer qual parou.
export const maxDuration = 60;
export const fetchCache = "force-no-store";

const CONVITE_PARA: Record<string, string> = {
  casamento: "o casamento de",
  debutante: "os 15 anos de",
  aniversario: "o aniversário de",
  bodas: "as bodas de",
  formatura: "a formatura de",
  batizado: "o batizado de",
  cha_revelacao: "o chá revelação de",
  corporativo: "o evento de",
};

// Teto por execução: se uma lista tiver 800 pessoas, o job não estoura o
// tempo da função nem a cota do provedor de e-mail. O que sobrar sai no
// dia seguinte, porque a marca é por pessoa.
// 120 era um POST ao Resend por convidado, em série, mais um round-trip
// ao banco a cada sucesso — com uma lista de casamento de verdade isso
// estoura o tempo antes do fim. A fila sobrevive: a rotina devolve
// `restam` e só marca depois do envio dar certo, então o resto sai amanhã.
const MAX_POR_EXECUCAO = 40;

type Linha = {
  convidado_id: string;
  hash: string;
  nome: string;
  email: string;
  confirmado: boolean;
  pessoas: number;
  event_id: string;
  evento_tipo: string;
  evento_data: string;
  evento_hora: string | null;
  evento_local: string | null;
  evento_cidade: string | null;
  anfitrioes: string;
};

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
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente" },
      { status: 500 }
    );
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) },
  });

  const { data, error } = await supabase.rpc("convidados_para_lembrete");
  if (error) {
    return NextResponse.json(
      { error: `falha ao buscar convidados: ${error.message}` },
      { status: 500 }
    );
  }

  const fila = (data as Linha[] | null) ?? [];
  const lote = fila.slice(0, MAX_POR_EXECUCAO);

  let enviados = 0;
  const falhas: { nome: string; motivo: string }[] = [];

  for (const c of lote) {
    const r = await enviarLembreteConvidado({
      para: c.email,
      nome: c.nome,
      anfitrioes: c.anfitrioes,
      convitePara: CONVITE_PARA[c.evento_tipo] ?? "o evento de",
      data: c.evento_data,
      hora: c.evento_hora,
      local: c.evento_local,
      cidade: c.evento_cidade,
      confirmado: c.confirmado,
      pessoas: c.pessoas,
      hash: c.hash,
    });

    if (r.ok) {
      // marca só depois do envio dar certo: se o Resend falhar, a pessoa
      // continua na fila de amanhã em vez de perder o lembrete
      await supabase.rpc("marcar_lembrete_enviado", { p_convidado_id: c.convidado_id });
      enviados += 1;
    } else {
      falhas.push({ nome: c.nome, motivo: r.error ?? "desconhecido" });
    }
  }

  return NextResponse.json({
    ok: true,
    naFila: fila.length,
    enviados,
    restam: Math.max(0, fila.length - lote.length),
    falhas: falhas.slice(0, 10),
  });
}
