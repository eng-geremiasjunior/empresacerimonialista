"use client";

// O cortejo, agrupado por papel. Lista dinâmica: a pessoa entra quando é
// convidada. Campo vazio não vira "—" na tela — some, porque o cadastro
// se completa aos poucos e uma lista de traços parece erro.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PAPEIS,
  PAPEL_ROTULO,
  type PessoaCortejo,
} from "@/lib/portal-pessoas-shared";
import {
  adicionarPessoaCortejo,
  atualizarPessoaCortejo,
  removerPessoaCortejo,
} from "@/app/(portal)/portal/[eventoId]/cortejo/actions";
import { Cartao, Rotulo } from "./Nucleo";

const campoStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "10px 12px",
  minHeight: "var(--toque-min)",
  fontSize: "var(--ts-item-desc)",
  fontFamily: "var(--fonte-corpo)",
  color: "var(--cor-texto)",
};

const botaoStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "9px 14px",
  minHeight: "var(--toque-min)",
  fontSize: "var(--ts-botao)",
  color: "var(--cor-texto-secundario)",
  cursor: "pointer",
  fontFamily: "var(--fonte-corpo)",
};

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor?.trim()) return null; // campo vazio não aparece
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--esp-3)",
      }}
    >
      <Rotulo style={{ minWidth: 92, flexShrink: 0 }}>{rotulo}</Rotulo>
      <span style={{ fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-secundario)" }}>
        {valor}
      </span>
    </div>
  );
}

export function ListaCortejo({
  eventoId,
  pessoas,
}: {
  eventoId: string;
  pessoas: PessoaCortejo[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [novo, setNovo] = useState({
    papel: "padrinho" as PessoaCortejo["papel"],
    nome: "",
    contato: "",
    oQueLeva: "",
    chegada: "",
  });
  const [editando, setEditando] = useState<string | null>(null);

  const grupos = PAPEIS.map((papel) => ({
    papel,
    rotulo: PAPEL_ROTULO[papel],
    lista: pessoas.filter((p) => p.papel === papel),
  })).filter((g) => g.lista.length > 0);

  function adicionar() {
    if (!novo.nome.trim()) return;
    iniciar(async () => {
      await adicionarPessoaCortejo(eventoId, {
        papel: novo.papel,
        nome: novo.nome,
        contato: novo.contato,
        oQueLeva: novo.oQueLeva,
        chegada: novo.chegada,
      });
      setNovo({ ...novo, nome: "", contato: "", oQueLeva: "", chegada: "" });
      router.refresh();
    });
  }

  return (
    <>
      <Cartao padding="var(--esp-6)">
        <Rotulo>Convidar alguém</Rotulo>
        <div className="portal-grade-2">
          <select
            style={campoStyle}
            value={novo.papel}
            onChange={(e) =>
              setNovo({ ...novo, papel: e.target.value as PessoaCortejo["papel"] })
            }
          >
            {PAPEIS.map((p) => (
              <option key={p} value={p}>
                {PAPEL_ROTULO[p].replace(/s$/, "")}
              </option>
            ))}
          </select>
          <input
            style={campoStyle}
            placeholder="Nome"
            value={novo.nome}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <input
            style={campoStyle}
            placeholder="Contato (opcional)"
            value={novo.contato}
            onChange={(e) => setNovo({ ...novo, contato: e.target.value })}
          />
          <input
            style={campoStyle}
            placeholder="O que leva (opcional)"
            value={novo.oQueLeva}
            onChange={(e) => setNovo({ ...novo, oQueLeva: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={adicionar}
          disabled={pendente || !novo.nome.trim()}
          style={{
            ...botaoStyle,
            alignSelf: "flex-start",
            minWidth: 200,
            opacity: pendente || !novo.nome.trim() ? 0.55 : 1,
          }}
        >
          Adicionar
        </button>
      </Cartao>

      {grupos.length === 0 ? (
        <Cartao padding="var(--esp-6)">
          <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
            Ainda não há ninguém no cortejo. Vocês podem ir convidando aos poucos.
          </p>
        </Cartao>
      ) : (
        grupos.map((g) => (
          <Cartao key={g.papel} padding="var(--esp-6) var(--esp-8)">
            <Rotulo>{g.rotulo}</Rotulo>
            <div>
              {g.lista.map((p, i) => (
                <PessoaLinha
                  key={p.id}
                  eventoId={eventoId}
                  pessoa={p}
                  ultima={i === g.lista.length - 1}
                  editando={editando === p.id}
                  aoEditar={() => setEditando(editando === p.id ? null : p.id)}
                />
              ))}
            </div>
          </Cartao>
        ))
      )}
    </>
  );
}

function PessoaLinha({
  eventoId,
  pessoa,
  ultima,
  editando,
  aoEditar,
}: {
  eventoId: string;
  pessoa: PessoaCortejo;
  ultima: boolean;
  editando: boolean;
  aoEditar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [form, setForm] = useState({
    nome: pessoa.nome,
    contato: pessoa.contato ?? "",
    oQueLeva: pessoa.oQueLeva ?? "",
    responsavel: pessoa.responsavel ?? "",
    chegada: pessoa.chegada ?? "",
  });

  function salvar() {
    iniciar(async () => {
      await atualizarPessoaCortejo(eventoId, pessoa.id, {
        papel: pessoa.papel,
        ...form,
      });
      aoEditar();
      router.refresh();
    });
  }

  return (
    <div
      style={{
        padding: "var(--esp-5) 0",
        borderBottom: ultima ? "none" : "1px solid var(--cor-borda-linha)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--esp-3)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontSize: "var(--ts-titulo-lateral)",
          color: "var(--cor-texto-forte)",
        }}
      >
        {pessoa.nome}
      </span>

      {editando ? (
        <>
          <div className="portal-grade-2">
            <input
              style={campoStyle}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome"
            />
            <input
              style={campoStyle}
              value={form.contato}
              onChange={(e) => setForm({ ...form, contato: e.target.value })}
              placeholder="Contato"
            />
            <input
              style={campoStyle}
              value={form.oQueLeva}
              onChange={(e) => setForm({ ...form, oQueLeva: e.target.value })}
              placeholder="O que leva"
            />
            <input
              style={campoStyle}
              value={form.chegada}
              onChange={(e) => setForm({ ...form, chegada: e.target.value })}
              placeholder="Quando chega"
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" style={botaoStyle} onClick={salvar} disabled={pendente}>
              Salvar
            </button>
            <button type="button" style={botaoStyle} onClick={aoEditar}>
              Cancelar
            </button>
            <button
              type="button"
              style={{ ...botaoStyle, marginLeft: "auto", color: "var(--cor-atencao)" }}
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  await removerPessoaCortejo(eventoId, pessoa.id);
                  router.refresh();
                })
              }
            >
              Remover
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--esp-2)" }}>
            <Campo rotulo="Contato" valor={pessoa.contato} />
            <Campo rotulo="Vai levar" valor={pessoa.oQueLeva} />
            <Campo rotulo="Responsável" valor={pessoa.responsavel} />
            <Campo rotulo="Chegada" valor={pessoa.chegada} />
          </div>
          <button
            type="button"
            style={{ ...botaoStyle, alignSelf: "flex-start" }}
            onClick={aoEditar}
          >
            Editar
          </button>
        </>
      )}
    </div>
  );
}
