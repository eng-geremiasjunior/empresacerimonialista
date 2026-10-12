import "server-only";

// O cadastro da cerimonialista só abre pelo link do e-mail (12/10/2026).
// Regra do dono desde o início ("pedi que todas as contas fossem
// confirmadas"), que três portas furavam: o gratuito, o teste com cartão
// e o assinar pelo anúncio criavam o login JÁ CONFIRMADO. Um usuário abriu
// contas em série com e-mails inventados e até ofensivos.
//
// Agora as três criam o login sem confirmar, terminam o que tinham de
// fazer (empresa, cartão, assinatura) e mandam ESTE link. A sessão só
// nasce quando alguém abre o link que chegou naquele endereço
// (/auth/confirm). O Supabase recusa a senha de um login não confirmado.
// Molde: a conta da família (187, desde 01/10/2026).

import { createClient as criarSupabase } from "@supabase/supabase-js";
import { appUrl } from "@/lib/app-url";
import { enviarViaResend } from "@/lib/email";
import { REMETENTE, RESPONDER_PARA } from "@/lib/email-ativacao-textos";
import { escaparHtml } from "@/lib/email-base";

function servico() {
  return criarSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

function htmlDaConfirmacao(link: string): { assunto: string; html: string } {
  return {
    assunto: "Confirme o seu e-mail no eOrganizei",
    html: `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#221E1B">
    <p style="color:#928A81;margin:0 0 20px;font-size:13px"><span style="color:#6E3F5F;font-weight:700">e</span>organizei</p>
    <p style="margin:0 0 14px;line-height:1.6">Falta um passo para abrir a sua conta: confirmar este e-mail.</p>
    <p style="margin:22px 0">
      <a href="${escaparHtml(link)}" style="display:inline-block;background:#6E3F5F;color:#FAF8F5;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Confirmar o e-mail</a>
    </p>
    <p style="margin:0 0 14px;color:#928A81;font-size:12px;line-height:1.5;word-break:break-all">${escaparHtml(link)}</p>
    <p style="margin:18px 0 0;line-height:1.6;font-weight:600"><span style="color:#6E3F5F">e</span>organizei</p>
    <p style="margin:28px 0 0;color:#928A81;font-size:12px;line-height:1.5">Você recebe este e-mail porque este endereço foi usado para criar uma conta no eOrganizei. Se não foi você, é só ignorar: sem a confirmação, a conta não abre.</p>
  </div>`,
  };
}

/**
 * Gera o link de confirmação de um login AINDA NÃO CONFIRMADO e manda por
 * e-mail. `senha` é a que o login já tem (nada muda nela). `destino` é a
 * tela onde ela cai depois de confirmar. Devolve se o e-mail saiu.
 */
export async function mandarConfirmacaoDoCadastro(email: string, senha: string, destino: string): Promise<boolean> {
  try {
    const { data: link, error } = await servico().auth.admin.generateLink({ type: "signup", email, password: senha });
    const tokenHash = link?.properties?.hashed_token ?? null;
    if (error || !tokenHash) {
      // só o código: a mensagem do Supabase repete o e-mail digitado
      console.error("[eorganizei:cadastro] link de confirmação:", error?.code ?? "sem token");
      return false;
    }
    const tipo = link.properties.verification_type || "signup";
    const confirmar =
      `${appUrl()}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}` +
      `&type=${encodeURIComponent(tipo)}&next=${encodeURIComponent(destino)}`;
    const { assunto, html } = htmlDaConfirmacao(confirmar);
    const envio = await enviarViaResend({
      to: email,
      subject: assunto,
      html,
      fromNome: REMETENTE(),
      replyTo: RESPONDER_PARA(),
      tags: [{ name: "tipo", value: "confirmacao_cadastro" }],
    });
    if (!envio.ok) console.error("[eorganizei:cadastro] e-mail de confirmação não saiu");
    return envio.ok;
  } catch {
    console.error("[eorganizei:cadastro] e-mail de confirmação: falhou");
    return false;
  }
}

/**
 * O id de um login que ainda não confirmou, provado pela SENHA: o Supabase
 * só responde "e-mail não confirmado" depois de a senha conferir. Serve ao
 * "tentar de novo" de quem teve o cartão recusado com a conta já criada.
 */
export async function idDoLoginNaoConfirmado(email: string, senha: string): Promise<string | null> {
  try {
    const anon = criarSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    const { error } = await anon.auth.signInWithPassword({ email, password: senha });
    if (error?.code !== "email_not_confirmed") return null;
    const { data } = await servico().auth.admin.generateLink({ type: "signup", email, password: senha });
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}
