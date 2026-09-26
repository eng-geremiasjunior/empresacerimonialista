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

// O papel virou texto livre no banco (125) — a lista OFERECIDA é por
// tipo de evento, aqui. No casamento é o cortejo de entrada; na
// formatura são as listas da colação (formandos, mesa de honra, quem
// discursa) e é delas que sai a chamada nominal.
export type PessoaCortejo = {
  id: string;
  papel: string;
  nome: string;
  contato: string | null;
  oQueLeva: string | null;
  responsavel: string | null;
  chegada: string | null;
  /** anotação interna de pronúncia — NUNCA sai em rota pública */
  pronuncia: string | null;
  ordem: number;
};

export const PAPEL_ROTULO: Record<string, string> = {
  // casamento
  padrinho: "Padrinhos",
  madrinha: "Madrinhas",
  dama: "Damas",
  pajem: "Pajens",
  porta_alianca: "Porta-alianças",
  // formatura
  formando: "Formandos",
  paraninfo: "Paraninfo",
  patrono: "Patrono",
  orador: "Orador",
  juramentista: "Juramentista",
  homenageado: "Homenageados",
  docente: "Docentes",
  madrinha_anel: "Madrinha/Padrinho do anel",
  mesa_de_honra: "Mesa de honra",
  // debutante (175, 25/09/2026): a corte e as 15 velas
  principe: "Príncipe",
  par_valsa: "Pares da valsa",
  vela: "As 15 velas",
  entrada: "Acompanham a entrada",
};

export function rotuloDoPapel(papel: string): string {
  return PAPEL_ROTULO[papel] ?? papel.replace(/_/g, " ");
}

// O singular não sai de tirar o "s" do plural em todos: "Pares da valsa"
// e "As 15 velas" não viram singular assim.
const PAPEL_SINGULAR: Record<string, string> = {
  par_valsa: "Par da valsa",
  vela: "Uma das 15 velas",
  entrada: "Acompanha a entrada",
};

/** "Padrinho", "Par da valsa" — uma pessoa do grupo, para a escolha do papel. */
export function rotuloDoPapelSingular(papel: string): string {
  return PAPEL_SINGULAR[papel] ?? rotuloDoPapel(papel).replace(/s$/, "");
}

/**
 * O detalhe livre da pessoa (coluna o_que_leva). No cortejo é o que ela
 * leva (alianças, flores); nas 15 velas é quem ela é para a debutante.
 */
export function detalheDoPapel(papel: string): { campo: string; rotulo: string; curto: string } {
  if (papel === "vela") {
    return { campo: "Quem é para ela (avó, madrinha…)", rotulo: "Quem é", curto: "quem é" };
  }
  return { campo: "O que leva", rotulo: "Vai levar", curto: "leva" };
}

/** A ordem em que os grupos aparecem na tela, por tipo de evento. */
export const PAPEIS_POR_TIPO: Record<string, string[]> = {
  casamento: ["padrinho", "madrinha", "dama", "pajem", "porta_alianca"],
  formatura: [
    "formando",
    "paraninfo",
    "patrono",
    "orador",
    "juramentista",
    "homenageado",
    "docente",
    "madrinha_anel",
    "mesa_de_honra",
  ],
  // a ordem é a da noite: quem entra com ela, a valsa, depois as velas
  debutante: ["entrada", "principe", "par_valsa", "vela", "dama"],
};

export function papeisDoTipo(tipo: string | null | undefined): string[] {
  return PAPEIS_POR_TIPO[tipo ?? ""] ?? PAPEIS_POR_TIPO.casamento;
}

/** @deprecated ordem fixa de casamento — prefira papeisDoTipo(tipo). */
export const PAPEIS: string[] = PAPEIS_POR_TIPO.casamento;

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

/**
 * Agrupa por papel na ordem do tipo, omitindo os vazios. Papéis fora da
 * lista do tipo (legado ou texto livre) entram no fim, sem sumir.
 */
export function agruparCortejo(
  lista: PessoaCortejo[],
  tipo?: string | null
): { papel: string; rotulo: string; pessoas: PessoaCortejo[] }[] {
  const conhecidos = papeisDoTipo(tipo);
  const extras = Array.from(
    new Set(lista.map((p) => p.papel).filter((p) => !conhecidos.includes(p)))
  );
  return [...conhecidos, ...extras]
    .map((papel) => ({
      papel,
      rotulo: rotuloDoPapel(papel),
      pessoas: lista
        .filter((p) => p.papel === papel)
        .slice()
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
    }))
    .filter((g) => g.pessoas.length > 0);
}
