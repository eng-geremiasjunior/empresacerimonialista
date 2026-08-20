// Rotina diária da Central de Solicitações.
//
// Ela não envia nada sozinha. Monta a fila do dia — uma batida por
// fornecedor, com tudo que a cerimonialista precisa dele — e deixa lá,
// para ela olhar e soltar. O que o sistema decide é O QUE agrupar e
// QUANDO parar de insistir; quem fala com o fornecedor continua sendo ela.
//
// Três passos:
//   1) AGRUPAR   — o que venceu (mais o que vence perto) vira batida na fila
//   2) ENCERRAR  — o que passou do prazo ou esgotou as tentativas para de
//                  cobrar e vira tarefa dela: ligar resolve o que a quarta
//                  mensagem não resolve
//
// O link do fornecedor se limpa sozinho: cada batida empurra a validade
// para 90 dias à frente, então quem parou de trabalhar com ela simplesmente
// deixa de ter link — sem ninguém precisar revogar nada.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  agrupar,
  expirou,
  precisaEscalar,
  type BatidaExistente,
  type Solicitacao,
} from "@/lib/solicitacoes-core";

export const dynamic = "force-dynamic";
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

/** Hoje em Brasília — `current_date` do Postgres é UTC e vira o dia às 21h. */
function hojeEmBrasilia(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

function um<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
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
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente" },
      { status: 500 }
    );
  }

  const hoje = hojeEmBrasilia();
  const agora = new Date().toISOString();

  const { data: linhas } = await supabase
    .from("solicitacao_fornecedor")
    .select(
      "id, empresa_id, supplier_id, event_id, task_id, tipo, titulo, status, dispara_em, prazo_ate, tentativas, enviada_em, events(name, date, status, cerimonialista_id, clients(name)), tasks(reenvio_horas)"
    )
    .in("status", ["pendente", "enviada", "reenviada"]);

  // Evento concluído ou cancelado não cobra ninguém.
  const vivas = (linhas ?? []).filter((l) => {
    const ev = um(l.events as never) as { status?: string } | null;
    return ev?.status !== "concluido" && ev?.status !== "cancelado";
  });

  const solicitacoes: Solicitacao[] = vivas.map((l) => {
    const ev = um(l.events as never) as {
      name?: string | null;
      date?: string | null;
      clients?: unknown;
    } | null;
    const cli = um((ev?.clients ?? null) as never) as { name?: string } | null;
    const tk = um(l.tasks as never) as { reenvio_horas?: number | null } | null;
    return {
      id: l.id,
      supplierId: l.supplier_id,
      eventId: l.event_id,
      tipo: l.tipo,
      titulo: l.titulo,
      status: l.status,
      disparaEm: l.dispara_em,
      prazoAte: l.prazo_ate,
      tentativas: l.tentativas ?? 0,
      enviadaEm: l.enviada_em,
      reenvioHoras: tk?.reenvio_horas ?? null,
      eventoNome: ev?.name ?? cli?.name ?? null,
      eventoData: ev?.date ?? null,
    };
  });

  // ---- 1) AGRUPAR -------------------------------------------------
  // Batida enviada há mais de uma semana não segura mais nada; o que
  // interessa ao agrupamento é a janela recente.
  const seteDias = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: batidasCru } = await supabase
    .from("batida")
    .select("supplier_id, status, programada_para, enviada_em")
    .in("status", ["na_fila", "segurada", "enviada"])
    .or(`enviada_em.is.null,enviada_em.gte.${seteDias}`);

  const batidas: BatidaExistente[] = (batidasCru ?? []).map((b) => ({
    supplierId: b.supplier_id,
    status: b.status,
    programadaPara: b.programada_para,
    enviadaEm: b.enviada_em,
  }));

  const planos = agrupar(solicitacoes, batidas, hoje, agora);
  const porId = new Map(solicitacoes.map((s) => [s.id, s]));
  const empresaPorSolicitacao = new Map(vivas.map((v) => [v.id, v.empresa_id]));
  const enfileiradas: { supplierId: string; itens: number; motivo: string }[] = [];

  for (const plano of planos) {
    const primeira = porId.get(plano.solicitacaoIds[0]);
    if (!primeira) continue;

    const { data: forn } = await supabase
      .from("suppliers")
      .select("whatsapp, phone, email")
      .eq("id", plano.supplierId)
      .maybeSingle();

    // WhatsApp sai do número dela, em um toque, pela fila. E-mail só entra
    // como canal quando não há telefone nenhum.
    const temZap = Boolean(forn?.whatsapp || forn?.phone);
    const canal = temZap ? "whatsapp" : forn?.email ? "email" : null;
    if (!canal) continue;

    const empresaId = empresaPorSolicitacao.get(primeira.id);
    if (!empresaId) continue;

    // O link do fornecedor nasce na primeira batida e se renova a cada
    // uma: relação ativa mantém o link vivo, relação que acabou o deixa
    // expirar sozinho.
    const { error: erroAcesso } = await supabase
      .from("fornecedor_acesso")
      .upsert(
        {
          empresa_id: empresaId,
          supplier_id: plano.supplierId,
          expira_em: new Date(Date.now() + 90 * 86_400_000).toISOString(),
          revogado_em: null,
        },
        { onConflict: "empresa_id,supplier_id" }
      );
    if (erroAcesso) continue;

    const { data: batida } = await supabase
      .from("batida")
      .insert({
        empresa_id: empresaId,
        supplier_id: plano.supplierId,
        canal,
        status: "na_fila",
        programada_para: agora,
      })
      .select("id")
      .single();
    if (!batida) continue;

    await supabase
      .from("solicitacao_fornecedor")
      .update({ batida_id: batida.id })
      .in("id", plano.solicitacaoIds);

    enfileiradas.push({
      supplierId: plano.supplierId,
      itens: plano.solicitacaoIds.length,
      motivo: plano.motivo,
    });
  }

  // ---- 2) ENCERRAR (vira trabalho dela) ---------------------------
  const encerradas: string[] = [];
  for (const s of solicitacoes) {
    if (!expirou(s, agora) && !precisaEscalar(s, agora)) continue;

    await supabase
      .from("solicitacao_fornecedor")
      .update({ status: "expirada", updated_at: agora })
      .eq("id", s.id);

    const linha = vivas.find((v) => v.id === s.id);
    const ev = um((linha?.events ?? null) as never) as {
      cerimonialista_id?: string | null;
    } | null;
    const { data: forn } = await supabase
      .from("suppliers")
      .select("name")
      .eq("id", s.supplierId)
      .maybeSingle();
    const nome = forn?.name ?? "o fornecedor";

    await supabase.from("tasks").insert({
      event_id: s.eventId,
      supplier_id: s.supplierId,
      title: `Falar com ${nome}: ${s.titulo}`,
      description:
        "O pedido foi enviado e não voltou resposta. Insistir por mensagem não vai resolver — uma ligação resolve.",
      due_date: hoje,
      status: "pendente",
      priority: "alta",
      category: "fornecedor",
    });

    if (ev?.cerimonialista_id) {
      await supabase.from("notifications").insert({
        cerimonialista_id: ev.cerimonialista_id,
        empresa_id: empresaPorSolicitacao.get(s.id),
        type: "fornecedor",
        title: `${nome} não respondeu`,
        message: `${s.titulo} — virou tarefa para você ligar.`,
        link: `/eventos/${s.eventId}/organizacao`,
      });
    }
    encerradas.push(s.id);
  }

  return NextResponse.json({
    ok: true,
    hoje,
    enfileiradas,
    encerradas: encerradas.length,
  });
}
