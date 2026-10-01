// O conteúdo de cada bloco do site (estrutura[].conteudo), lido sem
// confiar em nada.
//
// O banco confere o mesmo na portal_salvar_estrutura_site_base (migração
// 191), com os MESMOS limites de LIMITES — se um mudar, muda lá também.
// Aqui a leitura é tolerante: entra unknown, sai tipado; texto longo é
// cortado, item sem o essencial é descartado, e nada quebra a página do
// convidado.
//
// Módulo puro: serve o site público, a prévia da família, a revisão do
// dono e o editor do portal.

import { estruturaEfetiva, type BlocoDoSite } from "@/lib/site-blocos";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { temNome } from "@/lib/rsvp-convite";

export const LIMITES = {
  nome: 40,
  fraseCapa: 200,
  marcos: 10,
  marcoAno: 10,
  marcoCidade: 40,
  marcoCurto: 24,
  marcoTitulo: 80,
  marcoTexto: 600,
  momentos: 8,
  momentoRotulo: 40,
  momentoNota: 80,
  cenas: 8,
  cenaFrase: 140,
  fotosDoTraje: 3,
  galeriaFotos: 12,
  galeriaFrase: 160,
  pares: 12,
  parNomes: 60,
  fotosPorPar: 2,
  presentes: 24,
  presenteId: 40,
  presenteTitulo: 60,
  presenteDescricao: 160,
  /** R$ 50, o mínimo já decidido (lista-presentes: VALOR_MINIMO) */
  valorMinimoCentavos: 5_000,
  valorMaximoCentavos: 5_000_000,
  frasesDoJeito: 8,
  fraseDoJeito: 80,
  menu: 6,
  opcaoDoMenu: 60,
  textoTitulo: 120,
  textoTexto: 4000,
  /** fotos somadas de toda a estrutura */
  fotosPorEstrutura: 60,
} as const;

export const ICONES_DO_MARCO = ["cafe", "aviao", "casa", "anel", "coracao"] as const;
export type IconeDoMarco = (typeof ICONES_DO_MARCO)[number];

export type FormaDoNome = "nomes" | "iniciais" | "iniciais-nomes";

/** Caminho no balde 'site': {evento}/{uuid}.jpg|webp. O banco ainda
 *  confere que o evento é o dono; aqui basta o formato. */
export type CaminhoDeFoto = string;

export type ConteudoCapa = { nome1: string; nome2: string; frase: string; foto: CaminhoDeFoto | null };
export type Marco = {
  ano: string;
  cidade: string;
  curto: string;
  titulo: string;
  texto: string;
  icone: IconeDoMarco | null;
  foto: CaminhoDeFoto | null;
};
export type ConteudoHistoria = { marcos: Marco[] };
export type Momento = { rotulo: string; hora: string; nota: string };
export type ConteudoMomentos = { itens: Momento[] };
export type Cena = { frase: string; foto: CaminhoDeFoto | null };
export type ConteudoCenas = { itens: Cena[] };
export type ConteudoLocal = { foto: CaminhoDeFoto | null };
export type ConteudoDressCode = { fotos: CaminhoDeFoto[] };
export type ConteudoGaleria = { frase: string; fotos: CaminhoDeFoto[] };
export type ParDeEspeciais = { nomes: string; fotos: CaminhoDeFoto[] };
export type ConteudoEspeciais = { pares: ParDeEspeciais[] };
export type ItemDePresente = {
  id: string;
  titulo: string;
  descricao: string;
  valor_centavos: number;
  foto: CaminhoDeFoto | null;
};
export type ConteudoPresentes = { itens: ItemDePresente[] };
export type ConteudoJeito = { frases: string[] };
export type ConteudoRsvp = { prazo: string | null; menu: string[] };
export type ConteudoTexto = { titulo: string; texto: string };

// ---------------------------------------------------------------- base

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Corta por caractere de verdade (o char_length do Postgres), não por
 *  unidade UTF-16 — senão um emoji no limite sai partido ao meio. */
function cortar(s: string, max: number): string {
  const letras = Array.from(s);
  return letras.length > max ? letras.slice(0, max).join("").trimEnd() : s;
}

function texto(v: unknown, max: number): string {
  return typeof v === "string" ? cortar(v.trim(), max) : "";
}

const RE_FOTO = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|webp)$/;

function foto(v: unknown): CaminhoDeFoto | null {
  return typeof v === "string" && RE_FOTO.test(v) ? v : null;
}

function fotos(v: unknown, max: number): CaminhoDeFoto[] {
  return lista(v)
    .map(foto)
    .filter((f): f is string => f !== null)
    .slice(0, max);
}

function dataValida(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [a, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  return t.getUTCFullYear() === a && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? v : null;
}

// ------------------------------------------------------------- leitores

export function lerCapa(c: unknown): ConteudoCapa {
  const o = obj(c);
  return {
    nome1: texto(o.nome1, LIMITES.nome),
    nome2: texto(o.nome2, LIMITES.nome),
    frase: texto(o.frase, LIMITES.fraseCapa),
    foto: foto(o.foto),
  };
}

/** Marco sem título nem texto não conta história: sai. */
export function lerHistoria(c: unknown): ConteudoHistoria {
  const marcos = lista(obj(c).marcos)
    .map((m): Marco => {
      const o = obj(m);
      const icone = (ICONES_DO_MARCO as readonly string[]).includes(o.icone as string)
        ? (o.icone as IconeDoMarco)
        : null;
      return {
        ano: texto(o.ano, LIMITES.marcoAno),
        cidade: texto(o.cidade, LIMITES.marcoCidade),
        curto: texto(o.curto, LIMITES.marcoCurto),
        titulo: texto(o.titulo, LIMITES.marcoTitulo),
        texto: texto(o.texto, LIMITES.marcoTexto),
        icone,
        foto: foto(o.foto),
      };
    })
    .filter((m) => m.titulo || m.texto)
    .slice(0, LIMITES.marcos);
  return { marcos };
}

/** A programação do dia. Sem rótulo ou com hora fora de HH:MM, sai. */
export function lerMomentos(c: unknown): ConteudoMomentos {
  const itens = lista(obj(c).itens)
    .map((m): Momento => {
      const o = obj(m);
      const hora = typeof o.hora === "string" && /^\d{2}:\d{2}$/.test(o.hora) ? o.hora : "";
      return { rotulo: texto(o.rotulo, LIMITES.momentoRotulo), hora, nota: texto(o.nota, LIMITES.momentoNota) };
    })
    .filter((m) => m.rotulo && m.hora && Number(m.hora.slice(0, 2)) < 24 && Number(m.hora.slice(3)) < 60)
    .slice(0, LIMITES.momentos);
  return { itens };
}

/** "Nossos momentos" do T04: frase e foto; sem nenhum dos dois, sai. */
export function lerCenas(c: unknown): ConteudoCenas {
  const itens = lista(obj(c).itens)
    .map((m): Cena => {
      const o = obj(m);
      return { frase: texto(o.frase, LIMITES.cenaFrase), foto: foto(o.foto) };
    })
    .filter((m) => m.frase || m.foto)
    .slice(0, LIMITES.cenas);
  return { itens };
}

export function lerLocal(c: unknown): ConteudoLocal {
  return { foto: foto(obj(c).foto) };
}

export function lerDressCode(c: unknown): ConteudoDressCode {
  return { fotos: fotos(obj(c).fotos, LIMITES.fotosDoTraje) };
}

export function lerGaleria(c: unknown): ConteudoGaleria {
  const o = obj(c);
  return { frase: texto(o.frase, LIMITES.galeriaFrase), fotos: fotos(o.fotos, LIMITES.galeriaFotos) };
}

/** Padrinhos: par sem nomes sai (a foto sozinha não diz quem é). */
export function lerEspeciais(c: unknown): ConteudoEspeciais {
  const pares = lista(obj(c).pares)
    .map((p): ParDeEspeciais => {
      const o = obj(p);
      return { nomes: texto(o.nomes, LIMITES.parNomes), fotos: fotos(o.fotos, LIMITES.fotosPorPar) };
    })
    .filter((p) => p.nomes)
    .slice(0, LIMITES.pares);
  return { pares };
}

/** Os itens de presente. Todo presente tem valor: sem valor inteiro entre
 *  R$ 50 e R$ 50.000, ou sem título, o item sai. O id é o que a fatia C
 *  usa para achar o preço na fotografia publicada — nunca repete. O SQL
 *  não garante ids únicos (só o formato), então um repetido é renomeado
 *  aqui: o servidor da fatia C precisa passar a fotografia por ESTE leitor
 *  antes de buscar o preço, ou o id renomeado não existe lá. */
export function lerPresentes(c: unknown): ConteudoPresentes {
  const vistos = new Set<string>();
  const itens: ItemDePresente[] = [];
  lista(obj(c).itens).forEach((p, i) => {
    if (itens.length >= LIMITES.presentes) return;
    const o = obj(p);
    const titulo = texto(o.titulo, LIMITES.presenteTitulo);
    const v = o.valor_centavos;
    if (!titulo) return;
    if (typeof v !== "number" || !Number.isInteger(v)) return;
    if (v < LIMITES.valorMinimoCentavos || v > LIMITES.valorMaximoCentavos) return;
    const bruto =
      typeof o.id === "string"
        ? o.id.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, LIMITES.presenteId)
        : "";
    let id = bruto || `item-${i + 1}`;
    for (let n = 2; vistos.has(id); n++) id = `${(bruto || "item").slice(0, 30)}-${i + 1}-${n}`;
    vistos.add(id);
    itens.push({
      id,
      titulo,
      descricao: texto(o.descricao, LIMITES.presenteDescricao),
      valor_centavos: v,
      foto: foto(o.foto),
    });
  });
  return { itens };
}

export function lerJeito(c: unknown): ConteudoJeito {
  const frases = lista(obj(c).frases)
    .map((f) => texto(f, LIMITES.fraseDoJeito))
    .filter(Boolean)
    .slice(0, LIMITES.frasesDoJeito);
  return { frases };
}

export function lerRsvp(c: unknown): ConteudoRsvp {
  const o = obj(c);
  const menu = lista(o.menu)
    .map((m) => texto(m, LIMITES.opcaoDoMenu))
    .filter(Boolean)
    .slice(0, LIMITES.menu);
  return { prazo: dataValida(o.prazo), menu };
}

export function lerTexto(c: unknown): ConteudoTexto {
  const o = obj(c);
  return { titulo: texto(o.titulo, LIMITES.textoTitulo), texto: texto(o.texto, LIMITES.textoTexto) };
}

/** Todas as fotos de uma estrutura, sem repetir, na ordem dos blocos —
 *  é o que a assinatura de URLs e a faixa "Fotos desta versão" leem. */
export function fotosDaEstrutura(estrutura: BlocoDoSite[]): CaminhoDeFoto[] {
  const todas: CaminhoDeFoto[] = [];
  for (const b of estrutura) {
    const c = b.conteudo;
    if (!c) continue;
    switch (b.tipo as string) {
      case "capa":
        todas.push(...[lerCapa(c).foto].filter((f): f is string => !!f));
        break;
      case "historia":
        todas.push(...lerHistoria(c).marcos.map((m) => m.foto).filter((f): f is string => !!f));
        break;
      case "cenas":
        todas.push(...lerCenas(c).itens.map((m) => m.foto).filter((f): f is string => !!f));
        break;
      case "local":
        todas.push(...[lerLocal(c).foto].filter((f): f is string => !!f));
        break;
      case "dress_code":
        todas.push(...lerDressCode(c).fotos);
        break;
      case "galeria":
        todas.push(...lerGaleria(c).fotos);
        break;
      case "especiais":
        todas.push(...lerEspeciais(c).pares.flatMap((p) => p.fotos));
        break;
      case "presentes":
        todas.push(...lerPresentes(c).itens.map((p) => p.foto).filter((f): f is string => !!f));
        break;
    }
  }
  return Array.from(new Set(todas)).slice(0, LIMITES.fotosPorEstrutura);
}

// ---------------------------------------------------------------- nomes

/** A inicial como o desenho manda: charAt(0).toUpperCase(). */
export function iniciais(nome: string): string {
  return nome.trim().charAt(0).toUpperCase();
}

/** Para a hashtag: sem acento, sem espaço, só letra e número. */
function semAcento(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]/g, "");
}

/** "#MarinaEJoao": '#' + nome1 + 'E' + nome2. Faltando um, só o outro. */
export function hashtag(n1: string, n2: string): string {
  const a = semAcento(n1);
  const b = semAcento(n2);
  if (!a && !b) return "";
  if (!a || !b) return `#${a || b}`;
  return `#${a}E${b}`;
}

/**
 * O nome do evento quebrado em dois: "Marina e João", "Marina & João".
 * É só o pré-preenchimento — nome composto erra, e por isso a noiva
 * confere em Detalhes. Sem separador, tudo fica no nome 1.
 */
export function partirNomes(nomeDoEvento: string): { nome1: string; nome2: string } {
  const n = (nomeDoEvento ?? "").replace(/\s+/g, " ").trim();
  if (!temNome(n)) return { nome1: "", nome2: "" };
  const porE = n.split(/\s*&\s*|\s+e\s+/i).map((p) => p.trim()).filter(Boolean);
  if (porE.length >= 2) {
    return { nome1: cortar(porE[0], LIMITES.nome), nome2: cortar(porE.slice(1).join(" e "), LIMITES.nome) };
  }
  return { nome1: cortar(n, LIMITES.nome), nome2: "" };
}

function eFormaDoNome(v: unknown): v is FormaDoNome {
  return v === "nomes" || v === "iniciais" || v === "iniciais-nomes";
}

/** Os nomes do casal como o site mostra: os digitados na capa; o que
 *  faltar vem da quebra do nome do evento (site de antes da 191). A
 *  forma vem do tema; sem forma, "nomes". */
export function nomesDoSite(dados: SitePublico): { nome1: string; nome2: string; forma: FormaDoNome } {
  const capa = estruturaEfetiva(dados.site?.estrutura).find((b) => b.tipo === "capa");
  const digitados = lerCapa(capa?.conteudo);
  const partidos = partirNomes(dados.evento.anfitrioes);
  const tema = obj(dados.site?.tema);
  return {
    nome1: digitados.nome1 || partidos.nome1,
    nome2: digitados.nome2 || partidos.nome2,
    forma: eFormaDoNome(tema.nome) ? tema.nome : "nomes",
  };
}

// --------------------------------------------------------------- valores

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const REAIS_INTEIROS = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** "R$ 480" ou "R$ 1.234,50" — centavo só aparece quando existe. */
export function formatarReais(centavos: number): string {
  if (!Number.isFinite(centavos)) return "";
  const c = Math.round(centavos);
  return c % 100 === 0 ? REAIS_INTEIROS.format(c / 100) : REAIS.format(c / 100);
}
