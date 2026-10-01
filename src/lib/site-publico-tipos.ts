// O shape do JSON de site_publico (migração 128) — a página do convidado
// e a folha de metadados leem daqui. Conteúdo do casal vem da fotografia
// publicada; evento e hospedagens vêm ao vivo.

import type { TemaDoSite } from "@/lib/site-blocos";

export type SitePublico = {
  evento: {
    tipo: string;
    anfitrioes: string;
    data: string;
    hora: string | null;
    local: string | null;
    cidade: string | null;
    /** o endereço do espaço, ao vivo (191); ausente antes dela */
    endereco?: string | null;
    capa_url: string | null;
  };
  empresa: { nome: string; logo_url: string | null } | null;
  site: {
    mensagem: string | null;
    historia: string | null;
    historia_titulo: string | null;
    foto_casal_path: string | null;
    dress_code: string | null;
    dress_code_titulo: string | null;
    presentes_texto: string | null;
    pix_chave: string | null;
    pix_titular: string | null;
    presentes_link: string | null;
    blocos: { titulo: string; texto: string }[];
    /** a ordem dos blocos (185); ausente ou vazia = a ordem do desenho.
     *  Crua do banco: passa por estruturaEfetiva() antes de desenhar. */
    estrutura?: unknown;
    /** o modelo e as cores (185) */
    tema?: TemaDoSite | null;
  } | null;
  /** as três cores do convite; null = paleta do guia ou o padrão */
  cores: { acento: string | null; tinta: string | null; fundo: string | null } | null;
  /** o que o casal deixou aberto para o convidado */
  blocos: { album: boolean; playlist: boolean; recados: boolean } | null;
  album: { path: string; autor: string | null }[] | null;
  recados: { nome: string | null; texto: string }[] | null;
  paleta: { nome: string; papel: string; hex: string }[] | null;
  espaco: {
    transporte: string | null;
    hospedagens:
      | {
          nome: string;
          distancia: string | null;
          faixa_preco: string | null;
          nota: string | null;
          link: string | null;
        }[]
      | null;
  } | null;
  rsvp: {
    aberto: boolean;
    hash: string;
    prazo: string | null;
    menu: string[] | null;
  };
  slug_atual: string | null;
  ref_e_slug_antigo: boolean;
  indexavel: boolean;
};
