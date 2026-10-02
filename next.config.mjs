/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite validar `next build` localmente sem colidir com o .next do
  // dev server em execução (NEXT_DIST_DIR=.next-build npx next build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // O convite animado mora no endereço do site (/c/<endereço>/convite),
  // mas é outra página, sem o layout nem o CSS do site: por dentro, o
  // endereço é reescrito para /convites/publico/<endereço> (o navegador
  // continua mostrando o /c/…).
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/c/:slug/convite", destination: "/convites/publico/:slug" },
        // a lista de presentes (197), do mesmo jeito: outra página, longe do CSS do site
        { source: "/c/:slug/presentes", destination: "/presentes/:slug" },
      ],
    };
  },
};

export default nextConfig;
