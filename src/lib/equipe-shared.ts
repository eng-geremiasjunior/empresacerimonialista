// Tipos e constantes da equipe (membros_equipe), compartilhados entre
// server e client. Não importar nada de servidor aqui.

export type Cargo =
  | "proprietaria"
  | "coordenadora"
  | "cerimonialista"
  | "assistente";

export type MembroEquipe = {
  id: string;
  empresa_id: string;
  user_id: string | null;
  nome: string;
  email: string | null;
  cargo: Cargo;
  especialidades: string[] | null;
  status: "ativo" | "inativo";
  is_owner: boolean;
  created_at: string;
};

export const CARGO_LABELS: Record<Cargo, string> = {
  proprietaria: "Proprietária",
  coordenadora: "Coordenadora",
  cerimonialista: "Cerimonialista",
  assistente: "Assistente",
};

// Badges dessaturados (padrão -50 bg + -700 texto do sistema)
export const CARGO_BADGE: Record<Cargo, string> = {
  proprietaria: "bg-indigo-50 text-indigo-700",
  coordenadora: "bg-sky-50 text-sky-700",
  cerimonialista: "bg-violet-50 text-violet-700",
  assistente: "bg-gray-100 text-gray-600",
};

// Cargos selecionáveis no cadastro (proprietária só existe uma, criada
// na fundação da empresa — Etapa 1)
export const CARGOS_CADASTRO: Exclude<Cargo, "proprietaria">[] = [
  "coordenadora",
  "cerimonialista",
  "assistente",
];

// Opção enxuta para selects de responsável (wizard/edição de evento)
export type MembroOption = {
  id: string;
  nome: string;
  cargo: Cargo;
};

export function membroOptionLabel(m: MembroOption) {
  return `${m.nome} — ${CARGO_LABELS[m.cargo]}`;
}

export const ESPECIALIDADES = [
  "Casamento",
  "Debutante",
  "Formatura",
  "Corporativo",
  "Aniversário",
  "Religioso",
  "Maternidade",
  "Outro",
] as const;
