// O catálogo de blocos do site do evento (30/09/2026, plano "Site e lista").
//
// O site deixa de ter ordem fixa: é uma lista de blocos (evento_site.
// estrutura, migração 185) que a família reordena, esconde e mostra no
// portal. Os cinco modelos do dono são desenhos diferentes sobre ESTA
// lista — trocar de modelo nunca perde conteúdo.
//
// Módulo puro: serve o site público, a prévia da família, a revisão do
// dono e a demonstração da página de vendas. O banco confere a mesma
// lista de tipos (portal_salvar_estrutura_site) — se um tipo entrar aqui,
// entra lá também.

export const TIPOS_DE_BLOCO = [
  "capa",
  "contagem",
  "mensagem",
  "historia",
  "momentos",
  "local",
  "dress_code",
  "rsvp",
  "presentes",
  "hospedagem",
  "galeria",
  "especiais",
  "video",
  "enquete",
  "perguntas",
  "album",
  "playlist",
  "mural",
  "texto",
  "rodape",
] as const;

export type TipoBloco = (typeof TIPOS_DE_BLOCO)[number];

export type BlocoDoSite = {
  id: string;
  tipo: TipoBloco;
  variante?: string;
  /** ausente = visível */
  visivel?: boolean;
  /** só nos blocos novos (galeria, momentos…); os antigos leem as colunas */
  conteudo?: Record<string, unknown>;
};

export const PAPEIS_DE_COR = ["fundo", "superficie", "tinta", "suave", "acento"] as const;
export type PapelDeCor = (typeof PAPEIS_DE_COR)[number];

export type TemaDoSite = {
  /** um dos modelos; ausente = o primeiro */
  modelo?: string;
  cores?: Partial<Record<PapelDeCor, string>>;
  fontes?: string;
};

/** Presos nas pontas: a capa abre, o rodapé fecha. Não sobem nem descem. */
export const BLOCOS_FIXOS: ReadonlySet<TipoBloco> = new Set(["capa", "rodape"]);

/** Os blocos que já têm desenho (fatia A). Os outros entram com os modelos. */
export const BLOCOS_PRONTOS: ReadonlySet<TipoBloco> = new Set([
  "capa",
  "contagem",
  "mensagem",
  "historia",
  "local",
  "dress_code",
  "rsvp",
  "presentes",
  "hospedagem",
  "album",
  "playlist",
  "mural",
  "texto",
  "rodape",
]);

/** A ordem do desenho aprovado (a mesma do convite antes da 185). */
export const ORDEM_PADRAO: TipoBloco[] = [
  "capa",
  "contagem",
  "mensagem",
  "historia",
  "local",
  "dress_code",
  "rsvp",
  "presentes",
  "hospedagem",
  "album",
  "playlist",
  "mural",
  "rodape",
];

/** O nome do bloco na tela da família. Nada estreita para casamento: a
 *  "história do casal" é "a história" numa festa de 15 anos. */
export function nomeDoBloco(tipo: TipoBloco, tipoEvento?: string | null): string {
  const casal = tipoEvento === "casamento" || tipoEvento === "bodas";
  switch (tipo) {
    case "capa":
      return "Capa";
    case "contagem":
      return "Contagem regressiva";
    case "mensagem":
      return casal ? "Mensagem do casal" : "Mensagem";
    case "historia":
      return casal ? "Nossa história" : "A história";
    case "momentos":
      return "Momentos do dia";
    case "local":
      return "O local";
    case "dress_code":
      return "O que vestir";
    case "rsvp":
      return "Confirmação de presença";
    case "presentes":
      return "Presentes";
    case "hospedagem":
      return "Vindo de fora";
    case "galeria":
      return casal ? "Galeria do casal" : "Galeria";
    case "especiais":
      return "Convidados especiais";
    case "video":
      return "Vídeo";
    case "enquete":
      return "Enquete";
    case "perguntas":
      return "Perguntas frequentes";
    case "album":
      return "Álbum dos convidados";
    case "playlist":
      return "Trilha sonora";
    case "mural":
      return "Mural de recados";
    case "texto":
      return "Texto livre";
    case "rodape":
      return "Rodapé";
  }
}

const eTipo = (t: unknown): t is TipoBloco =>
  typeof t === "string" && (TIPOS_DE_BLOCO as readonly string[]).includes(t);

/** A estrutura vinda do banco, conferida: tipo conhecido, id presente,
 *  sem repetir bloco fixo. Lixo é descartado, nunca quebra a página. */
export function lerEstrutura(bruta: unknown): BlocoDoSite[] {
  if (!Array.isArray(bruta)) return [];
  const vistos = new Set<string>();
  const fixos = new Set<TipoBloco>();
  const saida: BlocoDoSite[] = [];
  bruta.forEach((b, i) => {
    if (!b || typeof b !== "object") return;
    const o = b as Record<string, unknown>;
    if (!eTipo(o.tipo)) return;
    if (BLOCOS_FIXOS.has(o.tipo)) {
      if (fixos.has(o.tipo)) return;
      fixos.add(o.tipo);
    }
    // o banco aceita só [A-Za-z0-9_-]{1,40} (186): o id que sai daqui
    // precisa poder ser salvo de volta
    const bruto = typeof o.id === "string" ? o.id.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) : "";
    let id = bruto || `${o.tipo}-${i}`.replace("_", "-");
    for (let n = 2; vistos.has(id); n++) id = `${(bruto || o.tipo).slice(0, 32)}-${i}-${n}`;
    vistos.add(id);
    saida.push({
      id,
      tipo: o.tipo,
      ...(typeof o.variante === "string" ? { variante: o.variante } : {}),
      ...(o.visivel === false ? { visivel: false } : {}),
      ...(o.conteudo && typeof o.conteudo === "object" && !Array.isArray(o.conteudo)
        ? { conteudo: o.conteudo as Record<string, unknown> }
        : {}),
    });
  });
  return saida;
}

/** A estrutura que vale: a salva, ou — site de antes da 185, ou nunca
 *  arrumado — a ordem do desenho. A capa sempre abre e o rodapé sempre
 *  fecha; bloco pronto que falta na lista salva entra antes do rodapé
 *  (ex.: um tipo novo que ganhou desenho depois que ela arrumou). */
export function estruturaEfetiva(bruta: unknown): BlocoDoSite[] {
  const salva = lerEstrutura(bruta);
  const base: BlocoDoSite[] =
    salva.length > 0 ? salva : ORDEM_PADRAO.map((tipo) => ({ id: tipo, tipo }));

  const meio = base.filter((b) => !BLOCOS_FIXOS.has(b.tipo));
  const capa = base.find((b) => b.tipo === "capa") ?? { id: "capa", tipo: "capa" as const };
  const rodape = base.find((b) => b.tipo === "rodape") ?? { id: "rodape", tipo: "rodape" as const };

  const presentes = new Set(base.map((b) => b.tipo));
  const faltando = ORDEM_PADRAO.filter((t) => !presentes.has(t) && !BLOCOS_FIXOS.has(t)).map(
    (tipo) => ({ id: tipo, tipo })
  );

  return [capa, ...meio, ...faltando, rodape];
}

/** Sobe (-1) ou desce (+1) um bloco do meio; os fixos não andam nem
 *  deixam ninguém passar por cima deles. */
export function moverBloco(estrutura: BlocoDoSite[], id: string, passo: -1 | 1): BlocoDoSite[] {
  const i = estrutura.findIndex((b) => b.id === id);
  const j = i + passo;
  if (i < 0 || j < 0 || j >= estrutura.length) return estrutura;
  if (BLOCOS_FIXOS.has(estrutura[i].tipo) || BLOCOS_FIXOS.has(estrutura[j].tipo)) return estrutura;
  const nova = [...estrutura];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}

/** As cores do tema viram as variáveis do CSS do convite. As que o tema
 *  não diz ficam com o padrão do modelo. Só #rrggbb (o banco confere o
 *  mesmo antes de salvar). */
export function varsDoTema(tema: TemaDoSite | null | undefined): Record<string, string> {
  const c = tema?.cores ?? {};
  const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
  const vars: Record<string, string> = {};
  const fundo = hex(c.fundo);
  const superficie = hex(c.superficie);
  const tinta = hex(c.tinta);
  const suave = hex(c.suave);
  const acento = hex(c.acento);
  if (fundo) vars["--cv-fundo"] = fundo;
  if (superficie) vars["--cv-fundo-presente"] = superficie;
  if (tinta) vars["--cv-tinta"] = tinta;
  if (suave) vars["--cv-corpo"] = suave;
  if (acento) vars["--cv-acento"] = acento;
  return vars;
}
