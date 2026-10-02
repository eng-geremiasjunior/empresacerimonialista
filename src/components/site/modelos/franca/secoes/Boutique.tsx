"use client";

// 10 · La boutique (#presentes), fundo alt: "La boutique", "Sua presença
// já é o nosso presente." e a frase (o texto dos presentes da noiva; sem
// ele, a do desenho). Cada presente é um cartão de papel com a foto
// (4/4.4), a etiqueta pendurada no canto (fio de ouro e a tag com o
// furinho e o valor), o título e a descrição. No hover a etiqueta balança
// (0→10→−6→3→0deg, 1300ms). Ao escolher: o cartão sobe 8px com borda de
// ouro e sombra, a foto cresce 1.05, a fita vertical desce (.7s), a
// horizontal entra (+.2s) e o laço surge com mola (+.6s); os outros ficam
// a .55. Tocar de novo desmarca.
//
// A barra fixa embaixo (ink): "Seu presente", o título e "Presentear com
// Pix · R$ X"; o botão abre ali mesmo o Pix ESTÁTICO do casal com o valor
// (QR e copia-e-cola). Ninguém confirma o pagamento: sai o "Merci!
// Obrigado pelo carinho." do desenho.
//
// Faltando coisa: sem chave Pix, os cards são só vitrine (sem fita nem
// barra) e aparece o link da loja; sem itens, o cartão da chave Pix com
// "Copiar chave" e o link da loja; sem nada, a seção some. Prévia e
// revisão: a barra fica no fluxo, embaixo da grade. Exportado para o T06.

import { useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { formatarReais, lerPresentes, type ItemDePresente } from "@/lib/site-conteudo";
import { usePresente } from "@/components/site/pecas/usePresente";
import { PixDoPresente } from "@/components/site/pecas/PixDoPresente";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { MolduraDupla, mostraFoto, useUrlDaFoto, type PropsDaSecao } from "../comum";

function linkDaLoja(link: string | null | undefined): string | null {
  return link && /^https?:\/\//i.test(link) ? link : null;
}

export function temPresentes({ dados, bloco }: Pick<PropsDaSecao, "dados" | "bloco">): boolean {
  const s = dados.site;
  return !!(
    dados.lista ||
    lerPresentes(bloco.conteudo).itens.length ||
    s?.pix_chave ||
    linkDaLoja(s?.presentes_link) ||
    s?.presentes_texto
  );
}

const BALANCO: Keyframe[] = [
  { transform: "rotate(0deg)" },
  { transform: "rotate(10deg)" },
  { transform: "rotate(-6deg)" },
  { transform: "rotate(3deg)" },
  { transform: "rotate(0deg)" },
];

export function Boutique({ dados, bloco, ancora, modo }: PropsDaSecao) {
  const site = dados.site;
  const itens = lerPresentes(bloco.conteudo).itens;
  const loja = linkDaLoja(site?.presentes_link);
  const resolver = useUrlDaFoto();
  const p = usePresente({
    itens,
    pix: { chave: site?.pix_chave ?? null, titular: site?.pix_titular ?? null, cidade: dados.evento.cidade },
  });

  // a barra mostra o último escolhido enquanto desce
  const ultimo = useRef<ItemDePresente | null>(null);
  if (p.escolha?.tipo === "item") ultimo.current = p.escolha.item;
  const naBarra = ultimo.current;
  const barraAberta = p.escolha?.tipo === "item";
  const fixa = modo === "publico";

  const colunas = itens.length > 0 && itens.length < 4 ? itens.length : null;

  function balancar(e: MouseEvent<HTMLElement>) {
    if (modo !== "publico" || movimentoReduzido()) return;
    const tag = e.currentTarget.querySelector<HTMLElement>("[data-etiqueta]");
    if (tag && typeof tag.animate === "function") tag.animate(BALANCO, { duration: 1300, easing: "ease-out" });
  }

  // a lista com o botão de comprar no ar (197): a boutique leva até ela, e
  // o Pix avulso do site sai de cena — o convidado não fica entre dois caminhos
  if (dados.lista) {
    return (
      <section id={ancora} className="f-secao f-alt f-boutique">
        <div className="f-boutique-miolo">
          <div className="f-cabeca">
            <div data-revelar="up" className="f-eyebrow">
              La boutique
            </div>
            <h2 data-revelar="up" data-atraso="120" className="f-h2 f-h2--balance">
              Sua presença já é o nosso presente.
            </h2>
            <p data-revelar="up" data-atraso="200" className="f-cabeca-p">
              {site?.presentes_texto || "Mas, se quiserem nos presentear..."}
            </p>
          </div>
          <div data-revelar="up" data-atraso="260" className="sm-lista-de-presentes">
            <a href={dados.lista.url} className="f-btn f-btn--cheio f-btn--grande">
              Ver a lista de presentes
            </a>
            {loja && (
              <a href={loja} target="_blank" rel="noopener noreferrer" className="f-sublinhado f-boutique-loja">
                Ver a lista na loja <span aria-hidden>→</span>
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={ancora} className="f-secao f-alt f-boutique">
      <div className="f-boutique-miolo">
        <div className="f-cabeca">
          <div data-revelar="up" className="f-eyebrow">
            La boutique
          </div>
          <h2 data-revelar="up" data-atraso="120" className="f-h2 f-h2--balance">
            Sua presença já é o nosso presente.
          </h2>
          <p data-revelar="up" data-atraso="200" className="f-cabeca-p">
            {site?.presentes_texto || "Mas, se quiserem nos presentear..."}
          </p>
        </div>

        {itens.length > 0 && (
          <div
            className="f-boutique-grade"
            style={colunas ? ({ "--f-max": `${colunas * 300 + (colunas - 1) * 28}px` } as CSSProperties) : undefined}
          >
            {itens.map((item, i) => {
              const on = p.escolhidoId === item.id;
              const dim = p.escolha != null && !on;
              const url = resolver(item.foto);
              const comFoto = mostraFoto(url, modo);
              const miolo = (
                <>
                  {comFoto && (
                    <span className="f-presente-foto">
                      <span className="f-presente-img">
                        <EspacoDeFoto url={url} forma="retangulo" proporcao="tela" />
                      </span>
                      {p.acao && (
                        <>
                          <span className="f-fita f-fita--v" aria-hidden />
                          <span className="f-fita f-fita--h" aria-hidden />
                          <span className="f-laco" aria-hidden>
                            <span className="f-laco-esq" />
                            <span className="f-laco-dir" />
                            <span className="f-laco-no" />
                          </span>
                        </>
                      )}
                    </span>
                  )}
                  <span data-etiqueta="" className="f-etiqueta">
                    <span className="f-etiqueta-fio" aria-hidden />
                    <span className="f-etiqueta-tag">
                      <span className="f-etiqueta-furo" aria-hidden />
                      <span className="f-etiqueta-valor">{formatarReais(item.valor_centavos)}</span>
                    </span>
                  </span>
                  <span className="f-presente-txt">
                    <span className="f-presente-titulo">{item.titulo}</span>
                    {item.descricao && <span className="f-presente-desc">{item.descricao}</span>}
                  </span>
                </>
              );
              const classe = `f-presente ${comFoto ? "" : "f-presente--sem-foto"}`;
              return (
                <div key={item.id} data-revelar="up" data-atraso={(i % 3) * 110 || undefined} className="f-presente-casca">
                  {p.acao ? (
                    <button
                      type="button"
                      className={classe}
                      data-on={on ? "" : undefined}
                      data-dim={dim ? "" : undefined}
                      aria-pressed={on}
                      onClick={() => p.escolher(item.id)}
                      onMouseEnter={balancar}
                    >
                      {miolo}
                    </button>
                  ) : (
                    <div className={classe} onMouseEnter={balancar}>
                      {miolo}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {itens.length === 0 && site?.pix_chave && <CartaoDaChave chave={site.pix_chave} titular={site.pix_titular} />}

        {loja && (itens.length === 0 || !p.acao) && (
          <a href={loja} target="_blank" rel="noopener noreferrer" className="f-sublinhado f-boutique-loja">
            Ver a lista na loja <span aria-hidden>→</span>
          </a>
        )}

        {p.acao && itens.length > 0 && (fixa || barraAberta) && (
          <div
            className={`f-barra ${fixa ? "" : "f-barra--fluxo"}`}
            data-aberta={barraAberta ? "" : undefined}
            aria-hidden={barraAberta ? undefined : true}
          >
            <div className="f-barra-corpo">
              <div className="f-barra-linha">
                <div className="f-barra-texto">
                  <span className="f-barra-rotulo">Seu presente</span>
                  <span className="f-barra-titulo">{naBarra?.titulo}</span>
                </div>
                {!p.painelAberto && p.rotuloDoBotao && (
                  <button type="button" className="f-barra-presentear" onClick={p.abrirPainel}>
                    {p.rotuloDoBotao}
                  </button>
                )}
                <button type="button" className="f-barra-fechar" aria-label="Fechar" onClick={p.recomecar}>
                  ×
                </button>
              </div>
              {p.painelAberto && p.codigo && p.escolha && (
                <PixDoPresente
                  codigo={p.codigo}
                  valorCentavos={p.escolha.valorCentavos}
                  titular={p.titular}
                  copiado={p.copiado}
                  aoCopiar={p.copiar}
                  aoTrocar={p.recomecar}
                  className="f-pix"
                  classes={{
                    qr: "f-pix-qr",
                    valor: "f-pix-valor",
                    botao: "f-barra-presentear f-pix-copiar",
                    nota: "f-pix-nota",
                    copiado: "f-pix-copiado",
                    trocar: "f-volta f-volta--claro",
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Sem itens: a chave Pix para copiar, no cartão de papel com as molduras. */
function CartaoDaChave({ chave, titular }: { chave: string; titular: string | null }) {
  const [copiada, setCopiada] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(chave);
      setCopiada(true);
      window.setTimeout(() => setCopiada(false), 2200);
    } catch {
      // sem permissão: a chave está na tela para copiar à mão
    }
  }
  return (
    <div data-revelar="up" data-atraso="200" className="f-papel f-chave">
      <MolduraDupla />
      <div className="f-papel-miolo">
        <div className="f-eyebrow">Chave Pix</div>
        <div className="f-chave-valor">{chave}</div>
        {titular && <div className="f-chave-titular">{titular}</div>}
        <button type="button" className="f-btn f-btn--cheio" onClick={copiar}>
          <span aria-live="polite">{copiada ? "Chave copiada" : "Copiar chave"}</span>
        </button>
      </div>
    </div>
  );
}
