"use client";

// Momentos do dia: a programação (Cerimônia, Recepção, Festa).
// 191: { itens[≤8]: { rotulo ≤40, hora HH:MM, nota ≤80 } }. Hora vazia
// = a chave sai (o item fica guardado; no site só aparece com hora).

import { BotaoAdicionar, ItemDaLista, campo, coluna, mover } from "./pecas";
import { compacto, LIMITES, lista, obj, RE_HORA, txt } from "./rascunho";
import type { PropsDoEditor } from "./tipos";

type MomentoEditado = { rotulo: string; hora: string; nota: string };

export function EditorMomentos({ conteudo, onChange, desabilitado }: PropsDoEditor) {
  const itens: MomentoEditado[] = lista(obj(conteudo).itens)
    .slice(0, LIMITES.momentos)
    .map((m) => {
      const o = obj(m);
      return {
        rotulo: txt(o.rotulo, LIMITES.momentoRotulo),
        hora: typeof o.hora === "string" && RE_HORA.test(o.hora) ? o.hora : "",
        nota: txt(o.nota, LIMITES.momentoNota),
      };
    });

  const gravar = (nova: MomentoEditado[]) =>
    onChange({
      itens: nova.map((m) => compacto({ rotulo: m.rotulo, hora: RE_HORA.test(m.hora) ? m.hora : null, nota: m.nota })),
    });
  const mudar = (i: number, mudou: Partial<MomentoEditado>) => gravar(itens.map((m, j) => (j === i ? { ...m, ...mudou } : m)));

  return (
    <div style={coluna}>
      {itens.map((m, i) => (
        <ItemDaLista
          key={i}
          rotulo={m.rotulo.trim() || `Momento ${i + 1}`}
          indice={i}
          total={itens.length}
          desabilitado={desabilitado}
          onMover={(d) => gravar(mover(itens, i, d))}
          onTirar={() => gravar(itens.filter((_, j) => j !== i))}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...campo, flex: "0 0 110px", width: 110 }}
              type="time"
              step={60}
              aria-label="Hora"
              value={m.hora}
              disabled={desabilitado}
              onChange={(e) => mudar(i, { hora: e.target.value.slice(0, 5) })}
            />
            <input
              style={{ ...campo, flex: 1, minWidth: 0 }}
              maxLength={LIMITES.momentoRotulo}
              aria-label="O quê"
              value={m.rotulo}
              disabled={desabilitado}
              onChange={(e) => mudar(i, { rotulo: e.target.value })}
              placeholder="Cerimônia"
            />
          </div>
          <input
            style={campo}
            maxLength={LIMITES.momentoNota}
            aria-label="Nota"
            value={m.nota}
            disabled={desabilitado}
            onChange={(e) => mudar(i, { nota: e.target.value })}
            placeholder="Uma nota (ex.: na capela)"
          />
        </ItemDaLista>
      ))}
      {itens.length < LIMITES.momentos && (
        <BotaoAdicionar desabilitado={desabilitado} onClick={() => gravar([...itens, { rotulo: "", hora: "", nota: "" }])}>
          Adicionar momento
        </BotaoAdicionar>
      )}
    </div>
  );
}
