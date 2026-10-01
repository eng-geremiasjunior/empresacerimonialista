"use client";

// A casca do portal dos noivos (desenho v4, 30/09/2026), em alta
// fidelidade:
//   · ENTRADA — a foto do casal em tela cheia com as iniciais; tocar abre o
//     portal e a MESMA camada da foto encolhe até virar a capa (1.1s);
//   · BARRA — marca, Planejando/É hoje, Entrada, sino, a pessoa;
//   · CAPA — "O casamento de…", nome, data e local, contagem regressiva
//     (no "É hoje": "É hoje." e quanto falta para o sim);
//   · MENU — 11 ícones + "Mais" (8 itens em duas colunas); no "É hoje", a
//     pílula de "funciona sem internet" no lugar do menu;
//   · o conteúdo da tela e o rodapé (a frase e "Deixe o portal na tela").
//
// A entrada toca uma vez por sessão (cookie da casca, como na v2) e o
// botão "Entrada" repete. As telas são rotas: a casca fica (é layout) e só
// o conteúdo troca.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  chaveDoCaminho,
  type Casal,
  type DestinoNoivos,
} from "@/lib/portal-noivos";
import { ProvedorNoivos, usePortalNoivos } from "./contexto";

export type PessoaDaBarra = { nome: string; papel: string; ini: string };

type Props = {
  eventoId: string;
  /** a marca da cerimonialista; null = eorganizei (conta de família) */
  marcaNome: string | null;
  casal: Casal | null;
  /** "O casamento de" ou "Exemplo · o casamento de" */
  eyebrow: string;
  /** "20 de março de 2027" */
  dataLonga: string;
  /** "Villa Real · Itu" */
  localLinha: string | null;
  /** o instante do sim (ISO com fuso de Brasília); null = sem data */
  momentoIso: string | null;
  /** o relógio do servidor, para o 1º render ser igual nos dois lados */
  agoraServidor: number;
  fotoUrl: string | null;
  pessoa: PessoaDaBarra;
  menu: DestinoNoivos[];
  mais: DestinoNoivos[];
  mostrarEntrada: boolean;
  daFamilia: boolean;
  cerimonialista: string | null;
  /** a frase do rodapé */
  frase: string;
  /** o "É hoje" existe (a tela foi entregue e a data permite) */
  temHoje: boolean;
  children: ReactNode;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function CascaNoivos(props: Props) {
  return (
    <ProvedorNoivos
      casa={{
        eventoId: props.eventoId,
        base: `/portal/${props.eventoId}`,
        cerimonialista: props.cerimonialista,
        daFamilia: props.daFamilia,
      }}
    >
      <Casca {...props} />
    </ProvedorNoivos>
  );
}

function Casca({
  eventoId,
  marcaNome,
  casal,
  eyebrow,
  dataLonga,
  localLinha,
  momentoIso,
  agoraServidor,
  fotoUrl,
  pessoa,
  menu,
  mais,
  mostrarEntrada,
  frase,
  temHoje,
  children,
}: Props) {
  const caminho = usePathname() ?? "";
  const router = useRouter();
  const base = `/portal/${eventoId}`;
  const chave = chaveDoCaminho(caminho, eventoId);
  const hoje = chave === "hoje";

  const [estado, setEstado] = useState<"entrada" | "aberto">(mostrarEntrada ? "entrada" : "aberto");
  // já aberto na sessão: sem os atrasos da coreografia de entrada
  const [jaAberto, setJaAberto] = useState(!mostrarEntrada);
  const [maisAberto, setMaisAberto] = useState(false);
  const [pessoaAberta, setPessoaAberta] = useState(false);
  const [agora, setAgora] = useState(agoraServidor);
  const menuRef = useRef<HTMLDivElement>(null);
  const pessoaRef = useRef<HTMLDivElement>(null);

  // o relógio da contagem: começa no do servidor (sem erro de hidratação)
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // trocar de tela fecha as folhas
  useEffect(() => {
    setMaisAberto(false);
    setPessoaAberta(false);
  }, [caminho]);

  // clicar fora fecha
  useEffect(() => {
    function fora(e: MouseEvent) {
      const alvo = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(alvo)) setMaisAberto(false);
      if (pessoaRef.current && !pessoaRef.current.contains(alvo)) setPessoaAberta(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const abrir = useCallback(() => {
    if (estado !== "entrada") return;
    setEstado("aberto");
    try {
      document.cookie = `pnab_${eventoId.slice(0, 8)}=1; path=/portal; samesite=lax`;
    } catch {
      /* sem cookie: a entrada toca de novo na próxima visita, e só */
    }
  }, [estado, eventoId]);

  const voltarAEntrada = useCallback(() => {
    setJaAberto(false);
    setMaisAberto(false);
    setPessoaAberta(false);
    setEstado("entrada");
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const cont = useMemo(() => {
    if (!momentoIso) return null;
    const diff = Math.max(0, new Date(momentoIso).getTime() - agora);
    return {
      d: Math.floor(diff / 864e5),
      h: pad(Math.floor(diff / 36e5) % 24),
      m: pad(Math.floor(diff / 6e4) % 60),
      s: pad(Math.floor(diff / 1e3) % 60),
      diff,
    };
  }, [momentoIso, agora]);

  const faltaParaOSim = useMemo(() => {
    if (!cont || cont.diff <= 0) return null;
    const seg = Math.floor(cont.diff / 1000);
    if (seg >= 3600) return `${Math.floor(seg / 3600)}h${pad(Math.floor(seg / 60) % 60)}`;
    return `${pad(Math.floor(seg / 60))}:${pad(seg % 60)}`;
  }, [cont]);

  const iniA = casal?.a.charAt(0).toUpperCase() ?? "•";
  const iniB = casal?.b?.charAt(0).toUpperCase() ?? null;
  const ativoMais = mais.some((m) => m.chave === chave);

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/portal/entrar");
    router.refresh();
  }

  const marca = marcaNome ? (
    marcaNome
  ) : (
    <span className="pn-logo-eorg">
      <span className="e">e</span>organizei
    </span>
  );

  return (
    <div className="pn-moldura">
      <div className="pn-palco" data-estado={estado} data-ja-aberto={jaAberto ? "1" : "0"}>
        {/* a foto: a mesma camada na entrada e na capa */}
        <div
          className="pn-foto"
          onClickCapture={
            estado === "entrada"
              ? (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  abrir();
                }
              : undefined
          }
          role={estado === "entrada" ? "button" : undefined}
          tabIndex={estado === "entrada" ? 0 : undefined}
          aria-label={estado === "entrada" ? "Entrar no portal" : undefined}
          onKeyDown={
            estado === "entrada"
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    abrir();
                  }
                }
              : undefined
          }
        >
          <div className="pn-foto-kb">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl} alt="" />
            ) : null}
          </div>
          <div className="pn-foto-veu" />
          <div className="pn-foto-brilho" />
          {estado === "entrada" && (
            <div className="pn-entrada">
              <div className="pn-t pn-entrada-marca">{marcaNome ?? "eorganizei"}</div>
              <div className="pn-entrada-centro">
                <div className="pn-t pn-entrada-iniciais">
                  {iniA}
                  {iniB && (
                    <>
                      <span className="e">&amp;</span>
                      {iniB}
                    </>
                  )}
                </div>
                <div className="pn-entrada-linha">
                  {[casal ? (casal.b ? `${casal.a} e ${casal.b}` : casal.a) : null, dataLonga]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <div className="pn-entrada-base">
                <div className="pn-t pn-entrada-toque">Toque na foto para entrar</div>
                <div className="pn-entrada-traco" />
              </div>
            </div>
          )}
        </div>

        {estado === "aberto" && (
          <div className="pn-aberto">
            <div className="pn-barra">
              <div className="pn-t pn-logo">{marca}</div>
              <div className="pn-barra-dir">
                {temHoje && (
                  <div className="pn-modo">
                    <Link href={base} className={hoje ? "" : "ativo-plan"} aria-current={hoje ? undefined : "page"}>
                      Planejando
                    </Link>
                    <Link href={`${base}/hoje`} className={hoje ? "ativo-dia" : ""} aria-current={hoje ? "page" : undefined}>
                      <span className="pn-ic">celebration</span>É hoje
                    </Link>
                  </div>
                )}
                <button type="button" className="pn-voltar-entrada" onClick={voltarAEntrada}>
                  <span className="pn-ic">replay</span>
                  <span className="txt">Entrada</span>
                </button>
                <div className="pn-pessoa" ref={pessoaRef}>
                  <button
                    type="button"
                    className="pn-pessoa-pilula"
                    aria-expanded={pessoaAberta}
                    onClick={() => {
                      setPessoaAberta((v) => !v);
                      setMaisAberto(false);
                    }}
                  >
                    <span className="pn-t pn-avatar">{pessoa.ini}</span>
                    <span className="pn-pessoa-textos">
                      <span className="pn-pessoa-nome" style={{ display: "block" }}>
                        {pessoa.nome}
                      </span>
                      <span className="pn-pessoa-papel" style={{ display: "block" }}>
                        {pessoa.papel}
                      </span>
                    </span>
                    <span className="pn-ic">expand_more</span>
                  </button>
                  {pessoaAberta && (
                    <div className="pn-folha-pessoas">
                      <div className="pn-folha-linha" style={{ cursor: "default" }}>
                        <span className="pn-t pn-avatar">{pessoa.ini}</span>
                        <span style={{ flex: 1 }}>
                          <span className="nome" style={{ display: "block" }}>
                            {pessoa.nome}
                          </span>
                          <span className="papel" style={{ display: "block" }}>
                            {pessoa.papel}
                          </span>
                        </span>
                        <span className="pn-ic check">check</span>
                      </div>
                      <button type="button" className="pn-folha-sair" onClick={sair}>
                        <span className="pn-ic" style={{ fontSize: 20 }}>
                          logout
                        </span>
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pn-capa">
              {!hoje ? (
                <>
                  <div className="pn-capa-texto">
                    <div className="pn-capa-eyebrow">{eyebrow}</div>
                    <div className="pn-t pn-capa-nome">
                      {casal ? (
                        casal.b ? (
                          <>
                            {casal.a} <span className="e">&amp;</span> {casal.b}
                          </>
                        ) : (
                          casal.a
                        )
                      ) : (
                        "O casamento"
                      )}
                    </div>
                    <div className="pn-capa-linha">
                      <span>{dataLonga}</span>
                      {localLinha && (
                        <>
                          <span className="ponto">·</span>
                          <span>{localLinha}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {cont && cont.diff > 0 && (
                    <div className="pn-contagem" aria-label="Contagem regressiva">
                      <div className="pn-contagem-bloco">
                        <div className="pn-t pn-contagem-num">{cont.d}</div>
                        <div className="pn-contagem-rot">dias</div>
                      </div>
                      <div className="pn-contagem-bloco">
                        <div className="pn-t pn-contagem-num">{cont.h}</div>
                        <div className="pn-contagem-rot">horas</div>
                      </div>
                      <div className="pn-contagem-bloco">
                        <div className="pn-t pn-contagem-num">{cont.m}</div>
                        <div className="pn-contagem-rot">min</div>
                      </div>
                      <div className="pn-contagem-bloco seg">
                        <div className="pn-t pn-contagem-num">{cont.s}</div>
                        <div className="pn-contagem-rot">seg</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="pn-capa-texto" style={{ animationDelay: "0s" }}>
                    <div className="pn-capa-eyebrow">
                      {[dataLonga, localLinha?.split(" · ")[0]].filter(Boolean).join(" · ")}
                    </div>
                    <div className="pn-t pn-capa-hoje-titulo">É hoje.</div>
                    <div className="pn-capa-hoje-sub">
                      {marcaNome ? "Respirem. Está tudo nas mãos certas." : "Respirem. Hoje é só viver."}
                    </div>
                  </div>
                  {faltaParaOSim && (
                    <div className="pn-capa-faltam">
                      <div className="rot">faltam para o sim</div>
                      <div className="pn-t num">{faltaParaOSim}</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!hoje ? (
              <div className="pn-menu" ref={menuRef}>
                <nav aria-label="Telas do portal">
                  {menu.map((d) => {
                    const ativo = d.chave === chave && !maisAberto;
                    return (
                      <Link
                        key={d.chave}
                        href={d.seg ? `${base}/${d.seg}` : base}
                        className="pn-menu-item"
                        aria-current={ativo ? "page" : undefined}
                      >
                        <span className={`pn-menu-circulo${ativo ? " ativo" : ""}`}>
                          <span className="pn-ic">{d.icone}</span>
                        </span>
                        <span className="pn-menu-rotulo">{d.rotulo}</span>
                      </Link>
                    );
                  })}
                  {mais.length > 0 && (
                    <button
                      type="button"
                      className="pn-menu-item"
                      aria-expanded={maisAberto}
                      onClick={() => {
                        setMaisAberto((v) => !v);
                        setPessoaAberta(false);
                      }}
                    >
                      <span className={`pn-menu-circulo${maisAberto || ativoMais ? " ativo" : ""}`}>
                        <span className="pn-ic">more_horiz</span>
                      </span>
                      <span className="pn-menu-rotulo">Mais</span>
                    </button>
                  )}
                </nav>
                {maisAberto && (
                  <div className="pn-mais">
                    {mais.map((m) => (
                      <Link key={m.chave} href={`${base}/${m.seg}`}>
                        <span className="pn-mais-icone">
                          <span className="pn-ic">{m.icone}</span>
                        </span>
                        <span>
                          <span className="tit" style={{ display: "block" }}>
                            {m.rotulo}
                          </span>
                          <span className="sub" style={{ display: "block" }}>
                            {m.sub}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="pn-barra-dia">
                <div className="texto">
                  <span className="pn-ic">offline_pin</span>Salvo no celular · funciona mesmo sem internet no local
                </div>
                <Link href={base}>Voltar ao planejamento</Link>
              </div>
            )}

            <div className="pn-conteudo">
              {children}
              <Rodape frase={frase} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- o rodapé: a frase e "Deixe o portal na tela" ---------- */

type PromptInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const DISPENSADO = "portal-instalar-dispensado";

function Rodape({ frase }: { frase: string }) {
  const { avisar } = usePortalNoivos();
  const [convite, setConvite] = useState<PromptInstalacao | null>(null);
  const [modo, setModo] = useState<"nenhum" | "android" | "ios">("nenhum");

  useEffect(() => {
    // o service worker do portal: é ele que deixa o portal abrir sem internet
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/portal-sw.js", { scope: "/portal/" }).catch(() => {
        /* sem service worker o portal continua; só perde o uso sem internet */
      });
    }
    const instalado =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      Boolean((window.navigator as { standalone?: boolean }).standalone);
    if (instalado) return;
    try {
      if (localStorage.getItem(DISPENSADO) === "1") return;
    } catch {
      /* armazenamento bloqueado: mostra */
    }
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
      setModo("ios");
      return;
    }
    function aoPoder(e: Event) {
      e.preventDefault();
      setConvite(e as PromptInstalacao);
      setModo("android");
    }
    window.addEventListener("beforeinstallprompt", aoPoder);
    return () => window.removeEventListener("beforeinstallprompt", aoPoder);
  }, []);

  function dispensar() {
    setModo("nenhum");
    try {
      localStorage.setItem(DISPENSADO, "1");
    } catch {
      /* sem armazenamento: some só agora */
    }
  }

  async function adicionar() {
    if (modo === "ios") {
      avisar("No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.");
      return;
    }
    if (!convite) return;
    await convite.prompt();
    const r = await convite.userChoice.catch(() => null);
    if (r?.outcome === "accepted") setModo("nenhum");
  }

  return (
    <div className="pn-rodape">
      <div className="pn-t pn-rodape-frase">{frase}</div>
      {modo !== "nenhum" && (
        <div className="pn-instalar">
          <span className="txt">Deixe o portal na tela do seu celular.</span>
          <button type="button" className="sim" onClick={adicionar}>
            Adicionar
          </button>
          <button type="button" className="nao" onClick={dispensar}>
            Agora não
          </button>
        </div>
      )}
    </div>
  );
}
