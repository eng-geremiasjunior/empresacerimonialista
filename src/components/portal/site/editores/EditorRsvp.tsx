"use client";

// Confirmação de presença: o prazo e as opções de menu. Sem prazo ou sem
// menu aqui, o site usa os de antes (site_montado, 191).
// 191: { prazo YYYY-MM-DD (data que existe), menu[≤6] ≤60 }.

import { BotaoAdicionar, Campo, ItemDaLista, campo, coluna, mover } from "./pecas";
import { LIMITES, lista, obj, txt } from "./rascunho";
import type { PropsDoEditor } from "./tipos";

/** A data que existe, no formato do banco (30/02 não passa). */
function dataValida(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [a, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  return t.getUTCFullYear() === a && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? v : null;
}

export function EditorRsvp({ conteudo, onChange, desabilitado }: PropsDoEditor) {
  const o = obj(conteudo);
  const prazo = dataValida(o.prazo) ?? "";
  const menu = lista(o.menu)
    .slice(0, LIMITES.menu)
    .map((m) => txt(m, LIMITES.opcaoDoMenu));

  const gravar = (p: string, m: string[]) => {
    const valida = dataValida(p);
    onChange({ ...(valida ? { prazo: valida } : {}), ...(m.length ? { menu: m } : {}) });
  };

  return (
    <div style={coluna}>
      <Campo nome="Confirmar até">
        <input
          style={{ ...campo, maxWidth: 200 }}
          type="date"
          value={prazo}
          disabled={desabilitado}
          onChange={(e) => gravar(e.target.value, menu)}
        />
      </Campo>
      <span style={{ fontSize: "var(--ts-nota)", color: "var(--cor-texto-suave)", marginTop: 6 }}>Opções de menu</span>
      {menu.map((m, i) => (
        <ItemDaLista
          key={i}
          rotulo={`Opção ${i + 1}`}
          indice={i}
          total={menu.length}
          desabilitado={desabilitado}
          onMover={(d) => gravar(prazo, mover(menu, i, d))}
          onTirar={() => gravar(prazo, menu.filter((_, j) => j !== i))}
        >
          <input
            style={campo}
            maxLength={LIMITES.opcaoDoMenu}
            aria-label={`Opção ${i + 1}`}
            value={m}
            disabled={desabilitado}
            onChange={(e) => gravar(prazo, menu.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={["Carne", "Peixe", "Vegetariano"][i] ?? ""}
          />
        </ItemDaLista>
      ))}
      {menu.length < LIMITES.menu && (
        <BotaoAdicionar desabilitado={desabilitado} onClick={() => gravar(prazo, [...menu, ""])}>
          Adicionar opção
        </BotaoAdicionar>
      )}
    </div>
  );
}
