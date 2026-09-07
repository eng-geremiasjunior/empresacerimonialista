// Execucao — a landing de /planos, traduzida do desenho.
//
// A execucao — 11s: o horario muda e o link do fornecedor muda junto;
// a recepcao conta 148, 151, 154.
//
// Nada aqui e dinamico: e argumento, nao dado. O que vem do banco (preco,
// tetos, degraus da promocao) mora na propria pagina.

export function Execucao() {
  return (
    <>
      {" "}
      {/* ============ 6 · EXECUÇÃO ============ */}
      <section style={{ maxWidth: "1080px", margin: "clamp(56px,7vw,88px) auto 0", padding: "0 clamp(20px,4vw,28px)" }}>
        <span style={{ display: "block", margin: "0 0 10px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#6E3F5F" }}>
          07 · Execução
        </span>
        <h2 style={{ margin: "0 0 14px", maxWidth: "28ch", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(24px,3.4vw,36px)", lineHeight: "1.13", letterSpacing: "-0.03em", textWrap: "pretty" }}>
          O evento acontecendo, com você olhando ou não.
        </h2>
        <p style={{ margin: "0", maxWidth: "62ch", fontSize: "16.5px", lineHeight: "1.6", color: "#6B6259" }}>
          O cronograma que veio dos contratos vira o roteiro do dia. Cada fornecedor recebe um link com a parte dele, que acompanha qualquer mudança de horário — sem senha e sem aplicativo. Sua equipe registra o que já aconteceu; a recepção conta quem entrou.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(258px,1fr))", gap: "clamp(20px,3vw,28px)", marginTop: "clamp(28px,3.5vw,40px)" }} data-stack="1">
          <div style={{ border: "1px solid #E6E0D8", borderRadius: "14px", background: "#FFFFFF", padding: "18px" }}>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
              Roteiro · link do fornecedor
            </p>
            <p style={{ margin: "0 0 12px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "15px", letterSpacing: "-0.01em", color: "#221E1B" }}>
              Buffet Aurora
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "34px", padding: "0 11px", borderRadius: "8px", background: "#F2EEE9" }}>
                <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "13px", color: "#221E1B", flex: "none", width: "42px" }}>
                  14:00
                </b>
                <span style={{ fontSize: "13.5px", color: "#3D3835" }}>
                  Montagem do salão
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "34px", padding: "0 11px", borderRadius: "8px", background: "#F3EBF0", outline: "1px solid #B98FAC" }}>
                <b style={{ display: "inline-grid", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "13px", color: "#221E1B", flex: "none", width: "42px" }}>
                  <span data-anim="1" style={{ gridArea: "1/1", animation: "ea 11s cubic-bezier(.2,.8,.3,1) infinite" }}>
                    17:30
                  </span>
                  <span data-anim="1" style={{ gridArea: "1/1", opacity: "0", animation: "eb 11s cubic-bezier(.2,.8,.3,1) infinite" }}>
                    16:30
                  </span>
                </b>
                <span style={{ fontSize: "13.5px", color: "#3D3835" }}>
                  Entrada do buffet
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "34px", padding: "0 11px", borderRadius: "8px", background: "#F2EEE9" }}>
                <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "13px", color: "#221E1B", flex: "none", width: "42px" }}>
                  20:15
                </b>
                <span style={{ fontSize: "13.5px", color: "#3D3835" }}>
                  Jantar servido
                </span>
              </div>
            </div>
            <span data-anim="1" style={{ display: "inline-flex", alignItems: "center", marginTop: "12px", padding: "6px 11px", borderRadius: "8px", background: "#E9EFE5", fontWeight: "500", fontSize: "12px", color: "#4A5A42", opacity: "0", animation: "etoast 11s cubic-bezier(.2,.8,.3,1) infinite" }}>
              Link do Buffet Aurora atualizado
            </span>
            <p style={{ margin: "12px 0 0", fontSize: "13.5px", lineHeight: "1.55", color: "#928A81" }}>
              Você muda o horário uma vez. O link dele muda junto.
            </p>
          </div>
          <div style={{ border: "1px solid #E6E0D8", borderRadius: "14px", background: "#FFFFFF", padding: "18px", display: "flex", flexDirection: "column" }}>
            <p style={{ margin: "0 0 12px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
              Recepção · entrada
            </p>
            <div style={{ flex: "1", display: "flex", flexDirection: "column", justifyContent: "center", gap: "12px", padding: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ display: "inline-grid", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "clamp(36px,5vw,46px)", lineHeight: "1", letterSpacing: "-0.03em", color: "#221E1B" }}>
                  <span data-anim="1" style={{ gridArea: "1/1", animation: "eq1 11s cubic-bezier(.2,.8,.3,1) infinite" }}>
                    148
                  </span>
                  <span data-anim="1" style={{ gridArea: "1/1", opacity: "0", animation: "eq2 11s cubic-bezier(.2,.8,.3,1) infinite" }}>
                    151
                  </span>
                  <span data-anim="1" style={{ gridArea: "1/1", opacity: "0", animation: "eq3 11s cubic-bezier(.2,.8,.3,1) infinite" }}>
                    154
                  </span>
                </span>
                <span style={{ fontSize: "13.5px", color: "#6B6259" }}>
                  de 180 confirmados
                </span>
              </div>
              <span style={{ display: "block", height: "8px", borderRadius: "999px", background: "#EFEAE3", overflow: "hidden" }}>
                <i data-anim="1" style={{ display: "block", height: "100%", width: "86%", borderRadius: "999px", background: "#6E7F63", animation: "eqb 11s cubic-bezier(.2,.8,.3,1) infinite" }}>
                </i>
              </span>
            </div>
            <p style={{ margin: "0", fontSize: "13.5px", lineHeight: "1.55", color: "#928A81" }}>
              Quando o buffet perguntar quantos entraram, o número é número.
            </p>
          </div>
          <div style={{ border: "1px solid #E6E0D8", borderRadius: "14px", background: "#221E1B", padding: "18px", display: "flex", flexDirection: "column" }}>
            <p style={{ margin: "0 0 12px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#A9A29A" }}>
              Modo Evento
            </p>
            <div style={{ flex: "1", display: "flex", flexDirection: "column", justifyContent: "center", gap: "10px" }}>
              <p style={{ margin: "0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "12px", color: "#A9A29A" }}>
                agora · 19:00
              </p>
              <p style={{ margin: "0", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(19px,2.6vw,24px)", lineHeight: "1.2", letterSpacing: "-0.02em", color: "#FAF8F5" }}>
                Cerimônia
              </p>
              <p style={{ margin: "6px 0 0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "12px", color: "#A9A29A" }}>
                em seguida · 20:15
              </p>
              <p style={{ margin: "0", fontSize: "14.5px", color: "#E6E0D8" }}>
                Jantar servido · Buffet Aurora
              </p>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: "13.5px", lineHeight: "1.55", color: "#A9A29A" }}>
              O que é agora e o que vem depois, legível no escuro do salão.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
