"use client";

// O que vestir: até 3 fotos de referência. O título e o texto continuam
// nas colunas (o NossoSite cuida deles).
// 191: { fotos[≤3] }.

import { ListaDeFotos } from "./ListaDeFotos";
import { fotosDoEvento, LIMITES, obj } from "./rascunho";
import type { PropsDoEditor } from "./tipos";

export function EditorTraje({ conteudo, onChange, modelo, eventoId, urls, desabilitado, pedirEnvio }: PropsDoEditor) {
  const fotos = fotosDoEvento(obj(conteudo).fotos, LIMITES.fotosDoTraje, eventoId);
  return (
    <ListaDeFotos
      fotos={fotos}
      onChange={(f) => onChange(f.length ? { fotos: f } : {})}
      maximo={LIMITES.fotosDoTraje}
      tipo="dress_code"
      modelo={modelo}
      eventoId={eventoId}
      urls={urls}
      pedirEnvio={pedirEnvio}
      desabilitado={desabilitado}
      nome="referência"
    />
  );
}
