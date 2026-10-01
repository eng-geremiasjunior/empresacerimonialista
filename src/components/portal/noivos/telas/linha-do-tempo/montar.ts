// A linha do tempo do portal dos noivos (desenho v4, README §7): do mês de
// hoje até o mês do casamento, em no máximo 6 nós — o mês atual, os
// próximos meses que têm alguma coisa e o mês do casamento.
//
// Parte pura: recebe o que os carregadores do portal já devolvem e monta
// os meses. Roda no servidor (Secao.tsx); o cartão só recebe o resultado
// (texto e números, nada de Date nem Map pela fronteira).
//
// O que entra em cada mês, e de onde:
//   · o casamento, no mês dele;
//   · as tarefas da família — as que a cerimonialista pediu e as que a
//     família incluiu (getTarefasDoPortal) — com o prazo;
//   · as decisões da família com prazo (getHomePortal → faltaDecidir);
//   · os compromissos em que o casal comparece (getLinhaDoTempo), de hoje
//     em diante;
//   · as parcelas em aberto, SEM valor (getInvestimento);
//   · o que a cerimonialista conduz (quadro da 173), sem data no texto:
//     o prazo dela não é assunto do casal.
// O que venceu e ainda está aberto cai no mês atual: é de agora.
//
// Capítulo e nota do mês (o desenho tem "Capítulo 2 · As escolhas"): não
// há fonte para isso no método, então não aparecem. A única nota é a do
// mês do casamento, que vem do evento (local, cidade e hora).

import type { Casal } from "@/lib/portal-noivos";
import type { DecisaoDoPortal, ItemLinhaDoTempo, ParcelaDoPortal } from "@/lib/supabase/portal";
import type { TarefaDaCerimonialista, TarefaDoPortal } from "@/lib/supabase/portal-tarefas";

export type ItemDoMes = {
  /** o texto do item ("Contratar o dia da noiva · até 21 de outubro") */
  t: string;
  /** é da cerimonialista (fundo sálvia e "com {nome}") */
  equipe: boolean;
  /** ícone do subconjunto do portal */
  icone: string;
};

export type MesDaLinha = {
  /** AAAA-MM */
  chave: string;
  /** "Out" */
  nome: string;
  /** "Outubro" — no mês do casamento, "20 de março" */
  completo: string;
  /** "agora", "em 2 meses", "o grande dia" */
  tag: string;
  icone: string;
  /** a posição na curva do desenho (0–5) */
  pos: number;
  nota: string | null;
  itens: ItemDoMes[];
  /** quantos itens do mês ficaram fora da lista */
  mais: number;
};

export type EntradaDaLinha = {
  /** hoje em Brasília, AAAA-MM-DD (hojeBR) */
  hoje: string;
  /** a data do casamento, AAAA-MM-DD */
  dataEvento: string;
  horaEvento: string | null;
  local: string | null;
  cidade: string | null;
  casal: Casal | null;
  tarefas: TarefaDoPortal[];
  daCerimonialista: TarefaDaCerimonialista[];
  decisoes: DecisaoDoPortal[];
  linhaDoTempo: ItemLinhaDoTempo[];
  parcelas: ParcelaDoPortal[];
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
const ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** 6 nós no desenho: o atual, até 4 meses no meio e o do casamento. */
const MAX_NOS = 6;
/** Itens por mês. O resto vira "e mais N". */
const MAX_ITENS = 8;

/** O ícone pelo assunto do título (só nomes do subconjunto da fonte). */
const ICONES: [RegExp, string][] = [
  [/padrinh|madrinh|daminh|pajem|pajens|cortejo/, "diversity_1"],
  [/hashtag|\bsite\b/, "tag"],
  [/save the date/, "send"],
  [/dia da noiva|beleza|maquiag|cabel|penteado/, "auto_awesome"],
  [/identidade|paleta|\bcores\b/, "palette"],
  [/papelaria|convite/, "mail"],
  [/chuva|plano b\b/, "umbrella"],
  [/infraestrutura|estrutura|gerador|tenda/, "construction"],
  [/hotel|hosped/, "hotel"],
  [/music|\bdj\b|banda|playlist|trilha/, "music_note"],
  [/traje|vestido|terno|sapato/, "checkroom"],
  [/foto|filmag|video/, "photo_camera"],
  [/flor|decora|buque/, "local_florist"],
  [/bolo|doce/, "cake"],
  [/buffet|cardapio|degusta|bebida|comida|jantar/, "restaurant"],
  [/lembranc|presente|lua de mel/, "redeem"],
  [/alianc|votos|celebrante/, "favorite"],
  [/convidad|\bmesas?\b/, "group"],
  [/document|certid|cartorio|habilitac/, "description"],
  [/\bcontrato\b|assinar/, "contract"],
  [/pagamento|parcela|\bsinal\b/, "payments"],
  [/\blocal\b|espaco|salao|igreja/, "location_on"],
  [/crianca|recreac/, "child_care"],
  [/reuniao|visita|ensaio|\bprova\b/, "event"],
  [/enviar|envio|mandar/, "send"],
];

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

function iconeDe(titulo: string, padrao: string): string {
  const t = semAcento(titulo);
  return ICONES.find(([re]) => re.test(t))?.[1] ?? padrao;
}

/** "11 de outubro" / "1º de outubro" a partir de AAAA-MM-DD. */
function diaDoMes(iso: string): string {
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  return `${d === 1 ? "1º" : d} de ${MESES[m - 1] ?? ""}`;
}

/** Prazo da família, em tempo: "até 21 de outubro", "até hoje", "venceu em 12 de setembro". */
function prazoDe(iso: string, hoje: string): string {
  if (iso === hoje) return "até hoje";
  return iso < hoje ? `venceu em ${diaDoMes(iso)}` : `até ${diaDoMes(iso)}`;
}

/** Meses entre AAAA-MM e AAAA-MM. */
function mesesEntre(a: string, b: string): number {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));
}

/** "16:00:00" → "16h"; "16:30" → "16h30". */
function horaCurta(hora: string | null): string | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hora ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  return m[2] === "00" ? `${h}h` : `${h}h${m[2]}`;
}

/** "5, 11 e 20" */
function listaDeDias(dias: number[]): string {
  const t = dias.map((d) => (d === 1 ? "1º" : String(d)));
  return t.length > 1 ? `${t.slice(0, -1).join(", ")} e ${t[t.length - 1]}` : t[0] ?? "";
}

/**
 * As posições do desenho (0–5) para n nós, espalhadas pela curva inteira:
 * o casamento fica sempre no fim do caminho. Um nó só (o casamento é neste
 * mês) = o fim, com o caminho todo percorrido.
 */
function posicoes(n: number): number[] {
  if (n <= 1) return [MAX_NOS - 1];
  return Array.from({ length: n }, (_, i) => Math.round((i * (MAX_NOS - 1)) / (n - 1)));
}

type Bruto = {
  mes: string;
  /** AAAA-MM-DD, para ordenar */
  data: string;
  /** o título sem o prazo, para não repetir a mesma coisa no mês */
  base: string;
  t: string;
  equipe: boolean;
  icone: string;
  /** o casamento abre o mês dele */
  primeiro: boolean;
};

export function montarLinhaDoTempo(e: EntradaDaLinha): MesDaLinha[] {
  const hoje = e.hoje.slice(0, 10);
  const atual = hoje.slice(0, 7);
  const fim = e.dataEvento.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(fim) || !/^\d{4}-\d{2}$/.test(atual) || fim < atual) return [];

  const brutos: Bruto[] = [];
  const cabe = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso.slice(0, 7) <= fim;
  // o que venceu e continua aberto é de agora
  const mesDe = (iso: string) => (iso.slice(0, 7) < atual ? atual : iso.slice(0, 7));

  // 1) o casamento
  const casal = e.casal;
  brutos.push({
    mes: fim,
    data: e.dataEvento.slice(0, 10),
    base: "#casamento",
    t: casal ? (casal.b ? `O casamento de ${casal.a} e ${casal.b}` : `O casamento de ${casal.a}`) : "O casamento",
    equipe: false,
    icone: "celebration",
    primeiro: true,
  });

  // 2) as tarefas da família (pedidas pela cerimonialista e as próprias)
  for (const t of e.tarefas) {
    if (t.feita || !t.prazo) continue;
    const d = t.prazo.slice(0, 10);
    if (!cabe(d)) continue;
    brutos.push({
      mes: mesDe(d),
      data: d,
      base: t.titulo,
      t: `${t.titulo} · ${prazoDe(d, hoje)}`,
      equipe: false,
      icone: iconeDe(t.titulo, "check_circle"),
      primeiro: false,
    });
  }

  // 3) as decisões da família com prazo
  for (const dc of e.decisoes) {
    if (!dc.prazoPrevisto) continue;
    const d = dc.prazoPrevisto.slice(0, 10);
    if (!cabe(d)) continue;
    brutos.push({
      mes: mesDe(d),
      data: d,
      base: dc.titulo,
      t: `${dc.titulo} · ${prazoDe(d, hoje)}`,
      equipe: false,
      icone: iconeDe(dc.titulo, "check_circle"),
      primeiro: false,
    });
  }

  // 4) os compromissos em que o casal comparece, de hoje em diante. A RPC
  //    monta `data + hora` sem fuso: os 10 primeiros caracteres são o dia.
  for (const c of e.linhaDoTempo) {
    if (c.tipo !== "compromisso" || !c.quando) continue;
    const d = c.quando.slice(0, 10);
    if (d < hoje || !cabe(d)) continue;
    brutos.push({
      mes: d.slice(0, 7),
      data: d,
      base: c.titulo,
      t: `${c.titulo} · ${diaDoMes(d)}`,
      equipe: false,
      icone: iconeDe(c.titulo, "event"),
      primeiro: false,
    });
  }

  // 5) as parcelas em aberto, sem valor: a próxima pelo nome, as outras
  //    juntas por mês ("2 parcelas · 5 e 20 de novembro")
  const porDia = new Map<string, number>();
  for (const p of e.parcelas) {
    if (p.paid || !p.dueDate) continue;
    const d = p.dueDate.slice(0, 10);
    if (d < hoje || !cabe(d)) continue;
    porDia.set(d, (porDia.get(d) ?? 0) + 1);
  }
  const dias = Array.from(porDia.keys()).sort();
  if (dias.length > 0) {
    const [prox, ...resto] = dias;
    const n = porDia.get(prox) ?? 1;
    brutos.push({
      mes: prox.slice(0, 7),
      data: prox,
      base: "#parcela-proxima",
      t: n > 1 ? `Próximas ${n} parcelas · ${diaDoMes(prox)}` : `Próxima parcela · ${diaDoMes(prox)}`,
      equipe: false,
      icone: "savings",
      primeiro: false,
    });
    const porMesP = new Map<string, string[]>();
    for (const d of resto) porMesP.set(d.slice(0, 7), [...(porMesP.get(d.slice(0, 7)) ?? []), d]);
    porMesP.forEach((ds, mes) => {
      const qtd = ds.reduce((s, d) => s + (porDia.get(d) ?? 1), 0);
      const nomeMes = MESES[Number(mes.slice(5, 7)) - 1] ?? "";
      const t =
        qtd === 1
          ? `Parcela · ${diaDoMes(ds[0])}`
          : ds.length <= 3
            ? `${qtd} parcelas · ${listaDeDias(ds.map((d) => Number(d.slice(8, 10))))} de ${nomeMes}`
            : `${qtd} parcelas em ${nomeMes}`;
      brutos.push({ mes, data: ds[0], base: `#parcelas-${mes}`, t, equipe: false, icone: "savings", primeiro: false });
    });
  }

  // 6) o que a cerimonialista conduz (sem data no texto)
  for (const c of e.daCerimonialista) {
    if (c.feito || !c.prazo) continue;
    const d = c.prazo.slice(0, 10);
    if (!cabe(d)) continue;
    brutos.push({
      mes: mesDe(d),
      // o atraso dela não sobe para o topo do mês do casal
      data: d < hoje ? hoje : d,
      base: c.titulo,
      t: c.titulo,
      equipe: true,
      icone: iconeDe(c.titulo, "check_circle"),
      primeiro: false,
    });
  }

  // por mês, sem repetir o mesmo assunto (vale o primeiro: a família antes da equipe)
  const porMes = new Map<string, Bruto[]>();
  const vistos = new Set<string>();
  for (const b of brutos) {
    const k = `${b.mes}|${semAcento(b.base)}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    porMes.set(b.mes, [...(porMes.get(b.mes) ?? []), b]);
  }

  const meio = Array.from(porMes.keys())
    .filter((k) => k > atual && k < fim)
    .sort()
    .slice(0, MAX_NOS - 2);
  const chaves = atual === fim ? [atual] : [atual, ...meio, fim];
  const pos = posicoes(chaves.length);

  const lugar = [e.local, e.cidade].map((s) => s?.trim()).filter(Boolean).join(" · ");
  const hora = horaCurta(e.horaEvento);
  const notaDoDia = lugar && hora ? `${lugar}, às ${hora}.` : lugar ? `${lugar}.` : hora ? `Às ${hora}.` : null;

  return chaves.map((chave, i) => {
    const lista = (porMes.get(chave) ?? []).sort(
      (a, b) =>
        Number(b.primeiro) - Number(a.primeiro) ||
        a.data.localeCompare(b.data) ||
        Number(a.equipe) - Number(b.equipe)
    );
    const m = Number(chave.slice(5, 7));
    const ehFim = chave === fim;
    const nomeCheio = MESES[m - 1] ?? "";
    return {
      chave,
      nome: ABREV[m - 1] ?? "",
      completo: ehFim ? diaDoMes(e.dataEvento.slice(0, 10)) : nomeCheio.charAt(0).toUpperCase() + nomeCheio.slice(1),
      tag: ehFim ? "o grande dia" : i === 0 ? "agora" : mesesEntre(atual, chave) === 1 ? "em 1 mês" : `em ${mesesEntre(atual, chave)} meses`,
      icone: ehFim ? "celebration" : i === 0 ? "favorite" : lista[0]?.icone ?? "event",
      pos: pos[i] ?? 0,
      nota: ehFim ? notaDoDia : null,
      itens: lista.slice(0, MAX_ITENS).map(({ t, equipe, icone }) => ({ t, equipe, icone })),
      mais: Math.max(0, lista.length - MAX_ITENS),
    };
  });
}
