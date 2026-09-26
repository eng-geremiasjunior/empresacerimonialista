"use client";

// A casca do portal v2 (desenho "Portal da Família v2", 25/09/2026):
// fundo escolhido pela família, topo com a marca da cerimonialista,
// barra flutuante de 5 itens no celular (o 5º abre a gaveta "Mais") e
// coluna lateral de vidro no computador. A cor da festa vira as cinco
// variáveis do .pv2 — trocar a cor anima o portal inteiro.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { tokensDaCor, type EstiloDoPortal } from "@/lib/cor-da-festa";
import { sairDoPortal } from "@/app/(portal)/portal/actions";
import { Atmosfera } from "./Atmosfera";
import { FolhaCaraDaFesta } from "./FolhaCaraDaFesta";
import { Icone } from "./icones";
import { destinoAtual, type DestinoV2 } from "./destinos";

type Casca = {
  eventoId: string;
  estilo: EstiloDoPortal;
  abrirCaraDaFesta: () => void;
  /** a abertura acabou (ou não houve): o Início pode entrar */
  revelado: boolean;
  /** celular simples ou quem pediu menos movimento */
  leve: boolean;
  /** a primeira vez que o Início aparece nesta sessão */
  comAbertura: boolean;
  /** o topo do Início está escuro (retrato, céu da noite, semana da festa) */
  escuro: boolean;
};

const CascaCtx = createContext<Casca | null>(null);

export function useCasca(): Casca {
  const c = useContext(CascaCtx);
  if (!c) throw new Error("useCasca fora da CascaV2");
  return c;
}

export function CascaV2({
  eventoId,
  tipo,
  marcaNome,
  marcaLogoUrl,
  contatoNome,
  whatsappLink,
  inicial,
  estilo: estiloInicial,
  destinos,
  diasRestantes,
  mostrarAbertura,
  tituloDoEvento,
  pessoa,
  children,
}: {
  eventoId: string;
  tipo: string;
  marcaNome: string | null;
  marcaLogoUrl: string | null;
  contatoNome: string | null;
  whatsappLink: string | null;
  /** a inicial de quem abriu, no avatar */
  inicial: string;
  estilo: EstiloDoPortal;
  destinos: DestinoV2[];
  diasRestantes: number | null;
  mostrarAbertura: boolean;
  tituloDoEvento: string;
  /** "Júlia" — de quem é a festa */
  pessoa: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [estilo, setEstilo] = useState(estiloInicial);
  const [gaveta, setGaveta] = useState(false);
  const [folha, setFolha] = useState(false);
  const [onda, setOnda] = useState<{ k: number; cor: string } | null>(null);
  const [leve, setLeve] = useState(false);
  const [fase, setFase] = useState(mostrarAbertura ? 0 : 3);

  // o servidor manda o estilo novo depois de salvar (router.refresh)
  useEffect(() => setEstilo(estiloInicial), [estiloInicial]);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const fraco = (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
    const menos = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLeve(fraco || menos);
  }, []);

  // a abertura: cortina na cor profunda, o nome da cerimonialista abre,
  // o título sobe e a cortina sobe em 1,1 s. Tocar pula.
  useEffect(() => {
    if (!mostrarAbertura) return;
    // uma vez por sessão: o servidor lê este cookie e não manda a
    // cortina de novo (sem piscar na volta ao Início)
    document.cookie = `pv2ab_${eventoId.slice(0, 8)}=1; path=/; SameSite=Lax`;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFase(3);
      return;
    }
    const t = [
      setTimeout(() => setFase(1), 200),
      setTimeout(() => setFase(2), 900),
      setTimeout(() => setFase(3), 2500),
    ];
    return () => t.forEach(clearTimeout);
  }, [mostrarAbertura, eventoId]);

  const estiloRef = useRef(estilo);
  estiloRef.current = estilo;
  const trocarEstilo = useCallback((novo: EstiloDoPortal) => {
    const antes = estiloRef.current;
    if (antes.cor.h !== novo.cor.h || antes.cor.l !== novo.cor.l || antes.cor.c !== novo.cor.c) {
      setOnda({ k: Date.now(), cor: tokensDaCor(novo.cor)["--destaque"] });
    }
    setEstilo(novo);
  }, []);

  const aceso = destinoAtual(destinos, eventoId, pathname);
  const noInicio = aceso === "inicio";
  const semana = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 7;
  // o topo do Início escurece: céu da noite e semana da festa em qualquer
  // tela; o retrato só no celular (no computador ele é um painel ao lado)
  const fundoEscuro = noInicio && (estilo.fundo === "noite" || (estilo.fundo === "festa" && semana));
  const comRetrato = noInicio && estilo.topo === "retrato" && !!estilo.retratoUrl;
  const escuro = fundoEscuro || comRetrato;
  const modoEscuro = fundoEscuro ? "1" : comRetrato ? "retrato" : undefined;
  const base = `/portal/${eventoId}`;
  const href = (d: DestinoV2) => (d.seg ? `${base}/${d.seg}` : base);
  const abas = destinos.slice(0, 4);
  const naGaveta = destinos.slice(4);
  const maisAceso = gaveta || naGaveta.some((d) => d.id === aceso);

  const ctx = useMemo<Casca>(
    () => ({
      eventoId,
      estilo,
      abrirCaraDaFesta: () => setFolha(true),
      revelado: fase >= 3,
      leve,
      comAbertura: mostrarAbertura,
      escuro,
    }),
    [eventoId, estilo, fase, leve, mostrarAbertura, escuro]
  );

  const estiloRaiz = { ...tokensDaCor(estilo.cor) } as CSSProperties;
  const tinta = "var(--pv2-tinta)";
  const monograma = (pessoa ?? tituloDoEvento).trim().charAt(0).toUpperCase() || "·";

  return (
    <CascaCtx.Provider value={ctx}>
      <div
        className="pv2 portal-raiz"
        data-tipo={tipo}
        data-leve={leve ? "1" : undefined}
        data-escuro={modoEscuro}
        style={estiloRaiz}
      >
        <Atmosfera
          fundo={estilo.fundo}
          escuro={fundoEscuro}
          retratoUrl={noInicio && estilo.topo === "retrato" ? estilo.retratoUrl : null}
          monograma={monograma}
        />

        {/* celular: o topo */}
        <header className="pv2-topo">
          <Marca nome={marcaNome} logoUrl={marcaLogoUrl} cor={tinta} tamanho={20} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp de ${contatoNome ?? "sua cerimonialista"}`}
                style={{
                  width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "50%", background: "rgba(255,255,255,.7)", WebkitBackdropFilter: "blur(12px)",
                  backdropFilter: "blur(12px)", color: "#3a312a",
                }}
              >
                <Icone nome="zap" tamanho={20} traco={1.6} />
              </a>
            )}
            <span
              aria-hidden
              style={{
                width: 40, height: 40, borderRadius: "50%", background: "var(--destaque-texto)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--pv2-titulo)", fontSize: 16, color: "#fff",
              }}
            >
              {inicial}
            </span>
          </div>
        </header>

        {/* computador: a coluna lateral de vidro */}
        <aside className="pv2-lateral">
          <div style={{ padding: "0 12px" }}>
            <Marca nome={marcaNome} logoUrl={marcaLogoUrl} cor="#332b24" tamanho={22} quebra />
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 3 }} aria-label="Portal">
            {destinos.map((d) => {
              const on = d.id === aceso;
              return (
                <Link
                  key={d.id}
                  href={href(d)}
                  aria-current={on ? "page" : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, minHeight: 46, padding: "0 14px",
                    borderRadius: 14, textDecoration: "none", fontSize: 15, fontWeight: on ? 600 : 400,
                    background: on ? "var(--destaque-texto)" : "transparent", color: on ? "#fff" : "#5a5148",
                    boxShadow: on ? "0 10px 20px -12px var(--destaque-texto)" : "none",
                    transition: "background .3s,color .3s",
                  }}
                >
                  <Icone nome={d.id} tamanho={21} traco={1.6} />
                  {d.rotulo}
                </Link>
              );
            })}
          </nav>
          <div
            style={{
              marginTop: "auto", padding: 16, borderRadius: 18, background: "var(--destaque-fundo)",
              display: "flex", flexDirection: "column", gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                aria-hidden
                style={{
                  width: 40, height: 40, borderRadius: "50%", background: "#fff", display: "flex",
                  alignItems: "center", justifyContent: "center", fontFamily: "var(--pv2-titulo)",
                  fontSize: 18, color: "var(--destaque-texto)",
                }}
              >
                {(contatoNome ?? "C").charAt(0).toUpperCase()}
              </span>
              <div style={{ fontFamily: "var(--pv2-titulo)", fontSize: 18, color: "#332b24" }}>
                {contatoNome?.split(" ")[0] ?? "Sua cerimonialista"}
              </div>
            </div>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  borderRadius: 12, background: "#fff", fontSize: 14, color: "#3a312a", textDecoration: "none",
                }}
              >
                <Icone nome="zap" tamanho={18} traco={1.6} />
                WhatsApp {contatoNome ? `da ${contatoNome.split(" ")[0]}` : ""}
              </a>
            )}
            <form action={sairDoPortal}>
              <button
                type="submit"
                style={{ minHeight: 40, width: "100%", border: 0, background: "none", fontSize: 13.5, color: "#6b6259", cursor: "pointer" }}
              >
                Sair
              </button>
            </form>
          </div>
        </aside>

        <main className="pv2-conteudo">
          <div className="pv2-largura">{children}</div>
        </main>

        {/* celular: a barra flutuante */}
        <nav className="pv2-abas" aria-label="Portal">
          {abas.map((d) => {
            const on = d.id === aceso && !gaveta;
            return (
              <Link
                key={d.id}
                href={href(d)}
                onClick={() => setGaveta(false)}
                aria-current={on ? "page" : undefined}
                className="pv2-aba"
                style={{
                  flex: on ? 1.5 : 1, background: on ? "var(--destaque-texto)" : "transparent",
                  color: on ? "#fff" : "#5a5148", fontWeight: on ? 600 : 400,
                }}
              >
                <Icone nome={d.id} />
                {d.rotulo.length > 11 ? d.rotulo.split(" ")[0] : d.rotulo}
              </Link>
            );
          })}
          <button
            type="button"
            className="pv2-aba"
            aria-expanded={gaveta}
            onClick={() => setGaveta((g) => !g)}
            style={{
              flex: maisAceso ? 1.5 : 1, background: maisAceso ? "var(--destaque-texto)" : "transparent",
              color: maisAceso ? "#fff" : "#5a5148", fontWeight: maisAceso ? 600 : 400,
            }}
          >
            <Icone nome="mais" />
            Mais
          </button>
        </nav>

        {gaveta && (
          <>
            <div className="pv2-veu" onClick={() => setGaveta(false)} aria-hidden />
            <div className="pv2-folha" role="dialog" aria-label="Mais" style={{ padding: "12px 14px 16px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#d8cfc2", margin: "0 auto 10px" }} />
              {naGaveta.map((d) => {
                const on = d.id === aceso;
                return (
                  <Link
                    key={d.id}
                    href={href(d)}
                    onClick={() => setGaveta(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14, minHeight: 52, padding: "0 14px",
                      borderRadius: 14, textDecoration: "none", fontSize: 16, fontWeight: on ? 600 : 400,
                      background: on ? "var(--destaque-texto)" : "transparent", color: on ? "#fff" : "#3a312a",
                    }}
                  >
                    <Icone nome={d.id} traco={1.6} />
                    {d.rotulo}
                  </Link>
                );
              })}
              <div style={{ height: 1, background: "#f0eae1", margin: "6px 0" }} />
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 52, padding: "0 14px", fontSize: 16, color: "#3a312a", textDecoration: "none" }}
                >
                  <Icone nome="zap" traco={1.6} />
                  WhatsApp {contatoNome ? `da ${contatoNome.split(" ")[0]}` : "da cerimonialista"}
                </a>
              )}
              <form action={sairDoPortal}>
                <button
                  type="submit"
                  style={{ minHeight: 48, padding: "0 14px 0 50px", border: 0, background: "none", fontSize: 15, color: "#6b6259", textAlign: "left", cursor: "pointer", width: "100%" }}
                >
                  Sair
                </button>
              </form>
            </div>
          </>
        )}

        {folha && (
          <FolhaCaraDaFesta
            eventoId={eventoId}
            estilo={estilo}
            pessoa={pessoa}
            aoMudar={trocarEstilo}
            aoFechar={() => setFolha(false)}
          />
        )}

        {onda && <Onda key={onda.k} cor={onda.cor} />}

        {mostrarAbertura && fase < 3 && (
          <Abertura
            fase={fase}
            nome={marcaNome}
            titulo={tituloDoEvento}
            aoPular={() => setFase(3)}
          />
        )}
      </div>
    </CascaCtx.Provider>
  );
}

function Marca({
  nome,
  logoUrl,
  cor,
  tamanho,
  quebra = false,
}: {
  nome: string | null;
  logoUrl: string | null;
  cor: string;
  tamanho: number;
  /** na coluna lateral o nome pode ir para a segunda linha */
  quebra?: boolean;
}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={nome ?? "Cerimonial"} style={{ height: tamanho + 10, width: "auto", maxWidth: 180, objectFit: "contain" }} />;
  }
  return (
    <span
      style={{
        fontFamily: "var(--pv2-titulo)", fontSize: tamanho, lineHeight: quebra ? 1.15 : 1, letterSpacing: ".14em",
        textTransform: "uppercase", color: cor, whiteSpace: quebra ? "normal" : "nowrap", overflow: "hidden",
        textOverflow: "ellipsis", maxWidth: quebra ? undefined : 230, display: "block", transition: "color .6s",
      }}
    >
      {nome ?? "Cerimonial"}
    </span>
  );
}

/** A onda da cor nova, a partir do alto (1,3 s). */
function Onda({ cor }: { cor: string }) {
  const r = useRef<HTMLDivElement>(null);
  useEffect(() => {
    r.current?.animate(
      [
        { clipPath: "circle(0% at 50% 28%)", opacity: 0.7 },
        { clipPath: "circle(140% at 50% 28%)", opacity: 0 },
      ],
      { duration: 1300, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
    );
  }, []);
  return (
    <div
      ref={r}
      aria-hidden
      style={{
        position: "fixed", inset: 0, zIndex: 34, pointerEvents: "none",
        background: `radial-gradient(circle at 50% 28%, ${cor}, color-mix(in oklch, ${cor} 40%, transparent) 60%, transparent)`,
      }}
    />
  );
}

function Abertura({
  fase,
  nome,
  titulo,
  aoPular,
}: {
  fase: number;
  nome: string | null;
  titulo: string;
  aoPular: () => void;
}) {
  return (
    <div
      className="pv2-cortina"
      onClick={aoPular}
      role="presentation"
      style={{
        position: "fixed", inset: 0, zIndex: 50, cursor: "pointer",
        background:
          "radial-gradient(70% 50% at 30% 20%,color-mix(in oklch,var(--destaque) 55%,transparent),transparent 70%),var(--destaque-profundo)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18,
        transform: `translateY(${fase >= 3 ? "-100%" : "0%"})`,
        transition: "transform 1.1s cubic-bezier(.75,0,.2,1)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--pv2-titulo)", fontSize: 30, lineHeight: 1, textTransform: "uppercase", color: "#fdfbf7",
          letterSpacing: fase >= 1 ? ".2em" : ".75em", opacity: fase >= 1 ? 1 : 0, textAlign: "center", padding: "0 20px",
          transition: "opacity 1s ease,letter-spacing 1.6s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        {nome ?? ""}
      </div>
      <div
        style={{
          height: 1, width: fase >= 1 ? 140 : 0, background: "linear-gradient(90deg,transparent,#fdfbf7,transparent)",
          transition: "width 1.4s cubic-bezier(.2,.8,.2,1) .2s",
        }}
      />
      <div
        style={{
          fontFamily: "var(--pv2-titulo)", fontStyle: "italic", fontSize: 40, lineHeight: 1.1, color: "#fdfbf7",
          textAlign: "center", padding: "0 24px", opacity: fase >= 2 ? 1 : 0,
          transform: `translateY(${fase >= 2 ? "0px" : "18px"})`,
          transition: "opacity 1.1s ease,transform 1.2s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        {titulo}
      </div>
    </div>
  );
}
