import "server-only";

// A régua de e-mails do teste grátis (16/09/2026, ampliada em 17/09).
//
// As sete primeiras contas vindas de anúncio entraram, fecharam a aba e
// nunca mais ouviram falar do eOrganizei. Esta régua existe para que o
// teste não morra em silêncio, e para chamar de volta quem não assinou.
//
// DURANTE O TESTE
//   boas_vindas — na hora do cadastro: por onde começar;
//   dia_1       — não voltou e a conta está vazia: cadastre o 1º evento;
//   dia_2       — o próximo passo DO EVENTO dela;
//   dia_3       — a Vitrine profissional, o link que traz pedido;
//   dia_5       — faltam 2 dias, e o preço aparece pela primeira vez;
//   fim_teste   — véspera: amanhã acaba, com o preço e o convite;
//   ultimo_dia  — o DIA do vencimento: assinar e continuar os eventos.
//
// DEPOIS DO TESTE (quem não assinou)
//   pos_2, pos_7, pos_14, pos_21, pos_30, pos_45, pos_60, pos_90 —
//   cada marco manda UM e-mail; quem chega atrasado recebe só o marco
//   em que está, nunca a fila inteira.
//
// Quem fala é a EMPRESA, e o texto é curto: uma ou duas frases e o
// botão (regra dele, 17/09/2026 — "nada de lenga lenga, isso não
// converte"). Sem apresentação pessoal e sem linguagem de jogo. Quem
// estiver deslogada cai no login e volta ao destino do botão.
//
// NUNCA DUAS VEZES, e NO MÁXIMO UM POR DIA. O registro de envio mora em
// `app_metadata` do login (eorg_ativacao), que só o servidor escreve —
// sem migração e sem tabela nova. Só se marca o que o Resend aceitou:
// envio que falhou fica para a rotina do dia seguinte. Quem clicar em
// "não quero mais receber" ganha `sem_email` e sai da régua.

import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { enviarViaResend } from "@/lib/email";
import { appUrl } from "@/lib/app-url";
import { ehContaDaCasa } from "@/lib/contas-da-casa";
import { hojeBR } from "@/lib/tempo";
import {
  REMETENTE,
  RESPONDER_PARA,
  diaBR,
  diasEntre,
  htmlBoasVindas,
  htmlDia1,
  htmlDia2,
  htmlDia3,
  htmlDia5,
  htmlFimTeste,
  htmlUltimoDia,
  htmlPos14,
  htmlPos2,
  htmlPos21,
  htmlPos30,
  htmlPos45,
  htmlPos60,
  htmlPos7,
  htmlPos90,
  type DadosDoEmail,
  type EmailPronto,
  type EventoDela,
} from "@/lib/email-ativacao-textos";

export const MARCAS = [
  "boas_vindas",
  "dia_1",
  "dia_2",
  "dia_3",
  "dia_5",
  "fim_teste",
  "ultimo_dia",
  "pos_2",
  "pos_7",
  "pos_14",
  "pos_21",
  "pos_30",
  "pos_45",
  "pos_60",
  "pos_90",
] as const;
export type Marca = (typeof MARCAS)[number];
type Marcas = Partial<Record<Marca, string>> & { sem_email?: string };

const CHAVE = "eorg_ativacao";

/** Os marcos de depois do teste: dias desde o fim → e-mail. */
const DEPOIS: { dias: number; marca: Marca }[] = [
  { dias: 2, marca: "pos_2" },
  { dias: 7, marca: "pos_7" },
  { dias: 14, marca: "pos_14" },
  { dias: 21, marca: "pos_21" },
  { dias: 30, marca: "pos_30" },
  { dias: 45, marca: "pos_45" },
  { dias: 60, marca: "pos_60" },
  { dias: 90, marca: "pos_90" },
];

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

/* ------------------------------------------------------------------ */
/* Os links do e-mail                                                  */
/* ------------------------------------------------------------------ */

/** A assinatura do link de saída: sem ela, qualquer um descadastra qualquer um. */
export function assinaturaDeSaida(userId: string): string {
  const segredo = process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHmac("sha256", segredo).update(userId).digest("hex").slice(0, 32);
}

function linkDeSaida(userId: string): string {
  return `${appUrl()}/api/email/sair?u=${userId}&t=${assinaturaDeSaida(userId)}`;
}

async function mandar(
  db: SupabaseClient,
  u: Pick<User, "id" | "email">,
  marca: Marca,
  email: EmailPronto
): Promise<boolean> {
  if (!u.email) return false;
  const r = await enviarViaResend({
    to: u.email,
    subject: email.assunto,
    html: email.html,
    fromNome: REMETENTE(),
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
    const email = htmlBoasVindas({
      nome: p.nome,
      termina: p.termina,
      eventos3m: p.eventos3m,
      sair: linkDeSaida(p.userId),
    });
    await mandar(db, { id: p.userId, email: p.email }, "boas_vindas", email);
  } catch (e) {
    console.error("[eorg:ativacao] boas-vindas", String(e).slice(0, 200));
  }
}

/* ------------------------------------------------------------------ */
/* A rotina diária                                                     */
/* ------------------------------------------------------------------ */

export type ResumoAtivacao = {
  contasEmTeste: number;
  contasDepoisDoTeste: number;
  enviados: Partial<Record<Marca, number>>;
  falharam: number;
};

/** O evento que interessa: o próximo a acontecer; sem nenhum futuro, o último. */
async function eventoDaVez(
  db: SupabaseClient,
  empresaId: string,
  hoje: string
): Promise<{ evento: EventoDela | null; total: number }> {
  const { data } = await db
    .from("events")
    .select("id, type, date, created_at")
    .eq("empresa_id", empresaId)
    .or("archived.is.null,archived.eq.false")
    .order("created_at", { ascending: false })
    .limit(50);
  const todos = (data ?? []) as (EventoDela & { created_at: string })[];
  const futuros = todos
    .filter((x) => x.date && x.date.slice(0, 10) >= hoje)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const escolhido = futuros[0] ?? todos[0] ?? null;
  if (!escolhido) return { evento: null, total: todos.length };
  // sem objetivos, o evento não tem Planejamento para onde mandar
  const { count, error } = await db
    .from("evento_objetivo")
    .select("id", { count: "exact", head: true })
    .eq("event_id", escolhido.id);
  return {
    evento: { ...escolhido, temMetodo: error ? undefined : (count ?? 0) > 0 },
    total: todos.length,
  };
}

/**
 * Chamada uma vez por dia (/api/cron/ativacao). Olha contas em teste e
 * contas cujo teste acabou sem assinatura. Uma mensagem por conta por dia.
 */
export async function rodarAtivacao(agora = new Date()): Promise<ResumoAtivacao> {
  const resumo: ResumoAtivacao = {
    contasEmTeste: 0,
    contasDepoisDoTeste: 0,
    enviados: {},
    falharam: 0,
  };
  const db = servico();
  if (!db) return resumo;
  const hoje = hojeBR(agora);
  const contar = (m: Marca) => {
    resumo.enviados[m] = (resumo.enviados[m] ?? 0) + 1;
  };

  // status 'trial' cobre os dois lados: quem ainda está testando e quem
  // deixou o teste vencer sem assinar (assinar muda o status).
  const { data: testes, error } = await db
    .from("assinaturas")
    .select("empresa_id, teste_termina_em")
    .eq("status", "trial");
  if (error) throw new Error(`assinaturas: ${error.message}`);
  const lista = (testes ?? []) as { empresa_id: string; teste_termina_em: string | null }[];
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
    if (marcas.sem_email) continue;

    const nome = String((u.user_metadata as Record<string, unknown> | undefined)?.name ?? "");
    const desdeCadastro = diasEntre(diaBR(e.created_at), hoje);
    const paraFim = t.teste_termina_em ? diasEntre(hoje, t.teste_termina_em) : null;
    const emTeste = paraFim === null || paraFim >= 0;
    if (emTeste) resumo.contasEmTeste += 1;
    else resumo.contasDepoisDoTeste += 1;

    // quem recebe o quê, hoje
    let marca: Marca | null = null;
    if (emTeste) {
      // O dia do vencimento vem primeiro: quem já levou o `fim_teste` na
      // véspera ainda precisa ouvir alguma coisa hoje, que é quando a
      // conta fecha.
      if (paraFim === 0 && !marcas.ultimo_dia) marca = "ultimo_dia";
      else if (paraFim !== null && paraFim <= 1 && desdeCadastro >= 2 && !marcas.fim_teste) marca = "fim_teste";
      else if (paraFim !== null && paraFim <= 2 && desdeCadastro >= 3 && !marcas.dia_5) marca = "dia_5";
      else if (desdeCadastro >= 3 && desdeCadastro <= 5 && !marcas.dia_3) marca = "dia_3";
      else if (desdeCadastro >= 2 && desdeCadastro <= 4 && !marcas.dia_2) marca = "dia_2";
      else if (desdeCadastro === 1 && !marcas.dia_1) marca = "dia_1";
      else if (desdeCadastro <= 1 && !marcas.boas_vindas) marca = "boas_vindas";
    } else {
      // só o marco em que ela está, nunca a fila inteira
      const desdeFim = -(paraFim as number);
      const alcancados = DEPOIS.filter((m) => m.dias <= desdeFim);
      const atual = alcancados[alcancados.length - 1];
      if (atual && !marcas[atual.marca]) marca = atual.marca;
    }
    if (!marca) continue;

    // os dados que o texto do dia precisa
    const precisaEvento = marca === "dia_1" || marca === "dia_2" || marca === "dia_5";
    const { evento, total } =
      precisaEvento || marca === "pos_2" || marca === "pos_14" || marca === "fim_teste" || marca === "ultimo_dia"
        ? await eventoDaVez(db, e.id, hoje)
        : { evento: null, total: 0 };
    if (marca === "dia_1" && total > 0) continue; // já cadastrou: o dia 1 não faz sentido

    const eventos3m =
      String((u.user_metadata as Record<string, unknown> | undefined)?.eventos_3_meses ?? "") || null;

    const montar = (d: DadosDoEmail): EmailPronto => {
      const base = { ...d, nome };
      switch (marca) {
        case "boas_vindas":
          return htmlBoasVindas({ ...base, termina: t.teste_termina_em, eventos3m });
        case "dia_1":
          return htmlDia1(base);
        case "dia_2":
          return htmlDia2({ ...base, evento, hoje });
        case "dia_3":
          return htmlDia3({ ...base, termina: t.teste_termina_em });
        case "dia_5":
          return htmlDia5({ ...base, termina: t.teste_termina_em!, hoje, evento });
        case "fim_teste":
          return htmlFimTeste({ ...base, termina: t.teste_termina_em!, hoje, eventos: total });
        case "ultimo_dia":
          return htmlUltimoDia({ ...base, eventos: total, evento });
        case "pos_2":
          return htmlPos2({ ...base, eventos: total });
        case "pos_7":
          return htmlPos7(base);
        case "pos_14":
          return htmlPos14({ ...base, eventos: total });
        case "pos_21":
          return htmlPos21(base);
        case "pos_30":
          return htmlPos30(base);
        case "pos_45":
          return htmlPos45(base);
        case "pos_60":
          return htmlPos60(base);
        default:
          return htmlPos90(base);
      }
    };

    const email = montar({ nome, sair: linkDeSaida(u.id) });
    const feito = await mandar(db, u, marca, email);
    if (feito) contar(marca);
    else resumo.falharam += 1;
    // o Resend aceita poucas chamadas por segundo
    await new Promise((r) => setTimeout(r, 600));
  }

  return resumo;
}
