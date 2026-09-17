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
import { createClient } from "@supabase/supabase-js";

/**
 * O que a rotina respondeu, em uma linha curta: só os números e sim/não do
 * primeiro nível (quantos avisos, quantos apagados). Texto livre não entra
 * no registro do painel do dono: pode carregar o que não é dele ver.
 */
function resumoDaRotina(corpo: unknown): string | null {
  if (!corpo || typeof corpo !== "object") return null;
  const partes: string[] = [];
  for (const [chave, valor] of Object.entries(corpo as Record<string, unknown>)) {
    if (typeof valor === "number" || typeof valor === "boolean") {
      partes.push(`${chave}=${valor}`);
    } else if (Array.isArray(valor)) {
      partes.push(`${chave}=${valor.length}`);
    }
  }
  const texto = partes.join(" ").slice(0, 300);
  return texto || null;
}

/** O registro de cada rotina (123, seção 10). Sem a tabela, só não registra. */
function registroDasRotinas() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i, x) => fetch(i, { ...x, cache: "no-store" }) },
  });
  return async (linha: {
    rotina: string;
    inicio: string;
    duracao_ms: number;
    ok: boolean;
    resumo: string | null;
  }) => {
    // registrar nunca vira falha da rotina
    try {
      const { error } = await db.from("rotina_execucao").insert(linha);
      if (error && !/could not find the table|does not exist|schema cache/i.test(error.message)) {
        console.error("[vela:cron] registro da rotina:", error.code);
      }
    } catch {
      console.error("[vela:cron] registro da rotina: sem resposta do banco");
    }
  };
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const ROTINAS = [
  "confirmacoes",
  "orcamentos-expirados",
  "agendamentos",
  "lembretes-convidados",
  "concluir-eventos",
  // depois de concluir-eventos: a defasagem só olha eventos que ainda
  // vão acontecer, então os que acabaram ontem já saíram de cena
  "defasagem-publico",
  "solicitacoes",
  // por último de propósito: só avisa do que vence amanhã depois que
  // concluir-eventos já tirou de cena os eventos que acabaram ontem
  "lembretes-tarefas",
  // a tela nunca recusa um cancelamento, nem quando a operadora falha —
  // esta rotina é quem insiste até a operadora confirmar, para não
  // existir "cancelada aqui, cobrando lá"
  "cancelamentos-pendentes",
  // a promoção de lançamento guarda só o dia em que a escada começou; é
  // esta rotina que troca o preço na operadora quando o degrau vira
  "promocao-degrau",
  // os e-mails do teste grátis: dia 2 e fim do teste (email-ativacao.ts).
  // O cron roda às 12h UTC — 9h em Brasília, hora de caixa de entrada.
  "ativacao",
  // o uso do sistema (painel do dono) some depois de 13 meses, e os
  // registros de rotina, e-mail, erro e IA também têm prazo
  "uso-antigo",
  // o tamanho do banco e dos arquivos, uma foto por dia (painel do dono)
  "medida-do-banco",
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
  const falharam: string[] = [];

  // Cada rotina fica registrada para a tela Sistema do painel do dono:
  // quando rodou, quanto demorou, se deu certo e os números que devolveu.
  const registrar = registroDasRotinas();

  for (const rotina of ROTINAS) {
    const inicio = new Date();
    try {
      const res = await fetch(`${base}/api/cron/${rotina}`, {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      });
      const corpo = await res.json().catch(() => ({}));
      resultado[rotina] = res.ok ? corpo : { status: res.status, ...corpo };
      if (!res.ok) {
        falharam.push(`${rotina} (${res.status})`);
        console.error(`[vela:cron] ${rotina} devolveu ${res.status}`);
      }
      await registrar?.({
        rotina,
        inicio: inicio.toISOString(),
        duracao_ms: Date.now() - inicio.getTime(),
        ok: res.ok,
        resumo: res.ok ? resumoDaRotina(corpo) : `HTTP ${res.status}`,
      });
    } catch (e) {
      // uma rotina que explode não pode impedir as outras de rodar
      const msg = e instanceof Error ? e.message : String(e);
      resultado[rotina] = { erro: msg };
      falharam.push(`${rotina} (${msg.slice(0, 40)})`);
      console.error(`[vela:cron] ${rotina} falhou: ${msg}`);
      await registrar?.({
        rotina,
        inicio: inicio.toISOString(),
        duracao_ms: Date.now() - inicio.getTime(),
        ok: false,
        // o tipo do erro, não a mensagem
        resumo: e instanceof Error ? e.name.slice(0, 60) : "falha",
      });
    }
  }

  // 200 mesmo com as sete falhando fazia a Vercel registrar a execução como
  // SUCESSO, e os erros existiam só no Runtime Log — retenção curta e sem
  // alerta nenhum. Devolvendo 500, a execução aparece como falha e a
  // notificação de cron com erro chega por e-mail.
  //
  // O caso silencioso que isto pega: se Deployment Protection for ligada em
  // Production, cada uma das 7 chamadas internas recebe 401 e NADA roda,
  // todo dia, sem ninguém saber.
  if (falharam.length > 0) {
    console.error(
      `[vela:cron] ${falharam.length} de ${ROTINAS.length} falharam: ${falharam.join(", ")}`
    );
    return NextResponse.json(
      { ok: false, falharam, resultado },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, resultado });
}
