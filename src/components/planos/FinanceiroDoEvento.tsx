// FinanceiroDoEvento — a landing de /planos, traduzida do desenho.
//
// O financeiro do evento — 14s: as tres barras crescem e o resultado
// previsto entra por ultimo.
//
// Nada aqui e dinamico: e argumento, nao dado. O que vem do banco (preco,
// tetos, degraus da promocao) mora na propria pagina.

export function FinanceiroDoEvento() {
  return (
    <>
      {" "}
      {/* ============ 5 · FINANCEIRO ============ */}
      <section style={{ marginTop: "clamp(56px,7vw,88px)", padding: "clamp(52px,6vw,80px) 0", background: "#F2EEE9", borderTop: "1px solid #E6E0D8", borderBottom: "1px solid #E6E0D8" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 clamp(20px,4vw,28px)" }}>
          <span style={{ display: "block", margin: "0 0 10px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#6E3F5F" }}>
            06 · Financeiro
          </span>
          <h2 style={{ margin: "0 0 14px", maxWidth: "28ch", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(24px,3.4vw,36px)", lineHeight: "1.13", letterSpacing: "-0.03em", textWrap: "pretty" }}>
            Um evento não é só uma agenda. É uma operação financeira.
          </h2>
          <p style={{ margin: "0 0 clamp(28px,3.5vw,40px)", maxWidth: "62ch", fontSize: "16.5px", lineHeight: "1.6", color: "#6B6259" }}>
            O financeiro não é um módulo separado: ele nasce do que foi contratado com a cliente e com cada fornecedor. Você não lança de novo o que já existe no evento.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(24px,3vw,32px)", alignItems: "start" }} data-stack="1">
            <div style={{ border: "1px solid #E6E0D8", borderRadius: "14px", background: "#FFFFFF", padding: "clamp(18px,2.5vw,24px)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", paddingBottom: "14px", borderBottom: "1px solid #EFEAE3" }}>
                <div>
                  <p style={{ margin: "0", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "16px", letterSpacing: "-0.01em", color: "#221E1B" }}>
                    Casamento — Marina e Téo
                  </p>
                  <p style={{ margin: "3px 0 0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11.5px", color: "#928A81" }}>
                    14/03/2026 · contratado com a cliente
                  </p>
                </div>
                <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "20px", letterSpacing: "-0.02em", color: "#221E1B", flex: "none" }}>
                  R$ 80.000
                </b>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "18px 0" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", color: "#3D3835" }}>
                      Cliente pagou
                    </span>
                    <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                      R$ 50.000
                    </b>
                  </div>
                  <span style={{ display: "block", height: "8px", borderRadius: "999px", background: "#EFEAE3", overflow: "hidden" }}>
                    <i data-anim="1" style={{ display: "block", height: "100%", width: "62.5%", borderRadius: "999px", background: "#6E7F63", animation: "fb1 14s cubic-bezier(.2,.8,.3,1) infinite" }}>
                    </i>
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", color: "#3D3835" }}>
                      Fornecedores contratados
                    </span>
                    <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                      R$ 43.500
                    </b>
                  </div>
                  <span style={{ display: "block", height: "8px", borderRadius: "999px", background: "#EFEAE3", overflow: "hidden" }}>
                    <i data-anim="1" style={{ display: "block", height: "100%", width: "54.4%", borderRadius: "999px", background: "#B4ADA4", animation: "fb2 14s cubic-bezier(.2,.8,.3,1) infinite" }}>
                    </i>
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", color: "#3D3835" }}>
                      Já pago aos fornecedores
                    </span>
                    <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                      R$ 35.000
                    </b>
                  </div>
                  <span style={{ display: "block", height: "8px", borderRadius: "999px", background: "#EFEAE3", overflow: "hidden" }}>
                    <i data-anim="1" style={{ display: "block", height: "100%", width: "43.8%", borderRadius: "999px", background: "#D9D2C8", animation: "fb3 14s cubic-bezier(.2,.8,.3,1) infinite" }}>
                    </i>
                  </span>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #EFEAE3" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "11px 0", borderBottom: "1px solid #EFEAE3" }}>
                  <span style={{ fontSize: "14px", color: "#3D3835" }}>
                    Despesas extras do evento
                  </span>
                  <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                    R$ 4.200
                  </b>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "11px 0" }}>
                  <span style={{ fontSize: "14px", color: "#3D3835" }}>
                    A pagar até a festa
                  </span>
                  <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                    R$ 12.700
                  </b>
                </div>
              </div>
              <div data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginTop: "16px", padding: "14px 16px", borderRadius: "10px", background: "#F2EEE9", animation: "fres 14s cubic-bezier(.2,.8,.3,1) infinite" }}>
                <span style={{ fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "15px", letterSpacing: "-0.01em", color: "#221E1B" }}>
                  Resultado previsto
                </span>
                <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "clamp(22px,3vw,26px)", letterSpacing: "-0.02em", color: "#221E1B" }}>
                  R$ 32.300
                </b>
              </div>
            </div>
            <div>
              <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "18px", letterSpacing: "-0.02em" }}>
                O que você passa a responder na hora
              </h3>
              <ul style={{ listStyle: "none", margin: "0", padding: "0", borderTop: "1px solid #E6E0D8" }}>
                <li style={{ padding: "13px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
                  Quanto foi contratado com a cliente, e quanto já entrou.
                </li>
                <li style={{ padding: "13px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
                  Quanto cada fornecedor representa no evento.
                </li>
                <li style={{ padding: "13px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
                  O que já foi pago e o que vence antes da festa.
                </li>
                <li style={{ padding: "13px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
                  Os custos que ninguém lança: ajudante, combustível, adiantamento.
                </li>
                <li style={{ padding: "13px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
                  Quanto o evento custou de verdade, e quanto ele deixou.
                </li>
              </ul>
              <p style={{ margin: "18px 0 0", fontSize: "15px", lineHeight: "1.6", color: "#6B6259", maxWidth: "44ch" }}>
                A prestação de contas da cliente sai do que já está lançado, sem montar nada no Word.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
