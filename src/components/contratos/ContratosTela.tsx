"use client";

// A área de Contratos — o ciclo inteiro numa tela só.
//
// Quatro visões, na ordem da próxima decisão: esperando conferência
// (a fila de trabalho), cobranças em aberto, sem contrato, conferidos
// (o histórico com a auditoria payload × aplicado). Papel e tinta;
// âmbar só onde há decisão pendente. Tudo filtra no cliente.
//
// A MESMA tela serve o menu global e a aba do evento: `escopoEvento`
// esconde a coluna de evento e restringe o contexto — toda ação usa o
// eventId DA LINHA, nunca da rota.

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  contarVisoes,
  filtrarLinhas,
  filtrarSemContrato,
  fraseDaCobranca,
  fraseDaEspera,
  ordenar,
  ordenarSemContrato,
  ORDEM_VISOES,
  resumoDoAplicado,
  resumoDoContrato,
  VISAO_LABELS,
  type ContratoLinha,
  type SemContratoLinha,
  type VisaoContratos,
} from "@/lib/contratos-lista";
import type { PropostaExtracao } from "@/lib/contrato-extracao-core";
import { FluxoLeituraContrato } from "@/components/contratos/FluxoLeituraContrato";
import { ConferenciaExtracao } from "@/components/contratos/ConferenciaExtracao";
import { enviarArquivo } from "@/lib/contratos-cliente";
import {
  prepararAnexoContrato,
  confirmarAnexoContrato,
} from "@/app/(app)/eventos/[id]/fornecedores/anexo-actions";
import { arquivarContratoSemLeitura } from "@/app/(app)/eventos/[id]/fornecedores/extracao-actions";
import {
  cobrarDeNovo,
  pedirAoFornecedor,
} from "@/app/(app)/solicitacoes/actions";

const T = {
  mono: "'IBM Plex Mono', monospace",
  ui: "'Instrument Sans', system-ui, sans-serif",
  titulo: "Inter, system-ui, sans-serif",
};

type Resultado = { error: string } | { success: true } | null | void;

export function ContratosTela({
  linhas,
  semContrato,
  hoje,
  escopoEvento,
  podeEscrever,
}: {
  linhas: ContratoLinha[];
  semContrato: SemContratoLinha[];
  hoje: string;
  /** quando presente, a tela é a aba de UM evento */
  escopoEvento: { id: string; nome: string } | null;
  podeEscrever: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [visao, setVisao] = useState<VisaoContratos>(() => {
    const c = contarVisoes(linhas, semContrato);
    return ORDEM_VISOES.find((v) => c[v] > 0) ?? "conferencia";
  });
  const [aberto, setAberto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const contagens = useMemo(
    () => contarVisoes(linhas, semContrato),
    [linhas, semContrato]
  );
  const visiveis = useMemo(
    () => ordenar(filtrarLinhas(linhas, { q, visao }), visao),
    [linhas, q, visao]
  );
  const visiveisSem = useMemo(
    () => ordenarSemContrato(filtrarSemContrato(semContrato, q)),
    [semContrato, q]
  );

  function rodar(acao: () => Promise<Resultado>, sucesso?: string) {
    iniciar(async () => {
      const r = await acao();
      if (r && "error" in r && r.error) {
        setAviso(r.error);
        setFeito(null);
      } else {
        setAviso(null);
        setFeito(sucesso ?? null);
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1
          style={{
            margin: 0,
            font: `600 24px/1.2 ${T.titulo}`,
            letterSpacing: "-0.02em",
            color: "var(--tinta)",
          }}
        >
          Contratos
        </h1>
        <p style={{ margin: "4px 0 0", font: `400 13px/1.5 ${T.ui}`, color: "var(--cinza)" }}>
          {escopoEvento
            ? "Do pedido à conferência, neste evento."
            : "Do pedido à conferência, em todos os eventos."}
        </p>
      </div>

      {/* busca + visões */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 38,
            minWidth: 220,
            flex: "1 1 220px",
            maxWidth: 360,
            padding: "0 12px",
            borderRadius: 10,
            background: "var(--papel)",
            border: "1px solid var(--cinza-2)",
          }}
        >
          <Search size={15} color="var(--cinza-3)" strokeWidth={1.75} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="fornecedor, evento, arquivo"
            style={{
              flex: 1,
              minWidth: 0,
              border: 0,
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: "var(--tinta)",
            }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Limpar busca"
              style={{ border: 0, background: "transparent", cursor: "pointer", display: "flex" }}
            >
              <X size={14} color="var(--cinza-3)" />
            </button>
          )}
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ORDEM_VISOES.map((v) => {
            const ativo = visao === v;
            return (
              <button
                key={v}
                onClick={() => {
                  setVisao(v);
                  setAberto(null);
                }}
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 999,
                  cursor: "pointer",
                  border: `1px solid ${ativo ? "var(--tinta)" : "var(--cinza-2)"}`,
                  background: ativo ? "var(--tinta)" : "var(--papel)",
                  color: ativo ? "var(--marfim)" : "var(--cinza)",
                  font: `500 12.5px/1 ${T.ui}`,
                }}
              >
                {VISAO_LABELS[v]}
                <span
                  style={{
                    marginLeft: 6,
                    font: `500 11px/1 ${T.mono}`,
                    opacity: 0.75,
                  }}
                >
                  {contagens[v]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {aviso && (
        <p style={{ margin: 0, font: `400 13px/1.4 ${T.ui}`, color: "#b4231f" }}>{aviso}</p>
      )}
      {feito && !aviso && (
        <p style={{ margin: 0, font: `400 13px/1.4 ${T.ui}`, color: "var(--tinta)" }}>{feito}</p>
      )}

      {/* a lista */}
      {visao === "sem_contrato" ? (
        <ListaSemContrato
          linhas={visiveisSem}
          escopoEvento={escopoEvento}
          podeEscrever={podeEscrever}
          pendente={pendente}
          rodar={rodar}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {visiveis.length === 0 && (
            <p style={{ margin: 0, font: `400 13px/1.5 ${T.ui}`, color: "var(--cinza-3)" }}>
              {q.trim()
                ? "Nada com essa busca nesta visão."
                : visao === "conferencia"
                  ? "Nenhum contrato esperando conferência."
                  : visao === "cobrancas"
                    ? "Nenhuma cobrança em aberto."
                    : "Nenhum contrato conferido ainda."}
            </p>
          )}
          {visiveis.map((l) => (
            <LinhaContrato
              key={l.solicitacaoId}
              linha={l}
              hoje={hoje}
              visao={visao}
              escopoEvento={escopoEvento}
              aberto={aberto === l.solicitacaoId}
              aoAlternar={() =>
                setAberto(aberto === l.solicitacaoId ? null : l.solicitacaoId)
              }
              podeEscrever={podeEscrever}
              pendente={pendente}
              rodar={rodar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LinhaContrato({
  linha: l,
  hoje,
  visao,
  escopoEvento,
  aberto,
  aoAlternar,
  podeEscrever,
  pendente,
  rodar,
}: {
  linha: ContratoLinha;
  hoje: string;
  visao: VisaoContratos;
  escopoEvento: { id: string; nome: string } | null;
  aberto: boolean;
  aoAlternar: () => void;
  podeEscrever: boolean;
  pendente: boolean;
  rodar: (acao: () => Promise<Resultado>, sucesso?: string) => void;
}) {
  const [proposta, setProposta] = useState<{ id: string; payload: PropostaExtracao } | null>(
    l.extracao && l.extracao.status === "proposta"
      ? { id: l.extracao.id, payload: l.extracao.payload }
      : null
  );
  const inputArquivo = useRef<HTMLInputElement>(null);

  const frase =
    visao === "conferencia"
      ? fraseDaEspera(l, hoje)
      : visao === "cobrancas"
        ? fraseDaCobranca(l, hoje)
        : l.extracao
          ? resumoDoContrato(l.extracao)
          : "";

  function anexar(arquivo: File) {
    rodar(
      async () => {
        const prep = await prepararAnexoContrato(
          l.eventId,
          l.supplierId,
          arquivo.name,
          arquivo.type
        );
        if ("error" in prep) return prep;
        const envio = await enviarArquivo(prep.permissao, arquivo);
        if (!envio.ok) return { error: envio.erro };
        return confirmarAnexoContrato(
          l.eventId,
          prep.solicitacaoId,
          prep.permissao.caminho,
          arquivo.name
        );
      },
      arquivo.type === "application/pdf"
        ? "Contrato anexado — ele entra em Esperando conferência."
        : "Contrato anexado. A leitura automática só lê PDF — este fica disponível para abrir."
    );
  }

  return (
    <div
      style={{
        borderBottom: "1px solid var(--cinza-2)",
        padding: "10px 2px",
      }}
    >
      <button
        onClick={aoAlternar}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          gap: "4px 10px",
          width: "100%",
          border: 0,
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          padding: 0,
        }}
      >
        <span style={{ font: `600 14px/1.3 ${T.ui}`, color: "var(--tinta)" }}>
          {l.fornecedorNome}
        </span>
        {!escopoEvento && (
          <span style={{ font: `400 12.5px/1.3 ${T.ui}`, color: "var(--cinza)" }}>
            {l.eventoNome}
          </span>
        )}
        <span style={{ font: `400 11.5px/1.3 ${T.mono}`, color: "var(--cinza-3)" }}>
          {frase}
        </span>
        {visao === "conferidos" && l.extracao && (
          <span style={{ font: `400 11.5px/1.3 ${T.mono}`, color: "var(--cinza)" }}>
            {l.extracao.status === "descartada" ? "descartado" : resumoDoAplicado(l.extracao)}
          </span>
        )}
      </button>

      {aberto && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            {l.arquivo && (
              <a
                href={`/api/contrato?path=${encodeURIComponent(l.arquivo.path)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  font: `500 12.5px/1 ${T.ui}`,
                  color: "var(--tinta)",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Abrir {l.arquivo.nome}
              </a>
            )}
            {visao === "cobrancas" && podeEscrever && (
              <>
                <button
                  onClick={() =>
                    rodar(
                      () => cobrarDeNovo(l.supplierId),
                      "Cobrança na fila — a mensagem espera você em Solicitações."
                    )
                  }
                  disabled={pendente}
                  style={botaoLeve}
                >
                  Cobrar de novo
                </button>
                <button
                  onClick={() => inputArquivo.current?.click()}
                  disabled={pendente}
                  style={botaoLeve}
                >
                  Anexar o contrato
                </button>
              </>
            )}
            {visao === "conferencia" && l.arquivo && !l.arquivo.ehPdf && podeEscrever && (
              <button
                onClick={() =>
                  rodar(
                    () => arquivarContratoSemLeitura(l.eventId, l.solicitacaoId),
                    "Tirado da fila — o arquivo continua disponível para abrir."
                  )
                }
                disabled={pendente}
                style={botaoLeve}
              >
                Tirar da fila
              </button>
            )}
            {!escopoEvento && (
              <Link
                href={`/eventos/${l.eventId}/fornecedores`}
                style={{ font: `400 12px/1 ${T.ui}`, color: "var(--cinza-3)" }}
              >
                abrir o evento →
              </Link>
            )}
          </div>

          {visao === "conferencia" && l.arquivo && !l.arquivo.ehPdf && (
            <p style={{ margin: 0, font: `400 12.5px/1.4 ${T.ui}`, color: "var(--cinza)" }}>
              A leitura automática só lê PDF — abra o arquivo e lance à mão, ou
              tire-o da fila.
            </p>
          )}

          {visao === "conferencia" && l.arquivo?.ehPdf && podeEscrever && !proposta && (
            <FluxoLeituraContrato
              eventId={l.eventId}
              solicitacaoId={l.solicitacaoId}
              arquivoPath={l.arquivo.path}
              aoProposta={(id, payload) => setProposta({ id, payload })}
            />
          )}

          {visao === "conferencia" && proposta && (
            <ConferenciaExtracao
              eventId={l.eventId}
              extracaoId={proposta.id}
              payload={proposta.payload}
              itemRoteiroTitulo={l.itemRoteiroTitulo}
              aoFechar={() => setProposta(null)}
            />
          )}

          {visao === "conferidos" && l.extracao && (
            <p style={{ margin: 0, font: `400 12.5px/1.5 ${T.ui}`, color: "var(--cinza)" }}>
              Lido: {resumoDoContrato(l.extracao)}.{" "}
              {l.extracao.status === "conferida"
                ? `Aplicado: ${resumoDoAplicado(l.extracao).replace(/^aplicou /, "")}.`
                : "Nada foi aplicado (descartado)."}
            </p>
          )}

          <input
            ref={inputArquivo}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) anexar(f);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ListaSemContrato({
  linhas,
  escopoEvento,
  podeEscrever,
  pendente,
  rodar,
}: {
  linhas: SemContratoLinha[];
  escopoEvento: { id: string; nome: string } | null;
  podeEscrever: boolean;
  pendente: boolean;
  rodar: (acao: () => Promise<Resultado>, sucesso?: string) => void;
}) {
  if (linhas.length === 0) {
    return (
      <p style={{ margin: 0, font: `400 13px/1.5 ${T.ui}`, color: "var(--cinza-3)" }}>
        Todo fornecedor de evento confirmado tem contrato pedido ou recebido.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {linhas.map((l) => (
        <div
          key={`${l.eventId}|${l.supplierId}`}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: "4px 10px",
            borderBottom: "1px solid var(--cinza-2)",
            padding: "10px 2px",
          }}
        >
          <span style={{ font: `600 14px/1.3 ${T.ui}`, color: "var(--tinta)" }}>
            {l.fornecedorNome}
          </span>
          {!escopoEvento && (
            <span style={{ font: `400 12.5px/1.3 ${T.ui}`, color: "var(--cinza)" }}>
              {l.eventoNome}
            </span>
          )}
          <span style={{ font: `400 11.5px/1.3 ${T.mono}`, color: "var(--cinza-3)" }}>
            evento em {l.eventoData.slice(8, 10)}/{l.eventoData.slice(5, 7)}
          </span>
          {podeEscrever && (
            <button
              onClick={() =>
                rodar(
                  () => pedirAoFornecedor(l.eventId, l.supplierId, "contrato"),
                  "Pedido criado — se o fornecedor tem e-mail, já saiu."
                )
              }
              disabled={pendente}
              style={{ ...botaoLeve, marginLeft: "auto" }}
            >
              Pedir ao fornecedor
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

const botaoLeve: React.CSSProperties = {
  height: 30,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--cinza-2)",
  background: "var(--papel)",
  color: "var(--tinta)",
  font: `500 12.5px/1 ${T.ui}`,
  cursor: "pointer",
};
