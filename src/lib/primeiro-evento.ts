import "server-only";

// "Criou o primeiro evento" — a conversão que diz se a conta USOU.
//
// A campanha media a conta criada, e a semana de 12–16/09/2026 mostrou o
// buraco: sete contas, nenhuma voltou em outro dia, quatro não criaram
// nada. Conta criada é promessa; o primeiro evento é a primeira vez que a
// cerimonialista pôs trabalho de verdade aqui dentro. É esse fato que diz
// qual anúncio traz gente que usa.
//
// Sai pelo servidor, pelo mesmo cano da conta criada (conversoes.ts), com
// a marca do clique que foi guardada NO CADASTRO (origem_do_clique) — é
// ela que liga o evento de hoje ao anúncio de dias atrás.
//
// UM SÓ LUGAR decide o que é "primeiro": o evento mais antigo da empresa,
// criado há poucos minutos. Contar "tem exatamente um evento" falharia na
// importação (dez de uma vez nunca é "um") e em duas abas criando juntas.
// A Meta ainda descarta a repetição pelo event_id, que é o da empresa.
//
// Quem chama: o formulário de novo evento, a importação por planilha e o
// evento que nasce do orçamento aceito. Duplicar e a colação da formatura
// ficam de fora — os dois só existem quando já há um evento.

import { createClient } from "@supabase/supabase-js";
import { registrarConversao } from "@/lib/conversoes";
import { ehContaDaCasa } from "@/lib/contas-da-casa";

/** Evento mais antigo criado há mais que isto não é "agora". */
const JANELA_MS = 10 * 60 * 1000;
/** A medição nunca pode segurar a tela de quem criou o evento. */
const TETO_MS = 2500;

function servico() {
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

async function avisar(eventoId: string): Promise<void> {
  const db = servico();
  if (!db) return;

  const { data: ev } = await db
    .from("events")
    .select("empresa_id")
    .eq("id", eventoId)
    .maybeSingle();
  const empresaId = ev?.empresa_id as string | undefined;
  if (!empresaId) return;

  // o primeiro evento da empresa — e ele tem de ser de agora
  const { data: maisAntigo } = await db
    .from("events")
    .select("id, created_at")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!maisAntigo?.created_at) return;
  if (Date.now() - new Date(maisAntigo.created_at as string).getTime() > JANELA_MS) return;

  const [{ data: empresa }, { data: origem }] = await Promise.all([
    db.from("empresas").select("owner_user_id").eq("id", empresaId).maybeSingle(),
    db
      .from("origem_do_clique")
      .select("fbp, fbc, ga_client_id, ip, user_agent")
      .eq("empresa_id", empresaId)
      .maybeSingle(),
  ]);
  const dona = empresa?.owner_user_id as string | undefined;
  if (!dona) return;
  const { data: usuario } = await db.auth.admin.getUserById(dona);
  const email = usuario?.user?.email ?? null;
  // as contas da casa (dono e vitrine) não são público de anúncio
  if (ehContaDaCasa(email)) return;

  // IP e navegador são os do CADASTRO: quando o evento nasce de um
  // orçamento aceito, quem está do outro lado é a cliente dela — e o
  // aparelho da cliente não é o de quem clicou no anúncio.
  await registrarConversao({
    tipo: "primeiro_evento",
    email,
    idDoEvento: `primeiro-evento:${empresaId}`,
    origem: {
      fbp: (origem?.fbp as string | null) ?? null,
      fbc: (origem?.fbc as string | null) ?? null,
      gaClientId: (origem?.ga_client_id as string | null) ?? null,
      ip: (origem?.ip as string | null) ?? null,
      userAgent: (origem?.user_agent as string | null) ?? null,
    },
  });
}

/**
 * Se `eventoId` é o primeiro evento da conta, conta para a Meta e o GA4.
 * Nunca lança e nunca demora mais que alguns segundos: a medição não
 * derruba nem atrasa a criação do evento.
 */
export async function avisarSeForOPrimeiroEvento(eventoId: string | null | undefined): Promise<void> {
  if (!eventoId) return;
  try {
    await Promise.race([
      avisar(eventoId),
      new Promise<void>((pronto) => setTimeout(pronto, TETO_MS)),
    ]);
  } catch (e) {
    console.error("[eorg:primeiro-evento]", String(e).slice(0, 200));
  }
}
