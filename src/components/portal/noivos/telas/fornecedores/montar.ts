// Os cartões da tela Fornecedores (desenho v4, README §11), montados no
// servidor a partir do que o portal já lê — só dados simples atravessam
// para o cliente (nada de valor, nada de Date).
//
//   · os da cerimonialista (181): Confirmado quando contratado; "Falta o
//     sinal" quando contratado e nenhuma parcela dele foi paga (só para
//     quem enxerga o Financeiro: sem ele, as parcelas não chegam e o
//     cartão fica Confirmado); Conversando quando ainda não fechou. Os
//     itens são o que ele faz no roteiro do dia;
//   · as opções que a cerimonialista publicou e esperam a escolha (092):
//     "Escolher", com as opções e até quando;
//   · os da família (181): Confirmado/Conversando pelo que ela marcou.
//
// Parte pura: recebe o "hoje" de Brasília de quem chama.

import { categoriaLabel } from "@/lib/fornecedores-shared";
import { normalizarDDI } from "@/lib/whatsapp-link";
import { hojeBR } from "@/lib/tempo";
import type { FornecedorDaFamilia, FornecedorDaFesta } from "@/lib/supabase/portal-fornecedores";
import type { Curadoria } from "@/lib/supabase/curadoria";
import type { ParcelaDoPortal } from "@/lib/supabase/portal";

/** ok = Confirmado · sinal = Falta o sinal · neg = Conversando · esc = Escolher */
export type StatusDoFornecedor = "ok" | "sinal" | "neg" | "esc";

export type CartaoDoFornecedor = {
  chave: string;
  id: string;
  /** festa = da cerimonialista · escolha = opções publicadas · familia = que a família chamou */
  origem: "festa" | "escolha" | "familia";
  icone: string;
  status: StatusDoFornecedor;
  categoria: string;
  nome: string;
  /** as linhas com o check verde */
  itens: string[];
  /** "mais 2 no roteiro" — a linha sem check, quando há mais itens */
  mais: string | null;
  /** o aviso em marrom ("Sinal até 15 de outubro"); "" sem aviso */
  aviso: string;
  /** do que a conversa com a cerimonialista trata (texto do WhatsApp) */
  assunto: string;
  /** família: o nome no contato que ela escreveu ("com Carla"); null = "com vocês" */
  com: string | null;
  /** família: o telefone do contato, quando é um telefone de verdade */
  telefone: string | null;
};

const ITENS_NO_CARTAO = 3;

/* ---------- o ícone pela categoria (só nomes da fonte-subconjunto) ---------- */

const ICONES: [RegExp, string][] = [
  [/transporte|veiculo|carro|\bvan\b|onibus|limousine|motorista/, "map"],
  [/hotel|hosped|pousada/, "hotel"],
  [/mestre de cerimonia|\bmc\b|assessor|cerimonialista/, "diversity_1"],
  [/celebrante|cerimonia|religios|padre|pastor|igreja|juiz de paz/, "favorite"],
  [/vestido|traje|terno|roupa|alfaiat/, "checkroom"],
  [/dia da noiva|maquia|make|cabelo|penteado|beleza|estetica/, "auto_awesome"],
  [/joia|alianca/, "star"],
  [/bolo|doce|confeit|brigadeiro|sobremesa/, "cake"],
  [/buffet|gastronom|chef|jantar|comida|cozinha|\bbar\b|bebida|drink|bartender|cervej|vinho|coquetel/, "restaurant"],
  [/flor|decor|arranjo|paisagis|balao|baloes/, "local_florist"],
  [/foto/, "photo_camera"],
  [/film|video|drone|cinema/, "theaters"],
  [/\bdj\b|\bsom\b|sonoriz|audio/, "headphones"],
  [/banda|music|orquestra|coral|quarteto|violin|cantor|saxof/, "music_note"],
  [/ilumina|\bluz\b|\bled\b/, "lightbulb"],
  [/papel|convite|grafic|personaliz|caligraf/, "mail"],
  [/lembranc|brinde|presente/, "redeem"],
  [/recrea|infantil|crianca|kids|baba|monitor/, "child_care"],
  [/seguran/, "verified_user"],
  [/gerador|estrutura|mobili|tenda|palco|montagem|limpeza/, "construction"],
  [/local|espaco|salao|sitio|chacara|fazenda|villa|quinta/, "location_on"],
];

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

/** O primeiro texto que casar decide (categoria antes do nome). */
function iconeDe(...textos: (string | null | undefined)[]): string {
  for (const t of textos) {
    if (!t) continue;
    const n = semAcento(t);
    const achou = ICONES.find(([re]) => re.test(n));
    if (achou) return achou[1];
  }
  return "storefront";
}

/* ---------- datas, sempre em Brasília e sem fuso no meio ---------- */

function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.slice(0, 10).split("-").map(Number);
  const [a2, m2, d2] = ate.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 864e5);
}

const DIA_MES = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });

/** "15 de outubro" (com o ano só quando não é o de hoje). */
function diaMes(iso: string, hoje: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const s = DIA_MES.format(new Date(Date.UTC(a, m - 1, d)));
  return String(a) === hoje.slice(0, 4) ? s : `${s} de ${a}`;
}

/** "20:00" → "20h", "20:30" → "20h30". */
function horaCurta(h: string): string {
  const [hh, mm] = h.split(":");
  return `${Number(hh)}h${mm && mm !== "00" ? mm : ""}`;
}

function avisoDoSinal(vence: string, hoje: string): string {
  const d = diasEntre(hoje, vence);
  if (d < 0) return `Sinal venceu em ${diaMes(vence, hoje)}`;
  if (d === 0) return "Sinal vence hoje";
  if (d === 1) return "Sinal vence amanhã";
  return `Sinal até ${diaMes(vence, hoje)}`;
}

function avisoDaEscolha(c: Curadoria, hoje: string): string {
  const prazo = c.opcoes
    .map((o) => o.prazoReserva?.slice(0, 10) ?? null)
    .filter((p): p is string => !!p && p >= hoje)
    .sort()[0];
  if (prazo) {
    const d = diasEntre(hoje, prazo);
    if (d === 0) return "Escolher hoje";
    if (d === 1) return "Escolher até amanhã";
    return `Escolher até ${diaMes(prazo, hoje)}`;
  }
  if (c.publicadaEm) {
    const n = diasEntre(hojeBR(new Date(c.publicadaEm)), hoje);
    if (n <= 0) return "Opções chegaram hoje";
    if (n === 1) return "Opções chegaram ontem";
    return `Opções chegaram há ${n} dias`;
  }
  return "";
}

const QUANTAS = ["", "Uma opção", "Duas opções", "Três opções", "Quatro opções"];

/**
 * O contato que a família escreveu: o telefone (quando é um de verdade)
 * e o nome que sobra ("Carla 11 99999-0000" → Carla + telefone).
 */
function lerContato(contato: string | null): { com: string | null; telefone: string | null } {
  const bruto = contato?.trim() ?? "";
  if (!bruto) return { com: null, telefone: null };
  const telefone = normalizarDDI(bruto) ? bruto : null;
  const resto = (telefone ? bruto.replace(/[+().\d\s-]+/g, " ") : bruto)
    .replace(/^[\s·|/,:;–-]+|[\s·|/,:;–-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { com: resto || null, telefone };
}

export function montarCartoes({
  daCerimonialista,
  daFamilia,
  curadorias,
  parcelas,
  hoje,
}: {
  daCerimonialista: FornecedorDaFesta[];
  daFamilia: FornecedorDaFamilia[];
  curadorias: Curadoria[];
  /** só as de quem enxerga o Financeiro; [] para os outros */
  parcelas: ParcelaDoPortal[];
  hoje: string;
}): CartaoDoFornecedor[] {
  // as parcelas de cada fornecedor (a RPC do investimento traz o nome)
  const parcelasDe = new Map<string, ParcelaDoPortal[]>();
  for (const p of parcelas) {
    if (!p.fornecedor) continue;
    const l = parcelasDe.get(p.fornecedor) ?? [];
    l.push(p);
    parcelasDe.set(p.fornecedor, l);
  }

  const festa: CartaoDoFornecedor[] = daCerimonialista.map((f) => {
    const categoria = f.categoria ? categoriaLabel(f.categoria) : "Fornecedor";
    const minhas = parcelasDe.get(f.nome) ?? [];
    const semSinal = f.contratado && minhas.length > 0 && minhas.every((p) => !p.paid);
    const primeira = semSinal ? [...minhas].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] : null;
    const itens = f.naNoite.map((m) => (m.hora ? `${horaCurta(m.hora)} · ${m.titulo}` : m.titulo));
    const sobra = itens.length - ITENS_NO_CARTAO;
    return {
      chave: `festa:${f.id}`,
      id: f.id,
      origem: "festa",
      icone: iconeDe(f.categoria ? categoria : null, f.nome),
      status: semSinal ? "sinal" : f.contratado ? "ok" : "neg",
      categoria,
      nome: f.nome,
      itens: itens.slice(0, ITENS_NO_CARTAO),
      mais: sobra > 0 ? `mais ${sobra} no roteiro` : null,
      aviso: primeira ? avisoDoSinal(primeira.dueDate, hoje) : "",
      assunto: f.nome,
      com: null,
      telefone: null,
    };
  });

  const escolhas: CartaoDoFornecedor[] = curadorias
    .filter((c) => c.estado === "publicada" && c.opcoes.length > 0)
    .map((c) => {
      const categoria = c.objetivoNome?.trim() || c.decisaoTitulo.trim() || "Escolha";
      const n = c.opcoes.length;
      const sobra = n - ITENS_NO_CARTAO;
      return {
        chave: `escolha:${c.id}`,
        id: c.id,
        origem: "escolha",
        icone: iconeDe(c.objetivoNome, c.decisaoTitulo, ...c.opcoes.map((o) => o.nome)),
        status: "esc",
        categoria,
        nome: QUANTAS[n] ?? `${n} opções`,
        itens: c.opcoes.slice(0, ITENS_NO_CARTAO).map((o) => o.nome),
        mais: sobra > 0 ? `mais ${sobra} ${sobra === 1 ? "opção" : "opções"}` : null,
        aviso: avisoDaEscolha(c, hoje),
        assunto: `as opções de ${categoria.toLocaleLowerCase("pt-BR")}`,
        com: null,
        telefone: null,
      };
    });

  const familia: CartaoDoFornecedor[] = daFamilia.map((f) => {
    const { com, telefone } = lerContato(f.contato);
    return {
      chave: `familia:${f.id}`,
      id: f.id,
      origem: "familia",
      icone: iconeDe(f.oQueFaz, f.nome),
      status: f.contratado ? "ok" : "neg",
      categoria: f.oQueFaz?.trim() || "Da família",
      nome: f.nome,
      itens: [],
      mais: null,
      aviso: "",
      assunto: f.nome,
      com,
      telefone,
    };
  });

  // o que pede uma ação de vocês vem primeiro: escolher, depois o sinal
  const pedeAcao = festa.filter((c) => c.status === "sinal");
  const resto = festa.filter((c) => c.status !== "sinal");
  return [...escolhas, ...pedeAcao, ...resto, ...familia];
}
