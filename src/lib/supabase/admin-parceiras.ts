import "server-only";
import { exigirSuperAdmin, idsDaCasa, servico, tabelaAusente, type Servico } from "./admin-painel";
import { slugDoInstagram, UTM_DA_PARCEIRA, type Ensina } from "@/lib/parceiras";

// O lado do painel das parceiras (183). Nada aqui é CRM à mão (regra do
// dono): as etapas saem do que o sistema comprova na conta dela, achada
// pelo e-mail da candidatura, e as contas trazidas saem da origem do
// clique (152). A única coisa colada à mão é o link do Reels.

export type EtapasDaParceira = {
  /** tem ao menos um evento que não é o de exemplo */
  eventoReal: boolean;
  /** o Reels em collab (link colado pelo dono) */
  reels: boolean;
  /** conduziu um evento pelo sistema: link de fornecedor criado e portal liberado */
  diaPeloSistema: boolean;
};

export type ParceiraNoPainel = {
  id: string;
  nome: string;
  email: string;
  instagram: string;
  ensina: Ensina;
  whatsapp: string | null;
  sobre: string | null;
  status: "candidata" | "aprovada" | "recusada";
  slug: string | null;
  reelsUrl: string | null;
  criadaEm: string;
  /** a conta dela no sistema (pelo e-mail), se já existir */
  empresa: { id: string; nome: string } | null;
  etapas: EtapasDaParceira;
  /** contas criadas pelo link dela (fora a dela e as da casa) */
  trazidas: number;
  /** das trazidas, quantas pagam */
  pagantes: number;
};

type Linha = {
  id: string;
  nome: string;
  email: string;
  instagram: string;
  ensina: Ensina;
  whatsapp: string | null;
  sobre: string | null;
  status: ParceiraNoPainel["status"];
  slug: string | null;
  reels_url: string | null;
  criada_em: string;
};

async function empresaPeloEmail(db: Servico, email: string): Promise<{ id: string; nome: string } | null> {
  const { data } = await db
    .from("membros_equipe")
    .select("empresa_id")
    .ilike("email", email)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const empresaId = (data as { empresa_id: string } | null)?.empresa_id;
  if (!empresaId) return null;
  const { data: emp } = await db.from("empresas").select("nome").eq("id", empresaId).maybeSingle();
  return { id: empresaId, nome: (emp as { nome: string | null } | null)?.nome ?? "(sem nome)" };
}

async function etapasDaConta(db: Servico, empresaId: string, reelsUrl: string | null): Promise<EtapasDaParceira> {
  const { data: eventos } = await db.from("events").select("id").eq("empresa_id", empresaId).eq("exemplo", false);
  const ids = (eventos ?? []).map((e) => (e as { id: string }).id);
  let diaPeloSistema = false;
  if (ids.length) {
    const [{ count: links }, { count: portais }] = await Promise.all([
      db.from("roteiro_links").select("event_id", { count: "exact", head: true }).in("event_id", ids),
      db.from("evento_acesso").select("id", { count: "exact", head: true }).in("event_id", ids).eq("status", "ativo"),
    ]);
    diaPeloSistema = (links ?? 0) > 0 && (portais ?? 0) > 0;
  }
  return { eventoReal: ids.length > 0, reels: Boolean(reelsUrl), diaPeloSistema };
}

export async function getParceiras(): Promise<ParceiraNoPainel[] | null> {
  await exigirSuperAdmin();
  const db = servico();
  const { data, error } = await db
    .from("parceiras")
    .select("id, nome, email, instagram, ensina, whatsapp, sobre, status, slug, reels_url, criada_em")
    .order("criada_em", { ascending: false });
  if (error) {
    if (tabelaAusente(error)) return null; // a 183 ainda não foi aplicada
    throw new Error(`Não foi possível ler as parceiras: ${error.message}`);
  }
  const linhas = (data ?? []) as Linha[];
  const casa = await idsDaCasa(db);

  // as contas que chegaram por link de parceira, de uma vez
  const slugs = linhas.map((l) => l.slug).filter((s): s is string => Boolean(s));
  const porSlug = new Map<string, string[]>();
  if (slugs.length) {
    const { data: origens } = await db
      .from("origem_do_clique")
      .select("empresa_id, utm_campaign")
      .eq("utm_source", UTM_DA_PARCEIRA)
      .in("utm_campaign", slugs);
    for (const o of (origens ?? []) as { empresa_id: string; utm_campaign: string }[]) {
      if (casa.has(o.empresa_id)) continue;
      porSlug.set(o.utm_campaign, [...(porSlug.get(o.utm_campaign) ?? []), o.empresa_id]);
    }
  }
  const todasTrazidas = [...new Set([...porSlug.values()].flat())];
  const pagantes = new Set<string>();
  if (todasTrazidas.length) {
    const { data: ass } = await db
      .from("assinaturas")
      .select("empresa_id, status")
      .in("empresa_id", todasTrazidas)
      .eq("status", "ativa");
    for (const a of (ass ?? []) as { empresa_id: string }[]) pagantes.add(a.empresa_id);
  }

  return Promise.all(
    linhas.map(async (l) => {
      const empresa = l.status === "recusada" ? null : await empresaPeloEmail(db, l.email);
      const trazidas = (l.slug ? porSlug.get(l.slug) ?? [] : []).filter((id) => id !== empresa?.id);
      return {
        id: l.id,
        nome: l.nome,
        email: l.email,
        instagram: l.instagram,
        ensina: l.ensina,
        whatsapp: l.whatsapp,
        sobre: l.sobre,
        status: l.status,
        slug: l.slug,
        reelsUrl: l.reels_url,
        criadaEm: l.criada_em,
        empresa,
        etapas: empresa
          ? await etapasDaConta(db, empresa.id, l.reels_url)
          : { eventoReal: false, reels: Boolean(l.reels_url), diaPeloSistema: false },
        trazidas: trazidas.length,
        pagantes: trazidas.filter((id) => pagantes.has(id)).length,
      };
    })
  );
}

/** Candidaturas ainda sem decisão — o número ao lado do item do menu. */
export async function contarCandidatas(): Promise<number> {
  try {
    const { count, error } = await servico()
      .from("parceiras")
      .select("id", { count: "exact", head: true })
      .eq("status", "candidata");
    return error ? 0 : count ?? 0;
  } catch {
    return 0;
  }
}

export async function aprovarParceiraDb(id: string): Promise<string> {
  await exigirSuperAdmin();
  const db = servico();
  const { data } = await db.from("parceiras").select("instagram, slug").eq("id", id).maybeSingle();
  const linha = data as { instagram: string; slug: string | null } | null;
  if (!linha) throw new Error("Candidatura não encontrada.");
  let slug = linha.slug;
  if (!slug) {
    const base = slugDoInstagram(linha.instagram);
    slug = base;
    for (let n = 2; n < 50; n++) {
      const { data: igual } = await db.from("parceiras").select("id").eq("slug", slug).maybeSingle();
      if (!igual) break;
      slug = `${base.slice(0, 36)}-${n}`;
    }
  }
  const { error } = await db
    .from("parceiras")
    .update({ status: "aprovada", slug, decidida_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Não foi possível aprovar: ${error.message}`);
  return slug;
}

export async function recusarParceiraDb(id: string): Promise<void> {
  await exigirSuperAdmin();
  const { error } = await servico()
    .from("parceiras")
    .update({ status: "recusada", decidida_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Não foi possível recusar: ${error.message}`);
}

export async function salvarReelsDb(id: string, url: string): Promise<void> {
  await exigirSuperAdmin();
  const limpo = url.trim().slice(0, 300);
  if (limpo && !/^https:\/\/(www\.)?instagram\.com\//i.test(limpo)) {
    throw new Error("Cole o link do Reels no Instagram (https://www.instagram.com/…).");
  }
  const { error } = await servico()
    .from("parceiras")
    .update({ reels_url: limpo || null })
    .eq("id", id);
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
}
