import type { ReactNode } from "react";
import { possoUsar } from "@/lib/supabase/nivel-do-plano";
import { DisponivelNoPlano } from "@/components/plano-recurso/DisponivelNoPlano";

// O relatório comercial é do Profissional para cima (planos por recurso, 09/10/2026): fora dele,
// o aviso no lugar da tela. Na dúvida (leitura que falhou), abre.
export default async function Layout({ children }: { children: ReactNode }) {
  if (!(await possoUsar("relatorio"))) return <DisponivelNoPlano recurso="relatorio" />;
  return <>{children}</>;
}
