// Copiloto — Saúde do Evento.
// Função PURA (sem IA, sem I/O): recebe os agregados do evento e devolve
// score 0-100, nível e alertas clicáveis. Testável isoladamente.
//
// 15/09/2026: cada alerta passou a responder três perguntas, não uma. O
// que aconteceu (texto), por que importa agora (porque: os dias até o
// evento, quando a data está perto) e o que fazer (acao + destino, a aba
// certa com um verbo). "Nenhuma tarefa cadastrada" apontava para a aba
// Tarefas — aposentada desde que as tarefas nascem das decisões — e não
// dizia isso; agora aponta para o Planejamento e diz.

export type SaudeAba = "tarefas" | "fornecedores" | "financeiro" | "roteiro";

/** Segmento da rota do evento para onde o alerta leva. */
export type SaudeDestino =
  | "planejamento"
  | "organizacao"
  | "fornecedores"
  | "financeiro"
  | "roteiro";

export type SaudeAlerta = {
  /** O que aconteceu. */
  texto: string;
  /** Família do alerta — a fase o filtra por aqui. */
  aba: SaudeAba;
  /** Por que importa agora ("O evento é em 12 dias."). Ausente = sem prazo perto. */
  porque?: string;
  /** O que fazer, com verbo ("Cobrar confirmação"). */
  acao: string;
  /** Para onde a ação leva. */
  destino: SaudeDestino;
};

export type SaudeNivel = "verde" | "amarelo" | "vermelho";

export type SaudeInput = {
  tarefasTotal: number;
  tarefasConcluidas: number;
  fornecedoresTotal: number;
  fornecedoresConfirmados: number;
  parcelasVencidas: number;
  diasParcelaMaisVencida: number | null;
  roteiroItens: number;
  /** Dias até o evento (negativo = já passou). Alimenta o "por que importa". */
  diasParaEvento?: number | null;
};

export type Saude = {
  score: number; // 0-100 inteiro
  nivel: SaudeNivel;
  alertas: SaudeAlerta[];
  /** o evento ainda não tem nada para avaliar — não confundir com saudável */
  semDados: boolean;
};

/**
 * A frase que acompanha o anel. Score alto com alerta na lista não é
 * "tudo encaminhado" — é "nada deu errado ainda", que é outra coisa.
 */
export function saudeEmPalavras(saude: Saude): string {
  if (saude.semDados) return "Ainda não configurado";
  if (saude.score >= 80) {
    return saude.alertas.length === 0 ? "Tudo encaminhado" : "Falta configurar";
  }
  if (saude.score >= 50) return "Atenção necessária";
  return "Risco alto";
}

const PESO_TAREFAS = 30;
const PESO_FORNECEDORES = 25;
const PESO_FINANCEIRO = 25;
const PESO_ROTEIRO = 20;

export function nivelDaSaude(score: number): SaudeNivel {
  if (score >= 80) return "verde";
  if (score >= 50) return "amarelo";
  return "vermelho";
}

/**
 * "O evento é em 12 dias." — só quando a data está perto o bastante para
 * mudar a urgência (até 90 dias). Evento passado ou sem data: nada.
 */
function prazoEmPalavras(dias: number | null | undefined): string | undefined {
  if (dias == null || dias < 0 || dias > 90) return undefined;
  if (dias === 0) return "O evento é hoje.";
  if (dias === 1) return "O evento é amanhã.";
  return `O evento é em ${dias} dias.`;
}

export function calcularSaudeEvento(input: SaudeInput): Saude {
  let score = 0;
  const alertas: SaudeAlerta[] = [];
  const prazo = prazoEmPalavras(input.diasParaEvento);

  // Tarefas (30%) — sem tarefas não penaliza (nada pendente).
  if (input.tarefasTotal > 0) {
    const pct = input.tarefasConcluidas / input.tarefasTotal;
    score += pct * PESO_TAREFAS;
    if (pct < 0.7) {
      const abertas = input.tarefasTotal - input.tarefasConcluidas;
      alertas.push({
        texto: `${abertas} ${abertas === 1 ? "tarefa ainda aberta" : "tarefas ainda abertas"}`,
        aba: "tarefas",
        porque: prazo,
        acao: "Ver as tarefas",
        destino: "organizacao",
      });
    }
  } else {
    // Sem tarefa nenhuma não há o que dar errado, então o peso vem cheio —
    // mas isso NÃO é "encaminhado". Vira alerta, e quem monta o rótulo
    // sabe distinguir "nada errado" de "nada feito".
    score += PESO_TAREFAS;
    alertas.push({
      texto: "Ainda não há tarefas neste evento",
      aba: "tarefas",
      porque: "Elas nascem das decisões do Planejamento.",
      acao: "Abrir o Planejamento",
      destino: "planejamento",
    });
  }

  // Fornecedores (25%) — sem fornecedores não penaliza.
  if (input.fornecedoresTotal > 0) {
    const pct = input.fornecedoresConfirmados / input.fornecedoresTotal;
    score += pct * PESO_FORNECEDORES;
    const pendentes = input.fornecedoresTotal - input.fornecedoresConfirmados;
    if (pendentes > 0) {
      alertas.push({
        texto:
          pendentes === 1
            ? "1 fornecedor ainda não confirmou"
            : `${pendentes} fornecedores ainda não confirmaram`,
        aba: "fornecedores",
        porque: prazo,
        acao: "Cobrar confirmação",
        destino: "fornecedores",
      });
    }
  } else {
    score += PESO_FORNECEDORES;
    alertas.push({
      texto: "Nenhum fornecedor vinculado ainda",
      aba: "fornecedores",
      acao: "Vincular fornecedor",
      destino: "fornecedores",
    });
  }

  // Financeiro (25%) — sem parcelas vencidas = saudável.
  if (input.parcelasVencidas === 0) {
    score += PESO_FINANCEIRO;
  } else {
    const dias = input.diasParcelaMaisVencida ?? 0;
    alertas.push({
      texto:
        input.parcelasVencidas === 1
          ? `Parcela vencida há ${dias} dia${dias === 1 ? "" : "s"}`
          : `${input.parcelasVencidas} parcelas vencidas`,
      aba: "financeiro",
      acao: "Ver o Financeiro",
      destino: "financeiro",
    });
  }

  // Cronograma (20%) — precisa existir.
  if (input.roteiroItens > 0) {
    score += PESO_ROTEIRO;
  } else {
    alertas.push({
      texto: "O roteiro do dia ainda não foi montado",
      aba: "roteiro",
      porque: prazo,
      acao: "Montar o roteiro",
      destino: "roteiro",
    });
  }

  const rounded = Math.round(score);
  return {
    score: rounded,
    nivel: nivelDaSaude(rounded),
    alertas,
    // Um evento recém-criado marcava 100 e "Tudo encaminhado": sem tarefa,
    // sem fornecedor e sem parcela vencida, os pesos vinham todos cheios.
    // Nada estava errado — mas nada estava feito, e a frase prometia
    // prontidão. Este campo separa as duas coisas.
    semDados:
      input.tarefasTotal === 0 &&
      input.fornecedoresTotal === 0 &&
      input.roteiroItens === 0,
  };
}

// Tokens de cor da Saúde. Cor só no ponto (dot) e na barra fina; texto neutro.
export const SAUDE_UI: Record<
  SaudeNivel,
  { titulo: string; bar: string; dot: string }
> = {
  verde: { titulo: "Saudável", bar: "bg-emerald-500", dot: "text-emerald-500" },
  amarelo: { titulo: "Atenção", bar: "bg-amber-500", dot: "text-amber-500" },
  vermelho: { titulo: "Crítico", bar: "bg-red-500", dot: "text-red-500" },
};
