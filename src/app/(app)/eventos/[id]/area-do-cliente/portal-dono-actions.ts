"use server";

// "Abrir o portal como a família" — só para o dono do sistema, e só nos
// eventos das contas da casa (as de teste). Dá ao login dele o acesso de
// responsável daquele evento (evento_acesso, como qualquer família) e
// devolve um link de entrada já logado no endereço do portal do tipo
// (debut. para 15 anos). Evento de cliente real nunca: a trava é a lista
// contas_da_casa, conferida aqui no servidor.

import { createClient } from "@/lib/supabase/server";
import { emailDoSuperAdmin, servico } from "@/lib/supabase/admin-painel";
import { portalBase } from "@/lib/app-url";

const PAPEL_POR_TIPO: Record<string, string> = { debutante: "mae", casamento: "noiva" };

export async function abrirPortalComoFamilia(eventId: string): Promise<{ url: string } | { error: string }> {
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

  // entrada já logada no endereço do portal (a sessão é por endereço)
  const { data: link, error: erroLink } = await db.auth.admin.generateLink({ type: "magiclink", email });
  const hash = link?.properties?.hashed_token;
  if (erroLink || !hash) return { error: "Acesso liberado. Entre pelo portal com o seu e-mail." };
  const destino = `/portal/${evento.id}`;
  return {
    url: `${portalBase(evento.type)}/auth/confirm?token_hash=${hash}&type=magiclink&next=${encodeURIComponent(destino)}`,
  };
}
