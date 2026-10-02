"use client";

// Aparência do "Nosso site": o modelo (miniatura real, com os dados do
// próprio casal), o par de fontes, a forma do nome, a abertura, a paleta
// (só quando o modelo tem mais de uma) e, só no Convite, as cores livres.
// Tudo muda a prévia na hora; vai ao banco no "Salvar".

import { useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TRACO } from "@/components/portal/icones";
import { Rotulo } from "@/components/portal/Nucleo";
import { FAMILIAS } from "@/lib/fontes-site";
import { PAPEIS_DE_COR, type PapelDeCor, type TemaDoSite } from "@/lib/site-blocos";
import type { FormaDoNome } from "@/lib/site-conteudo";
import { MODELOS, modeloDoTema, modelosParaTipo, nomeDoModelo, type ModeloId } from "@/lib/site-modelos";
import { PALETAS } from "@/lib/site-paletas";
import { ORDEM_DOS_PARES, PARES_DE_FONTE, PAR_PADRAO, ehParDeFonte, valoresDoPar } from "@/lib/site-pares";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { botao, nota } from "./editores/pecas";
import { SiteEmEscala } from "./SiteEmEscala";

const CORES_DO_CONVITE: Record<PapelDeCor, string> = {
  fundo: "#faf6f0",
  superficie: "#f1eae0",
  tinta: "#3a342c",
  suave: "#6b645b",
  acento: "#b06b4a",
};
const NOME_DA_COR: Record<PapelDeCor, string> = {
  fundo: "Fundo",
  superficie: "Cartões",
  tinta: "Texto",
  suave: "Texto de apoio",
  acento: "Detalhes",
};
const FORMAS: { forma: FormaDoNome; rotulo: string }[] = [
  { forma: "nomes", rotulo: "Nomes" },
  { forma: "iniciais", rotulo: "Iniciais" },
  { forma: "iniciais-nomes", rotulo: "Iniciais + nomes" },
];

const secao: CSSProperties = { display: "flex", flexDirection: "column", gap: 8 };

/** Botão de escolha (forma do nome, paleta): marcado = borda forte. */
function escolha(marcado: boolean): CSSProperties {
  return {
    ...botao,
    padding: "8px 12px",
    borderColor: marcado ? "var(--cor-texto-forte)" : "var(--cor-borda-botao)",
    color: marcado ? "var(--cor-texto-forte)" : "var(--cor-texto-secundario)",
    background: marcado ? "var(--cor-card)" : "var(--cor-card-suave)",
  };
}

export function Aparencia({
  tipoEvento,
  tema,
  onTema,
  onModelo,
  dados,
  fotosAlbum,
  fotoCasalUrl,
  urls,
  nomes,
  pendente,
  mudou,
  onSalvar,
}: {
  tipoEvento: string;
  tema: TemaDoSite;
  /** muda o tema no rascunho (a prévia acompanha) */
  onTema: (t: TemaDoSite) => void;
  /** troca o modelo (quem chama também acerta os blocos do desenho) */
  onModelo: (m: ModeloId) => void;
  /** a prévia de agora, para as miniaturas */
  dados: SitePublico;
  fotosAlbum: { url: string; autor: string | null }[];
  fotoCasalUrl: string | null;
  urls: Record<string, string>;
  nomes: { nome1: string; nome2: string };
  pendente: boolean;
  /** há mudança de aparência ainda não salva */
  mudou: boolean;
  onSalvar: () => void;
}) {
  const modelo = modeloDoTema(tema);
  const [paresAbertos, setParesAbertos] = useState(false);

  // quem já está num modelo que o tipo não oferece continua vendo-o
  const opcoes = useMemo(() => {
    const lista = modelosParaTipo(tipoEvento);
    return lista.includes(modelo) ? lista : [...lista, modelo];
  }, [tipoEvento, modelo]);

  const miniaturas = useMemo(
    () =>
      opcoes.map((m) => ({
        m,
        dados: {
          ...dados,
          site: dados.site ? { ...dados.site, tema: { ...tema, modelo: m } } : dados.site,
        } as SitePublico,
      })),
    [opcoes, dados, tema]
  );

  const par = modelo !== "convite" ? (ehParDeFonte(tema.fontes) ? tema.fontes : PAR_PADRAO[modelo]) : null;
  const amostra = [nomes.nome1.trim(), nomes.nome2.trim()].filter(Boolean).join(" & ");
  const paletas = modelo !== "convite" ? MODELOS[modelo].paletas : [];
  const paletaAtual =
    modelo !== "convite" && tema.paleta && paletas.includes(tema.paleta) ? tema.paleta : modelo !== "convite" ? MODELOS[modelo].paletaPadrao : null;

  return (
    <>
      {opcoes.length > 1 && (
        <div style={secao}>
          <Rotulo>Modelo</Rotulo>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10 }}>
            {miniaturas.map(({ m, dados: d }) => {
              const marcado = m === modelo;
              return (
                <div key={m} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div
                    style={{
                      borderRadius: 10,
                      outline: marcado ? "2px solid var(--cor-texto-forte)" : "1px solid var(--cor-borda)",
                      outlineOffset: marcado ? 2 : 0,
                    }}
                  >
                    <SiteEmEscala
                      dados={d}
                      fotosAlbum={fotosAlbum}
                      fotoCasalUrl={fotoCasalUrl}
                      urls={urls}
                      largura={430}
                      alturaDoSite={760}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "var(--ts-nota)",
                      color: marcado ? "var(--cor-texto-forte)" : "var(--cor-texto-secundario)",
                    }}
                  >
                    {nomeDoModelo(m, tipoEvento)}
                  </span>
                  {/* o site tem botões dentro: o toque vai numa camada por cima */}
                  <button
                    type="button"
                    aria-pressed={marcado}
                    aria-label={`Modelo ${nomeDoModelo(m, tipoEvento)}`}
                    onClick={() => onModelo(m)}
                    style={{ position: "absolute", inset: 0, padding: 0, border: "none", background: "none", cursor: "pointer" }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {par && modelo !== "convite" && (
        <div style={secao}>
          <button
            type="button"
            onClick={() => setParesAbertos(!paresAbertos)}
            aria-expanded={paresAbertos}
            style={{ ...botao, justifyContent: "space-between", width: "100%" }}
          >
            <span>Fontes · {PARES_DE_FONTE[par].nome}</span>
            {paresAbertos ? <ChevronUp size={16} strokeWidth={TRACO} /> : <ChevronDown size={16} strokeWidth={TRACO} />}
          </button>
          {/* as 8 amostras só existem com o seletor aberto: o navegador só
              baixa as fontes de nome enquanto ela está escolhendo */}
          {paresAbertos && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
              {ORDEM_DOS_PARES.map((p) => {
                const v = valoresDoPar(p, modelo);
                const marcado = p === par;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => onTema({ ...tema, fontes: p })}
                    style={{
                      ...escolha(marcado),
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 4,
                      padding: "10px 12px",
                      textAlign: "left",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FAMILIAS[v.nf],
                        fontWeight: v.nw,
                        textTransform: v.ntt,
                        letterSpacing: v.nls,
                        fontStyle: v.ns,
                        fontSize: Math.round(24 * v.s),
                        lineHeight: 1.2,
                        color: "var(--cor-texto)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                      }}
                    >
                      {amostra || PARES_DE_FONTE[p].nome}
                    </span>
                    <span style={{ fontSize: "var(--ts-nota)", color: "var(--cor-texto-suave)" }}>{PARES_DE_FONTE[p].nome}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {modelo !== "convite" && (
        <div style={secao}>
          <Rotulo>Os nomes</Rotulo>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FORMAS.map(({ forma, rotulo }) => {
              const marcado = (tema.nome ?? "nomes") === forma;
              return (
                <button key={forma} type="button" aria-pressed={marcado} style={escolha(marcado)} onClick={() => onTema({ ...tema, nome: forma })}>
                  {rotulo}
                </button>
              );
            })}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minHeight: "var(--toque-min)" }}>
            <input
              type="checkbox"
              checked={tema.abertura !== false}
              onChange={(e) => onTema({ ...tema, abertura: e.target.checked })}
            />
            <span style={{ fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-secundario)" }}>Abertura antes do site</span>
          </label>
        </div>
      )}

      {modelo !== "convite" && paletas.length > 1 && (
        <div style={secao}>
          <Rotulo>Cores</Rotulo>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {paletas.map((slug) => {
              const p = PALETAS[modelo][slug];
              if (!p) return null;
              const marcado = slug === paletaAtual;
              return (
                <button key={slug} type="button" aria-pressed={marcado} style={escolha(marcado)} onClick={() => onTema({ ...tema, paleta: slug })}>
                  <span aria-hidden style={{ display: "inline-flex" }}>
                    {[p.bg, p.ink, p.accent].map((c, i) => (
                      <span
                        key={i}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          background: c,
                          border: "1px solid var(--cor-borda)",
                          marginLeft: i ? -4 : 0,
                        }}
                      />
                    ))}
                  </span>
                  {p.nome}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {modelo === "convite" && (
        <div style={secao}>
          <Rotulo>Cores</Rotulo>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {PAPEIS_DE_COR.map((papel) => (
              <label key={papel} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={tema.cores?.[papel] ?? CORES_DO_CONVITE[papel]}
                  onChange={(e) => onTema({ ...tema, cores: { ...(tema.cores ?? {}), [papel]: e.target.value } })}
                  style={{ width: 42, height: 34, border: "none", background: "none", cursor: "pointer" }}
                />
                <span style={{ fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-secundario)" }}>{NOME_DA_COR[papel]}</span>
              </label>
            ))}
          </div>
          {tema.cores && Object.keys(tema.cores).length > 0 && (
            <div>
              <button type="button" style={{ ...botao, border: "none" }} disabled={pendente} onClick={() => onTema({ ...tema, cores: {} })}>
                Voltar às cores do modelo
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          style={{ ...botao, background: "var(--cor-texto-forte)", borderColor: "var(--cor-texto-forte)", color: "var(--cor-card)" }}
          disabled={pendente}
          onClick={onSalvar}
        >
          {pendente ? "Salvando…" : "Salvar aparência"}
        </button>
        {mudou && <p style={nota}>Ainda não salvo</p>}
      </div>
    </>
  );
}
