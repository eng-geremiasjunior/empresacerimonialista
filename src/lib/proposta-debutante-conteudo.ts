// Copy autoral do template de debutante, transcrita do handoff em
// design/template-2 debbut/design_handoff_proposta_karina_dries.
//
// Fica fixa pelo mesmo motivo do template de casamento: é o texto do
// template, não dado da empresa. O que a cerimonialista edita (pacotes,
// extras, processo, fotos, depoimentos, regra de convidados) vem do banco
// por tipo de evento e tem prioridade — ver [[proposta-conteudo]].

export const NAV_DEBUTANTE = [
  { id: "hero", num: "01", label: "APRESENTAÇÃO" },
  { id: "cuidados", num: "02", label: "COMO CUIDAMOS" },
  { id: "processo", num: "03", label: "PROCESSO" },
  { id: "galeria", num: "04", label: "EXCELÊNCIA" },
  { id: "investimento", num: "05", label: "INVESTIMENTO" },
  { id: "depoimentos", num: "06", label: "DEPOIMENTOS" },
];

// Sem SLA numérico aqui. "Resposta em até 2h" e "roteiro de 8 páginas"
// eram contrato: saíam assinados pela cerimonialista, numa proposta para
// uma cliente de verdade, sem que ela jamais tivesse prometido nenhum dos
// dois. Mesma razão que esvaziou DEPOIMENTOS_DEBUTANTE_PADRAO. O que ela
// PODE comprovar tem lugar próprio: os stats do Catálogo.
export const CUIDADOS_PADRAO = [
  {
    icone: "📅",
    titulo: "PLANEJAMENTO",
    descricao: "Cronograma reverso e controle financeiro milimétrico.",
  },
  {
    icone: "💎",
    titulo: "FORNECEDORES",
    descricao: "Fornecedores que já conhecemos + contratos conferidos.",
  },
  {
    icone: "📋",
    titulo: "COORDENAÇÃO",
    descricao: "Roteiro do dia minuto a minuto, alinhado com cada fornecedor.",
  },
  {
    icone: "♡",
    titulo: "ACOMPANHAMENTO",
    descricao: "Canal direto com a gente durante toda a preparação.",
  },
  {
    icone: "★",
    titulo: "TRANQUILIDADE",
    descricao: "Sua única tarefa é brilhar.",
  },
];

// Mesmo shape de EtapaPublica: o componente escolhe entre o que veio do
// banco e este fallback, e os dois precisam ter as mesmas chaves.
export const PROCESSO_DEBUTANTE_PADRAO: {
  titulo: string;
  descricao: string | null;
  texto_longo?: string | null;
}[] = [
  {
    titulo: "CONEXÃO",
    descricao:
      "Primeiro encontro para entender o sonho da debutante e da família.",
  },
  {
    titulo: "PLANEJAMENTO",
    descricao: "Criamos conceito, orçamento mestre e cronograma reverso.",
  },
  {
    titulo: "PREPARATIVOS",
    descricao: "Fornecedores, provas de vestido, convites e detalhes.",
  },
  { titulo: "ALINHAMENTOS", descricao: "Reuniões finais e ensaio técnico." },
  { titulo: "O GRANDE DIA", descricao: "Você vive. Nós garantimos a magia." },
];

// VAZIO DE PROPÓSITO. Depoimento inventado é depoimento falso: sai
// assinado por uma família que nunca existiu, numa proposta que a
// cerimonialista manda para uma cliente de verdade. Quando ela cadastrar
// os dela no Catálogo, eles aparecem; até lá a seção não existe — o mesmo
// que DEPOIMENTOS_CLASSICO já fazia.
export const DEPOIMENTOS_DEBUTANTE_PADRAO: {
  texto: string;
  autor: string;
  contexto: string | null;
}[] = [];

export const SELOS_CONFIANCA = [
  { icone: "🛡️", texto: "Contrato por escrito" },
  { icone: "🕐", texto: "Canal direto" },
  { icone: "✓", texto: "Sem surpresas" },
];

export const FECHAMENTO_DEBUTANTE = {
  linha1: "Os 15 anos acontecem uma vez.",
  linha2: "Nossa missão é eternizá-los.",
};
