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
    | "deu_andamento"
    | "tem_convidado"
    | "tem_tarefa"
    | "tem_fornecedor"
    | "tem_responsavel"
    | "copiou_link";
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

// O CAMINHO DO EVENTO SEM MÉTODO.
//
// Medido em 13/09/2026, com a primeira cliente de verdade: nenhum
// aniversário, bodas, batizado, formatura ou chá revelação do sistema
// nasceu com Planejamento — o método de decisões só existe para
// casamento, 15 anos, corporativo e show (o dono confirmou: "aniversário
// não tem método"). A cliente criou um aniversário, e o guia de cinco
// passos a mandaria dizer escala e cenário num Planejamento vazio: beco
// sem saída, cuja única porta era "Pular" — que desliga o guia para
// sempre.
//
// Nesses eventos o guia percorre o que EXISTE neles: a lista de
// convidados e a primeira tarefa. O passo 1 é o mesmo.
export const PASSOS_SEM_METODO: PassoDoGuia[] = [
  PASSOS[0],
  {
    id: "convidados",
    fato: "tem_convidado",
    titulo: "Monte a lista de convidados",
    texto:
      "Mande o convite no WhatsApp e cada pessoa confirma sozinha — ou adicione à mão quem você já sabe. É a mesma lista que a sua cliente vê no portal dela.",
    alvo: "convidados-rsvp",
    rota: "/eventos/:id/rsvp",
  },
  {
    id: "primeira-tarefa",
    fato: "tem_tarefa",
    titulo: "Anote a primeira tarefa do evento",
    texto:
      "O que precisa ser resolvido e até quando. A tarefa ganha prazo e responsável, e aparece para você no dia certo — sem depender de memória.",
    alvo: "nova-tarefa",
    rota: "/eventos/:id/organizacao",
  },
];

// O CAMINHO DA RETA FINAL.
//
// Medido em 12–16/09/2026, com as primeiras contas vindas de anúncio: quem
// chega com um evento daqui a dez dias não está planejando — as decisões
// foram tomadas há meses. O caminho do método pedia escala, cenário e uma
// decisão; ela via o pedido de refazer o que já está feito e pulava. Das
// sete, cinco pularam, e nenhuma voltou.
//
// Para esse evento, o que o sistema resolve HOJE é o dia: quem faz o quê,
// a que horas, e o fornecedor sabendo disso sem uma mensagem por pessoa.
// O dono tinha tirado o roteiro do começo do guia por um motivo certo — o
// casamento de catorze meses não precisa dele agora. A regra continua: o
// roteiro só entra quando o evento está PERTO.
//
// O último passo não tem rastro no banco: copiar o link é um gesto do
// navegador. O botão de copiar avisa o guia (EVENTO_LINK_COPIADO), e o
// guia se carimba como concluído.
export const RETA_FINAL_DIAS = 45;

/** Disparado no `window` quando ela copia o link de um fornecedor. */
export const EVENTO_LINK_COPIADO = "eorg:link-do-fornecedor-copiado";

export const PASSOS_RETA_FINAL: PassoDoGuia[] = [
  PASSOS[0],
  {
    id: "fornecedores",
    fato: "tem_fornecedor",
    titulo: "Traga os fornecedores deste evento",
    texto:
      "Buffet, DJ, fotografia: vincule quem já está contratado. É com eles que o dia do evento acontece.",
    alvo: "adicionar-fornecedor",
    rota: "/eventos/:id/fornecedores",
  },
  {
    id: "responsavel",
    fato: "tem_responsavel",
    titulo: "Diga quem faz cada horário",
    texto:
      "Crie um item do roteiro — ou abra um que já está lá — e escolha o fornecedor responsável. Cada um passa a ter a parte dele do dia.",
    alvo: "novo-item-roteiro",
    rota: "/eventos/:id/roteiro",
  },
  {
    id: "link",
    fato: "copiou_link",
    titulo: "Mande o roteiro para o fornecedor",
    texto:
      "Copie o link e cole no WhatsApp dele. Ele vê só os horários dele, no celular, sem baixar nada — e o que você mudar aqui, o link já mostra.",
    alvo: "links-fornecedores",
    rota: "/eventos/:id/roteiro",
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
  /** o evento do guia nasceu com Planejamento (tem objetivos)? */
  temMetodo: boolean;
  temConvidado: boolean;
  temTarefa: boolean;
  /** dias até a data do evento do guia (negativo = já passou; null = sem data) */
  diasAteOEvento: number | null;
  /** há fornecedor vinculado ao evento do guia? */
  temFornecedor: boolean;
  /** algum item do roteiro tem fornecedor responsável? */
  temResponsavel: boolean;
};

/** Os passos que valem para ESTE evento. Antes de existir evento, o
 *  caminho completo — o passo 1 é igual nos três. */
export function passosDoEvento(estado: EstadoDoGuia): PassoDoGuia[] {
  if (!estado.criouEvento) return PASSOS;
  const d = estado.diasAteOEvento;
  if (d !== null && d >= 0 && d <= RETA_FINAL_DIAS) return PASSOS_RETA_FINAL;
  return estado.temMetodo ? PASSOS : PASSOS_SEM_METODO;
}

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
    case "tem_convidado":
      return estado.temConvidado;
    case "tem_tarefa":
      return estado.temTarefa;
    case "tem_fornecedor":
      return estado.temFornecedor;
    case "tem_responsavel":
      return estado.temResponsavel;
    // só o navegador sabe; quem fecha este passo é o GuiaVivo
    case "copiou_link":
      return false;
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

  const passos = passosDoEvento(estado);
  const i = passos.findIndex((p) => !venceu(estado, p.fato));
  if (i === -1) return null; // todos vencidos: quem chamar deve carimbar

  const passo = passos[i];

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
    total: passos.length,
    rota,
    vencidos: i,
  };
}

/** Todos os fatos do caminho deste evento são verdade: carimbar. */
export function terminou(estado: EstadoDoGuia | null): boolean {
  if (!estado) return false;
  if (estado.dispensadoEm || estado.concluidoEm) return false;
  return passosDoEvento(estado).every((p) => venceu(estado, p.fato));
}
