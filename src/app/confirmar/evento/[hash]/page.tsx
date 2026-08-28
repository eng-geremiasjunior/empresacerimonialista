import { cache } from "react";
import type { Metadata } from "next";
import { AutocadastroConvidado } from "@/components/rsvp/AutocadastroConvidado";
import { SiteCasamento } from "@/components/convite/SiteCasamento";
import { clienteAnonimoPublico } from "@/lib/supabase/anon-publico";
import { convitePara, quandoLegivel } from "@/lib/rsvp-convite";
import type { SitePublico } from "@/lib/site-publico-tipos";

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
 * O link ÚNICO do evento — a página que a cliente espalha no WhatsApp.
 *
 * Ela cresce em camadas: com o site do casamento PUBLICADO (128), este
 * endereço vira o site inteiro — informações, mensagem do casal e o RSVP
 * dentro. Sem site publicado, continua o cartão de confirmação de
 * sempre. O mesmo link melhora sozinho; nada que já circula quebra.
 *
 * A consulta não devolve a lista nem quantos confirmaram — quem abre vê
 * o evento, nunca os outros convidados.
 */
const carregarSite = cache(async (hash: string): Promise<SitePublico | null> => {
  const { data } = await clienteAnonimoPublico().rpc("site_publico", {
    p_ref: hash,
  });
  return (data as SitePublico | null) ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: { hash: string };
}): Promise<Metadata> {
  const site = await carregarSite(params.hash);
  if (!site) return { title: "Confirmar presença" };
  const titulo = `${site.evento.anfitrioes} — ${quandoLegivel(site.evento.data, site.evento.hora)}`;
  return {
    title: titulo,
    description: [
      `Você está convidado para ${convitePara(site.evento.tipo)} ${site.evento.anfitrioes}.`,
      [site.evento.local, site.evento.cidade].filter(Boolean).join(" · "),
    ]
      .filter(Boolean)
      .join(" "),
    // aparecer em buscador é decisão do casal, nunca padrão do sistema
    robots: { index: false, follow: false },
    openGraph: {
      title: titulo,
      images: site.evento.capa_url ? [site.evento.capa_url] : [],
    },
  };
}

export default async function ConfirmarEventoPage({
  params,
}: {
  params: { hash: string };
}) {
  // 1ª camada: o site publicado
  const site = await carregarSite(params.hash);
  if (site) return <SiteCasamento dados={site} />;

  // 2ª camada: o cartão de RSVP de sempre
  const { data } = await clienteAnonimoPublico().rpc("consultar_rsvp_evento", {
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
