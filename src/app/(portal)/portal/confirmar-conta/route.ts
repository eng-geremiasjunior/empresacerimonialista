// O fim do cadastro da conta da festa (187, desde 01/10/2026): o link do
// e-mail de confirmação passa por /auth/confirm (que confirma o e-mail e
// abre a sessão) e cai aqui. (Fora de /portal/criar-conta de propósito: o
// middleware manda para /portal quem já tem sessão de portal ali.) É
// agora que a conta da família nasce — a empresa de família, a cliente, o
// evento, o acesso ao portal e o aceite dos termos —, com os dados que o
// cadastro guardou em app_metadata.familia_pendente (só o servidor
// escreve ali).
//
// Abrir o link duas vezes não cria duas festas: a função do banco recusa
// um login que já tem conta ("este login já tem uma conta"), e a pendência
// é apagada assim que a conta nasce. Todo caminho de falha volta ao
// /portal com ?falhou — sem ele, o /portal mandaria de volta para cá.

import { redirect } from "next/navigation";
import { createClient as createServico } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { FamiliaPendente } from "../criar-conta/actions";

export const dynamic = "force-dynamic";

function servico() {
  return createServico(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

export async function GET() {
  const sessao = createClient();
  const {
    data: { user },
  } = await sessao.auth.getUser();
  if (!user) redirect("/portal/entrar?erro=link");

  // a pendência vem do login FRESCO, não do token: o token da sessão pode
  // ser de antes de a conta nascer
  const db = servico();
  const { data: fresco, error: erroLer } = await db.auth.admin.getUserById(user.id);
  if (erroLer || !fresco?.user) {
    console.error("[eorganizei:familia] ler login na confirmação:", erroLer?.code ?? "sem login");
    redirect("/portal?falhou=1");
  }
  const p = (fresco.user.app_metadata as { familia_pendente?: FamiliaPendente } | undefined)?.familia_pendente;
  // sem pendência: a conta já nasceu (link aberto de novo) ou não é cadastro de festa
  if (!p) redirect("/portal?falhou=1");

  const { data: eventoId, error } = await db.rpc("criar_conta_da_familia", {
    p_user: user.id,
    p_nome: p.nome,
    p_papel: p.papel,
    p_tipo: p.tipo,
    p_data: p.data,
    p_festa: p.festa,
    p_cidade: p.cidade,
    p_termos_versao: p.termos_versao,
    p_ip: p.ip,
    p_user_agent: p.user_agent,
  });
  const jaNasceu = /já tem uma conta/i.test(error?.message ?? "");
  if (error && !jaNasceu) {
    // só o código: a mensagem do banco pode repetir o que foi digitado
    console.error("[eorganizei:familia] criar conta na confirmação:", error.code ?? "sem código");
    // a data passou entre o cadastro e o clique: tentar de novo não resolve
    redirect(/data do evento/i.test(error.message ?? "") ? "/portal?falhou=data" : "/portal?falhou=1");
  }

  const { error: erroLimpar } = await db.auth.admin.updateUserById(user.id, {
    app_metadata: { familia_pendente: null },
  });
  if (erroLimpar) console.error("[eorganizei:familia] limpar pendência:", erroLimpar.code ?? "sem código");
  // o token novo já sai sem a pendência (o /portal lê dele)
  await sessao.auth.refreshSession().catch(() => null);

  redirect(typeof eventoId === "string" && !jaNasceu ? `/portal/${eventoId}` : "/portal");
}
