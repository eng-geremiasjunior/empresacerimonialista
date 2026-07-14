import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PublicRoteiro } from "@/components/PublicRoteiro";
import { PublicChat } from "@/components/chat/PublicChat";
import type { PublicRoteiroData } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Roteiro do evento — Vela",
};

export default async function PublicRoteiroPage({
  params,
}: {
  params: { id: string; hash: string };
}) {
  const supabase = createClient();
  const { data } = await supabase.rpc("roteiro_publico", {
    link_hash: params.hash,
  });

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
      <PublicChat hash={params.hash} />
    </PublicRoteiro>
  );
}
