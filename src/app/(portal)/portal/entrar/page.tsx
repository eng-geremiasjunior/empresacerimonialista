import "./acesso.css";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";
import { LoginNoivos } from "@/components/portal/noivos/login/LoginNoivos";
import { SUBDOMINIO_DO_PORTAL } from "@/lib/app-url";
import { marcellus, nunitoSans, simbolos } from "@/lib/fontes-noivos";
import { Medicao } from "@/components/marketing/Medicao";

// Porta de entrada do Portal da Cliente. Pública no middleware.
// Neutra de propósito: neste momento o sistema ainda não sabe de quem ela
// é cliente, então nenhuma marca de cerimonialista aparece aqui — a marca
// entra depois do login, dentro do portal.
//
// No endereço do casamento (casamento.eorganizei.com.br) a porta é a dos
// noivos (desenho 3b, 30/09/2026): ali todo mundo é de casamento, e a
// frase pode falar em casamento. Nos outros endereços, a porta neutra.
export const metadata = { title: "Entrar — eorganizei" };
export const dynamic = "force-dynamic";

function ehEnderecoDoCasamento(): boolean {
  const h = headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  const sub = SUBDOMINIO_DO_PORTAL.casamento;
  return Boolean(sub) && host.startsWith(`${sub}.`);
}

export default async function PortalEntrarPage({
  searchParams,
}: {
  searchParams?: { erro?: string };
}) {
  // O navegador guarda UMA sessão por domínio: entrar aqui derruba quem
  // já estava logado. Sem aviso, a cerimonialista que abre o portal para
  // conferir perde a própria sessão e acha que o sistema se confundiu.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ehEquipe = Boolean(user) && user?.app_metadata?.portal !== true;
  const sessaoAtual = ehEquipe ? (user?.email ?? null) : null;

  if (ehEnderecoDoCasamento()) {
    return (
      <div className={`${marcellus.variable} ${nunitoSans.variable} ${simbolos.variable}`}>
        <LoginNoivos erroInicial={searchParams?.erro} sessaoAtual={sessaoAtual} />
        {/* pixel e tag (06/10/2026): o endereço desta porta não carrega credencial */}
        <Medicao />
      </div>
    );
  }

  return (
    <>
      <PortalLoginForm erroInicial={searchParams?.erro} sessaoAtual={sessaoAtual} />
      <Medicao />
    </>
  );
}
