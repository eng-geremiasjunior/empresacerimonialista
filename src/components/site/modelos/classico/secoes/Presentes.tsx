"use client";

// 10 · Presentes (#presentes), fundo alt: "Sua presença já é o nosso
// presente.", a frase (o texto dos presentes da noiva; sem ele, a do
// desenho) e, com itens, "Nossa lista de presentes" e os cards (foto 4/3,
// título, descrição e o valor). O escolhido sobe 8px, ganha sombra, borda
// ink, a foto cresce 1.06 e o ✓ de 34px entra com mola; os outros ficam
// a .5.
//
// Depois da escolha: "Presentear com Pix · R$ X" e o painel do Pix
// ESTÁTICO do casal já com o valor (QR e copia-e-cola). O valor livre do
// desenho (R$ 150/300/500/1.000) vai pelo mesmo caminho. Ninguém confirma
// o pagamento: nada de "obrigado pelo presente".
//
// Faltando coisa: sem chave Pix, os cards são só vitrine e aparece o link
// da loja; sem itens, o card da chave Pix com "Copiar chave" e o link da
// loja; sem nada, a seção some.

import { useState, type CSSProperties } from "react";
import { formatarReais, lerPresentes } from "@/lib/site-conteudo";
import { usePresente } from "@/components/site/pecas/usePresente";
import { PixDoPresente } from "@/components/site/pecas/PixDoPresente";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { Entrada, useUrlDaFoto, type PropsDaSecao } from "../comum";

const VALORES_LIVRES = [15_000, 30_000, 50_000, 100_000];

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

export function Presentes({ dados, bloco, ancora, modo }: PropsDaSecao) {
  const site = dados.site;
  const itens = lerPresentes(bloco.conteudo).itens;
  const loja = linkDaLoja(site?.presentes_link);
  const resolver = useUrlDaFoto();
  const p = usePresente({
    itens,
    pix: { chave: site?.pix_chave ?? null, titular: site?.pix_titular ?? null, cidade: dados.evento.cidade },
  });

  const escolhaLivre = p.escolha?.tipo === "valor" ? p.escolha.valorCentavos : null;
  const colunas = itens.length > 0 && itens.length < 4 ? itens.length : null;

  // a lista com o botão de comprar no ar (197): o bloco leva até ela, e o
  // Pix avulso do site sai de cena — o convidado não fica entre dois caminhos
  if (dados.lista) {
    return (
      <section id={ancora} className="c-secao c-alt c-presentes">
        <div className="c-presentes-miolo">
          <h2 data-revelar="up" className="c-h2 c-h2--balance">
            Sua presença já é o nosso presente.
          </h2>
          <p data-revelar="up" data-atraso="120" className="c-presentes-frase">
            {site?.presentes_texto || "Mas, se quiserem nos presentear..."}
          </p>
          <div data-revelar="up" data-atraso="200" className="sm-lista-de-presentes">
            <a href={dados.lista.url} className="c-btn c-btn--cheio c-btn--grande">
              Ver a lista de presentes
            </a>
            {loja && (
              <a href={loja} target="_blank" rel="noopener noreferrer" className="c-sublinhado c-presentes-loja">
                Ver a lista na loja <span aria-hidden>→</span>
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={ancora} className="c-secao c-alt c-presentes">
      <div className="c-presentes-miolo">
        <h2 data-revelar="up" className="c-h2 c-h2--balance">
          Sua presença já é o nosso presente.
        </h2>
        <p data-revelar="up" data-atraso="120" className="c-presentes-frase">
          {site?.presentes_texto || "Mas, se quiserem nos presentear..."}
        </p>

        {itens.length > 0 && (
          <>
            <div data-revelar="up" data-atraso="200" className="c-eyebrow c-presentes-rotulo">
              Nossa lista de presentes
            </div>
            <div
              className="c-presentes-grade"
              style={colunas ? ({ "--c-max": `${colunas * 300 + (colunas - 1) * 20}px` } as CSSProperties) : undefined}
            >
              {itens.map((item, i) => {
                const on = p.escolhidoId === item.id;
                const dim = p.escolha != null && !on;
                const foto = resolver(item.foto);
                const comFoto = !!foto || modo === "previa";
                const miolo = (
                  <>
                    {comFoto && (
                      <div className="c-presente-foto">
                        <div className="c-presente-img">
                          <EspacoDeFoto url={foto} forma="retangulo" proporcao="tela" />
                        </div>
                      </div>
                    )}
                    {p.acao && (
                      <span className="c-check" aria-hidden>
                        ✓
                      </span>
                    )}
                    <div className="c-presente-txt">
                      <div className="c-presente-titulo">{item.titulo}</div>
                      {item.descricao && <div className="c-presente-desc">{item.descricao}</div>}
                      <div className="c-presente-valor">{formatarReais(item.valor_centavos)}</div>
                    </div>
                  </>
                );
                const props = {
                  className: `c-presente ${comFoto ? "" : "c-presente--sem-foto"}`,
                  "data-revelar": "up",
                  "data-atraso": i * 120 || undefined,
                  "data-on": on ? "" : undefined,
                  "data-dim": dim ? "" : undefined,
                };
                return p.acao ? (
                  <button key={item.id} type="button" {...props} aria-pressed={on} onClick={() => p.escolher(item.id)}>
                    {miolo}
                  </button>
                ) : (
                  <div key={item.id} {...props}>
                    {miolo}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {p.acao && itens.length > 0 && !p.painelAberto && (
          <div className="c-presentear">
            {p.escolha?.tipo !== "item" && (
              <>
                <p className="c-presentear-frase">Ou, se preferir, escolha um valor</p>
                <div className="c-valores">
                  {VALORES_LIVRES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="c-valor"
                      aria-pressed={escolhaLivre === v}
                      onClick={() => p.escolherValor(escolhaLivre === v ? null : v)}
                    >
                      {formatarReais(v)}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              type="button"
              className="c-btn c-btn--cheio c-btn--grande c-presentear-botao"
              data-apagado={p.rotuloDoBotao ? undefined : ""}
              disabled={!p.rotuloDoBotao}
              onClick={p.abrirPainel}
            >
              {p.rotuloDoBotao ?? "Escolha um valor"}
            </button>
          </div>
        )}

        {p.acao && p.painelAberto && p.codigo && p.escolha && (
          <Entrada className="c-pix">
            <p className="c-presentear-frase">
              {p.escolha.tipo === "item" ? p.escolha.item.titulo : "Presentear com Pix"}
            </p>
            <PixDoPresente
              codigo={p.codigo}
              valorCentavos={p.escolha.valorCentavos}
              titular={p.titular}
              copiado={p.copiado}
              aoCopiar={p.copiar}
              aoTrocar={p.recomecar}
              className="c-pix-corpo"
              classes={{
                qr: "c-pix-qr",
                valor: "c-pix-valor",
                botao: "c-btn c-btn--cheio c-btn--grande",
                nota: "c-pix-nota",
                copiado: "c-pix-copiado",
                trocar: "c-volta",
              }}
            />
          </Entrada>
        )}

        {itens.length === 0 && site?.pix_chave && (
          <CartaoDaChave chave={site.pix_chave} titular={site.pix_titular} />
        )}

        {loja && (itens.length === 0 || !p.acao) && (
          <a href={loja} target="_blank" rel="noopener noreferrer" className="c-sublinhado c-presentes-loja">
            Ver a lista na loja <span aria-hidden>→</span>
          </a>
        )}
      </div>
    </section>
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
    <div data-revelar="up" data-atraso="200" className="c-chave">
      <div className="c-eyebrow">Chave Pix</div>
      <div className="c-chave-valor">{chave}</div>
      {titular && <div className="c-chave-titular">{titular}</div>}
      <button type="button" className="c-btn" onClick={copiar}>
        <span aria-live="polite">{copiada ? "Chave copiada" : "Copiar chave"}</span>
      </button>
    </div>
  );
}
