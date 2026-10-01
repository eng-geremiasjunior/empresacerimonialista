"use client";

// Nosso jeito: até 8 frases curtas do casal.
// 191: { frases[≤8] ≤80 }. Frase em branco fica no rascunho (é a que ela
// acabou de acrescentar); no site ela não aparece.

import { BotaoAdicionar, ItemDaLista, campo, coluna, mover } from "./pecas";
import { LIMITES, lista, obj, txt } from "./rascunho";
import type { PropsDoEditor } from "./tipos";

export function EditorJeito({ conteudo, onChange, desabilitado }: PropsDoEditor) {
  const frases = lista(obj(conteudo).frases)
    .slice(0, LIMITES.frasesDoJeito)
    .map((f) => txt(f, LIMITES.fraseDoJeito));
  const gravar = (novas: string[]) => onChange({ frases: novas });

  return (
    <div style={coluna}>
      {frases.map((f, i) => (
        <ItemDaLista
          key={i}
          rotulo={`Frase ${i + 1}`}
          indice={i}
          total={frases.length}
          desabilitado={desabilitado}
          onMover={(d) => gravar(mover(frases, i, d))}
          onTirar={() => gravar(frases.filter((_, j) => j !== i))}
        >
          <input
            style={campo}
            maxLength={LIMITES.fraseDoJeito}
            aria-label={`Frase ${i + 1}`}
            value={f}
            disabled={desabilitado}
            onChange={(e) => gravar(frases.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder="Café antes de tudo"
          />
        </ItemDaLista>
      ))}
      {frases.length < LIMITES.frasesDoJeito && (
        <BotaoAdicionar desabilitado={desabilitado} onClick={() => gravar([...frases, ""])}>
          Adicionar frase
        </BotaoAdicionar>
      )}
    </div>
  );
}
