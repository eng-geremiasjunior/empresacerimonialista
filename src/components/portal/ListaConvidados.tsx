"use client";

// A lista de convidados da cliente: filtro por lado, contador do que
// importa (quantas pessoas vão à festa, não quantos convites), e o link
// individual de confirmação para ela mandar por onde quiser.
//
// A confirmação também pode ser lançada à mão — sempre tem tia que
// responde por telefone.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Convidado, ResumoConvidados } from "@/lib/supabase/portal-pessoas";
import {
  adicionarConvidado,
  atualizarConvidado,
  lancarConfirmacao,
  removerConvidado,
} from "@/app/(portal)/portal/[eventoId]/convidados/actions";
import { Cartao, ChipIcone, Rotulo } from "./Nucleo";
import { TAMANHO_PEQUENO, TRACO, Users } from "./icones";

const LADOS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "noiva", rotulo: "Noiva" },
  { valor: "noivo", rotulo: "Noivo" },
] as const;

const ESTADO = {
  confirmado: { rotulo: "Confirmado", cor: "var(--cor-texto-rotulo)" },
  aguardando: { rotulo: "Aguardando", cor: "var(--cor-texto-suave)" },
  nao_vai: { rotulo: "Não vai", cor: "var(--cor-texto-rotulo)" },
} as const;

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

function Numero({ n, rotulo }: { n: number; rotulo: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontSize: "var(--ts-metrica)",
          lineHeight: 1.15,
          color: "var(--cor-texto-forte)",
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontSize: "var(--ts-stat-rotulo)",
          color: "var(--cor-texto-suave)",
          lineHeight: 1.35,
        }}
      >
        {rotulo}
      </span>
    </div>
  );
}

export function ListaConvidados({
  eventoId,
  convidados,
  resumo,
  baseUrl,
}: {
  eventoId: string;
  convidados: Convidado[];
  resumo: ResumoConvidados;
  /** origem para montar o link de confirmação */
  baseUrl: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [lado, setLado] = useState<(typeof LADOS)[number]["valor"]>("todos");
  const [novo, setNovo] = useState({ nome: "", lado: "", grupo: "", mesa: "", telefone: "" });
  const [editando, setEditando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const filtrados = useMemo(
    () => (lado === "todos" ? convidados : convidados.filter((c) => c.lado === lado)),
    [convidados, lado]
  );

  // agrupa por grupo (Família, Trabalho…), com os sem grupo no fim
  const grupos = useMemo(() => {
    const mapa = new Map<string, Convidado[]>();
    for (const c of filtrados) {
      const chave = c.grupo?.trim() || "";
      mapa.set(chave, [...(mapa.get(chave) ?? []), c]);
    }
    return [...mapa.entries()].sort((a, b) =>
      a[0] === "" ? 1 : b[0] === "" ? -1 : a[0].localeCompare(b[0])
    );
  }, [filtrados]);

  function adicionar() {
    if (!novo.nome.trim()) return;
    iniciar(async () => {
      const r = await adicionarConvidado(eventoId, {
        nome: novo.nome,
        lado: (novo.lado || null) as "noiva" | "noivo" | null,
        grupo: novo.grupo,
        mesa: novo.mesa,
        telefone: novo.telefone,
      });
      if (r.error) setAviso(r.error);
      else {
        setNovo({ nome: "", lado: "", grupo: "", mesa: "", telefone: "" });
        setAviso(null);
        router.refresh();
      }
    });
  }

  function copiarLink(c: Convidado) {
    const url = `${baseUrl}/confirmar/${c.hash}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiado(c.id);
      setTimeout(() => setCopiado(null), 2200);
    });
  }

  return (
    <>
      <Cartao padding="var(--esp-6)">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--esp-4)" }}>
          <ChipIcone tamanho={40}>
            <Users size={18} strokeWidth={TRACO} />
          </ChipIcone>
          <div
            style={{
              display: "flex",
              gap: "var(--esp-8)",
              flexWrap: "wrap",
              flex: 1,
            }}
          >
            <Numero n={resumo.pessoasNaFesta} rotulo="pessoas na festa" />
            <Numero n={resumo.aguardando} rotulo="ainda não responderam" />
            {resumo.comRestricao > 0 && (
              <Numero n={resumo.comRestricao} rotulo="com restrição alimentar" />
            )}
          </div>
        </div>
      </Cartao>

      {/* filtro por lado — três botões, nunca um menu */}
      <div style={{ display: "flex", gap: 6 }}>
        {LADOS.map((l) => (
          <button
            key={l.valor}
            type="button"
            onClick={() => setLado(l.valor)}
            style={{
              ...botaoStyle,
              flex: 1,
              background:
                lado === l.valor ? "var(--cor-nav-ativo)" : "var(--cor-card-suave)",
              color: lado === l.valor ? "var(--cor-texto)" : "var(--cor-texto-suave)",
            }}
          >
            {l.rotulo}
          </button>
        ))}
      </div>

      {/* adicionar */}
      <Cartao padding="var(--esp-6)">
        <Rotulo>Adicionar convidado</Rotulo>
        <div className="portal-grade-2">
          <input
            style={campoStyle}
            placeholder="Nome"
            value={novo.nome}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <select
            style={campoStyle}
            value={novo.lado}
            onChange={(e) => setNovo({ ...novo, lado: e.target.value })}
          >
            <option value="">Lado (opcional)</option>
            <option value="noiva">Noiva</option>
            <option value="noivo">Noivo</option>
          </select>
          <input
            style={campoStyle}
            placeholder="Grupo (Família, Trabalho…)"
            value={novo.grupo}
            onChange={(e) => setNovo({ ...novo, grupo: e.target.value })}
          />
          <input
            style={campoStyle}
            placeholder="Mesa (opcional)"
            value={novo.mesa}
            onChange={(e) => setNovo({ ...novo, mesa: e.target.value })}
          />
        </div>
        {aviso && (
          <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-atencao)" }}>{aviso}</p>
        )}
        <button
          type="button"
          onClick={adicionar}
          disabled={pendente || !novo.nome.trim()}
          style={{
            ...botaoStyle,
            opacity: pendente || !novo.nome.trim() ? 0.55 : 1,
            alignSelf: "flex-start",
            minWidth: 200,
          }}
        >
          Adicionar
        </button>
      </Cartao>

      {/* a lista */}
      {grupos.length === 0 ? (
        <Cartao padding="var(--esp-6)">
          <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
            {convidados.length === 0
              ? "A lista começa aqui. Adicione as pessoas aos poucos — não precisa ser de uma vez."
              : "Ninguém deste lado ainda."}
          </p>
        </Cartao>
      ) : (
        grupos.map(([grupo, pessoas]) => (
          <Cartao key={grupo || "sem-grupo"} padding="var(--esp-6) var(--esp-8)">
            <Rotulo>{grupo || "Sem grupo"}</Rotulo>
            <div>
              {pessoas.map((c, i) => (
                <LinhaConvidado
                  key={c.id}
                  eventoId={eventoId}
                  convidado={c}
                  ultima={i === pessoas.length - 1}
                  editando={editando === c.id}
                  aoEditar={() => setEditando(editando === c.id ? null : c.id)}
                  aoCopiar={() => copiarLink(c)}
                  copiado={copiado === c.id}
                />
              ))}
            </div>
          </Cartao>
        ))
      )}
    </>
  );
}

function LinhaConvidado({
  eventoId,
  convidado,
  ultima,
  editando,
  aoEditar,
  aoCopiar,
  copiado,
}: {
  eventoId: string;
  convidado: Convidado;
  ultima: boolean;
  editando: boolean;
  aoEditar: () => void;
  aoCopiar: () => void;
  copiado: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [form, setForm] = useState({
    nome: convidado.nome,
    lado: convidado.lado ?? "",
    grupo: convidado.grupo ?? "",
    mesa: convidado.mesa ?? "",
    telefone: convidado.telefone ?? "",
  });

  const e = ESTADO[convidado.confirmacao];
  const detalhe = [
    convidado.mesa ? `mesa ${convidado.mesa}` : null,
    convidado.confirmacao === "confirmado" && convidado.acompanhantes > 0
      ? `+${convidado.acompanhantes} acompanhante${convidado.acompanhantes > 1 ? "s" : ""}`
      : null,
    convidado.confirmacao === "confirmado" && convidado.criancas > 0
      ? `+${convidado.criancas} criança${convidado.criancas > 1 ? "s" : ""}`
      : null,
    convidado.restricaoAlimentar?.trim() || null,
  ]
    .filter(Boolean)
    .join(" · ");

  function salvar() {
    iniciar(async () => {
      await atualizarConvidado(eventoId, convidado.id, {
        nome: form.nome,
        lado: (form.lado || null) as "noiva" | "noivo" | null,
        grupo: form.grupo,
        mesa: form.mesa,
        telefone: form.telefone,
      });
      aoEditar();
      router.refresh();
    });
  }

  function marcar(valor: "confirmado" | "nao_vai" | "aguardando") {
    iniciar(async () => {
      await lancarConfirmacao(eventoId, convidado.id, valor);
      router.refresh();
    });
  }

  function remover() {
    iniciar(async () => {
      await removerConvidado(eventoId, convidado.id);
      router.refresh();
    });
  }

  return (
    <div
      style={{
        padding: "var(--esp-4) 0",
        borderBottom: ultima ? "none" : "1px solid var(--cor-borda-linha)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--esp-3)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--esp-4)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: "var(--ts-meta)", color: "var(--cor-texto-forte)" }}>
            {convidado.nome}
          </span>
          {detalhe && (
            <span style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
              {detalhe}
            </span>
          )}
        </div>
        <Rotulo cor={e.cor} style={{ whiteSpace: "nowrap", paddingTop: 3 }}>
          {e.rotulo}
        </Rotulo>
      </div>

      {editando ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--esp-2)" }}>
          <div className="portal-grade-2">
            <input
              style={campoStyle}
              value={form.nome}
              onChange={(ev) => setForm({ ...form, nome: ev.target.value })}
              placeholder="Nome"
            />
            <select
              style={campoStyle}
              value={form.lado}
              onChange={(ev) => setForm({ ...form, lado: ev.target.value })}
            >
              <option value="">Lado</option>
              <option value="noiva">Noiva</option>
              <option value="noivo">Noivo</option>
            </select>
            <input
              style={campoStyle}
              value={form.grupo}
              onChange={(ev) => setForm({ ...form, grupo: ev.target.value })}
              placeholder="Grupo"
            />
            <input
              style={campoStyle}
              value={form.mesa}
              onChange={(ev) => setForm({ ...form, mesa: ev.target.value })}
              placeholder="Mesa"
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
              onClick={remover}
              disabled={pendente}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" style={botaoStyle} onClick={aoCopiar}>
            {copiado ? "Link copiado" : "Copiar link"}
          </button>
          {convidado.confirmacao !== "confirmado" && (
            <button
              type="button"
              style={botaoStyle}
              onClick={() => marcar("confirmado")}
              disabled={pendente}
            >
              Marcar que vem
            </button>
          )}
          {convidado.confirmacao !== "nao_vai" && (
            <button
              type="button"
              style={botaoStyle}
              onClick={() => marcar("nao_vai")}
              disabled={pendente}
            >
              Marcar que não vem
            </button>
          )}
          <button type="button" style={botaoStyle} onClick={aoEditar}>
            Editar
          </button>
        </div>
      )}
    </div>
  );
}
