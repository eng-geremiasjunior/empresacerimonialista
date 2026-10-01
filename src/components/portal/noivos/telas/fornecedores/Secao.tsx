// Fornecedores — "Quem vai fazer o dia acontecer" (desenho v4, README
// §11). Componente de SERVIDOR: lê pela sessão da família (a RLS e as
// RPCs da 189 decidem o que cada um vê) e entrega só dados simples à
// tela (cliente). As parcelas servem só para saber se falta o sinal: o
// valor fica aqui no servidor.

import { getContatoCerimonialista, getInvestimento } from "@/lib/supabase/portal";
import { getFornecedoresDoPortal } from "@/lib/supabase/portal-fornecedores";
import { getCuradoriasDoPortal } from "@/lib/supabase/curadoria";
import { hojeBR } from "@/lib/tempo";
import { montarCartoes } from "./montar";
import { TelaFornecedores } from "./TelaFornecedores";

export async function FornecedoresSecao({ eventoId }: { eventoId: string }) {
  const [{ daCerimonialista, daFamilia }, contato, curadorias, investimento] = await Promise.all([
    getFornecedoresDoPortal(eventoId),
    getContatoCerimonialista(eventoId),
    getCuradoriasDoPortal(eventoId),
    getInvestimento(eventoId),
  ]);

  const cartoes = montarCartoes({
    daCerimonialista,
    daFamilia,
    curadorias,
    parcelas: investimento?.parcelas ?? [],
    hoje: hojeBR(),
  });

  return <TelaFornecedores cartoes={cartoes} whatsCerimonialista={contato.whatsapp} />;
}
