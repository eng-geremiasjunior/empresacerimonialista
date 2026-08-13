import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalSenhaForm } from "@/components/portal/PortalSenhaForm";
import "../entrar/acesso.css";

export const metadata = { title: "Nova senha — Vela" };

// Destino do link de "esqueci minha senha", depois que /auth/confirm troca
// o token por sessão. Sem sessão não há o que redefinir.
export default async function RedefinirPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/entrar");

  return <PortalSenhaForm modo="redefinir" />;
}
