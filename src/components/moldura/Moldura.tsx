"use client";

// A moldura de programa (15/10/2026, handoff design_handoff_eorganizei),
// revista por ele em 16/10/2026:
//   1. o menu primário à esquerda — só o principal do principal: Dashboard,
//      Eventos e Novo evento;
//   2. o menu secundário à direita, aberto pelo ☰ no alto (fora do evento);
//      dentro do evento, a faixa do alto mostra as partes dele (PartesDoEvento);
//   3. a barra de status fina embaixo: fatos à esquerda; vistas, avisos,
//      suporte, ajuda e a conta à direita.
// No celular vale o modelo anterior (MenuDoCelular, 18/10/2026).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { CaixaDeSuporte } from "@/components/suporte/CaixaDeSuporte";
import { ProvedorDasExplicacoes } from "@/components/ajuda/ContextoDasExplicacoes";
import { definirExplicacoes } from "@/app/(app)/actions";
import { ICONES_DO_MENU, MENU_DO_APP as NAV } from "@/lib/menu-do-app";
import { VISOES_FORNECEDORES, VISOES_ORCAMENTOS } from "@/lib/visoes";
import { FOTO_DA_AREA } from "@/lib/fotos-de-evento";
import { CHAVE_ULTIMA_TELA, gravar } from "@/lib/ultima-tela";
import { fraseDaProximaFesta, type AbaDeEvento } from "@/lib/abas-de-evento";
import { MOLDURA_CSS } from "./moldura-css";
import { Aparencia, SCRIPT_APARENCIA } from "./Aparencia";
import { MenuDoCelular } from "./MenuDoCelular";
import { ProvedorDaMoldura, useMoldura } from "./contexto";

export type Congelamento = { congelada: boolean; congelaEm: string | null };

type Props = {
  userEmail: string;
  cargo: string | null;
  empresaNome: string | null;
  avatarUrl: string | null;
  /** os 3 eventos mais próximos, já em ordem de data (servidor) */
  proximos: AbaDeEvento[];
  /** "2026-10-15", em horário de Brasília (servidor) */
  hoje: string;
  congelamento: Congelamento | null;
  explicacoes: boolean;
  signOut: () => Promise<void>;
  children: React.ReactNode;
};

type Item = { label: string; href: string; sub?: { label: string; href: string }[] };

const UUID = /^\/eventos\/([0-9a-f-]{36})(\/|$)/;

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
function diaLongo(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}` : iso;
}

/** As rotas que vivem por dentro de um item (lib/visoes.ts). */
const TAMBEM_ATIVO: Record<string, string[]> = {
  "/eventos": ["/calendario"],
  "/orcamentos": ["/catalogo"],
  "/fornecedores": ["/contratos", "/agenda"],
};
function isActive(pathname: string, href: string) {
  if ((TAMBEM_ATIVO[href] ?? []).some((h) => pathname === h || pathname.startsWith(`${h}/`))) return true;
  if (href === "/eventos/dashboard") return pathname === href;
  if (href === "/eventos") return pathname.startsWith("/eventos") && pathname !== "/eventos/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
function ativoExato(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Os itens do painel Escritório, filtrados pelo cargo. */
function itensDoEscritorio(cargo: string | null): Item[] {
  const pode = (cargos?: string[]) => !cargos || (cargo !== null && cargos.includes(cargo));
  const nav = (href: string) => NAV.find((i) => i.href === href);
  const visivel = (href: string) => {
    const i = nav(href);
    return !!i && pode(i.cargos);
  };
  const rotulo: Record<string, string> = { "Vitrine profissional": "Vitrine" };
  // Propostas, Fornecedores (cadastro), Agenda e Financeiro foram para
  // "Ferramentas", no menu da esquerda (16/10/2026); aqui fica o resto
  const itens: Item[] = [];
  if (visivel("/orcamentos")) {
    const v = VISOES_ORCAMENTOS.filter((x) => pode(x.cargos));
    // a ordem do desenho: Propostas, Pedidos, Vitrine, Catálogo, Relatório
    const ordem = ["/orcamentos", "/orcamentos/pedidos", "/orcamentos/pagina", "/catalogo", "/orcamentos/relatorio"];
    v.sort((a, b) => ordem.indexOf(a.href) - ordem.indexOf(b.href));
    const sub = v.filter((x) => x.href !== "/orcamentos").map((x) => ({ label: rotulo[x.label] ?? x.label, href: x.href }));
    if (sub.length) itens.push({ label: "Comercial", href: sub[0].href, sub });
  }
  if (visivel("/fornecedores")) {
    itens.push({
      label: "Fornecedores",
      href: "/contratos",
      sub: VISOES_FORNECEDORES.filter((x) => pode(x.cargos) && x.href !== "/fornecedores").map((x) => ({ label: x.label, href: x.href })),
    });
  }
  // Clientes foi para o menu primário (16/10/2026, pedido dele)
  if (visivel("/estoque")) itens.push({ label: "Estoque", href: "/estoque" });
  // Tarefas e Solicitações saem do menu quando o Hoje as absorver; até lá
  // ficam aqui, para nada sumir de quem usa.
  if (visivel("/tarefas")) itens.push({ label: "Tarefas", href: "/tarefas" });
  if (visivel("/solicitacoes")) itens.push({ label: "Solicitações", href: "/solicitacoes" });
  return itens;
}

type ItemDoMenuEsquerdo = { label: string; href: string; icone: string; ativo: (p: string) => boolean; sub?: boolean };

/** O menu da esquerda (16/10/2026, aprovado por ele com a Wedy de referência). */
function ferramentasDoMenu(cargo: string | null): ItemDoMenuEsquerdo[] {
  const pode = (href: string) => {
    const i = NAV.find((x) => x.href === href);
    return !!i && (!i.cargos || (cargo !== null && i.cargos.includes(cargo)));
  };
  const OUTRAS_DO_COMERCIAL = ["/orcamentos/pedidos", "/orcamentos/pagina", "/orcamentos/relatorio"];
  const itens: ItemDoMenuEsquerdo[] = [];
  if (pode("/orcamentos"))
    itens.push({
      label: "Propostas",
      href: "/orcamentos",
      icone: ICONES_DO_MENU.cotacoes,
      ativo: (p) => (p === "/orcamentos" || p.startsWith("/orcamentos/")) && !OUTRAS_DO_COMERCIAL.some((o) => p.startsWith(o)),
    });
  if (pode("/fornecedores"))
    itens.push({ label: "Fornecedores", href: "/fornecedores", icone: ICONES_DO_MENU.fornecedores, ativo: (p) => p === "/fornecedores" || p.startsWith("/fornecedores/") });
  itens.push({ label: "Agenda", href: "/calendario", icone: ICONES_DO_MENU.calendario, ativo: (p) => p.startsWith("/calendario") });
  if (pode("/financeiro"))
    itens.push({ label: "Financeiro", href: "/financeiro", icone: ICONES_DO_MENU.financeiro, ativo: (p) => p.startsWith("/financeiro") });
  return itens;
}

function LinkDoMenu({ p, ativo }: { p: { label: string; href: string; icone: string; sub?: boolean }; ativo: boolean }) {
  return (
    <Link href={p.href} className={`mo-prim ${p.sub ? "mo-prim-sub" : ""} ${ativo ? "mo-prim-ativo" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={p.icone} />
      </svg>
      {p.label}
    </Link>
  );
}

/** A frase da faixa da conta cancelada (151) — mesma regra do AppShell. */
function fraseDaFaixa(c: Congelamento, cargo: string | null, dias: number | null): string | null {
  const dona = cargo === "proprietaria";
  const fim = dona ? "" : " Fale com a proprietária.";
  if (c.congelada) {
    return "A conta está só para leitura: os eventos e os cadastros não aceitam alterações." +
      (dona ? " Assinar de novo destrava na hora." : fim);
  }
  if (dias === null || !c.congelaEm) return null;
  return `Em ${dias} ${dias === 1 ? "dia" : "dias"}, no dia ${diaLongo(c.congelaEm)}, a conta deixa de aceitar alterações.` + fim;
}
const AVISO_DIAS = 14;

/** Fecha um menu suspenso ao clicar fora dele. */
function useFora(aberto: boolean, fechar: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fn = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) fechar();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [aberto, fechar]);
  return ref;
}

function Logo() {
  return (
    <Link href="/eventos/dashboard" className="mo-logo" aria-label="eorganizei, início">
      <span className="e">e</span>
      <span className="o">organizei</span>
    </Link>
  );
}

function Iniciais({ nome, foto }: { nome: string; foto: string | null }) {
  const ini = nome.trim().split(/s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  // eslint-disable-next-line @next/next/no-img-element
  return foto ? <img src={foto} alt="" className="mo-avatar" /> : <span className="mo-avatar" aria-hidden>{ini}</span>;
}

function MenuDaConta({
  cargo,
  nome,
  signOut,
  aoNavegar,
  foto,
  noTopo = false,
}: {
  cargo: string | null;
  nome: string;
  signOut: () => Promise<void>;
  aoNavegar?: () => void;
  foto?: string | null;
  noTopo?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useFora(aberto, () => setAberto(false));
  const dona = cargo === "proprietaria";
  const equipe = dona || cargo === "coordenadora";
  const fechar = () => {
    setAberto(false);
    aoNavegar?.();
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      {noTopo ? (
        <button type="button" className="mo-acao-topo" aria-expanded={aberto} aria-label={`Conta: ${nome}`} onClick={() => setAberto((a) => !a)}>
          <Iniciais nome={nome} foto={foto ?? null} />
          <span className="mo-acao-rotulo">Conta</span>
        </button>
      ) : (
        <button type="button" className="mo-item-status" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
          {nome} ▾
        </button>
      )}
      {aberto && (
        <div className={`mo-menu ${noTopo ? "mo-menu-baixo" : "mo-menu-cima"}`}>
          {noTopo && <span className="mo-menu-nome">{nome}</span>}
          {equipe && <Link href="/cerimonialistas" onClick={fechar}>Equipe</Link>}
          <Link href="/configuracoes" onClick={fechar}>Configurações</Link>
          {dona && <Link href="/assinatura" onClick={fechar}>Assinatura</Link>}
          <hr />
          <form action={signOut}>
            <button type="submit">Sair</button>
          </form>
        </div>
      )}
    </div>
  );
}

function Casca(props: Props) {
  const { cargo, proximos, hoje, congelamento, children } = props;
  const pathname = usePathname() ?? "";
  const m = useMoldura();

  const idDoEvento = UUID.exec(pathname)?.[1] ?? null;
  const naHoje = pathname === "/eventos/dashboard";
  const noNovo = pathname === "/eventos/novo";
  const emTodos = pathname === "/eventos";

  // ---- o menu (☰) à direita: aberto no Dashboard a partir de 1280, fechado no evento ----
  const [painel, setPainel] = useState(false);
  useEffect(() => {
    if (idDoEvento) setPainel(false);
    else if (naHoje && window.innerWidth >= 1280) setPainel(true);
  }, [idDoEvento, naHoje]);

  // ---- celular ou computador: avisos e suporte montam UMA vez (cada um
  // consulta o servidor; duas cópias seriam o dobro de chamadas) ----
  const [celular, setCelular] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const ler = () => setCelular(mq.matches);
    ler();
    mq.addEventListener("change", ler);
    return () => mq.removeEventListener("change", ler);
  }, []);

  const escritorio = itensDoEscritorio(cargo);

  // ---- a última tela que ela usou (29/09/2026), como no AppShell ----
  useEffect(() => {
    if (!pathname) return;
    if (/^\/eventos\/(dashboard|novo)(\/|$)/.test(pathname)) return;
    if (UUID.test(pathname)) return;
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

  // ---- conta cancelada (151): contagem no cliente, como antes ----
  const [diasAteCongelar, setDiasAteCongelar] = useState<number | null>(null);
  const congelada = congelamento?.congelada ?? false;
  const congelaEm = congelamento?.congelaEm ?? null;
  useEffect(() => {
    if (congelada || !congelaEm) {
      setDiasAteCongelar(null);
      return;
    }
    const mm = /^(\d{4})-(\d{2})-(\d{2})/.exec(congelaEm);
    if (!mm) return;
    const alvo = Date.UTC(Number(mm[1]), Number(mm[2]) - 1, Number(mm[3]));
    const agora = new Date();
    const dHoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const dias = Math.round((alvo - dHoje) / 86_400_000);
    setDiasAteCongelar(dias > 0 && dias <= AVISO_DIAS ? dias : null);
  }, [congelada, congelaEm]);
  const faixa =
    congelamento && pathname !== "/assinatura" ? fraseDaFaixa(congelamento, cargo, diasAteCongelar) : null;

  const nomeDaConta = props.empresaNome?.trim() || props.userEmail;
  const fatos = m?.fatos ?? fraseDaProximaFesta(proximos, hoje);
  const vistas = idDoEvento ? m?.vistas ?? null : null;

  // o menu primário (16/10/2026, pedido dele): só o principal do principal
  const primario = [
    { label: "Dashboard", href: "/eventos/dashboard", ativo: naHoje, icone: ICONES_DO_MENU.dashboard },
    ...(cargo === "proprietaria"
      ? [{ label: "Carteira", href: "/carteira", ativo: pathname.startsWith("/carteira"), icone: ICONES_DO_MENU.carteira }]
      : []),
    { label: "Eventos", href: "/eventos", ativo: emTodos || !!idDoEvento, icone: ICONES_DO_MENU.eventos },
    ...(cargo === "proprietaria"
      ? [{ label: "Modelos", href: "/configuracoes/modelo", ativo: pathname.startsWith("/configuracoes/modelo"), icone: ICONES_DO_MENU.catalogo, sub: true }]
      : []),
    { label: "Clientes", href: "/clientes", ativo: ativoExato(pathname, "/clientes"), icone: ICONES_DO_MENU.clientes },
    { label: "Novo evento", href: "/eventos/novo", ativo: noNovo, icone: "M12 4.5v15m7.5-7.5h-15" },
  ];

  const ferramentas = ferramentasDoMenu(cargo);

  return (
    <div className="mo-raiz">
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_APARENCIA }} />
      <style dangerouslySetInnerHTML={{ __html: MOLDURA_CSS }} />

      {/* ===== computador: o menu primário à esquerda ===== */}
      <aside className="mo-lateral" aria-label="Menu primário">
        <div className="mo-lateral-dentro">
        <Logo />
        <nav className="mo-primario">
          {primario.map((p) => (
            <LinkDoMenu key={p.href} p={p} ativo={p.ativo} />
          ))}
        </nav>
        {ferramentas.length > 0 && (
          <nav className="mo-primario mo-ferramentas" aria-label="Ferramentas">
            <span className="mo-grupo-rotulo">Ferramentas</span>
            {ferramentas.map((p) => (
              <LinkDoMenu key={p.href} p={p} ativo={p.ativo(pathname)} />
            ))}
          </nav>
        )}
        </div>
      </aside>

      <div className="mo-coluna">
      {/* ===== computador: faixa fina no alto — as partes do evento (por
          portal, PartesDoEvento) e o ☰ do menu secundário ===== */}
      <div className="mo-cabeca">
        <div id="mo-segunda-linha" />
        {!celular && (
          <div className="mo-acoes">
            <Aparencia />
            <NotificationBell variante="topo" />
            <MenuDaConta cargo={cargo} nome={nomeDaConta} signOut={props.signOut} foto={props.avatarUrl} noTopo />
          </div>
        )}
        <button
          type="button"
          className="mo-menu-btn"
          aria-pressed={painel}
          aria-label={painel ? "Fechar o menu" : "Abrir o menu"}
          title="Menu"
          onClick={() => setPainel((p) => !p)}
        >
          <span className="mo-barras" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <span className="mo-acao-rotulo">Menu</span>
        </button>
      </div>

      {/* ===== celular: o modelo anterior (18/10/2026, pedido dele) ===== */}
      {celular && (
        <MenuDoCelular cargo={cargo} userEmail={props.userEmail} avatarUrl={props.avatarUrl} signOut={props.signOut} />
      )}

      {faixa && (
        <div className="mo-faixa-aviso">
          {faixa}
          {cargo === "proprietaria" && <Link href="/assinatura">Ver assinatura</Link>}
        </div>
      )}

      <div className="mo-corpo">
        <main className="mo-principal">
          <div className="mo-conteudo">{children}</div>
        </main>

        {painel && (
          <aside className="mo-painel" aria-label="Menu">
            <div className="mo-painel-topo">
              <span className="mo-rotulo">Menu</span>
              <button type="button" className="mo-fechar" onClick={() => setPainel(false)}>fechar</button>
            </div>
            {escritorio.map((it) => (
              <div key={it.href} className="mo-grupo">
                {it.sub ? (
                  <>
                    <span className="mo-grupo-titulo">{it.label}</span>
                    <div className="mo-subitens">
                      {it.sub.map((s) => (
                        <Link key={s.href} href={s.href} className={`mo-subitem ${ativoExato(pathname, s.href) && (s.href !== "/orcamentos" || pathname === "/orcamentos") ? "mo-subitem-ativo" : ""}`}>
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <Link href={it.href} className={`mo-grupo-titulo ${ativoExato(pathname, it.href) ? "mo-subitem-ativo" : ""}`}>
                    {it.label}
                  </Link>
                )}
              </div>
            ))}
          </aside>
        )}
      </div>

      {/* ===== computador: barra de status ===== */}
      {!celular && (
      <footer className="mo-status">
        <span className="mo-status-fatos">{fatos}</span>
        <div className="mo-status-dir">
          {vistas && vistas.length > 0 && (
            <div className="mo-status-grupo">
              {vistas.map((v) => (
                <Link
                  key={v.label}
                  href={v.href}
                  target={v.novaAba ? "_blank" : undefined}
                  className={`mo-vista ${v.ativa ? "mo-vista-ativa" : ""}`}
                >
                  {v.label}
                </Link>
              ))}
            </div>
          )}
          <div className="mo-status-grupo">
            <CaixaDeSuporte variante="linha" />
            <Link href="/ajuda" className="mo-item-status">Ajuda</Link>
          </div>
        </div>
      </footer>
      )}

      </div>
    </div>
  );
}

export function Moldura(props: Props) {
  // As explicações "?" (159) continuam valendo nas partes do evento.
  const [mostrar, setMostrar] = useState(props.explicacoes);
  useEffect(() => setMostrar(props.explicacoes), [props.explicacoes]);
  const desativar = () => {
    setMostrar(false);
    void definirExplicacoes(false).then((r) => {
      if (!r.ok) setMostrar(true);
    });
  };
  return (
    <ProvedorDasExplicacoes valor={{ ligadas: mostrar, desativar }}>
      <ProvedorDaMoldura>
        <Casca {...props} />
      </ProvedorDaMoldura>
    </ProvedorDasExplicacoes>
  );
}
