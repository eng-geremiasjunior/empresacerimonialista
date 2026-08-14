import { createClient } from "@supabase/supabase-js";
import { AutocadastroConvidado } from "@/components/rsvp/AutocadastroConvidado";
import { convitePara, quandoLegivel } from "@/lib/rsvp-convite";

export const dynamic = "force-dynamic";

type EventoRsvp = {
  evento_tipo: string;
  evento_data: string;
  evento_hora: string | null;
  evento_local: string | null;
  evento_cidade: string | null;
  anfitrioes: string;
  aberto: boolean;
};

/**
 * O link ÚNICO do evento — o que a cliente espalha no WhatsApp ou
 * imprime no convite. Quem chega aqui ainda não está na lista: preenche
 * os próprios dados e entra.
 *
 * A consulta não devolve a lista nem quantos já confirmaram. Quem abre
 * este endereço vê o evento, não os outros convidados.
 */
export default async function ConfirmarEventoPage({
  params,
}: {
  params: { hash: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await supabase.rpc("consultar_rsvp_evento", {
    p_hash: params.hash,
  });
  const evento = (data as EventoRsvp[] | null)?.[0] ?? null;

  if (!evento) {
    return (
      <main className="rsvp-fora">
        <div className="rsvp-cartao">
          <h1 className="rsvp-titulo">Este link não está mais válido.</h1>
          <p className="rsvp-texto">
            Confira com quem enviou — pode ter sido substituído.
          </p>
        </div>
      </main>
    );
  }

  if (!evento.aberto) {
    return (
      <main className="rsvp-fora">
        <div className="rsvp-cartao">
          <h1 className="rsvp-titulo">As confirmações foram encerradas.</h1>
          <p className="rsvp-texto">
            Fale direto com os anfitriões se ainda precisar avisar alguma coisa.
          </p>
        </div>
      </main>
    );
  }

  const onde = [evento.evento_local, evento.evento_cidade]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="rsvp-fora">
      <AutocadastroConvidado
        hash={params.hash}
        anfitrioes={evento.anfitrioes}
        convitePara={convitePara(evento.evento_tipo)}
        quando={quandoLegivel(evento.evento_data, evento.evento_hora)}
        onde={onde || null}
      />
    </main>
  );
}
