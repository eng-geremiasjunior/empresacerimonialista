import type { ReactNode } from "react";
import { possoUsar } from "@/lib/supabase/nivel-do-plano";
import { DisponivelNoPlano } from "@/components/plano-recurso/DisponivelNoPlano";

// A confirmação de presença é dos planos pagos (204, 09/10/2026): no
// Gratuito, o aviso no lugar da aba. Na dúvida (leitura que falhou), abre.
export default async function Layout({ children }: { children: ReactNode }) {
  if (!(await possoUsar("rsvp"))) return <DisponivelNoPlano recurso="rsvp" />;
  return <>{children}</>;
}
