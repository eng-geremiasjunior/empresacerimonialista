// "Não quero mais receber estes e-mails" — a saída da régua do teste.
//
// Chega pelo link do rodapé de cada e-mail, sem login (quem abriu a caixa
// de entrada não está logada no sistema). Por isso o link é assinado: o
// `t` é um HMAC do id da conta com o segredo do servidor, e sem ele a
// rota não faz nada. Assim ninguém descadastra a conta de outra pessoa.
//
// A marca mora no mesmo lugar dos envios (app_metadata.eorg_ativacao), e
// a rotina diária pula quem tem `sem_email`. Só a régua de ativação sai:
// aviso de pedido, proposta aceita e lembrete de tarefa continuam, porque
// são o trabalho dela, não divulgação.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assinaturaDeSaida } from "@/lib/email-ativacao";

export const dynamic = "force-dynamic";

function pagina(titulo: string, texto: string): NextResponse {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} — eorganizei</title></head>
<body style="margin:0;background:#F1ECE6;font-family:'Segoe UI',system-ui,-apple-system,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:48px 16px">
    <p style="font-size:17px;font-weight:700;color:#221E1B;margin:0 0 24px"><span style="color:#6E3F5F">e</span>organizei</p>
    <div style="background:#fff;border:1px solid #E7E0D8;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 12px;font-size:22px;color:#221E1B">${titulo}</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#3A3430">${texto}</p>
      <a href="/" style="display:inline-block;background:#6E3F5F;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Voltar ao eorganizei</a>
    </div>
  </div>
</body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const u = searchParams.get("u") ?? "";
  const t = searchParams.get("t") ?? "";
  if (!u || !t || t !== assinaturaDeSaida(u)) {
    return pagina("Link inválido", "Este link não confere. Se quiser parar de receber, responda o e-mail que eu tiro você da lista.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return pagina("Não consegui agora", "Tente de novo daqui a pouco, ou responda o e-mail que eu tiro você da lista.");
  }
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data } = await db.auth.admin.getUserById(u);
  const atual = data?.user;
  if (!atual) {
    return pagina("Link inválido", "Não achei essa conta. Se quiser parar de receber, responda o e-mail.");
  }

  const app = { ...(atual.app_metadata ?? {}) } as Record<string, unknown>;
  const marcas = (app.eorg_ativacao as Record<string, unknown> | undefined) ?? {};
  app.eorg_ativacao = { ...marcas, sem_email: new Date().toISOString() };
  const { error } = await db.auth.admin.updateUserById(u, { app_metadata: app });
  if (error) {
    console.error("[eorg:ativacao] sair:", error.message);
    return pagina("Não consegui agora", "Tente de novo daqui a pouco, ou responda o e-mail que eu tiro você da lista.");
  }

  return pagina(
    "Pronto, não mando mais",
    "Você saiu dos e-mails sobre o teste grátis. Avisos do seu trabalho — pedido de orçamento, proposta aceita e lembrete de tarefa — continuam chegando normalmente."
  );
}
