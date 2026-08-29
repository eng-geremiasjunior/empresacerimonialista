import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { valorMensalReais } from "@/lib/pagarme";
import {
  AssinaturaTela,
  type EstadoAssinatura,
} from "@/components/assinatura/AssinaturaTela";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assinatura" };

// O plano da conta, para quem paga por ele. Só a proprietária: a RPC
// devolve vazio para os outros cargos, e a tela manda para o painel.

export default async function AssinaturaPage() {
  const supabase = createClient();
  const { data } = await supabase.rpc("minha_assinatura");
  const estado = data as EstadoAssinatura | null;

  if (!estado) redirect("/eventos/dashboard");

  return <AssinaturaTela estado={estado} valorMensal={valorMensalReais()} />;
}
