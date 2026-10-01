// "Lembrar de mim" (login do portal dos noivos, 30/09/2026). A sessão do
// Supabase mora em cookies que duram meses; desmarcar o "Lembrar" faz a
// sessão valer só enquanto o navegador estiver aberto.
//
// Dois cookies, nenhum com dado pessoal:
//   eorg_nao_lembrar = 1  (dura um ano) — a escolha deste navegador
//   eorg_sessao      = 1  (sem validade) — some quando o navegador fecha
// Com o primeiro e sem o segundo, o middleware encerra a sessão. Toda
// entrada nova (senha, ou link pelo /auth/confirm) acende o segundo.
// Navegador que reabre as abas da última vez guarda o cookie de sessão:
// aí a sessão continua, e é o comportamento de qualquer site.

export const COOKIE_NAO_LEMBRAR = "eorg_nao_lembrar";
export const COOKIE_SESSAO = "eorg_sessao";

/** Grava a escolha no navegador. Chamar ao entrar e ao pedir link. */
export function escolherLembrar(lembrar: boolean): void {
  if (typeof document === "undefined") return;
  const seguro = window.location.protocol === "https:" ? "; secure" : "";
  const base = `; path=/; samesite=lax${seguro}`;
  if (lembrar) {
    document.cookie = `${COOKIE_NAO_LEMBRAR}=${base}; max-age=0`;
    document.cookie = `${COOKIE_SESSAO}=${base}; max-age=0`;
    return;
  }
  document.cookie = `${COOKIE_NAO_LEMBRAR}=1${base}; max-age=31536000`;
  document.cookie = `${COOKIE_SESSAO}=1${base}`;
}

/** A sessão deste navegador precisa ser encerrada? (middleware) */
export function sessaoVencidaPorNaoLembrar(ler: (nome: string) => string | undefined): boolean {
  return ler(COOKIE_NAO_LEMBRAR) === "1" && ler(COOKIE_SESSAO) !== "1";
}
