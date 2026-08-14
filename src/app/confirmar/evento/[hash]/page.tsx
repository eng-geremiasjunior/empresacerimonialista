import { createClient } from "@supabase/supabase-js";
import { EB_Garamond, Jost } from "next/font/google";
import { AutocadastroConvidado } from "@/components/rsvp/AutocadastroConvidado";
import "../../../(portal)/portal.css";
import "../../[hash]/confirmar.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Confirmar presença",
  robots: { index: false, follow: false },
};

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--fonte-portal-titulo",
  display: "swap",
});
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--fonte-portal-corpo",
  display: "swap",
});

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dataLonga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

const CONVITE_PARA: Record<string, string> = {
  casamento: "o casamento de",
  debutante: "os 15 anos de",
  aniversario: "o aniversário de",
  bodas: "as bodas de",
  formatura: "a formatura de",
  batizado: "o batizado de",
  cha_revelacao: "o chá revelação de",
  corporativo: "o evento de",
};

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
  const classes = `${garamond.variable} ${jost.variable} portal-raiz`;

  if (!evento) {
    return (
      <div className={classes}>
        <main className="rsvp-fora">
          <div className="rsvp-cartao">
            <h1 className="rsvp-titulo">Este link não está mais válido.</h1>
            <p className="rsvp-texto">
              Confira com quem enviou — pode ter sido substituído.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!evento.aberto) {
    return (
      <div className={classes}>
        <main className="rsvp-fora">
          <div className="rsvp-cartao">
            <h1 className="rsvp-titulo">As confirmações foram encerradas.</h1>
            <p className="rsvp-texto">
              Fale direto com os anfitriões se ainda precisar avisar alguma coisa.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const quando =
    dataLonga(evento.evento_data) +
    (evento.evento_hora ? ` · ${evento.evento_hora.slice(0, 5)}` : "");
  const onde = [evento.evento_local, evento.evento_cidade]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={classes}>
      <main className="rsvp-fora">
        <AutocadastroConvidado
          hash={params.hash}
          anfitrioes={evento.anfitrioes}
          convitePara={CONVITE_PARA[evento.evento_tipo] ?? "o evento de"}
          quando={quando}
          onde={onde || null}
        />
      </main>
    </div>
  );
}
