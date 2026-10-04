import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FornecedorVinculado } from "@/lib/fechado";

// Os fornecedores vinculados ao evento (roteiro_links), com as categorias:
// o Fechado usa quando a contratação não tem o fornecedor anotado na
// decisão. A mesma informação vivia em dois lugares — vinculado na
// Organização, vazio no Planejamento — e a tela dizia "fornecedor não
// anotado" para um buffet que estava no roteiro.

export async function getVinculadosDoEvento(eventId: string): Promise<FornecedorVinculado[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roteiro_links")
    .select("role, suppliers(name, category, supplier_categorias(categoria))")
    .eq("event_id", eventId);
  if (error || !data) return [];
  const lista: FornecedorVinculado[] = [];
  for (const v of data as unknown as {
    role: string | null;
    suppliers: { name: string; category: string | null; supplier_categorias: { categoria: string }[] | null } | null;
  }[]) {
    const s = v.suppliers;
    if (!s?.name) continue;
    const termos = [v.role, s.category, ...(s.supplier_categorias ?? []).map((c) => c.categoria)].filter(
      (t): t is string => !!t && t.trim().length > 0
    );
    lista.push({ nome: s.name, termos });
  }
  return lista;
}
