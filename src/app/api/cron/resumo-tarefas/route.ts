// O resumo diário de tarefas por e-mail (19/10/2026). Roda no despachante
// das 9h, depois do aviso da véspera no sino. Um e-mail por pessoa, só nos
// dias em que há o que dizer (regras em lib/resumo-de-tarefas.ts).
//
// Quem recebe cada tarefa: a mesma régua do aviso da véspera — na tarefa
// do evento, a responsável pelo evento ou, sem ela, quem criou o evento;
// na tarefa dela (217), quem criou. Sempre só quem está ATIVO na equipe.
// Fica de fora: quem desligou o resumo em Configurações
// (user_metadata.resumo_tarefas_email === false) e conta congelada.
//
// Tarefa de evento que já aconteceu, foi concluído ou cancelado é peso
// morto, não pendência (a mesma regra do Copiloto). O evento de exemplo
// não cobra ninguém. Nada pessoal no log: só contagens.
//
// Dois modos de teste, os dois atrás da mesma senha da rotina:
//   ?simular=1   conta quem receberia e não envia nada;
//   ?para=<id>   envia só para esta conta (auth.users), para ver o e-mail.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { appUrl, enviarViaResend } from "@/lib/email";
import { comAssunto, tituloDoEmbed } from "@/lib/assunto-da-tarefa";
import { hojeBR, somarDias } from "@/lib/tempo";
import { assuntoDoResumo, deveEnviar, htmlDoResumo, type ItemDoResumo } from "@/lib/resumo-de-tarefas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const fetchCache = "force-no-store";

/** O que passou disto não é pendência, é lista esquecida. */
const DIAS_PARA_TRAS = 120;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

const um = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado no ambiente" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });

  const simular = request.nextUrl.searchParams.get("simular") === "1";
  const so = request.nextUrl.searchParams.get("para");
  const hoje = hojeBR();
  const amanha = somarDias(hoje, 1);
  const desde = somarDias(hoje, -DIAS_PARA_TRAS);

  const [tarefasRes, livresRes] = await Promise.all([
    db
      .from("tasks")
      .select(
        "id, title, due_date, evento_decisao(titulo), events!inner(name, date, status, exemplo, empresa_id, cerimonialista_id, cerimonialista_responsavel_id, clients(name))"
      )
      .neq("status", "concluido")
      .gte("due_date", desde)
      .lte("due_date", amanha)
      .eq("events.exemplo", false)
      .gte("events.date", hoje)
      .limit(5000),
    db
      .from("tarefa_livre")
      .select("titulo, prazo, criado_por, empresa_id")
      .is("feita_em", null)
      .gte("prazo", desde)
      .lte("prazo", amanha)
      .limit(5000),
  ]);
  if (tarefasRes.error) {
    console.error("[vela:resumo] tarefas:", tarefasRes.error.message);
    return NextResponse.json({ error: tarefasRes.error.message }, { status: 500 });
  }
  if (livresRes.error) console.error("[vela:resumo] tarefas livres:", livresRes.error.message);

  type Ev = {
    name: string | null;
    status: string | null;
    empresa_id: string | null;
    cerimonialista_id: string | null;
    cerimonialista_responsavel_id: string | null;
    clients: unknown;
  };
  const tarefas = (tarefasRes.data ?? []) as unknown as {
    title: string;
    due_date: string;
    evento_decisao?: unknown;
    events: Ev | Ev[];
  }[];
  const livres = (livresRes.error ? [] : livresRes.data ?? []) as {
    titulo: string;
    prazo: string;
    criado_por: string | null;
    empresa_id: string | null;
  }[];

  // ---- quem responde: membros ativos, por id de membro e por usuário ----
  const membroIds = new Set<string>();
  const usuarioIds = new Set<string>();
  for (const t of tarefas) {
    const ev = um(t.events);
    if (ev?.cerimonialista_responsavel_id) membroIds.add(ev.cerimonialista_responsavel_id);
    if (ev?.cerimonialista_id) usuarioIds.add(ev.cerimonialista_id);
  }
  for (const t of livres) if (t.criado_por) usuarioIds.add(t.criado_por);

  const porMembro = new Map<string, { userId: string; nome: string; empresaId: string }>();
  const porUsuario = new Map<string, { userId: string; nome: string; empresaId: string }>();
  const ler = async (coluna: "id" | "user_id", ids: string[]) => {
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await db
        .from("membros_equipe")
        .select("id, user_id, nome, empresa_id, created_at")
        .in(coluna, ids.slice(i, i + 200))
        .eq("status", "ativo")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      for (const m of data ?? []) {
        if (!m.user_id) continue;
        const perfil = { userId: m.user_id as string, nome: (m.nome as string) ?? "", empresaId: m.empresa_id as string };
        if (coluna === "id") porMembro.set(m.id as string, perfil);
        else if (!porUsuario.has(m.user_id as string)) porUsuario.set(m.user_id as string, perfil);
      }
    }
  };
  try {
    await ler("id", [...membroIds]);
    await ler("user_id", [...usuarioIds]);
  } catch (e) {
    console.error("[vela:resumo] membros:", String(e).slice(0, 120));
    return NextResponse.json({ error: "membros" }, { status: 500 });
  }

  // ---- as listas por pessoa ----
  const porPessoa = new Map<string, { nome: string; empresaId: string; itens: ItemDoResumo[] }>();
  const juntar = (perfil: { userId: string; nome: string; empresaId: string } | undefined, item: ItemDoResumo) => {
    if (!perfil) return;
    const atual = porPessoa.get(perfil.userId);
    if (atual) atual.itens.push(item);
    else porPessoa.set(perfil.userId, { nome: perfil.nome, empresaId: perfil.empresaId, itens: [item] });
  };
  for (const t of tarefas) {
    const ev = um(t.events);
    if (!ev || ev.status === "concluido" || ev.status === "cancelado") continue;
    const perfil =
      (ev.cerimonialista_responsavel_id ? porMembro.get(ev.cerimonialista_responsavel_id) : undefined) ??
      (ev.cerimonialista_id ? porUsuario.get(ev.cerimonialista_id) : undefined);
    const cliente = um(ev.clients as { name?: string } | { name?: string }[] | null);
    juntar(perfil, {
      titulo: comAssunto(t.title, tituloDoEmbed(t.evento_decisao)),
      prazo: t.due_date,
      evento: ev.name ?? cliente?.name ?? null,
    });
  }
  for (const t of livres) {
    juntar(t.criado_por ? porUsuario.get(t.criado_por) : undefined, { titulo: t.titulo, prazo: t.prazo, evento: null });
  }

  // ---- enviar ----
  let enviados = 0;
  let semNada = 0;
  let desligados = 0;
  let congelados = 0;
  let falhas = 0;
  let simulados = 0;
  const congelada = new Map<string, boolean>();
  for (const [userId, pessoa] of porPessoa) {
    if (so && userId !== so) continue;
    if (!deveEnviar(pessoa.itens, hoje) && !so) {
      semNada++;
      continue;
    }
    if (!congelada.has(pessoa.empresaId)) {
      const { data } = await db.rpc("conta_congelada", { p_empresa_id: pessoa.empresaId });
      congelada.set(pessoa.empresaId, data === true);
    }
    if (congelada.get(pessoa.empresaId)) {
      congelados++;
      continue;
    }
    const { data: u } = await db.auth.admin.getUserById(userId);
    const email = u?.user?.email;
    if (!email) continue;
    if ((u?.user?.user_metadata as { resumo_tarefas_email?: boolean } | null)?.resumo_tarefas_email === false) {
      desligados++;
      continue;
    }
    if (simular) {
      simulados++;
      continue;
    }
    const r = await enviarViaResend({
      to: email,
      subject: assuntoDoResumo(pessoa.itens, hoje),
      html: htmlDoResumo({ nome: pessoa.nome, itens: pessoa.itens, hoje, app: appUrl() }),
      tipo: "resumo_tarefas",
      tags: [{ name: "finalidade", value: "resumo_tarefas" }],
    });
    if (r.ok) enviados++;
    else falhas++;
  }

  return NextResponse.json({ ok: true, hoje, simular, pessoas: porPessoa.size, enviados, simulados, semNada, desligados, congelados, falhas });
}
