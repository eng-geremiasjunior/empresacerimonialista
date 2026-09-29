"use client";

import Link from "next/link";
import { Marca } from "@/components/marca/Marca";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
import { CopilotoSidebarCard } from "@/components/layout/CopilotoSidebarCard";
import { CaixaDeSuporte } from "@/components/suporte/CaixaDeSuporte";
import { ExplicacaoDoMenu } from "@/components/ajuda/ExplicacaoDoMenu";
import { ProvedorDasExplicacoes } from "@/components/ajuda/ContextoDasExplicacoes";
import { explicacaoDe } from "@/lib/explicacoes-do-menu";
import { definirExplicacoes } from "@/app/(app)/actions";
import {
  ICONES_DO_MENU as ICONS,
  MENU_DO_APP as NAV,
} from "@/lib/menu-do-app";
import { FOTO_DA_AREA } from "@/lib/fotos-de-evento";
import { CHAVE_ULTIMA_TELA, gravar } from "@/lib/ultima-tela";

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

/** As rotas que vivem por dentro de um item do menu (lib/visoes.ts). */
const TAMBEM_ATIVO: Record<string, string[]> = {
  "/eventos": ["/calendario"],
  "/orcamentos": ["/catalogo"],
  "/fornecedores": ["/contratos", "/agenda"],
};

function isActive(pathname: string, href: string) {
  if (
    (TAMBEM_ATIVO[href] ?? []).some(
      (h) => pathname === h || pathname.startsWith(`${h}/`)
    )
  ) {
    return true;
  }
  if (href === "/eventos/dashboard") return pathname === href;
  if (href === "/eventos") {
    return (
      pathname.startsWith("/eventos") && pathname !== "/eventos/dashboard"
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-10-07" → "7 de outubro". Só formata o que veio do banco. */
function diaLongo(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}` : iso;
}

/**
 * A conta cancelou (151): a faixa diz o que está parado — ou em quantos
 * dias vai parar.
 *
 * Duas frases porque são duas pessoas. A PROPRIETÁRIA decide a assinatura:
 * a dela termina no link que resolve. A coordenadora e a cerimonialista
 * trabalham na mesma conta e também precisam saber por que nada salva, mas
 * dinheiro não é assunto delas — mandá-las a /assinatura seria mandá-las a
 * uma porta que as expulsa.
 *
 * O que a frase promete é o que o banco faz: eventos (pode_editar_evento),
 * clientes e fornecedores param de aceitar escrita. Prometer "nenhuma
 * alteração é salva" seria mais forte do que a trava é.
 */
function fraseDaFaixa(
  congelamento: Congelamento,
  cargo: string | null,
  diasAteCongelar: number | null
): string | null {
  const dona = cargo === "proprietaria";
  const fim = dona ? "" : " Fale com a proprietária.";

  if (congelamento.congelada) {
    return (
      "A conta está só para leitura: os eventos e os cadastros não aceitam alterações." +
      (dona ? " Assinar de novo destrava na hora." : fim)
    );
  }
  if (diasAteCongelar === null || !congelamento.congelaEm) return null;
  return (
    `Em ${diasAteCongelar} ${diasAteCongelar === 1 ? "dia" : "dias"}, no dia ` +
    `${diaLongo(congelamento.congelaEm)}, a conta deixa de aceitar alterações.` +
    fim
  );
}

/** Quantos dias antes do congelamento a faixa começa a aparecer. */
const AVISO_DIAS = 14;

export type Congelamento = { congelada: boolean; congelaEm: string | null };

type Props = {
  userEmail: string;
  avatarUrl: string | null;
  cargo: string | null;
  prazosFrase: string | null;
  esperaFrase: string | null;
  /**
   * A conta cancelou: já congelou (não aceita mais alterações) e/ou o dia
   * em que congela (151). Null = nada a dizer.
   *
   * Sem esta faixa, a trava chega à tela como a RLS a devolve — "não foi
   * possível salvar", sem causa. A faixa é o que transforma "deu erro" em
   * "eu sei por quê", e por isso acompanha TODAS as telas, não só a de
   * assinatura: quem descobre o congelamento está no meio de um roteiro.
   */
  congelamento: Congelamento | null;
  /**
   * Mostrar o "?" ao lado de cada item do menu (159). Preferência de
   * PESSOA, não da empresa: quem entrou ontem precisa das fichas mesmo
   * quando a proprietária já desligou as dela.
   */
  explicacoes: boolean;
  signOut: () => Promise<void>;
  children: React.ReactNode;
};

export function AppShell({
  userEmail,
  avatarUrl,
  cargo,
  prazosFrase,
  esperaFrase,
  congelamento,
  explicacoes,
  signOut,
  children,
}: Props) {
  // Cargo null é quem meu_cargo() não reconhece: ex-membro desativada,
  // ou conta sem vínculo. Antes via o menu inteiro "preservando o
  // comportamento antigo" — só que as telas restritas vinham vazias de
  // qualquer jeito (a RLS não devolve nada), então o que ela ganhava era
  // um passeio por Financeiro e Catálogo em branco. Agora vê só o que
  // não pede cargo; ninguém fica trancado fora do básico.
  const navVisivel = NAV.filter(
    (item) => !item.cargos || (cargo !== null && item.cargos.includes(cargo))
  );
  // Um grupo só aparece com item visível dentro; a Ajuda (sem grupo) é o
  // último bloco. A ordem é a de NAV.
  const grupos = Array.from(new Set(navVisivel.map((item) => item.grupo)));
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");

  // O "?" some NA HORA, sem esperar o banco: quem desliga quer o menu
  // limpo agora. A gravação vai junto, e é ela que faz a escolha
  // sobreviver ao recarregar e chegar ao outro computador.
  const [mostrarExplicacoes, setMostrarExplicacoes] = useState(explicacoes);
  useEffect(() => setMostrarExplicacoes(explicacoes), [explicacoes]);
  const desativarExplicacoes = () => {
    setMostrarExplicacoes(false);
    void definirExplicacoes(false).then((r) => {
      // Não deu para gravar: o "?" volta. Deixá-lo escondido só até o
      // próximo recarregar seria pior que não esconder — a pessoa acharia
      // que decidiu, e a decisão evaporaria sem ela ver.
      if (!r.ok) setMostrarExplicacoes(true);
    });
  };

  // A última tela que ela usou (29/09/2026): o 1º bloco do painel. As
  // telas de um evento são gravadas pelo layout do evento (LembrarEvento),
  // que sabe o nome dele; aqui ficam as áreas do menu. Painel, conta e
  // ajuda não contam como "de onde eu parei".
  useEffect(() => {
    if (!pathname) return;
    if (/^\/eventos\/(dashboard|novo)(\/|$)/.test(pathname)) return;
    if (/^\/eventos\/[0-9a-f-]{36}(\/|$)/.test(pathname)) return;
    const item = NAV.filter((i) => !i.cargos || (cargo !== null && i.cargos.includes(cargo)))
      .filter((i) => !["/eventos/dashboard", "/ajuda", "/assinatura", "/configuracoes"].includes(i.href))
      .find((i) => isActive(pathname, i.href));
    if (!item) return;
    const foto = FOTO_DA_AREA[item.href] ?? { src: "/site/foto-palco.webp", posicao: "45% 40%" };
    gravar(CHAVE_ULTIMA_TELA, {
      href: pathname,
      titulo: item.label,
      detalhe: null,
      foto: foto.src,
      posicao: foto.posicao,
      externa: false,
    });
  }, [pathname, cargo]);

  // Data calculada no cliente para evitar divergência de hidratação
  useEffect(() => {
    const label = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
    setToday(label.charAt(0).toUpperCase() + label.slice(1));
  }, []);

  // Quantos dias faltam até a conta parar de aceitar alterações — no
  // CLIENTE, pelo mesmo motivo do relógio acima: "hoje" no servidor e
  // "hoje" no navegador podem ser dias diferentes, e a divergência faz o
  // React refazer a página inteira. `congelada` vem pronto do banco e por
  // isso pode aparecer já no primeiro render; a contagem, não.
  const [diasAteCongelar, setDiasAteCongelar] = useState<number | null>(null);
  const congelada = congelamento?.congelada ?? false;
  const congelaEm = congelamento?.congelaEm ?? null;
  useEffect(() => {
    if (congelada || !congelaEm) {
      setDiasAteCongelar(null);
      return;
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(congelaEm);
    if (!m) return;
    // meia-noite UTC nos dois lados: subtrair datas em hora local erra um
    // dia quando o horário de verão começa dentro do intervalo
    const alvo = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const agora = new Date();
    const hoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const dias = Math.round((alvo - hoje) / 86_400_000);
    setDiasAteCongelar(dias > 0 && dias <= AVISO_DIAS ? dias : null);
  }, [congelada, congelaEm]);

  // Dentro de /assinatura a faixa não entra: a própria tela diz o mesmo,
  // com mais detalhe e com a vitrine embaixo. Duas caixas para um recado
  // só, e um link para a página em que a pessoa já está.
  const congelamentoFrase =
    congelamento && pathname !== "/assinatura"
      ? fraseDaFaixa(congelamento, cargo, diasAteCongelar)
      : null;

  const initials = userEmail.slice(0, 2).toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-5">
        {/* fundo tinta: a palavra usa a variante escura, senão o "e" some */}
        <Marca tamanho={18} escuro comSimbolo={false} />
        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-stone-400 hover:text-white lg:hidden"
          aria-label="Fechar menu"
        >
          <Icon name="fechar" />
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {/* O fundo (ativo/hover) mudou de lugar: era do próprio link, agora
            é da linha inteira — senão o "?" ficaria de fora do realce, como
            um botão solto ao lado do item. O link continua sendo TODO o
            resto da linha, então a área de clique para navegar não
            encolheu. */}
        {grupos.map((grupo) => (
          <div key={grupo ?? "solto"} className="pt-3 first:pt-0">
            {grupo && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                {grupo}
              </p>
            )}
            <div className="space-y-0.5">
        {navVisivel.filter((item) => item.grupo === grupo).map((item) => {
          const ativo = isActive(pathname, item.href);
          const explicacao = mostrarExplicacoes ? explicacaoDe(item.href) : null;
          return (
            <div
              key={item.label}
              className={`group flex items-center rounded-lg transition-colors ${
                explicacao ? "pr-2" : ""
              } ${ativo ? "bg-stone-800" : "hover:bg-stone-800/60"}`}
            >
              {/* gap-2.5 em vez de gap-3 quando há "?": o rótulo mais longo
                  do menu ("Agenda de Fornecedores") cabia por pouco, e o
                  botão comeu essa folga. */}
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex min-w-0 flex-1 items-center ${
                  explicacao ? "gap-2.5 pr-1" : "gap-3"
                } rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  ativo ? "text-white" : "text-stone-400 group-hover:text-white"
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
              {explicacao ? (
                <ExplicacaoDoMenu rotulo={item.label} explicacao={explicacao} />
              ) : null}
            </div>
          );
        })}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-2 border-t border-stone-800 p-3">
        {/* Suporte logo ACIMA do Copiloto — lugar pedido pelo dono. */}
        <CaixaDeSuporte />
        <CopilotoSidebarCard prazosFrase={prazosFrase} esperaFrase={esperaFrase} />
      </div>
      <div className="border-t border-stone-800 px-5 py-3">
        <p className="truncate text-xs text-stone-500">{userEmail}</p>
      </div>
    </div>
  );

  return (
    // O provedor abraça a casca INTEIRA, e não só o menu: o "?" também
    // aparece nas fases e nas abas de dentro do evento, que são `children`.
    <ProvedorDasExplicacoes
      valor={{ ligadas: mostrarExplicacoes, desativar: desativarExplicacoes }}
    >
    <div className="min-h-screen lg:flex">
      {/* Sidebar mobile (drawer) + desktop (fixa) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-stone-900 transition-transform lg:static lg:z-auto lg:shrink-0 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
            <button
              onClick={() => setOpen(true)}
              className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 lg:hidden"
              aria-label="Abrir menu"
            >
              <Icon name="menu" />
            </button>
            <p className="hidden text-sm text-stone-500 md:block">{today}</p>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <Link
                href="/configuracoes"
                title="Editar perfil"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-stone-100"
              >
                <Avatar src={avatarUrl} fallback={initials} size="sm" />
                <span className="hidden max-w-[160px] truncate text-sm text-stone-600 sm:block">
                  {userEmail}
                </span>
              </Link>
              <form action={signOut}>
                <button
                  title="Sair"
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                >
                  <Icon name="sair" className="h-4 w-4" />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Faixa fina, âmbar sóbrio, no topo do conteúdo. Sem ícone, sem
            botão de fechar: enquanto a conta não aceitar alterações, esta
            linha é a explicação de todo salvamento que falhar.
            O link só aparece para quem decide a assinatura — /assinatura
            devolve as outras ao painel, e mandar a coordenadora a uma
            porta que a expulsa seria repetir o erro que a faixa corrige. */}
        {congelamentoFrase && (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 lg:px-6">
            <p className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-amber-900">
              {congelamentoFrase}
              {cargo === "proprietaria" && (
                <Link
                  href="/assinatura"
                  className="font-medium underline underline-offset-2 hover:text-amber-950"
                >
                  Ver assinatura
                </Link>
              )}
            </p>
          </div>
        )}

        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
    </ProvedorDasExplicacoes>
  );
}
