import { getEstoque } from "@/lib/supabase/estoque";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { EstoqueTela } from "@/components/estoque/EstoqueTela";
import { SubNav } from "@/components/SubNav";
import { VISOES_ESTOQUE } from "@/lib/visoes";
import { CARGOS_QUE_ESCREVEM } from "@/lib/estoque-core";
import { hojeBR } from "@/lib/tempo";

export const metadata = { title: "Estoque" };

// A tela filtra no cliente, então o servidor entrega a lista inteira uma
// vez — e por isso ela precisa ser sempre fresca.
export const dynamic = "force-dynamic";

export default async function EstoquePage({ searchParams }: { searchParams?: { i?: string } }) {
  const [estoque, { cargo }] = await Promise.all([getEstoque(), getMeuCargo()]);

  // Assistente LÊ (RLS 184) mas não escreve — e as policies de UPDATE só
  // têm USING: a recusa volta com zero linhas e SEM erro. Botão que falha
  // calado é pior que botão ausente.
  const podeEscrever = (CARGOS_QUE_ESCREVEM as readonly string[]).includes(cargo ?? "");

  return (
    <div className="space-y-4">
      <SubNav itens={VISOES_ESTOQUE} cargo={cargo} />
      <EstoqueTela
        categorias={estoque.categorias}
        itens={estoque.itens}
        hoje={hojeBR()}
        podeEscrever={podeEscrever}
        migracaoPendente={estoque.migracaoPendente}
        selecionadoInicial={searchParams?.i ?? null}
      />
    </div>
  );
}
