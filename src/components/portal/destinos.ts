// Os destinos do portal, num lugar só — a sidebar do computador e a
// barra inferior do celular leem daqui, então nunca divergem.
//
// A ordem e os rótulos são os do handoff. Destinos marcados com
// `emBreve` já aparecem na navegação (a casca nasce definitiva), e a
// tela deles diz o que vai aparecer ali — nada de link morto, nada de
// contador inventado.
//
// O que cada tipo de evento vê sai de capacidades.ts (tem) e o que ele
// chama de "escolhas" e "convidados", de papel.ts — nenhum `if (tipo)`
// aqui nem nas barras.

import { rotuloPublico, tem, type Capacidade } from "@/lib/capacidades";
import { rotuloCortejo, rotuloEscolhas } from "@/lib/papel";

export type Destino = {
  seg: string;
  rotulo: string;
  /** rótulo curto da barra inferior, quando o longo não cabe */
  rotuloCurto?: string;
  icone: string;
  emBreve?: boolean;
};

/**
 * Navegação principal (sidebar), completa.
 *
 * "Guia de estilo" vem logo depois da visão geral, e não no grupo de
 * baixo: escolher o estilo é o COMEÇO do casamento — o casal decide
 * meses antes —, não algo que acontece durante a festa. A sidebar não
 * ganhou item: é o antigo "Inspirações" amadurecido, que subiu de grupo.
 */
const PRINCIPAIS: Destino[] = [
  { seg: "", rotulo: "Visão geral", icone: "LayoutDashboard" },
  { seg: "guia-estilo", rotulo: "Guia de estilo", rotuloCurto: "Guia", icone: "Palette" },
  { seg: "escolhas", rotulo: "Escolhas do casal", rotuloCurto: "Escolhas", icone: "Heart" },
  { seg: "fornecedores", rotulo: "Fornecedores", icone: "Briefcase", emBreve: true },
  { seg: "convidados", rotulo: "Convidados", icone: "Users" },
  { seg: "site", rotulo: "Convite", icone: "Globe" },
  { seg: "linha-do-tempo", rotulo: "Linha do tempo", icone: "CalendarDays" },
];

/**
 * O que ainda não existe não entra no menu. As três telas marcadas com
 * emBreve renderizam só uma promessa ("vai aparecer aqui"); anunciá-las
 * na navegação faz a noiva clicar e não encontrar nada — pior do que não
 * oferecer. As rotas continuam de pé para quando o conteúdo existir.
 */
export const visiveis = (itens: Destino[]) => itens.filter((d) => !d.emBreve);

/** Grupo "Durante o evento", completo. */
const DURANTE: Destino[] = [
  { seg: "cortejo", rotulo: "Cortejo", icone: "Heart" },
  { seg: "informacoes", rotulo: "Informações importantes", icone: "Info", emBreve: true },
  { seg: "cronograma", rotulo: "Roteiro do dia", icone: "Clock" },
];

/** Grupo "Investimento". */
export const INVESTIMENTO: Destino[] = [
  { seg: "investimento", rotulo: "Resumo financeiro", icone: "CircleDollarSign" },
  { seg: "pagamentos", rotulo: "Pagamentos", icone: "CreditCard", emBreve: true },
  { seg: "prestacao-de-contas", rotulo: "Prestação de contas", rotuloCurto: "Prestação", icone: "FileText" },
];

/**
 * O grupo Investimento COMO ESTE EVENTO o vê: a prestação de contas só
 * entra no menu depois de entregue — antes disso seria link morto, e a
 * regra da casa é não anunciar o que não existe.
 */
export const investimentoDoEvento = (temPrestacao: boolean): Destino[] =>
  visiveis(INVESTIMENTO).filter(
    (d) => d.seg !== "prestacao-de-contas" || temPrestacao
  );

/**
 * Barra inferior do celular — até cinco alvos, os mesmos do handoff.
 * Investimento entra aqui no lugar de Fornecedores porque é o que a
 * cliente abre com mais frequência.
 */
const ABAS_CELULAR: Destino[] = [
  { seg: "", rotulo: "Visão geral", icone: "LayoutDashboard" },
  { seg: "escolhas", rotulo: "Escolhas", rotuloCurto: "Escolhas", icone: "Heart" },
  { seg: "convidados", rotulo: "Convidados", icone: "Users" },
  { seg: "linha-do-tempo", rotulo: "Linha do tempo", icone: "CalendarDays" },
  { seg: "investimento", rotulo: "Investimento", icone: "CircleDollarSign" },
];

/** O que um destino exige do tipo de evento; sem entrada, todo tipo tem. */
const EXIGE: Record<string, Capacidade> = {
  "guia-estilo": "siteDoEvento",
  site: "siteDoEvento",
  convidados: "listaNominal",
  cortejo: "cortejo",
};

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** O rótulo que muda com o tipo; os demais são os do handoff. */
const ROTULO_POR_TIPO: Record<string, (tipo?: string | null) => string> = {
  escolhas: rotuloEscolhas,
  cortejo: rotuloCortejo,
  convidados: (tipo) => capitalizar(rotuloPublico(tipo)),
};

function doTipo(itens: Destino[], tipo?: string | null): Destino[] {
  return itens
    .filter((d) => !EXIGE[d.seg] || tem(tipo, EXIGE[d.seg]))
    .map((d) => (ROTULO_POR_TIPO[d.seg] ? { ...d, rotulo: ROTULO_POR_TIPO[d.seg](tipo) } : d));
}

/** A navegação principal COMO ESTE TIPO DE EVENTO a vê. */
export const principaisDoTipo = (tipo?: string | null): Destino[] =>
  doTipo(PRINCIPAIS, tipo);

/** O grupo "Durante o evento" deste tipo. */
export const duranteDoTipo = (tipo?: string | null): Destino[] =>
  doTipo(DURANTE, tipo);

/** As abas do celular deste tipo. */
export const abasCelularDoTipo = (tipo?: string | null): Destino[] =>
  doTipo(ABAS_CELULAR, tipo);

/** Todos os destinos, com o rótulo cru. Nenhuma barra lê daqui — serve
 *  a destinoPorSegmento, para quem precisar do nome de uma rota. */
export const TODOS: Destino[] = [
  ...PRINCIPAIS,
  ...DURANTE,
  ...INVESTIMENTO,
  { seg: "perguntas", rotulo: "Perguntas do momento", icone: "FileText" },
];

export function destinoPorSegmento(seg: string): Destino | undefined {
  return TODOS.find((d) => d.seg === seg);
}
