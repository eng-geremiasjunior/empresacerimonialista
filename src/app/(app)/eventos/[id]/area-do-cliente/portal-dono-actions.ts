"use server";

// "Abrir o portal como a família" — só para o dono do sistema, e só nos
// eventos das contas da casa (as de teste). Dá ao login dele o acesso de
// responsável daquele evento (evento_acesso, como qualquer família).
// Evento de cliente real nunca: a trava é a lista contas_da_casa,
// conferida aqui no servidor.
//
// Duas portas: pelo sistema (Área do cliente), que devolve um link já
// logado no endereço do portal do tipo (debut. para 15 anos); e pela
// entrada do portal, quando ele chega lá sem ser família de nada.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailDoSuperAdmin, servico } from "@/lib/supabase/admin-painel";
import { portalBase } from "@/lib/app-url";

const PAPEL_POR_TIPO: Record<string, string> = { debutante: "mae", casamento: "noiva" };

async function liberarAcessoDoDono(
  eventId: string
): Promise<{ ok: true; email: string; tipo: string | null } | { error: string }> {
  const email = await emailDoSuperAdmin();
  if (!email) return { error: "Só o dono do sistema abre o portal assim." };
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) return { error: "Entre de novo." };

  const db = servico();
  const { data: ev } = await db.from("events").select("id, type, empresa_id").eq("id", eventId).maybeSingle();
  const evento = ev as { id: string; type: string | null; empresa_id: string } | null;
  if (!evento) return { error: "Evento não encontrado." };
  const { data: casa } = await db.from("contas_da_casa").select("empresa_id").eq("empresa_id", evento.empresa_id).maybeSingle();
  if (!casa) return { error: "Só nos eventos das contas da casa." };

  const { data: membro } = await db
    .from("membros_equipe")
    .select("nome")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const nome = ((membro as { nome?: string | null } | null)?.nome ?? "").trim() || "Dono do eOrganizei";

  const { data: existente } = await db
    .from("evento_acesso")
    .select("id")
    .eq("event_id", evento.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const agora = new Date().toISOString();
  const { error } = existente
    ? await db.from("evento_acesso").update({ status: "ativo", responsavel_confirmado_em: agora }).eq("id", (existente as { id: string }).id)
    : await db.from("evento_acesso").insert({
        event_id: evento.id,
        empresa_id: evento.empresa_id,
        user_id: user.id,
        nome,
        email,
        papel: PAPEL_POR_TIPO[evento.type ?? ""] ?? "outro",
        status: "ativo",
        responsavel_confirmado_em: agora,
      });
  if (error) return { error: "Não foi possível liberar o acesso agora." };
  return { ok: true, email, tipo: evento.type };
}

/** Pelo sistema: libera e devolve a entrada já logada no endereço do portal. */
export async function abrirPortalComoFamilia(eventId: string): Promise<{ url: string } | { error: string }> {
  const r = await liberarAcessoDoDono(eventId);
  if ("error" in r) return r;
  // a sessão é por endereço: o link mágico entra direto no portal do tipo
  const { data: link, error: erroLink } = await servico().auth.admin.generateLink({ type: "magiclink", email: r.email });
  const hash = link?.properties?.hashed_token;
  if (erroLink || !hash) return { error: "Acesso liberado. Entre pelo portal com o seu e-mail." };
  return {
    url: `${portalBase(r.tipo)}/auth/confirm?token_hash=${hash}&type=magiclink&next=${encodeURIComponent(`/portal/${eventId}`)}`,
  };
}

/** Pela entrada do portal (ele já está logado ali): libera e entra. */
export async function entrarComoFamilia(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const r = await liberarAcessoDoDono(eventId);
  if ("error" in r) redirect("/portal");
  redirect(`/portal/${eventId}`);
}
