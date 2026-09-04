import type { Config } from "tailwindcss";

// A paleta da marca (identidade v1, 03/09/2026). Nomes em português
// porque é assim que a identidade os chama — quem for ler um `bg-ameixa`
// daqui a um ano encontra a mesma palavra no documento de marca.
//
// A regra que vem junto e vale mais que os hex: HIERARQUIA POR CINZA, NÃO
// POR COR. Ameixa entra com parcimônia — uma ação principal por tela,
// links e estado ativo. Sálvia confirma. Nunca áreas grandes de cor.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /** fundo da página */
        marfim: "#FAF8F5",
        /** superfície de apoio, um degrau acima do fundo */
        nevoa: "#F2EEE9",
        /** texto e fundo escuro */
        tinta: "#221E1B",
        /** texto de apoio */
        cinza: "#928A81",
        /** texto secundário, mais escuro que o de apoio */
        cinza2: "#6B6259",
        /** borda hairline */
        linha: "#E6E0D8",
        ameixa: {
          /** sobre fundo ESCURO — a versão clara do "organizei" */
          300: "#B98FAC",
          /** a cor da marca: ação principal, link, estado ativo */
          DEFAULT: "#6E3F5F",
          /** fundo de pill e halo de foco */
          50: "#F3EBF0",
        },
        salvia: {
          /** confirma — nunca decora */
          DEFAULT: "#6E7F63",
          50: "#EDF0EA",
        },
      },
    },
  },
  plugins: [],
};
export default config;
