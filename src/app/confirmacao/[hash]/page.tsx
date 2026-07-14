import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ConfirmacaoCard } from "@/components/confirmacao/ConfirmacaoCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirmação de presença — Vela",
};

export type ConfirmacaoData = {
  supplier_name: string;
  event_label: string;
  event_date: string;
  event_time: string | null;
  event_location: string | null;
  status: "pendente" | "confirmado" | "recusado";
  responded_at: string | null;
};

export default async function ConfirmacaoPage({
  params,
}: {
  params: { hash: string };
}) {
  const supabase = createClient();
  const { data } = await supabase.rpc("consultar_confirmacao", {
    p_hash: params.hash,
  });

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Link inválido</h1>
          <p className="mt-2 text-sm text-gray-600">
            Este link de confirmação não existe ou foi removido. Fale com a
            cerimonialista do evento para receber um novo.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <ConfirmacaoCard hash={params.hash} initial={data as ConfirmacaoData} />
    </main>
  );
}
