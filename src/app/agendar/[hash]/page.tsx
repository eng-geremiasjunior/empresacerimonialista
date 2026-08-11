// Página pública do convite de agendamento (Secretário Executivo).
// O fornecedor escolhe um horário SEM login — o hash é a credencial, mesmo
// padrão de /confirmacao/[hash]. A RPC revalida a vaga na escolha.

import { createClient } from "@/lib/supabase/server";
import { AgendarCard } from "@/components/agendar/AgendarCard";

export const dynamic = "force-dynamic";

export type ConviteData = {
  status:
    | "enviado"
    | "reenviado"
    | "respondido"
    | "expirado"
    | "cancelado"
    | "sugerido";
  tarefa: string;
  duracao_min: number;
  supplier_name: string;
  event_label: string;
  event_date: string | null;
  prazo_ate: string;
  sugestao: { data: string; hora: string } | null;
  compromisso: { data: string; hora: string; local: string | null } | null;
  slots: { id: string; data: string; hora: string }[];
};

export default async function AgendarPage({
  params,
}: {
  params: { hash: string };
}) {
  const supabase = createClient();
  const { data } = await supabase.rpc("consultar_convite", {
    p_hash: params.hash,
  });

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-stone-900">Link inválido</p>
          <p className="mt-2 text-sm text-stone-500">
            Este convite não existe ou foi removido. Fale com a cerimonialista.
          </p>
        </div>
      </main>
    );
  }

  return <AgendarCard hash={params.hash} initial={data as ConviteData} />;
}
