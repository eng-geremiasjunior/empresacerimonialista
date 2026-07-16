import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirEmpresaDoUsuario, getMeuCargo } from "@/lib/supabase/equipe";
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

  let { cargo } = await getMeuCargo();

  // Usuário logado sem equipe (signup novo do zero): provisiona a empresa
  // própria e relê o cargo. Idempotente; não afeta membros convidados.
  if (cargo === null) {
    await garantirEmpresaDoUsuario();
    ({ cargo } = await getMeuCargo());
  }

  return (
    <>
      <AppShell
        userEmail={user.email ?? ""}
        cargo={cargo}
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
