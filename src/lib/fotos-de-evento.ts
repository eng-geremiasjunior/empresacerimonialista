// As fotos de evento do sistema, num lugar só (29/09/2026): as que o dono
// escolheu, em public/primeiro-acesso, e as do site.
//
// Cada foto leva o enquadramento que funciona no álbum: `zoom` e `foco`
// tiram os letreiros do quadro ("Formatura 2024", "Annual Summit") e
// ancoram em quem importa. Serve ao álbum do "Comece aqui", ao cartão dos
// próximos eventos (evento sem capa usa a foto do tipo) e aos blocos do
// painel. Nenhum tipo fica sem foto: o sistema é de eventos, não só de
// casamento.

export type FotoDeEvento = {
  src: string;
  /** object-position da foto */
  posicao: string;
  /** zoom de base (1 = sem zoom) */
  zoom: number;
  /** ponto de onde o zoom parte (transform-origin) */
  foco: string;
  alt: string;
};

const CASAMENTO: FotoDeEvento = { src: "/site/foto-casamento.webp", posicao: "50% 38%", zoom: 1, foco: "50% 50%", alt: "Cerimônia de casamento ao ar livre, com o arco de flores" };
const QUINZE: FotoDeEvento = { src: "/primeiro-acesso/15-anos.webp", posicao: "50% 50%", zoom: 1.7, foco: "10% 60%", alt: "Debutante entrando na festa de 15 anos, aplaudida pelos amigos" };
const FORMATURA: FotoDeEvento = { src: "/primeiro-acesso/formatura.webp", posicao: "50% 50%", zoom: 1.8, foco: "20% 90%", alt: "Formandos jogando o capelo para o alto no baile de formatura" };
const CORPORATIVO: FotoDeEvento = { src: "/primeiro-acesso/corporativo.webp", posicao: "50% 50%", zoom: 1.3, foco: "85% 55%", alt: "Convidados conversando num evento corporativo" };
const ANIVERSARIO: FotoDeEvento = { src: "/primeiro-acesso/50-anos.webp", posicao: "40% 55%", zoom: 1, foco: "50% 50%", alt: "Casal dançando numa festa de aniversário" };
const FESTA: FotoDeEvento = { src: "/site/foto-palco.webp", posicao: "45% 40%", zoom: 1, foco: "50% 50%", alt: "Convidados dançando na pista" };

/** A foto de um tipo de evento (a de quem não tem capa). */
export function fotoDoTipo(tipo: string | null | undefined): FotoDeEvento {
  switch (tipo) {
    case "casamento":
      return CASAMENTO;
    case "debutante":
      return QUINZE;
    case "formatura":
      return FORMATURA;
    case "corporativo":
      return CORPORATIVO;
    case "aniversario":
    case "bodas":
    case "batizado":
    case "cha_revelacao":
      return ANIVERSARIO;
    default:
      return FESTA;
  }
}

/** O álbum do "Comece aqui": um de cada, na ordem em que aparecem. */
export const FOTOS_DO_ALBUM: { tipo: string; foto: FotoDeEvento; selo: string; frase: string }[] = [
  { tipo: "casamento", foto: CASAMENTO, selo: "Casamento", frase: "seu primeiro casamento" },
  { tipo: "debutante", foto: QUINZE, selo: "15 anos", frase: "seu primeiro 15 anos" },
  { tipo: "formatura", foto: FORMATURA, selo: "Formatura", frase: "sua primeira formatura" },
  { tipo: "corporativo", foto: CORPORATIVO, selo: "Corporativo", frase: "seu primeiro evento corporativo" },
  { tipo: "aniversario", foto: ANIVERSARIO, selo: "Aniversário", frase: "seu primeiro aniversário" },
];

/**
 * A capa padrão dos eventos de exemplo (29/09/2026, escolha do dono): o
 * casal na Villa Real (o local do exemplo) e a debutante — esta num
 * recorte sem o letreiro "Isabella 15 anos 2024".
 */
export const CAPA_DO_EXEMPLO: Record<string, string> = {
  casamento: "/primeiro-acesso/casal.webp",
  debutante: "/primeiro-acesso/15-anos-capa.webp",
};

/** As fotos das áreas do sistema, nos blocos do painel. */
export const FOTO_DA_AREA: Record<string, { src: string; posicao: string }> = {
  "/eventos": { src: "/primeiro-acesso/formatura.webp", posicao: "38% 40%" },
  "/clientes": { src: "/site/foto-15-anos.webp", posicao: "50% 32%" },
  "/orcamentos": { src: "/primeiro-acesso/comercial.webp", posicao: "50% 30%" },
  "/fornecedores": { src: "/primeiro-acesso/fornecedores.webp", posicao: "48% 42%" },
  "/cerimonialistas": { src: "/primeiro-acesso/equipe.webp", posicao: "50% 38%" },
  "/financeiro": { src: "/primeiro-acesso/financeiro.webp", posicao: "50% 50%" },
  "/carteira": { src: "/primeiro-acesso/financeiro.webp", posicao: "50% 50%" },
};
