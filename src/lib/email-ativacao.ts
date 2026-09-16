import "server-only";

// Os três e-mails do teste grátis (16/09/2026).
//
// As sete primeiras contas vindas de anúncio entraram, fecharam a aba e
// nunca mais ouviram falar do eOrganizei: não existia e-mail nenhum depois
// do cadastro. Nenhuma voltou em outro dia. Estes três existem para que o
// teste não morra em silêncio:
//
//   boas_vindas — na hora do cadastro: por onde começar;
//   dia_2       — dois dias depois: o próximo passo DO EVENTO DELA (ou o
//                 convite para cadastrar o primeiro, se não há nenhum);
//   fim_teste   — dois dias antes do fim: o que acontece e como seguir.
//
// Quem fala é o dono, pelo nome: é quem construiu o sistema, e é ele quem
// vai responder. O texto segue a regra da casa — fala do trabalho dela,
// nunca da mecânica, e sem linguagem de jogo.
//
// NUNCA DUAS VEZES. O registro de envio mora em `app_metadata` do login
// (eorg_ativacao: { boas_vindas, dia_2, fim_teste }), que só o servidor
// escreve — sem migração e sem tabela nova. Só se marca o que o Resend
// aceitou: envio que falhou fica para a rotina do dia seguinte.

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { enviarViaResend } from "@/lib/email";
import { ehContaDaCasa } from "@/lib/contas-da-casa";
import { hojeBR } from "@/lib/tempo";
import {
  ASSINA,
  RESPONDER_PARA,
  diaBR,
  diasEntre,
  htmlBoasVindas,
  htmlDia2,
  htmlFimTeste,
  type EventoDela,
} from "@/lib/email-ativacao-textos";

type Marca = "boas_vindas" | "dia_2" | "fim_teste";
type Marcas = Partial<Record<Marca, string>>;

const CHAVE = "eorg_ativacao";

function servico(): SupabaseClient | null {
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

function marcasDe(u: Pick<User, "app_metadata"> | null | undefined): Marcas {
  const m = (u?.app_metadata as Record<string, unknown> | undefined)?.[CHAVE];
  return m && typeof m === "object" ? (m as Marcas) : {};
}

async function marcar(db: SupabaseClient, userId: string, marca: Marca) {
  // Relido na hora, e o objeto inteiro vai de volta: app_metadata também
  // guarda o provedor do login, e a marca do teste nunca pode apagá-lo.
  const { data } = await db.auth.admin.getUserById(userId);
  const atual = data?.user;
  if (!atual) return;
  const app = { ...(atual.app_metadata ?? {}) } as Record<string, unknown>;
  app[CHAVE] = { ...marcasDe(atual), [marca]: new Date().toISOString() };
  const { error } = await db.auth.admin.updateUserById(userId, { app_metadata: app });
  if (error) console.error("[eorg:ativacao] marcar", marca, error.message);
}

async function mandar(
  db: SupabaseClient,
  u: Pick<User, "id" | "email">,
  marca: Marca,
  assunto: string,
  html: string
): Promise<boolean> {
  if (!u.email) return false;
  const r = await enviarViaResend({
    to: u.email,
    subject: assunto,
    html,
    fromNome: ASSINA(),
    replyTo: RESPONDER_PARA(),
    tags: [{ name: "tipo", value: `ativacao_${marca}` }],
  });
  if (!r.ok) {
    console.error("[eorg:ativacao]", marca, r.error);
    return false;
  }
  await marcar(db, u.id, marca);
  return true;
}

/**
 * Na hora do cadastro. Nunca lança: e-mail que não saiu não pode
 * desfazer a conta — a rotina diária tenta de novo no dia seguinte.
 */
export async function enviarBoasVindas(p: {
  userId: string;
  email: string;
  nome: string;
  termina: string | null;
  eventos3m: string | null;
}): Promise<void> {
  try {
    if (ehContaDaCasa(p.email)) return;
    const db = servico();
    if (!db) return;
    const { assunto, html } = htmlBoasVindas(p.nome, p.termina, p.eventos3m);
    await mandar(db, { id: p.userId, email: p.email }, "boas_vindas", assunto, html);
  } catch (e) {
    console.error("[eorg:ativacao] boas-vindas", String(e).slice(0, 200));
  }
}

/* ------------------------------------------------------------------ */
/* A rotina diária                                                     */
/* ------------------------------------------------------------------ */

export type ResumoAtivacao = {
  contasEmTeste: number;
  enviados: Record<Marca, number>;
  falharam: number;
};

/**
 * Chamada uma vez por dia (/api/cron/ativacao). Olha só contas em teste.
 * Uma mensagem por conta por dia, com o fim do teste na frente.
 */
export async function rodarAtivacao(agora = new Date()): Promise<ResumoAtivacao> {
  const resumo: ResumoAtivacao = {
    contasEmTeste: 0,
    enviados: { boas_vindas: 0, dia_2: 0, fim_teste: 0 },
    falharam: 0,
  };
  const db = servico();
  if (!db) return resumo;
  const hoje = hojeBR(agora);

  const { data: testes, error } = await db
    .from("assinaturas")
    .select("empresa_id, teste_termina_em")
    .eq("status", "trial")
    .gte("teste_termina_em", hoje);
  if (error) throw new Error(`assinaturas: ${error.message}`);
  const lista = (testes ?? []) as { empresa_id: string; teste_termina_em: string | null }[];
  resumo.contasEmTeste = lista.length;
  if (!lista.length) return resumo;

  const { data: empresas } = await db
    .from("empresas")
    .select("id, owner_user_id, created_at")
    .in("id", lista.map((t) => t.empresa_id));
  const empresaPor = new Map(
    ((empresas ?? []) as { id: string; owner_user_id: string; created_at: string }[]).map((e) => [e.id, e])
  );

  const usuarios: User[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const lote = data?.users ?? [];
    usuarios.push(...lote);
    if (lote.length < 1000) break;
  }
  const usuarioPor = new Map(usuarios.map((u) => [u.id, u]));

  for (const t of lista) {
    const e = empresaPor.get(t.empresa_id);
    const u = e ? usuarioPor.get(e.owner_user_id) : undefined;
    if (!e || !u?.email || ehContaDaCasa(u.email)) continue;
    const banida = (u as unknown as { banned_until?: string | null }).banned_until;
    if (banida && new Date(banida) > agora) continue;

    const marcas = marcasDe(u);
    const nome = String((u.user_metadata as Record<string, unknown> | undefined)?.name ?? "");
    const desdeCadastro = diasEntre(diaBR(e.created_at), hoje);
    const paraFim = t.teste_termina_em ? diasEntre(hoje, t.teste_termina_em) : null;

    let feito: boolean | null = null;
    if (paraFim !== null && paraFim <= 2 && desdeCadastro >= 2 && !marcas.fim_teste) {
      const { count } = await db
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", e.id);
      const m = htmlFimTeste(nome, t.teste_termina_em!, hoje, count ?? 0);
      feito = await mandar(db, u, "fim_teste", m.assunto, m.html);
      if (feito) resumo.enviados.fim_teste += 1;
    } else if (desdeCadastro >= 2 && desdeCadastro <= 4 && !marcas.dia_2) {
      // o evento que interessa: o próximo a acontecer; sem nenhum futuro,
      // o último que ela cadastrou
      const { data: evs } = await db
        .from("events")
        .select("id, type, date, created_at")
        .eq("empresa_id", e.id)
        .or("archived.is.null,archived.eq.false")
        .order("created_at", { ascending: false })
        .limit(50);
      const todos = (evs ?? []) as (EventoDela & { created_at: string })[];
      const futuros = todos
        .filter((x) => x.date && x.date.slice(0, 10) >= hoje)
        .sort((a, b) => (a.date! < b.date! ? -1 : 1));
      const escolhido = futuros[0] ?? todos[0] ?? null;
      let evento: EventoDela | null = escolhido;
      if (escolhido) {
        // sem objetivos, o evento não tem Planejamento para onde mandar
        const { count, error: erroObj } = await db
          .from("evento_objetivo")
          .select("id", { count: "exact", head: true })
          .eq("event_id", escolhido.id);
        evento = { ...escolhido, temMetodo: erroObj ? undefined : (count ?? 0) > 0 };
      }
      const m = htmlDia2(nome, evento, hoje);
      feito = await mandar(db, u, "dia_2", m.assunto, m.html);
      if (feito) resumo.enviados.dia_2 += 1;
    } else if (desdeCadastro <= 1 && !marcas.boas_vindas) {
      // o de boas-vindas que não saiu na hora do cadastro
      const eventos3m = String((u.user_metadata as Record<string, unknown> | undefined)?.eventos_3_meses ?? "") || null;
      const m = htmlBoasVindas(nome, t.teste_termina_em, eventos3m);
      feito = await mandar(db, u, "boas_vindas", m.assunto, m.html);
      if (feito) resumo.enviados.boas_vindas += 1;
    }
    if (feito === false) resumo.falharam += 1;
    // o Resend aceita poucas chamadas por segundo
    if (feito !== null) await new Promise((r) => setTimeout(r, 600));
  }

  return resumo;
}

