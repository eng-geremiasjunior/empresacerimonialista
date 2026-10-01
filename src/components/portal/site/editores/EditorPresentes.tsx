"use client";

// Presentes: os itens com título, descrição, valor e foto. O texto, a
// chave Pix, o titular e o link continuam nas colunas (o NossoSite cuida
// deles, com a trava de 'gestao' da 190).
// 191: { itens[≤24]: { id ^[a-z0-9-]{1,40}$ (obrigatório, não repete na
//        estrutura inteira), titulo ≤60, descricao ≤160,
//        valor_centavos inteiro de 5000 a 5000000, foto } }.
//
// Mudar os itens pede 'gestao' (o banco compara com o que está salvo):
// sem podeEditarPresentes, a lista só aparece e nada é gravado — nem uma
// normalização, que já contaria como mudança.
//
// O id: o título em slug + um sufixo curto, sorteado na criação. Enquanto
// o título do item novo está sendo digitado pela primeira vez, o id o
// acompanha; ao sair do campo, ele fica. Depois de criado, não muda mais
// (é por ele que a fatia C acha o preço na versão publicada).

import { useRef, useState } from "react";
import { formatarReais } from "@/lib/site-conteudo";
import { CampoFoto, espacoDoModelo } from "./CampoFoto";
import { BotaoAdicionar, Campo, ItemDaLista, campo, coluna, mover, nota } from "./pecas";
import { compacto, fotoDoEvento, LIMITES, lista, obj, txt } from "./rascunho";
import type { PropsDoEditor } from "./tipos";

type PresenteEditado = {
  id: string | null;
  titulo: string;
  descricao: string;
  valor_centavos: number | null;
  foto: string | null;
};

const RE_ID = /^[a-z0-9-]{1,40}$/;
const TAMANHO_DO_SUFIXO = 4;

function valorValido(v: unknown): number | null {
  return typeof v === "number" &&
    Number.isInteger(v) &&
    v >= LIMITES.valorMinimoCentavos &&
    v <= LIMITES.valorMaximoCentavos
    ? v
    : null;
}

/** "Jantar em Paris" → "jantar-em-paris" (cabe o sufixo nos 40) */
function slug(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITES.presenteId - TAMANHO_DO_SUFIXO - 1)
    .replace(/-+$/g, "");
}

function sortearSufixo(): string {
  let s = "";
  while (s.length < TAMANHO_DO_SUFIXO) s += Math.random().toString(36).slice(2);
  return s.slice(0, TAMANHO_DO_SUFIXO);
}

const idCom = (titulo: string, sufixo: string) => `${slug(titulo) || "presente"}-${sufixo}`;

/** "150", "150,50", "1.234,50", "R$ 1.234" → centavos; o que não for
 *  número, null. */
function centavosDoTexto(t: string): number | null {
  let s = t.replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

function textoDosCentavos(c: number | null): string {
  if (c === null) return "";
  return c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2).replace(".", ",");
}

/** O valor em reais: o texto é dela; o item só ganha valor_centavos
 *  quando o número está entre R$ 50 e R$ 50.000. */
function CampoValor({
  centavos,
  onChange,
  desabilitado,
}: {
  centavos: number | null;
  onChange: (c: number | null) => void;
  desabilitado?: boolean;
}) {
  const [texto, setTexto] = useState(() => textoDosCentavos(centavos));
  const c = centavosDoTexto(texto);
  const aviso = !texto.trim()
    ? null
    : c === null
      ? "Só o número (ex.: 150 ou 150,50)"
      : c < LIMITES.valorMinimoCentavos
        ? `O mínimo é ${formatarReais(LIMITES.valorMinimoCentavos)}`
        : c > LIMITES.valorMaximoCentavos
          ? `O máximo é ${formatarReais(LIMITES.valorMaximoCentavos)}`
          : null;
  return (
    <Campo nome="Valor (R$)">
      <input
        style={{ ...campo, maxWidth: 160 }}
        inputMode="decimal"
        maxLength={12}
        value={texto}
        disabled={desabilitado}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange(valorValido(centavosDoTexto(e.target.value)));
        }}
        placeholder="150"
      />
      {aviso && <span style={{ ...nota, color: "var(--cor-atencao)" }}>{aviso}</span>}
    </Campo>
  );
}

export function EditorPresentes({ conteudo, onChange, modelo, eventoId, urls, desabilitado, pedirEnvio, extra }: PropsDoEditor) {
  // id do item novo → o sufixo dele, enquanto o id acompanha o título
  const novos = useRef(new Map<string, string>());
  // id → a chave do React: quando o id do item novo acompanha o título, a
  // chave fica (senão o campo perderia o foco a cada letra)
  const chaves = useRef(new Map<string, string>());
  const chaveDe = (id: string | null, i: number) => (id ? chaves.current.get(id) ?? id : `sem-id-${i}`);

  const itens: PresenteEditado[] = lista(obj(conteudo).itens)
    .slice(0, LIMITES.presentes)
    .map((p) => {
      const o = obj(p);
      return {
        id: typeof o.id === "string" && RE_ID.test(o.id) ? o.id : null,
        titulo: txt(o.titulo, LIMITES.presenteTitulo),
        descricao: txt(o.descricao, LIMITES.presenteDescricao),
        valor_centavos: valorValido(o.valor_centavos),
        foto: fotoDoEvento(o.foto, eventoId),
      };
    });

  const podeEditar = !!extra?.podeEditarPresentes && !desabilitado;
  const semPix = !extra?.temPix;

  // ---------------------------------------------------- só para ver
  if (!extra?.podeEditarPresentes) {
    return (
      <div style={coluna}>
        {itens.length === 0 ? (
          <p style={nota}>Nenhum presente ainda.</p>
        ) : (
          itens.map((p, i) => (
            <div key={p.id ?? i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: "var(--ts-item-desc)", color: "var(--cor-texto)" }}>
                {p.titulo || "Sem título"}
              </span>
              <span style={{ fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-secundario)" }}>
                {p.valor_centavos !== null ? formatarReais(p.valor_centavos) : "sem valor"}
              </span>
            </div>
          ))
        )}
        <p style={nota}>A lista de presentes é do casal.</p>
      </div>
    );
  }

  // ---------------------------------------------------- para mudar

  /** um id que não existe no bloco nem nos outros blocos de presentes */
  function idLivre(desejado: (sufixo: string) => string, usados: Set<string>): { id: string; sufixo: string } {
    for (;;) {
      const sufixo = sortearSufixo();
      const id = desejado(sufixo);
      if (!usados.has(id)) return { id, sufixo };
    }
  }

  const gravar = (nova: PresenteEditado[]) => {
    const usados = new Set<string>(extra?.idsDePresenteFora ?? []);
    const saida = nova.map((p) => {
      // sem id válido, ou repetido: ganha um agora (e fica)
      let id = p.id;
      if (!id || usados.has(id)) id = idLivre((s) => idCom(p.titulo, s), usados).id;
      usados.add(id);
      return {
        id,
        ...compacto({ titulo: p.titulo, descricao: p.descricao, valor_centavos: p.valor_centavos, foto: p.foto }),
      };
    });
    onChange({ itens: saida });
  };
  const mudar = (i: number, mudou: Partial<PresenteEditado>) => gravar(itens.map((p, j) => (j === i ? { ...p, ...mudou } : p)));

  const mudarTitulo = (i: number, titulo: string) => {
    const p = itens[i];
    const sufixo = p.id ? novos.current.get(p.id) : undefined;
    if (!p.id || sufixo === undefined) return mudar(i, { titulo });
    // o item novo: o id acompanha o título, com o mesmo sufixo
    const usados = new Set<string>([...(extra?.idsDePresenteFora ?? []), ...itens.filter((_, j) => j !== i).map((x) => x.id ?? "")]);
    let id = idCom(titulo, sufixo);
    let s = sufixo;
    if (usados.has(id)) ({ id, sufixo: s } = idLivre((x) => idCom(titulo, x), usados));
    novos.current.delete(p.id);
    novos.current.set(id, s);
    chaves.current.set(id, chaveDe(p.id, i));
    mudar(i, { titulo, id });
  };

  const adicionar = () => {
    const usados = new Set<string>([...(extra?.idsDePresenteFora ?? []), ...itens.map((x) => x.id ?? "")]);
    const { id, sufixo } = idLivre((s) => idCom("", s), usados);
    novos.current.set(id, sufixo);
    gravar([...itens, { id, titulo: "", descricao: "", valor_centavos: null, foto: null }]);
  };

  return (
    <div style={coluna}>
      {semPix && itens.length > 0 && <p style={nota}>Sem chave Pix, os presentes aparecem só como vitrine</p>}
      {itens.map((p, i) => {
        const espaco = espacoDoModelo(modelo, "presentes", i);
        return (
          <ItemDaLista
            key={chaveDe(p.id, i)}
            rotulo={p.titulo.trim() || `Presente ${i + 1}`}
            indice={i}
            total={itens.length}
            desabilitado={!podeEditar}
            onMover={(d) => gravar(mover(itens, i, d))}
            onTirar={() => gravar(itens.filter((_, j) => j !== i))}
          >
            <Campo nome="Título">
              <input
                style={campo}
                maxLength={LIMITES.presenteTitulo}
                value={p.titulo}
                disabled={!podeEditar}
                onChange={(e) => mudarTitulo(i, e.target.value)}
                onBlur={() => {
                  if (p.id) novos.current.delete(p.id);
                }}
                placeholder="Jantar na lua de mel"
              />
            </Campo>
            <textarea
              style={campo}
              rows={2}
              maxLength={LIMITES.presenteDescricao}
              aria-label="Descrição"
              value={p.descricao}
              disabled={!podeEditar}
              onChange={(e) => mudar(i, { descricao: e.target.value })}
              placeholder="Uma linha sobre o presente"
            />
            <CampoValor
              centavos={p.valor_centavos}
              onChange={(c) => mudar(i, { valor_centavos: c })}
              desabilitado={!podeEditar}
            />
            <CampoFoto
              caminho={p.foto}
              onChange={(f) => mudar(i, { foto: f })}
              eventoId={eventoId}
              urls={urls}
              modelo={modelo}
              forma={espaco.forma}
              proporcao={espaco.proporcao}
              pedirEnvio={pedirEnvio}
              desabilitado={!podeEditar}
              rotulo={`a foto do presente ${i + 1}`}
              largura={180}
            />
          </ItemDaLista>
        );
      })}
      {itens.length < LIMITES.presentes && (
        <BotaoAdicionar desabilitado={!podeEditar} onClick={adicionar}>
          Adicionar presente
        </BotaoAdicionar>
      )}
    </div>
  );
}
