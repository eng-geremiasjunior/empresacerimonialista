import type { Metadata } from "next";
import { SiteDaHome } from "@/components/site/SiteDaHome";
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
// Desde 27/09/2026 é o SITE NAVEGÁVEL (SiteDaHome), o mesmo da raiz:
// "pode ficar em planos mesmo, nos dois" (dono).
export default async function PlanosPage({
  searchParams,
}: {
  searchParams?: { modelo?: string };
}) {
  if (searchParams?.modelo === "1") return <PlanosModelo1 />;

  return <SiteDaHome />;
}
