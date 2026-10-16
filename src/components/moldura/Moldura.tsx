"use client";

// A moldura de programa (15/10/2026, handoff design_handoff_eorganizei).
// Substitui a barra lateral escura do AppShell por três níveis:
//   1. abas de evento no alto, como pastas (Hoje, os 3 mais próximos, os
//      que ela abriu, Todos, + Novo evento);
//   2. o painel Escritório à direita (fora do evento) — dentro do evento a
//      segunda linha são as partes dele (PartesDoEvento, no layout do evento);
//   3. a barra de status fina embaixo: fatos à esquerda; vistas, avisos,
//      suporte, ajuda e a conta à direita.
// No celular as abas viram um seletor no topo e a barra vira o rodapé.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { CaixaDeSuporte } from "@/components/suporte/CaixaDeSuporte";
import { ProvedorDasExplicacoes } from "@/components/ajuda/ContextoDasExplicacoes";
import { definirExplicacoes } from "@/app/(app)/actions";
import { MENU_DO_APP as NAV } from "@/lib/menu-do-app";
import { VISOES_FORNECEDORES, VISOES_ORCAMENTOS } from "@/lib/visoes";
import { FOTO_DA_AREA } from "@/lib/fotos-de-evento";
import { CHAVE_ULTIMA_TELA, gravar } from "@/lib/ultima-tela";
import {
  EVENTO_ABAS,
  contagemDaAba,
  fecharAbaExtra,
  fraseDaProximaFesta,
  lerAbasExtras,
  type AbaDeEvento,
} from "@/lib/abas-de-evento";
import { MOLDURA_CSS } from "./moldura-css";
import { ProvedorDaMoldura, useMoldura } from "./contexto";

export type Congelamento = { congelada: boolean; congelaEm: string | null };

type Props = {
  userEmail: string;
  cargo: string | null;
  empresaNome: string | null;
  /** os 3 eventos mais próximos, já em ordem de data (servidor) */
  proximos: AbaDeEvento[];
  /** "2026-10-15", em horário de Brasília (servidor) */
  hoje: string;
  prazosFrase: string | null;
  esperaFrase: string | null;
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
  const itens: Item[] = [{ label: "Agenda", href: "/calendario" }];
  if (visivel("/orcamentos")) {
    const v = VISOES_ORCAMENTOS.filter((x) => pode(x.cargos));
    // a ordem do desenho: Propostas, Pedidos, Vitrine, Catálogo, Relatório
    const ordem = ["/orcamentos", "/orcamentos/pedidos", "/orcamentos/pagina", "/catalogo", "/orcamentos/relatorio"];
    v.sort((a, b) => ordem.indexOf(a.href) - ordem.indexOf(b.href));
    itens.push({ label: "Comercial", href: "/orcamentos", sub: v.map((x) => ({ label: rotulo[x.label] ?? x.label, href: x.href })) });
  }
  if (visivel("/financeiro")) itens.push({ label: "Financeiro", href: "/financeiro" });
  if (visivel("/fornecedores")) {
    itens.push({
      label: "Fornecedores",
      href: "/fornecedores",
      sub: VISOES_FORNECEDORES.filter((x) => pode(x.cargos)).map((x) => ({ label: x.label, href: x.href })),
    });
  }
  if (visivel("/clientes")) itens.push({ label: "Clientes", href: "/clientes" });
  if (visivel("/estoque")) itens.push({ label: "Estoque", href: "/estoque" });
  // Tarefas e Solicitações saem do menu quando o Hoje as absorver; até lá
  // ficam aqui, para nada sumir de quem usa.
  if (visivel("/tarefas")) itens.push({ label: "Tarefas", href: "/tarefas" });
  if (visivel("/solicitacoes")) itens.push({ label: "Solicitações", href: "/solicitacoes" });
  return itens;
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

function MenuDaConta({
  cargo,
  nome,
  signOut,
  aoNavegar,
}: {
  cargo: string | null;
  nome: string;
  signOut: () => Promise<void>;
  aoNavegar?: () => void;
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
      <button type="button" className="mo-item-status" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        {nome} ▾
      </button>
      {aberto && (
        <div className="mo-menu mo-menu-cima">
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
  const emTodos = pathname === "/eventos" || pathname === "/calendario";

  // ---- abas extras (no aparelho) ----
  const [extras, setExtras] = useState<AbaDeEvento[]>([]);
  useEffect(() => {
    const ler = () => setExtras(lerAbasExtras());
    ler();
    window.addEventListener(EVENTO_ABAS, ler);
    window.addEventListener("storage", ler);
    return () => {
      window.removeEventListener(EVENTO_ABAS, ler);
      window.removeEventListener("storage", ler);
    };
  }, []);
  const idsProximos = new Set(proximos.map((p) => p.id));
  const extrasVisiveis = extras.filter((e) => !idsProximos.has(e.id));

  // ---- painel Escritório: aberto no Hoje a partir de 1280, fechado no evento ----
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

  // ---- seletor do celular ----
  const [seletor, setSeletor] = useState(false);
  useEffect(() => setSeletor(false), [pathname]);

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

  const abaDeEvento = (a: AbaDeEvento, fechavel: boolean) => {
    const ativa = idDoEvento === a.id;
    const conta = contagemDaAba(a.data, hoje);
    return (
      <span key={a.id} className={`mo-aba ${ativa ? "mo-aba-ativa" : ""}`}>
        <Link href={`/eventos/${a.id}`} style={{ color: "inherit", textDecoration: "none", display: "inline-flex", gap: 8, alignItems: "baseline", minWidth: 0 }}>
          <span className="mo-aba-nome">{a.nome}</span>
          {conta && <span className="mo-aba-conta">{conta}</span>}
        </Link>
        {fechavel && (
          <button
            type="button"
            className="mo-aba-x"
            aria-label={`Fechar a aba ${a.nome}`}
            onClick={() => {
              fecharAbaExtra(a.id);
              if (ativa) window.location.assign("/eventos/dashboard");
            }}
          >
            ×
          </button>
        )}
      </span>
    );
  };

  // o que o seletor do celular mostra fechado
  const rotuloAtual = (() => {
    if (naHoje) return { nome: "Hoje", conta: null as string | null };
    if (noNovo) return { nome: "Novo evento", conta: null };
    if (emTodos) return { nome: "Todos os eventos", conta: null };
    if (idDoEvento) {
      const a = [...proximos, ...extras].find((x) => x.id === idDoEvento);
      return { nome: a?.nome ?? "Evento", conta: a ? contagemDaAba(a.data, hoje) : null };
    }
    for (const it of escritorio) {
      const s = it.sub?.find((x) => ativoExato(pathname, x.href));
      if (s) return { nome: s.label, conta: null };
      if (ativoExato(pathname, it.href)) return { nome: it.label, conta: null };
    }
    return { nome: "eorganizei", conta: null };
  })();

  return (
    <div className="mo-raiz">
      <style dangerouslySetInnerHTML={{ __html: MOLDURA_CSS }} />

      {/* ===== computador: faixa das abas + a segunda linha do evento ===== */}
      <div className="mo-cabeca">
      <div className="mo-faixa">
        <Logo />
        <nav className="mo-abas" aria-label="Eventos abertos">
          <Link href="/eventos/dashboard" className={`mo-aba ${naHoje ? "mo-aba-ativa" : ""}`}>Hoje</Link>
          {proximos.map((a) => abaDeEvento(a, false))}
          {extrasVisiveis.map((a) => abaDeEvento(a, true))}
          <Link href="/eventos" className={`mo-aba ${emTodos ? "mo-aba-ativa" : ""}`}>Todos</Link>
          {noNovo ? (
            <span className="mo-aba mo-aba-ativa">
              Novo evento
              <Link href="/eventos/dashboard" className="mo-aba-x" aria-label="Fechar o novo evento" style={{ textDecoration: "none" }}>×</Link>
            </span>
          ) : (
            <Link href="/eventos/novo" className="mo-aba mo-aba-solta">+ Novo evento</Link>
          )}
        </nav>
        <button
          type="button"
          className="mo-escritorio-btn"
          aria-pressed={painel}
          onClick={() => setPainel((p) => !p)}
        >
          Escritório
        </button>
      </div>
      {/* as partes do evento entram aqui por portal (PartesDoEvento) */}
      <div id="mo-segunda-linha" />
      </div>

      {/* ===== celular: seletor no topo ===== */}
      <div className="mo-topo-cel">
        <Logo />
        <button type="button" className="mo-seletor" aria-expanded={seletor} onClick={() => setSeletor((s) => !s)}>
          <span className="mo-seletor-nome">{rotuloAtual.nome}</span>
          {rotuloAtual.conta && <span className="mo-aba-conta">{rotuloAtual.conta}</span>}
          <span className="mo-seletor-seta">{seletor ? "▴" : "▾"}</span>
        </button>
        {seletor && (
          <nav className="mo-lista-cel" aria-label="Ir para">
            <Link href="/eventos/dashboard">Hoje</Link>
            {[...proximos, ...extrasVisiveis].map((a) => (
              <Link key={a.id} href={`/eventos/${a.id}`}>
                <span>{a.nome}</span>
                <span className="mo-aba-conta">{contagemDaAba(a.data, hoje)}</span>
              </Link>
            ))}
            <Link href="/eventos">Todos</Link>
            <Link href="/eventos/novo">+ Novo evento</Link>
            {escritorio.map((it, i) => (
              <span key={it.href} style={{ display: "contents" }}>
                {it.sub ? (
                  <span className={`mo-cabeca-grupo ${i === 0 ? "mo-fio-tinta" : ""}`}>{it.label}</span>
                ) : (
                  <Link href={it.href} className={i === 0 ? "mo-fio-tinta" : ""}>{it.label}</Link>
                )}
                {it.sub?.map((s) => (
                  <Link key={s.href} href={s.href} className="mo-sub">{s.label}</Link>
                ))}
              </span>
            ))}
          </nav>
        )}
      </div>

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
          <aside className="mo-painel" aria-label="Escritório">
            <div className="mo-painel-topo">
              <span className="mo-rotulo">Escritório</span>
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
            {(props.prazosFrase || props.esperaFrase) && (
              <div className="mo-radar">
                <span className="mo-rotulo">Radar</span>
                {props.prazosFrase && <p>{props.prazosFrase}</p>}
                {props.esperaFrase && <p>{props.esperaFrase}</p>}
              </div>
            )}
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
            <NotificationBell variante="texto" />
            <CaixaDeSuporte variante="linha" />
            <Link href="/ajuda" className="mo-item-status">Ajuda</Link>
          </div>
          <div className="mo-status-grupo">
            <MenuDaConta cargo={cargo} nome={nomeDaConta} signOut={props.signOut} />
          </div>
        </div>
      </footer>
      )}

      {/* ===== celular: rodapé fora do evento (dentro, as partes ocupam) ===== */}
      {celular && !idDoEvento && (
        <footer className="mo-rodape-cel">
          <span>{fatos}</span>
          <div className="mo-rodape-linha">
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <NotificationBell variante="texto" />
              <CaixaDeSuporte variante="linha" />
              <Link href="/ajuda" className="mo-item-status">Ajuda</Link>
            </div>
            <MenuDaConta cargo={cargo} nome={nomeDaConta} signOut={props.signOut} />
          </div>
        </footer>
      )}
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
