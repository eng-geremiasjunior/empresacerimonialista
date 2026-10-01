"use client";

// Nossos momentos (T04): frase e foto, de 3 a 8 cenas.
// 191: { itens[≤8]: { frase ≤140, foto } }. O desenho pede no mínimo 3:
// a lista começa com 3 espaços e não desce disso.

import { CampoFoto, espacoDoModelo } from "./CampoFoto";
import { BotaoAdicionar, ItemDaLista, campo, coluna, mover } from "./pecas";
import { compacto, fotoDoEvento, LIMITES, lista, obj, txt } from "./rascunho";
import type { PropsDoEditor } from "./tipos";

const MINIMO = 3;

type CenaEditada = { frase: string; foto: string | null };

export function EditorCenas({ conteudo, onChange, modelo, eventoId, urls, desabilitado, pedirEnvio }: PropsDoEditor) {
  const lidas: CenaEditada[] = lista(obj(conteudo).itens)
    .slice(0, LIMITES.cenas)
    .map((c) => {
      const o = obj(c);
      return { frase: txt(o.frase, LIMITES.cenaFrase), foto: fotoDoEvento(o.foto, eventoId) };
    });
  const itens: CenaEditada[] = [
    ...lidas,
    ...Array.from({ length: Math.max(0, MINIMO - lidas.length) }, () => ({ frase: "", foto: null })),
  ];

  const gravar = (nova: CenaEditada[]) => onChange({ itens: nova.map((c) => compacto({ frase: c.frase, foto: c.foto })) });
  const mudar = (i: number, mudou: Partial<CenaEditada>) => gravar(itens.map((c, j) => (j === i ? { ...c, ...mudou } : c)));

  return (
    <div style={coluna}>
      {itens.map((c, i) => {
        const espaco = espacoDoModelo(modelo, "cenas", i);
        return (
          <ItemDaLista
            key={i}
            rotulo={`Cena ${i + 1}`}
            indice={i}
            total={itens.length}
            desabilitado={desabilitado}
            podeTirar={itens.length > MINIMO}
            onMover={(d) => gravar(mover(itens, i, d))}
            onTirar={() => gravar(itens.filter((_, j) => j !== i))}
          >
            <textarea
              style={campo}
              rows={2}
              maxLength={LIMITES.cenaFrase}
              value={c.frase}
              disabled={desabilitado}
              onChange={(e) => mudar(i, { frase: e.target.value })}
              placeholder="A primeira viagem"
            />
            <CampoFoto
              caminho={c.foto}
              onChange={(f) => mudar(i, { foto: f })}
              eventoId={eventoId}
              urls={urls}
              modelo={modelo}
              forma={espaco.forma}
              proporcao={espaco.proporcao}
              pedirEnvio={pedirEnvio}
              desabilitado={desabilitado}
              rotulo={`a foto da cena ${i + 1}`}
              largura={180}
            />
          </ItemDaLista>
        );
      })}
      {itens.length < LIMITES.cenas && (
        <BotaoAdicionar desabilitado={desabilitado} onClick={() => gravar([...itens, { frase: "", foto: null }])}>
          Adicionar cena
        </BotaoAdicionar>
      )}
    </div>
  );
}
