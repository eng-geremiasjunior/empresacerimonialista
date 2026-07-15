import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMeuCargo } from "@/lib/supabase/equipe";
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

  const { cargo } = await getMeuCargo();

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
