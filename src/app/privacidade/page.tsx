import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — eOrganizei",
  description:
    "Como o eOrganizei trata os dados usados no envio de confirmações e agendamentos de eventos.",
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
        eOrganizei — gestão para cerimonialistas
      </p>
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", margin: "8px 0 4px" }}>
        Política de Privacidade
      </h1>
      <p style={{ color: "#6B6259", margin: "0 0 28px" }}>
        Última atualização: {atualizacao}
      </p>

      <Secao titulo="Quem somos">
        O eOrganizei é uma ferramenta de gestão usada por cerimonialistas para
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
          <li>
            <b>Dados de convidados</b> informados pela cliente ou pelo próprio
            convidado: nome, contato e, quando informadas voluntariamente,
            <b> restrições alimentares e necessidades de acessibilidade</b> —
            usadas apenas para o serviço do evento (cardápio e recepção) e
            visíveis só à equipe do evento.
          </li>
        </ul>
      </Secao>

      <Secao titulo="Bases legais (LGPD)">
        <ul style={lista}>
          <li>
            <b>Execução de contrato</b> (art. 7º, V): os dados da
            cerimonialista, das clientes e dos fornecedores são tratados para
            prestar o serviço contratado — organizar e executar o evento.
          </li>
          <li>
            <b>Legítimo interesse</b> (art. 7º, IX): o contato operacional com
            fornecedores escalados para um evento (confirmações, horários,
            pendências), sempre restrito ao necessário e com opção de resposta.
          </li>
          <li>
            <b>Consentimento</b> (art. 7º, I; art. 11 para dados sensíveis): o
            convidado que preenche a própria confirmação de presença decide o
            que informar — restrição alimentar e acessibilidade são campos
            opcionais, tratados como dados sensíveis e usados só para o evento.
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

      <Secao titulo="Quem responde pelos dados">
        Para os dados dos eventos, a <b>controladora é a cerimonialista</b>{" "}
        que os cadastrou — é ela quem decide o que coletar e para quê. O eOrganizei
        atua como <b>operador</b>, tratando os dados em nome dela e sob as
        instruções desta política. Pedidos de titulares podem ser feitos à
        cerimonialista responsável pelo seu evento ou pelo contato abaixo.
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
