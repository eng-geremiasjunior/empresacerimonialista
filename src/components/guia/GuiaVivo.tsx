"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { dispensarGuia, concluirGuia } from "@/app/(app)/actions";
import {
  EVENTO_ABRIR_DECISAO,
  EVENTO_LINK_COPIADO,
  type GuiaNaTela,
} from "@/lib/guia-vivo";

/**
 * O recorte do guia: escurece a tela, abre um buraco em volta do alvo e
 * põe um cartão ao lado dizendo o que fazer ali.
 *
 * TRÊS REGRAS QUE VIERAM DO DONO, E QUE MANDAM NO DESENHO:
 *
 * 1. NÃO BLOQUEAR. O escuro é feito de quatro retângulos com
 *    `pointer-events: none` — não é uma folha por cima da página com um
 *    furo. A pessoa pode clicar em QUALQUER lugar, inclusive fora do
 *    buraco, e o sistema funciona normal. O guia aponta; não prende.
 *
 * 2. DIZER "NÃO QUERO" É UM CLIQUE, SEMPRE VISÍVEL. Ele é cliente da
 *    HostGator há três anos e o tutorial de lá continua aparecendo, sem um
 *    jeito de dizer que não quer. Aqui o cartão tem, sempre, os dois:
 *    "Pular por agora" esconde até o próximo acesso (a aba fechada), e
 *    "Não mostrar mais" é definitivo — o guia não volta sozinho nunca mais.
 *
 *    Até 16/09/2026 havia um botão só, "Pular por agora", que gravava o
 *    definitivo. O texto prometia uma coisa e o banco fazia outra: cinco
 *    das sete primeiras contas de anúncio clicaram nele, provavelmente
 *    para ver a tela por trás, e perderam o guia para sempre.
 *
 * 3. ACABA. Quando os cinco fatos ficam verdadeiros, o guia se carimba
 *    como concluído e some para sempre.
 *
 * Sobre o buraco: o alvo é procurado por `[data-guia="..."]`. Se não
 * estiver nesta tela, o cartão aparece sozinho no canto, com o caminho
 * para onde o passo acontece — um passo sem alvo é melhor que um guia
 * que desaparece sem explicação.
 */

/** Respiro entre a borda do alvo e a borda do buraco. */
const FOLGA = 8;
const LARGURA_CARTAO = 340;
/** Altura suposta do cartão, para decidir se ele cabe. Folgada de propósito. */
// (260 desde que o cartão diz o evento e o que falta: duas linhas a mais)
const ALTURA_CARTAO = 260;
const MARGEM = 16;
const CHAVE_PULOU = "eorg:guia:pulou-agora";

type Caixa = { top: number; left: number; width: number; height: number };

export function GuiaVivo({
  guia,
  terminou,
}: {
  guia: GuiaNaTela | null;
  /** Os cinco fatos já são verdade: carimbar e sumir. */
  terminou: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [alvo, setAlvo] = useState<Caixa | null>(null);
  const [montado, setMontado] = useState(false);
  const carimbou = useRef(false);
  /** "Pular por agora": vale até ela fechar a aba (sessionStorage). */
  const [pulouAgora, setPulouAgora] = useState(false);
  /**
   * Um painel de trabalho aberto (a decisão, no Planejamento) marca
   * `data-guia-painel`. Ele fica abaixo do escuro do guia, e ela via a
   * decisão apagada justamente enquanto a preenchia: com o painel aberto, o
   * guia tira o escuro e o anel e leva o cartão para o canto esquerdo.
   */
  const [painel, setPainel] = useState(false);
  /** Em que passo eu ja rolei a tela ate o alvo. Uma vez por passo. */
  const rolouNoPasso = useRef<string | null>(null);

  useEffect(() => {
    // lido só depois de montar: no servidor não existe sessionStorage, e
    // ler no primeiro render quebraria a hidratação
    try {
      setPulouAgora(sessionStorage.getItem(CHAVE_PULOU) === "1");
    } catch {
      // navegador sem armazenamento: o guia só não lembra do "agora"
    }
    setMontado(true);
  }, []);

  // O último passo da reta final é copiar o link de um fornecedor — gesto
  // do navegador, sem rastro no banco. O botão de copiar avisa; o guia se
  // carimba como concluído, uma vez só.
  useEffect(() => {
    if (guia?.passo.fato !== "copiou_link") return;
    const aoCopiar = () => {
      if (carimbou.current) return;
      carimbou.current = true;
      void concluirGuia().then(() => router.refresh());
    };
    window.addEventListener(EVENTO_LINK_COPIADO, aoCopiar);
    return () => window.removeEventListener(EVENTO_LINK_COPIADO, aoCopiar);
  }, [guia, router]);

  // O carimbo de concluído roda UMA vez por sessão de página. Sem a
  // trava, um re-render no meio da resposta dispararia a segunda chamada.
  useEffect(() => {
    if (!terminou || carimbou.current) return;
    carimbou.current = true;
    void concluirGuia().then(() => router.refresh());
  }, [terminou, router]);

  const medir = useCallback(() => {
    if (!guia) return;
    const comPainel = !!document.querySelector("[data-guia-painel]");
    setPainel(comPainel);
    if (comPainel) {
      setAlvo(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(
      `[data-guia="${guia.passo.alvo}"]`
    );
    if (!el) {
      setAlvo(null);
      return;
    }
    // TRAZER O ALVO ATÉ ELA, uma vez por passo.
    //
    // O passo 3 aponta para o mapa do Planejamento, que começa abaixo da
    // dobra: a tela ficava toda escurecida, sem buraco à vista, e o
    // cartão dizia "está destacado na tela" apontando para o nada. O
    // tutorial do Tibia não espera você procurar a pá — ele põe a pá na
    // sua frente.
    //
    // Uma vez só, e nunca de novo: rolar atrás do alvo a cada quadro
    // brigaria com ela no momento em que ela rolasse para outro lugar.
    if (rolouNoPasso.current !== guia.passo.id) {
      rolouNoPasso.current = guia.passo.id;
      const c = el.getBoundingClientRect();
      const aparece = c.top < window.innerHeight - 60 && c.bottom > 80;
      if (!aparece) {
        el.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }

    const r = el.getBoundingClientRect();
    // Alvo de tamanho zero é alvo escondido (aba fechada, item recolhido):
    // vale mais tratar como ausente do que abrir um buraco de 0px.
    if (r.width < 2 || r.height < 2) {
      setAlvo(null);
      return;
    }
    setAlvo({
      top: r.top - FOLGA,
      left: r.left - FOLGA,
      width: r.width + FOLGA * 2,
      height: r.height + FOLGA * 2,
    });
  }, [guia]);

  // O buraco ACOMPANHA a página — diferente da ficha do "?", que fecha ao
  // rolar. Aqui ele é o próprio assunto: perder o alvo de vista é perder
  // o guia. Um quadro por rolagem, via requestAnimationFrame.
  useEffect(() => {
    if (!guia || !montado) return;
    let vivo = true;
    let pedido = 0;
    const agendar = () => {
      if (!vivo || pedido) return;
      pedido = requestAnimationFrame(() => {
        pedido = 0;
        medir();
      });
    };
    medir();
    // O alvo pode nascer depois (componente que carrega em seguida).
    const relogio = setInterval(medir, 600);
    window.addEventListener("scroll", agendar, true);
    window.addEventListener("resize", agendar);
    return () => {
      vivo = false;
      if (pedido) cancelAnimationFrame(pedido);
      clearInterval(relogio);
      window.removeEventListener("scroll", agendar, true);
      window.removeEventListener("resize", agendar);
    };
  }, [guia, montado, medir]);

  if (!guia || !montado || terminou || pulouAgora) return null;

  const { passo, numero, total, rota, evento, falta, sugestoes, decidiuSemTarefa } = guia;
  const texto =
    sugestoes.length === 0 && passo.textoSemLista ? passo.textoSemLista : passo.texto;
  // "Está na tela do passo" é a rota exata, ou uma tela DENTRO dela quando
  // a rota já é de um evento (/eventos/<id>/planejamento). O prefixo solto
  // fazia "/eventos" casar com o painel e com qualquer evento: o passo
  // "Monte o seu próximo evento" dizia "Continue por aqui" no Roteiro do
  // exemplo e no painel, onde o botão Novo evento não existe (24/09/2026).
  const estaNaRota = (r: string) =>
    pathname === r ||
    (pathname.startsWith(r + "/") && (r.split("/").length > 2 || pathname === r + "/novo"));
  const naTelaDoPasso = rota !== null && estaNaRota(rota);
  // o título já começa pelo tipo quando o evento não tem nome próprio
  const ondeAcontece = evento?.titulo
    ? `No evento ${evento.titulo}` +
      (evento.tipo && !evento.titulo.startsWith(evento.tipo) ? ` · ${evento.tipo}` : "")
    : null;
  const aquiNao = rota !== null && !estaNaRota(rota);

  // Onde o cartão fica.
  //
  // Regra que veio de um erro: eu punha o cartão "logo abaixo do alvo", e
  // no passo 3 o alvo é o mapa do Planejamento INTEIRO — mais alto que a
  // janela. O cartão nasceu fora da tela. Agora, alvo grande demais para
  // ter um "abaixo" visível é tratado como alvo sem lugar: o cartão vai
  // para o canto, e o anel continua marcando a região.
  const posicao = (() => {
    if (painel) return { bottom: MARGEM, left: MARGEM } as const;
    const semLugar = { bottom: MARGEM, right: MARGEM } as const;
    if (!alvo) return semLugar;
    if (alvo.height > window.innerHeight * 0.7) return semLugar;

    const cabeEmbaixo =
      alvo.top + alvo.height + 12 + ALTURA_CARTAO < window.innerHeight;
    const bruto = cabeEmbaixo
      ? alvo.top + alvo.height + 12
      : alvo.top - 12 - ALTURA_CARTAO;

    // Trava final: nunca fora da janela, aconteça o que acontecer com o
    // alvo. Um cartão de guia invisível é pior que guia nenhum.
    const top = Math.min(
      Math.max(MARGEM, bruto),
      Math.max(MARGEM, window.innerHeight - ALTURA_CARTAO - MARGEM)
    );
    const left = Math.min(
      Math.max(MARGEM, alvo.left),
      window.innerWidth - LARGURA_CARTAO - MARGEM
    );
    return { top, left } as const;
  })();

  // O anel esta dentro da janela? A frase do cartao depende disto: dizer
  // "esta destacado na tela" com o destaque fora da dobra e mentira.
  const alvoAVista =
    !!alvo && alvo.top < window.innerHeight - 20 && alvo.top + alvo.height > 20;

  const escuro = "rgba(24, 21, 19, 0.55)";
  // Os quatro retângulos que fazem o escuro em volta do buraco. Nenhum
  // deles recebe clique — o guia aponta, não prende.
  const veus: React.CSSProperties[] = alvo
    ? [
        { top: 0, left: 0, right: 0, height: Math.max(0, alvo.top) },
        {
          top: Math.max(0, alvo.top),
          left: 0,
          width: Math.max(0, alvo.left),
          height: alvo.height,
        },
        {
          top: Math.max(0, alvo.top),
          left: alvo.left + alvo.width,
          right: 0,
          height: alvo.height,
        },
        { top: alvo.top + alvo.height, left: 0, right: 0, bottom: 0 },
      ]
    : [];

  return (
    <>
      {veus.map((v, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: "fixed",
            background: escuro,
            pointerEvents: "none",
            zIndex: 70,
            transition: "opacity 120ms ease",
            ...v,
          }}
        />
      ))}

      {alvo && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: alvo.top,
            left: alvo.left,
            width: alvo.width,
            height: alvo.height,
            borderRadius: 12,
            boxShadow: "0 0 0 2px #6E3F5F, 0 0 0 7px rgba(110,63,95,.28)",
            pointerEvents: "none",
            zIndex: 71,
          }}
        />
      )}

      <div
        role="dialog"
        aria-label={`Guia — passo ${numero} de ${total}`}
        style={{
          position: "fixed",
          width: LARGURA_CARTAO,
          maxWidth: "calc(100vw - 32px)",
          zIndex: 72,
          background: "#fff",
          border: "1px solid #E6E0D8",
          borderRadius: 14,
          padding: 16,
          boxShadow: "0 8px 32px rgba(34,30,27,.18)",
          ...posicao,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".04em",
            textTransform: "uppercase",
            color: "#928A81",
          }}
        >
          Passo {numero} de {total}
        </p>

        <p
          style={{
            margin: "6px 0 0",
            fontSize: 15,
            fontWeight: 600,
            color: "#221E1B",
          }}
        >
          {passo.titulo}
        </p>
        {/* EM QUAL EVENTO. O guia conduz o evento mais novo da agenda; quem
            tem vários (ou religou o guia) precisa ler qual é, senão a lista
            de um corporativo parece a lista do sistema inteiro. */}
        {ondeAcontece && (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              lineHeight: 1.4,
              color: "#928A81",
              overflowWrap: "anywhere",
            }}
          >
            {ondeAcontece}
          </p>
        )}

        <p
          style={{
            margin: "6px 0 0",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#6B6259",
          }}
        >
          {texto}
        </p>
        {/* As decisões que criam tarefa: o clique abre a decisão ali mesmo
            (ou leva até o Planejamento, se ela estiver em outra tela). */}
        {sugestoes.length > 0 && rota && (
          <ul
            style={{
              listStyle: "none",
              margin: "10px 0 0",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {sugestoes.map((s) => (
              <li key={s.id}>
                <Link
                  href={`${rota}?decisao=${s.id}`}
                  onClick={(e) => {
                    if (!naTelaDoPasso) return;
                    e.preventDefault();
                    window.dispatchEvent(
                      new CustomEvent(EVENTO_ABRIR_DECISAO, { detail: { id: s.id } })
                    );
                  }}
                  style={{
                    display: "block",
                    border: "1px solid #E6E0D8",
                    borderRadius: 9,
                    padding: "7px 10px",
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.35,
                    color: "#6E3F5F",
                    textDecoration: "none",
                    overflowWrap: "anywhere",
                  }}
                >
                  {s.titulo}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {decidiuSemTarefa && (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              lineHeight: 1.45,
              color: "#6B6259",
            }}
          >
            A decisão que você marcou não cria tarefa: nela, decidir já era o
            trabalho.
          </p>
        )}
        {/* O passo do contexto só vence com os dois itens: escolhido um, o
            cartão parado parecia travado. Os nomes são os da tela. */}
        {falta.length > 0 && (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 13,
              lineHeight: 1.45,
              fontWeight: 500,
              color: "#221E1B",
            }}
          >
            Falta escolher: {falta.join(" e ")}.
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 14,
          }}
        >
          {aquiNao && rota ? (
            <Link
              href={rota}
              style={{
                flex: 1,
                textAlign: "center",
                borderRadius: 9,
                background: "#6E3F5F",
                color: "#fff",
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Ir para esta tela
            </Link>
          ) : (
            <span style={{ flex: 1, fontSize: 12, color: "#928A81" }}>
              {alvoAVista ? "Está destacado na tela." : "Continue por aqui."}
            </span>
          )}

          {/* SEMPRE VISÍVEL. Não mora em menu, não some depois de três
              passos, e não pergunta "tem certeza?". */}
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.setItem(CHAVE_PULOU, "1");
              } catch {
                // sem armazenamento, esconde só até a próxima tela
              }
              setPulouAgora(true);
            }}
            style={{
              border: "1px solid #E6E0D8",
              background: "#fff",
              borderRadius: 9,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 500,
              color: "#6B6259",
              cursor: "pointer",
            }}
          >
            Pular por agora
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            void dispensarGuia().then(() => router.refresh());
          }}
          style={{
            marginTop: 10,
            border: "none",
            background: "none",
            padding: 0,
            fontSize: 12,
            color: "#928A81",
            textDecoration: "underline",
            textUnderlineOffset: 2,
            cursor: "pointer",
          }}
        >
          Não mostrar mais
        </button>
      </div>
    </>
  );
}
