"use client";

// Capa: a foto principal, os nomes do casal e a frase.
// 191: { nome1 ≤40, nome2 ≤40, frase ≤200, foto }.

import { CampoFoto, espacoDoModelo } from "./CampoFoto";
import { Campo, campo, coluna } from "./pecas";
import { compacto, fotoDoEvento, LIMITES, obj, txt } from "./rascunho";
import type { PropsDoEditor } from "./tipos";

export function EditorCapa({ conteudo, onChange, modelo, eventoId, urls, desabilitado, pedirEnvio, extra }: PropsDoEditor) {
  const o = obj(conteudo);
  // sem a chave, o nome vem da quebra do nome do evento (e é gravado na
  // primeira mudança); com a chave, vale o que foi digitado, mesmo vazio
  const nome1 = "nome1" in o ? txt(o.nome1, LIMITES.nome) : extra?.nomesDoEvento?.nome1 ?? "";
  const nome2 = "nome2" in o ? txt(o.nome2, LIMITES.nome) : extra?.nomesDoEvento?.nome2 ?? "";
  const frase = txt(o.frase, LIMITES.fraseCapa);
  const foto = fotoDoEvento(o.foto, eventoId);
  const espaco = espacoDoModelo(modelo, "capa");

  const gravar = (mudou: Partial<{ nome1: string; nome2: string; frase: string; foto: string | null }>) => {
    const n = { nome1, nome2, frase, foto, ...mudou };
    // nome vazio fica como "" (a escolha de não ter o nome 2 é dela)
    onChange({
      ...(extra?.semNomes ? compacto({ nome1: txt(o.nome1, LIMITES.nome), nome2: txt(o.nome2, LIMITES.nome) }) : { nome1: n.nome1, nome2: n.nome2 }),
      ...compacto({ frase: n.frase, foto: n.foto }),
    });
  };

  return (
    <div style={coluna}>
      <CampoFoto
        caminho={foto}
        onChange={(c) => gravar({ foto: c })}
        eventoId={eventoId}
        urls={urls}
        modelo={modelo}
        forma={espaco.forma}
        proporcao={espaco.proporcao}
        pedirEnvio={pedirEnvio}
        desabilitado={desabilitado}
        rotulo="a foto da capa"
      />
      {!extra?.semNomes && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 140px" }}>
            <Campo nome="Nome 1">
              <input
                style={campo}
                maxLength={LIMITES.nome}
                value={nome1}
                disabled={desabilitado}
                onChange={(e) => gravar({ nome1: e.target.value })}
              />
            </Campo>
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <Campo nome="Nome 2">
              <input
                style={campo}
                maxLength={LIMITES.nome}
                value={nome2}
                disabled={desabilitado}
                onChange={(e) => gravar({ nome2: e.target.value })}
              />
            </Campo>
          </div>
        </div>
      )}
      <textarea
        style={campo}
        rows={2}
        maxLength={LIMITES.fraseCapa}
        value={frase}
        disabled={desabilitado}
        onChange={(e) => gravar({ frase: e.target.value })}
        placeholder="Uma frase na capa (ex.: Vamos casar!)"
      />
    </div>
  );
}
