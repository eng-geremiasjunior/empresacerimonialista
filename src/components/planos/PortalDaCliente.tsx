// PortalDaCliente — a landing de /planos, traduzida do desenho.
//
// O portal da cliente, o Copiloto e o fechamento do argumento.
//
// Nada aqui e dinamico: e argumento, nao dado. O que vem do banco (preco,
// tetos, degraus da promocao) mora na propria pagina.

export function PortalDaCliente() {
  return (
    <>
      {" "}
      {/* ============ 7 · PORTAL DA CLIENTE ============ */}
      <section style={{ maxWidth: "1080px", margin: "clamp(56px,7vw,88px) auto 0", padding: "0 clamp(20px,4vw,28px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: "clamp(24px,4vw,48px)", alignItems: "center" }} data-stack="1">
          <div>
            <span style={{ display: "block", margin: "0 0 10px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
              Portal da cliente
            </span>
            <h2 style={{ margin: "0 0 14px", maxWidth: "26ch", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(23px,3.2vw,34px)", lineHeight: "1.15", letterSpacing: "-0.028em", textWrap: "pretty" }}>
              Ela acompanha sem precisar te perguntar.
            </h2>
            <p style={{ margin: "0 0 10px", fontSize: "16.5px", lineHeight: "1.6", color: "#6B6259", maxWidth: "50ch" }}>
              A cliente entra com o acesso dela e vê o que é dela: o que está contratado, o cronograma, as escolhas que faltam, quanto já pagou, o que ainda vence e quantos convidados confirmaram.
            </p>
            <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.6", color: "#6B6259", maxWidth: "50ch" }}>
              As perguntas ficam registradas no evento. Menos mensagem para responder, e uma cliente com a sensação de que a operação está sob controle — porque está.
            </p>
          </div>
          <div style={{ border: "1px solid #E6E0D8", borderRadius: "14px", background: "#FFFFFF", overflow: "hidden", maxWidth: "420px", justifySelf: "end", width: "100%" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #EFEAE3", background: "#F2EEE9" }}>
              <p style={{ margin: "0", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "10.5px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
                Portal · Marina e Téo
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
              <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                Já pago por você
              </span>
              <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                R$ 50.000
              </b>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
              <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                Próxima parcela
              </span>
              <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                10/02 · R$ 15.000
              </b>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "13px 18px", borderBottom: "1px solid #EFEAE3" }}>
              <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                Convidados confirmados
              </span>
              <b style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontWeight: "500", fontSize: "14px", color: "#221E1B" }}>
                154 de 180
              </b>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "13px 18px" }}>
              <span style={{ fontSize: "14.5px", color: "#3D3835" }}>
                Falta você decidir
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", height: "24px", padding: "0 10px", borderRadius: "999px", background: "#F5ECD9", fontWeight: "500", fontSize: "12px", color: "#7C6127" }}>
                paleta e decoração
              </span>
            </div>
          </div>
        </div>
      </section>
      {/* ============ 8 · COPILOTO (curto) ============ */}
      <section style={{ maxWidth: "1080px", margin: "clamp(48px,6vw,72px) auto 0", padding: "0 clamp(20px,4vw,28px)" }}>
        <div style={{ border: "1px solid #E6E0D8", borderRadius: "14px", background: "#FFFFFF", padding: "clamp(22px,3vw,32px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "clamp(20px,3vw,36px)", alignItems: "center" }} data-stack="1">
          <div>
            <span style={{ display: "block", margin: "0 0 8px", fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
              E o que você não tem tempo de olhar
            </span>
            <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(19px,2.4vw,24px)", lineHeight: "1.25", letterSpacing: "-0.02em", textWrap: "pretty" }}>
              O sistema avisa antes de virar problema.
            </h3>
            <p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#6B6259", maxWidth: "48ch" }}>
              Todo dia ele passa pelos seus eventos e traz só o que precisa de decisão. Cada evento tem um indicador de saúde: o quanto está resolvido em relação à data.
            </p>
          </div>
          <ul style={{ listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: "9px" }}>
            <li style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14.5px", lineHeight: "1.5", color: "#3D3835" }}>
              <i style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#A5813C", flex: "none" }}>
              </i>
              Flor &amp; Casa não respondeu a solicitação há 4 dias
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14.5px", lineHeight: "1.5", color: "#3D3835" }}>
              <i style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#A5813C", flex: "none" }}>
              </i>
              Parcela do buffet vence em 3 dias
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14.5px", lineHeight: "1.5", color: "#3D3835" }}>
              <i style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#A5813C", flex: "none" }}>
              </i>
              Debutante Helena · lista de convidados atrasada
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14.5px", lineHeight: "1.5", color: "#3D3835" }}>
              <i style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#6E7F63", flex: "none" }}>
              </i>
              Marina e Téo · saúde do evento 86%
            </li>
          </ul>
        </div>
      </section>
      {/* ============ 9 · FECHAMENTO ============ */}
      <section style={{ marginTop: "clamp(56px,7vw,88px)", padding: "clamp(56px,7vw,84px) 0", background: "#F2EEE9", borderTop: "1px solid #E6E0D8", borderBottom: "1px solid #E6E0D8" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 clamp(20px,4vw,28px)", textAlign: "center" }}>
          <h2 style={{ margin: "0 auto 16px", maxWidth: "24ch", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(26px,3.8vw,40px)", lineHeight: "1.12", letterSpacing: "-0.03em", textWrap: "balance" }}>
            Uma empresa de cerimonial operando em um sistema.
          </h2>
          <p style={{ margin: "0 auto 12px", maxWidth: "58ch", fontSize: "17px", lineHeight: "1.6", color: "#6B6259", textWrap: "pretty" }}>
            Não é trocar a planilha por outra planilha. É parar de reconstruir na cabeça, toda semana, o estado de cada evento.
          </p>
          <p style={{ margin: "0 auto", maxWidth: "58ch", fontSize: "17px", lineHeight: "1.6", color: "#6B6259", textWrap: "pretty" }}>
            Todos os eventos com o mesmo método. A informação em um lugar. A equipe olhando o mesmo painel. A cliente acompanhando o que é dela. O dinheiro de cada evento fechado.
          </p>
        </div>
      </section>
    </>
  );
}
