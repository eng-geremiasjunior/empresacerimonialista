// A lista do que o sistema faz — a mesma nos três planos.
//
// POR QUE ELA VIVE AQUI, e não escrita à mão em cada tela: ela aparece
// três vezes na página de preços (uma por plano), aparece de novo na
// página de vendas, e vai aparecer no material do anúncio. Uma cópia por
// lugar é a receita para a página dizer uma coisa e o produto fazer
// outra — que é o defeito mais caro que uma página de vendas pode ter.
//
// A REGRA DE ENTRADA: só entra o que está no ar. Nada de "em breve",
// nada de nome bonito para coisa que ainda não existe. Cada linha abaixo
// corresponde a uma tela que a assinante abre hoje.
//
// A ordem é a do trabalho dela, do primeiro contato ao dia seguinte da
// festa — não a ordem do menu, e não a ordem de importância para nós.

export type RecursoDoSistema = {
  /** O nome curto, do jeito que aparece no cartão do plano. */
  nome: string;
  /** Uma linha que diz o que é, para a lista detalhada. */
  descricao: string;
};

export const RECURSOS_DO_SISTEMA: RecursoDoSistema[] = [
  {
    nome: "Briefing da cliente",
    descricao:
      "Cole a conversa que você já teve. O sistema identifica tipo de evento, data, horário, local, cidade, convidados e orçamento, e monta o evento a partir daí.",
  },
  {
    nome: "Eventos e clientes",
    descricao:
      "Todos os eventos em um lugar, com as informações, as decisões e o histórico de cada cliente.",
  },
  {
    nome: "Planejamento por tipo de evento",
    descricao:
      "Casamento, debutante, formatura, corporativo e show têm decisões próprias, na ordem em que precisam ser tomadas — com prazo contado a partir da data da festa.",
  },
  {
    nome: "Mapa mental do evento",
    descricao:
      "O evento inteiro numa olhada: cada objetivo em volta, quanto já foi decidido e quanto está previsto de verba.",
  },
  {
    nome: "Orçamentos e propostas",
    descricao:
      "Seis modelos de proposta prontos, com o preço vindo do seu catálogo, aceite na tela pela cliente e recibo.",
  },
  {
    nome: "Catálogo de serviços",
    descricao: "Seus pacotes, valores e condições cadastrados uma vez e usados em toda proposta.",
  },
  {
    nome: "Fornecedores",
    descricao:
      "Cadastro por categoria, com o histórico de quanto cada um cobrou em cada evento — você pede orçamento sabendo o preço da última vez.",
  },
  {
    nome: "Solicitação de orçamento",
    descricao:
      "A solicitação sai com o serviço e a quantidade que o evento já exige, e a resposta do fornecedor volta para dentro do evento: confirmado, aguardando ou recusado.",
  },
  {
    nome: "Contratos em PDF",
    descricao:
      "O sistema lê o contrato do fornecedor e traz parcelas, quantidades e horários sem você digitar nada.",
  },
  {
    nome: "Agenda de fornecedores",
    descricao: "O fornecedor escolhe o horário pelo link, e a visita entra na sua agenda.",
  },
  {
    nome: "Financeiro por evento",
    descricao:
      "Receita, custos, parcelas e resultado. Quanto o evento custou de verdade e quanto sobrou para você.",
  },
  {
    nome: "Financeiro da empresa",
    descricao: "Receitas e despesas do negócio, mês a mês, além do que é de cada evento.",
  },
  {
    nome: "Tarefas e calendário",
    descricao: "As tarefas nascem das decisões, com prazo e responsável, e caem no calendário.",
  },
  {
    nome: "Roteiro do dia",
    descricao:
      "O cronograma montado a partir dos horários dos contratos. Cada fornecedor recebe um link só com a parte dele, que se atualiza sozinho quando o horário muda — sem instalar nada e sem senha.",
  },
  {
    nome: "Modo Evento",
    descricao: "No dia, a tela mostra o que é agora e o que vem depois, legível no escuro do salão.",
  },
  {
    nome: "Croqui do salão",
    descricao:
      "O salão desenhado em escala, com as mesas e as cadeiras no lugar. O sistema avisa quando duas mesas se encostam ou uma bloqueia a saída.",
  },
  {
    nome: "Convidados e confirmação",
    descricao: "Lista de convidados, convite com confirmação de presença e acompanhamento por evento.",
  },
  {
    nome: "Recepção por QR Code",
    descricao: "A chegada é registrada na portaria pelo celular. Quando o buffet perguntar quantos entraram, o número é número.",
  },
  {
    nome: "Portal da Cliente",
    descricao:
      "Ela entra com o acesso dela e vê o que é dela: contratado, cronograma, escolhas que faltam, quanto já pagou, o que vence e a prestação de contas.",
  },
  {
    nome: "Site do casamento",
    descricao: "Um site para o casal, com as informações do dia, montado a partir do que já está no evento.",
  },
  {
    nome: "Equipe",
    descricao: "Cada pessoa da sua equipe com o próprio acesso, vendo a mesma informação que você.",
  },
  {
    nome: "Copiloto",
    descricao:
      "O que merece atenção hoje, em números: fornecedor que não respondeu, parcela que vence, lista atrasada.",
  },
];

/** Só os nomes, para o cartão do plano. */
export const NOMES_DOS_RECURSOS = RECURSOS_DO_SISTEMA.map((r) => r.nome);
