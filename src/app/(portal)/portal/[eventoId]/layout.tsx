import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import {
  getContatoCerimonialista,
  getEventoDaFamilia,
  getEventoDoPortal,
  getPrestacaoDeContas,
  getTermoDoResponsavel,
  nomeDeExibicao,
} from "@/lib/supabase/portal";
import { waLink } from "@/lib/fornecedores-shared";
import { NavPortal } from "@/components/portal/NavPortal";
import { NavLateral } from "@/components/portal/NavLateral";
import { TopoCelular } from "@/components/portal/TopoCelular";
import { InstalarPortal } from "@/components/portal/InstalarPortal";
import { TermoDoResponsavel } from "@/components/portal/TermoDoResponsavel";
import { CascaV2 } from "@/components/portal/v2/CascaV2";
import { EntradaV2 } from "@/components/portal/v2/EntradaV2";
import { destinosV2 } from "@/components/portal/v2/destinos";
import { getEstiloDoPortal, getMeuAcesso } from "@/lib/supabase/portal-estilo";
import { listaDePresentesLiberada } from "@/lib/supabase/portal-presentes";
import { pessoaDoEvento, tituloDaFesta, usaPortalV2 } from "@/lib/portal-v2";
import "@/components/portal/noivos/noivos.css";
import { CascaNoivos } from "@/components/portal/noivos/CascaNoivos";
import { FaixaDoCatalogo } from "@/components/portal/FaixaDoCatalogo";
import { createClient } from "@/lib/supabase/server";
import { marcellus, nunitoSans, simbolos } from "@/lib/fontes-noivos";
import {
  MAIS_NOIVOS,
  MENU_NOIVOS,
  TELAS_PRONTAS,
  papelLegivel,
  usaPortalNoivos,
} from "@/lib/portal-noivos";
import { dataPorExtenso, getFotoDoCasal, getNomesDoCasal, momentoDoSim } from "@/lib/supabase/portal-noivos";
import { donaDaFesta } from "@/lib/supabase/portal-planejamento";

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
  // a lista inteira, não só o apple: `icons` substitui o do layout raiz
  // em bloco, e declarar um campo só apagaria o ícone da aba aqui dentro
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
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

  // Conta de família (187): o evento é da própria noiva, sem
  // cerimonialista — a marca no topo volta a ser a nossa, e o contato da
  // cerimonialista some (getContatoCerimonialista já devolve vazio).
  const daFamilia = await getEventoDaFamilia(evento.id);
  const marca = daFamilia ? null : evento.marca;

  // o visitante do catálogo vivo (195): vê o exemplo e não grava nada.
  // Sem a 195 aplicada a função não existe e ninguém é visitante.
  const { data: ehVisitante } = await createClient().rpc("sou_login_vitrine");
  const faixa = ehVisitante === true ? <FaixaDoCatalogo /> : null;

  // O termo do responsável (175): num evento de debutante, o pai, a mãe
  // ou o responsável confirma antes de tudo, e a debutante só entra
  // depois de algum deles. Sem a 175 aplicada, não há o que pedir.
  const termo = evento.tipo === "debutante" ? await getTermoDoResponsavel(evento.id) : null;
  const modoDoTermo = !termo
    ? null
    : termo.ehDebutante
      ? termo.algumResponsavelConfirmou
        ? null
        : "esperar"
      : termo.confirmou
        ? null
        : "confirmar";
  // O portal dos noivos (desenho v4, 30/09/2026): o casamento. A entrada
  // toca uma vez por sessão, só no Início (cookie da casca, molde da v2).
  if (usaPortalNoivos(evento.tipo)) {
    const nome = nomeDeExibicao(evento);
    const [contato, eu, fotoUrl, casal] = await Promise.all([
      getContatoCerimonialista(evento.id),
      getMeuAcesso(evento.id),
      getFotoDoCasal(evento.id),
      getNomesDoCasal(evento.id, evento.nome),
    ]);
    const noInicio = headers().get("x-caminho") === `/portal/${evento.id}`;
    const jaAbriu = cookies().get(`pnab_${evento.id.slice(0, 8)}`)?.value === "1";
    const pessoaNome = eu.nome?.trim() || "Você";
    const cerimonialista = daFamilia ? null : contato.nome?.trim().split(/\s+/)[0] || marca?.nome || null;
    // o Planejamento e as Mesas são de quem abriu a conta sozinha (quem ela
    // convida ainda não)
    const ehDona = daFamilia && (await donaDaFesta(evento.id)) !== null;
    return (
      <div className={`pn ${marcellus.variable} ${nunitoSans.variable} ${simbolos.variable}`}>
        {faixa}
        <CascaNoivos
          eventoId={evento.id}
          marcaNome={marca?.nome ?? null}
          casal={casal}
          eyebrow={/^exemplo\s*·/i.test(nome) ? "Exemplo · o casamento de" : "O casamento de"}
          dataLonga={dataPorExtenso(evento.data)}
          localLinha={[evento.local, evento.cidade].filter(Boolean).join(" · ") || null}
          momentoIso={momentoDoSim(evento.data, evento.hora)}
          agoraServidor={Date.now()}
          fotoUrl={fotoUrl}
          pessoa={{ nome: pessoaNome.split(/\s+/)[0], papel: papelLegivel(eu.papel), ini: pessoaNome.charAt(0).toUpperCase() }}
          menu={MENU_NOIVOS.filter((d) => TELAS_PRONTAS.has(d.chave) && (ehDona || d.chave !== "planejamento"))}
          mais={MAIS_NOIVOS.filter((d) => TELAS_PRONTAS.has(d.chave) && (ehDona || d.chave !== "mesas"))}
          mostrarEntrada={noInicio && !jaAbriu}
          daFamilia={daFamilia}
          cerimonialista={cerimonialista}
          frase={
            daFamilia
              ? "“Cada detalhe conta uma história.”"
              : "“Cada detalhe conta uma história. Estamos cuidando de tudo para que vocês vivam o inesquecível.”"
          }
          temHoje={TELAS_PRONTAS.has("hoje")}
        >
          {children}
        </CascaNoivos>
      </div>
    );
  }

  // O portal v2 (desenho "Portal da Família v2", 25/09/2026): hoje, a
  // debutante. A casca é outra; as telas que o desenho ainda vai trocar
  // entram nela como estão.
  if (usaPortalV2(evento.tipo)) {
    const [contato, estilo, eu, presentes] = await Promise.all([
      getContatoCerimonialista(evento.id),
      getEstiloDoPortal(evento.id),
      getMeuAcesso(evento.id),
      listaDePresentesLiberada(evento.id),
    ]);
    const pessoa = pessoaDoEvento(evento.nome);
    const titulo = tituloDaFesta(evento.nome, nomeDeExibicao(evento));
    const zap = waLink(contato.whatsapp);
    if (modoDoTermo) {
      return (
        <EntradaV2
          eventoId={evento.id}
          tipo={evento.tipo}
          modo={modoDoTermo}
          estilo={estilo}
          marcaNome={marca?.nome ?? null}
          titulo={titulo}
          pessoa={pessoa}
          nomeDeQuemAbriu={eu.nome}
          whatsappLink={zap}
          contatoNome={contato.nome}
        />
      );
    }
    // a abertura: uma vez por sessão, só no Início (o cookie é da casca)
    const noInicio = headers().get("x-caminho") === `/portal/${evento.id}`;
    const jaAbriu = cookies().get(`pv2ab_${evento.id.slice(0, 8)}`)?.value === "1";
    return (
      <>
        {faixa}
        <CascaV2
          eventoId={evento.id}
          tipo={evento.tipo}
          marcaNome={marca?.nome ?? null}
          marcaLogoUrl={marca?.logoUrl ?? null}
          contatoNome={contato.nome}
          whatsappLink={zap}
          inicial={(eu.nome ?? "•").charAt(0).toUpperCase()}
          estilo={estilo}
          destinos={destinosV2(evento.tipo, { presentes })}
          diasRestantes={evento.diasRestantes}
          mostrarAbertura={noInicio && !jaAbriu}
          tituloDoEvento={titulo}
          pessoa={pessoa}
        >
          {children}
        </CascaV2>
        <InstalarPortal />
      </>
    );
  }

  if (modoDoTermo) {
    return (
      <div className="portal-raiz" data-tipo={evento.tipo}>
        <div className="portal-fora">
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "var(--esp-8) var(--esp-5)" }}>
            <TermoDoResponsavel
              eventoId={evento.id}
              modo={modoDoTermo}
              marcaNome={marca?.nome ?? null}
            />
          </div>
        </div>
      </div>
    );
  }

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
            marcaNome={marca?.nome ?? null}
            marcaLogoUrl={marca?.logoUrl ?? null}
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
                marcaNome={marca?.nome ?? null}
                marcaLogoUrl={marca?.logoUrl ?? null}
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
