// Gestão de contas: cada empresa do sistema, com uso real, assinatura e
// as duas alavancas do dono — editar a assinatura e banir/reativar.

import { getContas } from "@/lib/supabase/admin-painel";
import { getCatalogoDePlanos, reais, tetoEmTexto } from "@/lib/planos";
import { TabelaContas, type OpcaoDePlano } from "./TabelaContas";

export const dynamic = "force-dynamic";

export default async function AdminContasPage() {
  const [contas, catalogo] = await Promise.all([getContas(), getCatalogoDePlanos()]);

  // O rótulo é montado AQUI, no servidor: a tabela é client e não pode
  // puxar @/lib/planos (ele lê cookies via next/headers). Ela recebe só
  // texto e número, já prontos para o <select>.
  const planos: OpcaoDePlano[] = [
    ...catalogo.map((p) => ({
      codigo: p.codigo,
      rotulo: `${p.nome} — ${reais(p.valorMensal)} · ${tetoEmTexto(p.eventosEmAndamento)} eventos · ${tetoEmTexto(p.logins)} ${p.logins === 1 ? "login" : "logins"}`,
      valorMensal: p.valorMensal,
    })),
    // Os dois herdados da 147: fora do catálogo, sem teto, preço à mão.
    { codigo: "cortesia", rotulo: "Cortesia — sem limite", valorMensal: null },
    { codigo: "piloto", rotulo: "Piloto — sem limite", valorMensal: null },
  ];

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
      <TabelaContas contas={contas} planos={planos} />
    </div>
  );
}
