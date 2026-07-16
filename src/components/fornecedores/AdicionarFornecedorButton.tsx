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
  const cls =
    variant === "primary"
      ? "bg-gray-900 text-white hover:bg-gray-800"
      : "border border-gray-300 bg-white text-gray-700 hover:border-gray-400";
  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold ${cls}`}
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
