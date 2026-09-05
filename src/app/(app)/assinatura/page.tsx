import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCatalogoDePlanos, reais, tetoEmTexto } from "@/lib/planos";
import {
  AssinaturaTela,
  type EstadoAssinatura,
  type PlanoDaVitrine,
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

  // A vitrine vem do catálogo (147), não de variável de ambiente. O texto
  // já sai pronto daqui porque planos.ts é módulo de servidor (lê cookies)
  // e a tela é cliente: atravessa a fronteira só o que é string e número.
  const catalogo = await getCatalogoDePlanos();
  const planos: PlanoDaVitrine[] = catalogo.map((p) => ({
    codigo: p.codigo,
    nome: p.nome,
    valorMensal: p.valorMensal,
    precoTexto: reais(p.valorMensal),
    eventosTexto: tetoEmTexto(p.eventosEmAndamento),
    loginsTexto: tetoEmTexto(p.logins),
  }));

  return (
    <AssinaturaTela
      estado={estado}
      planos={planos}
      emailDaConta={user?.email ?? ""}
      nomeDaConta={membro?.nome ?? ""}
    />
  );
}
