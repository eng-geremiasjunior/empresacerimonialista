import type { Metadata } from "next";
import { newsreader, planosDoSite } from "@/lib/planos-do-site";
import { SiteModelo2 } from "@/components/planos/SiteModelo2";
import { Medicao } from "@/components/marketing/Medicao";
import { Origem } from "@/components/marketing/Origem";
import { MedirCliques } from "@/components/marketing/MedirCliques";
import { PlanosModelo1 } from "./Modelo1";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "eorganizei — a gestão dos seus eventos, em um só lugar",
  description:
    "O sistema das cerimonialistas e assessorias de eventos. No dia do evento, cada fornecedor sabe a hora dele — e você sabe de tudo.",
};

// A página de vendas — e o destino do anúncio pago.
//
// Desde 23/09/2026 a padrão é o MODELO 2, o desenho novo do dono
// (SiteModelo2: hero com o celular do fornecedor, tour de 6 passos,
// evento de teste, planos). O modelo 1, a página anterior, continua em
// /planos?modelo=1.
//
// Desde 27/09/2026 a home (/) é o site navegável, com a mesma base; esta
// página fica como está porque é o destino dos anúncios.
export default async function PlanosPage({
  searchParams,
}: {
  searchParams?: { modelo?: string };
}) {
  if (searchParams?.modelo === "1") return <PlanosModelo1 />;

  const { planos, hrefConta, hrefPlano } = await planosDoSite();

  return (
    <div className={newsreader.variable}>
      <SiteModelo2 planos={planos} hrefConta={hrefConta} hrefPlano={hrefPlano} />
      {/* a marca do anúncio guardada na primeira tela */}
      <Origem />
      {/* toda âncora desta página vira evento medido */}
      <MedirCliques />
      <Medicao />
    </div>
  );
}
