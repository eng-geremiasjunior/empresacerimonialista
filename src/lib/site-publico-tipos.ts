// O shape do JSON de site_publico (migração 128) — a página do convidado
// e a folha de metadados leem daqui. Conteúdo do casal vem da fotografia
// publicada; evento e hospedagens vêm ao vivo.

export type SitePublico = {
  evento: {
    tipo: string;
    anfitrioes: string;
    data: string;
    hora: string | null;
    local: string | null;
    cidade: string | null;
    capa_url: string | null;
  };
  empresa: { nome: string; logo_url: string | null } | null;
  site: {
    mensagem: string | null;
    historia: string | null;
    dress_code: string | null;
    blocos: { titulo: string; texto: string }[];
  } | null;
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
  rsvp: { aberto: boolean; hash: string };
  slug_atual: string | null;
  ref_e_slug_antigo: boolean;
  indexavel: boolean;
};
