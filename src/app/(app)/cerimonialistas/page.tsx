// Painel de Equipe (Etapa 5): indicadores reais no topo + grid de cards
// com status calculado dos eventos. Cadastro/edição só da proprietária;
// coordenadora visualiza (readOnly). Cerimonialista/assistente: bloqueado.

import { createClient } from "@/lib/supabase/server";
import { getMeuCargo } from "@/lib/supabase/equipe";
import {
  calcularIndicadores,
  getEquipeComStatus,
  type MembroComStatus,
} from "@/lib/supabase/cerimonialistas";
import { IndicadoresEquipe } from "@/components/cerimonialistas/IndicadoresEquipe";
import { EquipePainel } from "@/components/cerimonialistas/EquipePainel";

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

  let equipe: MembroComStatus[];
  try {
    equipe = await getEquipeComStatus();
  } catch {
    equipe = [];
  }

  // Migração pendente (021) ou empresa vazia: equipe sem registros.
  if (equipe.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Cerimonialistas
          </h1>
          <p className="text-sm text-gray-500">
            Gerencie quem administra os eventos da sua empresa
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Equipe indisponível — verifique se as migrações multiusuário (021+)
          foram aplicadas no Supabase.
        </div>
      </div>
    );
  }

  const indicadores = calcularIndicadores(equipe);

  // Só a dona da empresa gerencia (cadastra/edita/desativa).
  const { data: empresaPropriedade } = await supabase
    .from("empresas")
    .select("id")
    .eq("owner_user_id", user?.id ?? "")
    .maybeSingle();
  const readOnly = !empresaPropriedade;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Cerimonialistas</h1>
        <p className="text-sm text-gray-500">
          {readOnly
            ? "Equipe da empresa (visualização)"
            : "Gerencie quem administra os eventos da sua empresa"}
        </p>
      </div>

      <IndicadoresEquipe dados={indicadores} />

      <EquipePainel
        equipe={equipe}
        currentUserId={user?.id ?? null}
        readOnly={readOnly}
      />
    </div>
  );
}
