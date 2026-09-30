import "server-only";

// A revisão dos sites (migrações 185 e 186): a família publica, o dono do
// sistema aprova ou recusa antes de ir ao ar, e pode tirar do ar depois.
// Tudo pela chave de serviço, depois do portão do dono; toda decisão vai
// para a auditoria. As funções do banco (admin_*) só aceitam a chave de
// serviço — nem a sessão do dono as chama direto.

import { exigirSuperAdmin, registrarAcaoAdmin, servico } from "@/lib/supabase/admin-painel";
import type { SitePublico } from "@/lib/site-publico-tipos";

export type SiteNaFila = {
  event_id: string;
  empresa: string | null;
  evento: string;
  tipo: string;
  data: string;
  enviada_em: string | null;
  slug: string | null;
  no_ar: boolean;
};

export type SiteParaRevisar = {
  status: "rascunho" | "em_analise" | "aprovado" | "recusado";
  versao: number;
  enviada_em: string | null;
  slug: string | null;
  retirado: boolean;
  pendente: SitePublico | null;
  no_ar: SitePublico | null;
  publicado: boolean;
};

export type SiteNoAr = {
  event_id: string;
  slug: string | null;
  publicado_em: string | null;
  evento: string;
  empresa: string | null;
};

export async function getFilaSites(): Promise<SiteNaFila[]> {
  await exigirSuperAdmin();
  const { data, error } = await servico().rpc("admin_fila_sites");
  if (error) {
    console.error("[eorganizei:admin] fila de sites:", error.code);
    return [];
  }
  return (data ?? []) as SiteNaFila[];
}

/** Para o número no menu: nunca derruba o painel. */
export async function contarFilaSites(): Promise<number> {
  try {
    return (await getFilaSites()).length;
  } catch {
    return 0;
  }
}

export async function getSiteParaRevisar(eventId: string): Promise<SiteParaRevisar | null> {
  await exigirSuperAdmin();
  const { data, error } = await servico().rpc("admin_site_para_revisar", { p_event_id: eventId });
  if (error) {
    console.error("[eorganizei:admin] site para revisar:", error.code);
    return null;
  }
  return (data as SiteParaRevisar | null) ?? null;
}

export async function getSitesNoAr(): Promise<SiteNoAr[]> {
  await exigirSuperAdmin();
  const { data, error } = await servico()
    .from("evento_site")
    .select("event_id, slug, publicado_em, events(name, type, empresas(nome))")
    .eq("publicado", true)
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(40);
  if (error) {
    console.error("[eorganizei:admin] sites no ar:", error.code);
    return [];
  }
  type Linha = {
    event_id: string;
    slug: string | null;
    publicado_em: string | null;
    events: { name: string | null; type: string; empresas: { nome: string } | null } | null;
  };
  return ((data ?? []) as unknown as Linha[]).map((l) => ({
    event_id: l.event_id,
    slug: l.slug,
    publicado_em: l.publicado_em,
    evento: l.events?.name?.trim() || l.events?.type || "evento",
    empresa: l.events?.empresas?.nome ?? null,
  }));
}

async function empresaDoEvento(eventId: string): Promise<string | null> {
  const { data } = await servico().from("events").select("empresa_id").eq("id", eventId).maybeSingle();
  return (data?.empresa_id as string | undefined) ?? null;
}

/** Aprovar ou recusar a versão que o dono tem na tela (a `versao`). */
export async function decidirSiteDb(
  eventId: string,
  aprovar: boolean,
  motivo: string | null,
  versao: number
): Promise<{ ok: true } | { error: string }> {
  const quem = await exigirSuperAdmin();
  const db = servico();
  const { error } = await db.rpc("admin_decidir_site", {
    p_event_id: eventId,
    p_aprovar: aprovar,
    p_motivo: motivo,
    p_versao: versao,
  });
  if (error) {
    if (error.code === "P0001" && error.message) return { error: error.message };
    console.error("[eorganizei:admin] decidir site:", error.code);
    return { error: "Não foi possível salvar a decisão." };
  }
  await registrarAcaoAdmin(db, quem, {
    acao: aprovar ? "site_aprovado" : "site_recusado",
    empresaId: await empresaDoEvento(eventId),
    depois: { event_id: eventId, versao },
    motivo: aprovar ? null : motivo,
  });
  return { ok: true };
}

export async function tirarSiteDoArDb(
  eventId: string,
  motivo: string
): Promise<{ ok: true } | { error: string }> {
  const quem = await exigirSuperAdmin();
  const db = servico();
  const { error } = await db.rpc("admin_tirar_site_do_ar", { p_event_id: eventId, p_motivo: motivo });
  if (error) {
    if (error.code === "P0001" && error.message) return { error: error.message };
    console.error("[eorganizei:admin] tirar site do ar:", error.code);
    return { error: "Não foi possível tirar do ar." };
  }
  await registrarAcaoAdmin(db, quem, {
    acao: "site_tirado_do_ar",
    empresaId: await empresaDoEvento(eventId),
    depois: { event_id: eventId },
    motivo,
  });
  return { ok: true };
}
