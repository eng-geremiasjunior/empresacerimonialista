import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PublicRoteiro } from "@/components/PublicRoteiro";
import { PublicChat } from "@/components/chat/PublicChat";
import type { PublicRoteiroData } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // Sem "Vela": esta aba abre no celular do fornecedor, em cima do
  // trabalho que a cerimonialista assina. (O nome da empresa exigiria
  // mudar a RPC; o neutro resolve o vazamento de marca.)
  title: "Roteiro do evento",
};

export default async function PublicRoteiroPage({
  params,
}: {
  params: { id: string; hash: string };
}) {
  const supabase = createClient();
  // A alergia vem por função separada (092): só aparece se a
  // cerimonialista compartilhou com ESTE fornecedor e a resposta já foi
  // conferida. Medicamento não passa por aqui em hipótese nenhuma.
  const [{ data }, { data: alergia }] = await Promise.all([
    supabase.rpc("roteiro_publico", { link_hash: params.hash }),
    supabase.rpc("roteiro_publico_alergia", { link_hash: params.hash }),
  ]);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Link inválido</h1>
          <p className="mt-2 text-sm text-stone-600">
            Este link de roteiro não existe ou foi removido. Peça um novo link
            para a cerimonialista do evento.
          </p>
        </div>
      </main>
    );
  }

  return (
    <PublicRoteiro initial={data as PublicRoteiroData} hash={params.hash}>
      {typeof alergia === "string" && alergia.trim() && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">
            Restrição alimentar dos noivos
          </h2>
          <p className="mt-1 text-sm text-amber-800">{alergia}</p>
        </div>
      )}
      <PublicChat hash={params.hash} />
    </PublicRoteiro>
  );
}
