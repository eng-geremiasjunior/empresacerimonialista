"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { GerarParcelasModal } from "@/components/financeiro/GerarParcelasModal";
import { ListaParcelas } from "@/components/financeiro/ListaParcelas";
import type { Transacao } from "@/lib/supabase/financeiro";

export function SecaoReceitas({
  eventId,
  receitas,
  contractValue,
  entradaRegistrada,
  todayIso,
}: {
  eventId: string;
  receitas: Transacao[];
  contractValue: number | null;
  entradaRegistrada: number;
  todayIso: string;
}) {
  const [gerando, setGerando] = useState(false);

  // Ainda não há parcelas do contrato geradas (só entrada/avulsas ou nada):
  // mostra o painel de geração com destaque. Não depende da categoria da
  // entrada, que em eventos antigos do wizard ficou como "outro".
  const semParcelas = !receitas.some((t) => t.category === "contrato");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Receitas — parcelas do contrato
        </h2>
        {!gerando && !semParcelas && (
          <button
            onClick={() => setGerando(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <Plus size={15} />
            Gerar mais parcelas
          </button>
        )}
      </div>

      {(gerando || semParcelas) && (
        <GerarParcelasModal
          eventId={eventId}
          contractValue={contractValue}
          entradaRegistrada={entradaRegistrada}
          todayIso={todayIso}
          onClose={semParcelas ? undefined : () => setGerando(false)}
        />
      )}

      {receitas.length > 0 && (
        <ListaParcelas eventId={eventId} receitas={receitas} todayIso={todayIso} />
      )}
    </div>
  );
}
