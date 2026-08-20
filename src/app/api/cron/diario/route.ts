// Despachante das rotinas diárias.
//
// O vercel.json declarava quatro crons, um por rotina. O número de vagas
// de cron depende do plano da Vercel, e uma vaga a menos não dá erro:
// a rotina simplesmente nunca roda, em silêncio. Confirmação de
// fornecedor não sai, orçamento vencido continua aceitando aceite,
// convidado não recebe lembrete — e nada na tela conta isso.
//
// Com um cron só, o agendamento para de depender do plano. Esta rota
// chama as quatro em sequência, com o mesmo segredo, e devolve o
// resultado de cada uma. Sequencial de propósito: são tarefas de fundo
// sem pressa, e uma de cada vez mantém o uso de conexão previsível.
//
// As rotas individuais continuam existindo e protegidas — servem para
// disparar uma única rotina à mão quando preciso investigar algo.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const ROTINAS = [
  "confirmacoes",
  "orcamentos-expirados",
  "agendamentos",
  "lembretes-convidados",
  "concluir-eventos",
] as const;

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

  // Mesma origem da requisição: funciona em produção, em preview e local,
  // sem depender de variável de endereço.
  const base = new URL(request.url).origin;
  const resultado: Record<string, unknown> = {};

  for (const rotina of ROTINAS) {
    try {
      const res = await fetch(`${base}/api/cron/${rotina}`, {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      });
      const corpo = await res.json().catch(() => ({}));
      resultado[rotina] = res.ok ? corpo : { status: res.status, ...corpo };
      if (!res.ok) console.error(`[vela:cron] ${rotina} devolveu ${res.status}`);
    } catch (e) {
      // uma rotina que explode não pode impedir as outras de rodar
      const msg = e instanceof Error ? e.message : String(e);
      resultado[rotina] = { erro: msg };
      console.error(`[vela:cron] ${rotina} falhou: ${msg}`);
    }
  }

  return NextResponse.json(resultado);
}
