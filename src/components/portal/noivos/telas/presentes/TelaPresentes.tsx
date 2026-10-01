"use client";

// A tela Presentes do portal dos noivos (desenho v4, README §14;
// protótipo, template 627–661 e lógica 1097–1100): a cota da lua de mel
// (card escuro) e as listas nas lojas.
//
// O que existe hoje por trás: a chave Pix e o link da lista que o casal
// pôs no site. "Copiar link para convidados" copia o endereço do site
// publicado (é lá que o convidado vê a chave e a lista); a chave Pix
// copia a própria chave. O valor arrecadado, a meta e os "Presentes
// recebidos" dependem do presente declarado (outra fase) e não aparecem.
// Sem chave, o card da cota não aparece; sem link, as listas não
// aparecem. Sem nenhum dos dois, fica só o card da cota com o caminho
// para pôr a chave no site.

import Link from "next/link";
import { Eyebrow, Icone } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import type { PresentesDoCasal } from "./montar";
import "./presentes.css";

export function TelaPresentes({ presentes }: { presentes: PresentesDoCasal }) {
  const { base, avisar } = usePortalNoivos();
  const { pixChave, pixTitular, lojas, linkDoSite } = presentes;
  const semNada = !pixChave && lojas.length === 0;

  async function copiar(texto: string, feito: string) {
    try {
      await navigator.clipboard.writeText(texto);
      avisar(feito);
    } catch {
      avisar("Não foi possível copiar agora", true);
    }
  }

  return (
    <section className="pn-presentes" aria-label="Presentes">
      {(pixChave || semNada) && (
        <div className="pn-presentes-cota">
          <Eyebrow cor="var(--pn-pessego)">Presentes</Eyebrow>
          <h2 className="pn-t pn-presentes-cota-titulo">Cota da lua de mel</h2>
          <div className="pn-presentes-cota-sub">Convidados presenteiam por Pix, direto na conta de vocês.</div>
          <div className="pn-presentes-acoes">
            {pixChave ? (
              <>
                {linkDoSite && (
                  <button
                    type="button"
                    className="pn-presentes-copiar"
                    onClick={() => void copiar(linkDoSite, "Link para convidados copiado")}
                  >
                    Copiar link para convidados
                  </button>
                )}
                <button
                  type="button"
                  className="pn-presentes-pix"
                  aria-label={`Copiar a chave Pix: ${pixChave}`}
                  onClick={() => void copiar(pixChave, "Chave Pix copiada")}
                >
                  <span className="pn-presentes-chave">Chave Pix: {pixChave}</span>
                  <Icone nome="content_copy" tamanho={16} />
                </button>
              </>
            ) : (
              <Link href={`${base}/site`} className="pn-presentes-copiar">
                Colocar a chave Pix
              </Link>
            )}
          </div>
          {pixChave && pixTitular && <div className="pn-presentes-titular">Em nome de {pixTitular}</div>}
        </div>
      )}

      {lojas.length > 0 && (
        <div className="pn-presentes-lojas">
          <h2 className="pn-t pn-presentes-lojas-titulo">Listas nas lojas</h2>
          <div className="pn-presentes-lista">
            {lojas.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="pn-presentes-loja">
                <Icone nome="storefront" tamanho={22} />
                <span className="pn-presentes-loja-textos">
                  <span className="pn-presentes-loja-nome">{l.nome}</span>
                  <span className="pn-presentes-loja-end">{l.endereco}</span>
                </span>
                <Icone nome="open_in_new" tamanho={20} />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
