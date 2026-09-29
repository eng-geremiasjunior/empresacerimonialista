// A última tela e o último evento que ela usou (29/09/2026, pedido do
// dono): os dois primeiros blocos do "O que você encontra aqui" no painel
// de quem já tem evento. Moram no navegador (localStorage) — é "de onde
// eu parei" NESTE aparelho, e nada disso vai para o servidor.
//
// Quem grava: o layout do evento (LembrarEvento) para as telas de um
// evento, e o AppShell para as outras áreas. Quem lê: AreasDoPainel.

export const CHAVE_ULTIMA_TELA = "eorg-ultima-tela";
export const CHAVE_ULTIMO_EVENTO = "eorg-ultimo-evento";

export type UltimaTela = {
  href: string;
  /** "Planejamento", "Gestão comercial" */
  titulo: string;
  /** o evento da tela, quando é de um evento */
  detalhe: string | null;
  foto: string;
  posicao: string;
  externa: boolean;
};

export type UltimoEvento = {
  id: string;
  titulo: string;
  /** "30/09/2026" */
  data: string;
  foto: string;
  posicao: string;
  externa: boolean;
};

export function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* navegação privada: sem memória, sem erro */
  }
}

export function ler<T>(chave: string): T | null {
  try {
    const v = localStorage.getItem(chave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
