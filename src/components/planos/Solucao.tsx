// Solucao — a landing de /planos, traduzida do desenho.
//
// A solucao: a janela inclinada que respira (derivaJanela, 26s) e o que
// ela passa a responder sobre qualquer evento.
//
// Nada aqui e dinamico: e argumento, nao dado. O que vem do banco (preco,
// tetos, degraus da promocao) mora na propria pagina.

export function Solucao() {
  return (
    <>
      {" "}
      {/* ============ 3 · A SOLUÇÃO / POSICIONAMENTO ============ */}
      {/* A resposta ao palco anterior, na mesma linguagem: lá eram seis
               fragmentos espalhados no escuro; aqui é UMA janela, inclinada,
               com a tela real de um evento. O contraste é o argumento.
               Os números são os do print do sistema: Planejamento 0%,
               Organização 75%, 1 fornecedor a confirmar, 2/3 confirmados.
               Nada inventado — a página vende o que existe. */}
      <section data-palco="1" style={{ position: "relative", marginTop: "clamp(56px,7vw,88px)", padding: "clamp(56px,7vw,84px) 0 0", background: "linear-gradient(180deg,#0D0812 0%,#150C1F 30%,#2A1050 62%,#3F1878 100%)", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: "2", maxWidth: "1080px", margin: "0 auto", padding: "0 clamp(20px,4vw,28px)", textAlign: "center" }}>
          <h2 style={{ margin: "0 auto 16px", maxWidth: "20ch", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "700", fontSize: "clamp(28px,5vw,54px)", lineHeight: "1.04", letterSpacing: "-0.038em", color: "#FAF8F5", textWrap: "balance" }}>
            Não é uma lista de tarefas.{" "}
            <span style={{ color: "#C9AEFA" }}>
              É o controle do evento.
            </span>
          </h2>
          <p style={{ margin: "0 auto", maxWidth: "50ch", fontSize: "clamp(15px,1.8vw,17px)", lineHeight: "1.6", color: "#D6D3D1", textWrap: "pretty" }}>
            Um lugar só, com o evento inteiro dentro. Pare de procurar informação — comece a enxergar o evento.
          </p>
        </div>
        {/* o brilho é o que separa a janela do fundo; sem ele a tela escura
                 do app encosta no preto da seção e a inclinação desaparece */}
        <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "46%", width: "min(1200px,120%)", height: "560px", transform: "translate(-50%,0)", background: "radial-gradient(52% 50% at 50% 50%,rgba(168,85,247,.5) 0%,rgba(124,58,237,.2) 45%,rgba(13,8,18,0) 78%)", zIndex: "1", pointerEvents: "none" }}>
        </div>
        <div style={{ position: "relative", zIndex: "2", maxWidth: "1080px", margin: "clamp(36px,5vw,56px) auto 0", padding: "0 clamp(20px,4vw,28px)" }}>
          <div data-inclina="1" data-anim="1" style={{ transform: "perspective(1700px) rotateY(-12deg) rotateX(4.5deg) rotate(-1deg)", transformOrigin: "50% 100%", border: "1px solid #3B2F4A", borderTopColor: "#CBAEFB", borderLeftColor: "#8E6ACB", borderRadius: "14px", background: "#1C1917", overflow: "hidden", boxShadow: "0 0 0 1px rgba(203,174,251,.24),-14px -14px 46px -8px rgba(139,72,242,.85),0 0 82px 2px rgba(168,85,247,.5),0 34px 80px rgba(0,0,0,.55)", animation: "derivaJanela 26s ease-in-out infinite alternate" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "36px", padding: "0 12px", background: "#292524", borderBottom: "1px solid #44403C" }}>
              <span style={{ display: "flex", gap: "6px", flex: "none" }}>
                <i style={{ width: "9px", height: "9px", borderRadius: "999px", background: "#57534E", display: "block" }}>
                </i>
                <i style={{ width: "9px", height: "9px", borderRadius: "999px", background: "#57534E", display: "block" }}>
                </i>
                <i style={{ width: "9px", height: "9px", borderRadius: "999px", background: "#57534E", display: "block" }}>
                </i>
              </span>
              <span style={{ flex: "1", display: "flex", alignItems: "center", height: "21px", padding: "0 10px", borderRadius: "6px", background: "#1C1917", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#A8A29E", overflow: "hidden", whiteSpace: "nowrap" }}>
                eorganizei.com.br
                <span style={{ color: "#E7E5E4" }}>
                  /eventos/lya-e-jhon
                </span>
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,206px) minmax(0,1fr)", background: "#FAF8F5" }} data-stack="1">
              <nav data-side="1" style={{ background: "#1C1917", padding: "0 0 12px", display: "flex", flexDirection: "column" }} aria-hidden="true">
                <span style={{ display: "flex", alignItems: "center", height: "46px", padding: "0 16px", flex: "none", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "15px", letterSpacing: "-0.03em", color: "#FFFFFF" }}>
                  e
                  <span style={{ color: "#B98FAC" }}>
                    organizei
                  </span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "0 9px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z">
                      </path>
                    </svg>
                    Dashboard
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", background: "#292524", color: "#FFFFFF" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z">
                      </path>
                    </svg>
                    Eventos
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z">
                      </path>
                    </svg>
                    Orçamentos
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z">
                      </path>
                    </svg>
                    Clientes
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M12 4.5a3 3 0 100 6 3 3 0 000-6zM4.5 20.25a7.5 7.5 0 0115 0M18 8.25a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z">
                      </path>
                    </svg>
                    Cerimonialistas
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12">
                      </path>
                    </svg>
                    Fornecedores
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5">
                      </path>
                    </svg>
                    Solicitações
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M6 2.25h9l4.5 4.5v15H6zM15 2.25v4.5h4.5M9 12h7.5M9 15.75h7.5">
                      </path>
                    </svg>
                    Contratos
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M6.75 3v2.25M17.25 3v2.25M3.75 5.25h16.5v15.75H3.75zM3.75 10.5h16.5M8.25 14.25h1.5M14.25 14.25h1.5">
                      </path>
                    </svg>
                    Agenda de Fornecedores
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                      </path>
                    </svg>
                    Tarefas
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5">
                      </path>
                    </svg>
                    Calendário
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z">
                      </path>
                    </svg>
                    Financeiro
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25">
                      </path>
                    </svg>
                    Catálogo
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M2.25 8.25h19.5M2.25 6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75z">
                      </path>
                    </svg>
                    Assinatura
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM12 3v2.25M12 18.75V21M5.64 5.64l1.59 1.59M16.77 16.77l1.59 1.59M3 12h2.25M18.75 12H21M5.64 18.36l1.59-1.59M16.77 7.23l1.59-1.59">
                      </path>
                    </svg>
                    Configurações
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", height: "30px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", flex: "none" }}>
                      <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z">
                      </path>
                    </svg>
                    Ajuda
                  </span>
                </span>
              </nav>
              <div style={{ minWidth: "0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "44px", padding: "0 16px", background: "#FFFFFF", borderBottom: "1px solid #E7E5E4" }}>
                  <span style={{ fontSize: "12px", color: "#78716C" }}>
                    Segunda-feira, 7 de setembro de 2026
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ position: "relative", display: "block" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "15px", height: "15px", display: "block" }}>
                        <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0">
                        </path>
                      </svg>
                      <span style={{ position: "absolute", top: "-6px", right: "-8px", display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "15px", height: "13px", padding: "0 3px", borderRadius: "999px", background: "#B4342E", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "8.5px", fontWeight: "600", color: "#FFFFFF" }}>
                        9+
                      </span>
                    </span>
                    <span style={{ width: "20px", height: "20px", borderRadius: "999px", background: "#C9A88E", flex: "none" }}>
                    </span>
                    <span data-hide-sm="1" style={{ fontSize: "11.5px", color: "#57534E" }}>
                      eorganizei@eorganizei.com.br
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px", color: "#78716C" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", flex: "none" }}>
                        <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75">
                        </path>
                      </svg>
                      Sair
                    </span>
                  </span>
                </div>
                <div style={{ padding: "16px 18px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px", color: "#78716C" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", flex: "none" }}>
                        <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18">
                        </path>
                      </svg>
                      Voltar para eventos
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "20px", padding: "0 9px", borderRadius: "999px", background: "#E9EFE5", fontWeight: "500", fontSize: "11px", color: "#4A5A42" }}>
                      <i style={{ width: "5px", height: "5px", borderRadius: "999px", background: "#6E7F63", display: "block" }}>
                      </i>
                      Confirmado
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <span style={{ minWidth: "0" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <b style={{ fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "22px", letterSpacing: "-0.03em", color: "#1C1917" }}>
                          Lya e Jhon
                        </b>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", flex: "none" }}>
                          <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.128-1.897l8.934-8.931z">
                          </path>
                        </svg>
                      </span>
                      <span style={{ display: "block", marginTop: "3px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#A8A29E" }}>
                        29/04/2027 · Orla Bardot · Faltam 234 dias
                      </span>
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", flex: "none", height: "29px", padding: "0 12px", border: "1px solid #E7E5E4", borderRadius: "8px", background: "#FFFFFF", fontWeight: "500", fontSize: "11.5px", color: "#292524" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", flex: "none" }}>
                        <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z">
                        </path>
                      </svg>
                      Modo Evento
                    </span>
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", border: "1px solid #E7E5E4", borderRadius: "12px", background: "#FFFFFF", overflow: "hidden" }}>
                    <div style={{ padding: "13px 14px" }}>
                      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                        <b style={{ fontWeight: "600", fontSize: "12.5px", color: "#1C1917" }}>
                          Planejamento
                        </b>
                        <em style={{ fontStyle: "normal", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#A8A29E" }}>
                          0%
                        </em>
                      </span>
                      <p style={{ margin: "5px 0 0", fontSize: "11.5px", color: "#78716C" }}>
                        1 tarefa restante
                      </p>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "7px", padding: "3px 9px", border: "1px solid #F0E3CC", borderRadius: "999px", background: "#FDF8EF", fontSize: "11px", color: "#7C6127" }}>
                        <i style={{ width: "5px", height: "5px", borderRadius: "999px", background: "#A5813C", display: "block" }}>
                        </i>
                        7 respostas da cliente para conferir
                      </span>
                      <span style={{ display: "block", height: "4px", marginTop: "10px", borderRadius: "999px", background: "#F0EFED" }}>
                      </span>
                    </div>
                    <div style={{ padding: "13px 14px", borderLeft: "1px solid #F0EFED" }}>
                      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                        <b style={{ fontWeight: "600", fontSize: "12.5px", color: "#1C1917" }}>
                          Organização
                        </b>
                        <em style={{ fontStyle: "normal", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#A8A29E" }}>
                          75%
                        </em>
                      </span>
                      <p style={{ margin: "5px 0 0", fontSize: "11.5px", color: "#7C6127" }}>
                        1 fornecedor a confirmar
                      </p>
                      <span style={{ display: "block", height: "4px", marginTop: "10px", borderRadius: "999px", background: "#F0EFED", overflow: "hidden" }}>
                        <i style={{ display: "block", height: "100%", width: "75%", borderRadius: "999px", background: "#292524" }}>
                        </i>
                      </span>
                    </div>
                    <div style={{ padding: "13px 14px", borderLeft: "1px solid #F0EFED" }}>
                      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                        <b style={{ fontWeight: "600", fontSize: "12.5px", color: "#1C1917" }}>
                          Roteiro do dia
                        </b>
                        <em style={{ fontStyle: "normal", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#A8A29E" }}>
                          0%
                        </em>
                      </span>
                      <p style={{ margin: "5px 0 0", fontSize: "11.5px", color: "#78716C" }}>
                        Faltam 234 dias
                      </p>
                      <span style={{ display: "block", height: "4px", marginTop: "10px", borderRadius: "999px", background: "#F0EFED" }}>
                      </span>
                    </div>
                  </div>
                  <div style={{ border: "1px solid #E7E5E4", borderRadius: "12px", background: "#FFFFFF", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "11px 14px", borderBottom: "1px solid #F0EFED" }}>
                      <i style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#6E7F63", flex: "none" }}>
                      </i>
                      <b style={{ fontWeight: "600", fontSize: "12.5px", color: "#1C1917" }}>
                        Resumo do Copiloto
                      </b>
                      <span style={{ fontSize: "11.5px", color: "#78716C" }}>
                        Planejamento
                      </span>
                      <span data-hide-sm="1" style={{ marginLeft: "auto", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", color: "#A8A29E" }}>
                        cálculo por regras · 0% · 1 tarefa restante
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 14px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#44403C" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#A5813C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", flex: "none" }}>
                          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z">
                          </path>
                        </svg>
                        0 de 1 tarefa concluída
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#44403C" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#6E7F63" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", flex: "none" }}>
                          <path d="M4.5 12.75l6 6 9-13.5">
                          </path>
                        </svg>
                        Nenhuma tarefa vencida
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#44403C" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#A5813C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", flex: "none" }}>
                          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z">
                          </path>
                        </svg>
                        Checklist 0% concluído
                      </span>
                    </div>
                    <div style={{ padding: "10px 14px", borderTop: "1px solid #F0EFED" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "500", fontSize: "11.5px", color: "#292524" }}>
                        Abrir tarefas
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", flex: "none" }}>
                          <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3">
                          </path>
                        </svg>
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 13px", borderBottom: "1px solid #E7E5E4" }}>
                    <span style={{ padding: "0 1px 8px", borderBottom: "2px solid #292524", fontWeight: "600", fontSize: "11.5px", color: "#1C1917", whiteSpace: "nowrap" }}>
                      Resumo
                    </span>
                    <span style={{ padding: "0 1px 8px", fontWeight: "500", fontSize: "11.5px", color: "#78716C", whiteSpace: "nowrap" }}>
                      Operação
                    </span>
                    <span style={{ padding: "0 1px 8px", fontWeight: "500", fontSize: "11.5px", color: "#78716C", whiteSpace: "nowrap" }}>
                      Mesas
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", padding: "0 1px 8px", fontWeight: "500", fontSize: "11.5px", color: "#78716C", whiteSpace: "nowrap" }}>
                      Fornecedores
                      <i style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "14px", height: "14px", borderRadius: "999px", background: "#292524", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "9px", fontStyle: "normal", color: "#FFFFFF" }}>
                        1
                      </i>
                    </span>
                    <span data-hide-sm="1" style={{ padding: "0 1px 8px", fontWeight: "500", fontSize: "11.5px", color: "#78716C", whiteSpace: "nowrap" }}>
                      Contratos
                    </span>
                    <span data-hide-sm="1" style={{ padding: "0 1px 8px", fontWeight: "500", fontSize: "11.5px", color: "#78716C", whiteSpace: "nowrap" }}>
                      Comunicação
                    </span>
                    <span data-hide-sm="1" style={{ padding: "0 1px 8px", fontWeight: "500", fontSize: "11.5px", color: "#78716C", whiteSpace: "nowrap" }}>
                      Financeiro
                    </span>
                    <span data-hide-sm="1" style={{ padding: "0 1px 8px", fontWeight: "500", fontSize: "11.5px", color: "#78716C", whiteSpace: "nowrap" }}>
                      Área do cliente
                    </span>
                    <span data-hide-sm="1" style={{ padding: "0 1px 8px", fontWeight: "500", fontSize: "11.5px", color: "#78716C", whiteSpace: "nowrap" }}>
                      Histórico
                    </span>
                  </div>
                  <div>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <i style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#A5813C", flex: "none" }}>
                      </i>
                      <b style={{ fontWeight: "600", fontSize: "12.5px", color: "#1C1917" }}>
                        Requer atenção
                      </b>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "8px", fontSize: "12px", color: "#44403C" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#A5813C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", flex: "none" }}>
                          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z">
                          </path>
                        </svg>
                        Checklist 0% concluído
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#D6D3D1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", flex: "none" }}>
                        <path d="M8.25 4.5l7.5 7.5-7.5 7.5">
                        </path>
                      </svg>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "7px", fontSize: "12px", color: "#44403C" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#A5813C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", flex: "none" }}>
                          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z">
                          </path>
                        </svg>
                        1 fornecedor não confirmou
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#D6D3D1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", flex: "none" }}>
                        <path d="M8.25 4.5l7.5 7.5-7.5 7.5">
                        </path>
                      </svg>
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "9px" }}>
                    <div style={{ padding: "11px 12px", border: "1px solid #E7E5E4", borderRadius: "12px", background: "#FFFFFF" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#57534E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", flex: "none" }}>
                          <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z">
                          </path>
                        </svg>
                        <b style={{ fontWeight: "500", fontSize: "11.5px", color: "#44403C" }}>
                          Tarefas
                        </b>
                      </span>
                      <p style={{ margin: "8px 0 0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "20px", letterSpacing: "-0.02em", color: "#1C1917" }}>
                        0/1
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "#A8A29E" }}>
                        Concluídas
                      </p>
                    </div>
                    <div style={{ padding: "11px 12px", border: "1px solid #E7E5E4", borderRadius: "12px", background: "#FFFFFF" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#57534E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", flex: "none" }}>
                          <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5">
                          </path>
                        </svg>
                        <b style={{ fontWeight: "500", fontSize: "11.5px", color: "#44403C" }}>
                          Roteiro do dia
                        </b>
                      </span>
                      <p style={{ margin: "8px 0 0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "20px", letterSpacing: "-0.02em", color: "#1C1917" }}>
                        10
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "#A8A29E" }}>
                        Itens
                      </p>
                    </div>
                    <div style={{ padding: "11px 12px", border: "1px solid #E7E5E4", borderRadius: "12px", background: "#FFFFFF" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#57534E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", flex: "none" }}>
                          <path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.226a3 3 0 100-6 3 3 0 000 6zm10.5-3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z">
                          </path>
                        </svg>
                        <b style={{ fontWeight: "500", fontSize: "11.5px", color: "#44403C" }}>
                          Fornecedores
                        </b>
                      </span>
                      <p style={{ margin: "8px 0 0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "20px", letterSpacing: "-0.02em", color: "#1C1917" }}>
                        2/3
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "#A8A29E" }}>
                        Confirmados
                      </p>
                    </div>
                    <div style={{ padding: "11px 12px", border: "1px solid #E7E5E4", borderRadius: "12px", background: "#FFFFFF" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#57534E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", flex: "none" }}>
                          <path d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z">
                          </path>
                        </svg>
                        <b style={{ fontWeight: "500", fontSize: "11.5px", color: "#44403C" }}>
                          Mensagens
                        </b>
                      </span>
                      <p style={{ margin: "8px 0 0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "20px", letterSpacing: "-0.02em", color: "#1C1917" }}>
                        0
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "#A8A29E" }}>
                        Não lidas
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section style={{ padding: "clamp(52px,6vw,80px) 0", background: "#F2EEE9", borderBottom: "1px solid #E6E0D8" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 clamp(20px,4vw,28px)" }}>
          <h3 style={{ margin: "0 auto 6px", maxWidth: "40ch", textAlign: "center", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(20px,2.6vw,26px)", lineHeight: "1.2", letterSpacing: "-0.025em" }}>
            O que você passa a responder sobre qualquer evento
          </h3>
          <p style={{ margin: "0 auto", maxWidth: "48ch", textAlign: "center", fontSize: "15.5px", lineHeight: "1.55", color: "#6B6259", textWrap: "pretty" }}>
            Sem abrir seis lugares.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: "1px", marginTop: "clamp(28px,3.5vw,40px)", background: "#E6E0D8", border: "1px solid #E6E0D8", borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "22px", background: "#FFFFFF" }}>
              <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "16px", letterSpacing: "-0.01em" }}>
                O que foi combinado
              </h3>
              <p style={{ margin: "0", fontSize: "14.5px", lineHeight: "1.55", color: "#6B6259" }}>
                Briefing, decisões e as informações da cliente.
              </p>
            </div>
            <div style={{ padding: "22px", background: "#FFFFFF" }}>
              <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "16px", letterSpacing: "-0.01em" }}>
                O que precisa acontecer
              </h3>
              <p style={{ margin: "0", fontSize: "14.5px", lineHeight: "1.55", color: "#6B6259" }}>
                Prazos e responsáveis, saindo das decisões do evento.
              </p>
            </div>
            <div style={{ padding: "22px", background: "#FFFFFF" }}>
              <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "16px", letterSpacing: "-0.01em" }}>
                O que precisa ser confirmado
              </h3>
              <p style={{ margin: "0", fontSize: "14.5px", lineHeight: "1.55", color: "#6B6259" }}>
                Solicitações aos fornecedores e as respostas deles.
              </p>
            </div>
            <div style={{ padding: "22px", background: "#FFFFFF" }}>
              <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "16px", letterSpacing: "-0.01em" }}>
                O que foi contratado
              </h3>
              <p style={{ margin: "0", fontSize: "14.5px", lineHeight: "1.55", color: "#6B6259" }}>
                Serviços, quantidades, valores e contratos.
              </p>
            </div>
            <div style={{ padding: "22px", background: "#FFFFFF" }}>
              <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "16px", letterSpacing: "-0.01em" }}>
                O que já foi pago
              </h3>
              <p style={{ margin: "0", fontSize: "14.5px", lineHeight: "1.55", color: "#6B6259" }}>
                Parcelas, despesas e o saldo do evento.
              </p>
            </div>
            <div style={{ padding: "22px", background: "#FFFFFF" }}>
              <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "16px", letterSpacing: "-0.01em" }}>
                O que está acontecendo
              </h3>
              <p style={{ margin: "0", fontSize: "14.5px", lineHeight: "1.55", color: "#6B6259" }}>
                Cronograma, execução e atualizações dos fornecedores.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
