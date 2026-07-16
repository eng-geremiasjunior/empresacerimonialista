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
        className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
      >
        <Plus size={15} />
        {label}
      </button>
      {aberto && <FornecedorFormModal onClose={() => setAberto(false)} />}
    </>
  );
}
