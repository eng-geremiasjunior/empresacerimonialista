// Lembrete de véspera.
//
// Até esta rotina existir, o eOrganizei nunca avisou a cerimonialista de nada.
// As tarefas nasciam com prazo, venciam, atrasavam — e a única forma de
// descobrir era abrir a tela. O verificador do navegador (5 minutos)
// exige due_time, e as tarefas do método nascem sem hora: a tarefa
// "Registrar o valor no financeiro" nunca entrou nele.
//
// O que esta rotina faz, uma vez por dia, às 9h de Brasília:
//   1) lê o que vence AMANHÃ e ainda não foi avisado
//   2) resolve QUEM responde por cada tarefa (responsável do evento; sem
//      ela, quem criou) e descarta quem saiu da equipe
//   3) monta UMA entrega por pessoa — não uma por tarefa
//   4) entrega pelo sino e, se houver transporte e consentimento, pelo
//      WhatsApp com o mesmo texto
//   5) só então marca tasks.notified
//
// A ordem do passo 5 é deliberada: marcar antes de entregar transforma
// uma falha de rede em silêncio permanente.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  janelaDoAviso,
  montarLembretes,
  type TarefaDeVespera,
} from "@/lib/avisos-core";
import { entregarLembrete } from "@/lib/avisos-transporte";
import { appUrl } from "@/lib/email";

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
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

function um<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

type Perfil = {
  userId: string;
  nome: string;
  whatsapp: string | null;
  aceitaWhatsapp: boolean;
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

  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente" },
      { status: 500 }
    );
  }

  const janela = janelaDoAviso();

  // Dois dias, uma passada. Amanhã é a promessa; hoje é a rede para o que
  // nasceu depois da rotina de ontem e perderia a véspera em silêncio.
  const { data: linhas, error: erroLeitura } = await supabase
    .from("tasks")
    .select(
      "id, title, due_date, status, priority, event_id, events(name, status, empresa_id, cerimonialista_id, cerimonialista_responsavel_id, clients(name))"
    )
    .in("due_date", [janela.hoje, janela.amanha])
    .eq("notified", false)
    .neq("status", "concluido");

  if (erroLeitura) {
    console.error(`[vela:lembretes] leitura falhou: ${erroLeitura.message}`);
    return NextResponse.json({ error: erroLeitura.message }, { status: 500 });
  }

  if (!linhas || linhas.length === 0) {
    return NextResponse.json({
      ok: true,
      ...janela,
      lidas: 0,
      avisadas: 0,
      semDestinatario: 0,
      entregas: [],
    });
  }

  // ---- quem responde por cada tarefa ------------------------------
  // Preferência: a responsável pelo evento (022). Sem ela, quem criou.
  // Nos dois casos a pessoa precisa estar ATIVA na equipe — quem saiu
  // não recebe mais aviso nenhum.
  type Linha = (typeof linhas)[number];
  const evDe = (l: Linha) =>
    um(l.events as never) as {
      name?: string | null;
      status?: string | null;
      empresa_id?: string | null;
      cerimonialista_id?: string | null;
      cerimonialista_responsavel_id?: string | null;
      clients?: unknown;
    } | null;

  const membroIds = [
    ...new Set(
      linhas
        .map((l) => evDe(l)?.cerimonialista_responsavel_id)
        .filter((v): v is string => Boolean(v))
    ),
  ];
  const criadorIds = [
    ...new Set(
      linhas
        .map((l) => evDe(l)?.cerimonialista_id)
        .filter((v): v is string => Boolean(v))
    ),
  ];

  const perfilPorMembro = new Map<string, Perfil>();
  const perfilPorUsuario = new Map<string, Perfil>();

  const colunas = "id, user_id, nome, whatsapp, avisar_whatsapp, status, created_at";

  if (membroIds.length > 0) {
    const { data, error } = await supabase
      .from("membros_equipe")
      .select(colunas)
      .in("id", membroIds)
      .eq("status", "ativo");
    if (error) {
      // engolir isto silenciaria TODO MUNDO como "sem destinatária" e a
      // tarefa nunca mais seria avisada — abortar deixa para amanhã
      console.error(`[vela:lembretes] membros falhou: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    for (const m of data ?? []) {
      if (!m.user_id) continue; // membro cadastrado sem login ainda
      perfilPorMembro.set(m.id, {
        userId: m.user_id,
        nome: m.nome ?? "",
        whatsapp: m.whatsapp ?? null,
        aceitaWhatsapp: m.avisar_whatsapp === true,
      });
    }
  }

  if (criadorIds.length > 0) {
    const { data, error } = await supabase
      .from("membros_equipe")
      .select(colunas)
      .in("user_id", criadorIds)
      .eq("status", "ativo")
      .order("created_at", { ascending: true });
    if (error) {
      console.error(`[vela:lembretes] criadoras falhou: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // a mesma pessoa pode ser membro de duas empresas: a primeira linha
    // vence, que é a mesma regra do meu_cargo()
    for (const m of data ?? []) {
      if (!m.user_id || perfilPorUsuario.has(m.user_id)) continue;
      perfilPorUsuario.set(m.user_id, {
        userId: m.user_id,
        nome: m.nome ?? "",
        whatsapp: m.whatsapp ?? null,
        aceitaWhatsapp: m.avisar_whatsapp === true,
      });
    }
  }

  const semDestinatario: string[] = [];
  const tarefas: TarefaDeVespera[] = [];

  for (const l of linhas) {
    const ev = evDe(l);
    const cli = um((ev?.clients ?? null) as never) as { name?: string } | null;

    const perfil =
      (ev?.cerimonialista_responsavel_id
        ? perfilPorMembro.get(ev.cerimonialista_responsavel_id)
        : null) ??
      (ev?.cerimonialista_id ? perfilPorUsuario.get(ev.cerimonialista_id) : null);

    if (!perfil) {
      semDestinatario.push(l.id);
      continue;
    }

    tarefas.push({
      id: l.id,
      titulo: l.title,
      dueDate: l.due_date as string,
      status: l.status,
      priority: l.priority ?? null,
      eventId: l.event_id,
      eventoNome: ev?.name ?? cli?.name ?? null,
      eventoStatus: ev?.status ?? null,
      destinatarioUserId: perfil.userId,
      destinatarioNome: perfil.nome,
      destinatarioWhatsapp: perfil.whatsapp,
      destinatarioAceitaWhatsapp: perfil.aceitaWhatsapp,
      empresaId: ev?.empresa_id ?? null,
    });
  }

  // ---- montar e entregar ------------------------------------------
  const lembretes = montarLembretes(tarefas, janela, appUrl());
  const entregas = [];

  for (const lembrete of lembretes) {
    const r = await entregarLembrete(supabase, lembrete);

    if (r.sino) {
      const { error: erroMarca } = await supabase
        .from("tasks")
        .update({ notified: true })
        .in("id", lembrete.tarefaIds);
      if (erroMarca) {
        // entregou mas não marcou: sai de novo amanhã. Duplicar um aviso
        // é menos ruim que engolir um — mas precisa aparecer no log.
        console.error(`[vela:lembretes] marca falhou: ${erroMarca.message}`);
      }
    } else {
      console.error(`[vela:lembretes] sino falhou: ${r.erro}`);
    }

    entregas.push({
      // id interno, não dado pessoal: é o que permite conferir para quem
      // cada entrega foi sem despejar nome e telefone no log da rotina
      destinatario: r.destinatarioUserId,
      tarefas: r.tarefas,
      sino: r.sino,
      whatsapp: r.whatsapp,
      ...(r.erro ? { erro: r.erro } : {}),
    });
  }

  // Números honestos: "lidas" é o que a consulta trouxe, "avisadas" é o
  // que virou aviso de verdade. A diferença entre os dois é o que foi
  // descartado por evento concluído/cancelado — sem os dois campos, a
  // rotina parece ter avisado sobre um evento que não cobra ninguém.
  const avisadas = lembretes.reduce((n, l) => n + l.tarefaIds.length, 0);

  return NextResponse.json({
    ok: true,
    ...janela,
    lidas: linhas.length,
    avisadas,
    semDestinatario: semDestinatario.length,
    entregas,
  });
}
