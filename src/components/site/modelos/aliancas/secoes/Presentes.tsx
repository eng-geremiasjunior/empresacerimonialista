"use client";

// 11 · Presentes (#presentes): "Sua presença já é o nosso presente.", a
// frase (o texto dos presentes da noiva; sem ele, a do desenho) e, com
// itens, "Nossa lista de presentes" e os cards arredondados (raio 20)
// com a foto quadrada (raio 12), o título, a descrição e o VALOR.
//
// O escolhido: borda de 1.5px em gradiente de ouro (padding-box/
// border-box), sobe 10px, sombra 0 34px 60px −30px rgba(120,80,20,.5), a
// foto cresce 1.07 (1.4s E), o reflexo atravessa (faixa de 60%, 1.3s
// cubic-bezier(.4,0,.2,1) com .15s) e o selo de 52×36 entra com mola
// (.7s cubic-bezier(.34,1.56,.64,1)) com as mini alianças se encaixando
// (lerp .05). Os outros ficam a .5. As alianças do selo só existem no
// escolhido: nada girando à toa nos outros três.
//
// Depois da escolha: "Você escolheu {o presente}." e "Presentear com Pix
// · R$ X", que abre o painel do Pix ESTÁTICO do casal já com o valor (QR
// e copia-e-cola). Ninguém confirma o pagamento: sai o "Obrigado pelo
// carinho" e o "chegou até nós" do desenho.
//
// Faltando coisa: sem chave Pix, os cards são só vitrine e aparece o link
// da loja; sem itens, o card da chave Pix com "Copiar chave" e o link da
// loja; sem nada, a seção some.

import { useState, type CSSProperties } from "react";
import { formatarReais, lerPresentes } from "@/lib/site-conteudo";
import { usePresente } from "@/components/site/pecas/usePresente";
import { PixDoPresente } from "@/components/site/pecas/PixDoPresente";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { Aliancas } from "../Aliancas";
import { Entrada, linkSeguro, useUrlDaFoto, type PropsDaSecao } from "../comum";

export function temPresentes({ dados, bloco }: Pick<PropsDaSecao, "dados" | "bloco">): boolean {
  const s = dados.site;
  return !!(
    dados.lista ||
    lerPresentes(bloco.conteudo).itens.length ||
    s?.pix_chave ||
    linkSeguro(s?.presentes_link) ||
    s?.presentes_texto
  );
}

export function Presentes({ dados, bloco, ancora, modo }: PropsDaSecao) {
  const site = dados.site;
  const itens = lerPresentes(bloco.conteudo).itens;
  const loja = linkSeguro(site?.presentes_link);
  const resolver = useUrlDaFoto();
  const p = usePresente({
    itens,
    pix: { chave: site?.pix_chave ?? null, titular: site?.pix_titular ?? null, cidade: dados.evento.cidade },
  });
  // poucos itens não se esticam pela largura toda
  const colunas = itens.length > 0 && itens.length < 4 ? itens.length : null;
  const escolhido = p.escolha?.tipo === "item" ? p.escolha.item : null;

  // a lista com o botão de comprar no ar (197): o bloco leva até ela, e o
  // Pix avulso do site sai de cena — o convidado não fica entre dois caminhos
  if (dados.lista) {
    return (
      <section id={ancora} className="a-secao a-presentes">
        <div className="a-presentes-miolo">
          <h2 data-revelar="up" className="a-h2 a-h2--balance">
            Sua presença já é o nosso presente.
          </h2>
          <p data-revelar="up" data-atraso="120" className="a-presentes-frase">
            {site?.presentes_texto || "Mas, se quiserem nos presentear..."}
          </p>
          <div data-revelar="up" data-atraso="200" className="sm-lista-de-presentes">
            <a href={dados.lista.url} className="a-pilula a-pilula--cheia a-pilula--grande">
              Ver a lista de presentes
            </a>
            {loja && (
              <a href={loja} target="_blank" rel="noopener noreferrer" className="a-pilula a-presentes-loja">
                Ver a lista na loja <span aria-hidden>→</span>
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={ancora} className="a-secao a-presentes">
      <div className="a-presentes-miolo">
        <h2 data-revelar="up" className="a-h2 a-h2--balance">
          Sua presença já é o nosso presente.
        </h2>
        <p data-revelar="up" data-atraso="120" className="a-presentes-frase">
          {site?.presentes_texto || "Mas, se quiserem nos presentear..."}
        </p>

        {itens.length > 0 && (
          <>
            <div data-revelar="up" data-atraso="200" className="a-eyebrow a-presentes-rotulo">
              Nossa lista de presentes
            </div>
            <div
              className="a-presentes-grade"
              style={colunas ? ({ "--a-max": `${colunas * 270 + (colunas - 1) * 20}px` } as CSSProperties) : undefined}
            >
              {itens.map((item, i) => {
                const on = p.escolhidoId === item.id;
                const dim = p.escolha != null && !on;
                const foto = resolver(item.foto);
                const comFoto = !!foto || modo === "previa";
                const miolo = (
                  <>
                    {comFoto && (
                      <div className="a-presente-foto">
                        <div className="a-presente-img">
                          <EspacoDeFoto url={foto} forma="retangulo" proporcao="tela" />
                        </div>
                      </div>
                    )}
                    <div className="a-presente-txt">
                      <div className="a-presente-titulo">{item.titulo}</div>
                      {item.descricao && <div className="a-presente-desc">{item.descricao}</div>}
                      <div className="a-presente-valor">{formatarReais(item.valor_centavos)}</div>
                    </div>
                    {p.acao && (
                      <>
                        <span className="a-presente-selo" aria-hidden>
                          {on && <Aliancas compacta brilho={false} faiscas={false} inicio={1} lerp={0.05} alvo={() => 0} />}
                        </span>
                        <span className="a-presente-reflexo" aria-hidden />
                      </>
                    )}
                  </>
                );
                const props = {
                  className: `a-presente ${comFoto ? "" : "a-presente--sem-foto"}`,
                  "data-on": on ? "" : undefined,
                  "data-dim": dim ? "" : undefined,
                };
                return (
                  <div key={item.id} data-revelar="up" data-atraso={i * 120 || undefined} className="a-presente-caixa">
                    {p.acao ? (
                      <button type="button" {...props} aria-pressed={on} onClick={() => p.escolher(item.id)}>
                        {miolo}
                      </button>
                    ) : (
                      <div {...props}>{miolo}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {p.acao && escolhido && !p.painelAberto && (
          <Entrada key={escolhido.id} className="a-presentear">
            <p className="a-presentear-frase">Você escolheu {escolhido.titulo}.</p>
            <button type="button" className="a-pilula a-pilula--cheia a-pilula--grande" onClick={p.abrirPainel}>
              {p.rotuloDoBotao}
            </button>
          </Entrada>
        )}

        {p.acao && p.painelAberto && p.codigo && p.escolha && (
          <Entrada className="a-pix">
            <p className="a-presentear-frase">
              {escolhido ? `Você escolheu ${escolhido.titulo}.` : "Presentear com Pix"}
            </p>
            <PixDoPresente
              codigo={p.codigo}
              valorCentavos={p.escolha.valorCentavos}
              titular={p.titular}
              copiado={p.copiado}
              aoCopiar={p.copiar}
              aoTrocar={p.recomecar}
              className="a-pix-corpo"
              classes={{
                qr: "a-pix-qr",
                valor: "a-pix-valor",
                botao: "a-pilula a-pilula--cheia a-pilula--grande",
                nota: "a-pix-nota",
                copiado: "a-pix-copiado",
                trocar: "a-volta",
              }}
            />
          </Entrada>
        )}

        {itens.length === 0 && site?.pix_chave && <CartaoDaChave chave={site.pix_chave} titular={site.pix_titular} />}

        {loja && (itens.length === 0 || !p.acao) && (
          <a href={loja} target="_blank" rel="noopener noreferrer" className="a-pilula a-presentes-loja">
            Ver a lista na loja <span aria-hidden>→</span>
          </a>
        )}
      </div>
    </section>
  );
}

/** Sem itens: a chave Pix para copiar, como nos sites de hoje, num card
 *  de papel com a borda de ouro do escolhido. */
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
    <div data-revelar="up" data-atraso="200" className="a-chave">
      <div className="a-chave-aneis">
        <Aliancas compacta brilho={false} faiscas={false} inicio={0} alvo={() => 0} />
      </div>
      <div className="a-eyebrow">Chave Pix</div>
      <div className="a-chave-valor">{chave}</div>
      {titular && <div className="a-chave-titular">{titular}</div>}
      <button type="button" className="a-pilula" onClick={copiar}>
        <span aria-live="polite">{copiada ? "Chave copiada" : "Copiar chave"}</span>
      </button>
    </div>
  );
}
