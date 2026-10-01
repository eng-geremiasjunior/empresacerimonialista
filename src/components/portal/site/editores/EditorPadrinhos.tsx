"use client";

// Padrinhos: os pares, cada um com os nomes e até 2 fotos. Desligar o
// bloco é o olho de esconder da lista.
// 191: { pares[≤12]: { nomes ≤60, fotos[≤2] } }.

import { ListaDeFotos } from "./ListaDeFotos";
import { BotaoAdicionar, ItemDaLista, campo, coluna, mover } from "./pecas";
import { compacto, fotosDoEvento, LIMITES, lista, obj, txt } from "./rascunho";
import type { PropsDoEditor } from "./tipos";

type ParEditado = { nomes: string; fotos: string[] };

export function EditorPadrinhos({ conteudo, onChange, modelo, eventoId, urls, desabilitado, pedirEnvio }: PropsDoEditor) {
  const pares: ParEditado[] = lista(obj(conteudo).pares)
    .slice(0, LIMITES.pares)
    .map((p) => {
      const o = obj(p);
      return { nomes: txt(o.nomes, LIMITES.parNomes), fotos: fotosDoEvento(o.fotos, LIMITES.fotosPorPar, eventoId) };
    });

  const gravar = (novos: ParEditado[]) =>
    onChange({ pares: novos.map((p) => ({ ...compacto({ nomes: p.nomes }), ...(p.fotos.length ? { fotos: p.fotos } : {}) })) });
  const mudar = (i: number, mudou: Partial<ParEditado>) => gravar(pares.map((p, j) => (j === i ? { ...p, ...mudou } : p)));

  return (
    <div style={coluna}>
      {pares.map((p, i) => (
        <ItemDaLista
          key={i}
          rotulo={p.nomes.trim() || `Par ${i + 1}`}
          indice={i}
          total={pares.length}
          desabilitado={desabilitado}
          onMover={(d) => gravar(mover(pares, i, d))}
          onTirar={() => gravar(pares.filter((_, j) => j !== i))}
        >
          <input
            style={campo}
            maxLength={LIMITES.parNomes}
            aria-label="Nomes"
            value={p.nomes}
            disabled={desabilitado}
            onChange={(e) => mudar(i, { nomes: e.target.value })}
            placeholder="Caio e Duda"
          />
          <ListaDeFotos
            fotos={p.fotos}
            onChange={(f) => mudar(i, { fotos: f })}
            maximo={LIMITES.fotosPorPar}
            tipo="especiais"
            modelo={modelo}
            eventoId={eventoId}
            urls={urls}
            pedirEnvio={pedirEnvio}
            desabilitado={desabilitado}
            largura={110}
          />
        </ItemDaLista>
      ))}
      {pares.length < LIMITES.pares && (
        <BotaoAdicionar desabilitado={desabilitado} onClick={() => gravar([...pares, { nomes: "", fotos: [] }])}>
          Adicionar par
        </BotaoAdicionar>
      )}
    </div>
  );
}
