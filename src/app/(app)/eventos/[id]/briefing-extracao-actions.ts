"use server";

// A conferência do briefing colado: o único caminho pelo qual a proposta
// vira dado — e sempre PELAS ACTIONS EXISTENTES.
//
//   verba          → salvarCampo('verba_total'); o espelho da 121 leva a
//                    events.verba_total (a coluna nunca é escrita aqui);
//   teto           → events.guests_max, o "talvez 240" que não dimensiona
//                    nada e que antes obrigava o modelo a escolher um
//                    número em silêncio;
//   fornecedor     → salvarVerbaFornecedor quando está contratado,
//                    registrarEstimativaFornecedor quando o valor existe
//                    sem contrato (alocado continua nulo);
//   parcela        → criarLancamento, sempre NÃO paga;
//   não teremos    → marcarNaoSeAplica na decisão de contratar da categoria;
//   quantidades    → criarRecurso + comprado (o que o fornecedor oferece)
//                    e previsto (o que a cliente quer, base_origem manual);
//   estilo         → salvarCampo nos campos que o método do evento tem.
//
// Nenhum valor de fornecedor toca events.contract_value: aquilo é o
// honorário dela, e foi confundi-los que inflou o faturamento (143).
//
// Só entra o que está marcado. A validação inteira vem antes da primeira
// escrita; falha no meio diz o que já entrou e a proposta continua
// aberta — dinheiro não entra duas vezes em silêncio.

import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redigirContatos } from "@/lib/assistente-gate";
import { formatCurrency } from "@/lib/format";
import { categoriaLabel } from "@/lib/fornecedores-shared";
import type { EscolhasBriefing } from "@/lib/briefing-aplicacao";
import type { TipoCampo } from "@/lib/planejamento-shared";
import { criarLancamento } from "@/app/(app)/eventos/[id]/financeiro/lancamento-actions";
import {
  registrarEstimativaFornecedor,
  salvarVerbaFornecedor,
  type ItemVerba,
} from "@/app/(app)/eventos/[id]/financeiro/verba-actions";
import {
  criarRecurso,
  salvarNumero,
} from "@/app/(app)/eventos/[id]/operacao/actions";
import {
  marcarNaoSeAplica,
  salvarCampo,
} from "@/app/(app)/eventos/[id]/planejamento/actions";

/** `aviso` = o que ela precisa saber e não impediu o resto de entrar. */
export type ResultadoBriefing =
  | { error: string }
  | { success: true; aviso: string | null };

type Alvo =
  | "verba_fornecedor"
  | "lancamento"
  | "recurso"
  | "evento"
  | "campo"
  | "decisao";

// A decisão "Contratar X" de cada categoria (084). Só entram as que são de
// UMA categoria: 'som_luz_contratar' vale por som e por iluminação, e
// 'dj_contratar' por DJ e banda — marcar "não teremos" numa mataria a
// outra em silêncio. As de fora saem no aviso, não por adivinhação.
const DECISAO_CONTRATAR: Record<string, string> = {
  buffet: "buffet_contratar",
  fotografia: "foto_contratar",
  filmagem: "video_contratar",
  decoracao: "decoracao_contratar",
  celebrante: "celebrante_contratar",
  papelaria: "papelaria_contratar",
  transporte_materiais: "transporte_contratar",
};

// Os códigos do extrator escritos como ela fala — o texto vai para um
// campo que a cerimonialista lê e edita.
const ESTILO_TEXTO: Record<string, string> = {
  classico: "clássico",
  rustico: "rústico",
  boho: "boho",
  moderno: "moderno",
  minimalista: "minimalista",
  tropical: "tropical",
};

const CLIMA_TEXTO: Record<string, string> = {
  intimo: "íntimo",
  equilibrado: "equilibrado",
  grandioso: "grandioso",
};

export async function aplicarBriefingExtracao(
  eventId: string,
  extracaoId: string,
  escolhas: EscolhasBriefing
): Promise<ResultadoBriefing> {
  const supabase = createClient();

  const { data: ext } = await supabase
    .from("briefing_extracao")
    .select("id, status, payload")
    .eq("id", extracaoId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!ext) return { error: "Proposta não encontrada neste evento." };
  if (ext.status !== "proposta") {
    return { error: "Esta proposta já foi conferida ou descartada." };
  }

  const verba = escolhas.verba?.manter ? escolhas.verba : null;
  const teto = escolhas.convidadosTeto?.manter ? escolhas.convidadosTeto : null;
  const fornecedores = escolhas.fornecedores.filter((f) => f.manter);
  const quantidades = escolhas.quantidades.filter((q) => q.manter);
  const estilo = escolhas.estilo?.manter ? escolhas.estilo : null;

  const marcados =
    (verba ? 1 : 0) +
    (teto ? 1 : 0) +
    fornecedores.length +
    quantidades.length +
    (estilo ? 1 : 0);
  if (marcados === 0) return { error: "Nada marcado para aplicar." };

  // ---- validação antes de escrever QUALQUER coisa ----
  if (verba && !valorValido(verba.valor)) {
    return { error: "O orçamento precisa de um valor." };
  }
  if (teto && (!Number.isFinite(teto.valor) || teto.valor <= 0)) {
    return { error: "O teto de convidados precisa de um número." };
  }

  const fornecedoresVistos = new Set<string>();
  for (const f of fornecedores) {
    const nome = nomeDoItem(f.nome, f.categoria);
    if (f.valor != null && !valorValido(f.valor)) {
      return { error: `O valor de ${nome} não é um número válido.` };
    }
    // valor sem cadastro não tem onde entrar: a verba e a parcela moram no
    // fornecedor, não na categoria
    if (f.valor != null && f.estado !== "nao_teremos" && !f.supplierId) {
      return { error: `Escolha o cadastro de ${nome} antes de aplicar o valor.` };
    }
    if (f.supplierId) {
      if (fornecedoresVistos.has(f.supplierId)) {
        return { error: `${nome} está em duas linhas — deixe uma só.` };
      }
      fornecedoresVistos.add(f.supplierId);
    }
  }

  for (const q of quantidades) {
    if (!q.item.trim()) return { error: "Há uma quantidade sem item." };
    if (q.ofertado == null && q.desejado == null) {
      return { error: `"${q.item}" está sem número.` };
    }
    for (const n of [q.ofertado, q.desejado]) {
      if (n != null && (!Number.isFinite(n) || n <= 0)) {
        return { error: `O número de "${q.item}" não é válido.` };
      }
    }
  }

  const idsFornecedor = [...fornecedoresVistos];
  const nomeCadastrado = new Map<string, string>();
  if (idsFornecedor.length > 0) {
    const { data: sups } = await supabase
      .from("suppliers")
      .select("id, name")
      .in("id", idsFornecedor);
    for (const s of sups ?? []) nomeCadastrado.set(s.id, s.name);
    if (nomeCadastrado.size < idsFornecedor.length) {
      return {
        error: "Um dos fornecedores escolhidos não existe mais. Recarregue a tela.",
      };
    }
  }

  // A parcela do fornecedor vence até a festa — nasce como pendência com
  // prazo, não como cobrança de hoje. Sem data no evento, hoje mesmo.
  let vencimento = format(new Date(), "yyyy-MM-dd");
  if (fornecedores.some((f) => f.lancarParcela)) {
    const { data: ev } = await supabase
      .from("events")
      .select("date")
      .eq("id", eventId)
      .maybeSingle();
    if (ev?.date) vencimento = String(ev.date);
  }

  const feitos: string[] = [];
  const avisos: string[] = [];
  let semOrigem = 0;

  // Uma linha de proveniência por item aplicado: é ela que responde
  // "por que este número é este?" seis meses depois.
  const anotar = async (
    alvo: Alvo,
    alvoId: string | null,
    rotulo: string,
    valor: string,
    trecho: string | null
  ) => {
    const { error } = await supabase.rpc("registrar_proveniencia", {
      p_event_id: eventId,
      p_fonte: "briefing_colado",
      p_alvo: alvo,
      p_alvo_id: alvoId,
      p_campo_label: rotulo,
      p_valor_novo: valor,
      p_trecho: trecho,
    });
    if (error) {
      console.error("[vela:briefing] proveniência:", error.message);
      semOrigem += 1;
    }
  };

  // ---- verba: pelo campo tipado; o espelho leva a events (121) ----
  if (verba) {
    const campo = await campoPorCodigo(supabase, eventId, "verba_total");
    if (!campo) {
      avisos.push("O orçamento não entrou: este evento não tem o campo de verba.");
    } else {
      const r = await salvarCampo(
        eventId,
        campo.id,
        campo.tipo,
        "verba_total",
        verba.valor
      );
      if ("error" in r) {
        return { error: erroParcial(feitos, `o orçamento: ${r.error}`) };
      }
      feitos.push("o orçamento");
      await anotar(
        "campo",
        campo.id,
        "Verba total",
        formatCurrency(verba.valor),
        trechoDoPayload(ext.payload, "verba")
      );
    }
  }

  // ---- o teto do público: guarda o "talvez 240" ----
  // A mesma regra do wizard (novo/actions.ts): teto que não é MAIOR que a
  // estimativa não é possibilidade nenhuma — gravá-lo escreveria no banco
  // um "pode chegar a 200" para um evento de 220.
  if (teto) {
    const valor = Math.round(teto.valor);
    const { data: evAtual } = await supabase
      .from("events")
      .select("guests")
      .eq("id", eventId)
      .maybeSingle();
    const estimativa = (evAtual?.guests as number | null) ?? null;

    if (estimativa != null && valor <= estimativa) {
      avisos.push("O teto não entrou: ele não é maior que o número de convidados.");
    } else {
      const { data, error } = await supabase
        .from("events")
        .update({ guests_max: valor })
        .eq("id", eventId)
        .select("id");
      if (error || !data?.length) {
        return { error: erroParcial(feitos, "o teto de convidados.") };
      }
      feitos.push("o teto de convidados");
      await anotar(
        "evento",
        eventId,
        "Teto de convidados",
        String(valor),
        trechoDoPayload(ext.payload, "convidados")
      );
    }
  }

  // ---- fornecedores ----
  for (const f of fornecedores) {
    const nome = f.supplierId
      ? nomeCadastrado.get(f.supplierId) ?? nomeDoItem(f.nome, f.categoria)
      : nomeDoItem(f.nome, f.categoria);
    const trecho = limpar(f.trecho);

    if (f.estado === "nao_teremos") {
      const dec = await decisaoDeContratar(supabase, eventId, f.categoria);
      if (!dec) {
        avisos.push(
          `"Não teremos ${categoriaLabel(f.categoria)}" ficou de fora: este método não tem essa decisão.`
        );
        continue;
      }
      if (dec.estado !== "pendente") {
        avisos.push(`"${dec.titulo}" já estava resolvida — deixei como estava.`);
        continue;
      }
      const r = await marcarNaoSeAplica(eventId, dec.id);
      if ("error" in r) {
        return { error: erroParcial(feitos, `"${dec.titulo}": ${r.error}`) };
      }
      feitos.push(`"${dec.titulo}" fora do método`);
      await anotar("decisao", dec.id, dec.titulo, "não se aplica", trecho);
      continue;
    }

    // Sem valor não há o que escrever no financeiro — mas ela MARCOU a
    // linha, e sumir calado com o que ela marcou é a única coisa que a
    // caixa promete não fazer ("só entra o que está marcado"). O nome e o
    // trecho ficam na proveniência, e o resumo diz o que ficou de fora.
    if (f.valor == null) {
      avisos.push(
        f.estado === "contratado"
          ? `${nome} não entrou: contratado, mas sem valor no texto.`
          : `${nome} não entrou: o texto não diz o valor. Anotei no histórico do evento.`
      );
      await anotar("verba_fornecedor", null, `Citado — ${nome}`, ESTADO_DITO[f.estado], trecho);
      continue;
    }

    // Só o contrato vira comprometimento. Valor falado por telefone é
    // estimativa, e estimativa não abate verba nenhuma (083).
    if (f.estado === "contratado") {
      // a estimativa que já estava lá volta no formulário: é dela que sai
      // a economia (estimado − alocado), e o formulário grava o que recebe
      const antes = await verbaAtual(supabase, eventId, f.supplierId!);

      // Verba já detalhada em itens: o total dela é a SOMA dos itens (regra
      // do formulário). Gravar o número do briefing por cima significaria
      // apagar o detalhamento para depois ser corrigido pela soma — ou
      // pior, mudar o total sem que nada na tela explique. Não sobrescreve
      // e diz por quê; o número do briefing continua no histórico.
      if (antes && antes.itens.length > 0 && antes.somaItens !== f.valor) {
        avisos.push(
          `A verba de ${nome} já está detalhada em ${antes.itens.length} ${
            antes.itens.length === 1 ? "item" : "itens"
          } (${formatCurrency(antes.somaItens ?? 0)}). Não troquei pelo valor do briefing (${formatCurrency(
            f.valor
          )}) — confira no Financeiro.`
        );
        continue;
      }

      const fd = new FormData();
      fd.set("supplier_id", f.supplierId!);
      fd.set("valor_alocado", emReais(f.valor));
      if (antes?.estimado != null) {
        fd.set("valor_estimado_inicial", emReais(antes.estimado));
      }
      // a observação dela volta como estava: sem isto o upsert a zeraria
      if (antes?.observacao) fd.set("observacao", antes.observacao);
      const r = await salvarVerbaFornecedor(eventId, antes?.itens ?? [], null, fd);
      if (!r || "error" in r) {
        const msg = r && "error" in r ? r.error : "não foi possível salvar.";
        return { error: erroParcial(feitos, `a verba de ${nome}: ${msg}`) };
      }
      feitos.push(`a verba de ${nome}`);
      await anotar(
        "verba_fornecedor",
        antes?.id ?? (await verbaAtual(supabase, eventId, f.supplierId!))?.id ?? null,
        `Verba — ${nome}`,
        formatCurrency(f.valor),
        trecho
      );

      // Uma segunda tentativa depois de falha parcial (ou dois cliques, ou
      // duas abas) não pode virar R$ 65.000 a pagar num contrato de
      // R$ 32.500: criarLancamento é INSERT puro, sem dedup.
      const jaLancada = f.lancarParcela
        ? await parcelaJaLancada(supabase, eventId, f.supplierId!, f.valor, `Contrato ${nome}`)
        : false;

      if (f.lancarParcela && jaLancada) {
        feitos.push(`a parcela de ${nome} (já estava lançada)`);
      } else if (f.lancarParcela) {
        const rl = await criarLancamento(eventId, {
          direcao: "saida",
          descricao: `Contrato ${nome}`,
          valor: f.valor,
          vencimento,
          supplierId: f.supplierId,
          objetivoId: null,
          tipo: "saldo",
          // "cliente_direto" é o único que NÃO afirma nada: o briefing diz
          // que o buffet custa 32.500, nunca de qual bolso sai. Marcar
          // "caixa" faria o evento cobrar dela, 30 dias antes da festa, um
          // repasse que a cliente talvez pague direto ao fornecedor
          // ("Peça R$ 32.500 à cliente" aparecendo sozinho na tela).
          origem: "cliente_direto",
          jaPago: false,
          parcelas: 1,
        });
        if ("error" in rl) {
          return { error: erroParcial(feitos, `a parcela de ${nome}: ${rl.error}`) };
        }
        feitos.push(`a parcela de ${nome}`);
        await anotar(
          "lancamento",
          null,
          `Parcela — ${nome}`,
          `${formatCurrency(f.valor)} em ${vencimento}`,
          trecho
        );
      }
      continue;
    }

    const re = await registrarEstimativaFornecedor(eventId, f.supplierId!, f.valor);
    if ("error" in re) {
      return { error: erroParcial(feitos, `a estimativa de ${nome}: ${re.error}`) };
    }
    feitos.push(`a estimativa de ${nome}`);
    await anotar(
      "verba_fornecedor",
      re.id,
      `Estimativa — ${nome}`,
      formatCurrency(f.valor),
      trecho
    );
  }

  // ---- quantidades: o que oferecem e o que ela quer, lado a lado ----
  for (const q of quantidades) {
    const item = q.item.trim();

    // Todo evento nasce com os recursos do método já instanciados. Criar
    // sem procurar fazia o número do briefing entrar numa SEGUNDA linha, e
    // a Operação passava a contar o mesmo item duas vezes (2.200 salgados
    // viravam 4.400 na lista de compras).
    const achado = await recursoDoEvento(supabase, eventId, item);
    let recursoId = achado.exato?.id ?? null;

    if (!recursoId) {
      const r = await criarRecurso(eventId, {
        nome: item,
        unidade: q.unidade?.trim() || "unidades",
        regra: "fixo",
        indice: q.desejado ?? q.ofertado ?? 0,
      });
      if ("error" in r || !r.id) {
        const msg = "error" in r ? r.error : "o item não devolveu id.";
        return { error: erroParcial(feitos, `o item "${item}": ${msg}`) };
      }
      recursoId = r.id;
      // parecido não é o mesmo: juntar "doces" com "Doces finos" por conta
      // própria erraria uma hora. Cria e conta, para ela decidir.
      if (achado.parecidos.length > 0) {
        avisos.push(
          `Criei o item "${item}". A Operação já tem ${achado.parecidos
            .map((p) => `"${p}"`)
            .join(" e ")} — se for a mesma coisa, junte os dois lá.`
        );
      }
    }

    if (!recursoId) {
      return { error: erroParcial(feitos, `o item "${item}": sem id.`) };
    }
    const r = { id: recursoId };
    if (q.ofertado != null) {
      const rc = await salvarNumero(eventId, r.id, "comprado", q.ofertado);
      if ("error" in rc) {
        return { error: erroParcial(feitos, `o que oferecem em "${item}": ${rc.error}`) };
      }
    }
    if (q.desejado != null) {
      // previsto pela porta da Operação: é lá que base_origem vira
      // 'manual' e o Recalcular para de apagar o pedido dela
      const rp = await salvarNumero(eventId, r.id, "previsto", q.desejado);
      if ("error" in rp) {
        return { error: erroParcial(feitos, `o pedido em "${item}": ${rp.error}`) };
      }
    }
    feitos.push(`o item ${item}`);
    await anotar("recurso", r.id, item, textoDaQuantidade(q), limpar(q.trecho));
  }

  // ---- estilo: só nos campos que o método deste evento tem ----
  if (estilo) {
    const frase = fraseDoEstilo(estilo);
    if (frase) {
      const campo = await campoPorCodigo(supabase, eventId, "estilo_desejado");
      if (!campo) {
        avisos.push("O estilo não entrou: este evento não tem o campo de estilo.");
      } else {
        const r = await salvarCampo(
          eventId,
          campo.id,
          campo.tipo,
          "estilo_desejado",
          frase
        );
        if ("error" in r) {
          return { error: erroParcial(feitos, `o estilo: ${r.error}`) };
        }
        feitos.push("o estilo");
        await anotar("campo", campo.id, "Estilo desejado", frase, limpar(estilo.trecho));
      }
    }
    if (estilo.cores.length > 0) {
      const cores = estilo.cores.join(", ");
      const campo = await campoPorCodigo(supabase, eventId, "paleta_cores");
      if (!campo) {
        avisos.push("As cores não entraram: este evento não tem o campo de paleta.");
      } else {
        const r = await salvarCampo(
          eventId,
          campo.id,
          campo.tipo,
          "paleta_cores",
          cores
        );
        if ("error" in r) {
          return { error: erroParcial(feitos, `as cores: ${r.error}`) };
        }
        feitos.push("as cores");
        await anotar("campo", campo.id, "Paleta de cores", cores, limpar(estilo.trecho));
      }
    }
  }

  // Marcado mas nada aplicável: fechar seria dizer que entrou.
  if (feitos.length === 0) {
    return {
      error: `Nada entrou.${avisos.length > 0 ? ` ${avisos.join(" ")}` : ""}`,
    };
  }

  if (semOrigem > 0) {
    avisos.push(
      `Não consegui registrar a origem de ${semOrigem} ${semOrigem === 1 ? "item" : "itens"}.`
    );
  }

  // ---- tudo que dava para aplicar entrou: agora sim, conferida ----
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: fechada, error: errFechar } = await supabase
    .from("briefing_extracao")
    .update({
      status: "conferida",
      conferida_em: new Date().toISOString(),
      conferida_por: user?.id ?? null,
      aplicado: { feitos, escolhas: semContatos(escolhas) },
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
  return { success: true, aviso: avisos.length > 0 ? avisos.join(" ") : null };
}

export async function descartarBriefingExtracao(
  eventId: string,
  extracaoId: string
): Promise<ResultadoBriefing> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("briefing_extracao")
    // descartada_em, não conferida_em: os dois estados convivem na mesma
    // linha e ninguém pode adivinhar qual é qual (140)
    .update({ status: "descartada", descartada_em: new Date().toISOString() })
    .eq("id", extracaoId)
    .eq("event_id", eventId)
    .eq("status", "proposta")
    .select("id");
  if (error || !data?.length) {
    return { error: "Não foi possível descartar." };
  }
  revalidar(eventId);
  return { success: true, aviso: null };
}

/* ------------------------------------------------------------------ */

function valorValido(v: number): boolean {
  return Number.isFinite(v) && v > 0;
}

// numeroOuNulo do formulário de verba lê no formato daqui (ponto é
// milhar): mandar "32500.5" viraria 325005.
function emReais(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

function nomeDoItem(nome: string | null, categoria: string): string {
  return nome?.trim() || categoriaLabel(categoria);
}

/** O trecho nunca sai daqui com contato dentro (nem no registro). */
function limpar(texto: string | null): string | null {
  if (!texto) return null;
  return redigirContatos(texto).texto.slice(0, 300) || null;
}

// A verba e o teto viajam nas escolhas só com o número; a citação está no
// payload guardado — que é a fonte confiável, já redigida na gravação.
function trechoDoPayload(payload: unknown, qual: "verba" | "convidados"): string | null {
  const p = payload as
    | {
        verba_total?: { trecho?: string | null } | null;
        evento?: { convidados?: { trecho?: string | null } | null } | null;
      }
    | null;
  const bruto =
    qual === "verba"
      ? p?.verba_total?.trecho ?? null
      : p?.evento?.convidados?.trecho ?? null;
  return limpar(bruto ?? null);
}

function textoDaQuantidade(q: {
  ofertado: number | null;
  desejado: number | null;
  unidade: string | null;
}): string {
  const u = q.unidade ? ` ${q.unidade}` : "";
  const partes: string[] = [];
  if (q.ofertado != null) partes.push(`${q.ofertado}${u} do fornecedor`);
  if (q.desejado != null) partes.push(`${q.desejado}${u} pedidos pela cliente`);
  return partes.join("; ");
}

/** "boho · clima íntimo · não querem rosa" — o texto que ela lê e edita. */
function fraseDoEstilo(e: {
  estilo: string | null;
  vetos: string[];
  clima: string | null;
}): string | null {
  const partes: string[] = [];
  if (e.estilo) partes.push(ESTILO_TEXTO[e.estilo] ?? e.estilo);
  if (e.clima) partes.push(`clima ${CLIMA_TEXTO[e.clima] ?? e.clima}`);
  if (e.vetos.length > 0) partes.push(`não querem ${e.vetos.join(", ")}`);
  return partes.length > 0 ? partes.join(" · ") : null;
}

function semContatos(escolhas: EscolhasBriefing): EscolhasBriefing {
  return {
    ...escolhas,
    fornecedores: escolhas.fornecedores.map((f) => ({ ...f, trecho: limpar(f.trecho) })),
    quantidades: escolhas.quantidades.map((q) => ({ ...q, trecho: limpar(q.trecho) })),
    estilo: escolhas.estilo
      ? { ...escolhas.estilo, trecho: limpar(escolhas.estilo.trecho) }
      : undefined,
  };
}

async function campoPorCodigo(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  codigo: string
): Promise<{ id: string; tipo: TipoCampo } | null> {
  const { data } = await supabase
    .from("evento_campo_valor")
    .select("id, tipo")
    .eq("event_id", eventId)
    .eq("codigo", codigo)
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id as string, tipo: data.tipo as TipoCampo } : null;
}

/**
 * Esta parcela já está no financeiro? criarLancamento é INSERT puro: sem
 * esta pergunta, repetir a aplicação (falha no meio, dois cliques, duas
 * abas) dobraria o valor a pagar de um contrato que não mudou.
 */
async function parcelaJaLancada(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  supplierId: string,
  valor: number,
  descricao: string
): Promise<boolean> {
  const { data } = await supabase
    .from("transactions")
    .select("id")
    .eq("event_id", eventId)
    .eq("supplier_id", supplierId)
    .eq("description", descricao)
    .eq("value", valor)
    .eq("paid", false)
    .limit(1);
  return (data ?? []).length > 0;
}

/** O estado do fornecedor dito em português, para a linha do histórico. */
const ESTADO_DITO: Record<string, string> = {
  contratado: "contratado, sem valor no texto",
  em_conversa: "em conversa",
  pendente: "citado, ainda não fechado",
  nao_teremos: "não teremos",
};

// O código do recurso é derivado do nome, do mesmo jeito em toda a casa
// (criarRecurso, em operacao/actions.ts). A faixa de acentos vai em
// escape unicode, não em caractere literal.
function codigoDoNome(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "item"
  );
}

/**
 * O item do briefing já existe neste evento? `exato` é o mesmo item (mesmo
 * código ou mesmo nome normalizado) — nele se escreve, sem criar linha
 * nova. `parecidos` são vizinhos de nome ("doces" × "doces_finos"): não
 * dá para juntá-los sozinho sem errar um dia, então viram aviso.
 */
async function recursoDoEvento(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  nome: string
): Promise<{ exato: { id: string; nome: string } | null; parecidos: string[] }> {
  const base = codigoDoNome(nome);
  const { data } = await supabase
    .from("evento_recurso")
    .select("id, nome, codigo")
    .eq("event_id", eventId);

  const linhas = (data ?? []) as { id: string; nome: string; codigo: string }[];
  const exato =
    linhas.find((l) => l.codigo === base || codigoDoNome(l.nome) === base) ?? null;

  return {
    exato: exato ? { id: exato.id, nome: exato.nome } : null,
    parecidos: exato
      ? []
      : linhas
          .filter(
            (l) => l.codigo.startsWith(`${base}_`) || base.startsWith(`${l.codigo}_`)
          )
          .map((l) => l.nome),
  };
}

// Lê a verba que já existe INTEIRA — não só o estimado. salvarVerbaFornecedor
// é a action do formulário completo: ela apaga todos os itens do orçamento e
// regrava a observação com o que receber. Escrever um campo só por essa porta
// custaria o detalhamento e a nota que ela digitou no Financeiro.
async function verbaAtual(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  supplierId: string
): Promise<{
  id: string;
  estimado: number | null;
  observacao: string | null;
  itens: ItemVerba[];
  somaItens: number | null;
} | null> {
  const { data } = await supabase
    .from("evento_fornecedor_orcamento")
    .select("id, valor_estimado_inicial, observacao")
    .eq("event_id", eventId)
    .eq("supplier_id", supplierId)
    .maybeSingle();
  if (!data) return null;

  const id = data.id as string;
  const { data: linhas } = await supabase
    .from("evento_fornecedor_item")
    .select("descricao, valor_estimado_inicial, valor_negociado")
    .eq("evento_fornecedor_orcamento_id", id);

  const itens: ItemVerba[] = (linhas ?? []).map((l) => ({
    descricao: String(l.descricao ?? ""),
    valorEstimadoInicial:
      l.valor_estimado_inicial == null ? null : Number(l.valor_estimado_inicial),
    valorNegociado: l.valor_negociado == null ? null : Number(l.valor_negociado),
  }));

  const estimado = data.valor_estimado_inicial;
  return {
    id,
    estimado: estimado == null ? null : Number(estimado),
    observacao: (data.observacao as string | null) ?? null,
    itens,
    somaItens: itens.length
      ? itens.reduce((s, i) => s + (i.valorNegociado ?? 0), 0)
      : null,
  };
}

// A decisão de contratar daquela categoria neste evento. O código mora no
// template (evento_decisao só guarda o id dele), por isso os dois passos.
async function decisaoDeContratar(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  categoria: string
): Promise<{ id: string; titulo: string; estado: string } | null> {
  const codigo = DECISAO_CONTRATAR[categoria];
  if (!codigo) return null;

  const { data: templates } = await supabase
    .from("metodo_decisao")
    .select("id")
    .eq("codigo", codigo);
  const ids = (templates ?? []).map((t) => t.id as string);
  if (ids.length === 0) return null;

  const { data } = await supabase
    .from("evento_decisao")
    .select("id, titulo, estado")
    .eq("event_id", eventId)
    .in("decisao_template_id", ids)
    .limit(1);
  const dec = data?.[0];
  return dec
    ? { id: dec.id as string, titulo: dec.titulo as string, estado: dec.estado as string }
    : null;
}

function erroParcial(feitos: string[], falhou: string): string {
  return feitos.length === 0
    ? `Nada foi aplicado — falhou ${falhou}`
    : // "desmarque o que já entrou" era impossível de seguir: verba e
      // parcela dividem uma caixinha só, e desmarcá-la perderia a parcela.
      // Agora a repetição é inofensiva — verba é upsert, o item encontra o
      // que já existe e a parcela reconhece a que acabou de lançar.
      `Aplicação INCOMPLETA: entrou ${feitos.join(", ")}; falhou ${falhou} A proposta continua aberta — pode tentar de novo, o que já entrou não entra duas vezes.`;
}

function revalidar(eventId: string) {
  // a caixa vive na tela do evento e o que ela aplica se espalha pelas
  // abas — uma revalidação de layout pega todas
  revalidatePath(`/eventos/${eventId}`, "layout");
}
