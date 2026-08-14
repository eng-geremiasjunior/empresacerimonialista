// Parte PURA de convidados e cortejo — importável por client e server.
//
// (portal-pessoas.ts usa next/headers via createClient; um componente
// "use client" que importasse VALORES de lá quebraria o build. Mesmo
// motivo e mesmo padrão de planejamento-shared.ts.)

export type Convidado = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  lado: "noiva" | "noivo" | null;
  grupo: string | null;
  mesa: string | null;
  confirmacao: "aguardando" | "confirmado" | "nao_vai";
  acompanhantes: number;
  criancas: number;
  restricaoAlimentar: string | null;
  hash: string;
  confirmadoVia: "link" | "manual" | null;
  origem: "cliente" | "equipe" | "autocadastro";
};

export type ResumoConvidados = {
  total: number;
  confirmados: number;
  aguardando: number;
  naoVao: number;
  /** confirmados + acompanhantes + crianças: o número que vai ao buffet */
  pessoasNaFesta: number;
  comRestricao: number;
};

export type PessoaCortejo = {
  id: string;
  papel: "padrinho" | "madrinha" | "dama" | "pajem" | "porta_alianca";
  nome: string;
  contato: string | null;
  oQueLeva: string | null;
  responsavel: string | null;
  chegada: string | null;
  ordem: number;
};

export const PAPEL_ROTULO: Record<PessoaCortejo["papel"], string> = {
  padrinho: "Padrinhos",
  madrinha: "Madrinhas",
  dama: "Damas",
  pajem: "Pajens",
  porta_alianca: "Porta-alianças",
};

/** A ordem em que os grupos aparecem na tela. */
export const PAPEIS: PessoaCortejo["papel"][] = [
  "padrinho",
  "madrinha",
  "dama",
  "pajem",
  "porta_alianca",
];

/** Os números que a cliente (e a cerimonialista) precisam ver. */
export function resumirConvidados(lista: Convidado[]): ResumoConvidados {
  const confirmados = lista.filter((c) => c.confirmacao === "confirmado");
  return {
    total: lista.length,
    confirmados: confirmados.length,
    aguardando: lista.filter((c) => c.confirmacao === "aguardando").length,
    naoVao: lista.filter((c) => c.confirmacao === "nao_vai").length,
    pessoasNaFesta: confirmados.reduce(
      (s, c) => s + 1 + c.acompanhantes + c.criancas,
      0
    ),
    comRestricao: confirmados.filter((c) => c.restricaoAlimentar?.trim()).length,
  };
}

/** Agrupa por papel, mantendo a ordem dos grupos e omitindo os vazios. */
export function agruparCortejo(
  lista: PessoaCortejo[]
): { papel: PessoaCortejo["papel"]; rotulo: string; pessoas: PessoaCortejo[] }[] {
  return PAPEIS.map((papel) => ({
    papel,
    rotulo: PAPEL_ROTULO[papel],
    pessoas: lista.filter((p) => p.papel === papel),
  })).filter((g) => g.pessoas.length > 0);
}
