// A página pública da cerimonialista — o editor.
//
// Visão da Gestão comercial, ao lado de Propostas e do Catálogo: é o começo do
// caminho comercial (Página → Pedido → Proposta → Aceite → Evento). Só a
// proprietária entra, pela mesma régua do Catálogo: é a cara da empresa
// lá fora.

import Link from "next/link";
import { SubNav } from "@/components/SubNav";
import { VISOES_ORCAMENTOS } from "@/lib/visoes";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-url";
import { EditorPagina } from "@/components/comercial/pagina/EditorPagina";
import { modeloDaVitrine, type ServicoDaPagina } from "@/lib/comercial/pagina-publica";
import { paletaDaVitrine } from "@/lib/comercial/paletas";
import type { EventType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vitrine profissional — eorganizei" };

export default async function PaginaPublicaEditorPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: cargoData } = await supabase.rpc("meu_cargo");
  const cargo = (cargoData as { empresa_id: string; cargo: string }[] | null)?.[0];

  if (cargo?.cargo !== "proprietaria") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <SubNav itens={VISOES_ORCAMENTOS} cargo={cargo?.cargo ?? null} />
        <h1 className="text-xl font-semibold text-gray-900">Vitrine profissional</h1>
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Só a proprietária edita a vitrine da empresa.
        </p>
      </div>
    );
  }

  const empresaId = cargo.empresa_id;
  // retrato, paleta e vídeo são da 165 reaplicada em 18/09/2026: sem as
  // colunas, o editor continua de pé, só sem eles
  const COLUNAS =
    "slug, publicada, publicada_em, titulo, posicionamento, para_quem, cidade, tipos_atendidos, servicos, motivos, whatsapp, instagram, pixel_meta, modelo";
  const lerPagina = async () => {
    const ler = (extras: string) =>
      supabase.from("empresa_pagina").select(`${COLUNAS}${extras}`).eq("empresa_id", empresaId).maybeSingle();
    const tudo = await ler(", retrato_url, paleta, video_url, video_capa_url");
    if (!tudo.error) return tudo;
    const comRetrato = await ler(", retrato_url");
    if (!comRetrato.error) return comRetrato;
    return ler("");
  };
  const [empresaRes, paginaRes, fotosRes, depoimentosRes, catalogoRes, slugsRes] =
    await Promise.all([
      supabase.from("empresas").select("nome, logo_url").eq("id", empresaId).maybeSingle(),
      lerPagina(),
      supabase
        .from("portfolio_fotos")
        .select("id, url, legenda, tipo_evento, na_pagina")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("tipo_evento")
        .order("ordem")
        .order("created_at"),
      supabase
        .from("empresa_depoimentos")
        .select("id, texto, autor, contexto, na_pagina")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("ordem")
        .order("created_at"),
      // o WhatsApp que ela já cadastrou nas propostas, para não pedir de novo
      supabase
        .from("empresa_conteudo_institucional")
        .select("whatsapp_contato")
        .eq("empresa_id", empresaId)
        .not("whatsapp_contato", "is", null)
        .limit(1),
      supabase.from("empresa_pagina_slug").select("slug").eq("empresa_id", empresaId),
    ]);

  if (paginaRes.error || fotosRes.error || depoimentosRes.error) {
    console.error(
      "[eorg:pagina] leitura:",
      paginaRes.error?.message ?? fotosRes.error?.message ?? depoimentosRes.error?.message
    );
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <SubNav itens={VISOES_ORCAMENTOS} cargo={cargo.cargo} />
        <h1 className="text-xl font-semibold text-gray-900">Vitrine profissional</h1>
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Esta parte ainda não está disponível. Avise a gente.
        </p>
      </div>
    );
  }

  const pag = paginaRes.data as {
    slug: string | null;
    publicada: boolean;
    publicada_em: string | null;
    titulo: string | null;
    posicionamento: string | null;
    para_quem: string | null;
    cidade: string | null;
    tipos_atendidos: string[] | null;
    servicos: ServicoDaPagina[] | null;
    motivos: string[] | null;
    whatsapp: string | null;
    instagram: string | null;
    pixel_meta: string | null;
    modelo: string | null;
    retrato_url?: string | null;
    paleta?: string | null;
    video_url?: string | null;
    video_capa_url?: string | null;
  } | null;

  const whatsappDoCatalogo =
    ((catalogoRes.data ?? [])[0] as { whatsapp_contato: string | null } | undefined)
      ?.whatsapp_contato ?? null;

  const fotos = ((fotosRes.data ?? []) as {
    id: string;
    url: string;
    legenda: string | null;
    tipo_evento: EventType;
    na_pagina: boolean;
  }[]).map((f) => ({
    id: f.id,
    url: f.url,
    legenda: f.legenda,
    tipo: f.tipo_evento,
    naPagina: f.na_pagina,
  }));

  const depoimentos = ((depoimentosRes.data ?? []) as {
    id: string;
    texto: string;
    autor: string;
    contexto: string | null;
    na_pagina: boolean;
  }[]).map((d) => ({
    id: d.id,
    texto: d.texto,
    autor: d.autor,
    contexto: d.contexto,
    naPagina: d.na_pagina,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SubNav itens={VISOES_ORCAMENTOS} cargo={cargo.cargo} />
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Vitrine profissional</h1>
        <p className="text-sm text-gray-500">
          O endereço para divulgar o seu trabalho e receber pedidos de orçamento
        </p>
      </div>

      <EditorPagina
        base={appUrl()}
        empresaId={empresaId}
        nomeEmpresa={empresaRes.data?.nome ?? ""}
        logoUrl={(empresaRes.data?.logo_url as string | null) ?? null}
        emailAviso={user?.email ?? null}
        enderecosUsados={(slugsRes.data ?? []).length}
        whatsappSugerido={whatsappDoCatalogo}
        inicial={{
          slug: pag?.slug ?? null,
          publicada: pag?.publicada ?? false,
          publicadaEm: pag?.publicada_em ?? null,
          titulo: pag?.titulo ?? "",
          posicionamento: pag?.posicionamento ?? "",
          paraQuem: pag?.para_quem ?? "",
          cidade: pag?.cidade ?? "",
          tipos: ((pag?.tipos_atendidos ?? []) as EventType[]),
          servicos: pag?.servicos ?? [],
          motivos: pag?.motivos ?? [],
          whatsapp: pag?.whatsapp ?? "",
          instagram: pag?.instagram ?? "",
          pixelMeta: pag?.pixel_meta ?? "",
          modelo: modeloDaVitrine(pag?.modelo),
          retratoUrl: pag?.retrato_url ?? null,
          paleta: paletaDaVitrine(pag?.paleta),
          video: pag?.video_url ? { url: pag.video_url, capaUrl: pag.video_capa_url ?? null } : null,
        }}
        fotos={fotos}
        depoimentos={depoimentos}
      />

      <p className="text-xs text-gray-400">
        Fotos e depoimentos são cadastrados no{" "}
        <Link href="/catalogo" className="underline hover:text-gray-600">
          Catálogo
        </Link>
        ; a logo, em{" "}
        <Link href="/configuracoes" className="underline hover:text-gray-600">
          Configurações
        </Link>
        .
      </p>
    </div>
  );
}
