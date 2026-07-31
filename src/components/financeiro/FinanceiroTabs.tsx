"use client";

// Sub-abas do financeiro do evento (063). Assessoria é a padrão e mostra
// exatamente a tela que já existia — só filtrada pela conta. Fornecedores
// é a parte nova.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AbaFornecedores } from "@/components/financeiro/AbaFornecedores";
import type {
  ParcelaFornecedor,
  VerbaFornecedor,
} from "@/lib/verba-fornecedores";

export function FinanceiroTabs({
  eventId,
  assessoria,
  verbas,
  parcelasFornecedor,
  fornecedoresDisponiveis,
  migracaoPendente,
}: {
  eventId: string;
  assessoria: React.ReactNode;
  verbas: VerbaFornecedor[];
  parcelasFornecedor: ParcelaFornecedor[];
  fornecedoresDisponiveis: { id: string; name: string }[];
  migracaoPendente: boolean;
}) {
  const [aba, setAba] = useState<"assessoria" | "fornecedores">("assessoria");
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-gray-200">
        {(
          [
            ["assessoria", "Assessoria"],
            ["fornecedores", "Fornecedores"],
          ] as const
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            onClick={() => setAba(chave)}
            aria-current={aba === chave ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              aba === chave
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "assessoria" ? (
        assessoria
      ) : (
        <AbaFornecedores
          eventId={eventId}
          verbas={verbas}
          parcelas={parcelasFornecedor}
          fornecedoresDisponiveis={fornecedoresDisponiveis}
          migracaoPendente={migracaoPendente}
          onMudou={() => router.refresh()}
        />
      )}
    </div>
  );
}
