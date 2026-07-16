// Tipos e constantes do módulo Fornecedores, compartilhados entre server
// e client. Não importar nada de servidor aqui.

export type TipoOperacional = "operacional" | "apoio" | "parceiro";
export type StatusFornecedor =
  | "ativo"
  | "inativo"
  | "bloqueado"
  | "favorito"
  | "parceiro_premium";
export type FaixaPreco = "economico" | "intermediario" | "premium";

export type Fornecedor = {
  id: string;
  name: string;
  descricao: string | null;
  tipo_operacional: TipoOperacional;
  status: StatusFornecedor;
  faixa_preco: FaixaPreco | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  endereco: string | null;
  cidade: string | null;
  categorias: string[];
  // Nº de eventos aos quais o fornecedor está vinculado (via roteiro_links).
  // Preenchido na listagem; 0 quando não calculado.
  eventos_atendidos?: number;
};

// A partir de quantos eventos um fornecedor é considerado "Frequente"
// (indicador automático de uso, distinto do status manual "Favorito").
export const LIMIAR_FREQUENTE = 5;

export const TIPO_OPERACIONAL_LABELS: Record<TipoOperacional, string> = {
  operacional: "Operacional",
  apoio: "Apoio",
  parceiro: "Parceiro",
};

export const TIPO_OPERACIONAL_BADGE: Record<TipoOperacional, string> = {
  operacional: "bg-blue-50 text-blue-700",
  apoio: "bg-slate-100 text-slate-600",
  parceiro: "bg-indigo-50 text-indigo-700",
};

export const STATUS_LABELS: Record<StatusFornecedor, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  bloqueado: "Bloqueado",
  favorito: "Favorito",
  parceiro_premium: "Parceiro Premium",
};

export const STATUS_BADGE: Record<StatusFornecedor, string> = {
  ativo: "bg-emerald-50 text-emerald-700",
  inativo: "bg-gray-100 text-gray-600",
  bloqueado: "bg-red-50 text-red-700",
  favorito: "bg-amber-50 text-amber-700",
  parceiro_premium: "bg-violet-50 text-violet-700",
};

export const FAIXA_PRECO_LABELS: Record<FaixaPreco, string> = {
  economico: "Econômico",
  intermediario: "Intermediário",
  premium: "Premium",
};

export const FAIXA_PRECO_CIFRAO: Record<FaixaPreco, string> = {
  economico: "$",
  intermediario: "$$",
  premium: "$$$",
};

// Categorias sugeridas, agrupadas. Lista aberta: o cadastro permite
// digitar uma categoria customizada fora desta lista.
export const CATEGORIAS_OPERACIONAIS: Record<string, string> = {
  buffet: "Buffet",
  fotografia: "Fotografia",
  filmagem: "Filmagem",
  dj: "DJ",
  banda: "Banda",
  som: "Som",
  iluminacao: "Iluminação",
  decoracao: "Decoração",
  flores: "Flores",
  celebrante: "Celebrante",
  mestre_cerimonias: "Mestre de Cerimônias",
  seguranca: "Segurança",
  limpeza: "Limpeza",
  gerador: "Gerador",
  estrutura: "Estrutura",
  mobiliario: "Mobiliário",
  cerimonial_religioso: "Cerimonial Religioso",
};

export const CATEGORIAS_APOIO: Record<string, string> = {
  lembrancinhas: "Lembrancinhas",
  grafica: "Gráfica",
  convites: "Convites",
  brindes: "Brindes",
  personalizados: "Personalizados",
  vestidos: "Vestidos",
  trajes: "Trajes",
  joias: "Joias",
  papelaria: "Papelaria",
  transporte_materiais: "Transporte de Materiais",
  hotel: "Hotel",
  locacao_veiculos: "Locação de Veículos",
};

const TODAS_CATEGORIAS: Record<string, string> = {
  ...CATEGORIAS_OPERACIONAIS,
  ...CATEGORIAS_APOIO,
  outro: "Outro",
};

// Rótulo de uma categoria: usa o mapa conhecido; senão capitaliza o slug
// (categorias customizadas digitadas pelo usuário).
export function categoriaLabel(slug: string): string {
  if (TODAS_CATEGORIAS[slug]) return TODAS_CATEGORIAS[slug];
  return slug
    .split(/[_\s]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// Normaliza um texto digitado para slug de categoria.
export function slugCategoria(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Link wa.me a partir de um telefone brasileiro (só dígitos, +55).
export function waLink(telefone: string | null): string | null {
  if (!telefone) return null;
  const dig = telefone.replace(/\D/g, "");
  if (dig.length < 10) return null;
  const comDDI = dig.startsWith("55") ? dig : `55${dig}`;
  return `https://wa.me/${comDDI}`;
}
