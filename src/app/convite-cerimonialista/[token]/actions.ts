"use server";

// A cerimonialista pede para organizar o evento da família (188). Quem
// confere tudo (cargo, conta de cerimonial, validade, teto do plano) é a
// função do banco. A PASSAGEM só acontece quando a família confirmar no
// portal — daqui sai o pedido e o e-mail avisando a família.

import { createClient as createServico } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { enviarViaResend } from "@/lib/email";
import { portalBase } from "@/lib/app-url";

export type ResultadoPedido = { error: string } | { ok: true };

function servico() {
  return createServico(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

export async function pedirParaOrganizar(token: string): Promise<ResultadoPedido> {
  if (!/^[0-9a-f]{64}$/.test(token)) return { error: "Este convite não existe." };
  const supabase = createClient();
  const { error } = await supabase.rpc("pedir_para_organizar", { p_token: token });
  if (error) {
    // a mensagem pronta para a tela vem no hint (raise … using hint)
    const dica = (error as { hint?: string }).hint;
    console.error("[eorganizei:convite] pedir:", error.code ?? "sem código");
    return { error: dica || "Não foi possível mandar o pedido agora. Tente de novo em instantes." };
  }
  await avisarAFamilia(token);
  return { ok: true };
}

/**
 * O e-mail para quem convidou: quem pediu (o nome do negócio, que é o que
 * ela reconhece) e o link para responder no portal. Falhar aqui não desfaz
 * o pedido — ele também aparece no início do portal.
 */
async function avisarAFamilia(token: string): Promise<void> {
  try {
    const db = servico();
    const { data: conv } = await db
      .from("convite_cerimonialista")
      .select("event_id, criado_por, pedido_empresa")
      .eq("token", token)
      .maybeSingle();
    if (!conv) return;
    const [{ data: dona }, { data: ev }, { data: emp }] = await Promise.all([
      db.auth.admin.getUserById(conv.criado_por as string),
      db.from("events").select("type").eq("id", conv.event_id).maybeSingle(),
      db.from("empresas").select("nome").eq("id", conv.pedido_empresa).maybeSingle(),
    ]);
    const para = dona?.user?.email;
    if (!para) return;
    const negocio = (emp?.nome as string | undefined)?.trim() || "A sua cerimonialista";
    const festa = ev?.type === "debutante" ? "a festa de 15 anos" : "o casamento";
    const link = `${portalBase(ev?.type as string | undefined)}/portal/${conv.event_id}/cerimonialista`;
    await enviarViaResend({
      to: para,
      subject: `${negocio} pediu para organizar ${festa} com você`,
      html:
        `<p>${escapar(negocio)} pediu para organizar ${festa} com você no eorganizei.</p>` +
        `<p>Se for quem você convidou, confirme no portal. Se não for, recuse: o link deixa de valer.</p>` +
        `<p><a href="${link}">Responder no portal</a></p>`,
      tipo: "convite_pedido",
    });
  } catch {
    console.error("[eorganizei:convite] aviso à família: não saiu");
  }
}

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
