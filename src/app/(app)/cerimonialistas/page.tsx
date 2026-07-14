// Gestão da equipe (Etapa 2 da transição multiusuário): listagem e
// cadastro de cerimonialistas com criação de login pela proprietária.
// Permissões de visibilidade de dados virão na Etapa 4.

import { createClient } from "@/lib/supabase/server";
import { CerimonialistasTable } from "@/components/cerimonialistas/CerimonialistasTable";
import type { MembroEquipe } from "@/lib/equipe-shared";

export default async function CerimonialistasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("membros_equipe")
    .select(
      "id, empresa_id, user_id, nome, email, cargo, especialidades, status, is_owner, created_at"
    )
    .order("is_owner", { ascending: false })
    .order("created_at", { ascending: true });

  const migrationPendente =
    error?.code === "42P01" || error?.code === "PGRST205";
  const membros = (data ?? []) as MembroEquipe[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Cerimonialistas</h1>
        <p className="text-sm text-gray-500">
          Gerencie quem administra os eventos da sua empresa
        </p>
      </div>

      {migrationPendente ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Esta tela precisa da migração{" "}
          <code>supabase/migrations/021_fundacao_empresas_equipe.sql</code> no
          SQL Editor do Supabase.
        </div>
      ) : (
        <CerimonialistasTable
          membros={membros}
          currentUserId={user?.id ?? null}
        />
      )}
    </div>
  );
}
