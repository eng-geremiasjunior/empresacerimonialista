import { ConfirmacaoConvidado } from "@/components/rsvp/ConfirmacaoConvidado";
import { clienteAnonimoPublico } from "@/lib/supabase/anon-publico";
import { qrSvg } from "@/lib/qr";
import { convitePara, quandoLegivel } from "@/lib/rsvp-convite";

export const dynamic = "force-dynamic";

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
  // no-store obrigatório: sem ele o Next congela a resposta da RPC e o
  // convite continua servindo o estado antigo (medido em produção na
  // porta do evento; mesma classe do bug do guia)
  const supabase = clienteAnonimoPublico();

  const { data } = await supabase.rpc("consultar_convite_convidado", {
    p_hash: params.hash,
  });
  const convite = (data as Convite[] | null)?.[0] ?? null;

  if (!convite) {
    return (
      <main className="rsvp-fora">
        <div className="rsvp-cartao">
          <h1 className="rsvp-titulo">Este convite não está mais válido.</h1>
          <p className="rsvp-texto">
            Confira o link com quem enviou — pode ter sido substituído.
          </p>
        </div>
      </main>
    );
  }

  const onde = [convite.evento_local, convite.evento_cidade]
    .filter(Boolean)
    .join(" · ");

  // A credencial de entrada só existe para quem já confirmou: a RPC
  // devolve o checkin_hash (NUNCA o hash do convite, que escreve o RSVP)
  // e ele vai para o QR em MAIÚSCULAS — hex não distingue caixa e o modo
  // alfanumérico do QR sai com menos módulos, mais fácil de ler na fila.
  const { data: cred } =
    convite.confirmacao === "confirmado"
      ? await supabase.rpc("credencial_de_entrada", { p_hash: params.hash })
      : { data: null };
  const credencialBruta = cred as
    | { checkin_hash: string; codigo: string; nome: string }
    | null;
  const credencial = credencialBruta?.checkin_hash
    ? {
        qr: await qrSvg(credencialBruta.checkin_hash.toUpperCase()),
        codigo: credencialBruta.codigo,
        nome: credencialBruta.nome,
      }
    : null;

  return (
    <main className="rsvp-fora">
      <ConfirmacaoConvidado
        hash={params.hash}
        credencial={credencial}
        nome={convite.nome}
        anfitrioes={convite.anfitrioes}
        convitePara={convitePara(convite.evento_tipo)}
        quando={quandoLegivel(convite.evento_data, convite.evento_hora)}
        onde={onde || null}
        confirmacaoInicial={convite.confirmacao}
        acompanhantesIniciais={convite.acompanhantes}
        criancasIniciais={convite.criancas}
        restricaoInicial={convite.restricao_alimentar}
      />
    </main>
  );
}
