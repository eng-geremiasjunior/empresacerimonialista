import type { MetadataRoute } from "next";

// O manifesto do aplicativo — UM só, com a nossa marca.
//
// Decisão do dono (04/09/2026): o portal é uma cortesia que a
// cerimonialista oferece à noiva, mas o produto é nosso. Um manifesto por
// empresa daria um ícone diferente para cada cerimonialista, e isso é
// complexidade sem retorno — nome, ícone e cor viram uma coisa só.
//
// start_url é /portal e não um evento: com um evento só, aquela página
// redireciona direto para ele; com dois, ela pergunta. Assim o ícone
// continua certo quando a mesma cliente tiver um segundo evento, e leva
// ao login quando a sessão expirar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "eorganizei",
    short_name: "eorganizei",
    description: "Acompanhe cada detalhe do seu evento.",
    start_url: "/portal",
    scope: "/portal",
    display: "standalone",
    orientation: "portrait",
    // o creme do portal: sem isto a barra do sistema nasce branca e
    // destoa da tela que abre embaixo dela
    background_color: "#faf7f2",
    theme_color: "#221e1b",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // o Android recorta o ícone na forma do sistema; sem uma versão
      // com folga, o "e" perde as pontas
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
