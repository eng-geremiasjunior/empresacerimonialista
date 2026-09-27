"use server";

// Os eventos de exemplo (174): marcar as telas que ela já viu, abrir o
// portal da família do exemplo e tirar os exemplos de cena. A marca vai
// pela sessão dela (RLS de events); o resto usa a chave de serviço, sempre
// depois de conferir que a empresa é a dela e que o evento É exemplo.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { portalBase } from "@/lib/app-url";
import {
  AREAS_DO_EXEMPLO,
  apagarEventoDeExemplo,
  criarEventoDeExemplo,
  exemploDoModelo,
  viuTudo,
  type AreaDoExemplo,
  type ModeloDoExemplo,
} from "@/lib/evento-exemplo";

function servico() {
  return createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

const ehModelo = (m: string): m is ModeloDoExemplo => m === "casamento" || m === "debutante";

export async function marcarExemploVisto(eventId: string, area: AreaDoExemplo): Promise<{ tudo: boolean }> {
  if (!AREAS_DO_EXEMPLO.some((a) => a.area === area)) return { tudo: false };
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("exemplo, exemplo_visto")
    .eq("id", eventId)
    .maybeSingle();
  if (!data?.exemplo) return { tudo: false };
  const visto = (data.exemplo_visto as string[] | null) ?? [];
  if (visto.includes(area)) return { tudo: viuTudo(visto) };
  const novo = [...visto, area];
  await supabase.from("events").update({ exemplo_visto: novo }).eq("id", eventId);
  return { tudo: viuTudo(novo) };
}

export async function apagarExemplo() {
  const { empresaId } = await getMeuCargo();
  if (empresaId) await apagarEventoDeExemplo(empresaId);
  revalidatePath("/eventos");
  revalidatePath("/eventos/dashboard");
  redirect("/eventos");
}

/** O exemplo daquele modelo: cria se faltar (sem apagar o outro). */
async function garantirExemplo(modelo: ModeloDoExemplo): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { empresaId } = await getMeuCargo();
  if (!user || !empresaId) return null;
  const ja = await exemploDoModelo(empresaId, modelo);
  if (ja) return ja;
  const novo = await criarEventoDeExemplo(empresaId, user.id, modelo);
  revalidatePath("/eventos");
  revalidatePath("/eventos/dashboard");
  return novo;
}

/**
 * Abre o exemplo daquele modelo (casamento ou 15 anos), criando se faltar.
 * Desde 27/09/2026 os dois convivem; antes, trocar apagava o outro.
 */
export async function verExemplo(modelo: ModeloDoExemplo) {
  if (!ehModelo(modelo)) return;
  const id = await garantirExemplo(modelo);
  redirect(id ? `/eventos/${id}/roteiro` : "/eventos");
}

/** O nome antigo da ação da faixa; hoje não apaga mais o outro exemplo. */
export async function trocarModeloDoExemplo(modelo: ModeloDoExemplo) {
  return verExemplo(modelo);
}

const PAPEL_POR_TIPO: Record<string, string> = { debutante: "mae", casamento: "noiva" };

/**
 * "Ver como a família vê" (27/09/2026, pedido do dono: a cerimonialista
 * precisa conhecer os portais por dentro para indicá-los às clientes).
 * Dá ao login DELA o acesso de responsável do SEU evento de exemplo e
 * devolve a entrada já logada no endereço do portal do tipo (debut. para
 * 15 anos). Só exemplo, só da empresa dela: evento de cliente real nunca.
 * Conta a tela "portal" do exemplo como vista.
 */
export async function abrirPortalDoExemplo(modelo: ModeloDoExemplo): Promise<{ url: string } | { error: string }> {
  if (!ehModelo(modelo)) return { error: "Exemplo desconhecido." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { empresaId } = await getMeuCargo();
  if (!user?.email || !empresaId) return { error: "Entre de novo." };

  const eventId = await garantirExemplo(modelo);
  if (!eventId) return { error: "Não foi possível preparar o exemplo agora." };

  const db = servico();
  const { data: ev } = await db.from("events").select("id, type, empresa_id, exemplo").eq("id", eventId).maybeSingle();
  const evento = ev as { id: string; type: string | null; empresa_id: string; exemplo: boolean } | null;
  // a trava: só o exemplo, e só o da empresa dela
  if (!evento || !evento.exemplo || evento.empresa_id !== empresaId) return { error: "Só nos eventos de exemplo." };

  const { data: membro } = await db
    .from("membros_equipe")
    .select("nome")
    .eq("user_id", user.id)
    .eq("empresa_id", empresaId)
    .limit(1)
    .maybeSingle();
  const nome = ((membro as { nome?: string | null } | null)?.nome ?? "").trim() || "Você";

  const { data: existente } = await db
    .from("evento_acesso")
    .select("id")
    .eq("event_id", evento.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const agora = new Date().toISOString();
  const { error } = existente
    ? await db
        .from("evento_acesso")
        .update({ status: "ativo", responsavel_confirmado_em: agora })
        .eq("id", (existente as { id: string }).id)
    : await db.from("evento_acesso").insert({
        event_id: evento.id,
        empresa_id: evento.empresa_id,
        user_id: user.id,
        nome,
        email: user.email,
        papel: PAPEL_POR_TIPO[evento.type ?? ""] ?? "outro",
        status: "ativo",
        responsavel_confirmado_em: agora,
      });
  if (error) return { error: "Não foi possível abrir o portal agora." };

  await marcarExemploVisto(evento.id, "portal");

  // a sessão é por endereço: o link mágico entra direto no portal do tipo
  const { data: link, error: erroLink } = await db.auth.admin.generateLink({ type: "magiclink", email: user.email });
  const hash = link?.properties?.hashed_token;
  if (erroLink || !hash) return { error: "Acesso liberado. Entre pelo portal com o seu e-mail." };
  return {
    url: `${portalBase(evento.type)}/auth/confirm?token_hash=${hash}&type=magiclink&next=${encodeURIComponent(`/portal/${evento.id}`)}`,
  };
}

/**
 * Chamada pelas telas de Eventos e do Dashboard: quando ela já passou por
 * todas as telas de TODOS os exemplos, eles saem de cena agora.
 */
export async function limparExemploVisto(): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.from("events").select("exemplo_visto, empresa_id").eq("exemplo", true);
  const exemplos = (data ?? []) as { exemplo_visto: string[] | null; empresa_id: string }[];
  if (!exemplos.length || !exemplos.every((e) => viuTudo(e.exemplo_visto))) return;
  const { empresaId } = await getMeuCargo();
  if (empresaId && exemplos.every((e) => e.empresa_id === empresaId)) await apagarEventoDeExemplo(empresaId);
}
