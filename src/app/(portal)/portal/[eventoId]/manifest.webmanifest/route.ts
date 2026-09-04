// O manifesto do aplicativo — um POR EVENTO, e não um para o sistema.
//
// A razão é a mesma que rege o portal inteiro: ele é MARCA BRANCA. Quem
// convidou a noiva foi a cerimonialista, não nós. Um manifesto único
// colocaria "eorganizei" no celular dela, ao lado do WhatsApp e do
// Instagram, num produto que em toda outra superfície mostra o nome de
// quem a atende. Então o nome e o ícone saem da empresa do evento, e a
// nossa marca só entra quando a cerimonialista ainda não subiu logo.
//
// start_url aponta para o próprio evento: instalado, o ícone abre no
// portal dela, já dentro do casamento — não numa tela de escolha.
//
// A RLS decide se responde: getEventoDoPortal devolve nulo para quem não
// tem vínculo, e o manifesto some junto com a página.

import { NextResponse } from "next/server";
import { getEventoDoPortal } from "@/lib/supabase/portal";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { eventoId: string } }
) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) {
    return new NextResponse("não encontrado", { status: 404 });
  }

  const nome = evento.marca?.nome?.trim() || "eorganizei";
  const logo = evento.marca?.logoUrl ?? null;

  // Sem logo da empresa, o "e" ameixa. É PNG e SVG na mesma lista porque
  // o Android aceita SVG no manifesto e o iOS não — quem não entender um
  // usa o outro.
  const icones = logo
    ? [
        { src: logo, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: logo, sizes: "512x512", type: "image/png", purpose: "any" },
      ]
    : [
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      ];

  return NextResponse.json(
    {
      name: nome,
      short_name: nome.length > 12 ? nome.slice(0, 12).trim() : nome,
      description: "Acompanhe cada detalhe do seu evento.",
      start_url: `/portal/${evento.id}`,
      scope: `/portal/${evento.id}`,
      display: "standalone",
      orientation: "portrait",
      // o creme do portal: sem isto a barra do sistema fica branca e
      // destoa da tela que abre embaixo dela
      background_color: "#faf7f2",
      theme_color: "#221e1b",
      lang: "pt-BR",
      dir: "ltr",
      icons: icones,
    },
    {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        // privado: o manifesto carrega o nome da empresa de quem atende
        // esta noiva, e não deve ficar em cache compartilhado
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    }
  );
}
