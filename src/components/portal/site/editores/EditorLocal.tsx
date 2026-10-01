"use client";

// O local: a foto do espaço. Nome, endereço e cidade são da
// cerimonialista e vêm ao vivo do evento — aqui só aparecem.
// 191: { foto }.

import { CampoFoto, espacoDoModelo } from "./CampoFoto";
import { coluna, nota } from "./pecas";
import { compacto, fotoDoEvento, obj } from "./rascunho";
import type { PropsDoEditor } from "./tipos";

export function EditorLocal({ conteudo, onChange, modelo, eventoId, urls, desabilitado, pedirEnvio, extra }: PropsDoEditor) {
  const foto = fotoDoEvento(obj(conteudo).foto, eventoId);
  const espaco = espacoDoModelo(modelo, "local");
  const local = extra?.local;
  const linhas = [local?.nome, local?.endereco, local?.cidade].map((l) => l?.trim()).filter(Boolean) as string[];

  return (
    <div style={coluna}>
      <CampoFoto
        caminho={foto}
        onChange={(c) => onChange(compacto({ foto: c }))}
        eventoId={eventoId}
        urls={urls}
        modelo={modelo}
        forma={espaco.forma}
        proporcao={espaco.proporcao}
        pedirEnvio={pedirEnvio}
        desabilitado={desabilitado}
        rotulo="a foto do local"
      />
      <div>
        {linhas.map((l) => (
          <p key={l} style={{ ...nota, color: "var(--cor-texto)" }}>
            {l}
          </p>
        ))}
        <p style={nota}>{linhas.length ? "Vem do evento" : "Vem do evento · ainda sem local"}</p>
      </div>
    </div>
  );
}
