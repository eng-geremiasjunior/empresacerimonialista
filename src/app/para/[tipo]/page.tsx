import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { newsreader } from "@/lib/planos-do-site";
import { PAGINAS_POR_EVENTO } from "@/lib/site-paginas";
import { PaginaDoSite } from "@/components/site/PaginaDoSite";
import { Medicao } from "@/components/marketing/Medicao";
import { Origem } from "@/components/marketing/Origem";
import { MedirCliques } from "@/components/marketing/MedirCliques";

// Uma página por tipo de evento (site navegável, 27/09/2026): Casamento,
// 15 anos e "Corporativo e outros". O conteúdo mora em lib/site-paginas.ts.

export const dynamicParams = false;

export function generateStaticParams() {
  return PAGINAS_POR_EVENTO.map((p) => ({ tipo: p.slug }));
}

export function generateMetadata({ params }: { params: { tipo: string } }): Metadata {
  const p = PAGINAS_POR_EVENTO.find((x) => x.slug === params.tipo);
  return p ? { title: p.meta.titulo, description: p.meta.descricao } : {};
}

export default function PaginaPorEvento({ params }: { params: { tipo: string } }) {
  const p = PAGINAS_POR_EVENTO.find((x) => x.slug === params.tipo);
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
