// Página do fornecedor — o único link que atravessa os eventos dela.
//
// O fornecedor não tem login e não vai aprender navegação: esta página
// abre no celular, mostra o que a cerimonialista precisa dele agora,
// agrupado por evento, e some sozinha quando não há mais nada.

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PendenciasFornecedor } from "@/components/fornecedor-publico/PendenciasFornecedor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suas pendências — Vela",
};

export type PendenciaPublica = {
  id: string;
  tipo: "confirmacao" | "contrato" | "horario";
  titulo: string;
  status: "pendente" | "enviada" | "reenviada" | "respondida";
  prazo_ate: string | null;
  respondida_em: string | null;
  /** snapshot do item, quando a solicitação é de horário */
  roteiro_item?: { titulo: string; horario: string | null; origem: string | null } | null;
  evento: { nome: string | null; data: string | null; local: string | null };
};

export type PendenciasData = {
  fornecedor: { nome: string };
  empresa: { nome: string | null; logo_url: string | null };
  pendencias: PendenciaPublica[];
};

export default async function FornecedorPage({
  params,
}: {
  params: { hash: string };
}) {
  const supabase = createClient();
  const { data } = await supabase.rpc("consultar_pendencias_fornecedor", {
    p_hash: params.hash,
  });

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Link inválido</h1>
          <p className="mt-2 text-sm text-gray-600">
            Este link não existe mais ou passou da validade. Peça um novo à
            cerimonialista do evento.
          </p>
        </div>
      </main>
    );
  }

  return (
    <PendenciasFornecedor hash={params.hash} initial={data as PendenciasData} />
  );
}
