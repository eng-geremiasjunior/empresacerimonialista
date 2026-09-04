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

// O aplicativo tem a NOSSA marca: o portal é uma cortesia que a
// cerimonialista oferece à noiva, mas o produto é nosso (decisão do dono,
// 04/09/2026). Um ícone por empresa seria complexidade sem retorno.
//
// Os metas do iOS existem porque o Safari ignora o manifesto no
// "Adicionar à Tela de Início" — lá quem manda são estes, e o ícone
// precisa ser PNG: SVG ele não lê.
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "eorganizei", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
  themeColor: "#221e1b",
};

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

  // data-tipo é o gancho para o dia em que cada tipo de evento tiver tema
  // próprio: basta o portal.css escrever .portal-raiz[data-tipo="corporativo"]
  // { --cor-… } e nenhuma tela precisa de if de tipo. As três rotas públicas
  // que importam o mesmo portal.css (/c, /confirmar, /guia) não passam por
  // aqui e ficam sem o atributo — de propósito: são páginas de fornecedor e
  // de convidado, e não devem herdar o tema do cliente.
  return (
    <div className="portal-raiz" data-tipo={evento.tipo}>
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
