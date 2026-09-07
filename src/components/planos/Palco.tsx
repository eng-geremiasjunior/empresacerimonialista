// Palco — a landing de /planos, traduzida do desenho.
//
// O palco do problema — 15s. A frase e digitada palavra por palavra
// (recorte tw + cursor cr) e so entao os fragmentos entram.
//
// Nada aqui e dinamico: e argumento, nao dado. O que vem do banco (preco,
// tetos, degraus da promocao) mora na propria pagina.

export function Palco() {
  return (
    <>
      {" "}
      {/* ============ 2 · O PROBLEMA ============ */}
      {/* A pergunta grande cercada dos lugares onde a informação está
               espalhada hoje. Os fragmentos não são o nosso sistema: são o
               WhatsApp, a planilha, o PDF, a agenda. Por isso a seção seguinte,
               com UMA janela, funciona como resposta. */}
      <section data-palco="1" style={{ position: "relative", marginTop: "clamp(56px,7vw,88px)", padding: "clamp(64px,9vw,104px) 0", background: "linear-gradient(180deg,#0D0812 0%,#150C1F 32%,#2C1152 66%,#4A1D8C 100%)", overflow: "hidden", minHeight: "clamp(480px,56vw,600px)", display: "flex", alignItems: "center" }}>
        <div aria-hidden="true" data-anim="1" style={{ position: "absolute", left: "50%", bottom: "-40%", width: "min(1500px,150%)", height: "150%", transform: "translateX(-50%)", background: "radial-gradient(50% 50% at 50% 50%,rgba(180,110,252,.9) 0%,rgba(139,72,242,.55) 28%,rgba(88,38,160,.22) 56%,rgba(13,8,18,0) 80%)", zIndex: "0", pointerEvents: "none", animation: "brilhoPalco 15s ease-in-out infinite" }}>
        </div>
        <div aria-hidden="true" data-anim="1" data-frag-wrap="1" style={{ position: "absolute", inset: "0", zIndex: "1", pointerEvents: "none", animation: "fragEntra 15s cubic-bezier(.2,.8,.3,1) infinite" }}>
          <div data-frag-sm="1" data-anim="1" style={{ position: "absolute", left: "1%", top: "7%", width: "min(260px,26vw)", padding: "11px 13px", borderRadius: "12px", background: "#2A2522", color: "#E7E5E4", fontSize: "12.5px", lineHeight: "1.45", opacity: ".5", filter: "blur(.6px)", zIndex: "1", transform: "rotate(-4deg)", animation: "dv1 23s ease-in-out infinite alternate" }}>
            {" "}A cerimônia é 19h, a gente queria 220 pessoas{" "}
            <span style={{ display: "block", marginTop: "5px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", color: "#A8A29E" }}>
              22:41
            </span>
          </div>
          <div data-frag-sm="1" data-anim="1" style={{ position: "absolute", right: "3%", top: "5%", width: "min(320px,32vw)", borderRadius: "12px", background: "#FFFFFF", overflow: "hidden", opacity: ".82", zIndex: "3", transform: "rotate(3deg)", animation: "dv2 27s ease-in-out infinite alternate" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "1px", background: "#E7E5E4", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px" }}>
              <span style={{ padding: "6px 8px", background: "#F5F5F4", color: "#78716C" }}>
                FORNECEDOR
              </span>
              <span style={{ padding: "6px 8px", background: "#F5F5F4", color: "#78716C" }}>
                VALOR
              </span>
              <span style={{ padding: "6px 8px", background: "#F5F5F4", color: "#78716C" }}>
                PAGO?
              </span>
              <span style={{ padding: "6px 8px", background: "#FFFFFF", color: "#292524" }}>
                Buffet Aurora
              </span>
              <span style={{ padding: "6px 8px", background: "#FFFFFF", color: "#292524" }}>
                19.800
              </span>
              <span style={{ padding: "6px 8px", background: "#FFFFFF", color: "#292524" }}>
                50%
              </span>
              <span style={{ padding: "6px 8px", background: "#FFFFFF", color: "#292524" }}>
                Flor &amp; Casa
              </span>
              <span style={{ padding: "6px 8px", background: "#FFFFFF", color: "#292524" }}>
                11.300
              </span>
              <span style={{ padding: "6px 8px", background: "#FFFFFF", color: "#A8A29E" }}>
                ?
              </span>
              <span style={{ padding: "6px 8px", background: "#FFFFFF", color: "#292524" }}>
                Estúdio Norte
              </span>
              <span style={{ padding: "6px 8px", background: "#FFFFFF", color: "#292524" }}>
                7.400
              </span>
              <span style={{ padding: "6px 8px", background: "#FFFFFF", color: "#292524" }}>
                sim
              </span>
            </div>
          </div>
          <div data-frag-sm="1" data-anim="1" style={{ position: "absolute", left: "-5%", top: "40%", width: "min(230px,22vw)", padding: "12px 14px", borderRadius: "12px", background: "#FFFFFF", opacity: ".26", filter: "blur(1.6px)", zIndex: "1", transform: "rotate(-6deg)", animation: "dv5 21s ease-in-out infinite alternate" }}>
            <p style={{ margin: "0 0 6px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10px", letterSpacing: ".06em", textTransform: "uppercase", color: "#A8A29E" }}>
              E-mail
            </p>
            <p style={{ margin: "0", fontWeight: "600", fontSize: "12.5px", color: "#1C1917" }}>
              Re: Orçamento decoração
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "11.5px", lineHeight: "1.45", color: "#78716C" }}>
              Segue revisado com as 22 mesas…
            </p>
          </div>
          <div data-frag-sm="1" data-anim="1" style={{ position: "absolute", right: "-4%", top: "36%", width: "min(190px,19vw)", padding: "12px 14px", borderRadius: "12px", background: "#FFFFFF", opacity: ".27", filter: "blur(1.6px)", zIndex: "1", transform: "rotate(4deg)", animation: "dv6 25s ease-in-out infinite alternate" }}>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10px", letterSpacing: ".06em", textTransform: "uppercase", color: "#A8A29E" }}>
              Anotação
            </p>
            <p style={{ margin: "0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "12.5px", lineHeight: "1.7", color: "#292524" }}>
              250 cadeiras
              <br />
              600 doces
              <br />
              bolo 220
            </p>
          </div>
          <div data-frag-sm="1" data-anim="1" style={{ position: "absolute", left: "9%", bottom: "8%", width: "min(250px,26vw)", padding: "13px 15px", borderRadius: "12px", background: "#FFFFFF", opacity: ".78", zIndex: "3", transform: "rotate(2deg)", animation: "dv3 29s ease-in-out infinite alternate" }}>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10px", letterSpacing: ".06em", textTransform: "uppercase", color: "#A8A29E" }}>
              Contrato · PDF
            </p>
            <p style={{ margin: "0", fontWeight: "600", fontSize: "12.5px", lineHeight: "1.4", color: "#1C1917" }}>
              Buffet Aurora — 220 pessoas
            </p>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "3px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#57534E" }}>
              <span>
                1ª parcela · 10/01 · 6.600
              </span>
              <span>
                2ª parcela · 10/02 · 6.600
              </span>
              <span>
                entrada no salão · 16:30
              </span>
            </div>
          </div>
          <div data-frag-sm="1" data-anim="1" style={{ position: "absolute", right: "6%", bottom: "9%", width: "min(214px,22vw)", padding: "13px 15px", borderRadius: "12px", background: "#FFFFFF", opacity: ".85", zIndex: "3", transform: "rotate(-3deg)", animation: "dv4 24s ease-in-out infinite alternate" }}>
            <p style={{ margin: "0 0 9px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10px", letterSpacing: ".06em", textTransform: "uppercase", color: "#A8A29E" }}>
              Março
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "3px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", color: "#78716C", textAlign: "center" }}>
              <span>
                9
              </span>
              <span>
                10
              </span>
              <span>
                11
              </span>
              <span>
                12
              </span>
              <span>
                13
              </span>
              <span style={{ borderRadius: "999px", background: "#1C1917", color: "#FAF8F5", padding: "1px 0" }}>
                14
              </span>
              <span>
                15
              </span>
            </div>
            <p style={{ margin: "9px 0 0", fontSize: "11.5px", lineHeight: "1.4", color: "#57534E" }}>
              Marina e Téo · Villa Real
            </p>
          </div>
          <div data-frag-sm="1" data-anim="1" style={{ position: "absolute", left: "36%", bottom: "4%", width: "min(208px,22vw)", padding: "11px 13px", borderRadius: "12px", background: "#2A2522", opacity: ".62", zIndex: "2", transform: "rotate(-2deg)", animation: "dv7 26s ease-in-out infinite alternate" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "16px" }}>
                <i style={{ width: "2px", height: "6px", borderRadius: "2px", background: "#A8A29E", display: "block" }}>
                </i>
                <i style={{ width: "2px", height: "13px", borderRadius: "2px", background: "#A8A29E", display: "block" }}>
                </i>
                <i style={{ width: "2px", height: "9px", borderRadius: "2px", background: "#A8A29E", display: "block" }}>
                </i>
                <i style={{ width: "2px", height: "16px", borderRadius: "2px", background: "#A8A29E", display: "block" }}>
                </i>
                <i style={{ width: "2px", height: "7px", borderRadius: "2px", background: "#A8A29E", display: "block" }}>
                </i>
                <i style={{ width: "2px", height: "11px", borderRadius: "2px", background: "#A8A29E", display: "block" }}>
                </i>
                <i style={{ width: "2px", height: "5px", borderRadius: "2px", background: "#A8A29E", display: "block" }}>
                </i>
                <i style={{ width: "2px", height: "14px", borderRadius: "2px", background: "#A8A29E", display: "block" }}>
                </i>
                <i style={{ width: "2px", height: "8px", borderRadius: "2px", background: "#A8A29E", display: "block" }}>
                </i>
              </span>
              <span style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#E7E5E4" }}>
                2:14
              </span>
            </div>
            <p style={{ margin: "7px 0 0", fontSize: "11.5px", lineHeight: "1.4", color: "#A8A29E" }}>
              Áudio da cliente · quinta-feira
            </p>
          </div>
        </div>
        <div data-palco-t="1" style={{ position: "relative", zIndex: "2", maxWidth: "1080px", margin: "0 auto", padding: "0 clamp(20px,4vw,28px)", width: "100%", textAlign: "center" }}>
          <h2 data-anim="1" style={{ margin: "0 auto", maxWidth: "18ch", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "700", fontSize: "clamp(30px,5.8vw,62px)", lineHeight: "1.06", letterSpacing: "-0.04em", color: "#FAF8F5", textWrap: "balance", animation: "textoPalco 15s linear infinite" }}>
            <span style={{ display: "inline-block", position: "relative" }}>
              <span data-anim="1" style={{ display: "inline-block", clipPath: "inset(-15% -2% -20% 0)", animation: "tw1 15s steps(7,end) infinite" }}>
                Quantos
              </span>
              <i data-anim="1" style={{ position: "absolute", top: "12%", right: "-.16em", width: ".05em", height: ".8em", background: "#F0E4FE", opacity: "0", animation: "cr1 15s steps(1,end) infinite" }}>
              </i>
            </span>
            {" "}
            <span style={{ display: "inline-block", position: "relative" }}>
              <span data-anim="1" style={{ display: "inline-block", clipPath: "inset(-15% -2% -20% 0)", animation: "tw2 15s steps(7,end) infinite" }}>
                lugares
              </span>
              <i data-anim="1" style={{ position: "absolute", top: "12%", right: "-.16em", width: ".05em", height: ".8em", background: "#F0E4FE", opacity: "0", animation: "cr2 15s steps(1,end) infinite" }}>
              </i>
            </span>
            {" "}
            <span style={{ display: "inline-block", position: "relative" }}>
              <span data-anim="1" style={{ display: "inline-block", clipPath: "inset(-15% -2% -20% 0)", animation: "tw3 15s steps(5,end) infinite" }}>
                você
              </span>
              <i data-anim="1" style={{ position: "absolute", top: "12%", right: "-.16em", width: ".05em", height: ".8em", background: "#F0E4FE", opacity: "0", animation: "cr3 15s steps(1,end) infinite" }}>
              </i>
            </span>
            {" "}
            <span style={{ display: "inline-block", position: "relative" }}>
              <span data-anim="1" style={{ display: "inline-block", clipPath: "inset(-15% -2% -20% 0)", animation: "tw4 15s steps(8,end) infinite" }}>
                consulta
              </span>
              <i data-anim="1" style={{ position: "absolute", top: "12%", right: "-.16em", width: ".05em", height: ".8em", background: "#F0E4FE", opacity: "0", animation: "cr4 15s steps(1,end) infinite" }}>
              </i>
            </span>
            {" "}
            <span style={{ display: "inline-block", position: "relative" }}>
              <span data-anim="1" style={{ display: "inline-block", clipPath: "inset(-15% -2% -20% 0)", animation: "tw5 15s steps(4,end) infinite" }}>
                para
              </span>
              <i data-anim="1" style={{ position: "absolute", top: "12%", right: "-.16em", width: ".05em", height: ".8em", background: "#F0E4FE", opacity: "0", animation: "cr5 15s steps(1,end) infinite" }}>
              </i>
            </span>
            {" "}
            <span style={{ display: "inline-block", position: "relative" }}>
              <span data-anim="1" style={{ display: "inline-block", clipPath: "inset(-15% -2% -20% 0)", animation: "tw6 15s steps(5,end) infinite" }}>
                saber
              </span>
              <i data-anim="1" style={{ position: "absolute", top: "12%", right: "-.16em", width: ".05em", height: ".8em", background: "#F0E4FE", opacity: "0", animation: "cr6 15s steps(1,end) infinite" }}>
              </i>
            </span>
            {" "}
            <span style={{ display: "inline-block", position: "relative", color: "#C9AEFA" }}>
              <span data-anim="1" style={{ display: "inline-block", clipPath: "inset(-15% -2% -20% 0)", animation: "tw7 15s steps(4,end) infinite" }}>
                como
              </span>
              <i data-anim="1" style={{ position: "absolute", top: "12%", right: "-.16em", width: ".05em", height: ".8em", background: "#F0E4FE", opacity: "0", animation: "cr7 15s steps(1,end) infinite" }}>
              </i>
            </span>
            {" "}
            <span style={{ display: "inline-block", position: "relative", color: "#C9AEFA" }}>
              <span data-anim="1" style={{ display: "inline-block", clipPath: "inset(-15% -2% -20% 0)", animation: "tw8 15s steps(4,end) infinite" }}>
                está
              </span>
              <i data-anim="1" style={{ position: "absolute", top: "12%", right: "-.16em", width: ".05em", height: ".8em", background: "#F0E4FE", opacity: "0", animation: "cr8 15s steps(1,end) infinite" }}>
              </i>
            </span>
            {" "}
            <span style={{ display: "inline-block", position: "relative", color: "#C9AEFA" }}>
              <span data-anim="1" style={{ display: "inline-block", clipPath: "inset(-15% -2% -20% 0)", animation: "tw9 15s steps(2,end) infinite" }}>
                um
              </span>
              <i data-anim="1" style={{ position: "absolute", top: "12%", right: "-.16em", width: ".05em", height: ".8em", background: "#F0E4FE", opacity: "0", animation: "cr9 15s steps(1,end) infinite" }}>
              </i>
            </span>
            {" "}
            <span style={{ display: "inline-block", position: "relative", color: "#C9AEFA" }}>
              <span data-anim="1" style={{ display: "inline-block", clipPath: "inset(-15% -2% -20% 0)", animation: "tw10 15s steps(7,end) infinite" }}>
                evento?
              </span>
              <i data-anim="1" style={{ position: "absolute", top: "12%", right: "-.16em", width: ".05em", height: ".8em", background: "#F0E4FE", opacity: "0", animation: "cr10 15s steps(1,end) infinite" }}>
              </i>
            </span>
          </h2>
          <p data-anim="1" style={{ margin: "22px auto 0", maxWidth: "52ch", fontSize: "clamp(15px,1.8vw,17px)", lineHeight: "1.6", color: "#D6D3D1", textWrap: "pretty", animation: "subPalco 15s cubic-bezier(.2,.8,.3,1) infinite" }}>
            A informação existe — só não está em lugar nenhum ao mesmo tempo. E a responsabilidade de lembrar de tudo continua sendo sua.
          </p>
        </div>
      </section>
      <section style={{ maxWidth: "1080px", margin: "clamp(52px,6.5vw,80px) auto 0", padding: "0 clamp(20px,4vw,28px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(28px,4vw,52px)" }} data-stack="1">
          <div>
            <h2 style={{ margin: "0 0 14px", maxWidth: "26ch", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(23px,3.2vw,34px)", lineHeight: "1.15", letterSpacing: "-0.028em", textWrap: "pretty" }}>
              Você não precisa de mais uma planilha. Precisa saber o que está acontecendo com cada evento.
            </h2>
            <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.6", color: "#6B6259", maxWidth: "50ch" }}>
              Enquanto a resposta depende de abrir seis lugares, toda pergunta simples custa meia hora — e nenhuma delas é sobre organizar a festa.
            </p>
          </div>
          <ul style={{ listStyle: "none", margin: "0", padding: "0", borderTop: "1px solid #E6E0D8", alignSelf: "start" }}>
            <li style={{ padding: "14px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
              O fornecedor confirmou?
            </li>
            <li style={{ padding: "14px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
              O pagamento está em dia?
            </li>
            <li style={{ padding: "14px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
              Quantos convidados confirmaram?
            </li>
            <li style={{ padding: "14px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
              O que ainda falta contratar?
            </li>
            <li style={{ padding: "14px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
              A cliente já respondeu?
            </li>
            <li style={{ padding: "14px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
              Quanto esse evento vai custar, e quanto você vai ganhar?
            </li>
            <li style={{ padding: "14px 0", borderBottom: "1px solid #E6E0D8", fontSize: "15.5px", lineHeight: "1.5", color: "#3D3835" }}>
              O que está acontecendo enquanto você não está no local?
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
