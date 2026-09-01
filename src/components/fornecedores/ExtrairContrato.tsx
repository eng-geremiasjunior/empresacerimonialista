"use client";

// A caixa de pendência da aba Fornecedores: contratos recebidos que
// esperam conferência. O trabalho de verdade mora em componentes
// compartilhados com a área de Contratos (/contratos):
//   FluxoLeituraContrato — ler no navegador → prévia redigida → enviar
//   ConferenciaExtracao  — o gate dela, item a item
// Aqui fica só a moldura âmbar e a lista.

import { useState } from "react";
import { FileSearch } from "lucide-react";
import type { PropostaExtracao } from "@/lib/contrato-extracao-core";
import { FluxoLeituraContrato } from "@/components/contratos/FluxoLeituraContrato";
import { ConferenciaExtracao } from "@/components/contratos/ConferenciaExtracao";

export type ContratoParaExtrair = {
  solicitacaoId: string;
  supplierId: string;
  fornecedorNome: string;
  arquivoPath: string;
  arquivoNome: string;
  /** o item mais cedo deste fornecedor no roteiro (destino do horário) */
  itemRoteiroTitulo: string | null;
  /** proposta pendente de conferência, se já foi lida */
  extracao: { id: string; payload: PropostaExtracao } | null;
};

export function ExtrairContrato({
  eventId,
  contratos,
}: {
  eventId: string;
  contratos: ContratoParaExtrair[];
}) {
  if (contratos.length === 0) return null;
  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
        <FileSearch size={15} />
        {contratos.length === 1
          ? "1 contrato recebido espera conferência"
          : `${contratos.length} contratos recebidos esperam conferência`}
      </h3>
      <div className="mt-3 space-y-2">
        {contratos.map((c) => (
          <CartaoContrato key={c.solicitacaoId} eventId={eventId} contrato={c} />
        ))}
      </div>
    </section>
  );
}

function CartaoContrato({
  eventId,
  contrato,
}: {
  eventId: string;
  contrato: ContratoParaExtrair;
}) {
  const [proposta, setProposta] = useState<{ id: string; payload: PropostaExtracao } | null>(
    contrato.extracao
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-[13.5px] font-medium text-gray-900">
          {contrato.fornecedorNome}
          <span className="ml-1.5 text-[11.5px] font-normal text-gray-500">
            {contrato.arquivoNome}
          </span>
        </span>
      </div>

      {!proposta && (
        <div className="mt-1.5">
          <FluxoLeituraContrato
            eventId={eventId}
            solicitacaoId={contrato.solicitacaoId}
            arquivoPath={contrato.arquivoPath}
            aoProposta={(id, payload) => setProposta({ id, payload })}
          />
        </div>
      )}

      {proposta && (
        <ConferenciaExtracao
          eventId={eventId}
          extracaoId={proposta.id}
          payload={proposta.payload}
          itemRoteiroTitulo={contrato.itemRoteiroTitulo}
          aoFechar={() => setProposta(null)}
        />
      )}
    </div>
  );
}
