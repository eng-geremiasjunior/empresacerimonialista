"use client";

// "Guia de estilo", dentro do drawer da decisão de briefing de decoração.
//
// O guia não é área nova do sistema: é o produto desta decisão. Ela
// escolhe uma paleta da biblioteca, ajusta as listas e manda para o
// casal ver. Ferramenta de trabalho — mais funcional e menos editorial
// que a tela da noiva, de propósito.

import { useEffect, useState, useTransition } from "react";
import type { GuiaDeEstilo, PaletaDaBiblioteca, SecaoGuia } from "@/lib/guia-shared";
import { SECOES_GUIA, SECAO_ROTULO, SITUACAO } from "@/lib/guia-shared";
import { C, F_TITLE, F_UI, monoLabel } from "./celebra";
import type { SupplierRef } from "./DrawerDecisao";

export type AcoesGuia = {
  onCriar: (paletaId: string | null) => Promise<string | null>;
  onSalvarItem: (
    tipo: "cor" | "flor" | "material" | "traje",
    item: Record<string, unknown> & { id?: string }
  ) => Promise<string | null>;
  onRemoverItem: (
    tipo: "cor" | "flor" | "material" | "traje",
    id: string
  ) => Promise<void>;
  onEnviar: () => Promise<string | null>;
  /** curadoria: a imagem da cliente entra (ou sai) do guia */
  onMarcarReferencia: (referenciaId: string, noGuia: boolean) => Promise<string | null>;
  onSalvarRestricoes: (texto: string) => Promise<string | null>;
  onCompartilhar: (supplierId: string, secoes: string[]) => Promise<string | null>;
  onPararCompartilhar: (supplierId: string) => Promise<void>;
  carregarPaletas: () => Promise<PaletaDaBiblioteca[]>;
  carregarCompartilhamentos: () => Promise<
    { id: string; supplierId: string; nome: string; secoes: string[]; hash: string }[]
  >;
};

const botao = (primario = false): React.CSSProperties => ({
  height: 34,
  padding: "0 12px",
  borderRadius: 8,
  border: primario ? "none" : `1px solid ${C.bordaMedia}`,
  background: primario ? C.ameixa : "#fff",
  color: primario ? "#fff" : C.corpo,
  fontFamily: F_TITLE,
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
});

const campo: React.CSSProperties = {
  width: "100%",
  height: 32,
  padding: "0 8px",
  borderRadius: 6,
  border: `1px solid ${C.bordaSutil}`,
  fontFamily: F_UI,
  fontSize: 12,
  color: C.tinta,
};

export function BlocoGuiaEstilo({
  guia,
  suppliers,
  acoes,
}: {
  guia: GuiaDeEstilo | null;
  suppliers: SupplierRef[];
  acoes: AcoesGuia;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [paletas, setPaletas] = useState<PaletaDaBiblioteca[] | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [aba, setAba] = useState<"conteudo" | "envio">("conteudo");

  function rodar(fn: () => Promise<string | null | void>) {
    setErro(null);
    iniciar(async () => {
      const e = await fn();
      if (typeof e === "string") setErro(e);
    });
  }

  // Sem guia: um convite discreto, e a biblioteca só carrega quando ela
  // decide montar — a maioria das decisões nunca terá guia.
  if (!guia) {
    return (
      <div style={{ borderTop: `1px solid ${C.divisoria}`, paddingTop: 14 }}>
        {escolhendo ? (
          <>
            <span style={monoLabel}>Escolha uma paleta para começar</span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 8,
              }}
            >
              {(paletas ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={pendente}
                  onClick={() => rodar(() => acoes.onCriar(p.id))}
                  style={{
                    border: `1px solid ${C.bordaSutil}`,
                    borderRadius: 8,
                    background: "#fff",
                    padding: "8px 10px",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: F_TITLE,
                      fontWeight: 600,
                      fontSize: 13,
                      color: C.tinta,
                    }}
                  >
                    {p.nome}
                  </span>
                  <span style={{ display: "flex", gap: 4 }}>
                    {p.cores.map((c) => (
                      <span
                        key={c.id}
                        title={`${c.nome} · ${c.hex}`}
                        style={{
                          width: 26,
                          height: 18,
                          borderRadius: 4,
                          background: c.hex,
                          boxShadow: "0 0 0 1px rgba(70,56,42,.14) inset",
                        }}
                      />
                    ))}
                  </span>
                </button>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <button
                  type="button"
                  style={botao()}
                  disabled={pendente}
                  onClick={() => rodar(() => acoes.onCriar(null))}
                >
                  Começar em branco
                </button>
                <button
                  type="button"
                  style={botao()}
                  onClick={() => setEscolhendo(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={pendente}
            onClick={() => {
              setEscolhendo(true);
              if (!paletas) acoes.carregarPaletas().then(setPaletas);
            }}
            style={{
              border: "none",
              background: "none",
              padding: 0,
              textAlign: "left",
              fontFamily: F_TITLE,
              fontWeight: 500,
              fontSize: 13,
              color: C.fantasma,
              cursor: "pointer",
            }}
          >
            + montar o guia de estilo
          </button>
        )}
        {erro && <p style={{ ...erroStyle }}>{erro}</p>}
      </div>
    );
  }

  const situacao = SITUACAO[guia.situacao];
  const escolhidas = guia.flores.filter((f) => !f.vetada);
  const vetadas = guia.flores.filter((f) => f.vetada);

  return (
    <div style={{ borderTop: `1px solid ${C.divisoria}`, paddingTop: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={monoLabel}>Guia de estilo</span>
        <span style={{ fontFamily: F_UI, fontSize: 11, color: C.meta }}>
          {situacao.rotulo.toLowerCase()}
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["conteudo", "envio"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAba(a)}
            style={{
              ...botao(),
              height: 26,
              background: aba === a ? C.tint : "#fff",
            }}
          >
            {a === "conteudo" ? "Conteúdo" : "Enviar a fornecedores"}
          </button>
        ))}
      </div>

      {aba === "conteudo" ? (
        <>
          <p
            style={{
              margin: "0 0 10px",
              fontFamily: F_TITLE,
              fontWeight: 600,
              fontSize: 14,
              color: C.tinta,
            }}
          >
            {guia.nome}
          </p>

          <ListaSimples
            rotulo="Cores"
            itens={guia.cores.map((c) => ({
              id: c.id,
              texto: `${c.nome} · ${c.hex}`,
              cor: c.hex,
            }))}
            campos={[
              { chave: "nome", rotulo: "Nome da cor" },
              { chave: "hex", rotulo: "#A9603F" },
              { chave: "nota", rotulo: "Nota (opcional)" },
            ]}
            pendente={pendente}
            onAdicionar={(v) =>
              rodar(() =>
                acoes.onSalvarItem("cor", {
                  nome: v.nome,
                  hex: v.hex,
                  nota: v.nota || null,
                  ordem: guia.cores.length,
                })
              )
            }
            onRemover={(id) => rodar(() => acoes.onRemoverItem("cor", id))}
          />

          <ListaSimples
            rotulo="Flores"
            itens={escolhidas.map((f) => ({
              id: f.id,
              texto: [f.nome, f.epoca].filter(Boolean).join(" · "),
            }))}
            campos={[
              { chave: "nome", rotulo: "Nome da flor" },
              { chave: "epoca", rotulo: "Época (opcional)" },
              { chave: "nota", rotulo: "Nota (opcional)" },
            ]}
            pendente={pendente}
            onAdicionar={(v) =>
              rodar(() =>
                acoes.onSalvarItem("flor", {
                  nome: v.nome,
                  epoca: v.epoca || null,
                  nota: v.nota || null,
                  vetada: false,
                  ordem: guia.flores.length,
                })
              )
            }
            onRemover={(id) => rodar(() => acoes.onRemoverItem("flor", id))}
          />

          <FloresVetadas
            vetadas={vetadas}
            total={guia.flores.length}
            pendente={pendente}
            onAdicionar={(v) =>
              rodar(() =>
                acoes.onSalvarItem("flor", {
                  nome: v.nome,
                  vetada: true,
                  motivo_interno: v.interno || null,
                  motivo_fornecedor: v.fornecedor || null,
                  sensibilidade: v.alergia ? "alergia" : "normal",
                  ordem: v.ordem,
                })
              )
            }
            onRemover={(id) => rodar(() => acoes.onRemoverItem("flor", id))}
          />

          <ListaSimples
            rotulo="Materiais"
            itens={guia.materiais.map((m) => ({ id: m.id, texto: m.nome }))}
            campos={[
              { chave: "nome", rotulo: "Nome do material" },
              { chave: "nota", rotulo: "Nota (opcional)" },
            ]}
            pendente={pendente}
            onAdicionar={(v) =>
              rodar(() =>
                acoes.onSalvarItem("material", {
                  nome: v.nome,
                  nota: v.nota || null,
                  ordem: guia.materiais.length,
                })
              )
            }
            onRemover={(id) => rodar(() => acoes.onRemoverItem("material", id))}
          />

          <Referencias
            referencias={guia.referencias}
            pendente={pendente}
            onMarcar={(id, noGuia) =>
              rodar(() => acoes.onMarcarReferencia(id, noGuia))
            }
          />

          <Restricoes
            valor={guia.restricoes}
            pendente={pendente}
            onSalvar={(texto) => rodar(() => acoes.onSalvarRestricoes(texto))}
          />

          {guia.situacao === "montagem" && (
            <button
              type="button"
              style={{ ...botao(true), marginTop: 12 }}
              disabled={pendente || guia.cores.length === 0}
              onClick={() => rodar(acoes.onEnviar)}
            >
              Mandar o casal ver
            </button>
          )}
          {guia.situacao === "aprovado" && (
            <p style={{ ...notaStyle, marginTop: 12 }}>
              Aprovado por {guia.aprovadoNome ?? "a cliente"}. Mexer agora pede
              nova confirmação — a aprovação anterior fica registrada.
            </p>
          )}
        </>
      ) : (
        <Envio
          guia={guia}
          suppliers={suppliers}
          pendente={pendente}
          acoes={acoes}
          rodar={rodar}
        />
      )}

      {erro && <p style={erroStyle}>{erro}</p>}
    </div>
  );
}

const notaStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: F_UI,
  fontSize: 11,
  lineHeight: 1.5,
  color: C.meta,
};
const erroStyle: React.CSSProperties = {
  margin: "10px 0 0",
  fontFamily: F_UI,
  fontSize: 12,
  color: C.atrasadaFg,
};

// As imagens que a cliente guardou no portal. Antes disto, a equipe não
// as via aqui — e o link do fornecedor mandava todas, inclusive as que a
// conversa já tinha descartado. Marcar é o que decide o que sai.
function Referencias({
  referencias,
  pendente,
  onMarcar,
}: {
  referencias: GuiaDeEstilo["referencias"];
  pendente: boolean;
  onMarcar: (id: string, noGuia: boolean) => void;
}) {
  if (referencias.length === 0) return null;
  const dentro = referencias.filter((r) => r.noGuia).length;

  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ ...monoLabel, fontSize: 10 }}>
        Referências da cliente · {dentro} de {referencias.length} no guia
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
          gap: 6,
          marginTop: 6,
        }}
      >
        {referencias.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={pendente}
            onClick={() => onMarcar(r.id, !r.noGuia)}
            title={r.agradou ?? r.assunto}
            aria-pressed={r.noGuia}
            style={{
              position: "relative",
              padding: 0,
              border: r.noGuia
                ? `2px solid ${C.ameixa}`
                : `1px solid ${C.bordaSutil}`,
              borderRadius: 8,
              overflow: "hidden",
              background: C.bordaSutil,
              aspectRatio: "1 / 1",
              cursor: pendente ? "default" : "pointer",
              opacity: r.noGuia ? 1 : 0.55,
            }}
          >
            {r.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.fotoUrl}
                alt={r.agradou ?? r.assunto}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : null}
            {r.noGuia && (
              <span
                style={{
                  position: "absolute",
                  right: 3,
                  bottom: 3,
                  background: C.ameixa,
                  color: "#fff",
                  fontFamily: F_UI,
                  fontSize: 9,
                  lineHeight: 1,
                  padding: "3px 5px",
                  borderRadius: 4,
                }}
              >
                no guia
              </span>
            )}
          </button>
        ))}
      </div>
      <p style={{ ...notaStyle, marginTop: 5 }}>
        Toque para levar ao guia. Só as marcadas vão no link do fornecedor.
      </p>
    </div>
  );
}

// A regra de execução que viaja com qualquer fatia do guia.
function Restricoes({
  valor,
  pendente,
  onSalvar,
}: {
  valor: string | null;
  pendente: boolean;
  onSalvar: (texto: string) => void;
}) {
  const [texto, setTexto] = useState(valor ?? "");
  const mudou = texto.trim() !== (valor ?? "").trim();

  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ ...monoLabel, fontSize: 10 }}>O que não pode mudar</span>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Centro de mesa até 20 cm de altura"
        style={{
          ...campo,
          height: "auto",
          padding: "7px 8px",
          lineHeight: 1.5,
          resize: "vertical",
          marginTop: 5,
        }}
      />
      <p style={{ ...notaStyle, marginTop: 4 }}>
        Escreva a regra, não o motivo — isto sai no link de todos os
        fornecedores do evento, não só de quem decora.
      </p>
      {mudou && (
        <button
          type="button"
          style={{ ...botao(), marginTop: 6 }}
          disabled={pendente}
          onClick={() => onSalvar(texto)}
        >
          Salvar
        </button>
      )}
    </div>
  );
}

function ListaSimples({
  rotulo,
  itens,
  campos,
  pendente,
  onAdicionar,
  onRemover,
}: {
  rotulo: string;
  itens: { id: string; texto: string; cor?: string }[];
  campos: { chave: string; rotulo: string }[];
  pendente: boolean;
  onAdicionar: (v: Record<string, string>) => void;
  onRemover: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});

  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ ...monoLabel, fontSize: 10 }}>{rotulo}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 5 }}>
        {itens.map((i) => (
          <div
            key={i.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: F_UI,
              fontSize: 12,
              color: C.corpo,
            }}
          >
            {i.cor && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: i.cor,
                  boxShadow: "0 0 0 1px rgba(70,56,42,.14) inset",
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ flex: 1, minWidth: 0 }}>{i.texto}</span>
            <button
              type="button"
              disabled={pendente}
              onClick={() => onRemover(i.id)}
              title="Remover"
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: C.meta,
                fontSize: 14,
                lineHeight: 1,
                padding: 2,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {aberto ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
          {campos.map((c) => (
            <input
              key={c.chave}
              style={campo}
              placeholder={c.rotulo}
              value={valores[c.chave] ?? ""}
              onChange={(e) =>
                setValores({ ...valores, [c.chave]: e.target.value })
              }
            />
          ))}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              style={botao(true)}
              disabled={pendente || !valores.nome?.trim()}
              onClick={() => {
                onAdicionar(valores);
                setValores({});
                setAberto(false);
              }}
            >
              Adicionar
            </button>
            <button type="button" style={botao()} onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          style={{
            marginTop: 5,
            border: "none",
            background: "none",
            padding: 0,
            fontFamily: F_TITLE,
            fontWeight: 500,
            fontSize: 12,
            color: C.fantasma,
            cursor: "pointer",
          }}
        >
          + {rotulo.toLowerCase().replace(/s$/, "")}
        </button>
      )}
    </div>
  );
}

/**
 * O veto e os dois motivos.
 *
 * O motivo interno é o que ela lê aqui e pode dizer "alergia da noiva".
 * O do fornecedor é o que sai no link — e a tela avisa disso em vez de
 * confiar que ela lembre.
 */
function FloresVetadas({
  vetadas,
  total,
  pendente,
  onAdicionar,
  onRemover,
}: {
  vetadas: { id: string; nome: string; motivoInterno: string | null; motivoFornecedor: string | null; sensibilidade: string }[];
  total: number;
  pendente: boolean;
  onAdicionar: (v: {
    nome: string;
    interno: string;
    fornecedor: string;
    alergia: boolean;
    ordem: number;
  }) => void;
  onRemover: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [interno, setInterno] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [alergia, setAlergia] = useState(false);

  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ ...monoLabel, fontSize: 10 }}>Deixar de fora</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 5 }}>
        {vetadas.map((v) => (
          <div key={v.id} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: F_UI,
                  fontSize: 12,
                  color: C.corpo,
                }}
              >
                {v.nome}
                {v.sensibilidade === "alergia" && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: C.pendenteFg }}>
                    saúde
                  </span>
                )}
              </p>
              {v.motivoInterno && (
                <p style={{ ...notaStyle, fontSize: 10 }}>
                  interno: {v.motivoInterno}
                </p>
              )}
              <p style={{ ...notaStyle, fontSize: 10 }}>
                fornecedor vê: {v.motivoFornecedor?.trim() || "não usar"}
              </p>
            </div>
            <button
              type="button"
              disabled={pendente}
              onClick={() => onRemover(v.id)}
              title="Remover"
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: C.meta,
                fontSize: 14,
                lineHeight: 1,
                padding: 2,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {aberto ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
          <input
            style={campo}
            placeholder="Nome da flor"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            style={campo}
            placeholder="Motivo (só você lê)"
            value={interno}
            onChange={(e) => setInterno(e.target.value)}
          />
          <input
            style={campo}
            placeholder="O que o fornecedor lê"
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: F_UI,
              fontSize: 11,
              color: C.secundario,
            }}
          >
            <input
              type="checkbox"
              checked={alergia}
              onChange={(e) => setAlergia(e.target.checked)}
            />
            É questão de saúde
          </label>
          {alergia && (
            <p style={{ ...notaStyle, color: C.pendenteFg }}>
              O motivo de cima não sai do sistema. Escreva na linha do
              fornecedor só o que ele precisa para executar.
            </p>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              style={botao(true)}
              disabled={pendente || !nome.trim()}
              onClick={() => {
                onAdicionar({ nome, interno, fornecedor, alergia, ordem: total });
                setNome("");
                setInterno("");
                setFornecedor("");
                setAlergia(false);
                setAberto(false);
              }}
            >
              Adicionar
            </button>
            <button type="button" style={botao()} onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          style={{
            marginTop: 5,
            border: "none",
            background: "none",
            padding: 0,
            fontFamily: F_TITLE,
            fontWeight: 500,
            fontSize: 12,
            color: C.fantasma,
            cursor: "pointer",
          }}
        >
          + flor vetada
        </button>
      )}
    </div>
  );
}

/** Enviar a fatia de cada fornecedor. */
function Envio({
  guia,
  suppliers,
  pendente,
  acoes,
  rodar,
}: {
  guia: GuiaDeEstilo;
  suppliers: SupplierRef[];
  pendente: boolean;
  acoes: AcoesGuia;
  rodar: (fn: () => Promise<string | null | void>) => void;
}) {
  const [enviados, setEnviados] = useState<
    { id: string; supplierId: string; nome: string; secoes: string[]; hash: string }[]
  >([]);
  const [alvo, setAlvo] = useState<string>("");
  const [secoes, setSecoes] = useState<SecaoGuia[]>(["cores"]);

  useEffect(() => {
    acoes.carregarCompartilhamentos().then(setEnviados);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guia.id]);

  const aprovado = guia.situacao === "aprovado" || guia.situacao === "alterado";

  return (
    <>
      {!aprovado && (
        <p style={{ ...notaStyle, marginBottom: 10, color: C.pendenteFg }}>
          Nada chega ao fornecedor antes de o casal aprovar. Você já pode
          preparar os envios: eles passam a abrir assim que a aprovação sair.
        </p>
      )}

      {enviados.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {enviados.map((e) => (
            <div
              key={e.id}
              style={{
                border: `1px solid ${C.bordaSutil}`,
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: F_TITLE,
                  fontWeight: 600,
                  fontSize: 12,
                  color: C.tinta,
                }}
              >
                {e.nome}
              </p>
              <p style={{ ...notaStyle, fontSize: 10 }}>
                vê: {e.secoes.map((s) => SECAO_ROTULO[s as SecaoGuia] ?? s).join(", ")}
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button
                  type="button"
                  style={{ ...botao(), height: 26 }}
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `${window.location.origin}/guia/${e.hash}`
                    );
                  }}
                >
                  Copiar link
                </button>
                <button
                  type="button"
                  style={{ ...botao(), height: 26, color: C.atrasadaFg }}
                  disabled={pendente}
                  onClick={() =>
                    rodar(async () => {
                      await acoes.onPararCompartilhar(e.supplierId);
                      setEnviados(await acoes.carregarCompartilhamentos());
                    })
                  }
                >
                  Tirar do ar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <span style={{ ...monoLabel, fontSize: 10 }}>Enviar para</span>
      <select
        style={{ ...campo, marginTop: 5 }}
        value={alvo}
        onChange={(e) => setAlvo(e.target.value)}
      >
        <option value="">Escolha o fornecedor…</option>
        {suppliers
          .filter((s) => !enviados.some((e) => e.supplierId === s.id))
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
      </select>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          margin: "8px 0",
        }}
      >
        {SECOES_GUIA.map((s) => {
          const marcada = secoes.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() =>
                setSecoes(
                  marcada ? secoes.filter((x) => x !== s) : [...secoes, s]
                )
              }
              style={{
                ...botao(),
                height: 26,
                padding: "0 9px",
                background: marcada ? C.tint : "#fff",
                color: marcada ? C.ameixaEscura : C.meta,
              }}
            >
              {SECAO_ROTULO[s]}
            </button>
          );
        })}
      </div>
      <p style={{ ...notaStyle, marginBottom: 8 }}>
        Ele vê só o que estiver marcado — nunca o guia inteiro.
      </p>

      <button
        type="button"
        style={botao(true)}
        disabled={pendente || !alvo || secoes.length === 0}
        onClick={() =>
          rodar(async () => {
            const e = await acoes.onCompartilhar(alvo, secoes);
            if (!e) {
              setAlvo("");
              setEnviados(await acoes.carregarCompartilhamentos());
            }
            return e;
          })
        }
      >
        Gerar o link dele
      </button>
    </>
  );
}
