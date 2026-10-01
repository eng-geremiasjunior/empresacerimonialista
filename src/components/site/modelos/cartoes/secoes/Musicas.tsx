"use client";

// Músicas (#musicas, T03 e T04), o cartão ink com texto card: "Músicas"
// em pêssego e o pedido para a pista — o campo em pílula "Música e
// artista" e "Pedir" (pêssego). O pedido é real: vai para sugerir_musica
// (o casal aprova ou veta), por isso a resposta é "Anotado! Os noivos vão
// ver o seu pedido." e não a promessa de que vai tocar.
//
// Ficam de fora por enquanto (sem o trecho real por trás, seriam botões
// que fingem): o vinil girando, o equalizador, a lista da trilha com os
// horários e o "Ouvir o trecho".
//
// Só aparece com a playlist aberta para os convidados.

import { useMusicaDoConvite } from "@/components/convite/BlocosDoConvidado";
import { Entrada, Rotulo } from "../comum";

export function Musicas({ hash, ancora }: { hash: string; ancora?: string }) {
  const m = useMusicaDoConvite(hash);
  return (
    <section id={ancora} data-sec={ancora} data-revelar="up" className="k-cartao k-cartao--ink k-musicas">
      <div className="k-musicas-topo">
        <Rotulo className="k-rotulo--claro-acento">Músicas</Rotulo>
        <h2 className="k-h2">Peça a sua música para a pista</h2>
      </div>
      <div className="k-pedido-musica">
        {m.pronto && !m.erro ? (
          <Entrada className="k-pedido-musica-feito">Anotado! Os noivos vão ver o seu pedido.</Entrada>
        ) : (
          <form
            className="k-pedido-musica-linha"
            onSubmit={(e) => {
              e.preventDefault();
              void m.enviar();
            }}
          >
            <input
              className="k-pedido-musica-campo"
              value={m.titulo}
              onChange={(e) => m.setTitulo(e.target.value)}
              placeholder="Música e artista"
              aria-label="Música e artista"
              maxLength={160}
            />
            <button type="submit" className="k-pedido-musica-botao" disabled={m.enviando}>
              {m.enviando ? "Enviando…" : "Pedir"}
            </button>
          </form>
        )}
        {m.erro && (
          <p className="k-erro k-erro--claro" role="alert">
            {m.erro}
          </p>
        )}
      </div>
    </section>
  );
}
