// Parte PURA do modelo do Planejamento — importável por client e server.
// (planejamento.ts usa next/headers via createClient; componentes client
// não podem importar valores de lá, só tipos.)

export type TipoCampo =
  | "texto"
  | "numero"
  | "moeda"
  | "sim_nao"
  | "escolha"
  | "data"
  | "hora"
  | "anexo"
  | "fornecedor";

export type Campo = {
  id: string;
  codigo: string;
  label: string;
  tipo: TipoCampo;
  opcoes: string[] | null;
  unidade: string | null;
  ordem: number;
  valorTexto: string | null;
  valorNumero: number | null;
  valorBool: boolean | null;
  valorData: string | null;
  valorHora: string | null;
  valorOpcao: string | null;
  valorSupplierId: string | null;
  // Metadados do portal (091) — opcionais: nem toda superfície carrega.
  /** versão da linha; vai junto na escrita (trava otimista) */
  updatedAt?: string;
  /** a cliente escreveu e ainda não foi conferido */
  aguardaConferencia?: boolean;
  /** false = escondido do portal (nem leitura) */
  visivelPortal?: boolean;
  /** true = o portal pergunta este campo à cliente */
  perguntaCliente?: boolean;
};

// O valor canônico do campo, pelo tipo. null = ainda não respondido.
export function valorDoCampo(c: Campo): string | number | boolean | null {
  switch (c.tipo) {
    case "numero":
    case "moeda":
      return c.valorNumero;
    case "sim_nao":
      return c.valorBool;
    case "data":
      return c.valorData;
    case "hora":
      return c.valorHora;
    case "escolha":
      return c.valorOpcao;
    case "fornecedor":
      return c.valorSupplierId;
    default:
      // texto e anexo (anexo guarda o caminho do Storage em valor_texto)
      return c.valorTexto;
  }
}
