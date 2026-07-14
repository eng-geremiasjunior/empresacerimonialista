"use client";

// "+ Outra despesa": despesa fora das categorias fixas — descrição livre,
// gravada com categoria "outro".

import { LancamentoModal } from "@/components/financeiro-empresa/LancamentoModal";

export function NovaDespesaEmpresaModal({ onClose }: { onClose: () => void }) {
  return <LancamentoModal tipo="despesa" categoriaFixa="outro" onClose={onClose} />;
}
