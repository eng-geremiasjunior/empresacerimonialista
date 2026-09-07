// Perguntas — a landing de /planos, traduzida do desenho.
//
// O que costuma travar a decisao — as seis perguntas, em <details>.
//
// Nada aqui e dinamico: e argumento, nao dado. O que vem do banco (preco,
// tetos, degraus da promocao) mora na propria pagina.

export function Perguntas() {
  return (
    <>
      {" "}
      {/* ============ 12 · PERGUNTAS ============ */}
      <section style={{ maxWidth: "1080px", margin: "clamp(56px,7vw,88px) auto 0", padding: "0 clamp(20px,4vw,28px)" }}>
        <h2 style={{ margin: "0 0 24px", fontFamily: "var(--font-title, Inter, sans-serif)", fontWeight: "600", fontSize: "clamp(23px,3.2vw,34px)", lineHeight: "1.15", letterSpacing: "-0.028em" }}>
          O que costuma travar a decisão
        </h2>
        <div style={{ borderTop: "1px solid #E6E0D8" }}>
          <details style={{ borderBottom: "1px solid #E6E0D8" }}>
            <summary style={{ display: "flex", alignItems: "center", minHeight: "56px", padding: "8px 0", cursor: "pointer", listStyle: "none", fontWeight: "600", fontSize: "16px", lineHeight: "1.4", color: "#221E1B" }}>
              E se eu não gostar?
            </summary>
            <p style={{ margin: "0", maxWidth: "68ch", paddingBottom: "18px", fontSize: "15px", lineHeight: "1.6", color: "#6B6259" }}>
              Cancela quando quiser, sem multa e sem taxa. Os dados continuam seus para ver, imprimir e exportar.
            </p>
          </details>
          <details style={{ borderBottom: "1px solid #E6E0D8" }}>
            <summary style={{ display: "flex", alignItems: "center", minHeight: "56px", padding: "8px 0", cursor: "pointer", listStyle: "none", fontWeight: "600", fontSize: "16px", lineHeight: "1.4", color: "#221E1B" }}>
              Preciso saber mexer em sistema?
            </summary>
            <p style={{ margin: "0", maxWidth: "68ch", paddingBottom: "18px", fontSize: "15px", lineHeight: "1.6", color: "#6B6259" }}>
              Não. A primeira coisa que se faz é colar a conversa de um evento que você já tem; o resto aparece na ordem em que se precisa.
            </p>
          </details>
          <details style={{ borderBottom: "1px solid #E6E0D8" }}>
            <summary style={{ display: "flex", alignItems: "center", minHeight: "56px", padding: "8px 0", cursor: "pointer", listStyle: "none", fontWeight: "600", fontSize: "16px", lineHeight: "1.4", color: "#221E1B" }}>
              Preciso parar de usar WhatsApp e planilha?
            </summary>
            <p style={{ margin: "0", maxWidth: "68ch", paddingBottom: "18px", fontSize: "15px", lineHeight: "1.6", color: "#6B6259" }}>
              Não de uma vez. Você continua conversando onde já conversa — a diferença é que a informação passa a ficar registrada no evento em vez de só na conversa.
            </p>
          </details>
          <details style={{ borderBottom: "1px solid #E6E0D8" }}>
            <summary style={{ display: "flex", alignItems: "center", minHeight: "56px", padding: "8px 0", cursor: "pointer", listStyle: "none", fontWeight: "600", fontSize: "16px", lineHeight: "1.4", color: "#221E1B" }}>
              Funciona no celular no dia do evento?
            </summary>
            <p style={{ margin: "0", maxWidth: "68ch", paddingBottom: "18px", fontSize: "15px", lineHeight: "1.6", color: "#6B6259" }}>
              Sim. O roteiro, a recepção, o Modo Evento e o link do fornecedor foram feitos para o celular, na mão, em pé.
            </p>
          </details>
          <details style={{ borderBottom: "1px solid #E6E0D8" }}>
            <summary style={{ display: "flex", alignItems: "center", minHeight: "56px", padding: "8px 0", cursor: "pointer", listStyle: "none", fontWeight: "600", fontSize: "16px", lineHeight: "1.4", color: "#221E1B" }}>
              E os dados das minhas clientes?
            </summary>
            <p style={{ margin: "0", maxWidth: "68ch", paddingBottom: "18px", fontSize: "15px", lineHeight: "1.6", color: "#6B6259" }}>
              Você é a controladora e o eorganizei é operador. Cada link mostra só a fatia de quem o recebeu.{" "}
              <a href="/privacidade">
                Política de Privacidade
              </a>
              .
            </p>
          </details>
          <details style={{ borderBottom: "1px solid #E6E0D8" }}>
            <summary style={{ display: "flex", alignItems: "center", minHeight: "56px", padding: "8px 0", cursor: "pointer", listStyle: "none", fontWeight: "600", fontSize: "16px", lineHeight: "1.4", color: "#221E1B" }}>
              Quanto tempo para começar?
            </summary>
            <p style={{ margin: "0", maxWidth: "68ch", paddingBottom: "18px", fontSize: "15px", lineHeight: "1.6", color: "#6B6259" }}>
              Cria a conta e monta o primeiro evento no mesmo dia.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
