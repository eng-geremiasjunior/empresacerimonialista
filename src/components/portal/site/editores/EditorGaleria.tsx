"use client";

// Galeria do casal: até 12 fotos, na ordem em que aparecem, e a frase.
// 191: { frase ≤160, fotos[≤12] }.

import { ListaDeFotos } from "./ListaDeFotos";
import { campo, coluna } from "./pecas";
import { compacto, fotosDoEvento, LIMITES, obj, txt } from "./rascunho";
import type { PropsDoEditor } from "./tipos";

export function EditorGaleria({ conteudo, onChange, modelo, eventoId, urls, desabilitado, pedirEnvio }: PropsDoEditor) {
  const o = obj(conteudo);
  const frase = txt(o.frase, LIMITES.galeriaFrase);
  const fotos = fotosDoEvento(o.fotos, LIMITES.galeriaFotos, eventoId);
  const gravar = (f: string, l: string[]) => onChange({ ...compacto({ frase: f }), ...(l.length ? { fotos: l } : {}) });

  return (
    <div style={coluna}>
      <input
        style={campo}
        maxLength={LIMITES.galeriaFrase}
        value={frase}
        disabled={desabilitado}
        onChange={(e) => gravar(e.target.value, fotos)}
        placeholder="Uma frase (ex.: Nós, do nosso jeito)"
      />
      <ListaDeFotos
        fotos={fotos}
        onChange={(l) => gravar(frase, l)}
        maximo={LIMITES.galeriaFotos}
        tipo="galeria"
        modelo={modelo}
        eventoId={eventoId}
        urls={urls}
        pedirEnvio={pedirEnvio}
        desabilitado={desabilitado}
        largura={120}
      />
    </div>
  );
}
