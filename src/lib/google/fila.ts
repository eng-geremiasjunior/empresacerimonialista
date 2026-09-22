// O processador da fila (168): pega um lote, descobre quem da empresa
// vê cada item, grava na agenda de quem vê e apaga da agenda de quem não
// vê mais. É chamado na hora pelo banco (pg_net → /api/google/fila) e
// todo dia pela rotina google-agenda, com a mesma função.
//
// A régua de quem vê é do banco (google_agenda_quem_ve, a mesma de
// pode_ver_evento): aqui ninguém decide permissão.
//
// Falhas: chave morta do Google marca a conexão (falha = 'token'), avisa
// a pessoa uma vez no sino e SEGUE — os outros da empresa continuam
// recebendo. Falha passageira (rede, cota) solta a linha da fila com um
// recuo crescente; depois de oito tentativas a linha é descartada e
// registrada, e a próxima mudança do item recoloca tudo em dia.

import "server-only";

import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { appUrl } from "@/lib/app-url";
import { decifrar } from "@/lib/google/cifra";
import { renovarAcesso } from "@/lib/google/oauth";
import {
  ErroGoogle,
  apagarItem,
  criarAgenda,
  gravarItem,
  idNoGoogle,
  type ItemDaAgenda,
} from "@/lib/google/agenda";
import { type Conexao, type ServicoGoogle } from "@/lib/google/servico";

type LinhaDaFila = {
  id: number;
  empresa_id: string;
  origem: "evento" | "compromisso";
  origem_id: string;
  acao: "gravar" | "apagar";
  apenas_user_id: string | null;
  tentativas: number;
};

const MAX_TENTATIVAS = 8;

export type ResumoDaFila = {
  pegas: number;
  feitas: number;
  adiadas: number;
  descartadas: number;
  conexoesComFalha: number;
  soltas: number;
};

/**
 * Uma conexão pronta para usar nesta rodada: a chave de acesso renovada
 * uma vez, e a agenda garantida. `null` = a chave morreu (já marcada).
 */
type ConexaoViva = { conexao: Conexao; token: string };

export async function processarFila(
  db: ServicoGoogle,
  opcoes: { max?: number; tempoMaxMs?: number } = {}
): Promise<ResumoDaFila> {
  const inicio = Date.now();
  const tempoMax = opcoes.tempoMaxMs ?? 40_000;
  const resumo: ResumoDaFila = { pegas: 0, feitas: 0, adiadas: 0, descartadas: 0, conexoesComFalha: 0, soltas: 0 };

  const { data: lote, error } = await db.rpc("google_agenda_pegar_fila", { p_max: opcoes.max ?? 40 });
  if (error) throw new Error(`pegar fila: ${error.message}`);
  const linhas = (lote ?? []) as LinhaDaFila[];
  resumo.pegas = linhas.length;
  if (!linhas.length) return resumo;

  // as conexões das empresas do lote, lidas uma vez
  const empresas = [...new Set(linhas.map((l) => l.empresa_id))];
  const { data: conexoes } = await db
    .from("google_agenda_conexao")
    .select("user_id, empresa_id, google_email, refresh_token_cifrado, calendario_id, pode_ler_ocupado, falha, avisado_em")
    .in("empresa_id", empresas);
  const porEmpresa = new Map<string, Conexao[]>();
  for (const c of (conexoes ?? []) as Conexao[]) {
    porEmpresa.set(c.empresa_id, [...(porEmpresa.get(c.empresa_id) ?? []), c]);
  }

  // a chave de acesso de cada pessoa, renovada uma vez por rodada
  const vivas = new Map<string, ConexaoViva | null>();
  const viva = async (c: Conexao): Promise<ConexaoViva | null> => {
    if (vivas.has(c.user_id)) return vivas.get(c.user_id) ?? null;
    let pronta: ConexaoViva | null = null;
    try {
      const r = await renovarAcesso(decifrar(c.refresh_token_cifrado));
      if (r.ok) pronta = { conexao: c, token: r.accessToken };
      else if (r.morta) await marcarFalha(db, c, "token", resumo);
      else throw new Error(`renovar acesso: ${r.erro}`);
    } catch (e) {
      // cifra ilegível (chave de serviço trocada) é o mesmo que chave morta
      if (e instanceof Error && /cifra|auth|Unsupported state|bad decrypt/i.test(e.message)) {
        await marcarFalha(db, c, "token", resumo);
      } else {
        throw e;
      }
    }
    vivas.set(c.user_id, pronta);
    return pronta;
  };

  const pendentes: number[] = [];
  for (const linha of linhas) {
    if (Date.now() - inicio > tempoMax) {
      pendentes.push(linha.id);
      continue;
    }
    try {
      await processarLinha(db, linha, porEmpresa.get(linha.empresa_id) ?? [], viva);
      await db.from("google_agenda_fila").delete().eq("id", linha.id);
      resumo.feitas++;
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 200);
      if (linha.tentativas >= MAX_TENTATIVAS) {
        console.error("[vela:google] linha descartada:", linha.origem, linha.origem_id, msg);
        await db.from("google_agenda_fila").delete().eq("id", linha.id);
        resumo.descartadas++;
        continue;
      }
      // recuo: 1, 2, 4, 8… minutos, no máximo 6 horas
      const minutos = Math.min(360, 2 ** Math.max(0, linha.tentativas - 1));
      await db
        .from("google_agenda_fila")
        .update({ pegado_em: null, proxima_em: new Date(Date.now() + minutos * 60_000).toISOString(), falha: msg })
        .eq("id", linha.id);
      resumo.adiadas++;
    }
  }

  // o que não deu tempo volta para a fila agora, sem esperar os 5 minutos
  if (pendentes.length) {
    await db.from("google_agenda_fila").update({ pegado_em: null }).in("id", pendentes);
    resumo.soltas = pendentes.length;
  }
  return resumo;
}

/**
 * Sobrou fila (o tempo desta chamada acabou, ou o lote estava cheio):
 * chama a rota de novo pelo mesmo caminho que o banco usa — a URL e o
 * segredo do ajuste — sem esperar a resposta. Visto ao vivo em
 * 22/09/2026: 24 eventos numa conexão nova encostaram nos 45 s, e uma
 * conta maior deixaria sobras para a rotina do dia seguinte. A rotina
 * continua sendo a rede; isto é o que evita depender dela.
 */
export async function chamarDeNovoSeSobrou(db: ServicoGoogle): Promise<boolean> {
  const { count } = await db
    .from("google_agenda_fila")
    .select("id", { count: "exact", head: true })
    .lte("proxima_em", new Date().toISOString())
    .is("pegado_em", null);
  if (!count) return false;
  const { data } = await db.from("google_agenda_ajuste").select("url_fila, segredo").eq("id", 1).maybeSingle();
  const a = data as { url_fila: string | null; segredo: string | null } | null;
  if (!a?.url_fila || !a.segredo) return false;
  // só o disparo: a resposta é da próxima chamada, e 1,5 s bastam para o
  // pedido sair antes de esta função encerrar
  await Promise.race([
    fetch(a.url_fila, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-eorg-fila": a.segredo },
      body: "{}",
      cache: "no-store",
    }).catch(() => undefined),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
  return true;
}

async function marcarFalha(db: ServicoGoogle, c: Conexao, falha: "token" | "agenda", resumo: ResumoDaFila) {
  resumo.conexoesComFalha++;
  const agora = new Date().toISOString();
  await db
    .from("google_agenda_conexao")
    .update({ falha, falha_em: agora, atualizado_em: agora })
    .eq("user_id", c.user_id);
  if (falha === "token" && !c.avisado_em) {
    // um aviso só, no sino dela: 'compromisso' é o tipo de agenda que o
    // CHECK das notificações já aceita
    const { error } = await db.from("notifications").insert({
      cerimonialista_id: c.user_id,
      type: "compromisso",
      title: "Google Agenda desconectada",
      message:
        "O Google deixou de aceitar a conexão. Conecte de novo em Configurações para a sua agenda voltar a receber os eventos.",
      link: "/configuracoes",
    });
    if (!error) {
      await db.from("google_agenda_conexao").update({ avisado_em: agora }).eq("user_id", c.user_id);
    }
  }
}

type EventoLido = {
  id: string;
  type: string;
  date: string | null;
  location: string | null;
  status: string;
  name: string | null;
  empresa_id: string | null;
  clients: { name: string } | { name: string }[] | null;
};

function nomeDaCliente(e: EventoLido): string | null {
  const c = Array.isArray(e.clients) ? e.clients[0] : e.clients;
  return c?.name?.trim() || null;
}

function rotuloDoTipo(type: string): string {
  return EVENT_TYPE_LABELS[type as EventType] ?? type;
}

function tituloDoEvento(e: EventoLido): string {
  const quem = nomeDaCliente(e) ?? e.name?.trim() ?? null;
  const base = quem ? `${rotuloDoTipo(e.type)} — ${quem}` : rotuloDoTipo(e.type);
  return e.status === "orcamento" ? `${base} (em orçamento)` : base;
}

async function processarLinha(
  db: ServicoGoogle,
  linha: LinhaDaFila,
  conexoesDaEmpresa: Conexao[],
  viva: (c: Conexao) => Promise<ConexaoViva | null>
) {
  if (!conexoesDaEmpresa.length) return; // ninguém conectado: nada a fazer

  const googleId = idNoGoogle(linha.origem, linha.origem_id);
  let item: ItemDaAgenda | null = null;
  let eventId: string | null = null;

  if (linha.acao === "gravar") {
    if (linha.origem === "evento") {
      const { data } = await db
        .from("events")
        .select("id, type, date, location, status, name, empresa_id, clients(name)")
        .eq("id", linha.origem_id)
        .maybeSingle();
      const e = data as EventoLido | null;
      if (e && e.date && e.status !== "cancelado") {
        eventId = e.id;
        item = {
          id: googleId,
          titulo: tituloDoEvento(e),
          descricao: `Abrir no eOrganizei: ${appUrl()}/eventos/${e.id}`,
          local: e.location?.trim() || null,
          data: e.date.slice(0, 10),
          hora: null,
          duracaoMin: 0,
        };
      }
    } else {
      const { data } = await db
        .from("compromisso")
        .select("id, event_id, titulo, data, hora, duracao_min, local, estado, suppliers(name)")
        .eq("id", linha.origem_id)
        .maybeSingle();
      const c = data as {
        id: string;
        event_id: string;
        titulo: string;
        data: string;
        hora: string | null;
        duracao_min: number | null;
        local: string | null;
        estado: string;
        suppliers: { name: string } | { name: string }[] | null;
      } | null;
      if (c && c.estado !== "cancelado") {
        const { data: ev } = await db
          .from("events")
          .select("id, type, date, location, status, name, empresa_id, clients(name)")
          .eq("id", c.event_id)
          .maybeSingle();
        const e = ev as EventoLido | null;
        eventId = c.event_id;
        const fornecedor = Array.isArray(c.suppliers) ? c.suppliers[0]?.name : c.suppliers?.name;
        const doEvento = e ? ` — ${rotuloDoTipo(e.type)}${nomeDaCliente(e) ? ` ${nomeDaCliente(e)}` : ""}` : "";
        item = {
          id: googleId,
          titulo: `${c.titulo.trim()}${doEvento}`,
          descricao: `${fornecedor ? `Fornecedor: ${fornecedor}\n` : ""}Abrir no eOrganizei: ${appUrl()}/eventos/${c.event_id}/organizacao`,
          local: c.local?.trim() || null,
          data: c.data.slice(0, 10),
          hora: c.hora ? String(c.hora).slice(0, 5) : null,
          duracaoMin: c.duracao_min ?? 60,
        };
      }
    }
  }

  // quem recebe o item: quem vê o evento; os outros conectados da empresa
  // recebem o apagamento (perderam o acesso, ou o item morreu)
  let recebem = new Set<string>();
  if (item && eventId) {
    const { data: ids, error } = await db.rpc("google_agenda_quem_ve", { p_event: eventId });
    if (error) throw new Error(`quem vê: ${error.message}`);
    recebem = new Set(((ids ?? []) as string[]).map(String));
  }
  const alvo = linha.apenas_user_id
    ? conexoesDaEmpresa.filter((c) => c.user_id === linha.apenas_user_id)
    : conexoesDaEmpresa;

  for (const c of alvo) {
    const pronta = await viva(c);
    if (!pronta) continue; // chave morta: já marcada, ela reconecta

    if (item && recebem.has(c.user_id)) {
      await gravarNaAgendaDela(db, pronta, item);
    } else if (c.calendario_id) {
      // apagar é idempotente; sem agenda não há o que apagar
      try {
        await apagarItem(pronta.token, c.calendario_id, googleId);
      } catch (e) {
        if (e instanceof ErroGoogle && e.deToken) {
          await marcarFalhaDeToken(db, pronta.conexao);
          continue;
        }
        throw e;
      }
    }
  }
}

async function marcarFalhaDeToken(db: ServicoGoogle, c: Conexao) {
  const agora = new Date().toISOString();
  await db
    .from("google_agenda_conexao")
    .update({ falha: "token", falha_em: agora, atualizado_em: agora })
    .eq("user_id", c.user_id);
}

/** Garante a agenda "eOrganizei" e grava; se a agenda sumiu, recria uma vez. */
async function gravarNaAgendaDela(db: ServicoGoogle, pronta: ConexaoViva, item: ItemDaAgenda) {
  const c = pronta.conexao;
  try {
    if (!c.calendario_id) {
      c.calendario_id = await criarAgenda(pronta.token);
      await db
        .from("google_agenda_conexao")
        .update({ calendario_id: c.calendario_id, falha: null, falha_em: null, atualizado_em: new Date().toISOString() })
        .eq("user_id", c.user_id);
    }
    const gravou = await gravarItem(pronta.token, c.calendario_id, item);
    if (gravou) return;
    // a agenda foi apagada à mão: recria e grava de novo
    c.calendario_id = await criarAgenda(pronta.token);
    await db
      .from("google_agenda_conexao")
      .update({ calendario_id: c.calendario_id, falha: null, falha_em: null, atualizado_em: new Date().toISOString() })
      .eq("user_id", c.user_id);
    await gravarItem(pronta.token, c.calendario_id, item);
  } catch (e) {
    if (e instanceof ErroGoogle && e.deToken) {
      await marcarFalhaDeToken(db, c);
      return;
    }
    throw e;
  }
}
