import { notFound } from "next/navigation";
import { publicBase } from "@/lib/app-url";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getConvidados, resumirConvidados } from "@/lib/supabase/portal-pessoas";
import { rotuloPublico, tem } from "@/lib/capacidades";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { ListaConvidados } from "@/components/portal/ListaConvidados";
import { LinkDoEvento } from "@/components/portal/LinkDoEvento";
import { LembreteConvidados } from "@/components/portal/LembreteConvidados";
import { ConvidadosV2 } from "@/components/portal/v2/ConvidadosV2";
import { getConvidadosV2 } from "@/lib/supabase/portal-salao";
import { pessoaDoEvento, usaPortalV2 } from "@/lib/portal-v2";

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

  // portal v2 (180): o salão vivo, o buffet por idade e as listas
  if (usaPortalV2(evento.tipo)) {
    const { convidados: lista, mesas, elementos } = await getConvidadosV2(evento.id);
    return (
      <ConvidadosV2
        eventoId={evento.id}
        convidados={lista}
        mesas={mesas}
        elementos={elementos}
        base={publicBase()}
        debutante={pessoaDoEvento(evento.nome)}
      />
    );
  }

  const convidados = await getConvidados(evento.id);
  const resumo = resumirConvidados(convidados);

  // a base dos links que ela espalha: fonte única (app-url), não o host
  // da requisição — com o domínio próprio do portal, o cabeçalho
  // apontaria para o domínio em que ELA abriu a tela, não o público
  const baseUrl = publicBase();

  // o link ÚNICO do evento — o caminho principal: ela espalha, cada um
  // se cadastra sozinho

  return (
    <div className="portal-tela">
      {/* o mesmo rótulo do menu: numa empresa o item se chama
          Participantes, e a tela não pode dizer Convidados */}
      <TopoInterno
        eventoId={evento.id}
        titulo={capitalizar(rotuloPublico(evento.tipo))}
        apoio="Mande o link para quem vai — cada pessoa se cadastra sozinha. Quem não se cadastrar entra aqui, à mão."
      />

      {evento.rsvp.hash && (
        <LinkDoEvento
          eventoId={evento.id}
          tipo={evento.tipo}
          url={`${baseUrl}/confirmar/evento/${evento.rsvp.hash}`}
          aberto={evento.rsvp.aberto}
        />
      )}

      {convidados.length > 0 && (
        <LembreteConvidados
          eventoId={evento.id}
          dataEvento={evento.data}
          diasAtuais={evento.rsvp.lembreteDias}
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
