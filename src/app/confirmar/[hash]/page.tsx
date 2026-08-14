import { createClient } from "@supabase/supabase-js";
import { EB_Garamond, Jost } from "next/font/google";
import { ConfirmacaoConvidado } from "@/components/rsvp/ConfirmacaoConvidado";
import "../../(portal)/portal.css";
import "./confirmar.css";

export const dynamic = "force-dynamic";

// Fora do índice de buscadores: é um convite pessoal.
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

// O convite fala a língua do evento: nem todo convidado vai a casamento.
// Os oito tipos que o sistema usa hoje; o que não estiver aqui cai no
// genérico, que funciona para qualquer coisa.
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

function dataLonga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

type Convite = {
  nome: string;
  confirmacao: "aguardando" | "confirmado" | "nao_vai";
  acompanhantes: number;
  criancas: number;
  restricao_alimentar: string | null;
  evento_tipo: string;
  evento_data: string;
  evento_hora: string | null;
  evento_local: string | null;
  evento_cidade: string | null;
  anfitrioes: string;
};

/**
 * A porta do convidado: sem login, sem app, sem cadastro.
 *
 * O hash é a credencial e não deriva de nada pessoal. A consulta usa a
 * chave anônima de propósito — a RPC devolve o nome de QUEM foi
 * convidado e o mínimo do evento, nunca a lista nem contato de ninguém.
 */
export default async function ConfirmarPage({
  params,
}: {
  params: { hash: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await supabase.rpc("consultar_convite_convidado", {
    p_hash: params.hash,
  });
  const convite = (data as Convite[] | null)?.[0] ?? null;

  const classes = `${garamond.variable} ${jost.variable} portal-raiz`;

  if (!convite) {
    return (
      <div className={classes}>
        <main className="rsvp-fora">
          <div className="rsvp-cartao">
            <h1 className="rsvp-titulo">Este convite não está mais válido.</h1>
            <p className="rsvp-texto">
              Confira o link com quem enviou — pode ter sido substituído.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const quando =
    dataLonga(convite.evento_data) +
    (convite.evento_hora ? ` · ${convite.evento_hora.slice(0, 5)}` : "");
  const onde = [convite.evento_local, convite.evento_cidade]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={classes}>
      <main className="rsvp-fora">
        <ConfirmacaoConvidado
          hash={params.hash}
          nome={convite.nome}
          anfitrioes={convite.anfitrioes}
          convitePara={CONVITE_PARA[convite.evento_tipo] ?? "o evento de"}
          quando={quando}
          onde={onde || null}
          confirmacaoInicial={convite.confirmacao}
          acompanhantesIniciais={convite.acompanhantes}
          criancasIniciais={convite.criancas}
          restricaoInicial={convite.restricao_alimentar}
        />
      </main>
    </div>
  );
}
