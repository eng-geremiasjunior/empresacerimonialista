// Cadeia — a landing de /planos, traduzida do desenho.
//
// A cadeia operacional: briefing, informacao, planejamento, contratacao,
// organizacao. Cada etapa alimenta a seguinte.
//
// Nada aqui e dinamico: e argumento, nao dado. O que vem do banco (preco,
// tetos, degraus da promocao) mora na propria pagina.

export function Cadeia() {
  return (
    <>
      {" "}
      {/* ============ 4 · A CADEIA ============ */}
      <section style={{ maxWidth: "1080px", margin: "clamp(56px,7vw,88px) auto 0", padding: "0 clamp(20px,4vw,28px)" }}>
        <span style={{ display: "block", margin: "0 0 10px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
          Um evento, do começo ao fim
        </span>
        <h2 style={{ margin: "0 0 14px", maxWidth: "30ch", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(23px,3.2vw,34px)", lineHeight: "1.15", letterSpacing: "-0.028em", textWrap: "pretty" }}>
          Cada etapa alimenta a seguinte. Nada é digitado duas vezes.
        </h2>
        <p style={{ margin: "0", maxWidth: "60ch", fontSize: "16.5px", lineHeight: "1.6", color: "#6B6259" }}>
          O briefing define as informações. As informações definem o que decidir. As decisões definem o que contratar. A contratação define o financeiro e o cronograma. O cronograma vira a execução.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(36px,4.5vw,52px)", marginTop: "clamp(36px,4.5vw,52px)" }}>
          {/* 01 briefing */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "clamp(24px,4vw,44px)", alignItems: "center", paddingTop: "28px", borderTop: "1px solid #E6E0D8" }} data-stack="1">
            <div>
              <span style={{ display: "block", margin: "0 0 8px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", color: "#6E3F5F" }}>
                01 · BRIEFING
              </span>
              <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(19px,2.3vw,23px)", lineHeight: "1.3", letterSpacing: "-0.02em", textWrap: "pretty" }}>
                Comece pela conversa que você já teve.
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: "16px", lineHeight: "1.6", color: "#6B6259", maxWidth: "46ch" }}>
                Cole a conversa com a cliente. O sistema identifica tipo de evento, data, horário, cidade, local, número de convidados, orçamento e os dados dela, e pré-preenche a criação do evento.
              </p>
              <p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#6B6259", maxWidth: "46ch" }}>
                Você confere e ajusta. Não digita a data que já está escrita em algum lugar.
              </p>
            </div>
            <div style={{ border: "1px solid #E6E0D8", borderRadius: "14px", background: "#FFFFFF", padding: "18px" }}>
              <p style={{ margin: "0 0 12px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
                Identificado na conversa
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ padding: "6px 11px", borderRadius: "6px", background: "#F2EEE9", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "12px", color: "#221E1B" }}>
                  14/03/2026
                </span>
                <span style={{ padding: "6px 11px", borderRadius: "6px", background: "#F2EEE9", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "12px", color: "#221E1B" }}>
                  19:00
                </span>
                <span style={{ padding: "6px 11px", borderRadius: "6px", background: "#F2EEE9", fontSize: "12px", color: "#221E1B" }}>
                  Casamento
                </span>
                <span style={{ padding: "6px 11px", borderRadius: "6px", background: "#F2EEE9", fontSize: "12px", color: "#221E1B" }}>
                  Espaço Villa Real
                </span>
                <span style={{ padding: "6px 11px", borderRadius: "6px", background: "#F2EEE9", fontSize: "12px", color: "#221E1B" }}>
                  Campinas
                </span>
                <span style={{ padding: "6px 11px", borderRadius: "6px", background: "#F2EEE9", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "12px", color: "#221E1B" }}>
                  220 convidados
                </span>
                <span style={{ padding: "6px 11px", borderRadius: "6px", background: "#F2EEE9", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "12px", color: "#221E1B" }}>
                  R$ 80.000,00
                </span>
                <span style={{ padding: "6px 11px", borderRadius: "6px", background: "#F2EEE9", fontSize: "12px", color: "#221E1B" }}>
                  Marina Alcântara
                </span>
              </div>
              <p style={{ margin: "14px 0 0", fontSize: "13.5px", lineHeight: "1.55", color: "#928A81" }}>
                Trinta mensagens de ida e volta viram a base do evento.
              </p>
            </div>
          </div>
          {/* 02 informação */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "clamp(24px,4vw,44px)", alignItems: "center", paddingTop: "28px", borderTop: "1px solid #E6E0D8" }} data-stack="1">
            <div>
              <span style={{ display: "block", margin: "0 0 8px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", color: "#6E3F5F" }}>
                02 · INFORMAÇÃO
              </span>
              <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(19px,2.3vw,23px)", lineHeight: "1.3", letterSpacing: "-0.02em", textWrap: "pretty" }}>
                O evento existe em números, não em anotações.
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: "16px", lineHeight: "1.6", color: "#6B6259", maxWidth: "46ch" }}>
                220 convidados significam buffet para 220, bolo para 220, 250 cadeiras, 600 doces. São dados operacionais do evento, não itens de uma lista.
              </p>
              <p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#6B6259", maxWidth: "46ch" }}>
                Cada um deles é usado depois: no que contratar, no que pedir ao fornecedor, no que pagar e no que conferir no dia.
              </p>
            </div>
            <div style={{ border: "1px solid #E6E0D8", borderRadius: "14px", background: "#FFFFFF", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
                <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                  Convidados
                </span>
                <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                  220
                </b>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
                <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                  Buffet
                </span>
                <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                  220 pessoas
                </b>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
                <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                  Bolo
                </span>
                <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                  220 fatias
                </b>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
                <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                  Doces
                </span>
                <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                  600 un.
                </b>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
                <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                  Cadeiras
                </span>
                <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                  250 un.
                </b>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "13px 18px" }}>
                <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                  Mesas de convidados
                </span>
                <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                  22
                </b>
              </div>
            </div>
          </div>
          {/* 03 planejamento */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "clamp(24px,4vw,44px)", alignItems: "center", paddingTop: "28px", borderTop: "1px solid #E6E0D8" }} data-stack="1">
            <div>
              <span style={{ display: "block", margin: "0 0 8px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", color: "#6E3F5F" }}>
                03 · PLANEJAMENTO
              </span>
              <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(19px,2.3vw,23px)", lineHeight: "1.3", letterSpacing: "-0.02em", textWrap: "pretty" }}>
                O que decidir, e até quando.
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: "16px", lineHeight: "1.6", color: "#6B6259", maxWidth: "46ch" }}>
                Cada tipo de evento — casamento, debutante, formatura, corporativo, show — tem decisões próprias, na ordem em que precisam ser tomadas.
              </p>
              <p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#6B6259", maxWidth: "46ch" }}>
                As tarefas nascem dessas decisões, com prazo e responsável. Você vê o que está decidido, o que está em aberto e o que já passou da hora.
              </p>
            </div>
            <div style={{ border: "1px solid #E6E0D8", borderRadius: "14px", background: "#FFFFFF", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
                <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                  Buffet e menu
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", height: "24px", padding: "0 10px", borderRadius: "999px", background: "#E9EFE5", fontWeight: "500", fontSize: "12px", color: "#4A5A42" }}>
                  decidido
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
                <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                  Fotografia e vídeo
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", height: "24px", padding: "0 10px", borderRadius: "999px", background: "#F5ECD9", fontWeight: "500", fontSize: "12px", color: "#7C6127" }}>
                  decidir até 20/01
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
                <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                  Paleta e decoração
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", height: "24px", padding: "0 10px", borderRadius: "999px", background: "#F5ECD9", fontWeight: "500", fontSize: "12px", color: "#7C6127" }}>
                  aguardando a cliente
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "13px 18px" }}>
                <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                  Lista de convidados
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", height: "24px", padding: "0 10px", borderRadius: "999px", background: "#F3E4E4", fontWeight: "500", fontSize: "12px", color: "#7A4A46" }}>
                  atrasado
                </span>
              </div>
            </div>
          </div>
          {/* 04 contratação */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "clamp(24px,4vw,44px)", alignItems: "center", paddingTop: "28px", borderTop: "1px solid #E6E0D8" }} data-stack="1">
            <div>
              <span style={{ display: "block", margin: "0 0 8px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", color: "#6E3F5F" }}>
                04 · CONTRATAÇÃO
              </span>
              <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(19px,2.3vw,23px)", lineHeight: "1.3", letterSpacing: "-0.02em", textWrap: "pretty" }}>
                Da solicitação ao contrato, sem redigitar.
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: "16px", lineHeight: "1.6", color: "#6B6259", maxWidth: "46ch" }}>
                A solicitação sai com o serviço e a quantidade que o evento já exige. A resposta do fornecedor volta para dentro do evento: confirmado, aguardando, recusado.
              </p>
              <p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#6B6259", maxWidth: "46ch" }}>
                O contrato em PDF é lido pelo sistema — parcelas, quantidades e horários entram sem você digitar nada. Deixa de existir a pergunta &quot;o buffet respondeu?&quot;.
              </p>
            </div>
            <div style={{ border: "1px solid #E6E0D8", borderRadius: "14px", background: "#FFFFFF", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
                <span style={{ minWidth: "0" }}>
                  <b style={{ display: "block", fontWeight: "500", fontSize: "14.5px", color: "#221E1B" }}>
                    Buffet Aurora
                  </b>
                  <em style={{ fontStyle: "normal", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11.5px", color: "#928A81" }}>
                    220 pessoas · R$ 19.800,00
                  </em>
                </span>
                <span style={{ position: "relative", display: "inline-grid", flex: "none" }}>
                  <span data-anim="1" style={{ gridArea: "1/1", display: "inline-flex", alignItems: "center", height: "24px", padding: "0 10px", borderRadius: "999px", background: "#F5ECD9", fontWeight: "500", fontSize: "12px", color: "#7C6127", whiteSpace: "nowrap", animation: "cwait 9s cubic-bezier(.2,.8,.3,1) infinite" }}>
                    aguardando
                  </span>
                  <span data-anim="1" style={{ gridArea: "1/1", display: "inline-flex", alignItems: "center", height: "24px", padding: "0 10px", borderRadius: "999px", background: "#E9EFE5", fontWeight: "500", fontSize: "12px", color: "#4A5A42", whiteSpace: "nowrap", opacity: "0", animation: "cok 9s cubic-bezier(.2,.8,.3,1) infinite" }}>
                    confirmado
                  </span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
                <span style={{ minWidth: "0" }}>
                  <b style={{ display: "block", fontWeight: "500", fontSize: "14.5px", color: "#221E1B" }}>
                    Estúdio Norte · fotografia
                  </b>
                  <em style={{ fontStyle: "normal", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11.5px", color: "#928A81" }}>
                    R$ 7.400,00
                  </em>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", height: "24px", padding: "0 10px", borderRadius: "999px", background: "#E9EFE5", fontWeight: "500", fontSize: "12px", color: "#4A5A42", flex: "none" }}>
                  confirmado
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "13px 18px" }}>
                <span style={{ minWidth: "0" }}>
                  <b style={{ display: "block", fontWeight: "500", fontSize: "14.5px", color: "#221E1B" }}>
                    Flor &amp; Casa · decoração
                  </b>
                  <em style={{ fontStyle: "normal", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11.5px", color: "#928A81" }}>
                    22 mesas · R$ 11.300,00
                  </em>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", height: "24px", padding: "0 10px", borderRadius: "999px", background: "#E9EFE5", fontWeight: "500", fontSize: "12px", color: "#4A5A42", flex: "none" }}>
                  confirmado
                </span>
              </div>
              <div style={{ padding: "11px 18px", borderTop: "1px solid #EFEAE3", background: "#F2EEE9", fontSize: "13px", color: "#6B6259" }}>
                Contrato em PDF lido: 3 parcelas, entrada do buffet às 16:30.
              </div>
            </div>
          </div>
          {/* 05 organização */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "clamp(24px,4vw,44px)", alignItems: "center", paddingTop: "28px", borderTop: "1px solid #E6E0D8" }} data-stack="1">
            <div>
              <span style={{ display: "block", margin: "0 0 8px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", color: "#6E3F5F" }}>
                05 · ORGANIZAÇÃO
              </span>
              <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(19px,2.3vw,23px)", lineHeight: "1.3", letterSpacing: "-0.02em", textWrap: "pretty" }}>
                Quem faz o quê, por quanto, e quando entra.
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: "16px", lineHeight: "1.6", color: "#6B6259", maxWidth: "46ch" }}>
                Com o contratado definido, o evento se organiza sozinho: serviços com quantidade e valor, equipe com responsável, e o cronograma montado a partir dos horários dos fornecedores.
              </p>
              <p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#6B6259", maxWidth: "46ch" }}>
                Sua equipe entra com o próprio acesso e vê a mesma informação que você.
              </p>
            </div>
            <div style={{ border: "1px solid #E6E0D8", borderRadius: "14px", background: "#FFFFFF", padding: "18px" }}>
              <p style={{ margin: "0 0 12px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
                Cronograma do dia
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "32px", padding: "0 11px", borderRadius: "8px", background: "#F2EEE9" }}>
                  <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "12.5px", color: "#221E1B", flex: "none" }}>
                    14:00
                  </b>
                  <span style={{ fontSize: "13px", color: "#3D3835" }}>
                    Flor &amp; Casa · montagem
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "32px", padding: "0 11px", borderRadius: "8px", background: "#F2EEE9" }}>
                  <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "12.5px", color: "#221E1B", flex: "none" }}>
                    16:30
                  </b>
                  <span style={{ fontSize: "13px", color: "#3D3835" }}>
                    Buffet Aurora · entrada
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "32px", padding: "0 11px", borderRadius: "8px", background: "#F2EEE9" }}>
                  <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "12.5px", color: "#221E1B", flex: "none" }}>
                    19:00
                  </b>
                  <span style={{ fontSize: "13px", color: "#3D3835" }}>
                    Cerimônia
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "32px", padding: "0 11px", borderRadius: "8px", background: "#F2EEE9" }}>
                  <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "12.5px", color: "#221E1B", flex: "none" }}>
                    20:15
                  </b>
                  <span style={{ fontSize: "13px", color: "#3D3835" }}>
                    Jantar servido
                  </span>
                </div>
              </div>
              <p style={{ margin: "14px 0 0", fontSize: "13.5px", lineHeight: "1.55", color: "#928A81" }}>
                Montado a partir dos horários que vieram dos contratos.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
