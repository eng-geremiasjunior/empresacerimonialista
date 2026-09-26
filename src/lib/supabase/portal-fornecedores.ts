import "server-only";

// Fornecedores do portal v2 (181): os da cerimonialista (nome, categoria,
// se já está contratado e o que faz na noite; sem contato, sem valor) e
// os da família.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type FornecedorDaFesta = {
  id: string;
  nome: string;
  categoria: string | null;
  contratado: boolean;
  naNoite: { hora: string | null; titulo: string }[];
};

export type FornecedorDaFamilia = {
  id: string;
  nome: string;
  oQueFaz: string | null;
  contato: string | null;
  contratado: boolean;
  autor: string | null;
};

export const getFornecedoresDoPortal = cache(
  async (eventId: string): Promise<{ daCerimonialista: FornecedorDaFesta[]; daFamilia: FornecedorDaFamilia[] }> => {
    const supabase = createClient();
    const [festa, familia] = await Promise.all([
      supabase.rpc("portal_fornecedores_da_festa", { p_event_id: eventId }),
      supabase
        .from("familia_fornecedor")
        .select("id, nome, o_que_faz, contato, contratado, autor_nome")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
    ]);
    const daCerimonialista = ((festa.error ? [] : festa.data ?? []) as {
      id: string;
      nome: string;
      categoria: string | null;
      contratado: boolean;
      na_noite: { hora: string | null; titulo: string }[];
    }[]).map((f) => ({
      id: f.id,
      nome: f.nome,
      categoria: f.categoria,
      contratado: f.contratado,
      naNoite: (f.na_noite ?? []).map((m) => ({ hora: m.hora ? m.hora.slice(0, 5) : null, titulo: m.titulo })),
    }));
    const daFamilia = ((familia.data ?? []) as {
      id: string;
      nome: string;
      o_que_faz: string | null;
      contato: string | null;
      contratado: boolean;
      autor_nome: string | null;
    }[]).map((f) => ({ id: f.id, nome: f.nome, oQueFaz: f.o_que_faz, contato: f.contato, contratado: f.contratado, autor: f.autor_nome }));
    return { daCerimonialista, daFamilia };
  }
);
