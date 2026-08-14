"use client";

// O guia de estilo como a noiva lê: um documento, não uma tela de
// sistema. Rola como página de revista — seções separadas por título
// serifado, sem cartão em volta de cada coisa.
//
// Duas exceções à ausência de cartão, ambas justificadas: flores e
// materiais, onde a FOTO é o conteúdo e precisa de moldura.
//
// Movimento: as faixas da paleta crescem uma vez, na entrada. Nada mais
// se mexe enquanto ela lê — a vida vem da fotografia, não da animação.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FAIXA_ALTURA,
  FAIXA_FLEX,
  FAIXA_LARGURA_MOBILE,
  SITUACAO,
  type FlorDoGuia,
  type GuiaDeEstilo as Guia,
} from "@/lib/guia-shared";
import {
  aprovarGuia,
  pedirAjusteNoGuia,
} from "@/app/(portal)/portal/[eventoId]/guia-estilo/actions";

const G = "var(--fonte-titulo)";
const U = "var(--fonte-corpo)";

// Cores do DOCUMENTO. Ficam aqui, e não nos tokens do portal, porque
// são a folha do guia — o portal continua com a paleta dele.
const C = {
  tituloForte: "#332B24",
  corpo: "#463E36",
  legenda: "#4C443C",
  rotulo: "#776D60",
  vetado: "#5A5148",
  fotoNota: "#8B8072",
  borda: "#EDE5D9",
  bordaVeto: "#DED3C2",
  card: "#FFFFFF",
  cardSuave: "#FAF7F1",
  ouro: "#8C6E43",
  ouroBorda: "#C8AE7E",
  ouroFundo: "#F3EBDF",
  ambar: "#B08052",
  neutro: "#8A8074",
  aprovadoFundo: "#F5F7F0",
  aprovadoBorda: "#DDE3D2",
  aprovadoIcone: "#7C8C6A",
};

const LISTRA = "repeating-linear-gradient(122deg,#EDE6DA 0 10px,#F5F0E7 10px 20px)";
const LISTRA_DENSA =
  "repeating-linear-gradient(122deg,#E8E1D6 0 7px,#F0EBE1 7px 14px)";
const TEXTURA_COR =
  "repeating-linear-gradient(122deg,rgba(255,255,255,.16) 0 9px,rgba(0,0,0,.05) 9px 18px)";

function Secao({
  id,
  titulo,
  contagem,
  children,
}: {
  id: string;
  titulo: string;
  contagem?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="guia-secao">
      <div className="guia-secao-topo">
        <h2 className="guia-h2">{titulo}</h2>
        {contagem && <span className="guia-contagem">{contagem}</span>}
      </div>
      {children}
    </section>
  );
}

/** Espaço de foto que ainda não chegou: diz exatamente o que entra ali. */
function Foto({
  url,
  alt,
  legenda,
  altura,
  denso = false,
}: {
  url: string | null;
  alt: string;
  legenda?: string | null;
  altura: number | string;
  denso?: boolean;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={alt}
        style={{
          width: "100%",
          height: typeof altura === "number" ? `${altura}px` : altura,
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: "relative",
        height: typeof altura === "number" ? `${altura}px` : altura,
        background: denso ? LISTRA_DENSA : LISTRA,
        opacity: denso ? 0.75 : 1,
      }}
    >
      {legenda && (
        <span
          style={{
            position: "absolute",
            left: 9,
            top: 9,
            fontFamily: "ui-monospace, monospace",
            fontSize: 9,
            color: C.fotoNota,
            background: "rgba(253,251,247,.88)",
            padding: "3px 6px",
            borderRadius: 4,
          }}
        >
          {legenda}
        </span>
      )}
    </div>
  );
}

export function GuiaDeEstilo({
  eventoId,
  guia,
  ehCliente,
}: {
  eventoId: string;
  guia: Guia;
  /** false = a equipe abriu o portal para conferir; sem ações de aprovação */
  ehCliente: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [florAberta, setFlorAberta] = useState<FlorDoGuia | null>(null);
  const [comentando, setComentando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // As faixas crescem uma vez, na entrada. Com movimento reduzido, a
  // paleta já nasce aberta — não fica esperando um timer que não vem.
  const [entrou, setEntrou] = useState(false);
  useEffect(() => {
    const reduzido = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduzido) {
      setEntrou(true);
      return;
    }
    const t = setTimeout(() => setEntrou(true), 220);
    return () => clearTimeout(t);
  }, []);

  const emMontagem = guia.situacao === "montagem";
  const podeAgir =
    ehCliente && (guia.situacao === "aguardando" || guia.situacao === "alterado");
  const situacao = SITUACAO[guia.situacao];

  const escolhidas = guia.flores.filter((f) => !f.vetada);
  const vetadas = guia.flores.filter((f) => f.vetada);
  const madrinhas = guia.trajes.find((t) => t.papel === "madrinhas");
  const padrinhos = guia.trajes.find((t) => t.papel === "padrinhos");

  // Em montagem, a papelaria e a última referência não são mostradas: ela
  // vê que está vindo, sem ver pedaço solto.
  const mostrarPapelaria =
    !emMontagem && Boolean(guia.papelaria.nomeCasal || guia.papelaria.fontes);
  const referencias = emMontagem
    ? guia.referencias.slice(0, Math.max(0, guia.referencias.length - 1))
    : guia.referencias;

  const faltando: string[] = [];
  if (emMontagem) {
    if (!mostrarPapelaria) faltando.push("A papelaria");
    if (guia.referencias.length > referencias.length)
      faltando.push("Mais referências");
    if (guia.materiais.length === 0) faltando.push("Materiais e texturas");
    if (guia.trajes.length === 0) faltando.push("Os trajes");
  }

  function agir(fn: () => Promise<{ error: string } | { success: true }>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setComentando(false);
      setMensagem("");
      router.refresh();
    });
  }

  const fundoSituacao =
    guia.situacao === "aprovado"
      ? C.aprovadoFundo
      : guia.situacao === "montagem"
        ? C.cardSuave
        : "#FBF6EE";
  const bordaSituacao =
    guia.situacao === "aprovado"
      ? C.aprovadoBorda
      : guia.situacao === "montagem"
        ? C.borda
        : "#E3D3B7";
  const corSituacao =
    guia.situacao === "aprovado"
      ? C.aprovadoIcone
      : guia.situacao === "montagem"
        ? C.neutro
        : C.ambar;

  return (
    <div className="guia-raiz">
      <div className="guia-conteudo">
        <article className="guia-coluna">
          {/* faixa de situação */}
          <div
            className="guia-status"
            style={{ background: fundoSituacao, borderColor: bordaSituacao }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: corSituacao,
                flexShrink: 0,
                marginTop: 6,
              }}
            />
            <div>
              <p className="guia-status-titulo">
                {situacao.rotulo}
                {guia.situacao === "aprovado" && guia.aprovadoEm
                  ? ` em ${new Date(guia.aprovadoEm).toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}`
                  : ""}
              </p>
              <p className="guia-status-texto">{situacao.frase}</p>
            </div>
          </div>

          {/* abertura */}
          <header className="guia-abertura">
            <span className="guia-rotulo">Paleta do casamento</span>
            <h1 className="guia-h1">{guia.nome}</h1>
            {guia.sensacao && <p className="guia-abertura-texto">{guia.sensacao}</p>}
          </header>

          {guia.cores.length > 0 && (
            <Secao
              id="cores"
              titulo="As cores"
              contagem={`${guia.cores.length} cores`}
            >
              <div className="guia-faixas">
                {guia.cores.slice(0, 5).map((c, i) => (
                  <div
                    key={c.id}
                    className="guia-faixa"
                    style={
                      {
                        background: c.hex,
                        // desktop cresce em altura; celular, em largura.
                        // Tudo por variável: o CSS decide qual usar em
                        // cada largura de tela, e o escalonamento é o
                        // mesmo nos dois.
                        "--faixa-flex": FAIXA_FLEX[i] ?? 0.7,
                        "--faixa-altura": entrou
                          ? `${FAIXA_ALTURA[i] ?? 110}px`
                          : "34px",
                        "--faixa-largura": entrou
                          ? (FAIXA_LARGURA_MOBILE[i] ?? "24%")
                          : "18%",
                        transitionDelay: `${i * 110}ms`,
                      } as React.CSSProperties
                    }
                  >
                    {c.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.fotoUrl}
                        alt=""
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          mixBlendMode: "multiply",
                        }}
                      />
                    ) : (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: TEXTURA_COR,
                        }}
                      />
                    )}
                    <span className="guia-faixa-anel" aria-hidden />
                  </div>
                ))}
              </div>
              <div className="guia-cores-legenda">
                {guia.cores.slice(0, 5).map((c) => (
                  <div key={c.id}>
                    <p className="guia-cor-nome">{c.nome}</p>
                    <p className="guia-cor-meta">
                      <span className="guia-rotulo">{c.papel}</span>
                      <span className="guia-hex">{c.hex}</span>
                    </p>
                    {c.nota && <p className="guia-nota">{c.nota}</p>}
                  </div>
                ))}
              </div>
            </Secao>
          )}

          {escolhidas.length > 0 && (
            <Secao
              id="flores"
              titulo="As flores"
              contagem={`${escolhidas.length} flores`}
            >
              <div className="guia-grade-flores">
                {escolhidas.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="guia-cartao-flor"
                    onClick={() => setFlorAberta(f)}
                  >
                    <Foto
                      url={f.fotoUrl}
                      alt={f.nome}
                      legenda={f.fotoUrl ? null : f.nome.toLowerCase()}
                      altura={150}
                    />
                    <span className="guia-cartao-flor-texto">
                      <span className="guia-flor-nome">{f.nome}</span>
                      {f.epoca && <span className="guia-legenda">{f.epoca}</span>}
                    </span>
                  </button>
                ))}
              </div>

              {vetadas.length > 0 && (
                <div className="guia-veto">
                  <span className="guia-rotulo">Deixamos de fora</span>
                  <div className="guia-grade-veto">
                    {vetadas.map((v) => (
                      <div key={v.id} className="guia-veto-item">
                        <span className="guia-veto-foto" aria-hidden />
                        <span>
                          <span className="guia-veto-nome">{v.nome}</span>
                          {/*
                            A cliente vê o motivo dela — é a casa dela, e
                            ela sabe da própria alergia. O que nunca sai é
                            para o FORNECEDOR: lá vai motivo_fornecedor.
                          */}
                          {(v.motivoInterno || v.motivoFornecedor) && (
                            <span className="guia-veto-motivo">
                              {v.motivoInterno ?? v.motivoFornecedor}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Secao>
          )}

          {guia.materiais.length > 0 && (
            <Secao id="materiais" titulo="Materiais e texturas">
              <div className="guia-grade-materiais">
                {guia.materiais.map((m) => (
                  <div key={m.id} className="guia-cartao-material">
                    <Foto
                      url={m.fotoUrl}
                      alt={m.nome}
                      legenda={m.fotoUrl ? null : m.nome.toLowerCase()}
                      altura={96}
                    />
                    <span className="guia-cartao-material-texto">
                      <span className="guia-material-nome">{m.nome}</span>
                      {m.nota && <span className="guia-nota">{m.nota}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </Secao>
          )}

          {(madrinhas || padrinhos) && (
            <Secao id="trajes" titulo="Trajes">
              <div className="guia-grade-trajes">
                {[madrinhas, padrinhos].filter(Boolean).map((t) => (
                  <div key={t!.id} className="guia-cartao-traje">
                    <span
                      className="guia-traje-amostra"
                      style={{ background: t!.hex ?? "#E9DFCD" }}
                      aria-hidden
                    />
                    <span>
                      <span className="guia-traje-titulo">
                        {t!.papel === "madrinhas" ? "Madrinhas" : "Padrinhos"}
                      </span>
                      {t!.descricao && (
                        <span className="guia-nota">{t!.descricao}</span>
                      )}
                      {t!.hex && <span className="guia-hex">{t!.hex}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </Secao>
          )}

          {mostrarPapelaria && (
            <Secao id="papelaria" titulo="Papelaria">
              <div className="guia-papelaria">
                {/* o fio dourado do portal existe em UM lugar do guia: aqui */}
                <span className="guia-fio" aria-hidden>
                  <span className="guia-fio-brilho" />
                </span>
                <div>
                  <p className="guia-papelaria-nome">
                    {guia.papelaria.nomeCasal}
                  </p>
                  {(guia.papelaria.data || guia.papelaria.local) && (
                    <p className="guia-papelaria-meta">
                      {[guia.papelaria.data, guia.papelaria.local]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div className="guia-papelaria-direita">
                  {guia.papelaria.fontes && (
                    <span className="guia-rotulo">{guia.papelaria.fontes}</span>
                  )}
                  {guia.papelaria.nota && (
                    <span className="guia-nota">{guia.papelaria.nota}</span>
                  )}
                </div>
              </div>
            </Secao>
          )}

          {referencias.length > 0 && (
            <Secao
              id="referencias"
              titulo="Referências"
              contagem={`${referencias.length}`}
            >
              <div className="guia-referencias">
                {referencias.map((r) => (
                  <div key={r.id} className="guia-referencia">
                    <Foto
                      url={r.fotoUrl}
                      alt={r.agradou ?? r.assunto}
                      legenda={r.fotoUrl ? null : r.assunto}
                      altura="100%"
                    />
                    <div className="guia-referencia-texto">
                      <span className="guia-rotulo">{r.assunto}</span>
                      {r.agradou && (
                        <>
                          <span className="guia-rotulo-ouro">O que agradou</span>
                          <p className="guia-agradou">{r.agradou}</p>
                        </>
                      )}
                      {r.autor && <span className="guia-legenda">{r.autor}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Secao>
          )}

          {emMontagem && faltando.length > 0 && (
            <section className="guia-secao">
              <div className="guia-veto">
                <span className="guia-rotulo">Ainda vindo</span>
                {faltando.map((f) => (
                  <p key={f} className="guia-vindo-item">
                    <span aria-hidden className="guia-ponto" />
                    {f}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* bloco de aprovação */}
          {ehCliente && !emMontagem && (
            <section className="guia-secao">
              <div
                className="guia-aprovacao"
                style={{
                  background: fundoSituacao,
                  borderColor: bordaSituacao,
                }}
              >
                <div>
                  <p className="guia-aprovacao-titulo">
                    {guia.situacao === "aprovado"
                      ? "Vocês aprovaram este guia"
                      : guia.situacao === "alterado"
                        ? "Algumas coisas mudaram"
                        : "O que vocês acharam?"}
                  </p>
                  <p className="guia-aprovacao-texto">
                    {guia.situacao === "aprovado"
                      ? `${guia.aprovadoNome ?? "Vocês"} aprovou. É esta a referência que vai para os fornecedores.`
                      : guia.situacao === "alterado"
                        ? "A aprovação anterior continua registrada. Confirmem a nova versão quando quiserem."
                        : "Se estiver do jeito de vocês, é só aprovar. Se faltar alguma coisa, conte para a sua cerimonialista antes."}
                  </p>
                </div>

                {podeAgir && !comentando && (
                  <div className="guia-acoes">
                    <button
                      type="button"
                      className="guia-botao"
                      onClick={() => setComentando(true)}
                    >
                      Prefiro comentar antes
                    </button>
                    <button
                      type="button"
                      className="guia-botao guia-botao-ouro"
                      disabled={pendente}
                      onClick={() => agir(() => aprovarGuia(eventoId, guia.id))}
                    >
                      {guia.situacao === "alterado"
                        ? "Aprovar a nova versão"
                        : "Aprovar este guia"}
                    </button>
                  </div>
                )}
              </div>

              {comentando && (
                <div className="guia-comentario">
                  <textarea
                    className="guia-campo"
                    rows={3}
                    autoFocus
                    placeholder="O que vocês gostariam de mudar?"
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                  />
                  <div className="guia-acoes">
                    <button
                      type="button"
                      className="guia-botao"
                      onClick={() => setComentando(false)}
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      className="guia-botao guia-botao-ouro"
                      disabled={pendente || !mensagem.trim()}
                      onClick={() =>
                        agir(() =>
                          pedirAjusteNoGuia(eventoId, guia.id, mensagem)
                        )
                      }
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              )}

              {erro && <p className="guia-erro">{erro}</p>}
            </section>
          )}
        </article>

        {/* coluna fixa — só no computador */}
        <aside className="guia-trilho portal-so-pc">
          <div className="guia-trilho-cartao">
            <span className="guia-rotulo">Neste guia</span>
            {[
              ["cores", "As cores", guia.cores.length],
              ["flores", "As flores", escolhidas.length],
              ["materiais", "Materiais e texturas", guia.materiais.length],
              ["trajes", "Trajes", guia.trajes.length],
              ["papelaria", "Papelaria", mostrarPapelaria ? 1 : 0],
              ["referencias", "Referências", referencias.length],
            ]
              .filter(([, , n]) => (n as number) > 0)
              .map(([id, rotulo, n]) => (
                <a key={id as string} href={`#${id}`} className="guia-indice">
                  {rotulo as string}
                  <span className="guia-indice-n">{n as number}</span>
                </a>
              ))}
          </div>

          {guia.historico.length > 0 && (
            <div className="guia-trilho-cartao">
              <span className="guia-rotulo">Histórico</span>
              {guia.historico.map((h) => (
                <p key={h.id} className="guia-historico">
                  <span aria-hidden className="guia-ponto" />
                  {h.texto}
                </p>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* a flor abrindo em foto */}
      {florAberta && (
        <div
          className="guia-modal-fundo"
          onClick={() => setFlorAberta(null)}
          role="presentation"
        >
          <div
            className="guia-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={florAberta.nome}
          >
            <Foto
              url={florAberta.fotoUrl}
              alt={florAberta.nome}
              legenda={florAberta.fotoUrl ? null : florAberta.nome.toLowerCase()}
              altura="100%"
            />
            <div className="guia-modal-texto">
              <button
                type="button"
                className="guia-modal-x"
                aria-label="Fechar"
                onClick={() => setFlorAberta(null)}
              >
                ×
              </button>
              <p className="guia-modal-nome">{florAberta.nome}</p>
              {florAberta.epoca && (
                <p className="guia-legenda">{florAberta.epoca}</p>
              )}
              {florAberta.nota && (
                <p className="guia-modal-nota">{florAberta.nota}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
