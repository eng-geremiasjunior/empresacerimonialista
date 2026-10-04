import "server-only";

// Os contratos e os comprovantes da noiva que abriu a conta sozinha
// (04/10/2026), lidos pela sessão dela. Os fornecedores e os pagamentos
// são os do Orçamento (getOrcamentoDaNoiva, o motor do Financeiro); o
// contrato de cada um é o da solicitação de contrato do sistema
// (solicitacao_fornecedor, tipo 'contrato') — a mesma porta pela qual o
// fornecedor ou a cerimonialista anexam. Nenhum caminho de arquivo sai
// daqui: o arquivo abre pela rota do portal, que busca o caminho no banco.

import { createClient } from "@/lib/supabase/server";
import { getOrcamentoDaNoiva, type PagamentoDaNoiva } from "@/lib/supabase/portal-orcamento";

export type ContratoDaNoiva = {
  supplierId: string;
  fornecedor: string;
  /** o assunto do planejamento ("Buffet e bebidas"), quando se sabe */
  assunto: string | null;
  /** o nome do arquivo anexado; null = ainda sem contrato */
  arquivo: string | null;
};

export type DocumentosDaNoiva = {
  contratos: ContratoDaNoiva[];
  /** os pagamentos feitos, do mais novo para o mais antigo */
  pagos: PagamentoDaNoiva[];
  /** os fornecedores do cadastro dela (o "de quem" do contrato avulso) */
  fornecedores: string[];
};

type SolicitacaoBruta = {
  supplier_id: string;
  resposta: { arquivo_path?: string; arquivo_nome?: string } | null;
  suppliers: { name: string } | { name: string }[] | null;
};

/** null = não é a dona da conta de família (ou a sessão não vê o evento). */
export async function getDocumentosDaNoiva(eventoId: string): Promise<DocumentosDaNoiva | null> {
  const orc = await getOrcamentoDaNoiva(eventoId);
  if (!orc) return null;
  const supabase = createClient();

  const { data: brutas } = await supabase
    .from("solicitacao_fornecedor")
    .select("supplier_id, resposta, suppliers(name)")
    .eq("event_id", eventoId)
    .eq("tipo", "contrato")
    .neq("status", "cancelada")
    .order("created_at", { ascending: false });

  // de cada fornecedor, o arquivo da solicitação mais nova que tem um
  const arquivoDe = new Map<string, string>();
  const nomeDe = new Map<string, string>();
  for (const s of (brutas ?? []) as unknown as SolicitacaoBruta[]) {
    const forn = Array.isArray(s.suppliers) ? s.suppliers[0] : s.suppliers;
    if (forn?.name) nomeDe.set(s.supplier_id, forn.name);
    if (s.resposta?.arquivo_path && !arquivoDe.has(s.supplier_id)) {
      arquivoDe.set(s.supplier_id, s.resposta.arquivo_nome?.trim() || "contrato");
    }
  }

  const dosGastos = orc.lista.filter((g) => g.tipo === "fornecedor");
  const jaListados = new Set(dosGastos.map((g) => g.chave));
  const contratos: ContratoDaNoiva[] = [
    ...dosGastos.map((g) => ({
      supplierId: g.chave,
      fornecedor: g.nome,
      assunto: g.assunto,
      arquivo: arquivoDe.get(g.chave) ?? null,
    })),
    // contrato anexado de quem ainda não tem gasto lançado
    ...[...arquivoDe.keys()]
      .filter((id) => !jaListados.has(id))
      .map((id) => ({ supplierId: id, fornecedor: nomeDe.get(id) ?? "Fornecedor", assunto: null, arquivo: arquivoDe.get(id) ?? null })),
  ].sort((a, b) => a.fornecedor.localeCompare(b.fornecedor, "pt-BR"));

  const pagos = orc.lista
    .flatMap((g) => g.pagamentos.filter((p) => p.pago))
    .sort((a, b) => b.vencimento.localeCompare(a.vencimento));

  return { contratos, pagos, fornecedores: orc.fornecedores };
}
