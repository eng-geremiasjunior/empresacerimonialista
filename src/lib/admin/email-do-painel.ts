// O contrato do e-mail escrito à mão no painel (22/09/2026).
//
// Módulo puro: a tela (navegador) e o envio (servidor) leem os mesmos
// limites e a mesma lista de destinos. Sem "server-only" aqui — é isto
// que deixa o compositor usar as constantes sem arrastar a chave de
// serviço para o navegador.

export type EmailDoPainel = {
  assunto: string;
  titulo: string;
  /** um parágrafo por linha; linha vazia é ignorada */
  texto: string;
  /** a caixa de destaque, opcional: rótulo pequeno e o valor em ameixa */
  destaqueRotulo?: string | null;
  destaqueValor?: string | null;
  botaoTexto: string;
  /** para onde o botão leva, dentro do sistema */
  botaoCaminho: string;
};

export const LIMITES_DO_EMAIL = {
  assunto: 120,
  titulo: 90,
  texto: 2000,
  destaque: 80,
  botao: 40,
  paragrafo: 600,
  paragrafos: 8,
} as const;

/**
 * Para onde o botão pode levar. Lista fechada de propósito: o botão é o
 * único link clicável da mensagem, e um caminho digitado à mão vira 404
 * na mão da cliente.
 */
export const DESTINOS_DO_EMAIL: { caminho: string; nome: string }[] = [
  { caminho: "/eventos/dashboard", nome: "Painel dela" },
  { caminho: "/assinatura", nome: "Assinatura" },
  { caminho: "/eventos", nome: "Eventos" },
  { caminho: "/eventos/novo", nome: "Criar evento" },
  { caminho: "/orcamentos/pagina", nome: "Vitrine profissional" },
  { caminho: "/ajuda", nome: "Ajuda" },
];

export function destinoAceito(caminho: string): boolean {
  return DESTINOS_DO_EMAIL.some((d) => d.caminho === caminho);
}
