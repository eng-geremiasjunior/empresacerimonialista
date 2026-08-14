// Os destinos do portal, num lugar só — a sidebar do computador e a
// barra inferior do celular leem daqui, então nunca divergem.
//
// A ordem e os rótulos são os do handoff. Destinos marcados com
// `emBreve` já aparecem na navegação (a casca nasce definitiva), e a
// tela deles diz o que vai aparecer ali — nada de link morto, nada de
// contador inventado.

export type Destino = {
  seg: string;
  rotulo: string;
  /** rótulo curto da barra inferior, quando o longo não cabe */
  rotuloCurto?: string;
  icone: string;
  emBreve?: boolean;
};

/** Navegação principal (sidebar) — cinco itens. */
export const PRINCIPAIS: Destino[] = [
  { seg: "", rotulo: "Visão geral", icone: "LayoutDashboard" },
  { seg: "escolhas", rotulo: "Escolhas do casal", rotuloCurto: "Escolhas", icone: "Heart", emBreve: true },
  { seg: "fornecedores", rotulo: "Fornecedores", icone: "Briefcase", emBreve: true },
  { seg: "convidados", rotulo: "Convidados", icone: "Users" },
  { seg: "linha-do-tempo", rotulo: "Linha do tempo", icone: "CalendarDays" },
];

/** Grupo "Durante o evento". */
export const DURANTE: Destino[] = [
  { seg: "cortejo", rotulo: "Cortejo", icone: "Heart" },
  { seg: "informacoes", rotulo: "Informações importantes", icone: "Info", emBreve: true },
  { seg: "cronograma", rotulo: "Cronograma do dia", icone: "Clock", emBreve: true },
];

/** Grupo "Investimento". */
export const INVESTIMENTO: Destino[] = [
  { seg: "investimento", rotulo: "Resumo financeiro", icone: "CircleDollarSign" },
  { seg: "pagamentos", rotulo: "Pagamentos", icone: "CreditCard", emBreve: true },
];

/**
 * Barra inferior do celular — cinco alvos, os mesmos do handoff.
 * Investimento entra aqui no lugar de Fornecedores porque é o que a
 * cliente abre com mais frequência.
 */
export const ABAS_CELULAR: Destino[] = [
  { seg: "", rotulo: "Visão geral", icone: "LayoutDashboard" },
  { seg: "escolhas", rotulo: "Escolhas", icone: "Heart", emBreve: true },
  { seg: "convidados", rotulo: "Convidados", icone: "Users" },
  { seg: "linha-do-tempo", rotulo: "Linha do tempo", icone: "CalendarDays" },
  { seg: "investimento", rotulo: "Investimento", icone: "CircleDollarSign" },
];

/** Todos, para a tela de "em breve" saber o que dizer. */
export const TODOS: Destino[] = [
  ...PRINCIPAIS,
  ...DURANTE,
  ...INVESTIMENTO,
  { seg: "perguntas", rotulo: "Perguntas do momento", icone: "FileText" },
];

export function destinoPorSegmento(seg: string): Destino | undefined {
  return TODOS.find((d) => d.seg === seg);
}
