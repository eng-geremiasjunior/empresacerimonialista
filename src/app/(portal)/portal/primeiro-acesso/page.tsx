import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalSenhaForm } from "@/components/portal/PortalSenhaForm";
import "../entrar/acesso.css";

export const metadata = { title: "Primeiro acesso — eOrganizei" };

// Rota AUTENTICADA (não é pública): quem chega aqui já entrou com a senha
// provisória que a cerimonialista passou. O middleware prende a navegação
// nesta tela enquanto a flag existir.
export default async function PrimeiroAcessoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/entrar");
  if (user.app_metadata?.portal !== true) redirect("/eventos/dashboard");
  // Já trocou a senha: não há o que fazer aqui.
  if (user.app_metadata?.senha_provisoria !== true) redirect("/portal");

  return <PortalSenhaForm modo="primeiro" />;
}
