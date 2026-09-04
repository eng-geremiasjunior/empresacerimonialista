import { notFound } from "next/navigation";
import { publicBase } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getConvidados, resumirConvidados } from "@/lib/supabase/portal-pessoas";
import { rotuloPublico, tem } from "@/lib/capacidades";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { ListaConvidados } from "@/components/portal/ListaConvidados";
import { LinkDoEvento } from "@/components/portal/LinkDoEvento";
import { LembreteConvidados } from "@/components/portal/LembreteConvidados";

export const dynamic = "force-dynamic";

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// A lista é da cliente: ela monta, edita e manda o link de confirmação
// para cada pessoa. A tela mostra o número que importa — quantas pessoas
// vão ao evento, não quantos convites foram enviados.
export default async function PortalConvidadosPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  // sumir do menu não basta: o endereço digitado à mão abria a lista
  // nominal para um show de 5.000 pessoas, que é justamente a escala em
  // que ela não se sustenta
  if (!tem(evento.tipo, "listaNominal")) notFound();

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
      {/* o mesmo rótulo do menu: numa empresa o item se chama
          Participantes, e a tela não pode dizer Convidados */}
      <TopoInterno
        eventoId={evento.id}
        titulo={capitalizar(rotuloPublico(evento.tipo))}
        apoio="Mande o link para quem vai — cada pessoa se cadastra sozinha. Quem não se cadastrar entra aqui, à mão."
      />

      {ev?.rsvp_hash && (
        <LinkDoEvento
          eventoId={evento.id}
          tipo={evento.tipo}
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
        tipo={evento.tipo}
        convidados={convidados}
        resumo={resumo}
        baseUrl={baseUrl}
      />
    </div>
  );
}
