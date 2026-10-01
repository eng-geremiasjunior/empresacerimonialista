"use client";

// Nossa história: a foto da história e os marcos. O título e o texto
// únicos continuam nas colunas (o NossoSite cuida deles); aqui a foto e a
// lista.
// 191: { foto, marcos[≤10]: { ano ≤10, cidade ≤40, curto ≤24, titulo ≤80,
//        texto ≤600, icone ∈ ICONES_DO_MARCO, foto } }.
//
// Cada modelo pede só o que desenha (o que não aparece não é pedido, mas
// o que já foi escrito fica guardado — trocar de modelo não perde nada):
//   classico           a foto da história (4/5); marcos: ano, título
//   aliancas           marcos: ano, título, foto
//   cartoes, monograma marcos: ano, curto, título, texto, ícone, foto
//   franca, violino    marcos: ano, cidade, título, texto, foto

import { Coffee, Heart, Home, Plane, Gem } from "lucide-react";
import type { IconeDoMarco } from "@/lib/site-conteudo";
import { MODELOS, type ModeloId } from "@/lib/site-modelos";
import { TRACO } from "@/components/portal/icones";
import { CampoFoto, espacoDoModelo, temFotoPorItem } from "./CampoFoto";
import { BotaoAdicionar, Campo, ItemDaLista, campo, coluna, iconeBotao, mover } from "./pecas";
import { compacto, fotoDoEvento, icone, LIMITES, lista, obj, txt } from "./rascunho";
import type { PropsDoEditor } from "./tipos";

type MarcoEditado = {
  ano: string;
  cidade: string;
  curto: string;
  titulo: string;
  texto: string;
  icone: IconeDoMarco | null;
  foto: string | null;
};

type Pede = { cidade: boolean; curto: boolean; texto: boolean; icone: boolean };

function oQuePede(modelo: ModeloId): Pede {
  switch (modelo) {
    case "classico":
    case "aliancas":
      return { cidade: false, curto: false, texto: false, icone: false };
    case "cartoes":
    case "monograma":
      return { cidade: false, curto: true, texto: true, icone: true };
    case "franca":
    case "violino":
      return { cidade: true, curto: false, texto: true, icone: false };
    default:
      return { cidade: false, curto: false, texto: true, icone: false };
  }
}

/** O desenho tem a foto ÚNICA da história (um espaço que não é de cada
 *  marco)? Só o Clássico; o Convite não desenha as fotos do balde. */
function temFotoUnica(modelo: ModeloId): boolean {
  if (modelo === "convite") return false;
  return (MODELOS[modelo].espacos.historia ?? []).some((e) => !e.porItem);
}

const ICONES: { id: IconeDoMarco; nome: string; Icone: typeof Coffee }[] = [
  { id: "cafe", nome: "Café", Icone: Coffee },
  { id: "aviao", nome: "Viagem", Icone: Plane },
  { id: "casa", nome: "Casa", Icone: Home },
  { id: "anel", nome: "Anel", Icone: Gem },
  { id: "coracao", nome: "Coração", Icone: Heart },
];

export function EditorHistoria({ conteudo, onChange, modelo, eventoId, urls, desabilitado, pedirEnvio }: PropsDoEditor) {
  const marcos: MarcoEditado[] = lista(obj(conteudo).marcos)
    .slice(0, LIMITES.marcos)
    .map((m) => {
      const o = obj(m);
      return {
        ano: txt(o.ano, LIMITES.marcoAno),
        cidade: txt(o.cidade, LIMITES.marcoCidade),
        curto: txt(o.curto, LIMITES.marcoCurto),
        titulo: txt(o.titulo, LIMITES.marcoTitulo),
        texto: txt(o.texto, LIMITES.marcoTexto),
        icone: icone(o.icone),
        foto: fotoDoEvento(o.foto, eventoId),
      };
    });

  // a foto da história fica no bloco mesmo no modelo que não a desenha
  const foto = fotoDoEvento(obj(conteudo).foto, eventoId);

  const pede = oQuePede(modelo);
  const comFoto = temFotoPorItem(modelo, "historia");
  const fotoUnica = temFotoUnica(modelo);
  const espacoUnico = espacoDoModelo(modelo, "historia");

  const gravar = (nova: MarcoEditado[], novaFoto: string | null = foto) =>
    onChange({
      ...compacto({ foto: novaFoto }),
      marcos: nova.map((m) =>
        compacto({ ano: m.ano, cidade: m.cidade, curto: m.curto, titulo: m.titulo, texto: m.texto, icone: m.icone, foto: m.foto })
      ),
    });
  const mudar = (i: number, mudou: Partial<MarcoEditado>) => gravar(marcos.map((m, j) => (j === i ? { ...m, ...mudou } : m)));

  return (
    <div style={coluna}>
      {fotoUnica && (
        <CampoFoto
          caminho={foto}
          onChange={(c) => gravar(marcos, c)}
          eventoId={eventoId}
          urls={urls}
          modelo={modelo}
          forma={espacoUnico.forma}
          proporcao={espacoUnico.proporcao}
          pedirEnvio={pedirEnvio}
          desabilitado={desabilitado}
          rotulo="a foto da história"
        />
      )}
      {marcos.map((m, i) => {
        const espaco = espacoDoModelo(modelo, "historia", i);
        return (
          <ItemDaLista
            key={i}
            rotulo={`Marco ${i + 1}`}
            indice={i}
            total={marcos.length}
            desabilitado={desabilitado}
            onMover={(d) => gravar(mover(marcos, i, d))}
            onTirar={() => gravar(marcos.filter((_, j) => j !== i))}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: "0 1 96px" }}>
                <Campo nome="Ano">
                  <input
                    style={campo}
                    inputMode="numeric"
                    maxLength={LIMITES.marcoAno}
                    value={m.ano}
                    disabled={desabilitado}
                    onChange={(e) => mudar(i, { ano: e.target.value })}
                    placeholder="2019"
                  />
                </Campo>
              </div>
              {pede.cidade && (
                <div style={{ flex: "1 1 140px" }}>
                  <Campo nome="Cidade">
                    <input
                      style={campo}
                      maxLength={LIMITES.marcoCidade}
                      value={m.cidade}
                      disabled={desabilitado}
                      onChange={(e) => mudar(i, { cidade: e.target.value })}
                    />
                  </Campo>
                </div>
              )}
              {pede.curto && (
                <div style={{ flex: "1 1 140px" }}>
                  <Campo nome="Em duas palavras">
                    <input
                      style={campo}
                      maxLength={LIMITES.marcoCurto}
                      value={m.curto}
                      disabled={desabilitado}
                      onChange={(e) => mudar(i, { curto: e.target.value })}
                      placeholder="o encontro"
                    />
                  </Campo>
                </div>
              )}
            </div>
            <Campo nome="Título">
              <input
                style={campo}
                maxLength={LIMITES.marcoTitulo}
                value={m.titulo}
                disabled={desabilitado}
                onChange={(e) => mudar(i, { titulo: e.target.value })}
                placeholder="Onde tudo começou"
              />
            </Campo>
            {pede.texto && (
              <textarea
                style={campo}
                rows={3}
                maxLength={LIMITES.marcoTexto}
                value={m.texto}
                disabled={desabilitado}
                onChange={(e) => mudar(i, { texto: e.target.value })}
                placeholder="O que aconteceu"
              />
            )}
            {pede.icone && (
              <div role="radiogroup" aria-label={`Ícone do marco ${i + 1}`} style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {ICONES.map(({ id, nome, Icone }) => {
                  const ativo = m.icone === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      aria-label={nome}
                      title={nome}
                      disabled={desabilitado}
                      onClick={() => mudar(i, { icone: ativo ? null : id })}
                      style={{
                        ...iconeBotao,
                        borderRadius: "var(--raio-botao)",
                        color: ativo ? "var(--cor-card)" : "var(--cor-texto-suave)",
                        background: ativo ? "var(--cor-texto-forte)" : "none",
                      }}
                    >
                      <Icone size={17} strokeWidth={TRACO} />
                    </button>
                  );
                })}
              </div>
            )}
            {comFoto && (
              <CampoFoto
                caminho={m.foto}
                onChange={(c) => mudar(i, { foto: c })}
                eventoId={eventoId}
                urls={urls}
                modelo={modelo}
                forma={espaco.forma}
                proporcao={espaco.proporcao}
                pedirEnvio={pedirEnvio}
                desabilitado={desabilitado}
                rotulo={`a foto do marco ${i + 1}`}
                largura={180}
              />
            )}
          </ItemDaLista>
        );
      })}
      {marcos.length < LIMITES.marcos && (
        <BotaoAdicionar desabilitado={desabilitado} onClick={() => gravar([...marcos, { ano: "", cidade: "", curto: "", titulo: "", texto: "", icone: null, foto: null }])}>
          Adicionar marco
        </BotaoAdicionar>
      )}
    </div>
  );
}
