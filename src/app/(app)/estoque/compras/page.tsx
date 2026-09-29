import { getCompras, getEstoque } from "@/lib/supabase/estoque";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { ComprasTela } from "@/components/estoque/ComprasTela";
import { SubNav } from "@/components/SubNav";
import { VISOES_ESTOQUE } from "@/lib/visoes";
import { CARGOS_QUE_ESCREVEM } from "@/lib/estoque-core";

export const metadata = { title: "Compras do estoque" };
export const dynamic = "force-dynamic";

export default async function EstoqueComprasPage() {
  const [{ compras, migracaoPendente }, estoque, { cargo, empresaId }] = await Promise.all([getCompras(), getEstoque(), getMeuCargo()]);
  const podeEscrever = (CARGOS_QUE_ESCREVEM as readonly string[]).includes(cargo ?? "");
  return (
    <div className="space-y-4">
      <SubNav itens={VISOES_ESTOQUE} cargo={cargo} />
      <ComprasTela
        compras={compras}
        categorias={estoque.categorias}
        itens={estoque.itens}
        empresaId={empresaId ?? null}
        podeEscrever={podeEscrever}
        migracaoPendente={migracaoPendente || estoque.migracaoPendente}
      />
    </div>
  );
}
