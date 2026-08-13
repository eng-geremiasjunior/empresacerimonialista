import { notFound } from "next/navigation";
import {
  getContatoCerimonialista,
  getEventoDoPortal,
  nomeDeExibicao,
} from "@/lib/supabase/portal";
import { temaDoEvento } from "@/lib/portal-tema";
import { dataLonga } from "@/components/portal/datas";
import { waLink } from "@/lib/fornecedores-shared";
import { Atmosfera } from "@/components/portal/Atmosfera";
import { MarcaCerimonialista } from "@/components/portal/MarcaCerimonialista";
import { NavPortal } from "@/components/portal/NavPortal";
import { NavLateral } from "@/components/portal/NavLateral";

export const dynamic = "force-dynamic";

// A casca do evento, nos DOIS modos (breakpoint único de 768px):
//   celular    → coluna de 430px, marca no topo, abas no rodapé
//   computador → sidebar de 300px (moldura) + coluna de leitura de 760px
// Quem decide é o CSS (.portal-so-celular / .portal-so-pc) — nada de
// detectar aparelho no servidor, nada de flash de hidratação.
//
// O tema pertence ao EVENTO (não ao login): a mesma pessoa pode ter um
// casamento hoje e outro tipo de evento depois.
//
// notFound() quando não há vínculo — e é a RLS que decide isso, não um if
// de tela: trocar o id no endereço devolve zero linhas, e a página some.
export default async function PortalEventoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  // cache(): a page pede o mesmo contato e o banco responde uma vez
  const contato = await getContatoCerimonialista(evento.id);

  return (
    <div className="portal-raiz" data-tema={temaDoEvento(evento.tipo)}>
      <div style={{ position: "relative", minHeight: "100vh" }}>
        {/* Uma atmosfera por casca: cada modo enxerga só a sua (a do
            computador é fixa, com fios de 620px). */}
        <div className="portal-so-celular">
          <Atmosfera />
        </div>
        <div className="portal-so-pc">
          <Atmosfera fixa />
        </div>

        <div className="portal-casca">
          <NavLateral
            eventoId={evento.id}
            nome={nomeDeExibicao(evento)}
            dataFormatada={dataLonga(evento.data)}
            dias={evento.diasRestantes}
            marcaNome={evento.marca?.nome ?? null}
            marcaLogoUrl={evento.marca?.logoUrl ?? null}
            cerimonialistaNome={contato.nome}
            cerimonialistaZap={waLink(contato.whatsapp)}
          />

          <div className="portal-coluna">
            <div className="portal-so-celular">
              <MarcaCerimonialista
                nome={evento.marca?.nome ?? null}
                logoUrl={evento.marca?.logoUrl ?? null}
              />
            </div>

            <main className="portal-conteudo">{children}</main>

            <div
              className="portal-so-celular"
              style={{ position: "sticky", bottom: 0, zIndex: 2 }}
            >
              <NavPortal eventoId={evento.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
