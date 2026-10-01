// Monta o que a tela Convidados mostra a partir do que o servidor leu.
// Parte PURA: sem banco, sem relógio (o "hoje" e o "agora" chegam de
// fora). Tudo o que sai daqui atravessa para o cliente, então só dados
// simples — e nada de telefone ou e-mail de convidado (dado de terceiro).

import type { Convidado } from "@/lib/portal-pessoas-shared";
import type { ConvidadoV2, MesaDoSalao } from "@/lib/supabase/portal-salao";
import { somarDias } from "@/lib/tempo";
import { iniciais } from "../../primitivas";

export type StatusConvidado = "sim" | "pen" | "nao";

export type ConvidadoDaLista = {
  id: string;
  nome: string;
  ini: string;
  status: StatusConvidado;
  /** "lado da noiva · Mesa 3" (vazio quando não há nada a dizer) */
  sub: string;
  mesaId: string | null;
};

export type RespostaDoFeed = {
  /** muda quando a resposta muda: remonta o cartão de destaque */
  chave: string;
  nome: string;
  ini: string;
  verbo: string;
  detalhe: string;
  recado: string | null;
  /** ISO do instante da resposta */
  em: string;
};

export type EnvioDoConvite = { t: string; d: string; feito: boolean };

export type MesaDoMapa = {
  id: string;
  rotulo: string;
  /** o que vai no disco do centro ("3"); vazio na mesa dos noivos */
  centro: string;
  honra: boolean;
  lugares: number;
  ocupados: number;
  /** primeiros nomes de quem senta ali */
  quem: string;
};

export type ContagemDasRespostas = { chave: string; icone: string; rotulo: string; n: number };

export type DadosConvidados = {
  eventoId: string;
  agoraServidor: number;
  convites: number;
  lugaresNoSalao: number;
  rsvpAberto: boolean;
  anel: { sim: number; pen: number; nao: number; total: number };
  lados: { n: string; s: number; t: number }[];
  envios: EnvioDoConvite[];
  /** "20 de fevereiro" */
  prazo: string | null;
  feed: RespostaDoFeed[];
  lista: ConvidadoDaLista[];
  mesas: MesaDoMapa[];
  contagens: ContagemDasRespostas[];
  musicas: { pedidos: { titulo: string; n: number }[]; sugeridas: number; aprovadas: number };
  convite: {
    casalA: string | null;
    casalB: string | null;
    /** "20 · 03 · 2027 · VILLA REAL" */
    dataCurta: string;
    /** "20 de março" */
    diaMes: string;
    local: string | null;
    fotoUrl: string | null;
    /** primeiro nome de um convidado de verdade, para a prévia */
    nomeConvidado: string | null;
    /** o link único do evento; null sem rsvp_hash */
    link: string | null;
  };
};

export type EntradaConvidados = {
  eventoId: string;
  agoraServidor: number;
  hoje: string;
  dataEvento: string;
  local: string | null;
  rsvpAberto: boolean;
  lembreteDias: number | null;
  lista: Convidado[];
  v2: ConvidadoV2[];
  mesas: MesaDoSalao[];
  recadosDoMural: Record<string, string>;
  datas: { saveTheDate: string | null; convites: string | null; prazo: string | null };
  musicas: { pedidos: { titulo: string; n: number }[]; sugeridas: number; aprovadas: number };
  casal: { a: string; b: string | null } | null;
  fotoUrl: string | null;
  link: string | null;
};

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2027-02-20" → "20 de fevereiro" */
export function diaEMes(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!m || !d) return "";
  return `${d} de ${MESES[m - 1]}`;
}

/** "2026-11-05" → "05/11" */
function ddmm(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

/** "2027-03-20" + "Villa Real" → "20 · 03 · 2027 · VILLA REAL" */
function dataCurta(iso: string, local: string | null): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  const base = a && m && d ? `${d} · ${m} · ${a}` : "";
  return local ? `${base} · ${local.toUpperCase()}` : base;
}

const primeiroNome = (s: string) => s.trim().split(/\s+/)[0] ?? "";

// ---------------------------------------------------------------------
// Restrições: as do convite novo (restricao_tipo, 180) e o texto livre do
// convite de sempre (restricao_alimentar), lido por palavra-chave. Só as
// CONTAGENS saem para "O que as respostas já contam".
// ---------------------------------------------------------------------
const TIPOS = ["vegetariano", "vegano", "sem_gluten", "sem_lactose", "alergia", "outro"] as const;
type TipoRestricao = (typeof TIPOS)[number];

const ROTULO_TIPO: Record<TipoRestricao, { rotulo: string; icone: string; curto: string }> = {
  vegetariano: { rotulo: "Vegetarianos", icone: "eco", curto: "vegetariano" },
  vegano: { rotulo: "Veganos", icone: "grass", curto: "vegano" },
  sem_gluten: { rotulo: "Sem glúten", icone: "no_meals", curto: "sem glúten" },
  sem_lactose: { rotulo: "Sem lactose", icone: "water_drop", curto: "sem lactose" },
  alergia: { rotulo: "Alergias", icone: "info", curto: "alergia" },
  outro: { rotulo: "Outras restrições", icone: "restaurant", curto: "outra restrição" },
};

const SEM_RESTRICAO = /^(nenhuma?|n[aã]o|nada|sem restri[cç][aã]o|-+|\.)$/i;

function tiposDaRestricao(tipos: string[], livre: string | null): Set<TipoRestricao> {
  const s = new Set<TipoRestricao>();
  for (const t of tipos) if ((TIPOS as readonly string[]).includes(t)) s.add(t as TipoRestricao);
  const texto = (livre ?? "").trim();
  if (texto && !SEM_RESTRICAO.test(texto)) {
    const achados: TipoRestricao[] = [];
    if (/vegan/i.test(texto)) achados.push("vegano");
    else if (/vegetarian/i.test(texto)) achados.push("vegetariano");
    if (/gl[uú]ten|cel[ií]ac/i.test(texto)) achados.push("sem_gluten");
    if (/lactose|leite|latic/i.test(texto)) achados.push("sem_lactose");
    if (/alerg/i.test(texto)) achados.push("alergia");
    for (const t of achados.length ? achados : (["outro"] as TipoRestricao[])) s.add(t);
  }
  return s;
}

function status(c: ConvidadoV2): StatusConvidado {
  return c.confirmacao === "confirmado" ? "sim" : c.confirmacao === "nao_vai" ? "nao" : "pen";
}

/** Quantas pessoas o convite põe na festa: quem confirmou leva os seus. */
function pessoasDe(c: ConvidadoV2): number {
  return c.confirmacao === "confirmado" ? 1 + c.acompanhantes + c.criancas : 1;
}

/** "Camila e Bruno" / "Família Tavares" respondem no plural. */
function plural(nome: string): boolean {
  return /\se\s/i.test(nome) || nome.includes("&") || /^fam[ií]lia\s/i.test(nome.trim());
}

export function montarConvidados(e: EntradaConvidados): DadosConvidados {
  const livrePorId = new Map(e.lista.map((c) => [c.id, c.restricaoAlimentar]));
  const ladoPorId = new Map(e.lista.map((c) => [c.id, c.lado]));
  const mesaPorId = new Map(e.mesas.map((m) => [m.id, m]));
  const temMesas = e.mesas.length > 0;

  // ---- o anel: pessoas que vêm, convites sem resposta, convites que não vêm
  let sim = 0;
  let pen = 0;
  let nao = 0;
  const porLado: Record<"noiva" | "noivo", { s: number; t: number }> = {
    noiva: { s: 0, t: 0 },
    noivo: { s: 0, t: 0 },
  };
  for (const c of e.v2) {
    const st = status(c);
    const p = pessoasDe(c);
    if (st === "sim") sim += p;
    else if (st === "pen") pen += 1;
    else nao += 1;
    const lado = ladoPorId.get(c.id);
    if (lado === "noiva" || lado === "noivo") {
      porLado[lado].t += p;
      if (st === "sim") porLado[lado].s += p;
    }
  }
  const lados = (
    [
      ["Lado da noiva", porLado.noiva],
      ["Lado do noivo", porLado.noivo],
    ] as const
  )
    .filter(([, v]) => v.t > 0)
    .map(([n, v]) => ({ n, s: v.s, t: v.t }));

  // ---- os envios: só os que têm data gravada no evento
  const envios: { t: string; iso: string }[] = [];
  if (e.datas.saveTheDate) envios.push({ t: "Save the date", iso: e.datas.saveTheDate });
  if (e.datas.convites) envios.push({ t: "Convites", iso: e.datas.convites });
  if (e.lembreteDias && e.dataEvento) envios.push({ t: "Lembrete automático", iso: somarDias(e.dataEvento.slice(0, 10), -e.lembreteDias) });
  envios.sort((a, b) => a.iso.localeCompare(b.iso));

  // ---- chegando agora: as respostas mais recentes
  const feed: RespostaDoFeed[] = e.v2
    .filter((c) => c.confirmacao !== "aguardando" && c.confirmadoEm)
    .sort((a, b) => (b.confirmadoEm ?? "").localeCompare(a.confirmadoEm ?? ""))
    .slice(0, 5)
    .map((c) => {
      const vem = c.confirmacao === "confirmado";
      const varios = plural(c.nome);
      let detalhe = "";
      if (vem) {
        const total = 1 + c.acompanhantes + c.criancas;
        const partes: string[] = [];
        if (total === 1) {
          partes.push(c.sexo === "feminino" ? "vem sozinha" : c.sexo === "masculino" ? "vem sozinho" : "1 pessoa");
        } else {
          partes.push(`${total} pessoas`);
        }
        if (c.criancas > 0) partes.push(`${c.criancas} ${c.criancas === 1 ? "criança" : "crianças"}`);
        const livre = (livrePorId.get(c.id) ?? "").trim();
        if (livre && !SEM_RESTRICAO.test(livre)) {
          const curto = livre.length > 40 ? `${livre.slice(0, 39)}…` : livre;
          partes.push(curto.charAt(0).toLowerCase() + curto.slice(1));
        } else for (const t of tiposDaRestricao(c.restricoes, null)) partes.push(ROTULO_TIPO[t].curto);
        detalhe = partes.join(" · ");
      }
      const recado = (c.recado ?? "").trim() || e.recadosDoMural[c.id] || null;
      if (!vem && recado) detalhe = "deixou um recado";
      return {
        chave: `${c.id}-${c.confirmadoEm}`,
        nome: c.nome,
        ini: iniciais(c.nome) || c.nome.charAt(0).toUpperCase(),
        verbo: vem ? (varios ? "confirmaram" : "confirmou") : varios ? "não vão poder" : "não vai poder",
        detalhe,
        recado,
        em: c.confirmadoEm as string,
      };
    });

  // ---- a lista
  const lista: ConvidadoDaLista[] = e.v2.map((c) => {
    const st = status(c);
    const lado = ladoPorId.get(c.id);
    const mesa = c.mesaId ? mesaPorId.get(c.mesaId) : undefined;
    const partes: string[] = [];
    if (lado === "noiva" || lado === "noivo") partes.push(`lado ${lado === "noiva" ? "da noiva" : "do noivo"}`);
    if (temMesas) {
      if (mesa) partes.push(mesa.rotulo);
      else if (st === "sim") partes.push("sem mesa");
    }
    return {
      id: c.id,
      nome: c.nome,
      ini: iniciais(c.nome) || c.nome.charAt(0).toUpperCase(),
      status: st,
      sub: partes.join(" · "),
      mesaId: mesa ? mesa.id : null,
    };
  });

  // ---- o mapa de mesas (só leitura: quem senta é a cerimonialista)
  const mesas: MesaDoMapa[] = [...e.mesas]
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR", { numeric: true }))
    .map((m, i) => {
      const ali = e.v2.filter((c) => c.mesaId === m.id && c.confirmacao !== "nao_vai");
      const ocupados = ali.reduce((s, c) => s + pessoasDe(c), 0);
      const numero = /^mesa\s*(.+)$/i.exec(m.rotulo.trim())?.[1];
      return {
        id: m.id,
        rotulo: m.rotulo,
        centro: numero && numero.length <= 4 ? numero : String(i + 1),
        honra: m.tipo === "noivos",
        lugares: Math.max(0, m.lugares),
        ocupados,
        quem: ali.map((c) => primeiroNome(c.nome)).join(", "),
      };
    });

  // ---- o que as respostas já contam (só de quem confirmou; só contagens)
  const porTipo = new Map<TipoRestricao, number>();
  let criancas = 0;
  for (const c of e.v2) {
    if (c.confirmacao !== "confirmado") continue;
    criancas += c.criancas;
    for (const t of tiposDaRestricao(c.restricoes, livrePorId.get(c.id) ?? null)) porTipo.set(t, (porTipo.get(t) ?? 0) + 1);
  }
  const contagens: ContagemDasRespostas[] = TIPOS.filter((t) => (porTipo.get(t) ?? 0) > 0).map((t) => ({
    chave: t,
    icone: ROTULO_TIPO[t].icone,
    rotulo: ROTULO_TIPO[t].rotulo,
    n: porTipo.get(t) ?? 0,
  }));
  if (criancas > 0) contagens.push({ chave: "criancas", icone: "child_care", rotulo: "Crianças", n: criancas });

  // ---- a prévia do convite: um convidado de verdade, de preferência quem ainda não respondeu
  const exemplo = e.v2.find((c) => c.confirmacao === "aguardando") ?? e.v2[0] ?? null;

  return {
    eventoId: e.eventoId,
    agoraServidor: e.agoraServidor,
    convites: e.v2.length,
    lugaresNoSalao: e.mesas.reduce((s, m) => s + Math.max(0, m.lugares), 0),
    rsvpAberto: e.rsvpAberto,
    anel: { sim, pen, nao, total: sim + pen + nao },
    lados,
    envios: envios.map((x) => ({ t: x.t, d: ddmm(x.iso), feito: x.iso <= e.hoje })),
    prazo: e.datas.prazo ? diaEMes(e.datas.prazo) : null,
    feed,
    lista,
    mesas,
    contagens,
    musicas: e.musicas,
    convite: {
      casalA: e.casal?.a ?? null,
      casalB: e.casal?.b ?? null,
      dataCurta: dataCurta(e.dataEvento, e.local),
      diaMes: e.dataEvento ? diaEMes(e.dataEvento) : "",
      local: e.local,
      fotoUrl: e.fotoUrl,
      nomeConvidado: exemplo ? primeiroNome(exemplo.nome) || null : null,
      link: e.link,
    },
  };
}
