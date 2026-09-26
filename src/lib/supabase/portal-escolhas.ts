import "server-only";

// A tela Escolhas do portal v2 (177, desenho "Portal da Família v2"):
// cada decisão com o que a família pode fazer nela — responder, escolher
// uma opção da cerimonialista ou propor a dela. Junta o que já existe
// (perguntas da 146/175, curadoria da 092) com as propostas da 177.

import { createClient } from "@/lib/supabase/server";
import { getPerguntas, type PerguntaDoPortal } from "@/lib/supabase/portal";
import { getCuradoriasDoPortal, type Curadoria } from "@/lib/supabase/curadoria";

export type QuemDecide = "familia" | "juntas" | "carol";
/** aguardando vocês · vocês escolheram (ou responderam) · aguardando a cerimonialista · decidido */
export type EstadoDaEscolha = "voces" | "escolheram" | "carol" | "decidido";

export type PropostaDaFamilia = {
  id: string;
  titulo: string;
  texto: string | null;
  link: string | null;
  fornecedor: string | null;
  fotoUrl: string | null;
  autor: string | null;
  estado: "aguardando" | "aceita" | "recusada";
  resposta: string | null;
  respondidaEm: string | null;
  criadaEm: string;
  /** foi quem está logado que propôs (pode tirar enquanto aguarda) */
  minha: boolean;
};

export type Escolha = {
  decisaoId: string;
  titulo: string;
  topico: string;
  quem: QuemDecide;
  prazo: string | null;
  estado: EstadoDaEscolha;
  decididaEm: string | null;
  perguntas: PerguntaDoPortal[];
  curadoria: Curadoria | null;
  propostas: PropostaDaFamilia[];
};

type LinhaDecisao = {
  id: string;
  titulo: string;
  objetivo_nome: string | null;
  responsavel: string;
  prazo_previsto: string | null;
  estado: string;
  decidida_em: string | null;
};

const QUEM: Record<string, QuemDecide> = { noivos: "familia", ambos: "juntas", cerimonialista: "carol" };

function estadoDa(
  d: LinhaDecisao,
  quem: QuemDecide,
  perguntas: PerguntaDoPortal[],
  cur: Curadoria | null,
  propostas: PropostaDaFamilia[]
): EstadoDaEscolha {
  if (d.estado === "decidida") return "decidido";
  if (cur?.estado === "publicada") return "voces";
  if (perguntas.some((p) => p.valor === null)) return "voces";
  if (cur?.estado === "escolhida") return quem === "familia" ? "escolheram" : "carol";
  if (cur?.estado === "recusada") return "carol";
  if (propostas.some((p) => p.estado === "aguardando")) return "carol";
  if (perguntas.length > 0) return "escolheram";
  return "voces";
}

export async function getEscolhasDoPortal(
  eventId: string,
  dataEvento: string
): Promise<{ listadas: Escolha[]; outras: { decisaoId: string; titulo: string; topico: string }[] }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [decRes, perguntas, curadorias, propRes] = await Promise.all([
    supabase.rpc("portal_escolhas", { p_event_id: eventId }),
    getPerguntas(eventId, dataEvento),
    getCuradoriasDoPortal(eventId),
    supabase
      .from("decisao_proposta")
      .select("id, evento_decisao_id, titulo, texto, link, fornecedor_nome, foto_path, autor_nome, criado_por, estado, resposta, respondida_em, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
  ]);

  // sem a 177 aplicada: a tela mostra o que der das perguntas e opções
  const decisoes = (decRes.error ? [] : (decRes.data ?? [])) as LinhaDecisao[];

  const perguntasPor = new Map<string, PerguntaDoPortal[]>();
  for (const p of [...perguntas.abertas, ...perguntas.respondidas]) {
    perguntasPor.set(p.decisaoId, [...(perguntasPor.get(p.decisaoId) ?? []), p]);
  }
  const curadoriaPor = new Map(curadorias.map((c) => [c.decisaoId, c]));

  const linhasProp = (propRes.error ? [] : (propRes.data ?? [])) as {
    id: string;
    evento_decisao_id: string;
    titulo: string;
    texto: string | null;
    link: string | null;
    fornecedor_nome: string | null;
    foto_path: string | null;
    autor_nome: string | null;
    criado_por: string | null;
    estado: PropostaDaFamilia["estado"];
    resposta: string | null;
    respondida_em: string | null;
    created_at: string;
  }[];
  const caminhos = linhasProp.map((p) => p.foto_path).filter((x): x is string => !!x);
  const urls = new Map<string, string>();
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage.from("inspiracoes").createSignedUrls(caminhos, 60 * 60);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);
  }
  const propostasPor = new Map<string, PropostaDaFamilia[]>();
  for (const p of linhasProp) {
    const item: PropostaDaFamilia = {
      id: p.id,
      titulo: p.titulo,
      texto: p.texto,
      link: p.link,
      fornecedor: p.fornecedor_nome,
      fotoUrl: p.foto_path ? urls.get(p.foto_path) ?? null : null,
      autor: p.autor_nome,
      estado: p.estado,
      resposta: p.resposta,
      respondidaEm: p.respondida_em,
      criadaEm: p.created_at,
      minha: !!user && p.criado_por === user.id,
    };
    propostasPor.set(p.evento_decisao_id, [...(propostasPor.get(p.evento_decisao_id) ?? []), item]);
  }

  const listadas: Escolha[] = [];
  const outras: { decisaoId: string; titulo: string; topico: string }[] = [];
  for (const d of decisoes) {
    const quem = QUEM[d.responsavel] ?? "juntas";
    const ps = perguntasPor.get(d.id) ?? [];
    const cur = curadoriaPor.get(d.id) ?? null;
    const props = propostasPor.get(d.id) ?? [];
    const topico = d.objetivo_nome ?? "Festa";
    if (ps.length || cur || props.length) {
      listadas.push({
        decisaoId: d.id,
        titulo: d.titulo,
        topico,
        quem,
        prazo: d.prazo_previsto,
        estado: estadoDa(d, quem, ps, cur, props),
        decididaEm: d.decidida_em,
        perguntas: ps,
        curadoria: cur,
        propostas: props,
      });
    } else if (d.estado === "pendente" && quem !== "carol") {
      // sem nada ainda: a família pode propor por "Propor em outra decisão"
      outras.push({ decisaoId: d.id, titulo: d.titulo, topico });
    }
  }
  return { listadas, outras };
}
