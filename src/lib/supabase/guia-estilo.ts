// Leitura do guia de estilo. SÓ SERVIDOR (next/headers).
//
// As fotos vivem no bucket privado `inspiracoes`, com o caminho começando
// pelo event_id — a mesma pasta e a mesma policy das outras imagens do
// portal. Nenhuma tem endereço fixo: a leitura sai por URL assinada de
// dez minutos, gerada a cada visita.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  GuiaDeEstilo,
  PaletaDaBiblioteca,
  PapelCor,
} from "@/lib/guia-shared";

export type * from "@/lib/guia-shared";

type Linha = Record<string, unknown>;

/** Assina em lote os caminhos do bucket privado. */
async function assinar(
  supabase: ReturnType<typeof createClient>,
  paths: (string | null)[]
): Promise<Map<string, string>> {
  const limpos = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const mapa = new Map<string, string>();
  if (limpos.length === 0) return mapa;

  const { data } = await supabase.storage
    .from("inspiracoes")
    .createSignedUrls(limpos, 60 * 10);
  for (const a of data ?? []) {
    if (a.path && a.signedUrl) mapa.set(a.path, a.signedUrl);
  }
  return mapa;
}

export const getGuiaDoEvento = cache(
  async (eventId: string): Promise<GuiaDeEstilo | null> => {
    const supabase = createClient();

    // `restricoes` e `no_guia` (126) podem não existir ainda: o PostgREST
    // recusa o select inteiro quando uma coluna falta, e o guia sumiria
    // da tela. Pede com as novas e repete sem elas se der erro.
    const COLUNAS_BASE = `id, event_id, evento_decisao_id, nome, sensacao,
      situacao, aprovado_em, aprovado_nome, papelaria_fontes,
      papelaria_nome_casal, papelaria_data, papelaria_local, papelaria_nota`;

    const baseRes = await supabase
      .from("evento_guia_estilo")
      .select(`${COLUNAS_BASE}, restricoes`)
      .eq("event_id", eventId)
      .maybeSingle();
    let base: Linha | null = baseRes.data as Linha | null;
    if (baseRes.error) {
      const alt = await supabase
        .from("evento_guia_estilo")
        .select(COLUNAS_BASE)
        .eq("event_id", eventId)
        .maybeSingle();
      base = alt.data as Linha | null;
    }

    if (!base) return null;
    const g = base as Linha;
    const guiaId = g.id as string;

    const [cores, flores, materiais, trajes, referencias, historico] =
      await Promise.all([
        supabase
          .from("evento_guia_cor")
          .select("id, nome, papel, hex, nota, foto_path, ordem")
          .eq("guia_id", guiaId)
          .order("ordem"),
        supabase
          .from("evento_guia_flor")
          .select(
            "id, nome, epoca, nota, foto_path, vetada, motivo_interno, motivo_fornecedor, sensibilidade, ordem"
          )
          .eq("guia_id", guiaId)
          .order("ordem"),
        supabase
          .from("evento_guia_material")
          .select("id, nome, nota, foto_path, ordem")
          .eq("guia_id", guiaId)
          .order("ordem"),
        supabase
          .from("evento_guia_traje")
          .select("id, papel, hex, descricao")
          .eq("guia_id", guiaId),
        // as referências são as inspirações do evento — mesma tabela de sempre
        supabase
          .from("evento_inspiracao")
          .select("id, assunto, legenda, autor, storage_path, origem, no_guia")
          .eq("event_id", eventId)
          .order("created_at")
          .then((r) =>
            r.error
              ? supabase
                  .from("evento_inspiracao")
                  .select("id, assunto, legenda, autor, storage_path, origem")
                  .eq("event_id", eventId)
                  .order("created_at")
              : r
          ),
        supabase
          .from("evento_guia_historico")
          .select("id, tipo, texto, created_at")
          .eq("guia_id", guiaId)
          .order("created_at", { ascending: false }),
      ]);

    const linhasCor = (cores.data ?? []) as Linha[];
    const linhasFlor = (flores.data ?? []) as Linha[];
    const linhasMat = (materiais.data ?? []) as Linha[];
    const linhasRef = (referencias.data ?? []) as Linha[];

    const urls = await assinar(supabase, [
      ...linhasCor.map((c) => c.foto_path as string | null),
      ...linhasFlor.map((f) => f.foto_path as string | null),
      ...linhasMat.map((m) => m.foto_path as string | null),
      ...linhasRef.map((r) => r.storage_path as string | null),
    ]);

    return {
      id: guiaId,
      eventId: g.event_id as string,
      decisaoId: (g.evento_decisao_id as string) ?? null,
      nome: g.nome as string,
      sensacao: (g.sensacao as string) ?? null,
      situacao: g.situacao as GuiaDeEstilo["situacao"],
      aprovadoEm: (g.aprovado_em as string) ?? null,
      aprovadoNome: (g.aprovado_nome as string) ?? null,
      restricoes: (g.restricoes as string) ?? null,
      papelaria: {
        fontes: (g.papelaria_fontes as string) ?? null,
        nomeCasal: (g.papelaria_nome_casal as string) ?? null,
        data: (g.papelaria_data as string) ?? null,
        local: (g.papelaria_local as string) ?? null,
        nota: (g.papelaria_nota as string) ?? null,
      },
      cores: linhasCor.map((c) => ({
        id: c.id as string,
        nome: c.nome as string,
        papel: c.papel as PapelCor,
        hex: c.hex as string,
        nota: (c.nota as string) ?? null,
        fotoPath: (c.foto_path as string) ?? null,
        fotoUrl: urls.get(c.foto_path as string) ?? null,
        ordem: (c.ordem as number) ?? 0,
      })),
      flores: linhasFlor.map((f) => ({
        id: f.id as string,
        nome: f.nome as string,
        epoca: (f.epoca as string) ?? null,
        nota: (f.nota as string) ?? null,
        fotoPath: (f.foto_path as string) ?? null,
        fotoUrl: urls.get(f.foto_path as string) ?? null,
        vetada: Boolean(f.vetada),
        motivoInterno: (f.motivo_interno as string) ?? null,
        motivoFornecedor: (f.motivo_fornecedor as string) ?? null,
        sensibilidade: f.sensibilidade as "normal" | "alergia",
        ordem: (f.ordem as number) ?? 0,
      })),
      materiais: linhasMat.map((m) => ({
        id: m.id as string,
        nome: m.nome as string,
        nota: (m.nota as string) ?? null,
        fotoPath: (m.foto_path as string) ?? null,
        fotoUrl: urls.get(m.foto_path as string) ?? null,
        ordem: (m.ordem as number) ?? 0,
      })),
      trajes: ((trajes.data ?? []) as Linha[]).map((t) => ({
        id: t.id as string,
        papel: t.papel as "madrinhas" | "padrinhos",
        hex: (t.hex as string) ?? null,
        descricao: (t.descricao as string) ?? null,
      })),
      referencias: linhasRef.map((r) => ({
        id: r.id as string,
        assunto: r.assunto as string,
        agradou: (r.legenda as string) ?? null,
        autor: (r.autor as string) ?? null,
        fotoUrl: urls.get(r.storage_path as string) ?? null,
        storagePath: r.storage_path as string,
        origem: r.origem as "cliente" | "equipe",
        noGuia: Boolean(r.no_guia),
      })),
      historico: ((historico.data ?? []) as Linha[]).map((h) => ({
        id: h.id as string,
        tipo: h.tipo as GuiaDeEstilo["historico"][number]["tipo"],
        texto: h.texto as string,
        quando: h.created_at as string,
      })),
    };
  }
);

/** A biblioteca da empresa + o acervo do sistema. */
export const getPaletas = cache(async (): Promise<PaletaDaBiblioteca[]> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("paleta_biblioteca")
    .select(
      "id, nome, sensacao, empresa_id, ordem, paleta_biblioteca_cor(id, nome, papel, hex, ordem)"
    )
    .order("ordem");

  return ((data ?? []) as Linha[]).map((p) => ({
    id: p.id as string,
    nome: p.nome as string,
    sensacao: (p.sensacao as string) ?? null,
    doSistema: p.empresa_id === null,
    cores: ((p.paleta_biblioteca_cor as Linha[]) ?? [])
      .map((c) => ({
        id: c.id as string,
        nome: c.nome as string,
        papel: c.papel as PapelCor,
        hex: c.hex as string,
        ordem: (c.ordem as number) ?? 0,
      }))
      .sort((a, b) => a.ordem - b.ordem),
  }));
});

/** Com quem o guia já foi compartilhado, e que fatia cada um recebeu. */
export const getCompartilhamentos = cache(
  async (
    guiaId: string
  ): Promise<
    { id: string; supplierId: string; nome: string; secoes: string[]; hash: string }[]
  > => {
    const supabase = createClient();
    const { data } = await supabase
      .from("guia_compartilhamento")
      .select("id, supplier_id, secoes, hash, suppliers(name)")
      .eq("guia_id", guiaId);

    return ((data ?? []) as Linha[]).map((c) => ({
      id: c.id as string,
      supplierId: c.supplier_id as string,
      nome: (c.suppliers as { name: string } | null)?.name ?? "",
      secoes: (c.secoes as string[]) ?? [],
      hash: c.hash as string,
    }));
  }
);
