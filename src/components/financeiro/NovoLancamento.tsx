"use client";

// Lançar entrada ou saída.
//
// O campo que não existia em lugar nenhum e muda o sentido do número: de
// ONDE sai o dinheiro. Se sai do caixa que ela administra, abate o saldo
// em mãos e entra na conta de chamada de capital. Se a cliente paga
// direto, ela só acompanha.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { InputMoeda } from "@/components/ui/InputMoeda";
import {
  criarLancamento,
  type NovoLancamentoInput,
} from "@/app/(app)/eventos/[id]/financeiro/lancamento-actions";
import { hojeBR } from "@/lib/tempo";

const campo: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  height: 40,
  padding: "0 10px",
  border: "1px solid var(--linha)",
  borderRadius: 10,
  background: "var(--papel)",
  fontSize: 15,
  color: "var(--tinta)",
};

export function NovoLancamento({
  eventId,
  fornecedores,
  onFechar,
}: {
  eventId: string;
  fornecedores: { id: string; name: string }[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [f, setF] = useState<NovoLancamentoInput>({
    direcao: "saida",
    descricao: "",
    valor: 0,
    vencimento: hojeBR(),
    supplierId: null,
    objetivoId: null,
    tipo: "parcela",
    origem: "cliente_direto",
    jaPago: false,
    parcelas: 1,
  });
  const [valorTexto, setValorTexto] = useState("");

  const saida = f.direcao === "saida";

  function salvar() {
    setErro(null);
    const valor = Number(valorTexto.replace(/\./g, "").replace(",", "."));
    iniciar(async () => {
      const r = await criarLancamento(eventId, { ...f, valor });
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      onFechar();
      router.refresh();
    });
  }

  return (
    <>
      <div
        onClick={onFechar}
        role="presentation"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(34,30,27,.28)",
          zIndex: 60,
        }}
      />
      <aside
        className="fin"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 460,
          maxWidth: "96vw",
          background: "var(--papel)",
          boxShadow: "-8px 0 40px rgba(34,30,27,.12)",
          zIndex: 61,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--linha)" }}>
          <h2 className="fin-h2">Novo lançamento</h2>
        </div>

        <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(
              [
                ["saida", "Pagar a fornecedor"],
                ["entrada", "Receber"],
              ] as const
            ).map(([v, r]) => (
              <button
                key={v}
                type="button"
                className="fin-btn"
                style={{
                  flex: 1,
                  background: f.direcao === v ? "var(--nevoa)" : "var(--papel)",
                  borderColor: f.direcao === v ? "var(--cinza-2)" : "var(--linha)",
                }}
                onClick={() => setF({ ...f, direcao: v })}
              >
                {r}
              </button>
            ))}
          </div>

          <label>
            <span className="fin-rotulo">O que é</span>
            <input
              style={campo}
              placeholder={saida ? "Ex.: sinal do buffet" : "Ex.: 2ª parcela da assessoria"}
              value={f.descricao}
              onChange={(e) => setF({ ...f, descricao: e.target.value })}
              autoFocus
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <span className="fin-rotulo">Valor total</span>
              <InputMoeda
                className="fin-mono"
                style={campo}
                valor={valorTexto}
                onChange={setValorTexto}
              />
            </label>
            <label>
              <span className="fin-rotulo">
                {f.parcelas > 1 ? "1º vencimento" : "Vencimento"}
              </span>
              <input
                type="date"
                className="fin-mono"
                style={campo}
                value={f.vencimento}
                onChange={(e) => setF({ ...f, vencimento: e.target.value })}
              />
            </label>
          </div>

          {saida && (
            <label>
              <span className="fin-rotulo">Fornecedor</span>
              <select
                style={campo}
                value={f.supplierId ?? ""}
                onChange={(e) =>
                  setF({ ...f, supplierId: e.target.value || null })
                }
              >
                <option value="">Sem fornecedor</option>
                {fornecedores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <span className="fin-rotulo">Tipo</span>
              <select
                style={campo}
                value={f.tipo}
                onChange={(e) =>
                  setF({ ...f, tipo: e.target.value as NovoLancamentoInput["tipo"] })
                }
              >
                <option value="sinal">Sinal</option>
                <option value="parcela">Parcela</option>
                <option value="saldo">Saldo final</option>
                <option value="extra">Extra</option>
                {!saida && <option value="entrada">Entrada</option>}
              </select>
            </label>
            <label>
              <span className="fin-rotulo">Dividir em</span>
              <select
                style={campo}
                value={f.parcelas}
                onChange={(e) => setF({ ...f, parcelas: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "à vista" : `${n}x mensais`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {saida && (
            <div>
              <span className="fin-rotulo">De onde sai o dinheiro</span>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {(
                  [
                    ["cliente_direto", "A cliente paga direto"],
                    ["caixa", "Sai do meu caixa"],
                  ] as const
                ).map(([v, r]) => (
                  <button
                    key={v}
                    type="button"
                    className="fin-btn"
                    style={{
                      flex: 1,
                      fontSize: 13,
                      background: f.origem === v ? "var(--nevoa)" : "var(--papel)",
                      borderColor: f.origem === v ? "var(--cinza-2)" : "var(--linha)",
                    }}
                    onClick={() => setF({ ...f, origem: v })}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color:
                    f.origem === "caixa" && !f.supplierId
                      ? "var(--state-wait)"
                      : "var(--cinza)",
                }}
              >
                {f.origem === "caixa"
                  ? f.supplierId
                    ? "Abate o saldo que você administra e entra no aviso de pedir dinheiro à cliente."
                    : "Escolha o fornecedor acima: sem ele, isso vira custo seu, não saída da verba do evento."
                  : "Você acompanha o vencimento, mas o dinheiro não passa por você."}
              </p>
            </div>
          )}

          {f.parcelas === 1 && (
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={f.jaPago}
                onChange={(e) => setF({ ...f, jaPago: e.target.checked })}
              />
              <span style={{ fontSize: 14 }}>
                {saida ? "Já foi pago" : "Já foi recebido"}
              </span>
            </label>
          )}

          {erro && (
            <p style={{ fontSize: 13, color: "var(--state-late)" }}>{erro}</p>
          )}
        </div>

        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--linha)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button type="button" className="fin-btn" onClick={onFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="fin-btn fin-btn-primario"
            disabled={pendente || !f.descricao.trim() || !valorTexto.trim()}
            onClick={salvar}
          >
            {pendente ? "Salvando…" : "Lançar"}
          </button>
        </div>
      </aside>
    </>
  );
}
