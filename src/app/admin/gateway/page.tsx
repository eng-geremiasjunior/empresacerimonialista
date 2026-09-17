// O log da operadora virou uma aba de Sistema (17/09/2026). O endereço
// antigo continua funcionando: quem tinha o link vai para o lugar novo.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminGatewayPage() {
  redirect("/admin/sistema?aba=operadora");
}
