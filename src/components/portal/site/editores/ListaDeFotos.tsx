"use client";

// Uma fila de fotos em ordem (traje, galeria, padrinhos): cada foto com
// ‹ › para mudar de lugar e × para tirar; no fim, o espaço vazio que
// acrescenta a próxima, até o teto. A forma de cada posição vem do
// desenho do modelo.

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ModeloId } from "@/lib/site-modelos";
import { TRACO } from "@/components/portal/icones";
import { CampoFoto, espacoDoModelo, type PedirEnvio } from "./CampoFoto";
import { iconeBotao, mover } from "./pecas";

export function ListaDeFotos({
  fotos,
  onChange,
  maximo,
  tipo,
  modelo,
  eventoId,
  urls,
  pedirEnvio,
  desabilitado,
  nome = "foto",
  largura = 140,
}: {
  fotos: string[];
  onChange: (fotos: string[]) => void;
  maximo: number;
  /** o tipo do bloco em MODELOS[modelo].espacos */
  tipo: string;
  modelo: ModeloId;
  eventoId: string;
  urls: Record<string, string>;
  pedirEnvio?: PedirEnvio;
  desabilitado?: boolean;
  nome?: string;
  largura?: number;
}) {
  const pequeno = { ...iconeBotao, width: 32, height: 32 };
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${Math.min(largura, 120)}px, ${largura}px))`, gap: 10 }}>
      {fotos.map((f, i) => {
        const espaco = espacoDoModelo(modelo, tipo, i);
        return (
          <div key={`${f}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <CampoFoto
              caminho={f}
              onChange={(c) => onChange(c ? fotos.map((x, j) => (j === i ? c : x)) : fotos.filter((_, j) => j !== i))}
              eventoId={eventoId}
              urls={urls}
              modelo={modelo}
              forma={espaco.forma}
              proporcao={espaco.proporcao}
              pedirEnvio={pedirEnvio}
              desabilitado={desabilitado}
              rotulo={`a ${nome} ${i + 1}`}
              largura={largura}
              semTirar
            />
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                type="button"
                style={pequeno}
                aria-label={`Passar a ${nome} ${i + 1} para antes`}
                disabled={desabilitado || i === 0}
                onClick={() => onChange(mover(fotos, i, -1))}
              >
                <ChevronLeft size={16} strokeWidth={TRACO} />
              </button>
              <button
                type="button"
                style={pequeno}
                aria-label={`Passar a ${nome} ${i + 1} para depois`}
                disabled={desabilitado || i === fotos.length - 1}
                onClick={() => onChange(mover(fotos, i, 1))}
              >
                <ChevronRight size={16} strokeWidth={TRACO} />
              </button>
              <button
                type="button"
                style={{ ...pequeno, marginLeft: "auto" }}
                aria-label={`Tirar a ${nome} ${i + 1}`}
                disabled={desabilitado}
                onClick={() => onChange(fotos.filter((_, j) => j !== i))}
              >
                <X size={15} strokeWidth={TRACO} />
              </button>
            </div>
          </div>
        );
      })}
      {fotos.length < maximo && (
        <CampoFoto
          caminho={null}
          onChange={(c) => c && onChange([...fotos, c].slice(0, maximo))}
          eventoId={eventoId}
          urls={urls}
          modelo={modelo}
          forma={espacoDoModelo(modelo, tipo, fotos.length).forma}
          proporcao={espacoDoModelo(modelo, tipo, fotos.length).proporcao}
          pedirEnvio={pedirEnvio}
          desabilitado={desabilitado}
          rotulo={`a ${nome} ${fotos.length + 1}`}
          largura={largura}
          vazioSome
        />
      )}
    </div>
  );
}
