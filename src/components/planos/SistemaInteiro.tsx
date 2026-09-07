// SistemaInteiro — "o produto e o mesmo inteiro em todos os planos" e os
// primeiros vinte minutos, logo antes da oferta.
//
// A unica coisa dinamica aqui e a contagem de planos: se o dono tirar um
// do catalogo, "nos tres" vira "nos dois" sozinho — a frase nao pode
// prometer um plano que nao esta a venda.

export function SistemaInteiro({ nosN }: { nosN: string }) {
  return (
    <>
      {" "}
      {/* ============ 10 · O SISTEMA INTEIRO ============ */}
      <section style={{ maxWidth: "1080px", margin: "clamp(56px,7vw,88px) auto 0", padding: "0 clamp(20px,4vw,28px)" }}>
        <span style={{ display: "block", margin: "0 0 10px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
          Sem função escondida
        </span>
        <h2 style={{ margin: "0 0 12px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(23px,3.2vw,34px)", lineHeight: "1.15", letterSpacing: "-0.028em" }}>
          {`O sistema inteiro, ${nosN}.`}
        </h2>
        <p style={{ margin: "0", maxWidth: "60ch", fontSize: "16.5px", lineHeight: "1.6", color: "#6B6259" }}>
          Nenhuma etapa da operação fica atrás de um plano maior. O que muda entre os planos é escala, não recurso.
        </p>
        <ul style={{ listStyle: "none", margin: "28px 0 0", padding: "0", columns: "3", columnGap: "36px", fontSize: "14px", lineHeight: "1.55", color: "#6B6259" }} data-colunas="1">
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Briefing
            </b>
            {" "}— a conversa com a cliente estruturada em evento
          </li>
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Eventos e clientes
            </b>
            {" "}— informações, decisões e histórico
          </li>
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Planejamento por tipo
            </b>
            {" "}— casamento, debutante, formatura, corporativo, show
          </li>
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Orçamentos e propostas
            </b>
            {" "}— com aceite pela cliente
          </li>
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Fornecedores
            </b>
            {" "}— solicitação, confirmação, agenda e leitura do contrato em PDF
          </li>
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Financeiro por evento
            </b>
            {" "}— receita, custos, parcelas e resultado
          </li>
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Tarefas e calendário
            </b>
            {" "}— prazo e responsável
          </li>
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Equipe
            </b>
            {" "}— cada pessoa com o próprio acesso
          </li>
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Roteiro do dia
            </b>
            {" "}— link por fornecedor e Modo Evento
          </li>
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Convidados
            </b>
            {" "}— convite, confirmação, recepção por QR Code e mapa de mesas
          </li>
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Portal da Cliente
            </b>
            {" "}— acompanhamento e prestação de contas
          </li>
          <li style={{ breakInside: "avoid", margin: "0 0 14px" }}>
            <b style={{ fontWeight: "600", color: "#221E1B" }}>
              Copiloto
            </b>
            {" "}— o que merece atenção hoje
          </li>
        </ul>
      </section>
      {/* ============ 10b · O DIA UM ============ */}
      {/* O medo não é o preço, é o tempo de implantar. Três passos com
               duração declarada, logo antes da oferta. */}
      <section style={{ maxWidth: "1080px", margin: "clamp(56px,7vw,88px) auto 0", padding: "0 clamp(20px,4vw,28px)" }}>
        <span style={{ display: "block", margin: "0 0 10px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
          O dia um
        </span>
        <h2 style={{ margin: "0 0 12px", maxWidth: "28ch", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(23px,3.2vw,34px)", lineHeight: "1.15", letterSpacing: "-0.028em", textWrap: "pretty" }}>
          Seus primeiros vinte minutos
        </h2>
        <p style={{ margin: "0", maxWidth: "60ch", fontSize: "16.5px", lineHeight: "1.6", color: "#6B6259" }}>
          Você não precisa migrar a operação inteira para começar. Escolhe um evento que já está em andamento e coloca só ele.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1px", marginTop: "clamp(28px,3.5vw,40px)", background: "#E6E0D8", border: "1px solid #E6E0D8", borderRadius: "14px", overflow: "hidden" }} data-stack="1">
          <div style={{ padding: "22px", background: "#FFFFFF" }}>
            <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
              <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "13px", color: "#6E3F5F" }}>
                01
              </b>
              <em style={{ fontStyle: "normal", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#928A81" }}>
                2 min
              </em>
            </span>
            <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "16px", letterSpacing: "-0.01em" }}>
              Cole a conversa da cliente
            </h3>
            <p style={{ margin: "0", fontSize: "14.5px", lineHeight: "1.55", color: "#6B6259" }}>
              Data, local, convidados, orçamento e os dados dela entram sem você digitar. Você confere e ajusta o que faltou.
            </p>
          </div>
          <div style={{ padding: "22px", background: "#FFFFFF" }}>
            <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
              <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "13px", color: "#6E3F5F" }}>
                02
              </b>
              <em style={{ fontStyle: "normal", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#928A81" }}>
                10 min
              </em>
            </span>
            <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "16px", letterSpacing: "-0.01em" }}>
              Lance os fornecedores já fechados
            </h3>
            <p style={{ margin: "0", fontSize: "14.5px", lineHeight: "1.55", color: "#6B6259" }}>
              Serviço, quantidade e valor de cada um. É o que faz o financeiro do evento e o roteiro do dia existirem.
            </p>
          </div>
          <div style={{ padding: "22px", background: "#FFFFFF" }}>
            <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
              <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "600", fontSize: "13px", color: "#6E3F5F" }}>
                03
              </b>
              <em style={{ fontStyle: "normal", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", color: "#928A81" }}>
                5 min
              </em>
            </span>
            <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "16px", letterSpacing: "-0.01em" }}>
              Abra o portal para a cliente
            </h3>
            <p style={{ margin: "0", fontSize: "14.5px", lineHeight: "1.55", color: "#6B6259" }}>
              Ela passa a ver o que está contratado, o que já pagou e o que falta decidir. As perguntas param de chegar por áudio.
            </p>
          </div>
        </div>
        <p style={{ margin: "20px 0 0", maxWidth: "60ch", fontSize: "15px", lineHeight: "1.6", color: "#6B6259" }}>
          Os outros eventos você traz no ritmo que der — cada um leva os mesmos vinte minutos, e o método já está montado.
        </p>
      </section>
    </>
  );
}
