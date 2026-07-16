"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { FornecedorFormModal } from "@/components/fornecedores/FornecedorFormModal";
import type { Fornecedor } from "@/lib/fornecedores-shared";

export function EditarFornecedorButton({ fornecedor }: { fornecedor: Fornecedor }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400"
      >
        <Pencil size={14} />
        Editar
      </button>
      {aberto && (
        <FornecedorFormModal editar={fornecedor} onClose={() => setAberto(false)} />
      )}
    </>
  );
}
