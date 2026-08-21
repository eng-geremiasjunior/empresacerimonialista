// Leitura dos fornecedores do evento — SÓ SERVIDOR.
//
// Junta as três fontes que sempre estiveram separadas na tela antiga:
// o vínculo (roteiro_links), o cadastro (suppliers) e o convite
// (supplier_confirmations, com as aberturas da 100). Devolve o tipo que
// fornecedores-core entende, e é ele — não a tela — que decide status,
// grupo e contagem.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Automacao,
  DinheiroDoFornecedor,
  Fornecedor,
} from "@/lib/fornecedores-core";

type LinkRow = {
  supplier_id: string;
  confirmed: boolean;
  created_at: string | null;
  suppliers: {
    name: string;
    category: string | null;
    email: string | null;
    whatsapp: string | null;
  } | null;
};

export type DadosFornecedores = {
  fornecedores: Fornecedor[];
  automacao: Automacao;
};

export const getFornecedoresDoEvento = cache(
  async (eventId: string): Promise<DadosFornecedores> => {
    const supabase = createClient();

    const [linksRes, confRes, evRes, pedidosRes, roteiroRes, dinheiroRes] =
      await Promise.all([
      supabase
        .from("roteiro_links")
        .select(
          "supplier_id, confirmed, created_at, suppliers(name, category, email, whatsapp)"
        )
        .eq("event_id", eventId),
      supabase
        .from("supplier_confirmations")
        .select(
          "supplier_id, status, sent_at, responded_at, aberturas, ultima_abertura"
        )
        .eq("event_id", eventId),
      supabase
        .from("events")
        .select("confirmation_days_before, whatsapp_auto, email_auto")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("solicitacao_fornecedor")
        // Todos os status, não só os vivos: o contrato JÁ ENTREGUE é o que
        // ela mais precisa achar depois, e ele mora numa solicitação
        // respondida.
        .select("id, supplier_id, tipo, status, resposta")
        .eq("event_id", eventId),
      // O Financeiro do evento já guarda a despesa com fornecedor
      // (transactions.supplier_id, migração 017). O que faltava era a
      // informação atravessar para cá: ela decide sobre o fornecedor
      // olhando para o fornecedor, não para a planilha.
      supabase
        .from("roteiro_items")
        .select('id, supplier_id, title, time, origem_horario, "order"')
        .eq("event_id", eventId)
        .not("supplier_id", "is", null)
        .order("time", { ascending: true, nullsFirst: false })
        .order("order", { ascending: true }),
      supabase
        .from("transactions")
        .select("supplier_id, value, paid, due_date")
        .eq("event_id", eventId)
        .eq("type", "despesa")
        .not("supplier_id", "is", null),
    ]);

    const pedidosPor = new Map<string, Fornecedor["pedidos"]>();
    for (const p of pedidosRes.data ?? []) {
      const lista = pedidosPor.get(p.supplier_id) ?? [];
      const r = (p.resposta ?? {}) as {
        arquivo_path?: string;
        arquivo_nome?: string;
      };
      lista.push({
        id: p.id,
        tipo: p.tipo,
        status: p.status,
        arquivoPath: r.arquivo_path ?? null,
        arquivoNome: r.arquivo_nome ?? null,
      });
      pedidosPor.set(p.supplier_id, lista);
    }

    // o item mais cedo de cada fornecedor no roteiro do dia — a query já
    // vem ordenada (time asc, nulos por último), então o primeiro vence
    const itemPor = new Map<string, Fornecedor["itemRoteiro"]>();
    for (const r of (roteiroRes.data ?? []) as {
      id: string;
      supplier_id: string;
      title: string;
      time: string | null;
      origem_horario: string | null;
    }[]) {
      if (!itemPor.has(r.supplier_id)) {
        itemPor.set(r.supplier_id, {
          id: r.id,
          titulo: r.title,
          horario: r.time,
          origem: r.origem_horario,
        });
      }
    }

    const dinheiroPor = new Map<string, DinheiroDoFornecedor>();
    for (const t of dinheiroRes.data ?? []) {
      const atual = dinheiroPor.get(t.supplier_id) ?? {
        contratado: 0,
        pago: 0,
        parcelasAbertas: 0,
        proximoVencimento: null,
      };
      const valor = Number(t.value) || 0;
      atual.contratado += valor;
      if (t.paid) atual.pago += valor;
      else {
        atual.parcelasAbertas += 1;
        if (
          t.due_date &&
          (!atual.proximoVencimento || t.due_date < atual.proximoVencimento)
        ) {
          atual.proximoVencimento = t.due_date;
        }
      }
      dinheiroPor.set(t.supplier_id, atual);
    }

    const convitePor = new Map<string, Fornecedor["convite"]>();
    for (const c of confRes.data ?? []) {
      convitePor.set(c.supplier_id, {
        status: c.status,
        enviadoEm: c.sent_at,
        respondidoEm: c.responded_at,
        aberturas: c.aberturas ?? 0,
        ultimaAbertura: c.ultima_abertura ?? null,
      });
    }

    const fornecedores = ((linksRes.data ?? []) as unknown as LinkRow[])
      .filter((l) => l.suppliers)
      .map<Fornecedor>((l) => ({
        supplierId: l.supplier_id,
        nome: l.suppliers!.name,
        categoria: l.suppliers!.category,
        email: l.suppliers!.email,
        whatsapp: l.suppliers!.whatsapp,
        confirmadoNoEvento: l.confirmed,
        vinculadoEm: l.created_at,
        convite: convitePor.get(l.supplier_id) ?? null,
        pedidos: pedidosPor.get(l.supplier_id) ?? [],
        dinheiro: dinheiroPor.get(l.supplier_id) ?? null,
        itemRoteiro: itemPor.get(l.supplier_id) ?? null,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return {
      fornecedores,
      automacao: {
        diasAntes: evRes.data?.confirmation_days_before ?? 7,
        // undefined (coluna nova ainda não aplicada) = ligado, que é o
        // comportamento histórico
        email: evRes.data?.email_auto !== false,
        whatsapp: evRes.data?.whatsapp_auto !== false,
      },
    };
  }
);
