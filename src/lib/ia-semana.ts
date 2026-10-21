// Preparar a semana do evento (T2 do plano "IA que trabalha", 21/10/2026).
// Puro, sem banco: o levantamento vira o pacote; a IA só escreve TEXTO.
//
// O que é regra fica no código, sem custo e sem erro: quem confirmou, os
// horários de cada fornecedor, as pendências, as parcelas. A IA entra só
// para escrever as mensagens com naturalidade — e cada mensagem dela passa
// por uma conferência: horário ou data que não estão nos dados derruba a
// mensagem, e vale o texto fixo. O link do fornecedor é sempre o código
// que acrescenta, nunca a IA.

export type HorarioDoFornecedor = { horario: string; titulo: string; descricao: string | null };

export type FornecedorDaSemana = {
  supplierId: string;
  nome: string;
  telefone: string | null;
  url: string;
  confirmado: boolean;
  enviado: boolean;
  horarios: HorarioDoFornecedor[];
};

export type PendenciaDaNoiva = { titulo: string; prazo: string | null };

export type ParcelaDaSemana = { descricao: string; valor: number; vencimento: string | null; tipo: "receber" | "pagar"; vencida: boolean };

export type LevantamentoDaSemana = {
  evento: { id: string; nome: string; data: string; hora: string | null; local: string | null };
  cliente: { nome: string | null; telefone: string | null };
  fornecedores: FornecedorDaSemana[];
  daNoiva: PendenciaDaNoiva[];
  rsvp: { aguardando: number; confirmados: number };
  parcelas: ParcelaDaSemana[];
  /** títulos das tarefas abertas do evento (para não repetir tarefa) */
  tarefasAbertas: string[];
};

export type TarefaProposta = { chave: string; titulo: string; prazo: string; marcada: boolean };

export type MensagemDaSemana = {
  chave: string;
  para: string;
  telefone: string | null;
  texto: string;
  /** "ia" quando a IA escreveu e passou na conferência */
  origem: "ia" | "modelo";
  supplierId: string | null;
  confirmado?: boolean;
  enviado?: boolean;
};

export type PacoteDaSemana = {
  mensagens: MensagemDaSemana[];
  tarefas: TarefaProposta[];
  parcelas: ParcelaDaSemana[];
  rsvp: { aguardando: number; confirmados: number };
};

/** a janela do radar: até quantos dias antes do evento */
export const DIAS_DA_SEMANA_DO_EVENTO = 10;

const somarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

export const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const primeiro = (nome: string | null) => (nome ?? "").trim().split(/\s+/)[0] ?? "";

// ------------------------------------------------------------------
// Textos fixos: valem quando a IA não responde ou não passa na conferência
// ------------------------------------------------------------------

export function textoDoFornecedorPadrao(f: FornecedorDaSemana, ev: LevantamentoDaSemana["evento"]): string {
  const horarios = f.horarios.length
    ? `Seus horários:\n${f.horarios.map((h) => `${h.horario} — ${h.titulo}`).join("\n")}`
    : "Ainda não há horário seu no roteiro.";
  const pedido = f.confirmado ? "" : "\n\nPode me confirmar que está tudo certo do seu lado?";
  return (
    `Olá, ${f.nome}! Faltam poucos dias para o evento ${ev.nome}, em ${dataBR(ev.data)}${ev.local ? `, no ${ev.local}` : ""}.\n\n` +
    `${horarios}${pedido}`
  );
}

export function textoDaNoivaPadrao(l: LevantamentoDaSemana): string | null {
  const linhas: string[] = l.daNoiva.map((p) => `- ${p.titulo}${p.prazo ? ` (até ${dataBR(p.prazo)})` : ""}`);
  if (l.rsvp.aguardando > 0) {
    linhas.push(`- ${l.rsvp.aguardando} ${l.rsvp.aguardando === 1 ? "convidado ainda não respondeu" : "convidados ainda não responderam"} à confirmação de presença`);
  }
  const aReceber = l.parcelas.filter((p) => p.tipo === "receber");
  for (const p of aReceber) linhas.push(`- ${p.descricao}${p.vencimento ? ` (vence ${dataBR(p.vencimento)})` : ""}`);
  if (!linhas.length) return null;
  const nome = primeiro(l.cliente.nome);
  return `Olá${nome ? `, ${nome}` : ""}! Faltam poucos dias para ${dataBR(l.evento.data)}. Para fecharmos tudo, ainda falta:\n${linhas.join("\n")}`;
}

/** o link do fornecedor vai sempre por último, pelo código */
export const comLink = (texto: string, url: string) => `${texto.trim()}\n\nSeu roteiro, sempre atualizado: ${url}`;

// ------------------------------------------------------------------
// O que vira tarefa (regra fixa)
// ------------------------------------------------------------------

export function tarefasDaSemana(l: LevantamentoDaSemana, hoje: string): TarefaProposta[] {
  const prazoBase = somarDias(l.evento.data, -2);
  const prazo = prazoBase < hoje ? hoje : prazoBase;
  const ja = new Set(l.tarefasAbertas.map((t) => t.trim().toLowerCase()));
  const saida: TarefaProposta[] = [];
  const somar = (chave: string, titulo: string, p = prazo) => {
    if (ja.has(titulo.toLowerCase())) return;
    saida.push({ chave, titulo: titulo.slice(0, 200), prazo: p, marcada: true });
  };
  l.fornecedores
    .filter((f) => !f.confirmado)
    .forEach((f) => somar(`f-${f.supplierId}`, `Confirmar ${f.nome}`));
  l.fornecedores
    .filter((f) => f.horarios.length === 0)
    .forEach((f) => somar(`h-${f.supplierId}`, `Pôr os horários de ${f.nome} no roteiro`));
  if (l.rsvp.aguardando > 0) {
    const p = somarDias(l.evento.data, -5);
    somar("rsvp", `Fechar a lista de convidados (${l.rsvp.aguardando} sem resposta)`, p < hoje ? hoje : p);
  }
  l.daNoiva.forEach((d, i) => somar(`n-${i}`, `Cobrar da família: ${d.titulo}`));
  l.parcelas
    .filter((p) => p.tipo === "receber")
    .forEach((p, i) => somar(`r-${i}`, `Receber: ${p.descricao}`));
  return saida;
}

// ------------------------------------------------------------------
// A IA: só as mensagens, com conferência de horário e data
// ------------------------------------------------------------------

export function instrucaoDaSemana(l: LevantamentoDaSemana): string {
  const forn = l.fornecedores
    .map((f, n) => {
      const hs = f.horarios.length
        ? f.horarios.map((h) => `   ${h.horario} ${h.titulo}${h.descricao ? ` (${h.descricao})` : ""}`).join("\n")
        : "   (sem horário no roteiro)";
      return `${n + 1} | ${f.nome} | ${f.confirmado ? "já confirmou" : "ainda não confirmou"}\n${hs}`;
    })
    .join("\n");
  const noiva = [
    ...l.daNoiva.map((p) => `- ${p.titulo}${p.prazo ? ` (prazo ${dataBR(p.prazo)})` : ""}`),
    ...(l.rsvp.aguardando > 0 ? [`- ${l.rsvp.aguardando} convidados sem responder à confirmação de presença`] : []),
    ...l.parcelas.filter((p) => p.tipo === "receber").map((p) => `- pagamento: ${p.descricao}${p.vencimento ? ` (vence ${dataBR(p.vencimento)})` : ""}`),
  ].join("\n");

  return (
    `Você escreve mensagens de WhatsApp de uma cerimonialista brasileira, na semana do evento, em português do Brasil.\n\n` +
    `EVENTO: ${l.evento.nome}; ${dataBR(l.evento.data)}${l.evento.hora ? ` às ${l.evento.hora}` : ""}${l.evento.local ? `; local: ${l.evento.local}` : ""}.\n\n` +
    `FORNECEDORES (número | nome | situação, e os horários dele no roteiro):\n${forn || "(nenhum)"}\n\n` +
    `O QUE FALTA DA FAMÍLIA (${primeiro(l.cliente.nome) || "a cliente"}):\n${noiva || "(nada)"}\n\n` +
    `Devolva APENAS um JSON válido, compacto, numa linha só:\n` +
    `{ "fornecedores": [ { "n": number, "mensagem": string } ], "familia": string | null }\n\n` +
    `Regras:\n` +
    `- Uma mensagem por fornecedor da lista: cumprimenta pelo nome, lembra o evento e a data, lista os horários DELE com o detalhe de cada item, e, se ainda não confirmou, pede a confirmação.\n` +
    `- "familia": uma mensagem curta para a família com o que falta, com os prazos. Se não falta nada, null.\n` +
    `- Use SÓ os dados acima. Não invente horário, data, valor, nome, local nem tarefa. Não escreva link.\n` +
    `- Tom de quem organiza o evento: direto e cordial, sem emoji, sem exagero, até 600 caracteres por mensagem.\n` +
    `- Não opine, não sugira, não comente. A resposta é só o JSON.`
  );
}

const HORA = /\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/g;
const DATA = /\b(\d{1,2})\/(\d{1,2})\b/g;

/** os horários e datas que a mensagem pode citar; o resto é invenção */
export function citaSoOQueExiste(texto: string, horarios: string[], datas: string[]): boolean {
  const hs = new Set(horarios);
  for (const m of texto.matchAll(HORA)) {
    if (!hs.has(`${m[1].padStart(2, "0")}:${m[2]}`)) return false;
  }
  const ds = new Set(datas);
  for (const m of texto.matchAll(DATA)) {
    if (!ds.has(`${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}`)) return false;
  }
  return !/https?:\/\//i.test(texto);
}

const textoLimpo = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t ? t.slice(0, max) : null;
};

/**
 * As mensagens finais: a da IA quando passa na conferência; senão, o texto
 * fixo. `json` nulo (a IA não respondeu) = tudo pelo texto fixo.
 */
export function mensagensDaSemana(l: LevantamentoDaSemana, json: unknown): MensagemDaSemana[] {
  const daIa = new Map<number, string>();
  const brutos = (json as { fornecedores?: unknown } | null)?.fornecedores;
  if (Array.isArray(brutos)) {
    for (const b of brutos) {
      const n = Number((b as { n?: unknown })?.n);
      const m = textoLimpo((b as { mensagem?: unknown })?.mensagem, 900);
      if (Number.isInteger(n) && n >= 1 && n <= l.fornecedores.length && m && !daIa.has(n)) daIa.set(n, m);
    }
  }
  const dataDoEvento = dataBR(l.evento.data);
  const saida: MensagemDaSemana[] = l.fornecedores.map((f, i) => {
    const ia = daIa.get(i + 1);
    const horas = [...f.horarios.map((h) => h.horario), ...(l.evento.hora ? [l.evento.hora] : [])];
    // sem horário no roteiro, a IA só tinha o que inventar ("a presença é
    // necessária conforme o planejamento"): vale sempre o texto fixo
    const valeIa = !!ia && f.horarios.length > 0 && citaSoOQueExiste(ia, horas, [dataDoEvento]);
    return {
      chave: `f-${f.supplierId}`,
      para: f.nome,
      telefone: f.telefone,
      texto: comLink(valeIa ? ia! : textoDoFornecedorPadrao(f, l.evento), f.url),
      origem: valeIa ? "ia" : "modelo",
      supplierId: f.supplierId,
      confirmado: f.confirmado,
      enviado: f.enviado,
    };
  });

  const fixo = textoDaNoivaPadrao(l);
  if (fixo) {
    const ia = textoLimpo((json as { familia?: unknown } | null)?.familia, 1200);
    const datas = [
      dataDoEvento,
      ...l.daNoiva.flatMap((p) => (p.prazo ? [dataBR(p.prazo)] : [])),
      ...l.parcelas.flatMap((p) => (p.vencimento ? [dataBR(p.vencimento)] : [])),
    ];
    const valeIa = !!ia && citaSoOQueExiste(ia, l.evento.hora ? [l.evento.hora] : [], datas);
    saida.push({
      chave: "familia",
      para: l.cliente.nome ?? "a família",
      telefone: l.cliente.telefone,
      texto: valeIa ? ia! : fixo,
      origem: valeIa ? "ia" : "modelo",
      supplierId: null,
    });
  }
  return saida;
}
