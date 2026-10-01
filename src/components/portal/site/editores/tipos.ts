// O que todo editor de bloco recebe (separado do index para os editores
// importarem o tipo sem ciclo).

import type { ModeloId } from "@/lib/site-modelos";
import type { PedirEnvio } from "./CampoFoto";

export type ExtraDoEditor = {
  /** Capa: os nomes partidos do nome do evento (partirNomes), o
   *  pré-preenchimento quando a capa ainda não tem nome1/nome2 */
  nomesDoEvento?: { nome1: string; nome2: string };
  /** Capa: true quando os nomes ficam em Detalhes, não no bloco */
  semNomes?: boolean;
  /** O local: o que vem do evento (só leitura) */
  local?: { nome: string | null; endereco: string | null; cidade: string | null };
  /** Presentes: há chave Pix salva (coluna pix_chave) */
  temPix?: boolean;
  /** Presentes: o nível deixa mudar os itens ('gestao', a régua da 191).
   *  Ausente = não deixa. */
  podeEditarPresentes?: boolean;
  /** Presentes: os ids dos itens dos OUTROS blocos de presentes da
   *  estrutura (o id não repete na estrutura inteira) */
  idsDePresenteFora?: string[];
};

export type PropsDoEditor = {
  /** o conteudo do bloco, como está no rascunho (lido sem confiar) */
  conteudo: unknown;
  /** o conteudo novo, só com as chaves que a 191 aceita para o bloco */
  onChange: (c: Record<string, unknown>) => void;
  modelo: ModeloId;
  eventoId: string;
  /** caminho no balde 'site' → URL assinada (MidiaDoSite.urls) */
  urls: Record<string, string>;
  desabilitado?: boolean;
  /** a server action pedirEnvioDeFoto; sem ela, as fotos só aparecem */
  pedirEnvio?: PedirEnvio;
  extra?: ExtraDoEditor;
};
