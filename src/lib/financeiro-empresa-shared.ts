// Tipos e categorias do financeiro da EMPRESA, compartilhados entre
// server (queries) e client (componentes). Não importar nada de servidor
// aqui — este módulo entra no bundle do navegador.

export const DESPESA_CATEGORIAS: Record<string, string> = {
  agua: "Água",
  luz: "Luz",
  internet: "Internet",
  impostos: "Impostos",
  funcionarios: "Funcionários",
  combustivel: "Combustível",
  aluguel: "Aluguel",
  alimentacao_manha: "Café da manhã",
  alimentacao_tarde: "Lanche da tarde",
  almoco: "Almoço",
  outro: "Outra despesa",
};

export const RECEITA_CATEGORIAS: Record<string, string> = {
  servico_prestado: "Serviço prestado",
  consultoria: "Consultoria",
  outro: "Outra receita",
};

// Categorias fixas exibidas como atalhos na seção "Despesas da empresa"
export const DESPESAS_FIXAS_SLUGS = [
  "agua",
  "luz",
  "internet",
  "impostos",
  "funcionarios",
  "combustivel",
  "aluguel",
  "alimentacao_manha",
  "alimentacao_tarde",
  "almoco",
] as const;

export function categoriaLabel(tipo: "receita" | "despesa", slug: string) {
  const map = tipo === "receita" ? RECEITA_CATEGORIAS : DESPESA_CATEGORIAS;
  return map[slug] ?? slug;
}

export type BusinessTransacao = {
  id: string;
  type: "receita" | "despesa";
  category: string;
  description: string | null;
  value: number;
  due_date: string | null;
  paid: boolean;
  recurring: boolean;
  created_at: string;
};

export type DespesaFixaInfo = {
  slug: string;
  ultimoValor: number | null;
  ultimaData: string | null;
  recorrente: boolean;
  lancadaEsteMes: boolean;
};

export type MesEmpresa = { mes: string; receita: number; despesas: number };

export type ResumoEmpresa = {
  receitaMes: number;
  despesasMes: number;
  saldoMes: number;
  migrationPendente: boolean;
};

export type SaldoEmpresaMes = {
  receitaMes: number;
  despesasMes: number;
  saldoMes: number;
} | null;
