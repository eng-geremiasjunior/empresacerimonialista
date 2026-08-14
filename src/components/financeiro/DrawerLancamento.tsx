"use client";

// O drawer do lançamento e o fluxo do comprovante — quatro passos, um
// por vez: anexar → ler → conferir → pago.
//
// A decisão de produto que rege tudo aqui: NADA é marcado como pago sem
// o toque dela, nem quando o valor bate exatamente. O sistema lê, mostra
// o que leu, e espera.
//
// Nesta versão o passo de leitura é preenchimento assistido: ela anexa e
// digita valor e data. A conferência contra a parcela é a mesma, a tela
// de revisão é a mesma, e quando a leitura automática entrar ela só
// preenche esses dois campos antes — sem redesenho.

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  camposExtraidos,
  conferir,
  fmtData,
  money,
  moneyCentavos,
  normalizarComprovante,
  statusDe,
  type Lancamento,
} from "@/lib/financeiro-core";
import {
  confirmarPagamento,
  salvarComprovante,
} from "@/app/(app)/eventos/[id]/financeiro/comprovante-actions";

type Passo = "attach" | "reading" | "review" | "done";

export function DrawerLancamento({
  eventId,
  lancamento,
  hoje,
  cronograma,
  onFechar,
  onMudou,
}: {
  eventId: string;
  lancamento: Lancamento;
  hoje: string;
  cronograma: Lancamento[];
  onFechar: () => void;
  onMudou: () => void;
}) {
  const [passo, setPasso] = useState<Passo>(
    lancamento.pagoEm ? "done" : "attach"
  );
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [valor, setValor] = useState(String(lancamento.valor).replace(".", ","));
  const [data, setData] = useState(hoje);
  const [tipo, setTipo] = useState("PIX");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  const st = statusDe(lancamento, hoje);
  const entrada = lancamento.direcao === "entrada";

  const lido = normalizarComprovante({
    arquivo: arquivo?.name ?? null,
    valor: Number(valor.replace(/\./g, "").replace(",", ".")) || 0,
    data: data ? fmtData(data) : null,
    tipo,
    confianca: {},
  });
  const conf = conferir(lido, lancamento);
  const campos = camposExtraidos(lido, lancamento, conf);

  async function subir(file: File) {
    setErro(null);
    setOcupado(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const caminho = `${eventId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("comprovantes")
        .upload(caminho, file, { contentType: file.type, upsert: false });
      if (error) {
        setErro("Não foi possível enviar o arquivo.");
        return;
      }
      setArquivo(file);
      setPath(caminho);
      setPasso("reading");
      // sem leitura automática ainda: o passo existe para ela conferir o
      // arquivo e informar o que consta nele
      setTimeout(() => setPasso("review"), 400);
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar() {
    setErro(null);
    setOcupado(true);
    try {
      if (path && arquivo) {
        await salvarComprovante(eventId, lancamento.id, {
          path,
          nome: arquivo.name,
          dados: {
            valor: lido.valor,
            data: lido.data,
            tipo: lido.tipo,
            origem: "digitado",
          },
        });
      }
      const r = await confirmarPagamento(eventId, lancamento.id, {
        valor: lido.valor ?? lancamento.valor,
        data: conf.dataISO ?? hoje,
        forma: tipo.toLowerCase(),
      });
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setPasso("done");
      onMudou();
    } finally {
      setOcupado(false);
    }
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
          width: 480,
          maxWidth: "96vw",
          background: "var(--papel)",
          boxShadow: "-8px 0 40px rgba(34,30,27,.12)",
          zIndex: 61,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* cabeçalho */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--linha)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <p className="fin-rotulo">
                {lancamento.categoria} · {lancamento.fornecedor}
              </p>
              <h2 className="fin-h2">{lancamento.titulo}</h2>
            </div>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="fin-btn"
              style={{ minHeight: 32, padding: "0 10px" }}
            >
              ×
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 12,
            }}
          >
            <span
              className="fin-mono"
              style={{ fontSize: 20, color: "var(--tinta)" }}
            >
              {money(lancamento.valor)}
            </span>
            <span className={`fin-badge ${passo === "done" ? "ok" : st.tone}`}>
              {passo === "done" ? (entrada ? "Recebido" : "Pago") : st.status}
            </span>
            <span className="fin-mono" style={{ fontSize: 12, color: "var(--cinza)" }}>
              vence {fmtData(lancamento.vencimento)}
            </span>
          </div>
        </div>

        <div style={{ padding: 24, flex: 1 }}>
          {passo === "attach" && (
            <>
              <label
                style={{
                  display: "block",
                  border: "1px dashed var(--cinza-2)",
                  borderRadius: 14,
                  background: "var(--nevoa)",
                  padding: "36px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) subir(f);
                }}
              >
                <span
                  style={{ fontSize: 16, fontWeight: 600, color: "var(--tinta)" }}
                >
                  Arraste o PDF ou a imagem aqui
                </span>
                <span
                  className="fin-mono"
                  style={{
                    display: "block",
                    marginTop: 8,
                    fontSize: 12,
                    color: "var(--cinza)",
                  }}
                >
                  comprovante PIX, TED, boleto · pdf, jpg, png · até 10 MB
                </span>
                <span
                  className="fin-btn"
                  style={{ marginTop: 16, display: "inline-flex" }}
                >
                  Escolher arquivo
                </span>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) subir(f);
                  }}
                />
              </label>
              <button
                type="button"
                className="fin-link"
                style={{ marginTop: 16 }}
                onClick={() => setPasso("review")}
              >
                lançar o pagamento manualmente
              </button>
            </>
          )}

          {passo === "reading" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--tinta)" }}>
                Abrindo o comprovante…
              </p>
              <p
                className="fin-mono"
                style={{ marginTop: 8, fontSize: 12, color: "var(--cinza)" }}
              >
                {arquivo?.name}
              </p>
            </div>
          )}

          {passo === "review" && (
            <>
              <div
                style={{
                  background: "var(--ameixa-50)",
                  border: "1px solid var(--ameixa-300)",
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <p style={{ fontSize: 14, color: "var(--ameixa-800)" }}>
                  Confira antes de marcar como pago.
                </p>
                {arquivo && (
                  <p
                    className="fin-mono"
                    style={{ marginTop: 4, fontSize: 11, color: "var(--cinza-3)" }}
                  >
                    {arquivo.name} · {Math.round(arquivo.size / 1024)} KB
                  </p>
                )}
              </div>

              {/* os dois campos que a leitura automática vai preencher */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginTop: 18,
                }}
              >
                <label>
                  <span className="fin-rotulo">Valor no comprovante</span>
                  <input
                    className="fin-mono"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    inputMode="decimal"
                    style={campoStyle}
                  />
                </label>
                <label>
                  <span className="fin-rotulo">Data</span>
                  <input
                    type="date"
                    className="fin-mono"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    style={campoStyle}
                  />
                </label>
              </div>
              <label style={{ display: "block", marginTop: 12 }}>
                <span className="fin-rotulo">Forma</span>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  style={campoStyle}
                >
                  {["PIX", "TED", "Boleto", "Dinheiro", "Cartão"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>

              <div style={{ marginTop: 18 }}>
                {campos.slice(0, 2).map((c) => (
                  <div
                    key={c.label}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--linha)",
                    }}
                  >
                    <span className="fin-rotulo" style={{ width: 92, flex: "none" }}>
                      {c.label}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span
                        className="fin-mono"
                        style={{ fontSize: 15, color: "var(--tinta)" }}
                      >
                        {c.value}
                      </span>
                      {c.note && (
                        <span
                          className="fin-mono"
                          style={{
                            display: "block",
                            fontSize: 11,
                            color: "var(--cinza)",
                          }}
                        >
                          {c.note}
                        </span>
                      )}
                    </span>
                  </div>
                ))}

                {/* a linha da diferença muda de tom com o resultado */}
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 14px",
                    marginTop: 12,
                    borderRadius: 10,
                    background:
                      conf.tone === "ok"
                        ? "var(--state-ok-bg)"
                        : conf.tone === "late"
                          ? "var(--state-late-bg)"
                          : "var(--state-wait-bg)",
                  }}
                >
                  <span className="fin-rotulo" style={{ width: 92, flex: "none" }}>
                    Diferença
                  </span>
                  <span>
                    <span
                      className="fin-mono"
                      style={{ fontSize: 15, color: "var(--tinta)" }}
                    >
                      {moneyCentavos(conf.diferenca)}
                    </span>
                    <span
                      className="fin-mono"
                      style={{ display: "block", fontSize: 11, color: "var(--cinza-3)" }}
                    >
                      {conf.mensagem}
                    </span>
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <p className="fin-rotulo">Ao confirmar</p>
                <ul
                  style={{
                    margin: "8px 0 0",
                    paddingLeft: 18,
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "var(--cinza-3)",
                  }}
                >
                  <li>
                    a parcela passa a <strong>{entrada ? "Recebido" : "Pago"}</strong>{" "}
                    e sai da fila de vencimentos
                  </li>
                  {arquivo && <li>o comprovante fica anexado ao lançamento</li>}
                  <li>
                    {entrada
                      ? "o recebimento entra no contrato de assessoria"
                      : `a verba de ${lancamento.categoria} é abatida em ${money(lido.valor ?? 0)}`}
                  </li>
                </ul>
              </div>
            </>
          )}

          {passo === "done" && (
            <>
              <div
                style={{
                  background: "var(--state-ok-bg)",
                  borderRadius: 10,
                  padding: "14px 16px",
                }}
              >
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--state-ok)" }}>
                  {entrada ? "Recebimento confirmado" : "Pagamento confirmado"}
                </p>
                <p
                  className="fin-mono"
                  style={{ marginTop: 4, fontSize: 12, color: "var(--cinza-3)" }}
                >
                  {money(lancamento.valor)} ·{" "}
                  {fmtData(lancamento.pagoEm ?? conf.dataISO ?? hoje)}
                  {(lancamento.comprovante || arquivo) && " · comprovante anexado"}
                </p>
              </div>
            </>
          )}

          {erro && (
            <p style={{ marginTop: 14, fontSize: 13, color: "var(--state-late)" }}>
              {erro}
            </p>
          )}

          {/* cronograma do fornecedor — fixo em todos os passos */}
          {cronograma.length > 1 && (
            <div style={{ marginTop: 24 }}>
              <p className="fin-rotulo">Cronograma do fornecedor</p>
              <div style={{ marginTop: 8 }}>
                {cronograma.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background:
                        c.id === lancamento.id ? "var(--nevoa)" : "transparent",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--cinza-3)" }}>
                      {c.titulo}
                    </span>
                    <span
                      className="fin-mono"
                      style={{ fontSize: 12, color: "var(--cinza)" }}
                    >
                      {fmtData(c.vencimento)} · {money(c.valor)}
                      {c.pagoEm ? " · pago" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* rodapé */}
        {passo === "review" && (
          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid var(--linha)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ flex: 1, fontSize: 12, color: "var(--cinza)" }}>
              nada é marcado como pago sem sua confirmação
            </span>
            <button type="button" className="fin-btn" onClick={onFechar}>
              Fechar
            </button>
            <button
              type="button"
              className="fin-btn fin-btn-primario"
              disabled={ocupado}
              onClick={confirmar}
            >
              {ocupado ? "Salvando…" : "Confirmar e marcar pago"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

const campoStyle: React.CSSProperties = {
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
