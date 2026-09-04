// O guia de uso — as perguntas que uma cerimonialista faz na primeira
// semana, com a resposta curta e o caminho exato. É o onboarding do
// eorganizei: quem lê aqui não precisa mandar mensagem perguntando.
//
// Regra de escrita: resposta em 2 a 4 frases, o caminho de clique por
// extenso ("Eventos → Novo evento"), zero mecânica interna do sistema.

export type PerguntaAjuda = {
  id: string;
  pergunta: string;
  resposta: string;
};

export type GrupoAjuda = {
  titulo: string;
  perguntas: PerguntaAjuda[];
};

export const GRUPOS_AJUDA: GrupoAjuda[] = [
  {
    titulo: "Primeiros passos",
    perguntas: [
      {
        id: "meu-nome",
        pergunta: "Onde troco meu nome e meu WhatsApp?",
        resposta:
          "No seu avatar (canto superior direito) → Configurações. O nome e o WhatsApp que você salva ali são os que a cliente vê no portal dela, no \"Falar com\". Vale preencher o WhatsApp logo no primeiro dia.",
      },
      {
        id: "equipe",
        pergunta: "Como cadastro minha equipe?",
        resposta:
          "Em Cerimonialistas → Cadastrar. Cada pessoa entra com o próprio e-mail e senha. Coordenadora enxerga tudo; cerimonialista vê os eventos em que é responsável ou está escalada; assistente vê só a operação dos eventos escalados — nada de financeiro.",
      },
      {
        id: "logo-empresa",
        pergunta: "Onde coloco a logo e o nome da minha empresa?",
        resposta:
          "Em Configurações, na seção da empresa (aparece para a proprietária). A logo e o nome saem na proposta, no PDF e no portal da cliente — é a sua marca na frente do casal, não a do eorganizei.",
      },
    ],
  },
  {
    titulo: "Eventos",
    perguntas: [
      {
        id: "criar-evento",
        pergunta: "Como crio um evento?",
        resposta:
          "Eventos → Novo evento. O caminho completo pergunta o tipo, a cliente, os dados e a configuração — e o evento já nasce com o planejamento, as fases e o roteiro do tipo. Se estiver com pressa, o botão \"Criar evento\" no passo dos dados básicos cria só com o essencial.",
      },
      {
        id: "orcamento-vs-confirmado",
        pergunta: "Qual a diferença entre evento em orçamento e confirmado?",
        resposta:
          "Orçamento é proposta em andamento: o evento existe, mas ainda não é contrato. Confirmado é festa fechada — entra nas contagens, nos lembretes e nas rotinas do dia. Você muda o status na tela de editar o evento.",
      },
      {
        id: "duplicar",
        pergunta: "Atendo eventos parecidos. Dá para duplicar?",
        resposta:
          "Dá — no menu do cartão do evento, Duplicar. Nasce uma cópia com a estrutura (tipo, fases, roteiro) e sem os dados da cliente, para você preencher.",
      },
      {
        id: "evento-acabou",
        pergunta: "O evento acabou. Preciso fazer alguma coisa?",
        resposta:
          "Não — no dia seguinte ele vira \"concluído\" sozinho e sai das rotinas (lembretes, cobranças de confirmação). Se quiser tirar da lista, use Arquivar no cartão do evento.",
      },
    ],
  },
  {
    titulo: "Planejamento",
    perguntas: [
      {
        id: "mapa",
        pergunta: "O que é o mapa do Planejamento?",
        resposta:
          "É o método do evento em forma de mapa: cada balão é um objetivo (espaço, buffet, decoração…) e dentro dele estão as decisões com prazo e responsável. Clique num balão para abrir o painel e trabalhar as decisões — o que você preenche ali vira tarefa, prazo e aviso sozinho.",
      },
      {
        id: "guia-estilo",
        pergunta: "Como monto e envio o guia de estilo?",
        resposta:
          "Dentro do Planejamento, na decisão \"Fazer o briefing de decoração\". Escolha uma paleta para começar, ajuste cores, flores, materiais e as referências da cliente, e toque em \"Mandar o casal ver\". O casal aprova pelo portal — e só depois da aprovação o guia pode ser compartilhado com fornecedor.",
      },
      {
        id: "guia-fornecedor",
        pergunta: "Como o fornecedor recebe o guia de estilo?",
        resposta:
          "Na aba de envio do guia, escolha o fornecedor e quais seções ele vê (cores, flores, materiais…). Sai um link só dele, sem login. Se você mexer no guia depois, o mesmo link mostra a versão nova.",
      },
      {
        id: "escolhas-curadas",
        pergunta: "O que são as escolhas curadas?",
        resposta:
          "É você apresentando 2 a 4 opções prontas para uma decisão (buffet, doces, banda) em vez de encaminhar orçamento solto. O casal escolhe no portal, com os valores e o que está incluso — e a escolha volta para o seu planejamento.",
      },
    ],
  },
  {
    titulo: "Roteiro e o dia do evento",
    perguntas: [
      {
        id: "horarios-roteiro",
        pergunta: "Como o roteiro calcula os horários?",
        resposta:
          "Tudo é medido a partir da hora do evento (a âncora — a cerimônia no casamento, a entrada na debutante). Mudou a hora do evento? Os itens calculados se ajustam sozinhos. Item com horário que você digitou à mão fica onde você deixou.",
      },
      {
        id: "roteiro-fornecedor",
        pergunta: "Como mando o roteiro para um fornecedor?",
        resposta:
          "Na tela do Roteiro, gere o link do fornecedor — ele abre no celular, sem login, e mostra só os itens daquele fornecedor, com \"Como chegar\" e chat. Se o roteiro mudar, o link já mostra a mudança; não precisa reenviar.",
      },
      {
        id: "prancha",
        pergunta: "Como imprimo a prancha do dia?",
        resposta:
          "No Roteiro, botão Imprimir. Sai a folha do dia em A4 — roteiro com horário, fornecedor e telefone, mais o checklist por bloco — para levar na prancha e riscar à caneta.",
      },
      {
        id: "checklist-dia",
        pergunta: "O que é o checklist do dia?",
        resposta:
          "A lista do que conferir em cada bloco do dia: montagem, cerimônia, recepção e desmontagem. Você ajusta antes (no Cronograma) e risca no dia pelo Modo Evento — fica registrado quem conferiu cada item.",
      },
      {
        id: "modo-evento",
        pergunta: "O que é o Modo Evento?",
        resposta:
          "A tela do celular para o dia da festa: o item atual do roteiro em destaque, o checklist por bloco para riscar e o essencial à mão. Abra pelo evento no dia — e imprima a prancha na véspera, que papel não fica sem sinal.",
      },
    ],
  },
  {
    titulo: "Financeiro",
    perguntas: [
      {
        id: "gerar-parcelas",
        pergunta: "Fechei o contrato. Como lanço as parcelas?",
        resposta:
          "No Financeiro do evento, \"Gerar parcelas\": informe o total, a entrada e o número de parcelas, e a régua nasce inteira — entrada marcada como paga, parcelas com vencimento. Cada parcela você marca como paga quando o dinheiro cair.",
      },
      {
        id: "duas-contas",
        pergunta: "Qual a diferença entre assessoria e fornecedores no Financeiro?",
        resposta:
          "Assessoria é o seu honorário — o que a cliente paga a você. Fornecedores é a verba do evento — o que se negocia e paga a cada fornecedor. Separadas, você enxerga sua receita sem misturar com o dinheiro que só passa por você.",
      },
      {
        id: "comprovante",
        pergunta: "Como guardo o comprovante de um pagamento?",
        resposta:
          "Abra o lançamento e anexe o arquivo (foto ou PDF). Ele fica guardado no próprio lançamento — na prestação de contas, está tudo no lugar.",
      },
      {
        id: "fechamento",
        pergunta: "O que é o fechamento do evento?",
        resposta:
          "Depois da festa, o Financeiro do evento mostra o painel de fechamento: o que entrou, o que saiu, o que sobrou da verba e para onde foi a sobra. É a fotografia final — fechou, está prestado conta.",
      },
    ],
  },
  {
    titulo: "Portal da cliente",
    perguntas: [
      {
        id: "acesso-cliente",
        pergunta: "Como dou acesso à cliente ao portal dela?",
        resposta:
          "No evento, aba Área do cliente → convidar. Ela recebe o convite por e-mail, cria a senha e entra no portal — a área dela, com a sua marca.",
      },
      {
        id: "o-que-cliente-ve",
        pergunta: "O que a cliente vê e o que ela pode mexer?",
        resposta:
          "Ela vê o guia de estilo, as escolhas, os convidados, o cortejo, a linha do tempo e o investimento. Ela escreve o que é dela: convidados, referências de estilo, cortejo, respostas do planejamento. O que é seu — roteiro, financeiro, método — ela só acompanha.",
      },
      {
        id: "link-convidados",
        pergunta: "Como funciona o link de confirmação dos convidados?",
        resposta:
          "Cada evento tem um link único que a cliente espalha no WhatsApp — cada convidado se cadastra e confirma sozinho, e a lista cresce sem ninguém digitar. Dá para encerrar as confirmações quando a lista fechar, e programar o lembrete automático para quem não respondeu.",
      },
      {
        id: "cliente-financeiro",
        pergunta: "A cliente vê o meu financeiro?",
        resposta:
          "Não. No Investimento ela vê o contratado com fornecedores, o que já foi pago e as parcelas com vencimento — sempre só leitura. Seus honorários nunca aparecem para ela.",
      },
    ],
  },
  {
    titulo: "Fornecedores",
    perguntas: [
      {
        id: "confirmar-fornecedor",
        pergunta: "Como peço confirmação de presença a um fornecedor?",
        resposta:
          "O sistema faz sozinho: dias antes do evento (você escolhe quantos), cada fornecedor vinculado recebe o pedido com um link para confirmar ou recusar. A resposta aparece para você — e quem não respondeu fica marcado.",
      },
      {
        id: "contrato-fornecedor",
        pergunta: "Como o fornecedor me manda o contrato assinado?",
        resposta:
          "Pela central dele: cada fornecedor tem um link fixo com as pendências que você abriu — confirmar presença, mandar contrato, propor horário. O contrato que ele sobe cai direto no evento, sem WhatsApp no meio.",
      },
      {
        id: "agendar-fornecedor",
        pergunta: "Como marco reunião com fornecedor sem trocar dez mensagens?",
        resposta:
          "Pela Agenda de Fornecedores: você oferece os horários, ele escolhe um pelo link e o compromisso entra para os dois. Quem não responde no prazo, o sistema cobra.",
      },
    ],
  },
  {
    titulo: "Orçamentos e proposta",
    perguntas: [
      {
        id: "mandar-proposta",
        pergunta: "Como mando uma proposta para um casal?",
        resposta:
          "Em Orçamentos → Novo: monte os itens e os pacotes e envie o link. O casal abre uma página com a sua marca, escolhe o pacote, ajusta os extras e assina na tela — você recebe o aceite na hora.",
      },
      {
        id: "proposta-aceita",
        pergunta: "O casal aceitou a proposta. E agora?",
        resposta:
          "Na lista de Orçamentos a proposta aparece aprovada, com o resumo do aceite. Um clique em \"Criar evento\" transforma a proposta no evento, já com cliente, valores e o planejamento do tipo.",
      },
      {
        id: "validade-proposta",
        pergunta: "Proposta tem validade?",
        resposta:
          "Tem — você define os dias ao montar. Vencida, o casal ainda abre o link, mas vê que o prazo passou e o botão de aceitar sai de cena. A lista mostra quais estão vencendo para você renovar antes.",
      },
    ],
  },
];

/** Busca simples, sem acento e sem caixa — roda no navegador. */
export function normalizarBusca(s: string): string {
  // ̀-ͯ por código, nunca como caractere literal: o literal já
  // quebrou uma vez (o editor normaliza e o range vira outra coisa).
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filtrarAjuda(
  grupos: GrupoAjuda[],
  termo: string
): GrupoAjuda[] {
  const t = normalizarBusca(termo.trim());
  if (!t) return grupos;
  return grupos
    .map((g) => ({
      ...g,
      perguntas: g.perguntas.filter((p) =>
        normalizarBusca(`${p.pergunta} ${p.resposta}`).includes(t)
      ),
    }))
    .filter((g) => g.perguntas.length > 0);
}
