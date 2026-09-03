import "./acesso.css";
import { createClient } from "@/lib/supabase/server";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";

// Porta de entrada do Portal da Cliente. Pública no middleware.
// Neutra de propósito: neste momento o sistema ainda não sabe de quem ela
// é cliente, então nenhuma marca de cerimonialista aparece aqui — a marca
// entra depois do login, dentro do portal.
export const metadata = { title: "Entrar — eOrganizei" };
export const dynamic = "force-dynamic";

export default async function PortalEntrarPage({
  searchParams,
}: {
  searchParams?: { erro?: string };
}) {
  // O navegador guarda UMA sessão por domínio: entrar aqui derruba quem
  // já estava logado. Sem aviso, a cerimonialista que abre o portal para
  // conferir perde a própria sessão e acha que o sistema se confundiu.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ehEquipe = Boolean(user) && user?.app_metadata?.portal !== true;

  return (
    <PortalLoginForm
      erroInicial={searchParams?.erro}
      sessaoAtual={ehEquipe ? (user?.email ?? null) : null}
    />
  );
}
