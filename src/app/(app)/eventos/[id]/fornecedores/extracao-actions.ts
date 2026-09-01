"use server";

// A conferência da extração de contrato: o único caminho pelo qual a
// proposta vira dado de verdade — e sempre PELAS ACTIONS EXISTENTES.
//
//   parcelas    → criarLancamento, uma chamada por parcela (respeita
//                 valores irregulares de contrato), sempre NÃO paga;
//   quantidades → criarRecurso + salvarNumero('comprado') na Operação;
//   horário     → o item mais cedo do fornecedor no roteiro, com
//                 origem_horario='fornecedor' (o CHECK da 112 já prevê).
//
// A extração só é marcada como conferida quando TUDO que ela marcou
// entrou. Falha no meio: o erro diz o que já entrou e a proposta
// continua aberta — dinheiro não entra duas vezes em silêncio.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { criarLancamento } from "@/app/(app)/eventos/[id]/financeiro/lancamento-actions";
import { criarRecurso, salvarNumero } from "@/app/(app)/eventos/[id]/operacao/actions";

export type EscolhasAplicacao = {
  parcelas: { valor: number; vencimento: string; descricao: string | null }[];
  quantidades: { nome: string; quantidade: number; unidade: string | null }[];
  /** aplica no item mais cedo do fornecedor no roteiro; null = não aplicar */
  horario: { hora: string } | null;
  /** a borda do dia vinda do contrato do ESPAÇO (aposta 2); só os campos
   *  marcados chegam aqui — undefined em escolhas anteriores */
  espaco?: {
    liberacao_montagem: string | null;
    termino_som: string | null;
    desmontagem_ate: string | null;
    restricoes: string | null;
  } | null;
};

export type ResultadoExtracao = { error: string } | { success: true };

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function aplicarExtracao(
  eventId: string,
  extracaoId: string,
  escolhas: EscolhasAplicacao
): Promise<ResultadoExtracao> {
  const supabase = createClient();

  const { data: ext } = await supabase
    .from("contrato_extracao")
    .select("id, status, supplier_id, suppliers(name)")
    .eq("id", extracaoId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!ext) return { error: "Proposta não encontrada neste evento." };
  if (ext.status !== "proposta") {
    return { error: "Esta proposta já foi conferida ou descartada." };
  }

  const sup = Array.isArray(ext.suppliers) ? ext.suppliers[0] : ext.suppliers;
  const fornecedorNome = (sup as { name: string } | null)?.name ?? "Fornecedor";

  const espacoMarcado =
    !!escolhas.espaco &&
    !!(
      escolhas.espaco.liberacao_montagem ||
      escolhas.espaco.termino_som ||
      escolhas.espaco.desmontagem_ate ||
      escolhas.espaco.restricoes
    );
  const total =
    escolhas.parcelas.length +
    escolhas.quantidades.length +
    (escolhas.horario ? 1 : 0) +
    (espacoMarcado ? 1 : 0);
  if (total === 0) {
    return { error: "Nada marcado para aplicar." };
  }

  // validação antes de escrever QUALQUER coisa: ou o lote é aplicável
  // inteiro, ou nada começa
  for (const p of escolhas.parcelas) {
    if (!Number.isFinite(p.valor) || p.valor <= 0) {
      return { error: "Há uma parcela sem valor válido." };
    }
    if (!RE_DATA.test(p.vencimento)) {
      return { error: "Há uma parcela sem data de vencimento — preencha antes de aplicar." };
    }
  }
  for (const q of escolhas.quantidades) {
    if (!q.nome.trim()) return { error: "Há um item sem nome." };
    if (!Number.isFinite(q.quantidade) || q.quantidade <= 0) {
      return { error: "Há um item sem quantidade válida." };
    }
  }
  if (escolhas.horario && !RE_HORA.test(escolhas.horario.hora)) {
    return { error: "O horário precisa estar no formato HH:MM." };
  }
  if (espacoMarcado) {
    const e = escolhas.espaco!;
    for (const h of [e.liberacao_montagem, e.termino_som, e.desmontagem_ate]) {
      if (h && !RE_HORA.test(h)) {
        return { error: "Os horários do espaço precisam estar no formato HH:MM." };
      }
    }
  }

  const feitos: string[] = [];

  // ---- parcelas: uma chamada por parcela, sempre não paga ----
  const n = escolhas.parcelas.length;
  for (let i = 0; i < n; i++) {
    const p = escolhas.parcelas[i];
    const r = await criarLancamento(eventId, {
      direcao: "saida",
      descricao:
        p.descricao?.trim() ||
        `Contrato ${fornecedorNome}${n > 1 ? ` ${i + 1}/${n}` : ""}`,
      valor: p.valor,
      vencimento: p.vencimento,
      supplierId: ext.supplier_id,
      objetivoId: null,
      tipo: n > 1 && i === 0 ? "sinal" : n > 1 && i === n - 1 ? "saldo" : "parcela",
      origem: "caixa",
      jaPago: false,
      parcelas: 1,
    });
    if ("error" in r) {
      return { error: erroParcial(feitos, `a parcela ${i + 1}: ${r.error}`) };
    }
    feitos.push(`parcela ${i + 1}/${n}`);
  }

  // ---- quantidades: recurso avulso + comprado ----
  for (const q of escolhas.quantidades) {
    const r = await criarRecurso(eventId, {
      nome: q.nome.trim(),
      unidade: q.unidade?.trim() || "unidades",
      regra: "fixo",
      indice: q.quantidade,
    });
    if ("error" in r || !r.id) {
      const msg = "error" in r ? r.error : "o item não devolveu id.";
      return { error: erroParcial(feitos, `o item "${q.nome}": ${msg}`) };
    }
    const rn = await salvarNumero(eventId, r.id, "comprado", q.quantidade);
    if ("error" in rn) {
      return { error: erroParcial(feitos, `o comprado de "${q.nome}": ${rn.error}`) };
    }
    feitos.push(`item ${q.nome}`);
  }

  // ---- horário: o item mais cedo do fornecedor no roteiro ----
  if (escolhas.horario) {
    if (!ext.supplier_id) {
      return { error: erroParcial(feitos, "o horário: a proposta não tem fornecedor.") };
    }
    const { data: item } = await supabase
      .from("roteiro_items")
      .select("id, title")
      .eq("event_id", eventId)
      .eq("supplier_id", ext.supplier_id)
      .order("time", { ascending: true, nullsFirst: false })
      .order("order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!item) {
      return {
        error: erroParcial(
          feitos,
          "o horário: este fornecedor não tem item no roteiro do dia."
        ),
      };
    }
    const { data: upd, error } = await supabase
      .from("roteiro_items")
      .update({
        time: `${escolhas.horario.hora}:00`,
        origem_horario: "fornecedor",
      })
      .eq("id", item.id)
      .eq("event_id", eventId)
      .select("id");
    if (error || !upd?.length) {
      return { error: erroParcial(feitos, "o horário no roteiro.") };
    }
    feitos.push(`horário ${escolhas.horario.hora} em "${item.title}"`);
  }

  // ---- a borda do dia do ESPAÇO (aposta 2) → tabela espacos ----
  // O destino é o LUGAR (espacos.*, 129), que o Roteiro passa a ler para
  // o aviso de conflito. Só as colunas marcadas são tocadas — endereço,
  // transporte e o resto do cadastro ficam como estão.
  if (espacoMarcado) {
    const e = escolhas.espaco!;
    const { data: evRow } = await supabase
      .from("events")
      .select("espaco_id, location")
      .eq("id", eventId)
      .maybeSingle();

    let espacoId: string | null = evRow?.espaco_id ?? null;

    // sem espaço vinculado: o cadastro do fornecedor pode já SER um
    // espaço (espacos.supplier_id); senão nasce um, com o nome dele
    if (!espacoId && ext.supplier_id) {
      const { data: doFornecedor } = await supabase
        .from("espacos")
        .select("id")
        .eq("supplier_id", ext.supplier_id)
        .limit(1)
        .maybeSingle();
      espacoId = doFornecedor?.id ?? null;
    }
    if (!espacoId) {
      const { data: cargo } = await supabase.rpc("meu_cargo");
      const empresaId = (cargo as { empresa_id: string }[] | null)?.[0]?.empresa_id;
      if (!empresaId) {
        return { error: erroParcial(feitos, "o espaço: sessão sem empresa.") };
      }
      const { data: novo, error: errNovo } = await supabase
        .from("espacos")
        .insert({
          empresa_id: empresaId,
          nome: fornecedorNome,
          cidade: null,
          supplier_id: ext.supplier_id,
        })
        .select("id")
        .single();
      if (errNovo || !novo) {
        return { error: erroParcial(feitos, "o espaço: não consegui criar o cadastro.") };
      }
      espacoId = novo.id;
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (e.liberacao_montagem) patch.liberacao_montagem = e.liberacao_montagem;
    if (e.termino_som) patch.termino_som = e.termino_som;
    if (e.desmontagem_ate) patch.desmontagem_ate = e.desmontagem_ate;
    if (e.restricoes) patch.restricoes = e.restricoes.slice(0, 500);

    const { data: upEsp, error: errEsp } = await supabase
      .from("espacos")
      .update(patch)
      .eq("id", espacoId)
      .select("id");
    if (errEsp || !upEsp?.length) {
      return { error: erroParcial(feitos, "os horários do espaço.") };
    }

    // o evento passa a apontar para o espaço (se ainda não apontava) —
    // é por esse vínculo que o Roteiro acha a borda do dia
    if (!evRow?.espaco_id) {
      await supabase.from("events").update({ espaco_id: espacoId }).eq("id", eventId);
    }
    feitos.push("horários do espaço");
  }

  // ---- tudo entrou: agora sim, conferida (com autoria — 140) ----
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: fechada, error: errFechar } = await supabase
    .from("contrato_extracao")
    .update({
      status: "conferida",
      conferida_em: new Date().toISOString(),
      conferida_por: user?.id ?? null,
      aplicado: escolhas,
    })
    .eq("id", extracaoId)
    .eq("status", "proposta")
    .select("id");
  if (errFechar || !fechada?.length) {
    // raro: aplicou mas não fechou — dizer, nunca esconder
    return {
      error:
        "Tudo foi aplicado, mas a proposta não fechou. Recarregue e descarte-a para não aplicar duas vezes.",
    };
  }

  revalidar(eventId);
  return { success: true };
}

export async function descartarExtracao(
  eventId: string,
  extracaoId: string
): Promise<ResultadoExtracao> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contrato_extracao")
    // descartada_em, não conferida_em: a tela de histórico lista os dois
    // estados e não pode adivinhar qual é qual (140)
    .update({ status: "descartada", descartada_em: new Date().toISOString() })
    .eq("id", extracaoId)
    .eq("event_id", eventId)
    .eq("status", "proposta")
    .select("id");
  if (error || !data?.length) {
    return { error: "Não foi possível descartar." };
  }
  revalidar(eventId);
  return { success: true };
}

/**
 * Tira da fila um contrato que não vai passar pela leitura automática:
 * arquivo sem camada de texto (foto, docx) ou dados que ela já lançou à
 * mão. Nasce uma extração descartada com payload vazio — o unique de
 * solicitacao_id garante que a fila não cobra de novo. Se já existe
 * proposta, o caminho é descartarExtracao.
 */
export async function arquivarContratoSemLeitura(
  eventId: string,
  solicitacaoId: string
): Promise<ResultadoExtracao> {
  const supabase = createClient();

  const { data: sol } = await supabase
    .from("solicitacao_fornecedor")
    .select("id, supplier_id")
    .eq("id", solicitacaoId)
    .eq("event_id", eventId)
    .eq("tipo", "contrato")
    .maybeSingle();
  if (!sol) return { error: "Contrato não encontrado neste evento." };

  const { data, error } = await supabase
    .from("contrato_extracao")
    .insert({
      event_id: eventId,
      solicitacao_id: solicitacaoId,
      supplier_id: sol.supplier_id,
      payload: {
        schema: 1,
        valor_total: null,
        trecho_valor: null,
        parcelas: [],
        quantidades: [],
        horarios: [],
      },
      status: "descartada",
      descartada_em: new Date().toISOString(),
    })
    .select("id");
  if (error) {
    if (error.code === "23505") {
      return { error: "Este contrato já tem uma leitura — descarte-a por lá." };
    }
    console.error("[vela:extracao] arquivar:", error.message);
    return { error: "Não foi possível tirar da fila." };
  }
  if (!data?.length) {
    return { error: "Você não tem permissão para editar este evento." };
  }
  revalidar(eventId);
  return { success: true };
}

function erroParcial(feitos: string[], falhou: string): string {
  return feitos.length === 0
    ? `Nada foi aplicado — falhou ${falhou}`
    : `Aplicação INCOMPLETA: entrou ${feitos.join(", ")}; falhou ${falhou} A proposta continua aberta — desmarque o que já entrou antes de tentar de novo.`;
}

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/fornecedores`);
  revalidatePath(`/eventos/${eventId}/financeiro`);
  revalidatePath(`/eventos/${eventId}/operacao`);
  revalidatePath(`/eventos/${eventId}/roteiro`);
  // a área de Contratos (140): a fila global e a aba do evento
  revalidatePath("/contratos");
  revalidatePath(`/eventos/${eventId}/contratos`);
}
