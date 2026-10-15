// O assunto de uma tarefa nascida de uma contratação (04/10/2026).
//
// Cada "Contratar X" do método gera as mesmas quatro tarefas ("Solicitar e
// receber o contrato", "Analisar as cláusulas do contrato", "Registrar o
// valor no financeiro (1ª parcela)", "Assinar e arquivar o contrato"). Num
// casamento com seis contratações, a lista de Tarefas e o Financeiro
// mostravam seis linhas iguais, sem dizer de qual fornecedor — foi o que a
// conta mais ativa viu (seis "Registrar o valor…" abertos no Financeiro).
// Fora da Organização (que já agrupa pela decisão), o título leva o assunto
// na frente: "Buffet · Registrar o valor no financeiro (1ª parcela)".

// Desde a 210 (15/10/2026) o método já chama a contratação pelo nome do
// serviço ("Buffet"); o assunto dela vem de CONTRATACOES_DO_METODO. A regra
// do "Contratar…" fica para o título que a cerimonialista escreveu à mão.

import { CONTRATACOES_DO_METODO } from "@/lib/contratacoes-do-metodo";

const CONTRATAR = /^(degustar e )?contratar\s+/i;
const ARTIGO = /^(o|a|os|as)\s+/i;

/** "Buffet" ou "Contratar o buffet" → "Buffet". Só para contratações; o resto, null. */
export function assuntoDaDecisao(titulo: string | null | undefined): string | null {
  const t = (titulo ?? "").trim();
  const doMetodo = CONTRATACOES_DO_METODO.get(t);
  if (doMetodo) return doMetodo;
  if (!CONTRATAR.test(t)) return null;
  const resto = t.replace(CONTRATAR, "").replace(ARTIGO, "").trim();
  if (!resto) return null;
  return resto.charAt(0).toUpperCase() + resto.slice(1);
}

/** O título com o assunto na frente, quando a tarefa veio de uma contratação. */
export function comAssunto(titulo: string, decisao: string | null | undefined): string {
  const assunto = assuntoDaDecisao(decisao);
  if (!assunto || titulo.toLowerCase().includes(assunto.toLowerCase())) return titulo;
  return `${assunto} · ${titulo}`;
}

/** O título da decisão dentro de um embed do PostgREST (objeto ou lista). */
export function tituloDoEmbed(v: unknown): string | null {
  const um = Array.isArray(v) ? v[0] : v;
  return um && typeof um === "object" && typeof (um as { titulo?: unknown }).titulo === "string"
    ? (um as { titulo: string }).titulo
    : null;
}
