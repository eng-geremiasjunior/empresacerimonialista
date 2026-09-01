// O gate de saída do assistente — a última porta antes do provedor.
//
// Primeira camada (assistente-evento.ts): o contexto NÃO BUSCA dado
// pessoal — nome e contato da cliente, telefone de fornecedor, descrição
// de lançamento. O que não é buscado não vaza.
//
// Esta é a segunda camada, para o que escapa da primeira: contato
// digitado em texto livre (título de tarefa "ligar p/ buffet 33 9...",
// campo de decisão, local de compromisso). Redige em vez de bloquear:
// a pergunta dela continua respondível, o número não sai do servidor.
//
// Módulo PURO (sem I/O) — a bateria de conferência roda sem servidor.

export type RedacaoSaida = { texto: string; redigidos: number };

// A ordem importa: os padrões pontuados (e-mail, CPF, CNPJ, telefone com
// máscara) vêm antes da rede final de dígitos crus.
const PADROES: RegExp[] = [
  // e-mail
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  // CPF e CNPJ pontuados
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
  /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
  // telefone com DDD entre parênteses: (33) 99999-0000, (33) 3271-0000
  /\(\d{2}\)\s?9?\d{4}[-\s]?\d{4}\b/g,
  // celular com o 9 na frente, com ou sem DDD/+55: 33 99999-0000, 99999-0000
  /\b(?:\+?55\s?)?\d{0,2}\s?9\d{4}-\d{4}\b/g,
  // rede final: 10-11 dígitos corridos (telefone ou CPF sem máscara).
  // Dinheiro, data e hora nunca têm 10+ dígitos contíguos.
  /\b\d{10,11}\b/g,
];

/** Substitui todo contato pelo marcador e conta quantos saíram. */
export function redigirContatos(texto: string): RedacaoSaida {
  let redigidos = 0;
  let saida = texto;
  for (const padrao of PADROES) {
    saida = saida.replace(padrao, () => {
      redigidos += 1;
      return "[contato removido]";
    });
  }
  return { texto: saida, redigidos };
}
