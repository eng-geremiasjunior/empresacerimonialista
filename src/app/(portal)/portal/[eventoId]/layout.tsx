import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getContatoCerimonialista,
  getEventoDoPortal,
  getPrestacaoDeContas,
  nomeDeExibicao,
} from "@/lib/supabase/portal";
import { waLink } from "@/lib/fornecedores-shared";
import { NavPortal } from "@/components/portal/NavPortal";
import { NavLateral } from "@/components/portal/NavLateral";
import { TopoCelular } from "@/components/portal/TopoCelular";
import { InstalarPortal } from "@/components/portal/InstalarPortal";

export const dynamic = "force-dynamic";

// O manifesto e o ícone saem da empresa do evento, não do sistema: o
// portal é marca branca, e o ícone que fica na tela da noiva é o de quem
// a atende. Os metas do iOS existem porque o Safari ignora o manifesto
// para "Adicionar à Tela de Início" — lá quem manda são estes.
export async function generateMetadata({
  params,
}: {
  params: { eventoId: string };
}): Promise<Metadata> {
  const evento = await getEventoDoPortal(params.eventoId);
  const nome = evento?.marca?.nome?.trim() || "eorganizei";
  return {
    manifest: `/portal/${params.eventoId}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: nome, statusBarStyle: "default" },
    icons: { apple: evento?.marca?.logoUrl ?? "/icon.svg" },
    themeColor: "#221e1b",
  };
}

// A casca do evento nos DOIS modos (um ponto de corte, 768px):
//   celular    → topo fixo (menu, marca, sino) + conteúdo + 5 abas
//   computador → painel de 1440px com sidebar de 276px
// Quem decide é o CSS (.portal-so-celular / .portal-so-pc) — nada de
// detectar aparelho no servidor, nada de flash de hidratação.
//
// notFound() quando não há vínculo — e é a RLS que decide isso, não um
// if de tela: trocar o id no endereço devolve zero linhas, e a página
// some.
export default async function PortalEventoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  // cache(): as páginas pedem o mesmo contato e o banco responde uma vez
  const [contato, prestacao] = await Promise.all([
    getContatoCerimonialista(evento.id),
    // a prestação de contas só entra no menu depois de entregue
    getPrestacaoDeContas(evento.id),
  ]);
  const zap = waLink(contato.whatsapp);
  const temPrestacao = prestacao !== null;

  return (
    <div className="portal-raiz">
      <div className="portal-fora">
        <div className="portal-painel">
          <NavLateral
            eventoId={evento.id}
            tipo={evento.tipo}
            marcaNome={evento.marca?.nome ?? null}
            marcaLogoUrl={evento.marca?.logoUrl ?? null}
            cerimonialistaNome={contato.nome}
            cerimonialistaZap={zap}
            temPrestacao={temPrestacao}
          />

          <div className="portal-conteudo">
            <div className="portal-so-celular">
              <TopoCelular
                eventoId={evento.id}
                tipo={evento.tipo}
                nomeEvento={nomeDeExibicao(evento)}
                marcaNome={evento.marca?.nome ?? null}
                marcaLogoUrl={evento.marca?.logoUrl ?? null}
                temPrestacao={temPrestacao}
              />
            </div>

            <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {children}
            </main>

            <InstalarPortal />

            <div className="portal-so-celular">
              <NavPortal eventoId={evento.id} tipo={evento.tipo} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
