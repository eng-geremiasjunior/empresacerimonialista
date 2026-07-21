// Tipos e helpers da página pública do orçamento (Etapa 5). O shape vem
// da RPC consultar_orcamento_publico — a tabela nunca é exposta.

export type OrcamentoPublicoItem = {
  nome: string;
  descricao: string | null;
  valor: number;
  tipo_calculo: "fixo" | "por_convidado" | "manual";
  valor_unitario: number | null;
  quantidade_convidados: number | null;
  taxa_fixa: number | null;
};

export type OrcamentoPublicoData = {
  nome_contato: string;
  tipo_evento: string;
  data_evento: string | null;
  local_evento: string | null;
  cidade_evento: string | null;
  numero_convidados: number | null;
  valor_total: number;
  data_criacao: string;
  data_validade: string;
  validade_dias: number;
  status: "rascunho" | "enviado" | "aprovado" | "recusado" | "expirado";
  respondido_em: string | null;
  ficha_preenchida: boolean;
  logo_url: string | null;
  nome_empresa: string;
  itens: OrcamentoPublicoItem[];
};

export function expirado(d: OrcamentoPublicoData): boolean {
  return (
    d.status === "expirado" ||
    (d.status === "enviado" &&
      d.data_validade < new Date().toISOString().slice(0, 10))
  );
}

// Data/hora legível de uma resposta (respondido_em vem em ISO).
export function dataResposta(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
