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

  // O formulário de cobrança começa com o que a conta já sabe — ela troca
  // se quem paga for outra pessoa (o financeiro da empresa, por exemplo).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membro } = await supabase
    .from("membros_equipe")
    .select("nome")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  return (
    <AssinaturaTela
      estado={estado}
      valorMensal={valorMensalReais()}
      emailDaConta={user?.email ?? ""}
      nomeDaConta={membro?.nome ?? ""}
    />
  );
}
