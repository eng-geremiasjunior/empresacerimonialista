import "./acesso.css";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";

// Porta de entrada do Portal da Cliente. Pública no middleware.
// Neutra de propósito: neste momento o sistema ainda não sabe de quem ela
// é cliente, então nenhuma marca de cerimonialista aparece aqui — a marca
// entra depois do login, dentro do portal.
export const metadata = { title: "Entrar — Vela" };

export default function PortalEntrarPage({
  searchParams,
}: {
  searchParams?: { erro?: string };
}) {
  return <PortalLoginForm erroInicial={searchParams?.erro} />;
}
