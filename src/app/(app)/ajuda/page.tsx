import { AjudaTela } from "@/components/ajuda/AjudaTela";

// O onboarding que não exige ligação: as perguntas da primeira semana,
// com resposta curta e o caminho de clique. O conteúdo mora em
// src/lib/ajuda-conteudo.ts.

export const metadata = { title: "Ajuda — eOrganizei" };

export default function AjudaPage() {
  return <AjudaTela />;
}
