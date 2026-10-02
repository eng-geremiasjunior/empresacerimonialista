"use client";

// Presentes (#presentes, T03 e T04). O cartão de cima: "Lista de
// presentes", "Sua presença já é o nosso presente." (headSize) e a frase
// (o texto dos presentes da noiva; sem ele, a do desenho); à direita, a
// cota da lua de mel em soft — o rótulo, "R$ 250" grande (headFont) e
// "a cota", que leva ao mesmo Pix. Sem barra de arrecadado e sem meta:
// ninguém confirma o pagamento.
//
// Embaixo, a grade auto-fit (mínimo 250px) com os presentes da noiva:
// foto 4/3 de raio 20, título (cardHead), descrição de 14px e o VALOR. O
// escolhido ganha borda ink, sobe 8px com sombra, a foto cresce 1.07 e o
// ✓ de 36px entra com mola; os outros ficam a .55.
//
// Depois da escolha, a barra fixa embaixo (ink, raio 24, até 560px):
// "Seu presente", o título e "Presentear com Pix · R$ X"; tocar abre ali
// mesmo o Pix ESTÁTICO do casal já com o valor (QR e copia-e-cola). Nada
// de "Obrigado pelo carinho": depois de copiar, "Código copiado" e
// "Escolher outro presente". Na prévia e na revisão a barra não é fixa.
//
// Faltando coisa: sem chave Pix, os cards são vitrine (sem toque, sem
// cota) e aparece o link da loja; sem itens, o cartão da chave com
// "Copiar chave" e o link da loja; sem nada, a seção some.

import { useEffect, useRef, useState } from "react";
import { formatarReais, lerPresentes } from "@/lib/site-conteudo";
import { usePresente } from "@/components/site/pecas/usePresente";
import { PixDoPresente } from "@/components/site/pecas/PixDoPresente";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { Entrada, FotoDoCartao, Icone, linkSeguro, Rotulo, useTemFoto, type PropsDaSecao } from "../comum";

/** A cota do desenho: R$ 250 por cota, pelo mesmo Pix. */
const COTA_CENTAVOS = 25_000;

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

export function Presentes({ dados, bloco, ancora }: PropsDaSecao) {
  const site = dados.site;
  const { modo } = useModoDoSite();
  const itens = lerPresentes(bloco.conteudo).itens;
  const loja = linkSeguro(site?.presentes_link);
  const temFoto = useTemFoto();
  const p = usePresente({
    itens,
    pix: { chave: site?.pix_chave ?? null, titular: site?.pix_titular ?? null, cidade: dados.evento.cidade },
  });
  const cotaEscolhida = p.escolha?.tipo === "valor";

  // a lista com o botão de comprar no ar (197): o cartão leva até ela, e o
  // Pix avulso do site sai de cena — o convidado não fica entre dois caminhos
  if (dados.lista) {
    return (
      <section id={ancora} data-sec={ancora} className="k-presentes">
        <div data-revelar="up" className="k-cartao k-presentes-topo">
          <div className="k-presentes-textos">
            <Rotulo className="k-rotulo--acento">Lista de presentes</Rotulo>
            <h2 className="k-h2 k-h2--balance">Sua presença já é o nosso presente.</h2>
            <div className="k-mudo">{site?.presentes_texto || "Mas, se quiserem nos presentear..."}</div>
          </div>
          <a href={dados.lista.url} className="k-botao">
            Ver a lista de presentes
          </a>
          {loja && (
            <a href={loja} target="_blank" rel="noopener noreferrer" className="k-botao k-botao--contorno k-presentes-loja">
              Ver a lista na loja
            </a>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id={ancora} data-sec={ancora} className="k-presentes">
      <div data-revelar="up" className="k-cartao k-presentes-topo">
        <div className="k-presentes-textos">
          <Rotulo className="k-rotulo--acento">Lista de presentes</Rotulo>
          <h2 className="k-h2 k-h2--balance">Sua presença já é o nosso presente.</h2>
          <div className="k-mudo">{site?.presentes_texto || "Mas, se quiserem nos presentear..."}</div>
        </div>
        {p.acao && (
          <button
            type="button"
            className="k-cota"
            data-on={cotaEscolhida ? "" : undefined}
            aria-pressed={cotaEscolhida}
            onClick={() => p.escolherValor(cotaEscolhida ? null : COTA_CENTAVOS)}
          >
            <span className="k-cota-topo">
              <span className="k-cota-rotulo">
                <Icone nome="aviao" className="k-cota-icone" />
                Cota da lua de mel
              </span>
              <span className="k-cota-pix">Pix</span>
            </span>
            <span className="k-cota-total">{formatarReais(COTA_CENTAVOS)}</span>
            <span className="k-cota-nota">a cota</span>
          </button>
        )}
        {itens.length === 0 && site?.pix_chave && <CartaoDaChave chave={site.pix_chave} titular={site.pix_titular} />}
        {loja && (itens.length === 0 || !p.acao) && (
          <a href={loja} target="_blank" rel="noopener noreferrer" className="k-botao k-botao--contorno k-presentes-loja">
            Ver a lista na loja
          </a>
        )}
      </div>

      {itens.length > 0 && (
        <div className="k-presentes-grade">
          {itens.map((item, i) => {
            const on = p.escolhidoId === item.id;
            const dim = p.escolha != null && !on;
            const comFoto = temFoto(item.foto);
            const miolo = (
              <>
                {comFoto ? (
                  <span className="k-presente-foto">
                    <span className="k-presente-img">
                      <FotoDoCartao caminho={item.foto} />
                    </span>
                    {p.acao && <Check />}
                  </span>
                ) : (
                  p.acao && <Check />
                )}
                <span className="k-presente-txt">
                  <span className="k-presente-titulo">{item.titulo}</span>
                  {item.descricao && <span className="k-presente-desc">{item.descricao}</span>}
                  <span className="k-presente-valor">{formatarReais(item.valor_centavos)}</span>
                </span>
              </>
            );
            const cls = `k-presente ${comFoto ? "" : "k-presente--sem-foto"}`;
            return (
              <div key={item.id} data-revelar="up" data-atraso={(i % 3) * 110 || undefined} className="k-presente-casca">
                {p.acao ? (
                  <button
                    type="button"
                    className={cls}
                    data-on={on ? "" : undefined}
                    data-dim={dim ? "" : undefined}
                    aria-pressed={on}
                    onClick={() => p.escolher(item.id)}
                  >
                    {miolo}
                  </button>
                ) : (
                  <div className={cls}>{miolo}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {p.acao && (modo === "publico" || p.escolha) && (
        <Folha p={p} fixa={modo === "publico"} />
      )}
    </section>
  );
}

type EstadoDoPresente = ReturnType<typeof usePresente>;

/**
 * A barra do presente. No público fica montada e desliza: sobe de
 * translate(-50%,140%) em .7s cubic-bezier(.2,.8,.2,1) com a opacidade em
 * .5s; ao fechar, desce com o último presente ainda escrito.
 */
function Folha({ p, fixa }: { p: EstadoDoPresente; fixa: boolean }) {
  const ultima = useRef(p.escolha);
  if (p.escolha) ultima.current = p.escolha;
  const escolha = p.escolha ?? ultima.current;
  const aberta = !!p.escolha;
  const ref = useRef<HTMLDivElement>(null);
  // fechada, fora da ordem do Tab e do leitor de tela
  useEffect(() => {
    ref.current?.toggleAttribute("inert", !aberta);
  }, [aberta]);
  return (
    <div
      ref={ref}
      className={`k-folha ${fixa ? "k-folha--fixa" : ""}`}
      data-aberta={aberta ? "" : undefined}
      role="region"
      aria-label="Seu presente"
      aria-hidden={!aberta || undefined}
    >
      {escolha && (
        <div className="k-folha-caixa">
          <div className="k-folha-linha">
            <div className="k-folha-textos">
              <span className="k-folha-rotulo">Seu presente</span>
              <span className="k-folha-titulo">{escolha.tipo === "item" ? escolha.item.titulo : "Cota da lua de mel"}</span>
            </div>
            {!p.painelAberto && (
              <button type="button" className="k-folha-presentear" onClick={p.abrirPainel}>
                {`Presentear com Pix · ${formatarReais(escolha.valorCentavos)}`}
              </button>
            )}
            <button type="button" className="k-folha-fechar" aria-label="Fechar" onClick={p.recomecar}>
              ×
            </button>
          </div>
          {aberta && p.painelAberto && p.codigo && (
            <Entrada className="k-folha-pix">
              <PixDoPresente
                codigo={p.codigo}
                valorCentavos={escolha.valorCentavos}
                titular={p.titular}
                copiado={p.copiado}
                aoCopiar={p.copiar}
                aoTrocar={p.recomecar}
                className="k-pix"
                classes={{
                  qr: "k-pix-qr",
                  valor: "k-pix-valor",
                  botao: "k-folha-presentear k-pix-copiar",
                  nota: "k-pix-nota",
                  copiado: "k-pix-copiado",
                  trocar: "k-volta k-volta--claro",
                }}
              />
            </Entrada>
          )}
        </div>
      )}
    </div>
  );
}

function Check() {
  return (
    <span className="k-check" aria-hidden>
      <Icone nome="check" className="k-check-icone" />
    </span>
  );
}

/** Sem itens: a chave Pix para copiar, como nos sites de hoje. */
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
    <div className="k-chave">
      <span className="k-cota-rotulo">Chave Pix</span>
      <div className="k-chave-valor">{chave}</div>
      {titular && <div className="k-chave-titular">{titular}</div>}
      <button type="button" className="k-botao" onClick={copiar}>
        <span aria-live="polite">{copiada ? "Chave copiada" : "Copiar chave"}</span>
      </button>
    </div>
  );
}
