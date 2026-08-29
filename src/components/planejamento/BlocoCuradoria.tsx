"use client";

// "Opções para a cliente", dentro do drawer da decisão.
//
// A cerimonialista pesquisa fora do sistema e traz de 2 a 4 referências.
// Enquanto a rodada é rascunho, a cliente não vê nada. Depois de
// publicada, o bloco vira o espelho da resposta — e o botão de fechar
// com o fornecedor escolhido.

import { useState, useTransition } from "react";
import { desmascararDinheiro, mascararDinheiro } from "@/lib/format";
import type { Curadoria, OpcaoCurada } from "@/lib/supabase/curadoria";
import { C, F_TITLE, F_UI, brl, dataBr, monoLabel } from "./celebra";
import type { OpcaoInput } from "@/app/(app)/eventos/[id]/planejamento/curadoria-actions";

export type AcoesCuradoria = {
  onAbrir: () => Promise<void>;
  onSalvarOpcao: (opcao: OpcaoInput) => Promise<string | null>;
  onRemoverOpcao: (opcaoId: string) => Promise<void>;
  onRecomendar: (opcaoId: string | null) => Promise<void>;
  onPublicar: () => Promise<string | null>;
  onDespublicar: () => Promise<void>;
  onFechar: (opcaoId: string) => Promise<string | null>;
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

export function BlocoCuradoria({
  curadoria,
  decidida,
  acoes,
}: {
  curadoria: Curadoria | null;
  /** decisão fechada: a rodada vira histórico, sem botões de montar */
  decidida: boolean;
  acoes: AcoesCuradoria;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | "nova" | null>(null);

  const estado = curadoria?.estado ?? null;
  const respondida = estado === "escolhida" || estado === "recusada";
  const escolhida = curadoria?.opcoes.find(
    (o) => o.id === curadoria.escolhidaOpcaoId
  );

  function rodar(fn: () => Promise<string | null | void>) {
    setErro(null);
    iniciar(async () => {
      const e = await fn();
      if (typeof e === "string") setErro(e);
    });
  }

  // Nada montado ainda: um convite discreto, não um formulário aberto.
  if (!curadoria) {
    if (decidida) return null;
    return (
      <div style={{ borderTop: `1px solid ${C.divisoria}`, paddingTop: 14 }}>
        <button
          type="button"
          disabled={pendente}
          onClick={() => rodar(acoes.onAbrir)}
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
          + montar opções para a cliente
        </button>
      </div>
    );
  }

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
        <span style={monoLabel}>Opções para a cliente</span>
        <span style={{ fontFamily: F_UI, fontSize: 11, color: C.meta }}>
          {estado === "rascunho"
            ? "ela ainda não vê"
            : estado === "publicada"
              ? `no portal desde ${dataBr(curadoria.publicadaEm)}`
              : estado === "escolhida"
                ? `escolheu em ${dataBr(curadoria.respondidaEm)}`
                : `recusou em ${dataBr(curadoria.respondidaEm)}`}
        </span>
      </div>

      {/* A resposta primeiro: é o que ela abriu o drawer para ver. */}
      {estado === "escolhida" && escolhida && (
        <div
          style={{
            background: C.tint,
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: F_TITLE,
              fontWeight: 600,
              fontSize: 13,
              color: C.ameixaEscura,
            }}
          >
            {escolhida.nome}
          </p>
          {escolhida.valor !== null && (
            <p style={{ margin: "2px 0 0", fontFamily: F_UI, fontSize: 12, color: C.corpo }}>
              {brl(escolhida.valor)}
            </p>
          )}
          {!decidida && (
            <button
              type="button"
              disabled={pendente}
              onClick={() => rodar(() => acoes.onFechar(escolhida.id))}
              style={{ ...botao(true), marginTop: 10 }}
            >
              {escolhida.supplierId
                ? "Atualizar dados da decisão"
                : "Fechar com este fornecedor"}
            </button>
          )}
          {escolhida.supplierId && (
            <p style={{ margin: "6px 0 0", fontFamily: F_UI, fontSize: 11, color: C.meta }}>
              Já está no seu cadastro de fornecedores. Falta marcar a decisão
              como decidida.
            </p>
          )}
        </div>
      )}

      {estado === "recusada" && (
        <div
          style={{
            background: C.avisoBg,
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          <p style={{ margin: 0, fontFamily: F_UI, fontSize: 12, color: C.corpo }}>
            Nenhuma serviu. Ela escreveu: “{curadoria.motivoRecusa}”
          </p>
          {!decidida && (
            <button
              type="button"
              disabled={pendente}
              onClick={() => rodar(acoes.onDespublicar)}
              style={{ ...botao(), marginTop: 10 }}
            >
              Montar outra seleção
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {curadoria.opcoes.map((o) =>
          editando === o.id ? (
            <FormOpcao
              key={o.id}
              inicial={o}
              pendente={pendente}
              onCancelar={() => setEditando(null)}
              onSalvar={(dados) =>
                rodar(async () => {
                  const e = await acoes.onSalvarOpcao({ ...dados, id: o.id });
                  if (!e) setEditando(null);
                  return e;
                })
              }
              onRemover={() =>
                rodar(async () => {
                  await acoes.onRemoverOpcao(o.id);
                  setEditando(null);
                })
              }
            />
          ) : (
            <LinhaOpcao
              key={o.id}
              opcao={o}
              escolhida={o.id === curadoria.escolhidaOpcaoId}
              editavel={estado === "rascunho" && !decidida}
              pendente={pendente}
              onEditar={() => setEditando(o.id)}
              onRecomendar={() =>
                rodar(() => acoes.onRecomendar(o.recomendada ? null : o.id))
              }
            />
          )
        )}
      </div>

      {estado === "rascunho" && !decidida && (
        <>
          {editando === "nova" ? (
            <div style={{ marginTop: 8 }}>
              <FormOpcao
                pendente={pendente}
                onCancelar={() => setEditando(null)}
                onSalvar={(dados) =>
                  rodar(async () => {
                    const e = await acoes.onSalvarOpcao(dados);
                    if (!e) setEditando(null);
                    return e;
                  })
                }
              />
            </div>
          ) : (
            curadoria.opcoes.length < 4 && (
              <button
                type="button"
                onClick={() => setEditando("nova")}
                style={{
                  marginTop: 10,
                  border: "none",
                  background: "none",
                  padding: 0,
                  fontFamily: F_TITLE,
                  fontWeight: 500,
                  fontSize: 13,
                  color: C.fantasma,
                  cursor: "pointer",
                }}
              >
                + adicionar opção
              </button>
            )
          )}

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              disabled={pendente || curadoria.opcoes.length < 2}
              onClick={() => rodar(acoes.onPublicar)}
              style={{
                ...botao(true),
                opacity: curadoria.opcoes.length < 2 ? 0.5 : 1,
              }}
            >
              Publicar para a cliente
            </button>
            {curadoria.opcoes.length < 2 && (
              <span
                style={{
                  marginLeft: 8,
                  fontFamily: F_UI,
                  fontSize: 11,
                  color: C.meta,
                }}
              >
                mínimo de duas — uma só não é escolha
              </span>
            )}
          </div>
        </>
      )}

      {estado === "publicada" && !decidida && (
        <button
          type="button"
          disabled={pendente}
          onClick={() => rodar(acoes.onDespublicar)}
          style={{ ...botao(), marginTop: 12 }}
        >
          Tirar do portal e editar
        </button>
      )}

      {respondida && !decidida && estado === "escolhida" && (
        <button
          type="button"
          disabled={pendente}
          onClick={() => rodar(acoes.onDespublicar)}
          style={{ ...botao(), marginTop: 10 }}
        >
          Montar outra seleção
        </button>
      )}

      {erro && (
        <p
          style={{
            margin: "10px 0 0",
            fontFamily: F_UI,
            fontSize: 12,
            color: C.atrasadaFg,
          }}
        >
          {erro}
        </p>
      )}
    </div>
  );
}

function LinhaOpcao({
  opcao,
  escolhida,
  editavel,
  pendente,
  onEditar,
  onRecomendar,
}: {
  opcao: OpcaoCurada;
  escolhida: boolean;
  editavel: boolean;
  pendente: boolean;
  onEditar: () => void;
  onRecomendar: () => void;
}) {
  return (
    <div
      style={{
        border: `1px solid ${escolhida ? C.ameixaClara : C.bordaSutil}`,
        borderRadius: 8,
        padding: "8px 10px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: F_TITLE,
            fontWeight: 600,
            fontSize: 13,
            color: C.tinta,
          }}
        >
          {opcao.nome}
          {opcao.recomendada && (
            <span
              style={{
                marginLeft: 6,
                fontFamily: F_UI,
                fontWeight: 400,
                fontSize: 11,
                color: C.ameixa,
              }}
            >
              recomendada
            </span>
          )}
        </p>
        <p style={{ margin: "2px 0 0", fontFamily: F_UI, fontSize: 12, color: C.secundario }}>
          {[
            opcao.valor !== null ? brl(opcao.valor) : null,
            opcao.prazoReserva ? `reserva até ${dataBr(opcao.prazoReserva)}` : null,
            opcao.inclui.length > 0 ? opcao.inclui.join(", ") : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {editavel && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            disabled={pendente}
            onClick={onRecomendar}
            title={opcao.recomendada ? "Tirar a recomendação" : "Recomendar esta"}
            style={{
              ...botao(),
              height: 26,
              padding: "0 8px",
              color: opcao.recomendada ? C.ameixa : C.meta,
            }}
          >
            ★
          </button>
          <button
            type="button"
            onClick={onEditar}
            style={{ ...botao(), height: 26, padding: "0 8px" }}
          >
            Editar
          </button>
        </div>
      )}
    </div>
  );
}

function FormOpcao({
  inicial,
  pendente,
  onSalvar,
  onCancelar,
  onRemover,
}: {
  inicial?: OpcaoCurada;
  pendente: boolean;
  onSalvar: (dados: OpcaoInput) => void;
  onCancelar: () => void;
  onRemover?: () => void;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [valor, setValor] = useState(inicial?.valor?.toString() ?? "");
  const [inclui, setInclui] = useState(inicial?.inclui.join(", ") ?? "");
  const [prazo, setPrazo] = useState(inicial?.prazoReserva ?? "");
  const [nota, setNota] = useState(inicial?.nota ?? "");

  return (
    <div
      style={{
        border: `1px solid ${C.bordaMedia}`,
        borderRadius: 8,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <input
        style={campo}
        placeholder="Nome (o que a cliente vê)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        autoFocus
      />
      <div style={{ display: "flex", gap: 6 }}>
        <input
          style={campo}
          placeholder="Valor"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(mascararDinheiro(e.target.value))}
        />
        <input
          style={campo}
          type="date"
          title="Prazo da reserva"
          value={prazo}
          onChange={(e) => setPrazo(e.target.value)}
        />
      </div>
      <input
        style={campo}
        placeholder="Inclui (separado por vírgula)"
        value={inclui}
        onChange={(e) => setInclui(e.target.value)}
      />
      <input
        style={campo}
        placeholder="Sua nota para ela (opcional)"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
        <button
          type="button"
          disabled={pendente || !nome.trim()}
          onClick={() =>
            onSalvar({
              nome,
              valor: valor.trim() ? desmascararDinheiro(valor) : null,
              inclui: inclui.split(",").map((i) => i.trim()),
              prazoReserva: prazo || null,
              nota,
            })
          }
          style={botao(true)}
        >
          Salvar
        </button>
        <button type="button" onClick={onCancelar} style={botao()}>
          Cancelar
        </button>
        {onRemover && (
          <button
            type="button"
            disabled={pendente}
            onClick={onRemover}
            style={{ ...botao(), marginLeft: "auto", color: C.atrasadaFg }}
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
