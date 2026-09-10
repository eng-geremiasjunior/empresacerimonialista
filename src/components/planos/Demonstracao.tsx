// Demonstracao — a landing de /planos, traduzida do desenho.
//
// A demonstracao do briefing virando evento — 28s, tres cenas, cursor e clique.
// Tudo em CSS: os quadros de @keyframes vivem no <style> da pagina.
//
// Nada aqui e dinamico: e argumento, nao dado. O que vem do banco (preco,
// tetos, degraus da promocao) mora na propria pagina.

export function Demonstracao() {
  return (
    <>
      {" "}
      {/* a demonstração: o briefing virando evento */}
      {/* Sem borda em cima e sem margem: a janela do sistema continua o
          mesmo fundo do cabeçalho e do título, e o topo da página vira um
          bloco só. A linha de baixo é a única — ela fecha o bloco. */}
      <section style={{ paddingBottom: "clamp(52px,6vw,72px)", background: "#F2EEE9", borderBottom: "1px solid #E6E0D8" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "clamp(36px,4.5vw,52px) clamp(20px,4vw,28px) 0" }}>
          <div style={{ maxWidth: "944px", margin: "0 auto", border: "1px solid #E6E0D8", borderRadius: "14px", background: "#FFFFFF", overflow: "hidden", boxShadow: "0 1px 2px rgba(34,30,27,.04),0 14px 34px rgba(34,30,27,.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "38px", padding: "0 12px", background: "#F2EEE9", borderBottom: "1px solid #E6E0D8" }}>
              <span style={{ display: "flex", gap: "6px", flex: "none" }}>
                <i style={{ width: "9px", height: "9px", borderRadius: "999px", background: "#D9D2C8", display: "block" }}>
                </i>
                <i style={{ width: "9px", height: "9px", borderRadius: "999px", background: "#D9D2C8", display: "block" }}>
                </i>
                <i style={{ width: "9px", height: "9px", borderRadius: "999px", background: "#D9D2C8", display: "block" }}>
                </i>
              </span>
              <span style={{ flex: "1", display: "flex", alignItems: "center", height: "22px", padding: "0 10px", borderRadius: "6px", background: "#FFFFFF", border: "1px solid #E6E0D8", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11.5px", color: "#6B6259", overflow: "hidden", whiteSpace: "nowrap" }}>
                eorganizei.com.br
                <span style={{ color: "#221E1B", fontWeight: "500" }}>
                  /eventos/novo
                </span>
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,214px) minmax(0,1fr)", height: "clamp(380px,45vw,462px)", background: "#FAF8F5" }} data-stack="1" data-demo-quadro="1">
              <nav data-side="1" style={{ background: "#1C1917", display: "flex", flexDirection: "column", overflow: "hidden" }} aria-hidden="true">
                <span style={{ display: "flex", alignItems: "center", height: "50px", padding: "0 18px", flex: "none", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "16px", letterSpacing: "-0.03em", color: "#FFFFFF" }}>
                  e
                  <span style={{ color: "#B98FAC" }}>
                    organizei
                  </span>
                </span>
                <span style={{ flex: "1", display: "flex", flexDirection: "column", gap: "2px", padding: "0 10px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z">
                      </path>
                    </svg>
                    Dashboard{" "}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", background: "#292524", color: "#FFFFFF" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z">
                      </path>
                    </svg>
                    Eventos{" "}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z">
                      </path>
                    </svg>
                    Orçamentos{" "}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z">
                      </path>
                    </svg>
                    Clientes{" "}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M12 4.5a3 3 0 100 6 3 3 0 000-6zM4.5 20.25a7.5 7.5 0 0115 0M18 8.25a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z">
                      </path>
                    </svg>
                    Cerimonialistas
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12">
                      </path>
                    </svg>
                    Fornecedores{" "}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5">
                      </path>
                    </svg>
                    Solicitações{" "}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M6 2.25h9l4.5 4.5v15H6zM15 2.25v4.5h4.5M9 12h7.5M9 15.75h7.5">
                      </path>
                    </svg>
                    Contratos
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M6.75 3v2.25M17.25 3v2.25M3.75 5.25h16.5v15.75H3.75zM3.75 10.5h16.5M8.25 14.25h1.5M14.25 14.25h1.5">
                      </path>
                    </svg>
                    Agenda de Fornecedores
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                      </path>
                    </svg>
                    Tarefas{" "}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5">
                      </path>
                    </svg>
                    Calendário{" "}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z">
                      </path>
                    </svg>
                    Financeiro{" "}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25">
                      </path>
                    </svg>
                    Catálogo
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M2.25 8.25h19.5M2.25 6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75z">
                      </path>
                    </svg>
                    Assinatura
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM12 3v2.25M12 18.75V21M5.64 5.64l1.59 1.59M16.77 16.77l1.59 1.59M3 12h2.25M18.75 12H21M5.64 18.36l1.59-1.59M16.77 7.23l1.59-1.59">
                      </path>
                    </svg>
                    Configurações
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", height: "31px", padding: "0 10px", borderRadius: "8px", fontWeight: "500", fontSize: "12.5px", color: "#A8A29E" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px", flex: "none" }}>
                      <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z">
                      </path>
                    </svg>
                    Ajuda
                  </span>
                </span>
                <span style={{ flex: "none", padding: "11px 18px", borderTop: "1px solid #292524", fontSize: "10.5px", color: "#78716C", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  eorganizei@eorganizei.com.br
                </span>
              </nav>
              <div style={{ position: "relative", overflow: "hidden" }} aria-hidden="true">
                <div style={{ position: "absolute", top: "0", left: "0", right: "0", height: "48px", display: "flex", alignItems: "center", gap: "10px", padding: "0 16px", background: "#FFFFFF", borderBottom: "1px solid #E7E5E4", zIndex: "2" }}>
                  <span style={{ fontSize: "12.5px", color: "#78716C" }}>
                    Sábado, 14 de março de 2026
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px" }}>
                      <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0">
                      </path>
                    </svg>
                    <span style={{ width: "22px", height: "22px", borderRadius: "999px", background: "#E7E5E4" }}>
                    </span>
                    <span style={{ fontSize: "12px", color: "#57534E" }}>
                      marina@…
                    </span>
                  </span>
                </div>
                {/* cena 1: a conversa virando campos */}
                <div data-anim="1" data-cena-1="1" style={{ position: "absolute", top: "48px", left: "0", right: "0", bottom: "0", padding: "16px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,.92fr)", gap: "14px", background: "#FAF8F5", animation: "hs1 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: "0" }}>
                    <p style={{ margin: "0 0 8px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
                      Briefing · conversa com a cliente
                    </p>
                    <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "6px", padding: "11px", background: "#FFFFFF", border: "1px solid #E7E5E4", borderRadius: "12px", overflow: "hidden" }}>
                      <span style={{ alignSelf: "flex-start", maxWidth: "88%", padding: "7px 10px", borderRadius: "10px", background: "#F2EEE9", fontSize: "11.5px", lineHeight: "1.45", color: "#3D3835" }}>
                        Oi! Fechamos a data com o Villa Real, 14 de março
                      </span>
                      <span style={{ alignSelf: "flex-start", maxWidth: "88%", padding: "7px 10px", borderRadius: "10px", background: "#F2EEE9", fontSize: "11.5px", lineHeight: "1.45", color: "#3D3835" }}>
                        A cerimônia é 19h, a gente queria 220 pessoas
                      </span>
                      <span style={{ alignSelf: "flex-end", maxWidth: "88%", padding: "7px 10px", borderRadius: "10px", background: "#F3EBF0", fontSize: "11.5px", lineHeight: "1.45", color: "#3D3835" }}>
                        Perfeito. E o orçamento que vocês pensaram?
                      </span>
                      <span style={{ alignSelf: "flex-start", maxWidth: "88%", padding: "7px 10px", borderRadius: "10px", background: "#F2EEE9", fontSize: "11.5px", lineHeight: "1.45", color: "#3D3835" }}>
                        Uns 80 mil no total. Meu nome é Marina Alcântara, do Téo
                      </span>
                      <span style={{ alignSelf: "flex-start", maxWidth: "88%", padding: "7px 10px", borderRadius: "10px", background: "#F2EEE9", fontSize: "11.5px", lineHeight: "1.45", color: "#3D3835" }}>
                        Ah, e é em Campinas mesmo
                      </span>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", alignSelf: "flex-start", height: "30px", marginTop: "10px", padding: "0 12px", borderRadius: "8px", background: "#6E3F5F", color: "#FAF8F5", fontWeight: "600", fontSize: "12px" }}>
                      Estruturar briefing
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: "0" }}>
                    <p style={{ margin: "0 0 8px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
                      O que o sistema identificou
                    </p>
                    <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "6px", padding: "11px", background: "#FFFFFF", border: "1px solid #E7E5E4", borderRadius: "12px", position: "relative" }}>
                      <span data-anim="1" style={{ position: "absolute", left: "0", top: "0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#928A81", animation: "hlendo 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                        lendo a conversa…
                      </span>
                      <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", padding: "7px 10px", border: "1px solid #EFEAE3", borderRadius: "8px", animation: "hf1 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                        <em style={{ fontStyle: "normal", fontSize: "11px", color: "#928A81" }}>
                          Tipo
                        </em>
                        <b style={{ fontWeight: "500", fontSize: "12px", color: "#221E1B" }}>
                          Casamento
                        </b>
                      </span>
                      <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", padding: "7px 10px", border: "1px solid #EFEAE3", borderRadius: "8px", animation: "hf2 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                        <em style={{ fontStyle: "normal", fontSize: "11px", color: "#928A81" }}>
                          Data e horário
                        </em>
                        <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "12px", color: "#221E1B" }}>
                          14/03/2026 · 19:00
                        </b>
                      </span>
                      <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", padding: "7px 10px", border: "1px solid #EFEAE3", borderRadius: "8px", animation: "hf3 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                        <em style={{ fontStyle: "normal", fontSize: "11px", color: "#928A81" }}>
                          Local
                        </em>
                        <b style={{ fontWeight: "500", fontSize: "12px", color: "#221E1B" }}>
                          Espaço Villa Real · Campinas
                        </b>
                      </span>
                      <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", padding: "7px 10px", border: "1px solid #EFEAE3", borderRadius: "8px", animation: "hf4 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                        <em style={{ fontStyle: "normal", fontSize: "11px", color: "#928A81" }}>
                          Convidados
                        </em>
                        <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "12px", color: "#221E1B" }}>
                          220
                        </b>
                      </span>
                      <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", padding: "7px 10px", border: "1px solid #EFEAE3", borderRadius: "8px", animation: "hf5 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                        <em style={{ fontStyle: "normal", fontSize: "11px", color: "#928A81" }}>
                          Orçamento
                        </em>
                        <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "12px", color: "#221E1B" }}>
                          R$ 80.000,00
                        </b>
                      </span>
                      <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", padding: "7px 10px", border: "1px solid #EFEAE3", borderRadius: "8px", animation: "hf6 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                        <em style={{ fontStyle: "normal", fontSize: "11px", color: "#928A81" }}>
                          Cliente
                        </em>
                        <b style={{ fontWeight: "500", fontSize: "12px", color: "#221E1B" }}>
                          Marina Alcântara e Téo
                        </b>
                      </span>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", alignSelf: "flex-end", height: "30px", marginTop: "10px", padding: "0 12px", borderRadius: "8px", border: "1px solid #6E3F5F", color: "#6E3F5F", fontWeight: "600", fontSize: "12px" }}>
                      Criar evento
                    </span>
                  </div>
                </div>
                {/* cena 2: o evento em dados operacionais */}
                <div data-anim="1" data-scene="2" style={{ position: "absolute", top: "48px", left: "0", right: "0", bottom: "0", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "#FAF8F5", opacity: "0", animation: "hs2 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                  <div>
                    <p style={{ margin: "0", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "17px", letterSpacing: "-0.02em", color: "#221E1B" }}>
                      Casamento — Marina e Téo
                    </p>
                    <p style={{ margin: "3px 0 0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#928A81" }}>
                      14/03/2026 · Espaço Villa Real · 220 convidados · R$ 80.000,00
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid #EFEAE3" }}>
                    <span data-anim="1" style={{ padding: "0 2px 8px", borderBottom: "2px solid #6E3F5F", fontWeight: "600", fontSize: "12px", color: "#4A2A40", animation: "htabA 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                      Visão geral
                    </span>
                    <span data-hide-sm="1" style={{ padding: "0 2px 8px", borderBottom: "2px solid transparent", fontWeight: "500", fontSize: "12px", color: "#6B6259" }}>
                      Planejamento
                    </span>
                    <span data-hide-sm="1" style={{ padding: "0 2px 8px", borderBottom: "2px solid transparent", fontWeight: "500", fontSize: "12px", color: "#6B6259" }}>
                      Fornecedores
                    </span>
                    <span data-anim="1" style={{ padding: "0 2px 8px", borderBottom: "2px solid transparent", fontWeight: "500", fontSize: "12px", color: "#6B6259", animation: "htabF 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                      Financeiro
                    </span>
                    <span data-hide-sm="1" style={{ padding: "0 2px 8px", borderBottom: "2px solid transparent", fontWeight: "500", fontSize: "12px", color: "#6B6259" }}>
                      Roteiro
                    </span>
                  </div>
                  <p style={{ margin: "0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
                    O que o evento exige
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "8px" }}>
                    <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px", padding: "9px 11px", border: "1px solid #EFEAE3", borderRadius: "10px", fontSize: "12px", color: "#3D3835", animation: "hb1 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                      Buffet
                      <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", color: "#221E1B" }}>
                        220 pessoas
                      </b>
                    </span>
                    <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px", padding: "9px 11px", border: "1px solid #EFEAE3", borderRadius: "10px", fontSize: "12px", color: "#3D3835", animation: "hb2 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                      Doces
                      <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", color: "#221E1B" }}>
                        600 un.
                      </b>
                    </span>
                    <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px", padding: "9px 11px", border: "1px solid #EFEAE3", borderRadius: "10px", fontSize: "12px", color: "#3D3835", animation: "hb3 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                      Bolo
                      <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", color: "#221E1B" }}>
                        220 fatias
                      </b>
                    </span>
                    <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px", padding: "9px 11px", border: "1px solid #EFEAE3", borderRadius: "10px", fontSize: "12px", color: "#3D3835", animation: "hb4 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                      Cadeiras
                      <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", color: "#221E1B" }}>
                        250 un.
                      </b>
                    </span>
                    <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px", padding: "9px 11px", border: "1px solid #EFEAE3", borderRadius: "10px", fontSize: "12px", color: "#3D3835", animation: "hb5 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                      Fotografia
                      <b style={{ fontWeight: "500", color: "#221E1B" }}>
                        a contratar
                      </b>
                    </span>
                    <span data-anim="1" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px", padding: "9px 11px", border: "1px solid #EFEAE3", borderRadius: "10px", fontSize: "12px", color: "#3D3835", animation: "hb6 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                      Decoração
                      <b style={{ fontWeight: "500", color: "#221E1B" }}>
                        a contratar
                      </b>
                    </span>
                  </div>
                  <p style={{ margin: "auto 0 0", fontSize: "11.5px", lineHeight: "1.5", color: "#928A81" }}>
                    Cada número entra depois no que contratar, no que pedir ao fornecedor, no que pagar e no que conferir no dia.
                  </p>
                </div>
                {/* cena 3: o financeiro do mesmo evento */}
                <div data-anim="1" data-scene="3" style={{ position: "absolute", top: "48px", left: "0", right: "0", bottom: "0", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "#FAF8F5", opacity: "0", animation: "hs3 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                  <div>
                    <p style={{ margin: "0", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "17px", letterSpacing: "-0.02em", color: "#221E1B" }}>
                      Financeiro do evento
                    </p>
                    <p style={{ margin: "3px 0 0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#928A81" }}>
                      Casamento — Marina e Téo · contratado R$ 80.000,00
                    </p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(132px,1fr))", gap: "8px" }}>
                    <span data-anim="1" style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "10px 11px", border: "1px solid #EFEAE3", borderRadius: "10px", animation: "hc1 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                      <em style={{ fontStyle: "normal", fontSize: "10.5px", color: "#928A81" }}>
                        Cliente pagou
                      </em>
                      <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "16px", color: "#221E1B" }}>
                        R$ 50.000
                      </b>
                    </span>
                    <span data-anim="1" style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "10px 11px", border: "1px solid #EFEAE3", borderRadius: "10px", animation: "hc2 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                      <em style={{ fontStyle: "normal", fontSize: "10.5px", color: "#928A81" }}>
                        Fornecedores contratados
                      </em>
                      <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "16px", color: "#221E1B" }}>
                        R$ 43.500
                      </b>
                    </span>
                    <span data-anim="1" style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "10px 11px", border: "1px solid #EFEAE3", borderRadius: "10px", animation: "hc3 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                      <em style={{ fontStyle: "normal", fontSize: "10.5px", color: "#928A81" }}>
                        A pagar até a festa
                      </em>
                      <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "16px", color: "#221E1B" }}>
                        R$ 12.700
                      </b>
                    </span>
                  </div>
                  <div style={{ marginTop: "auto", padding: "12px 13px", border: "1px solid #E6E0D8", borderRadius: "10px", background: "#F2EEE9", display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
                    <span style={{ fontSize: "12px", color: "#3D3835" }}>
                      Resultado previsto do evento
                    </span>
                    <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "20px", letterSpacing: "-0.02em", color: "#221E1B", whiteSpace: "nowrap", marginLeft: "auto" }}>
                      R$ 32.300
                    </b>
                  </div>
                </div>
                <span data-anim="1" data-cursor="1" style={{ position: "absolute", left: "26%", top: "30%", width: "34px", height: "34px", margin: "-6px 0 0 -6px", borderRadius: "999px", background: "#6E3F5F", opacity: "0", zIndex: "5", pointerEvents: "none", animation: "hclick 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                </span>
                <svg data-anim="1" data-cursor="1" viewBox="0 0 24 24" aria-hidden="true" style={{ position: "absolute", left: "26%", top: "30%", width: "21px", height: "21px", zIndex: "6", pointerEvents: "none", filter: "drop-shadow(0 1px 2px rgba(34,30,27,.3))", animation: "hcur 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
                  <path d="M5 2.5 19 12l-6.2 1.1L9.8 19 5 2.5Z" fill="#221E1B" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round">
                  </path>
                </svg>
              </div>
            </div>
          </div>
          <div data-legenda-demo="1" style={{ position: "relative", height: "24px", marginTop: "18px" }} aria-hidden="true">
            <span data-anim="1" style={{ position: "absolute", left: "0", right: "0", textAlign: "center", fontSize: "13.5px", lineHeight: "1.5", color: "#6B6259", animation: "hp1 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
              A conversa com a cliente vira{" "}
              <b style={{ fontWeight: "600", color: "#221E1B" }}>
                um evento estruturado
              </b>
              .
            </span>
            <span data-anim="1" style={{ position: "absolute", left: "0", right: "0", textAlign: "center", fontSize: "13.5px", lineHeight: "1.5", color: "#6B6259", opacity: "0", animation: "hp2 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
              O evento passa a existir em{" "}
              <b style={{ fontWeight: "600", color: "#221E1B" }}>
                dados operacionais
              </b>
              , não em anotações.
            </span>
            <span data-anim="1" style={{ position: "absolute", left: "0", right: "0", textAlign: "center", fontSize: "13.5px", lineHeight: "1.5", color: "#6B6259", opacity: "0", animation: "hp3 28s cubic-bezier(.2,.8,.3,1) infinite" }}>
              E o dinheiro do evento nasce{" "}
              <b style={{ fontWeight: "600", color: "#221E1B" }}>
                da própria operação
              </b>
              .
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
