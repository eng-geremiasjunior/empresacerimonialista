import { notFound } from "next/navigation";
import { publicBase } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getConvidados, resumirConvidados } from "@/lib/supabase/portal-pessoas";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { ListaConvidados } from "@/components/portal/ListaConvidados";
import { LinkDoEvento } from "@/components/portal/LinkDoEvento";
import { LembreteConvidados } from "@/components/portal/LembreteConvidados";

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

  // a base dos links que ela espalha: fonte única (app-url), não o host
  // da requisição — com o domínio próprio do portal, o cabeçalho
  // apontaria para o domínio em que ELA abriu a tela, não o público
  const baseUrl = publicBase();

  // o link ÚNICO do evento — o caminho principal: ela espalha, cada um
  // se cadastra sozinho
  const supabase = createClient();
  const { data: ev } = await supabase
    .from("events")
    .select("rsvp_hash, rsvp_aberto, rsvp_lembrete_dias")
    .eq("id", evento.id)
    .maybeSingle();

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Convidados"
        apoio="Mande o link para todo mundo — cada pessoa se cadastra sozinha. Quem não se vira com isso, vocês adicionam aqui."
      />

      {ev?.rsvp_hash && (
        <LinkDoEvento
          eventoId={evento.id}
          url={`${baseUrl}/confirmar/evento/${ev.rsvp_hash}`}
          aberto={ev.rsvp_aberto !== false}
        />
      )}

      {convidados.length > 0 && (
        <LembreteConvidados
          eventoId={evento.id}
          dataEvento={evento.data}
          diasAtuais={ev?.rsvp_lembrete_dias ?? null}
          aguardando={resumo.aguardando}
          confirmados={resumo.confirmados}
        />
      )}

      <ListaConvidados
        eventoId={evento.id}
        convidados={convidados}
        resumo={resumo}
        baseUrl={baseUrl}
      />
    </div>
  );
}
