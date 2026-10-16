// As abas de evento da moldura de programa (15/10/2026, handoff
// design_handoff_eorganizei): Hoje, os 3 eventos mais próximos (vêm do
// servidor) e os que ela abriu além deles (guardados no aparelho, com ×).

export type AbaDeEvento = {
  id: string;
  nome: string;
  /** "2026-11-10"; null quando a data ainda não existe */
  data: string | null;
};

/** As abas extras ficam só no aparelho (decisão dele, 15/10/2026). */
export const CHAVE_ABAS_EXTRAS = "eorg-abas-extras";
/** Avisa a moldura que uma aba entrou ou saiu, na mesma janela. */
export const EVENTO_ABAS = "eorg-abas-mudaram";
const MAX_EXTRAS = 6;

function lerTudo(): AbaDeEvento[] {
  try {
    const cru = window.localStorage.getItem(CHAVE_ABAS_EXTRAS);
    const lista = cru ? (JSON.parse(cru) as unknown) : [];
    if (!Array.isArray(lista)) return [];
    return lista.filter(
      (a): a is AbaDeEvento =>
        !!a && typeof a === "object" && typeof (a as AbaDeEvento).id === "string" &&
        typeof (a as AbaDeEvento).nome === "string"
    );
  } catch {
    return [];
  }
}

function gravarTudo(lista: AbaDeEvento[]) {
  try {
    window.localStorage.setItem(CHAVE_ABAS_EXTRAS, JSON.stringify(lista.slice(0, MAX_EXTRAS)));
  } catch {
    // aparelho sem armazenamento: a aba só não sobrevive ao recarregar
  }
  window.dispatchEvent(new Event(EVENTO_ABAS));
}

export function lerAbasExtras(): AbaDeEvento[] {
  return lerTudo();
}

/** Abre (ou atualiza o nome e a data de) uma aba extra; a mais nova vai para o fim. */
export function abrirAbaExtra(aba: AbaDeEvento) {
  const lista = lerTudo();
  const ja = lista.find((a) => a.id === aba.id);
  if (ja && ja.nome === aba.nome && ja.data === aba.data) return;
  const resto = lista.filter((a) => a.id !== aba.id);
  gravarTudo(ja ? lista.map((a) => (a.id === aba.id ? aba : a)) : [...resto, aba].slice(-MAX_EXTRAS));
}

export function fecharAbaExtra(id: string) {
  gravarTudo(lerTudo().filter((a) => a.id !== id));
}

/**
 * A contagem da aba: "hoje", "amanhã", "26 dias", "3 meses", "realizado".
 * `hoje` vem do servidor em horário de Brasília, para servidor e
 * navegador escreverem a mesma coisa.
 */
export function contagemDaAba(data: string | null, hoje: string): string | null {
  if (!data) return null;
  const um = Date.parse(`${data.slice(0, 10)}T00:00:00Z`);
  const outro = Date.parse(`${hoje.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(um) || Number.isNaN(outro)) return null;
  const dias = Math.round((um - outro) / 86_400_000);
  if (dias < 0) return "realizado";
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias < 60) return `${dias} dias`;
  const meses = Math.round(dias / 30);
  if (meses < 24) return `${meses} meses`;
  return `${Math.round(dias / 365)} anos`;
}

/** "próxima festa em 26 dias" — a frase da barra de status fora do evento. */
export function fraseDaProximaFesta(proximos: AbaDeEvento[], hoje: string): string {
  const primeiro = proximos.find((p) => p.data);
  if (!primeiro?.data) return "nenhum evento marcado";
  const c = contagemDaAba(primeiro.data, hoje);
  if (c === "hoje") return "a próxima festa é hoje";
  if (c === "amanhã") return "a próxima festa é amanhã";
  return `próxima festa em ${c}`;
}
