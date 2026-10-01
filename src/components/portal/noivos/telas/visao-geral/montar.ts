// A Visão geral do portal dos noivos (desenho v4, README §6 e o cartão de
// Perguntas do §9), montada a partir do que o servidor leu. Parte PURA:
// sem banco e sem relógio (o "hoje" de Brasília chega de fora). Tudo o
// que sai daqui atravessa para o cliente: só dados simples, nada de
// valor em dinheiro, nada de Date.

import type { TarefaDaCerimonialista, TarefaDoPortal } from "@/lib/supabase/portal-tarefas";
import type { PerguntaDoPortal } from "@/lib/supabase/portal";
import type { TipoCampo } from "@/lib/planejamento-shared";
import { rotuloDaOpcao } from "@/lib/rotulo-da-opcao";
import type { CartaoDoFornecedor } from "../fornecedores/montar";

/* ---------- datas, em Brasília e sem fuso no meio ---------- */

function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.slice(0, 10).split("-").map(Number);
  const [a2, m2, d2] = ate.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 864e5);
}

/** "para agora" · "para amanhã" · "faltam 21 dias" (a voz do portal). */
export function quandoEmTexto(prazo: string | null, hoje: string): string | null {
  if (!prazo) return null;
  const d = diasEntre(hoje, prazo);
  if (d <= 0) return "para agora";
  if (d === 1) return "para amanhã";
  return `faltam ${d} dias`;
}

/** "15:00" → "15h", "15:30" → "15h30". */
function horaCurta(h: string): string {
  const [hh, mm] = h.split(":");
  return `${Number(hh)}h${mm && mm !== "00" ? mm : ""}`;
}

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

const primeiraMinuscula = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/* ---------- Hoje, só uma coisa ---------- */

export type TarefaDoDia = {
  id: string;
  origem: "pedida" | "propria";
  titulo: string;
  icone: string;
  /** "Studio no centro · às 15h" — vazio quando não há o que dizer */
  sub: string;
  /** "para agora" / "faltam 21 dias"; null sem prazo */
  quando: string | null;
  /** o que a família escreveu na tarefa; null sem texto */
  dica: string | null;
};

/** O ícone pelo que a tarefa diz (só nomes da fonte-subconjunto). */
const ICONES_DA_TAREFA: [RegExp, string][] = [
  [/hashtag/, "tag"],
  [/padrinh|madrinh|daminh|pajem|pajens|cortejo/, "diversity_1"],
  [/traje|vestido|terno|roupa|sapato|alfaiat|prova d/, "checkroom"],
  [/dia da noiva|beleza|maquia|make|cabelo|penteado/, "auto_awesome"],
  [/papelaria|convite|save the date|\bsite\b/, "mail"],
  [/music|trilha|playlist|\bdj\b|banda/, "music_note"],
  [/convidad|lista de nomes|rsvp|mesas?\b/, "group"],
  [/foto|album/, "photo_camera"],
  [/film|video/, "theaters"],
  [/flor|decor|buque|arranjo/, "local_florist"],
  [/bolo|doce/, "cake"],
  [/buffet|cardapio|degusta|jantar|bebida|\bbar\b/, "restaurant"],
  [/pagar|pagamento|parcela|sinal|boleto|\bpix\b/, "payments"],
  [/hotel|hosped/, "hotel"],
  [/transporte|carro|\bvan\b|motorista/, "map"],
  [/chuva|plano b/, "umbrella"],
  [/presente|lua de mel/, "redeem"],
  [/cores|paleta|estilo|identidade visual/, "palette"],
  [/alianca|joia/, "star"],
  [/contrato|document|certid|cartorio|habilita/, "description"],
  [/local|espaco|salao|igreja|visita/, "location_on"],
  [/reuniao|conversa|ligar|ligacao/, "event"],
];

export function iconeDaTarefa(titulo: string): string {
  const t = semAcento(titulo);
  return ICONES_DA_TAREFA.find(([re]) => re.test(t))?.[1] ?? "event_available";
}

/**
 * As tarefas da família que esperam por ela, na ordem do prazo (sem data
 * por último; no empate, o que a cerimonialista pediu vem antes). O
 * cartão mostra de três em três.
 */
export function montarTarefasDoDia({
  tarefas,
  hoje,
  cerimonialista,
}: {
  tarefas: TarefaDoPortal[];
  hoje: string;
  /** primeiro nome de quem cuida; null na conta de família */
  cerimonialista: string | null;
}): TarefaDoDia[] {
  return tarefas
    .filter((t) => !t.feita)
    .sort(
      (a, b) =>
        (a.prazo ?? "9999-12-31").localeCompare(b.prazo ?? "9999-12-31") ||
        (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99") ||
        (a.origem === b.origem ? 0 : a.origem === "pedida" ? -1 : 1) ||
        a.titulo.localeCompare(b.titulo, "pt-BR")
    )
    .slice(0, 30)
    .map((t) => {
      const partes: string[] = [];
      if (t.origem === "pedida") {
        // o detalhe da tarefa da equipe é o local
        if (t.detalhe) partes.push(t.detalhe);
        if (t.hora) partes.push(`às ${horaCurta(t.hora)}`);
        if (partes.length === 0 && cerimonialista) partes.push(`${cerimonialista} pediu`);
      } else if (t.quem?.trim()) {
        partes.push(t.quem.trim());
      }
      return {
        id: t.id,
        origem: t.origem,
        titulo: t.titulo,
        icone: iconeDaTarefa(t.titulo),
        sub: partes.join(" · "),
        quando: quandoEmTexto(t.prazo, hoje),
        dica: t.origem === "propria" ? t.detalhe?.trim() || null : null,
      };
    });
}

/* ---------- os atalhos ---------- */

export type Atalho = {
  chave: string;
  icone: string;
  rotulo: string;
  /** "112 de 180" */
  grande: string;
  sub: string;
  /** 0–100 */
  pct: number;
  href: string;
};

/** Confirmações: os mesmos números do anel da tela Convidados. */
export function atalhoDeConfirmacoes({
  anel,
  comMesa,
  href,
}: {
  anel: { sim: number; pen: number; nao: number; total: number };
  /** convites confirmados que já têm mesa; null sem salão montado */
  comMesa: number | null;
  href: string;
}): Atalho | null {
  if (anel.total <= 0) return null;
  const faltam =
    anel.pen === 0
      ? "todos já responderam"
      : anel.pen === 1
        ? "1 ainda não respondeu"
        : `${anel.pen} ainda não responderam`;
  const mesa = comMesa === null ? "" : ` · ${comMesa} já ${comMesa === 1 ? "tem" : "têm"} mesa`;
  return {
    chave: "convidados",
    icone: "group",
    rotulo: "Confirmações",
    grande: `${anel.sim} de ${anel.total}`,
    sub: faltam + mesa,
    pct: (anel.sim / anel.total) * 100,
    href,
  };
}

/** Fornecedores: "N de M" confirmados e o que pede uma ação de vocês. */
export function atalhoDeFornecedores({
  cartoes,
  href,
}: {
  cartoes: CartaoDoFornecedor[];
  href: string;
}): Atalho | null {
  const total = cartoes.length;
  if (total === 0) return null;
  const ok = cartoes.filter((c) => c.status === "ok").length;
  // a ordem dos cartões já põe na frente o que pede ação: escolher, depois o sinal
  const acao = cartoes.find((c) => c.status === "esc" || c.status === "sinal");
  let sub: string;
  if (acao?.status === "esc") {
    sub = `${acao.categoria} · ${acao.aviso ? primeiraMinuscula(acao.aviso) : "escolher"}`;
  } else if (acao?.status === "sinal") {
    const ate = /^Sinal até (.+)$/.exec(acao.aviso);
    sub = ate
      ? `${acao.nome} espera o sinal até ${ate[1]}`
      : acao.aviso
        ? `${acao.nome} · ${primeiraMinuscula(acao.aviso)}`
        : `${acao.nome} espera o sinal`;
  } else if (ok === total) {
    sub = total === 1 ? "confirmado" : "todos confirmados";
  } else {
    sub = `${total - ok} ainda em conversa`;
  }
  return {
    chave: "fornecedores",
    icone: "storefront",
    rotulo: "Fornecedores",
    grande: `${ok} de ${total}`,
    sub,
    pct: (ok / total) * 100,
    href,
  };
}

/* ---------- Perguntas do momento ---------- */

export type PerguntaDoMomento = {
  campoId: string;
  label: string;
  tipo: TipoCampo;
  /** [valor gravado, rótulo] */
  opcoes: [string, string][];
  unidade: string | null;
  /** a versão que a tela viu (trava otimista da escrita) */
  updatedAt: string;
  /** a pergunta da hashtag ganha o "#" do desenho */
  hashtag: boolean;
};

/** As que a tela de Perguntas mostra agora (até 5), sem os tipos que o portal não responde aqui. */
export function montarPerguntas(abertas: PerguntaDoPortal[]): PerguntaDoMomento[] {
  return abertas
    .slice(0, 5)
    .filter((p) => p.tipo !== "anexo" && p.tipo !== "fornecedor")
    .map((p) => ({
      campoId: p.campoId,
      label: p.label,
      tipo: p.tipo,
      opcoes: (p.opcoes ?? []).map((o) => [o, rotuloDaOpcao(o)] as [string, string]),
      unidade: p.unidade,
      updatedAt: p.updatedAt,
      hashtag: /hashtag/i.test(p.label),
    }));
}

/** "marinaeteo2027" — o exemplo do campo da hashtag, com o casal de verdade. */
export function exemploDeHashtag(casal: { a: string; b: string | null } | null, dataEvento: string): string {
  const limpo = (s: string) => semAcento(s).replace(/[^a-z0-9]/g, "");
  const ano = dataEvento.slice(0, 4);
  if (!casal) return `nossocasamento${ano}`;
  return `${limpo(casal.a)}${casal.b ? `e${limpo(casal.b)}` : ""}${ano}`;
}

/* ---------- o cartão da cerimonialista ---------- */

export type CartaoDaCerimonialista =
  | {
      modo: "cerimonialista";
      nome: string;
      inicial: string;
      /** "Sua cerimonialista · Gê Cerimonial" */
      linha: string;
      /** quem aparece em "Enquanto isso, … cuida de" */
      quem: string;
      whatsapp: string | null;
      cuidando: string[];
      resolvido: string[];
    }
  | {
      modo: "convite";
      /** o negócio que pediu para organizar, esperando resposta */
      pedidoDe: string | null;
      href: string;
    };

const unicos = (l: string[]) => Array.from(new Set(l.map((x) => x.trim()).filter(Boolean)));

export function montarCartaoDaCerimonialista({
  daFamilia,
  pedidoDe,
  contatoNome,
  marcaNome,
  whatsapp,
  daCerimonialista,
  base,
}: {
  daFamilia: boolean;
  pedidoDe: string | null;
  contatoNome: string | null;
  marcaNome: string | null;
  whatsapp: string | null;
  daCerimonialista: TarefaDaCerimonialista[];
  base: string;
}): CartaoDaCerimonialista {
  if (daFamilia) return { modo: "convite", pedidoDe, href: `${base}/cerimonialista` };
  const pessoa = contatoNome?.trim() || null;
  const marca = marcaNome?.trim() || null;
  const nome = pessoa ?? marca ?? "Sua cerimonialista";
  return {
    modo: "cerimonialista",
    nome,
    inicial: pessoa || marca ? nome.charAt(0).toUpperCase() : "•",
    linha: pessoa && marca && semAcento(marca) !== semAcento(pessoa) ? `Sua cerimonialista · ${marca}` : "Sua cerimonialista",
    quem: pessoa ? pessoa.split(/\s+/)[0] : marca ?? "sua cerimonialista",
    whatsapp,
    cuidando: unicos(daCerimonialista.filter((t) => !t.feito).map((t) => t.titulo)).slice(0, 6),
    resolvido: unicos(daCerimonialista.filter((t) => t.feito).map((t) => t.titulo)).slice(0, 5),
  };
}
