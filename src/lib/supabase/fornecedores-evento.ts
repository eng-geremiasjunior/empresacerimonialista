// Leitura dos fornecedores do evento — SÓ SERVIDOR.
//
// Junta as três fontes que sempre estiveram separadas na tela antiga:
// o vínculo (roteiro_links), o cadastro (suppliers) e o convite
// (supplier_confirmations, com as aberturas da 100). Devolve o tipo que
// fornecedores-core entende, e é ele — não a tela — que decide status,
// grupo e contagem.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Automacao, Fornecedor } from "@/lib/fornecedores-core";

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

    const [linksRes, confRes, evRes] = await Promise.all([
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
    ]);

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
