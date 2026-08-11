import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Vela",
  description:
    "Como a Vela trata os dados usados no envio de confirmações e agendamentos de eventos.",
};

// Página pública (fora do grupo autenticado): exigida pela Meta para
// publicar o app de WhatsApp Business. Liberada no middleware.
export default function PrivacidadePage() {
  const atualizacao = "agosto de 2026";
  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        maxWidth: 760,
        margin: "0 auto",
        padding: "48px 24px 80px",
        color: "#221E1B",
        lineHeight: 1.65,
      }}
    >
      <p style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#928A81", margin: 0 }}>
        Vela — gestão para cerimonialistas
      </p>
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", margin: "8px 0 4px" }}>
        Política de Privacidade
      </h1>
      <p style={{ color: "#6B6259", margin: "0 0 28px" }}>
        Última atualização: {atualizacao}
      </p>

      <Secao titulo="Quem somos">
        A Vela é uma ferramenta de gestão usada por cerimonialistas para
        organizar eventos (casamentos e festas), do orçamento ao dia da
        celebração. Esta política explica quais dados tratamos e para quê.
      </Secao>

      <Secao titulo="Quais dados tratamos">
        <ul style={lista}>
          <li>
            <b>Dados de contato de fornecedores e clientes</b> cadastrados pela
            cerimonialista: nome, telefone/WhatsApp e e-mail.
          </li>
          <li>
            <b>Dados operacionais do evento</b>: datas, horários, locais,
            tarefas e agendamentos.
          </li>
          <li>
            <b>Registros de mensagens de confirmação e agendamento</b> enviadas
            e recebidas, para acompanhar o status (enviado, respondido,
            reagendado).
          </li>
        </ul>
      </Secao>

      <Secao titulo="Como usamos a API do WhatsApp Business">
        Utilizamos a API do WhatsApp Business, da Meta, exclusivamente para
        enviar aos fornecedores convites e confirmações de horários dos eventos,
        e para receber a resposta estruturada (a escolha de um horário
        oferecido). Não enviamos publicidade nem mensagens não solicitadas. O
        mesmo tipo de mensagem pode ser enviado, alternativamente, por e-mail.
      </Secao>

      <Secao titulo="Compartilhamento de dados">
        Não vendemos nem compartilhamos dados pessoais com terceiros para fins
        de marketing. Os dados trafegam apenas pelos provedores necessários à
        operação do serviço — envio de mensagens (Meta/WhatsApp e provedor de
        e-mail) e hospedagem/banco de dados — que atuam como operadores em nosso
        nome.
      </Secao>

      <Secao titulo="Finalidade e retenção">
        Os dados de contato são usados unicamente para a confirmação e o
        agendamento de horários dos eventos. Mantemos os registros enquanto o
        evento estiver ativo e pelo período necessário ao histórico da
        cerimonialista; a pedido, dados pessoais podem ser removidos.
      </Secao>

      <Secao titulo="Seus direitos">
        Titulares de dados podem solicitar acesso, correção ou exclusão das
        suas informações. Basta entrar em contato pelo e-mail abaixo.
      </Secao>

      <Secao titulo="Contato">
        Dúvidas ou solicitações sobre privacidade:{" "}
        <a href="mailto:geremiaseng@outlook.com" style={{ color: "#6E3F5F", fontWeight: 600 }}>
          geremiaseng@outlook.com
        </a>
        .
      </Secao>
    </main>
  );
}

const lista: React.CSSProperties = {
  margin: "8px 0 0",
  paddingLeft: 20,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px" }}>{titulo}</h2>
      <div style={{ color: "#3D3835" }}>{children}</div>
    </section>
  );
}
