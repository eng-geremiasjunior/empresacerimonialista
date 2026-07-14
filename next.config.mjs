/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite validar `next build` localmente sem colidir com o .next do
  // dev server em execução (NEXT_DIST_DIR=.next-build npx next build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
