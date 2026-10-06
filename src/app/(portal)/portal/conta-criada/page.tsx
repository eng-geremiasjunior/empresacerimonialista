import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { idDaContaDaFesta } from "@/lib/conta-da-festa";
import { Medicao } from "@/components/marketing/Medicao";
import { ContaDaFestaCriada } from "./ContaDaFestaCriada";

// A passagem depois do link do e-mail (06/10/2026): a conta da festa acabou
// de nascer em /portal/confirmar-conta, que manda a conversão pelo servidor
// e traz o casal aqui. Esta tela existe só para o pixel do navegador mandar
// o MESMO fato com o mesmo id — o portal de verdade (/portal/<evento>) não
// recebe pixel, porque o endereço dele é do evento. Em um instante ela
// segue para /portal, que abre a festa.
export const metadata = { title: "Conta criada — eorganizei" };
export const dynamic = "force-dynamic";

export default async function ContaCriadaPage({
  searchParams,
}: {
  searchParams?: { festa?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/entrar");

  const tipo = searchParams?.festa === "debutante" ? "debutante" : "casamento";

  return (
    <>
      <Medicao />
      <ContaDaFestaCriada tipo={tipo} idDoEvento={idDaContaDaFesta(user.id)} />
    </>
  );
}
