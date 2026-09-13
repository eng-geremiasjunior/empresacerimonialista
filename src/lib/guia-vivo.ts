// O GUIA DO PRIMEIRO ACESSO — os cinco passos.
//
// O modelo é o tutorial do Tibia, e o que se copia dele NÃO é o
// escurecido com o círculo em volta do buraco. É a condução: você cava um
// buraco DE VERDADE, com a pá de verdade, e o passo seguinte só existe
// porque o anterior aconteceu. Não é slideshow dizendo "esta é a sua
// mochila".
//
// Aqui: o guia é o PRIMEIRO EVENTO REAL da agenda dela. No fim ela não
// assistiu a nada — ela tem um evento montado dentro do sistema.
//
// A ORDEM, e por que ela é esta (revisão do dono, 12/09/2026).
//
// A minha primeira proposta mandava pôr um horário no Roteiro do dia no
// primeiro acesso. Ele cortou com um argumento que eu não tinha: a pessoa
// pode estar cadastrando um casamento que acontece daqui a catorze meses,
// e pedir o roteiro logo de cara ensina a coisa ERRADA sobre o produto —
// passa a ideia de que ele serve para a semana da festa. O roteiro saiu
// do caminho obrigatório e vira guia contextual quando o evento chegar
// perto.
//
// O que ficou é a corrente que explica o produto:
//
//     contexto → decisão → consequência → organização → ação
//
// E o passo 4 é o motivo de o guia existir. É onde ela vê que uma decisão
// virou trabalho pronto, com responsável e prazo, sem ela digitar. Todo o
// resto é caminho até ali.

export type PassoDoGuia = {
  id: string;
  /** O fato, em `meu_guia()`, que dá este passo por vencido. */
  fato:
    | "criou_evento"
    | "definiu_contexto"
    | "decidiu"
    | "tarefa_nasceu"
    | "deu_andamento";
  titulo: string;
  /** Fala com ela, sobre o trabalho dela. Nunca sobre a mecânica. */
  texto: string;
  /**
   * `data-guia` do elemento a destacar. O recorte procura por este
   * atributo; se não achar, o cartão aparece sozinho, sem buraco — um
   * passo sem alvo é melhor que um guia que some.
   */
  alvo: string;
  /**
   * Onde o passo acontece. `null` = em qualquer tela (o passo 1 pode ser
   * feito de onde ela estiver). `":id"` é trocado pelo evento do guia.
   */
  rota: string | null;
};

export const PASSOS: PassoDoGuia[] = [
  {
    id: "evento",
    fato: "criou_evento",
    titulo: "Comece por um evento de verdade",
    texto:
      "Pode ser o próximo casamento, 15 anos, formatura ou evento corporativo que você já está organizando. Nada de evento de teste — o que você montar aqui fica.",
    alvo: "novo-evento",
    rota: "/eventos",
  },
  {
    id: "contexto",
    fato: "definiu_contexto",
    titulo: "Diga o tamanho e o feitio do evento",
    texto:
      "Escala e cenário mudam o que o sistema sugere daqui para a frente. Um evento de 80 pessoas e um de 400 não pedem o mesmo trabalho.",
    alvo: "contexto-evento",
    rota: "/eventos/:id/planejamento",
  },
  {
    id: "decisao",
    fato: "decidiu",
    titulo: "Tome uma decisão do evento",
    texto:
      "Abra um objetivo, preencha o que já está definido e marque como decidida. Qualquer uma serve — escolha a que você realmente já resolveu.",
    alvo: "mapa-planejamento",
    rota: "/eventos/:id/planejamento",
  },
  {
    id: "tarefa",
    fato: "tarefa_nasceu",
    titulo: "Veja o que a sua decisão criou",
    texto:
      "A tarefa abaixo nasceu daquela decisão — já com responsável e com prazo, sem você digitar. É isto que o eOrganizei faz: não deixa o que foi decidido virar esquecimento.",
    alvo: "lista-organizacao",
    rota: "/eventos/:id/organizacao",
  },
  {
    id: "andamento",
    fato: "deu_andamento",
    titulo: "Dê o próximo passo nela",
    texto:
      "Mova a tarefa para em andamento, ou marque como concluída se já resolveu. O evento inteiro se mede por isso.",
    alvo: "lista-organizacao",
    rota: "/eventos/:id/organizacao",
  },
];

/** O que `meu_guia()` devolve, já em português e sem `any`. */
export type EstadoDoGuia = {
  dispensadoEm: string | null;
  concluidoEm: string | null;
  eventoId: string | null;
  criouEvento: boolean;
  definiuContexto: boolean;
  decidiu: boolean;
  tarefaNasceu: boolean;
  deuAndamento: boolean;
};

export type GuiaNaTela = {
  passo: PassoDoGuia;
  /** 1-based, só para a linha "passo 2 de 5". */
  numero: number;
  total: number;
  /** Rota onde este passo acontece, com o id do evento resolvido. */
  rota: string | null;
  /** Todos os passos anteriores já vencidos. */
  vencidos: number;
};

function venceu(estado: EstadoDoGuia, fato: PassoDoGuia["fato"]): boolean {
  switch (fato) {
    case "criou_evento":
      return estado.criouEvento;
    case "definiu_contexto":
      return estado.definiuContexto;
    case "decidiu":
      return estado.decidiu;
    case "tarefa_nasceu":
      return estado.tarefaNasceu;
    case "deu_andamento":
      return estado.deuAndamento;
  }
}

/**
 * Qual passo mostrar — ou `null` quando o guia não tem nada a dizer.
 *
 * O passo é o PRIMEIRO ainda não vencido, e não "o próximo do contador".
 * A diferença aparece quando ela faz as coisas fora de ordem: quem criou
 * o evento e já decidiu alguma coisa sem passar pelo guia cai direto no
 * passo do contexto, e não é mandada repetir o que já fez.
 */
export function passoAtual(estado: EstadoDoGuia | null): GuiaNaTela | null {
  if (!estado) return null;
  if (estado.dispensadoEm || estado.concluidoEm) return null;

  const i = PASSOS.findIndex((p) => !venceu(estado, p.fato));
  if (i === -1) return null; // os cinco vencidos: quem chamar deve carimbar

  const passo = PASSOS[i];

  // A rota que pede `:id` sem evento para pôr no lugar vira NULL, não
  // vira "/eventos/:id/planejamento". Eu tinha deixado o texto cru
  // passar, e o cartão ofereceria um "Ir para esta tela" que leva a uma
  // rota inexistente — a prova das 32 combinações pegou isto.
  const precisaDeEvento = passo.rota?.includes(":id") ?? false;
  const rota =
    passo.rota === null
      ? null
      : precisaDeEvento
        ? estado.eventoId
          ? passo.rota.replace(":id", estado.eventoId)
          : null
        : passo.rota;

  return {
    passo,
    numero: i + 1,
    total: PASSOS.length,
    rota,
    vencidos: i,
  };
}

/** Os cinco fatos são verdade: o guia acabou e precisa ser carimbado. */
export function terminou(estado: EstadoDoGuia | null): boolean {
  if (!estado) return false;
  if (estado.dispensadoEm || estado.concluidoEm) return false;
  return PASSOS.every((p) => venceu(estado, p.fato));
}
