import "server-only";

// O planejamento da noiva que abriu a conta sozinha (04/10/2026), lido
// pela sessão dela. Na conta da família ela é a dona do evento: a RLS do
// sistema já deixa ler e gravar tudo do evento — as mesmas tabelas da
// cerimonialista (getPlanejamento), arrumadas em 9 capítulos.
//
// Só vale para o evento da conta da família: no evento de uma
// cerimonialista o portal continua como antes (quem conduz é ela).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getPlanejamento, type EstadoDecisao } from "@/lib/supabase/planejamento";
import { valorDoCampo, type TipoCampo } from "@/lib/planejamento-shared";
import {
  CAPITULOS,
  OUTROS,
  capituloDoCodigo,
  fotoDoCapitulo,
  nomeDoAssunto,
  porPrazo,
  prazoDaNoiva,
  prazoPerto,
  type Capitulo,
} from "@/lib/portal-planejamento";
import { hojeBR } from "@/lib/tempo";

export type CampoDaNoiva = {
  id: string;
  label: string;
  tipo: TipoCampo;
  opcoes: string[] | null;
  unidade: string | null;
  /** o valor como texto ("" = sem resposta) */
  valor: string;
  /** a versão da linha: vai junto na escrita (trava otimista) */
  updatedAt: string | null;
};

export type DecisaoDaNoiva = {
  id: string;
  titulo: string;
  descricao: string | null;
  estado: EstadoDecisao;
  prazoPrevisto: string | null;
  /** "em 3 semanas", "para agora" — calculado aqui, no fuso de Brasília */
  prazo: string | null;
  /** o prazo está perto (até 4 semanas): só esse ganha cor */
  perto: boolean;
  ordem: number;
  campos: CampoDaNoiva[];
};

export type AssuntoDaNoiva = { id: string; nome: string; decisoes: DecisaoDaNoiva[] };

export type CapituloDaNoiva = Capitulo & {
  foto: string | null;
  assuntos: AssuntoDaNoiva[];
  feitas: number;
  total: number;
  proxima: { titulo: string; prazo: string | null } | null;
};

export type ItemDoAgora = DecisaoDaNoiva & { capituloId: string; capituloNome: string };

export type PlanejamentoDaNoiva = {
  capitulos: CapituloDaNoiva[];
  /** as próximas três, por prazo */
  agora: ItemDoAgora[];
  feitas: number;
  total: number;
  fornecedores: { id: string; nome: string }[];
};

/**
 * Quem está logada abriu esta conta de família sozinha? Só ela planeja
 * aqui, por enquanto: quem ela convida para o portal não lê o método
 * (evento_objetivo é só da equipe) — o noivo planejar junto é o próximo
 * passo. Devolve a empresa da festa, ou null.
 */
export const donaDaFesta = cache(async (eventoId: string): Promise<{ empresaId: string } | null> => {
  const supabase = createClient();
  const [
    {
      data: { user },
    },
    { data: ev },
  ] = await Promise.all([supabase.auth.getUser(), supabase.from("events").select("empresa_id").eq("id", eventoId).maybeSingle()]);
  const empresaId = (ev as { empresa_id?: string } | null)?.empresa_id;
  if (!user || !empresaId) return null;
  const { data: emp } = await supabase.from("empresas").select("tipo, owner_user_id").eq("id", empresaId).maybeSingle();
  const empresa = emp as { tipo?: string; owner_user_id?: string } | null;
  return empresa?.tipo === "familia" && empresa.owner_user_id === user.id ? { empresaId } : null;
});

/** null = não é a dona da conta de família (ou a sessão não vê o evento). */
export async function getPlanejamentoDaNoiva(eventoId: string, dataEvento: string | null): Promise<PlanejamentoDaNoiva | null> {
  const dona = await donaDaFesta(eventoId);
  if (!dona) return null;
  const { empresaId } = dona;
  const supabase = createClient();

  const [plano, { data: codigosBrutos }, { data: fornecedoresBrutos }] = await Promise.all([
    getPlanejamento(eventoId, dataEvento),
    supabase.from("evento_objetivo").select("id, metodo_objetivo(codigo)").eq("event_id", eventoId),
    supabase.from("suppliers").select("id, name").eq("empresa_id", empresaId).order("name").limit(300),
  ]);

  const codigoPor = new Map<string, string | null>();
  for (const o of (codigosBrutos ?? []) as unknown as { id: string; metodo_objetivo: { codigo: string } | { codigo: string }[] | null }[]) {
    const m = Array.isArray(o.metodo_objetivo) ? o.metodo_objetivo[0] : o.metodo_objetivo;
    codigoPor.set(o.id, m?.codigo ?? null);
  }

  const hoje = hojeBR();
  const porCapitulo = new Map<string, AssuntoDaNoiva[]>();
  const posicaoDoAssunto = new Map<string, number>();
  const agora: ItemDoAgora[] = [];

  for (const obj of plano.objetivos.filter((o) => o.ativo)) {
    const codigo = codigoPor.get(obj.id) ?? null;
    const cap = capituloDoCodigo(codigo);
    const decisoes: DecisaoDaNoiva[] = obj.decisoes
      // "Definir a data" não tem pergunta (a data vive no evento) e a
      // data veio no cadastro: aqui seria pedir de novo o que ela já disse
      .filter((d) => !(d.codigo === "data" && dataEvento && d.campos.length === 0))
      .map((d) => ({
        id: d.id,
        titulo: d.titulo,
        descricao: d.descricao,
        estado: d.estado,
        prazoPrevisto: d.prazoPrevisto,
        prazo: d.estado === "pendente" ? prazoDaNoiva(d.prazoPrevisto, hoje) : null,
        perto: d.estado === "pendente" && prazoPerto(d.prazoPrevisto, hoje),
        ordem: d.ordem,
        // o anexo é da tela de documentos: aqui só o que se responde
        campos: d.campos
          .filter((c) => c.tipo !== "anexo")
          .map((c) => {
            const v = valorDoCampo(c);
            return {
              id: c.id,
              label: c.label,
              tipo: c.tipo,
              opcoes: c.opcoes,
              unidade: c.unidade,
              valor: v === null || v === undefined ? "" : String(v),
              updatedAt: c.updatedAt ?? null,
            };
          }),
      }))
      .sort((a, b) => a.ordem - b.ordem);
    if (decisoes.length === 0) continue;
    const assunto: AssuntoDaNoiva = { id: obj.id, nome: nomeDoAssunto(codigo, obj.nome), decisoes };
    posicaoDoAssunto.set(obj.id, codigo ? cap.codigos.indexOf(codigo) : -1);
    porCapitulo.set(cap.id, [...(porCapitulo.get(cap.id) ?? []), assunto]);
    for (const d of decisoes) if (d.estado === "pendente") agora.push({ ...d, capituloId: cap.id, capituloNome: cap.nome });
  }

  // a ordem dos assuntos dentro do capítulo é a do capítulo (os códigos)
  const capitulos: CapituloDaNoiva[] = [...CAPITULOS, OUTROS]
    .filter((c) => porCapitulo.has(c.id))
    .map((c) => {
      // sem código conhecido (-1) vai para o fim, na ordem do método
      const lugar = (id: string) => {
        const p = posicaoDoAssunto.get(id) ?? -1;
        return p < 0 ? Number.MAX_SAFE_INTEGER : p;
      };
      const assuntos = [...(porCapitulo.get(c.id) ?? [])].sort((a, b) => lugar(a.id) - lugar(b.id));
      const todas = assuntos.flatMap((a) => a.decisoes);
      const aplicaveis = todas.filter((d) => d.estado !== "nao_se_aplica");
      const pendentes = aplicaveis.filter((d) => d.estado === "pendente").sort(porPrazo);
      return {
        ...c,
        foto: fotoDoCapitulo(c.id),
        assuntos,
        feitas: aplicaveis.filter((d) => d.estado === "decidida").length,
        total: aplicaveis.length,
        proxima: pendentes[0] ? { titulo: pendentes[0].titulo, prazo: pendentes[0].prazo } : null,
      };
    });

  const total = capitulos.reduce((s, c) => s + c.total, 0);
  const feitas = capitulos.reduce((s, c) => s + c.feitas, 0);
  return {
    capitulos,
    agora: agora.sort(porPrazo).slice(0, 3),
    feitas,
    total,
    fornecedores: ((fornecedoresBrutos ?? []) as { id: string; name: string }[]).map((f) => ({ id: f.id, nome: f.name })),
  };
}
