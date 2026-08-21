// O que o Copiloto conta.
//
// Ele contava ESTADO: "9 eventos precisam da sua atenção hoje", onde os 9
// vinham de saúde abaixo de 80. Isso tinha dois problemas.
//
// O primeiro é que estado não tem hora. "Checklist 0%" num casamento de
// outubro de 2027 entrava na conta de HOJE — e quatro dos nove eram
// exatamente isso. A cerimonialista via um número grande de manhã e, ao
// clicar, encontrava trabalho que não é para agora.
//
// O segundo é que evento que já aconteceu continuava pedindo coisa:
// "confirmar fornecedor" e "criar cronograma do evento" de um casamento
// realizado no mês passado. Isso não é pendência, é ruído.
//
// Agora ele conta PRAZO — só o que tem data e a data chegou — e o que
// sobrevive ao fim da festa é só o dinheiro: confirmar fornecedor, fechar
// checklist ou criar cronograma de evento que já passou não muda nada,
// mas parcela que a cliente não pagou continua sendo dela.
//
// Regra de ouro do projeto: falar em tempo, não em status.

export type TipoPrazo = "pagamento" | "fornecedor" | "tarefa";

export type ResumoPrazos = {
  pagamento: number;
  fornecedor: number;
  tarefa: number;
  total: number;
};

export function resumirPrazos(tipos: TipoPrazo[]): ResumoPrazos {
  const r: ResumoPrazos = { pagamento: 0, fornecedor: 0, tarefa: 0, total: 0 };
  for (const t of tipos) {
    r[t] += 1;
    r.total += 1;
  }
  return r;
}

function plural(n: number, um: string, muitos: string): string {
  return `${n} ${n === 1 ? um : muitos}`;
}

/**
 * A linha do Copiloto. Dinheiro primeiro, depois o dia do evento, depois o
 * resto — e nunca um número solto: um contador sem substantivo é o que
 * transforma informação em alarme.
 */
export function frasePrazos(r: ResumoPrazos): string {
  if (r.total === 0) return "Nada vencendo hoje.";

  const partes: string[] = [];
  if (r.pagamento > 0) {
    partes.push(plural(r.pagamento, "parcela a cobrar", "parcelas a cobrar"));
  }
  if (r.fornecedor > 0) {
    partes.push(
      plural(r.fornecedor, "fornecedor sem confirmar", "fornecedores sem confirmar")
    );
  }
  if (r.tarefa > 0) {
    partes.push(plural(r.tarefa, "tarefa atrasada", "tarefas atrasadas"));
  }
  return `${partes.join(" · ")}.`;
}
