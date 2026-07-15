// Gestão da equipe: cadastro/edição pela proprietária; coordenadora
// visualiza a equipe (somente leitura); demais cargos não acessam.

import { createClient } from "@/lib/supabase/server";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { CerimonialistasTable } from "@/components/cerimonialistas/CerimonialistasTable";
import type { MembroEquipe } from "@/lib/equipe-shared";

export default async function CerimonialistasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { cargo } = await getMeuCargo();

  if (cargo !== null && cargo !== "proprietaria" && cargo !== "coordenadora") {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Cerimonialistas
          </h1>
        </div>
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          A gestão da equipe é exclusiva da proprietária e da coordenação.
        </div>
      </div>
    );
  }

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

  // Só a dona da empresa gerencia (cadastra/edita/desativa).
  const { data: empresaPropriedade } = await supabase
    .from("empresas")
    .select("id")
    .eq("owner_user_id", user?.id ?? "")
    .maybeSingle();
  const podeGerenciar = Boolean(empresaPropriedade);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Cerimonialistas</h1>
        <p className="text-sm text-gray-500">
          {podeGerenciar
            ? "Gerencie quem administra os eventos da sua empresa"
            : "Equipe da empresa (visualização)"}
        </p>
      </div>

      {migrationPendente ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Esta tela precisa da migração{" "}
          <code>supabase/migrations/021_fundacao_empresas_equipe.sql</code> no
          SQL Editor do Supabase.
        </div>
      ) : membros.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          A gestão da equipe é exclusiva da proprietária da empresa.
        </div>
      ) : (
        <CerimonialistasTable
          membros={membros}
          currentUserId={user?.id ?? null}
          readOnly={!podeGerenciar}
        />
      )}
    </div>
  );
}
