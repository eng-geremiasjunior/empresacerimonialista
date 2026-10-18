// O formulário da página profissional (214, 18/10/2026, pedido dele:
// "cansei de engessar e adivinhar o que é melhor para os assessores").
//
// A base fixa (nome, WhatsApp, tipo, data, cidade) continua: é ela que
// preenche a proposta e o evento. Em volta, o que é dela:
//   * a introdução (título e texto);
//   * os opcionais ligados ou desligados (e-mail, convidados, mensagem e
//     "que tipo de serviço procura");
//   * as opções do serviço;
//   * até 10 perguntas próprias.
//
// Módulo puro: roda no editor, na página pública e na rota do servidor.
// As mesmas regras do CHECK do banco (formulario_valido, 214).

export type TipoDePergunta = "texto_curto" | "texto_longo" | "escolha" | "multipla" | "data" | "sim_nao";

export const TIPOS_DE_PERGUNTA: { tipo: TipoDePergunta; rotulo: string }[] = [
  { tipo: "texto_curto", rotulo: "Texto curto" },
  { tipo: "texto_longo", rotulo: "Texto longo" },
  { tipo: "escolha", rotulo: "Uma opção da lista" },
  { tipo: "multipla", rotulo: "Várias opções da lista" },
  { tipo: "data", rotulo: "Data" },
  { tipo: "sim_nao", rotulo: "Sim ou não" },
];

export type PerguntaDoFormulario = {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: TipoDePergunta;
  opcoes?: string[];
  obrigatoria?: boolean;
};

export type OpcionalDoFormulario = "email" | "convidados" | "mensagem" | "servico";

export type FormularioDaPagina = {
  intro_titulo?: string;
  intro_texto?: string;
  mostrar: Record<OpcionalDoFormulario, boolean>;
  servico_opcoes: string[];
  perguntas: PerguntaDoFormulario[];
};

export const LIMITES_DO_FORMULARIO = {
  introTitulo: 80,
  introTexto: 300,
  servicoOpcoes: 8,
  opcao: 60,
  perguntas: 10,
  titulo: 120,
  descricao: 200,
  opcoesPorPergunta: 10,
  resposta: 500,
};

export const SERVICOS_PADRAO = ["Assessoria completa", "Assessoria parcial", "Coordenação do dia", "Ainda não sei"];

export const FORMULARIO_PADRAO: FormularioDaPagina = {
  mostrar: { email: true, convidados: true, mensagem: true, servico: true },
  servico_opcoes: SERVICOS_PADRAO,
  perguntas: [],
};

const ID = /^[a-z0-9]{4,16}$/;
const TIPOS = new Set<string>(TIPOS_DE_PERGUNTA.map((t) => t.tipo));
const texto = (v: unknown) => (typeof v === "string" ? v : "");

/** Um id novo para pergunta (o banco aceita [a-z0-9]{4,16}). */
export function novoIdDePergunta(existentes: string[]): string {
  for (let i = 0; i < 50; i++) {
    const id = `p${Math.random().toString(36).slice(2, 9)}`;
    if (ID.test(id) && !existentes.includes(id)) return id;
  }
  return `p${existentes.length + 1}${Date.now().toString(36).slice(-6)}`;
}

/**
 * O que veio do banco (ou de qualquer lugar), já com os padrões. Nunca
 * falha: pergunta torta é descartada, para a página nunca quebrar.
 */
export function lerFormulario(cru: unknown): FormularioDaPagina {
  const f = cru && typeof cru === "object" && !Array.isArray(cru) ? (cru as Record<string, unknown>) : {};
  const mostrarCru = f.mostrar && typeof f.mostrar === "object" ? (f.mostrar as Record<string, unknown>) : {};
  const mostrar = { ...FORMULARIO_PADRAO.mostrar };
  for (const k of Object.keys(mostrar) as OpcionalDoFormulario[]) {
    if (typeof mostrarCru[k] === "boolean") mostrar[k] = mostrarCru[k] as boolean;
  }
  const servico_opcoes = Array.isArray(f.servico_opcoes)
    ? (f.servico_opcoes as unknown[])
        .map((o) => texto(o).trim().slice(0, LIMITES_DO_FORMULARIO.opcao))
        .filter(Boolean)
        .slice(0, LIMITES_DO_FORMULARIO.servicoOpcoes)
    : SERVICOS_PADRAO;
  const vistos = new Set<string>();
  const perguntas: PerguntaDoFormulario[] = [];
  for (const p of Array.isArray(f.perguntas) ? (f.perguntas as unknown[]) : []) {
    if (!p || typeof p !== "object") continue;
    const q = p as Record<string, unknown>;
    const id = texto(q.id);
    const titulo = texto(q.titulo).trim();
    const tipo = texto(q.tipo);
    if (!ID.test(id) || vistos.has(id) || !titulo || !TIPOS.has(tipo)) continue;
    const opcoes = Array.isArray(q.opcoes)
      ? (q.opcoes as unknown[]).map((o) => texto(o).trim()).filter(Boolean).slice(0, LIMITES_DO_FORMULARIO.opcoesPorPergunta)
      : [];
    if ((tipo === "escolha" || tipo === "multipla") && opcoes.length < 2) continue;
    vistos.add(id);
    perguntas.push({
      id,
      titulo: titulo.slice(0, LIMITES_DO_FORMULARIO.titulo),
      descricao: texto(q.descricao).trim().slice(0, LIMITES_DO_FORMULARIO.descricao) || undefined,
      tipo: tipo as TipoDePergunta,
      opcoes: tipo === "escolha" || tipo === "multipla" ? opcoes : undefined,
      obrigatoria: q.obrigatoria === true,
    });
    if (perguntas.length >= LIMITES_DO_FORMULARIO.perguntas) break;
  }
  return {
    intro_titulo: texto(f.intro_titulo).trim().slice(0, LIMITES_DO_FORMULARIO.introTitulo) || undefined,
    intro_texto: texto(f.intro_texto).trim().slice(0, LIMITES_DO_FORMULARIO.introTexto) || undefined,
    mostrar,
    servico_opcoes: servico_opcoes.length > 0 ? servico_opcoes : SERVICOS_PADRAO,
    perguntas,
  };
}

/** O que o editor manda salvar: a primeira coisa errada, em palavras. */
export function erroDoFormulario(f: FormularioDaPagina): string | null {
  const L = LIMITES_DO_FORMULARIO;
  if ((f.intro_titulo ?? "").length > L.introTitulo) return `O título da introdução passa de ${L.introTitulo} letras.`;
  if ((f.intro_texto ?? "").length > L.introTexto) return `O texto da introdução passa de ${L.introTexto} letras.`;
  if (f.servico_opcoes.length > L.servicoOpcoes) return `No máximo ${L.servicoOpcoes} opções de serviço.`;
  if (f.mostrar.servico && f.servico_opcoes.length === 0) return "Escreva pelo menos uma opção de serviço.";
  if (f.servico_opcoes.some((o) => !o.trim() || o.length > L.opcao)) return "Toda opção de serviço precisa de texto (até 60 letras).";
  if (f.perguntas.length > L.perguntas) return `No máximo ${L.perguntas} perguntas.`;
  const ids = new Set<string>();
  for (const [i, p] of f.perguntas.entries()) {
    const n = i + 1;
    if (!ID.test(p.id) || ids.has(p.id)) return `A pergunta ${n} está com problema; apague e crie de novo.`;
    ids.add(p.id);
    if (!p.titulo.trim()) return `A pergunta ${n} está sem título.`;
    if (p.titulo.length > L.titulo) return `O título da pergunta ${n} passa de ${L.titulo} letras.`;
    if ((p.descricao ?? "").length > L.descricao) return `A descrição da pergunta ${n} passa de ${L.descricao} letras.`;
    if (!TIPOS.has(p.tipo)) return `Escolha o tipo da pergunta ${n}.`;
    if (p.tipo === "escolha" || p.tipo === "multipla") {
      const ops = (p.opcoes ?? []).map((o) => o.trim()).filter(Boolean);
      if (ops.length < 2) return `A pergunta ${n} precisa de pelo menos 2 opções.`;
      if (ops.length > L.opcoesPorPergunta) return `A pergunta ${n} passa de ${L.opcoesPorPergunta} opções.`;
      if (ops.some((o) => o.length > L.opcao)) return `Uma opção da pergunta ${n} passa de ${L.opcao} letras.`;
    }
  }
  return null;
}

/** Para gravar: só os campos que o banco conhece, sem espaço sobrando. */
export function formularioParaGravar(f: FormularioDaPagina): Record<string, unknown> {
  return {
    ...(f.intro_titulo?.trim() ? { intro_titulo: f.intro_titulo.trim() } : {}),
    ...(f.intro_texto?.trim() ? { intro_texto: f.intro_texto.trim() } : {}),
    mostrar: f.mostrar,
    servico_opcoes: f.servico_opcoes.map((o) => o.trim()).filter(Boolean),
    perguntas: f.perguntas.map((p) => ({
      id: p.id,
      titulo: p.titulo.trim(),
      ...(p.descricao?.trim() ? { descricao: p.descricao.trim() } : {}),
      tipo: p.tipo,
      ...(p.tipo === "escolha" || p.tipo === "multipla"
        ? { opcoes: (p.opcoes ?? []).map((o) => o.trim()).filter(Boolean) }
        : {}),
      obrigatoria: !!p.obrigatoria,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* As respostas de quem pede                                           */
/* ------------------------------------------------------------------ */

/** O valor de cada pergunta no formulário: texto, data (AAAA-MM-DD),
 *  "sim"/"nao", ou a lista marcada. */
export type ValorDaResposta = string | string[];

export type RespostaGravada = { id: string; titulo: string; resposta: string };

export type ResultadoDasRespostas =
  | { ok: true; servico: string | null; respostas: RespostaGravada[] }
  | { ok: false; campo: string; erro: string };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** O campo de uma pergunta no formulário (id do elemento e do erro). */
export const campoDaPergunta = (id: string) => `pergunta_${id}`;

/**
 * Confere o serviço e as respostas contra o formulário DELA. Roda no
 * navegador (para dizer o erro no campo) e de novo no servidor (o que
 * vale): só ids conhecidos, opção que existe, tamanho na régua.
 */
export function validarRespostas(
  f: FormularioDaPagina,
  servicoCru: unknown,
  respostasCruas: unknown
): ResultadoDasRespostas {
  let servico: string | null = null;
  if (f.mostrar.servico) {
    const s = texto(servicoCru).trim();
    if (s) {
      if (!f.servico_opcoes.includes(s)) return { ok: false, campo: "servico", erro: "Escolha uma das opções." };
      servico = s;
    }
  }

  const cruas =
    respostasCruas && typeof respostasCruas === "object" && !Array.isArray(respostasCruas)
      ? (respostasCruas as Record<string, unknown>)
      : {};
  const respostas: RespostaGravada[] = [];
  for (const p of f.perguntas) {
    const campo = campoDaPergunta(p.id);
    const v = cruas[p.id];
    let resposta = "";
    if (p.tipo === "multipla") {
      const marcadas = Array.isArray(v) ? (v as unknown[]).map(texto).filter(Boolean) : [];
      if (marcadas.some((m) => !(p.opcoes ?? []).includes(m))) return { ok: false, campo, erro: "Marque só as opções da lista." };
      resposta = (p.opcoes ?? []).filter((o) => marcadas.includes(o)).join(", ");
    } else if (p.tipo === "escolha") {
      const s = texto(v).trim();
      if (s && !(p.opcoes ?? []).includes(s)) return { ok: false, campo, erro: "Escolha uma das opções." };
      resposta = s;
    } else if (p.tipo === "sim_nao") {
      const s = texto(v);
      if (s && s !== "sim" && s !== "nao") return { ok: false, campo, erro: "Responda sim ou não." };
      resposta = s === "sim" ? "Sim" : s === "nao" ? "Não" : "";
    } else if (p.tipo === "data") {
      const s = texto(v).trim();
      if (s && !DATA.test(s)) return { ok: false, campo, erro: "Escolha uma data." };
      resposta = s ? s.split("-").reverse().join("/") : "";
    } else {
      const max = p.tipo === "texto_curto" ? 200 : LIMITES_DO_FORMULARIO.resposta;
      const s = texto(v).trim();
      if (s.length > max) return { ok: false, campo, erro: `Escreva até ${max} letras.` };
      resposta = s;
    }
    if (!resposta) {
      if (p.obrigatoria) return { ok: false, campo, erro: "Responda esta pergunta." };
      continue;
    }
    respostas.push({ id: p.id, titulo: p.titulo, resposta: resposta.slice(0, LIMITES_DO_FORMULARIO.resposta) });
  }
  return { ok: true, servico, respostas };
}
