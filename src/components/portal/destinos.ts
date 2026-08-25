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

/**
 * Navegação principal (sidebar).
 *
 * "Guia de estilo" vem logo depois da visão geral, e não no grupo de
 * baixo: escolher o estilo é o COMEÇO do casamento — o casal decide
 * meses antes —, não algo que acontece durante a festa. A sidebar não
 * ganhou item: é o antigo "Inspirações" amadurecido, que subiu de grupo.
 */
export const PRINCIPAIS: Destino[] = [
  { seg: "", rotulo: "Visão geral", icone: "LayoutDashboard" },
  { seg: "guia-estilo", rotulo: "Guia de estilo", rotuloCurto: "Guia", icone: "Palette" },
  { seg: "escolhas", rotulo: "Escolhas do casal", rotuloCurto: "Escolhas", icone: "Heart" },
  { seg: "fornecedores", rotulo: "Fornecedores", icone: "Briefcase", emBreve: true },
  { seg: "convidados", rotulo: "Convidados", icone: "Users" },
  { seg: "linha-do-tempo", rotulo: "Linha do tempo", icone: "CalendarDays" },
];

/**
 * O que ainda não existe não entra no menu. As três telas marcadas com
 * emBreve renderizam só uma promessa ("vai aparecer aqui"); anunciá-las
 * na navegação faz a noiva clicar e não encontrar nada — pior do que não
 * oferecer. As rotas continuam de pé para quando o conteúdo existir.
 */
export const visiveis = (itens: Destino[]) => itens.filter((d) => !d.emBreve);

/** Grupo "Durante o evento". */
export const DURANTE: Destino[] = [
  { seg: "cortejo", rotulo: "Cortejo", icone: "Heart" },
  { seg: "informacoes", rotulo: "Informações importantes", icone: "Info", emBreve: true },
  { seg: "cronograma", rotulo: "Roteiro do dia", icone: "Clock" },
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
  { seg: "escolhas", rotulo: "Escolhas", icone: "Heart" },
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
