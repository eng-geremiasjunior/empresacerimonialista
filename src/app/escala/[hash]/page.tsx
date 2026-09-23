import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EscalaDoDia, type DadosDaEscala } from "@/components/escala/EscalaDoDia";

export const dynamic = "force-dynamic";

// A escala de uma pessoa da equipe do dia (171). Abre no celular de quem
// trabalha no evento, sem login: o hash é a credencial, como no link do
// fornecedor. Sem "eorganizei" no título — a aba é da cerimonial dela.
export const metadata: Metadata = {
  title: "Seu roteiro do dia",
};

export default async function EscalaPage({ params }: { params: { hash: string } }) {
  const supabase = createClient();
  const { data } = await supabase.rpc("roteiro_da_equipe", { p_hash: params.hash });

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-sm rounded-xl border border-stone-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold">Link inválido</h1>
          <p className="mt-2 text-sm text-stone-600">Peça um link novo para a cerimonialista do evento.</p>
        </div>
      </main>
    );
  }

  return <EscalaDoDia hash={params.hash} inicial={data as DadosDaEscala} />;
}
