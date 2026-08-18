"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { BuscarVincularFornecedorModal } from "@/components/fornecedores/BuscarVincularFornecedorModal";

export function AdicionarFornecedorButton({
  eventId,
  label = "Adicionar fornecedor",
  variant = "primary",
}: {
  eventId: string;
  label?: string;
  variant?: "primary" | "outline";
}) {
  const [aberto, setAberto] = useState(false);
  // cinza-chumbo, nunca ameixa: cadastro e gestão são partes sérias do
  // sistema e ficam neutras (handoff §1)
  const cls =
    variant === "primary"
      ? "bg-[color:var(--tinta)] text-[color:var(--papel)] hover:bg-[color:var(--cinza-3)]"
      : "border border-[color:var(--linha)] bg-[color:var(--papel)] text-[color:var(--cinza-3)] hover:border-[color:var(--cinza-2)]";
  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className={`flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-sm font-semibold ${cls}`}
      >
        <Plus size={15} />
        {label}
      </button>
      {aberto && (
        <BuscarVincularFornecedorModal
          eventId={eventId}
          onClose={() => setAberto(false)}
        />
      )}
    </>
  );
}
