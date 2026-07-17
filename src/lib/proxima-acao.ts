// Próxima ação de um evento — regra de prioridade real (a 1ª condição
// verdadeira vence). Função PURA: recebe os agregados do evento e devolve
// texto + destino de link + urgência. Nada de texto livre inventado.

import { formatDate } from "@/lib/format";

export type AcaoDestino =
  | "ver_financeiro"
  | "ver_fornecedores"
  | "ver_tarefas"
  | "ver_cronograma"
  | null;

export type Urgencia = "alta" | "media" | "baixa";

export type ProximaAcao = {
  texto: string;
  acao: AcaoDestino;
  urgencia: Urgencia;
  botao: string | null;
};

export type ProximaAcaoInput = {
  hojeIso: string;
  em2diasIso: string;
  em7diasIso: string;
  eventoDate: string;
  // parcela (receita não paga) mais urgente: vencida ou vencendo em 2 dias
  parcelaUrgenteData: string | null;
  // fornecedor não confirmado (nome), quando o evento é em até 7 dias
  fornecedorPendenteNome: string | null;
  // tarefa de alta prioridade vencendo hoje ou atrasada
  tarefaUrgenteTitulo: string | null;
  cronogramaVazio: boolean;
};

const BOTAO: Record<Exclude<AcaoDestino, null>, string> = {
  ver_financeiro: "Ver financeiro",
  ver_fornecedores: "Ver fornecedores",
  ver_tarefas: "Ver tarefas",
  ver_cronograma: "Criar cronograma",
};

export const ACAO_PATH: Record<Exclude<AcaoDestino, null>, string> = {
  ver_financeiro: "financeiro",
  ver_fornecedores: "fornecedores",
  ver_tarefas: "tarefas",
  ver_cronograma: "roteiro",
};

export function calcularProximaAcao(input: ProximaAcaoInput): ProximaAcao {
  // 1. Parcela vencida ou vencendo em até 2 dias → prioridade máxima
  if (input.parcelaUrgenteData) {
    return {
      texto: `Cobrar parcela — vence ${formatDate(input.parcelaUrgenteData)}`,
      acao: "ver_financeiro",
      urgencia: "alta",
      botao: BOTAO.ver_financeiro,
    };
  }

  // 2. Fornecedor pendente e evento em até 7 dias
  if (input.fornecedorPendenteNome) {
    return {
      texto: `Confirmar ${input.fornecedorPendenteNome}`,
      acao: "ver_fornecedores",
      urgencia: "alta",
      botao: BOTAO.ver_fornecedores,
    };
  }

  // 3. Tarefa de alta prioridade vencendo hoje ou atrasada
  if (input.tarefaUrgenteTitulo) {
    return {
      texto: input.tarefaUrgenteTitulo,
      acao: "ver_tarefas",
      urgencia: "media",
      botao: BOTAO.ver_tarefas,
    };
  }

  // 4. Cronograma ainda não criado
  if (input.cronogramaVazio) {
    return {
      texto: "Criar cronograma do evento",
      acao: "ver_cronograma",
      urgencia: "media",
      botao: BOTAO.ver_cronograma,
    };
  }

  // 5. Nenhuma pendência real
  return { texto: "Tudo em dia", acao: null, urgencia: "baixa", botao: null };
}
