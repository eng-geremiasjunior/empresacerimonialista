// Leitura da tela de Fornecedores: uma passada, tudo em lote.
//
// A tela filtra no cliente (busca ao digitar, sem ida ao servidor), então
// o servidor entrega a lista COMPLETA uma vez, já com as quatro coisas
// que o cadastro sozinho não sabe:
//
//   eventos      — de quantos eventos ele participa (roteiro_links)
//   último uso   — a data do evento mais recente JÁ OCORRIDO
//   ticket médio — média por evento em que houve lançamento (transactions)
//   sem contrato — escalado em evento CONFIRMADO e futuro sem contrato
//   histórico     — os 3 eventos mais recentes, com o estado do pagamento
//
// Sobre o último: contrato mora em empresa/evento/solicitação (110), não
// existe contrato "do fornecedor" solto. Então "sem contrato" é uma
// leitura operacional — o que ainda dá retrabalho no fechamento —, e não
// um selo cadastral de quem nunca assinou nada.
//
// Cinco consultas com `.in()` sobre o mesmo conjunto de ids. O RLS já
// limita tudo à empresa; nada aqui filtra por empresa à mão.

import { createClient } from "@/lib/supabase/server";
import type {
  EstadoPagamento,
  FornecedorLinha,
  ItemHistorico,
} from "@/lib/fornecedores-lista";
import type { Fornecedor } from "@/lib/fornecedores-shared";

const COLUNAS =
  "id, name, descricao, tipo_operacional, status, faixa_preco, phone, whatsapp, email, cpf, endereco, cidade";

/**
 * Evento que ainda pode gerar trabalho. Por EXCLUSÃO, não por lista: o
 * CHECK de events.status é orcamento|confirmado|concluido|cancelado, e
 * uma lista de permitidos silenciaria um status novo em vez de incluí-lo.
 * É a mesma regra que a Central já usa para não cobrar ninguém.
 */
/**
 * Só evento FECHADO e ainda por vir cobra contrato.
 *
 * Orçamento é proposta: exigir contrato assinado para um evento que a
 * cliente nem aceitou é cobrar trabalho que talvez nunca exista. E depois
 * do dia não adianta mais — contrato assinado com a festa já feita não
 * evita retrabalho nenhum, só deixa um alarme aceso para sempre. Mesma
 * regra do Copiloto: depois da festa, só o dinheiro sobrevive.
 */
export function cobraContrato(
  ev: { date: string; status: string; archived: boolean | null },
  hoje: string
): boolean {
  return ev.archived !== true && ev.status === "confirmado" && ev.date >= hoje;
}

export type FornecedoresTelaResult = {
  linhas: FornecedorLinha[];
  /** o cadastro inteiro, antes de qualquer filtro — é o "N no cadastro" */
  total: number;
  /** true quando a 026 ainda não foi aplicada neste banco */
  migracaoPendente: boolean;
};

type LinhaCrua = Omit<Fornecedor, "categorias" | "eventos_atendidos"> & {
  supplier_categorias: { categoria: string }[] | null;
};

export async function getFornecedoresDaTela(): Promise<FornecedoresTelaResult> {
  const supabase = createClient();
  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const { data, error } = await supabase
    .from("suppliers")
    .select(`${COLUNAS}, supplier_categorias(categoria)`)
    .limit(2000);

  // A tela existe antes da migração em bancos antigos; nesse caso ela
  // avisa em vez de explodir (mesma detecção da listagem anterior).
  if (error?.code === "42703" || error?.code === "PGRST200") {
    return { linhas: [], total: 0, migracaoPendente: true };
  }

  const crus = (data ?? []) as unknown as LinhaCrua[];
  const ids = crus.map((r) => r.id);
  if (ids.length === 0) {
    return { linhas: [], total: 0, migracaoPendente: false };
  }

  const [vinculosRes, dinheiroRes, contratosRes] = await Promise.all([
    supabase
      .from("roteiro_links")
      .select("supplier_id, event_id, events(date, status, archived, name, clients(name))")
      .in("supplier_id", ids),
    supabase
      .from("transactions")
      .select("supplier_id, event_id, value, paid, due_date")
      .in("supplier_id", ids)
      .eq("type", "despesa"),
    supabase
      .from("solicitacao_fornecedor")
      .select("supplier_id, event_id")
      .in("supplier_id", ids)
      .eq("tipo", "contrato")
      .eq("status", "respondida"),
  ]);

  // Falha de leitura não pode virar número plausível. "0 eventos" e
  // "contrato em dia" são afirmações; afirmá-las porque a rede caiu é pior
  // do que não mostrar a tela.
  const erroLote =
    vinculosRes.error ?? dinheiroRes.error ?? contratosRes.error ?? null;
  if (erroLote) {
    throw new Error(
      "[vela:fornecedores] leitura em lote falhou: " + erroLote.message
    );
  }

  // ---- eventos, último uso e os pares que cobram contrato ------------
  const eventosPorForn = new Map<string, number>();
  const ultimoUso = new Map<string, string>();
  const paresCobram = new Map<string, Set<string>>();

  type Vinculo = {
    supplier_id: string;
    event_id: string;
    events: {
      date: string;
      status: string;
      archived: boolean | null;
      name: string | null;
      clients: { name: string } | null;
    } | null;
  };
  // o histórico do painel: evento + data, ainda sem o estado de pagamento
  const eventosDoForn = new Map<
    string,
    { eventId: string; evento: string; data: string }[]
  >();
  for (const v of (vinculosRes.data ?? []) as unknown as Vinculo[]) {
    const ev = v.events;
    // Vínculo cujo evento o RLS não deixa ler não conta: dizer "11 eventos"
    // para quem só alcança 10 é um número que ela não confere em lugar
    // nenhum.
    if (!ev) continue;
    if (ev.status === "cancelado") continue;

    eventosPorForn.set(v.supplier_id, (eventosPorForn.get(v.supplier_id) ?? 0) + 1);

    // ÚLTIMO uso é a última vez que ela USOU — passado. O maior de todas as
    // datas incluiria um casamento de 2027 já agendado, e a coluna passaria
    // a anunciar o futuro com o rótulo do passado. Pior: como o máximo é
    // único, a data futura APAGA a passada, e a visão "Usei este ano"
    // perde justamente quem ela mais usa (fornecedor bom já está agendado
    // para o ano que vem).
    if (ev.date <= hoje) {
      const atual = ultimoUso.get(v.supplier_id);
      if (!atual || ev.date > atual) ultimoUso.set(v.supplier_id, ev.date);
    }

    const lista = eventosDoForn.get(v.supplier_id) ?? [];
    lista.push({
      eventId: v.event_id,
      evento: ev.name || ev.clients?.name || "Evento sem nome",
      data: ev.date,
    });
    eventosDoForn.set(v.supplier_id, lista);

    if (cobraContrato(ev, hoje)) {
      const s = paresCobram.get(v.supplier_id) ?? new Set<string>();
      s.add(v.event_id);
      paresCobram.set(v.supplier_id, s);
    }
  }

  // ---- dinheiro ------------------------------------------------------
  const gastoPorForn = new Map<string, number>();
  const eventosComValor = new Map<string, Set<string>>();
  // por par (fornecedor, evento): o que decide a pílula do histórico
  const contaDoPar = new Map<
    string,
    { total: number; pago: number; maisCedoAberto: string | null }
  >();

  for (const t of (dinheiroRes.data ?? []) as {
    supplier_id: string;
    event_id: string | null;
    value: number;
    paid: boolean;
    due_date: string | null;
  }[]) {
    const valor = Number(t.value) || 0;
    gastoPorForn.set(t.supplier_id, (gastoPorForn.get(t.supplier_id) ?? 0) + valor);
    if (!t.event_id) continue;

    const s = eventosComValor.get(t.supplier_id) ?? new Set<string>();
    s.add(t.event_id);
    eventosComValor.set(t.supplier_id, s);

    const chave = `${t.supplier_id}|${t.event_id}`;
    const c = contaDoPar.get(chave) ?? { total: 0, pago: 0, maisCedoAberto: null };
    c.total += valor;
    if (t.paid) c.pago += valor;
    else if (t.due_date && (!c.maisCedoAberto || t.due_date < c.maisCedoAberto)) {
      c.maisCedoAberto = t.due_date;
    }
    contaDoPar.set(chave, c);
  }

  /**
   * A pílula do histórico. Fala em TEMPO, não em status: o que decide
   * entre "vence em breve" e "atrasado" é a data da parcela em aberto,
   * não um campo de situação.
   */
  const emSeteDias = (() => {
    const [a, m, d] = hoje.split("-").map(Number);
    const t = new Date(Date.UTC(a, m - 1, d));
    t.setUTCDate(t.getUTCDate() + 7);
    return t.toISOString().slice(0, 10);
  })();

  function estadoDoPar(supplierId: string, eventId: string): EstadoPagamento {
    const c = contaDoPar.get(`${supplierId}|${eventId}`);
    if (!c || c.total === 0) return "sem valor";
    if (c.pago >= c.total) return "pago";
    if (!c.maisCedoAberto) return "aguardando";
    if (c.maisCedoAberto < hoje) return "atrasado";
    if (c.maisCedoAberto <= emSeteDias) return "vence em breve";
    return "aguardando";
  }

  // ---- contratos assinados, por par (fornecedor, evento) -------------
  const assinados = new Set<string>();
  for (const c of (contratosRes.data ?? []) as {
    supplier_id: string;
    event_id: string;
  }[]) {
    assinados.add(`${c.supplier_id}|${c.event_id}`);
  }

  const linhas: FornecedorLinha[] = crus.map((r) => {
    const comValor = eventosComValor.get(r.id);
    const total = gastoPorForn.get(r.id) ?? 0;
    const cobram = paresCobram.get(r.id);

    return {
      id: r.id,
      nome: r.name,
      categorias: (r.supplier_categorias ?? []).map((c) => c.categoria),
      cidade: r.cidade,
      // whatsapp primeiro: é o número por onde ela fala de verdade
      telefone: r.whatsapp || r.phone || null,
      email: r.email,
      cpf: r.cpf,
      endereco: r.endereco,
      descricao: r.descricao,
      faixaPreco: r.faixa_preco,
      status: r.status,
      eventos: eventosPorForn.get(r.id) ?? 0,
      ultimoUso: ultimoUso.get(r.id) ?? null,
      totalGasto: total,
      ticketMedio:
        comValor && comValor.size > 0 ? Math.round(total / comValor.size) : null,
      historico: (eventosDoForn.get(r.id) ?? [])
        .sort((a, b) => b.data.localeCompare(a.data))
        .slice(0, 3)
        .map(
          (e): ItemHistorico => ({
            ...e,
            estado: estadoDoPar(r.id, e.eventId),
          })
        ),
      semContrato: cobram
        ? [...cobram].some((eventId) => !assinados.has(`${r.id}|${eventId}`))
        : false,
    };
  });

  linhas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return { linhas, total: linhas.length, migracaoPendente: false };
}
