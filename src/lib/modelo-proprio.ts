// O modelo dela (23/09/2026): o que a tela "Meu modelo", a importação do
// checklist e as ações dividem. Sem nada de servidor aqui — o cliente usa.

export type Responsavel = "noivos" | "cerimonialista" | "ambos";

export type DecisaoProposta = {
  titulo: string;
  diasAntes: number | null;
  responsavel: Responsavel;
  /** já existe uma decisão com esse título no modelo deste tipo */
  jaExiste: boolean;
};

export type PropostaDoModelo = {
  assuntos: {
    nome: string;
    /** o assunto do modelo com o mesmo nome; nulo = assunto novo */
    objetivoId: string | null;
    decisoes: DecisaoProposta[];
  }[];
};

/** Nome comparável: sem acento, sem caixa, sem pontuação nas pontas. */
export function chaveDeNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—•·*.,;:]+|[\s\-–—•·*.,;:]+$/g, "")
    .trim();
}

/** Os prazos que a tela oferece, em dias antes do evento. */
export const PRAZOS: (number | null)[] = [
  null, 360, 330, 300, 270, 240, 210, 180, 150, 120, 90, 60, 45, 30, 21, 14, 7, 3, 1, 0,
];

/** 360 → "12 meses antes"; 14 → "2 semanas antes"; 0 → "no dia". */
export function prazoEmTexto(dias: number | null): string {
  if (dias === null) return "sem prazo";
  if (dias === 0) return "no dia";
  if (dias === 1) return "1 dia antes";
  if (dias >= 60 && dias % 30 === 0) return `${dias / 30} meses antes`;
  if (dias === 30) return "1 mês antes";
  if (dias % 7 === 0 && dias < 60) return dias === 7 ? "1 semana antes" : `${dias / 7} semanas antes`;
  // os prazos do método em dias quebrados (355, 310…) leem melhor em meses
  if (dias >= 60) return `cerca de ${Math.round(dias / 30)} meses antes`;
  return `${dias} dias antes`;
}
