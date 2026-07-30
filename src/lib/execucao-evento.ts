// Execução do evento — visão em raias (paralelismo por fornecedor).
//
// Regras transcritas de design/Cronograma/design_handoff_cronograma_paralelo
// (README.md + LOGICA.md). Tudo aqui é função pura: a tela só posiciona.
//
// Diferenças conscientes em relação ao protótipo:
//  * a raia é o FORNECEDOR do item, não uma "equipe" nova — é o dado que
//    já existe, e o choque ("o mesmo fornecedor em dois lugares ao mesmo
//    tempo") é exatamente o problema real do dia;
//  * a janela do dia sai dos próprios itens, não do 13:00–23:00 fixo do
//    protótipo: evento nenhum cabe numa janela cravada;
//  * o atraso é gravado no banco (o fornecedor precisa ver), então aqui
//    não existe mapa de `delays` em memória — o horário do item já é o
//    efetivo, e `time_original` guarda o combinado.

import { timeToMinutes, type CronogramaItem } from "@/lib/cronograma";

// Os campos de dependência já vivem em CronogramaItem desde a 062; o
// alias existe para deixar claro, na assinatura das funções, que estas
// regras são da execução do evento.
export type ItemExecucao = CronogramaItem;

export const SEM_FORNECEDOR = "__sem_fornecedor__";
export const ROTULO_SEM_FORNECEDOR = "Equipe da casa";

// Duração padrão de quem não informou: sem isso o bloco não teria altura
// e o choque não teria intervalo para comparar.
export const DURACAO_PADRAO_MIN = 30;

export function inicioMin(i: ItemExecucao): number | null {
  return timeToMinutes(i.time);
}

export function fimMin(i: ItemExecucao): number | null {
  const ini = inicioMin(i);
  if (ini === null) return null;
  return ini + (i.duracao_minutos ?? DURACAO_PADRAO_MIN);
}

export function formatarMin(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Dois intervalos se sobrepõem quando um começa antes de o outro acabar.
// Encostar (fim == início) não é sobreposição.
export function sobrepoe(a: ItemExecucao, b: ItemExecucao): boolean {
  const ai = inicioMin(a), af = fimMin(a);
  const bi = inicioMin(b), bf = fimMin(b);
  if (ai === null || af === null || bi === null || bf === null) return false;
  return ai < bf && bi < af;
}

// ---------------------------------------------------------------------
// Janela do dia
// ---------------------------------------------------------------------
// Deriva do menor início e do maior fim, arredondando para a hora cheia e
// com uma folga de 1h de cada lado para os blocos não colarem na borda.
export function janelaDoDia(itens: ItemExecucao[]): { inicio: number; fim: number } {
  const inicios = itens.map(inicioMin).filter((v): v is number => v !== null);
  const fins = itens.map(fimMin).filter((v): v is number => v !== null);
  if (inicios.length === 0) return { inicio: 8 * 60, fim: 20 * 60 };

  const menor = Math.min(...inicios);
  const maior = Math.max(...fins);
  const inicio = Math.max(0, Math.floor(menor / 60) * 60 - 60);
  const fim = Math.min(24 * 60, Math.ceil(maior / 60) * 60 + 60);
  // Garante pelo menos 4h de janela, senão a timeline fica achatada.
  return fim - inicio < 240 ? { inicio, fim: inicio + 240 } : { inicio, fim };
}

// ---------------------------------------------------------------------
// Raias
// ---------------------------------------------------------------------
export type Raia = {
  chave: string;
  nome: string;
  itens: ItemExecucao[];
};

export function agruparEmRaias(itens: ItemExecucao[]): Raia[] {
  const mapa = new Map<string, Raia>();
  for (const i of itens) {
    const chave = i.supplier_id ?? SEM_FORNECEDOR;
    const nome = i.supplier_name ?? ROTULO_SEM_FORNECEDOR;
    if (!mapa.has(chave)) mapa.set(chave, { chave, nome, itens: [] });
    mapa.get(chave)!.itens.push(i);
  }
  // "Equipe da casa" por último: as raias de fornecedor são as que a
  // cerimonialista acompanha de perto.
  return [...mapa.values()].sort((a, b) => {
    if (a.chave === SEM_FORNECEDOR) return 1;
    if (b.chave === SEM_FORNECEDOR) return -1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

// ---------------------------------------------------------------------
// Choque: o mesmo fornecedor em dois itens ao mesmo tempo
// ---------------------------------------------------------------------
export function idsEmChoque(itens: ItemExecucao[]): Set<string> {
  const out = new Set<string>();
  for (const raia of agruparEmRaias(itens)) {
    // Sem fornecedor não é choque: são pessoas diferentes da casa.
    if (raia.chave === SEM_FORNECEDOR) continue;
    for (const a of raia.itens) {
      for (const b of raia.itens) {
        if (a.id !== b.id && sobrepoe(a, b)) {
          out.add(a.id);
          out.add(b.id);
        }
      }
    }
  }
  return out;
}

export function raiasEmChoque(itens: ItemExecucao[]): { nome: string; quantos: number }[] {
  const choque = idsEmChoque(itens);
  return agruparEmRaias(itens)
    .map((r) => ({
      nome: r.nome,
      quantos: r.itens.filter((i) => choque.has(i.id)).length,
    }))
    .filter((r) => r.quantos > 0);
}

// Itens de OUTRAS raias que acontecem junto — a lista usa para o badge
// "Simultânea", que não é problema, é só informação.
export function simultaneos(item: ItemExecucao, itens: ItemExecucao[]): ItemExecucao[] {
  return itens.filter((o) => o.id !== item.id && sobrepoe(o, item));
}

// ---------------------------------------------------------------------
// Empacotamento em sub-colunas (dentro de uma raia)
// ---------------------------------------------------------------------
// Dois itens do mesmo fornecedor que se sobrepõem não podem ocupar a raia
// inteira, senão um cobre o outro. Cada um vai para a primeira sub-coluna
// livre e se estica pelas colunas vazias à direita.
export type Posicao = {
  item: ItemExecucao;
  coluna: number;
  span: number;
  colunas: number;
  /** true quando o bloco não ocupa a raia toda: a tela compacta o conteúdo. */
  estreito: boolean;
};

export function empacotarRaia(itensDaRaia: ItemExecucao[]): Posicao[] {
  const ordenados = [...itensDaRaia].sort(
    (a, b) => (inicioMin(a) ?? 0) - (inicioMin(b) ?? 0)
  );

  const colunas: ItemExecucao[][] = [];
  const colunaDe = new Map<string, number>();

  for (const item of ordenados) {
    let alvo = colunas.findIndex((col) => col.every((o) => !sobrepoe(o, item)));
    if (alvo === -1) {
      colunas.push([]);
      alvo = colunas.length - 1;
    }
    colunas[alvo].push(item);
    colunaDe.set(item.id, alvo);
  }

  const total = Math.max(1, colunas.length);

  return ordenados.map((item) => {
    const coluna = colunaDe.get(item.id) ?? 0;
    let span = 1;
    for (let c = coluna + 1; c < total; c++) {
      const ocupada = colunas[c]?.some((o) => sobrepoe(o, item));
      if (ocupada) break;
      span++;
    }
    return { item, coluna, span, colunas: total, estreito: span < total };
  });
}

// ---------------------------------------------------------------------
// Atraso em cascata
// ---------------------------------------------------------------------
export type ImpactoAtraso = {
  id: string;
  titulo: string;
  fornecedor: string;
  de: string;
  para: string;
};

// Quem é empurrado por um atraso neste item: só dependentes DURA, em
// cascata. SUAVE nunca empurra — é "ideal terminar antes", não obrigação.
// O conjunto de visitados evita laço infinito se alguém montar um ciclo.
export function cadeiaDura(
  itemId: string,
  itens: ItemExecucao[],
  minutos: number
): ImpactoAtraso[] {
  const out: ImpactoAtraso[] = [];
  const vistos = new Set<string>([itemId]);
  const fila = [itemId];

  while (fila.length > 0) {
    const atual = fila.shift()!;
    for (const i of itens) {
      if (i.depende_de !== atual) continue;
      if (i.tipo_dependencia !== "dura") continue;
      if (vistos.has(i.id)) continue;
      vistos.add(i.id);

      const ini = inicioMin(i);
      if (ini !== null) {
        out.push({
          id: i.id,
          titulo: i.title,
          fornecedor: i.supplier_name ?? ROTULO_SEM_FORNECEDOR,
          de: formatarMin(ini),
          para: formatarMin(ini + minutos),
        });
      }
      fila.push(i.id);
    }
  }
  return out;
}

// ---------------------------------------------------------------------
// Status pelo relógio
// ---------------------------------------------------------------------
export type SituacaoTempo = "concluido" | "agora" | "pendente";

export function situacaoPorHorario(i: ItemExecucao, agoraMin: number): SituacaoTempo {
  const ini = inicioMin(i), fim = fimMin(i);
  if (ini === null || fim === null) return "pendente";
  if (fim <= agoraMin) return "concluido";
  if (ini <= agoraMin) return "agora";
  return "pendente";
}

// "era HH:MM" — só quando o item foi de fato adiado.
export function horarioOriginal(i: ItemExecucao): string | null {
  if (!i.time_original) return null;
  const original = timeToMinutes(i.time_original);
  const atual = inicioMin(i);
  if (original === null || atual === null || original === atual) return null;
  return formatarMin(original);
}
