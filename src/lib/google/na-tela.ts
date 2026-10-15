// O que a tela mostra da conexão com o Google Agenda (168) — igual em
// Configurações e na Visão geral do evento. Sem nada de servidor: é lido
// por componentes de cliente.

export type ConexaoGoogleNaTela = {
  google_email: string | null;
  conectado_em: string;
  pode_ler_ocupado: boolean;
  falha: string | null;
  falha_em: string | null;
};

/** O que a volta do Google disse (?google=), em frase. */
export const AVISOS_GOOGLE: Record<string, string> = {
  ok: "Conectado. Seus eventos e compromissos estão indo para a agenda eOrganizei do seu Google.",
  ok_sem_ocupado:
    "Conectado. Seus eventos estão indo para o Google; como você não permitiu ler a disponibilidade, os horários da sua agenda pessoal não entram na oferta a fornecedores.",
  recusado:
    "A conexão não foi feita: sem a permissão de criar uma agenda, o sistema não tem onde gravar. Tente de novo e marque as permissões.",
  erro: "Não foi possível conectar agora. Tente de novo em instantes.",
  // planos por recurso (09/10/2026)
  plano: "A Agenda do Google é dos planos pagos. Assine um plano para conectar.",
};

/** "2026-09-22T…" → "22/09" */
export function diaMes(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}` : "";
}

/** O botão "Conectar" de uma tela, voltando para ela depois do Google. */
export function urlDeConectar(voltar?: string): string {
  return voltar ? `/api/google/conectar?voltar=${encodeURIComponent(voltar)}` : "/api/google/conectar";
}
