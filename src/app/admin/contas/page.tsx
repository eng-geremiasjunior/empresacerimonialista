// Gestão de contas: cada empresa do sistema, com uso real, assinatura e
// as duas alavancas do dono — editar a assinatura e banir/reativar.

import { getContas } from "@/lib/supabase/admin-painel";
import { TabelaContas } from "./TabelaContas";

export const dynamic = "force-dynamic";

export default async function AdminContasPage() {
  const contas = await getContas();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Contas</h1>
        <p className="mt-1 text-sm text-stone-500">
          {contas.length} {contas.length === 1 ? "empresa" : "empresas"} no
          sistema. Banir suspende todos os logins da conta e derruba as
          sessões; nada é apagado.
        </p>
      </div>
      <TabelaContas contas={contas} />
    </div>
  );
}
