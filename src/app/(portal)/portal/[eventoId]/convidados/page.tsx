import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getConvidados, resumirConvidados } from "@/lib/supabase/portal-pessoas";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { ListaConvidados } from "@/components/portal/ListaConvidados";

export const dynamic = "force-dynamic";

// A lista é da cliente: ela monta, edita e manda o link de confirmação
// para cada pessoa. A tela mostra o número que importa — quantas pessoas
// vão à festa, não quantos convites foram enviados.
export default async function PortalConvidadosPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const convidados = await getConvidados(evento.id);
  const resumo = resumirConvidados(convidados);

  // a origem para montar o link individual (o hash não deriva de nada
  // pessoal, então pode circular por WhatsApp sem expor a lista)
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = host ? `${proto}://${host}` : "";

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Convidados"
        apoio="Monte a lista com calma. Cada pessoa recebe um link só dela para confirmar presença."
      />
      <ListaConvidados
        eventoId={evento.id}
        convidados={convidados}
        resumo={resumo}
        baseUrl={baseUrl}
      />
    </div>
  );
}
