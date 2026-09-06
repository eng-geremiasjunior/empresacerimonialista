// Os Termos e Condições de uso do eorganizei: a versão vigente e quem
// licencia. Módulo PURO (sem I/O, sem Supabase) — é importado pela página
// pública /termos, pela tela de assinatura (cliente) e pela action que
// registra o aceite (servidor). Nada aqui pode depender de cookies.

/**
 * A versão vigente do texto. Muda SÓ quando o texto de /termos muda — é
 * o que fica gravado em `termos_aceite.versao`, e é por ela que se prova,
 * depois, QUAL texto a pessoa aceitou. Formato AAAA-MM-DD da publicação.
 */
export const TERMOS_VERSAO = "2026-09-05";

/** A mesma data, por extenso, para o rodapé da página. */
export const TERMOS_ATUALIZADO_EM = "5 de setembro de 2026";

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
