import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { newsreader } from "@/lib/planos-do-site";
import { PAGINAS_POR_FUNCIONALIDADE } from "@/lib/site-paginas";
import { PaginaDoSite } from "@/components/site/PaginaDoSite";
import { Medicao } from "@/components/marketing/Medicao";
import { Origem } from "@/components/marketing/Origem";
import { MedirCliques } from "@/components/marketing/MedirCliques";

// Uma página por funcionalidade (site navegável, 27/09/2026): Roteiro do
// dia e fornecedores, Portal da família, Planejamento e Financeiro. O
// conteúdo mora em lib/site-paginas.ts.

export const dynamicParams = false;

export function generateStaticParams() {
  return PAGINAS_POR_FUNCIONALIDADE.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = PAGINAS_POR_FUNCIONALIDADE.find((x) => x.slug === params.slug);
  return p ? { title: p.meta.titulo, description: p.meta.descricao } : {};
}

export default function PaginaPorFuncionalidade({ params }: { params: { slug: string } }) {
  const p = PAGINAS_POR_FUNCIONALIDADE.find((x) => x.slug === params.slug);
  if (!p) notFound();
  return (
    <div className={newsreader.variable}>
      <PaginaDoSite p={p} />
      <Origem />
      <MedirCliques />
      <Medicao />
    </div>
  );
}
