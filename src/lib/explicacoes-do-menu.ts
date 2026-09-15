// O que cada item do menu é, para que serve e como se usa.
//
// Existe porque o sistema abre com quinze itens no menu e nenhuma
// condução: quem nunca viu não tem como saber que "Solicitações" é a
// fila de cobrança do dia e não um pedido de cliente. O `?` ao lado de
// cada item abre uma destas fichas.
//
// REGRAS DE ESCRITA — as mesmas do guia de ajuda, e uma a mais:
//
// 1. Três frases, uma por campo. Ficha que vira parágrafo ninguém lê.
// 2. O caminho de clique por extenso ("Eventos → Novo evento").
// 3. Zero mecânica interna. A pessoa não precisa saber o que é uma RLS,
//    uma migração ou um vínculo.
// 4. Sem linguagem de jogo: nada de desbloquear, missão, nível, parabéns.
// 5. NUNCA estreitar para casamento. É sistema operacional de eventos —
//    quando precisar de exemplo, alternar os tipos.

export type ExplicacaoDoMenu = {
  /** Casa com o `href` do item do menu, em AppShell. */
  href: string;
  oQueE: string;
  paraQue: string;
  comoUsar: string;
};

export const EXPLICACOES_DO_MENU: ExplicacaoDoMenu[] = [
  {
    href: "/eventos/dashboard",
    oQueE:
      "A visão geral da sua operação: quantos eventos estão em andamento, em que pé está cada um e o que vence primeiro.",
    paraQue:
      "Responde “o que precisa de mim hoje” sem você abrir evento por evento.",
    comoUsar:
      "É a tela que abre quando você entra. Clique num evento da lista para ir direto a ele.",
  },
  {
    href: "/eventos",
    oQueE:
      "A lista de todos os seus eventos — casamento, debutante, formatura, corporativo, o que for.",
    paraQue:
      "É daqui que tudo começa: dentro de cada evento ficam o planejamento, os fornecedores, o roteiro do dia e o financeiro dele.",
    comoUsar:
      "Eventos → Novo evento. Ele pergunta o tipo, a cliente e a data, e já nasce com o planejamento e o roteiro daquele tipo.",
  },
  {
    href: "/orcamentos",
    oQueE: "As propostas que você manda antes de o evento existir.",
    paraQue:
      "A cliente abre um link com a sua marca, escolhe o pacote e assina na tela — o aceite chega na hora, sem PDF indo e voltando.",
    comoUsar:
      "Orçamentos → Novo. Monte os itens, defina a validade e envie o link. Quando ela aceitar, um clique vira evento.",
  },
  {
    href: "/clientes",
    oQueE:
      "O cadastro de quem contrata você, com contato e o histórico do que já fez para a mesma pessoa.",
    paraQue:
      "Evita redigitar os mesmos dados a cada evento e guarda com quem você já trabalhou.",
    comoUsar:
      "O cadastro nasce sozinho quando você cria um evento. Entre aqui para corrigir um contato ou ver os eventos daquela cliente.",
  },
  {
    href: "/cerimonialistas",
    oQueE:
      "As pessoas que trabalham com você e entram no sistema com o próprio login.",
    paraQue:
      "Cada uma enxerga só o que é dela: coordenadora vê tudo, cerimonialista vê os eventos em que está escalada, assistente vê a operação do dia e nada de dinheiro.",
    comoUsar:
      "Equipe → Cadastrar. A pessoa entra com o e-mail e a senha dela — o seu login continua sendo só seu.",
  },
  {
    href: "/fornecedores",
    oQueE:
      "Sua agenda de buffet, foto, som, decoração, segurança — com contato, categoria e os valores que já praticaram.",
    paraQue:
      "É daqui que sai o link que o fornecedor abre no celular para confirmar presença, mandar o contrato e ver a parte dele do roteiro.",
    comoUsar:
      "Cadastre uma vez e depois vincule ao evento. O histórico de valores vai se enchendo sozinho, a cada evento.",
  },
  {
    href: "/solicitacoes",
    oQueE:
      "A fila do dia: as mensagens que o sistema já deixou prontas para mandar a fornecedores.",
    paraQue:
      "Quando um prazo chega, a cobrança nasce escrita — você decide enviar, segurar ou cancelar, em vez de lembrar de cada uma.",
    comoUsar:
      "Abra uma vez por dia. O que está pronto para sair aparece no topo.",
  },
  {
    href: "/contratos",
    oQueE: "Os contratos de fornecedor, guardados por evento.",
    paraQue:
      "O fornecedor sobe o arquivo pelo link dele e o contrato cai direto no evento — nada de procurar anexo no WhatsApp na véspera.",
    comoUsar:
      "Entre para conferir o que já chegou e de quem ainda falta.",
  },
  {
    href: "/agenda",
    oQueE: "O marcador de reuniões com fornecedor.",
    paraQue:
      "Acaba com as dez mensagens até achar um horário: você oferece as opções, ele escolhe uma pelo link, e entra na agenda dos dois.",
    comoUsar:
      "Escolha o fornecedor, ofereça os horários e mande o link. Quem não responde no prazo, o sistema cobra.",
  },
  {
    href: "/tarefas",
    oQueE:
      "Tudo o que precisa ser feito, de todos os eventos, numa lista só — o que vence primeiro em cima.",
    paraQue:
      "Boa parte dessas tarefas nasce sozinha quando você decide algo no planejamento do evento. Aqui elas aparecem juntas.",
    comoUsar:
      "Use quando quiser trabalhar por prazo, e não por evento.",
  },
  {
    href: "/calendario",
    oQueE: "O mês na tela, com os eventos e os prazos marcados nos dias.",
    paraQue:
      "Serve para enxergar aperto antes que ele chegue: duas festas no mesmo fim de semana, ou uma semana cheia de vencimento.",
    comoUsar: "Clique num dia para abrir o que está marcado nele.",
  },
  {
    href: "/financeiro",
    oQueE:
      "O dinheiro de todos os eventos junto: o seu honorário e a verba que passa por você para os fornecedores.",
    paraQue:
      "Separados assim, você enxerga a sua receita sem misturar com o dinheiro que é do evento e só passa pela sua mão.",
    comoUsar:
      "Aqui é o consolidado. O lançamento de cada parcela acontece dentro do evento, no Financeiro dele.",
  },
  {
    href: "/catalogo",
    oQueE:
      "Os pacotes, os textos e as fotos que as suas propostas usam, separados por tipo de evento.",
    paraQue:
      "Você escreve uma vez o que oferece em casamento, em debutante, em corporativo — e toda proposta nova já nasce com isso pronto.",
    comoUsar:
      "Entre no tipo de evento e edite. O que você salvar vale para as próximas propostas, não para as já enviadas.",
  },
  {
    href: "/assinatura",
    oQueE:
      "O seu plano: quanto custa, quantos eventos em andamento ele permite e quantas pessoas podem ter login.",
    paraQue:
      "É onde você troca de plano, confere a cobrança e cancela, se quiser.",
    comoUsar:
      "Só a proprietária da conta enxerga esta tela.",
  },
  {
    href: "/configuracoes",
    oQueE: "Os seus dados e os da sua empresa.",
    paraQue:
      "O nome e o WhatsApp daqui são os que a cliente vê no portal dela; a logo e o nome da empresa saem na proposta e no portal — a sua marca na frente da cliente, não a nossa.",
    comoUsar:
      "Vale preencher no primeiro dia. É também aqui que você liga e desliga estas explicações.",
  },
  {
    href: "/ajuda",
    oQueE:
      "As perguntas que aparecem na primeira semana, com a resposta curta e o caminho exato.",
    paraQue: "Serve para você destravar na hora, sem esperar resposta de ninguém.",
    comoUsar: "Tem busca no topo — digite o que você quer fazer.",
  },
];

const PORHREF = new Map(EXPLICACOES_DO_MENU.map((e) => [e.href, e]));

export function explicacaoDe(href: string): ExplicacaoDoMenu | null {
  return PORHREF.get(href) ?? null;
}

// ============================================================
// DENTRO DO EVENTO
// ============================================================
//
// O menu de fora diz onde ficam as coisas; aqui é onde o trabalho
// acontece, e é onde a cerimonialista passa o dia. São duas faixas:
//
//   * as três FASES no topo (Planejamento → Organização → Roteiro do
//     dia), que são o motor do evento;
//   * as ABAS logo abaixo, que são consulta.
//
// A chave não pode ser o endereço: ele carrega o id do evento e muda a
// cada evento. É o segmento da rota, que é estável.

export type ExplicacaoDoEvento = ExplicacaoDoMenu & { chave: string };

const DENTRO_DO_EVENTO: ExplicacaoDoEvento[] = [
  {
    chave: "planejamento",
    href: "",
    oQueE:
      "O método do evento em forma de mapa: cada balão é um objetivo (espaço, buffet, decoração…) e dentro dele ficam as decisões, com prazo e responsável.",
    paraQue:
      "É onde o evento é PENSADO. Boa parte do que você decide aqui vira tarefa com prazo na Organização, sem você digitar de novo.",
    comoUsar:
      "Clique num balão para abrir o painel e trabalhar as decisões dele. A ordem dos balões já é a ordem em que as coisas precisam ser decididas.",
  },
  {
    chave: "organizacao",
    href: "",
    oQueE:
      "A lista do que precisa ser feito neste evento, com prazo e responsável.",
    paraQue:
      "É a execução do que foi decidido no Planejamento — e é aqui que você enxerga o que está atrasado antes de a cliente perguntar.",
    comoUsar:
      "Vá riscando o que terminou. Dá para criar tarefa à mão também, para o que não veio de uma decisão.",
  },
  {
    chave: "roteiro",
    href: "",
    oQueE:
      "A linha do tempo do dia: a hora, o que acontece e quem é o responsável por cada etapa.",
    paraQue:
      "É o que você leva para o dia e o que cada fornecedor vê no link dele. Mudou aqui, mudou no link — não precisa reenviar nada.",
    comoUsar:
      "Monte os itens a partir da hora do evento. Na véspera imprima a prancha; no dia use o Modo Evento, que destaca o que está acontecendo agora.",
  },
  {
    chave: "",
    href: "",
    oQueE:
      "O painel deste evento: o que requer atenção agora, o que já está pronto e os atalhos do que se faz com mais frequência.",
    paraQue:
      "Serve para você retomar o evento depois de uma semana sem abrir, sem ter de caçar em que pé estava.",
    comoUsar: "É a tela que abre quando você entra no evento.",
  },
  {
    chave: "operacao",
    href: "",
    oQueE:
      "O que se conta neste evento: bebida, comida, lembrança — com quantidade, unidade e custo por unidade.",
    paraQue:
      "Fecha o ciclo previ → comprei → entrou → sobrou. O que sobrou vira dinheiro perdido na conta, que é o número que faz mudar a compra do próximo.",
    comoUsar:
      "Lance o previsto e o custo por unidade. A contagem do dia abre sozinha quando a data chega.",
  },
  {
    chave: "rsvp",
    href: "",
    oQueE:
      "A lista de quem foi convidado, quem confirmou e a porta da recepção — tudo deste evento num lugar só.",
    paraQue:
      "É a mesma lista que a cliente vê no portal dela: o que um lado muda, o outro vê. E é daqui que sai o link de quem vai ficar na entrada lendo os QR Codes.",
    comoUsar:
      "Mande o link do evento, ou adicione à mão. Em cada pessoa, o botão do WhatsApp já leva a mensagem pronta: o pedido de confirmação ou o QR de entrada.",
  },
  {
    chave: "mesas",
    href: "",
    oQueE:
      "O croqui do salão: as mesas na tela, com os convidados sentados nelas.",
    paraQue:
      "Resolve o pior da véspera — quem senta com quem — arrastando, em vez de rabiscar planta baixa impressa.",
    comoUsar:
      "Desenhe o salão, crie as mesas e arraste os convidados. Dá para imprimir o mapa pronto.",
  },
  {
    chave: "fornecedores",
    href: "",
    oQueE:
      "Quem está contratado para este evento, por quanto, e em que pé está cada um.",
    paraQue:
      "É daqui que sai o link de cada fornecedor e é aqui que chega a resposta dele: confirmou, recusou ou ainda não respondeu.",
    comoUsar:
      "Vincule um fornecedor já cadastrado. O pedido de confirmação sai sozinho antes do evento — e você pode escolher a data de cada um.",
  },
  {
    chave: "contratos",
    href: "",
    oQueE: "Os contratos deste evento: o de cada fornecedor e, quando a proposta foi aceita, o termo e o contrato da cliente.",
    paraQue:
      "O fornecedor sobe o arquivo pelo link dele e o contrato cai aqui — na véspera você não procura anexo no WhatsApp.",
    comoUsar:
      "Confira o que já chegou. O que falta aparece marcado.",
  },
  {
    chave: "comunicacao",
    href: "",
    oQueE:
      "As conversas deste evento com cada fornecedor, guardadas por evento.",
    paraQue:
      "O combinado fica no evento, e não perdido no seu celular — quem assumir o evento depois lê a mesma história.",
    comoUsar: "Escolha o fornecedor e escreva. Ele responde pelo link dele.",
  },
  {
    chave: "financeiro",
    href: "",
    oQueE:
      "O dinheiro deste evento, em duas contas separadas: o seu honorário e a verba que a cliente paga aos fornecedores.",
    paraQue:
      "Separadas, você vê a SUA receita sem misturar com o dinheiro que só passa pela sua mão — e vê quanto sobrou da verba no fim.",
    comoUsar:
      "Em “Gerar parcelas”, informe o total, a entrada e o número de parcelas: a régua nasce inteira. Marque cada uma quando o dinheiro cair.",
  },
  {
    chave: "area-do-cliente",
    href: "",
    oQueE:
      "O que a cliente enxerga deste evento, e quem tem acesso ao portal dela.",
    paraQue:
      "Ela acompanha o próprio evento com a SUA marca — e para de te perguntar por WhatsApp o que já está na tela dela.",
    comoUsar:
      "Convide pelo e-mail dela. Ela cria a senha e entra. Seu honorário e suas anotações internas nunca aparecem ali.",
  },
  {
    chave: "historico",
    href: "",
    oQueE: "Tudo o que aconteceu neste evento, em ordem de tempo.",
    paraQue:
      "Serve para responder “quando foi que isso mudou, e quem mudou” sem depender de memória.",
    comoUsar: "Só leitura. Role para trás até a data que você procura.",
  },
];

const PORCHAVE = new Map(DENTRO_DO_EVENTO.map((e) => [e.chave, e]));

/**
 * @param chave segmento da rota dentro do evento ("" = Resumo), ou o id
 *              da fase ("planejamento", "organizacao", "roteiro").
 */
export function explicacaoDoEvento(chave: string): ExplicacaoDoMenu | null {
  return PORCHAVE.get(chave) ?? null;
}
