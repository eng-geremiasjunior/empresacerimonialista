// Agrupamento por tempo da lista de tarefas da Organização.
//
// Puro e testável. Existe porque a lista tinha um problema que não era
// falta de destaque, e sim excesso: toda tarefa com prazo ganhava a mesma
// caixa de data em ameixa, número 20px negrito. "19/09" e "12/06/2027"
// gritavam no mesmo volume, e quando tudo tem acento o acento não informa
// nada. O próprio globals.css já escreveu a regra certa em comentário:
// "Cor só com função semântica, no menor volume possível."
//
// Aqui a hierarquia sai da POSIÇÃO (a seção diz quando) e o acento passa
// a significar uma coisa só: isto é agora.
//
// Concluída não participa do eixo de tempo. Uma tarefa concluída no prazo
// há dois meses não pode aparecer sob "Atrasadas" — seria mentira. Ela
// desce para o fim, que é onde trabalho terminado pertence.

export type TomGrupo = "atrasada" | "proxima" | "quieta";

export type GrupoTemporal<T> = {
  chave: string;
  titulo: string;
  tom: TomGrupo;
  /** peso do título da tarefa dentro do grupo */
  peso: 600 | 700;
  itens: T[];
};

type ComPrazo = { dueDate: string | null; status: string };

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Distância em dias entre duas datas ISO, sem fuso no meio. */
export function distanciaEmDias(de: string, ate: string): number {
  const [a1, m1, d1] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return Math.round(
    (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000
  );
}

/** "Setembro" no ano corrente; "Junho de 2027" quando o ano muda. */
export function rotuloMes(iso: string, hoje: string): string {
  const [ano, mes] = iso.split("-").map(Number);
  const nome = MESES[mes - 1] ?? iso.slice(0, 7);
  return ano === Number(hoje.slice(0, 4)) ? nome : `${nome} de ${ano}`;
}

export function agruparPorTempo<T extends ComPrazo>(
  tarefas: T[],
  hoje: string
): GrupoTemporal<T>[] {
  const atrasadas: T[] = [];
  const deHoje: T[] = [];
  const amanha: T[] = [];
  const semana: T[] = [];
  const semPrazo: T[] = [];
  const concluidas: T[] = [];
  const meses = new Map<string, T[]>();

  for (const t of tarefas) {
    if (t.status === "concluido") {
      concluidas.push(t);
      continue;
    }
    if (!t.dueDate) {
      semPrazo.push(t);
      continue;
    }
    const d = distanciaEmDias(hoje, t.dueDate);
    if (d < 0) atrasadas.push(t);
    else if (d === 0) deHoje.push(t);
    else if (d === 1) amanha.push(t);
    else if (d <= 7) semana.push(t);
    else {
      const chave = t.dueDate.slice(0, 7);
      const atual = meses.get(chave);
      if (atual) atual.push(t);
      else meses.set(chave, [t]);
    }
  }

  const grupos: GrupoTemporal<T>[] = [];
  const push = (
    chave: string,
    titulo: string,
    tom: TomGrupo,
    peso: 600 | 700,
    itens: T[]
  ) => {
    if (itens.length > 0) grupos.push({ chave, titulo, tom, peso, itens });
  };

  push("atrasadas", "Atrasadas", "atrasada", 700, atrasadas);
  push("hoje", "Hoje", "proxima", 700, deHoje);
  push("amanha", "Amanhã", "proxima", 600, amanha);
  push("semana", "Esta semana", "quieta", 600, semana);

  for (const chave of [...meses.keys()].sort()) {
    push(chave, rotuloMes(`${chave}-01`, hoje), "quieta", 600, meses.get(chave)!);
  }

  push("sem-prazo", "Sem prazo", "quieta", 600, semPrazo);
  push("concluidas", "Concluídas", "quieta", 600, concluidas);

  return grupos;
}
