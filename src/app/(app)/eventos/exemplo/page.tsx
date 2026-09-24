import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// O cadastro termina AQUI (24/09/2026): no Roteiro do dia do evento de
// exemplo (174), e não no painel vazio.
//
// A conta criada às 18:55 de 24/09 caiu no painel, seguiu o guia para o
// formulário de evento e saiu 7 minutos depois sem ter aberto o exemplo
// — que estava lá, pronto, mostrando justamente o que o sistema faz. O
// Roteiro do dia é a tela onde as contas reais mais ficam, e o link do
// fornecedor é o que o sistema faz que ela não faz sozinha.
//
// Sem exemplo (conta antiga, conta que veio pelo checkout, exemplo já
// apagado), segue para o painel, como sempre foi.
export default async function IrParaOExemplo() {
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("exemplo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  redirect(data?.id ? `/eventos/${data.id as string}/roteiro` : "/eventos/dashboard");
}
