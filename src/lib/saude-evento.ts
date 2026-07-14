// Copiloto — Saúde do Evento.
// Função PURA (sem IA, sem I/O): recebe os agregados do evento e devolve
// score 0-100, nível e alertas clicáveis. Testável isoladamente.

export type SaudeAba = "tarefas" | "fornecedores" | "financeiro" | "roteiro";

export type SaudeAlerta = { texto: string; aba: SaudeAba };

export type SaudeNivel = "verde" | "amarelo" | "vermelho";

export type SaudeInput = {
  tarefasTotal: number;
  tarefasConcluidas: number;
  fornecedoresTotal: number;
  fornecedoresConfirmados: number;
  parcelasVencidas: number;
  diasParcelaMaisVencida: number | null;
  roteiroItens: number;
};

export type Saude = {
  score: number; // 0-100 inteiro
  nivel: SaudeNivel;
  alertas: SaudeAlerta[];
};

const PESO_TAREFAS = 30;
const PESO_FORNECEDORES = 25;
const PESO_FINANCEIRO = 25;
const PESO_ROTEIRO = 20;

export function nivelDaSaude(score: number): SaudeNivel {
  if (score >= 80) return "verde";
  if (score >= 50) return "amarelo";
  return "vermelho";
}

export function calcularSaudeEvento(input: SaudeInput): Saude {
  let score = 0;
  const alertas: SaudeAlerta[] = [];

  // Tarefas (30%) — sem tarefas não penaliza (nada pendente).
  if (input.tarefasTotal > 0) {
    const pct = input.tarefasConcluidas / input.tarefasTotal;
    score += pct * PESO_TAREFAS;
    if (pct < 0.7) {
      alertas.push({
        texto: `Checklist ${Math.round(pct * 100)}% concluído`,
        aba: "tarefas",
      });
    }
  } else {
    score += PESO_TAREFAS;
  }

  // Fornecedores (25%) — sem fornecedores não penaliza.
  if (input.fornecedoresTotal > 0) {
    const pct = input.fornecedoresConfirmados / input.fornecedoresTotal;
    score += pct * PESO_FORNECEDORES;
    const pendentes = input.fornecedoresTotal - input.fornecedoresConfirmados;
    if (pendentes > 0) {
      alertas.push({
        texto: `${pendentes} fornecedor${pendentes > 1 ? "es" : ""} não confirmou`,
        aba: "fornecedores",
      });
    }
  } else {
    score += PESO_FORNECEDORES;
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
    });
  }

  // Cronograma (20%) — precisa existir.
  if (input.roteiroItens > 0) {
    score += PESO_ROTEIRO;
  } else {
    alertas.push({ texto: "Cronograma ainda não criado", aba: "roteiro" });
  }

  const rounded = Math.round(score);
  return { score: rounded, nivel: nivelDaSaude(rounded), alertas };
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
