import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirEmpresaDoUsuario, getMeuCargo } from "@/lib/supabase/equipe";
import { getEventosAtencaoCount } from "@/lib/supabase/eventos-list";
import { AppShell } from "@/components/AppShell";
import { TaskNotifications } from "@/components/TaskNotifications";
import { signOut } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Cliente do Portal nunca entra na área profissional — e o redirect vem
  // ANTES do provisionamento: sem isso ela ganharia uma empresa vazia e
  // viraria "proprietária" de um sistema que não é dela. O middleware já
  // barra antes; aqui é a segunda tranca, para o caso de a rota ser
  // alcançada por outro caminho.
  if (user.app_metadata?.portal === true) {
    redirect("/portal");
  }

  let { cargo } = await getMeuCargo();

  // Usuário logado sem equipe (signup novo do zero): provisiona a empresa
  // própria e relê o cargo. Idempotente; não afeta membros convidados.
  if (cargo === null) {
    await garantirEmpresaDoUsuario();
    ({ cargo } = await getMeuCargo());
  }

  const atencaoCount = await getEventosAtencaoCount().catch(() => 0);

  return (
    <>
      <AppShell
        userEmail={user.email ?? ""}
        cargo={cargo}
        atencaoCount={atencaoCount}
        avatarUrl={
          ((user.user_metadata as { avatar_url?: string | null } | null)
            ?.avatar_url as string | null) ?? null
        }
        signOut={signOut}
      >
        {children}
      </AppShell>
      <TaskNotifications />
    </>
  );
}
