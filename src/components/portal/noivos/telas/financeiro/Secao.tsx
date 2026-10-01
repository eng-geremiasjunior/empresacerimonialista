// Financeiro (desenho v4, README §15: "esconder para quem não tem
// permissão"). Componente de SERVIDOR: lê o portal_investimento pela
// sessão da família. Quem decide quem vê é o banco — a 189 embrulha a
// RPC com portal_pode(evento, 'financeiro'), que só abre para o nível
// "casal"; para os outros ela devolve null e a tela some (volta para a
// Visão geral). O que aparece é só o dinheiro dos fornecedores: o valor
// do contrato com a assessoria, o termo e o CPF nunca passam por aqui.

import { redirect } from "next/navigation";
import { getInvestimento } from "@/lib/supabase/portal";
import { hojeBR } from "@/lib/tempo";
import { montarFinanceiro } from "./montar";
import { TelaFinanceiro } from "./TelaFinanceiro";

export async function FinanceiroSecao({ eventoId }: { eventoId: string }) {
  const investimento = await getInvestimento(eventoId);
  if (!investimento) redirect(`/portal/${eventoId}`);
  return <TelaFinanceiro resumo={montarFinanceiro(investimento, hojeBR())} />;
}
