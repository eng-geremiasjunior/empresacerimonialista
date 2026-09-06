// Os Termos e Condições de uso do eorganizei: a versão vigente e quem
// licencia. Módulo PURO (sem I/O, sem Supabase) — é importado pela página
// pública /termos, pela tela de assinatura (cliente) e pela action que
// registra o aceite (servidor). Nada aqui pode depender de cookies.

/**
 * A versão vigente do texto. Muda SÓ quando o texto de /termos muda — é
 * o que fica gravado em `termos_aceite.versao`, e é por ela que se prova,
 * depois, QUAL texto a pessoa aceitou. Formato AAAA-MM-DD da publicação.
 */
// 2026-09-06: a seção 7 passou a dizer o que PARA no cancelamento — os
// trinta dias depois do período pago, quando a conta vira somente leitura
// (151). Mudou o texto, muda a versão: quem aceitou a 2026-09-05 aceitou
// outro texto, e é isso que a coluna `termos_aceite.versao` prova.
//
// Ainda na 2026-09-06, e antes de publicar: a mesma seção 7 passou a
// amarrar a promessa de continuar vendo ao prazo de guarda da seção 5 —
// um parágrafo prometia acesso para sempre e o outro autorizava excluir
// os dados. Mesma data de publicação, mesma versão: ninguém aceitou o
// texto do meio do caminho.
export const TERMOS_VERSAO = "2026-09-06";

/** A mesma data, por extenso, para o rodapé da página. */
export const TERMOS_ATUALIZADO_EM = "6 de setembro de 2026";

/** Onde os termos moram. Rota pública (liberada no middleware). */
export const TERMOS_CAMINHO = "/termos";

/**
 * Quem licencia. Os campos vazios NÃO viram "[preencher]" na página: a
 * frase que os usa só aparece quando eles existem. O dono preenche razão
 * social, CNPJ e comarca aqui, num lugar só, e a página passa a dizê-los.
 */
export const LICENCIANTE = {
  marca: "eorganizei",
  site: "eorganizei.com.br",
  razaoSocial: "",
  cnpj: "",
  /** o mesmo contato da política de privacidade */
  email: "geremiaseng@outlook.com",
  /** comarca do foro (ex.: "Belo Horizonte, MG"); vazia = domicílio da licenciante */
  comarca: "",
} as const;
