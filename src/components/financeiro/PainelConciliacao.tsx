"use client";

// Conciliação por extrato bancário.
//
// Um upload do OFX resolve o mês inteiro: o sistema casa por valor e
// data e mostra os candidatos. Ela confirma — pela mesma razão do
// comprovante, nada é marcado como pago sozinho, nem quando o valor
// bate exatamente.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { money, fmtData } from "@/lib/financeiro-core";
import { lerExtrato, somenteSaidas } from "@/lib/extrato-parser";
import {
  conciliar,
  ignorarLinhaExtrato,
  importarExtrato,
} from "@/app/(app)/eventos/[id]/financeiro/lancamento-actions";

type LinhaPendente = {
  id: string;
  data: string;
  valor: number;
  descricao: string | null;
  candidatos: {
    id: string;
    descricao: string;
    valor: number;
    vencimento: string;
    fornecedor: string | null;
    evento: string;
    distancia: number;
  }[];
};

export function PainelConciliacao({
  eventId,
  pendentes,
}: {
  eventId: string;
  pendentes: LinhaPendente[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(pendentes.length > 0);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);

  async function importar(file: File) {
    setErro(null);
    setAviso(null);
    setLendo(true);
    try {
      const texto = await file.text();
      const todas = lerExtrato(file.name, texto);
      if (todas.length === 0) {
        setErro(
          "Não consegui ler esse arquivo. Baixe o extrato em OFX pelo app do banco — é o formato que traz o identificador de cada transação."
        );
        return;
      }
      // só as saídas: é o que casa com pagamento a fornecedor
      const saidas = somenteSaidas(todas);
      if (saidas.length === 0) {
        setErro("O arquivo só tem entradas; nada a conciliar com pagamentos.");
        return;
      }
      const r = await importarExtrato(
        eventId,
        file.name,
        saidas.map((l) => ({ ...l, valor: Math.abs(l.valor) }))
      );
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setAviso(
        `${r.importadas} lançamento(s) do extrato` +
          (r.repetidas ? ` · ${r.repetidas} já estavam aqui` : "")
      );
      router.refresh();
    } finally {
      setLendo(false);
    }
  }

  return (
    <div className="fin-card">
      <div className="fin-card-topo">
        <div>
          <p className="fin-rotulo">Conciliação</p>
          <h2 className="fin-h2">Importar extrato do banco</h2>
        </div>
        {!aberto && (
          <button type="button" className="fin-btn" onClick={() => setAberto(true)}>
            Importar
          </button>
        )}
      </div>

      {!aberto ? (
        <p style={{ fontSize: 14, color: "var(--cinza)" }}>
          Um arquivo resolve o mês inteiro: o sistema procura o lançamento de
          cada saída e você confirma.
        </p>
      ) : (
        <>
          <label
            style={{
              display: "block",
              border: "1px dashed var(--cinza-2)",
              borderRadius: 14,
              background: "var(--nevoa)",
              padding: "24px",
              textAlign: "center",
              cursor: "pointer",
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) importar(f);
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--tinta)" }}>
              {lendo ? "Lendo o arquivo…" : "Arraste o extrato aqui"}
            </span>
            <span
              className="fin-mono"
              style={{
                display: "block",
                marginTop: 6,
                fontSize: 12,
                color: "var(--cinza)",
              }}
            >
              ofx (recomendado) ou csv · baixe pelo app do banco
            </span>
            <input
              type="file"
              accept=".ofx,.csv,.txt,text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importar(f);
              }}
            />
          </label>

          {erro && (
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--state-late)" }}>
              {erro}
            </p>
          )}
          {aviso && (
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--state-ok)" }}>
              {aviso}
            </p>
          )}

          {pendentes.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <p className="fin-rotulo" style={{ marginBottom: 8 }}>
                {pendentes.length} saída(s) do extrato sem lançamento
              </p>
              {pendentes.map((l) => (
                <div
                  key={l.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid var(--linha)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "baseline",
                      gap: 10,
                    }}
                  >
                    <span className="fin-mono" style={{ fontSize: 13, color: "var(--cinza)" }}>
                      {fmtData(l.data)}
                    </span>
                    <span
                      className="fin-mono"
                      style={{ fontSize: 15, color: "var(--tinta)" }}
                    >
                      {money(l.valor)}
                    </span>
                    <span style={{ flex: 1, minWidth: 120, fontSize: 13 }}>
                      {l.descricao}
                    </span>
                    <button
                      type="button"
                      className="fin-link"
                      onClick={() =>
                        iniciar(async () => {
                          await ignorarLinhaExtrato(eventId, l.id);
                          router.refresh();
                        })
                      }
                    >
                      não é do evento
                    </button>
                  </div>

                  {l.candidatos.length === 0 ? (
                    <p style={{ marginTop: 6, fontSize: 12, color: "var(--cinza)" }}>
                      Nenhum lançamento em aberto com esse valor e data. Lance
                      manualmente se for do evento.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {l.candidatos.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="fin-btn"
                          disabled={pendente}
                          style={{ fontSize: 13, minHeight: 36 }}
                          onClick={() =>
                            iniciar(async () => {
                              await conciliar(eventId, l.id, c.id);
                              router.refresh();
                            })
                          }
                          title={`vence ${fmtData(c.vencimento)}`}
                        >
                          {[c.fornecedor, c.descricao].filter(Boolean).join(" · ")}
                          {c.distancia > 0 && ` (${c.distancia}d)`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
