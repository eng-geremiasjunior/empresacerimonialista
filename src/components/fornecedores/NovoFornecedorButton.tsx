"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FornecedorFormModal } from "@/components/fornecedores/FornecedorFormModal";

export function NovoFornecedorButton({
  label = "Cadastrar fornecedor",
}: {
  label?: string;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex h-8 items-center gap-1.5 px-3.5"
        style={{
          border: 0,
          borderRadius: 8,
          background: "var(--tinta)",
          color: "var(--marfim)",
          font: "600 13px/1 'Instrument Sans', system-ui, sans-serif",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <Plus size={15} />
        {label}
      </button>
      {aberto && <FornecedorFormModal onClose={() => setAberto(false)} />}
    </>
  );
}
