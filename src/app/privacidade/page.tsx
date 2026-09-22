import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — eorganizei",
  description:
    "Como o eorganizei trata os dados usados no envio de confirmações e agendamentos de eventos.",
};

// Página pública (fora do grupo autenticado): exigida pela Meta para
// publicar o app de WhatsApp Business. Liberada no middleware.
export default function PrivacidadePage() {
  const atualizacao = "setembro de 2026";
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
        eorganizei — gestão para cerimonialistas
      </p>
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", margin: "8px 0 4px" }}>
        Política de Privacidade
      </h1>
      <p style={{ color: "#6B6259", margin: "0 0 28px" }}>
        Última atualização: {atualizacao}
      </p>

      <Secao titulo="Quem somos">
        O eorganizei é uma ferramenta de gestão usada por cerimonialistas para
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

      <Secao titulo="Como usamos a API do Google Agenda">
        Se a cerimonialista conectar a conta Google dela em Configurações, o
        eOrganizei cria nessa conta uma agenda chamada “eOrganizei” e passa a
        gravar ali, e só ali, o dia de cada evento e os compromissos com hora
        marcada — título, data, hora, local e o link de volta ao sistema. Com a
        permissão de disponibilidade, lemos apenas os horários ocupados da
        agenda principal dela, sem título nem conteúdo, para não oferecer a um
        fornecedor um horário já tomado. A chave de acesso fica guardada
        cifrada e é usada exclusivamente para isso. A conexão pode ser desfeita
        a qualquer momento em Configurações: desfazê-la apaga a agenda
        “eOrganizei” e revoga o acesso. O uso que fazemos das informações
        recebidas das APIs do Google segue a{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noreferrer"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          Política de Dados do Usuário dos Serviços de API do Google
        </a>
        , incluindo os requisitos de Uso Limitado.
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

      <Secao id="uso" titulo="Uso do sistema pela equipe">
        Quando alguém da equipe de uma cerimonialista usa o eorganizei,
        registramos em que área do sistema a pessoa está (por exemplo,
        &ldquo;Planejamento&rdquo;), quando esteve e por quanto tempo. Não
        registramos o que aparece na tela nem o que é digitado. Usamos esse
        registro para dar suporte e melhorar o serviço (legítimo interesse,
        art. 7º, IX) e o apagamos depois de 13 meses.
      </Secao>

      <Secao id="vitrine" titulo="Pedido de orçamento pela vitrine da cerimonialista">
        Cada cerimonialista pode publicar uma vitrine profissional, uma página de apresentação com um
        formulário de pedido de orçamento. Quando você envia esse formulário,
        o nome, o WhatsApp, o e-mail (se informado) e os dados do evento que
        você descreveu são entregues <b>a essa cerimonialista</b>, que é a{" "}
        <b>controladora</b> desses dados; o eorganizei apenas os guarda e os
        exibe para ela. A finalidade é uma só: responder ao seu pedido. Não
        usamos esses dados para anúncios, não os vendemos e não os
        compartilhamos com outras cerimonialistas.
        <p style={{ marginTop: 10 }}>
          <b>Pixel da Meta da cerimonialista.</b> Se a cerimonialista cadastrou
          o pixel da Meta dela, a vitrine pergunta antes se você permite
          ativá-lo. Sem a sua permissão, o código da Meta nem é carregado. Com
          ela, a Meta passa a receber dados de navegação (como a página
          visitada e os cookies dela no seu navegador), tratados conforme a
          política de privacidade da Meta, para os anúncios dessa
          cerimonialista. A vitrine envia à Meta só três avisos: a visita, o
          toque no botão do WhatsApp e o envio do pedido, sem o seu nome,
          WhatsApp, e-mail ou mensagem. Você muda a escolha quando quiser, pelo
          link no rodapé da vitrine.
        </p>
        <p style={{ marginTop: 10 }}>
          Pedidos encerrados são mantidos por até <b>24 meses</b> e depois
          anonimizados. Você pode pedir a exclusão antes disso, à
          cerimonialista ou pelo contato no fim desta página.
        </p>
        <p style={{ marginTop: 10 }}>
          Nas páginas públicas das cerimonialistas contamos, <b>por dia</b>,
          quantas visitas houve, quantos toques nos botões de WhatsApp e
          Instagram e quantos pedidos foram enviados. Esses números são
          agregados e <b>não identificam quem visitou</b>: não usamos cookie,
          não guardamos o seu endereço de rede e não há como ligar uma visita
          a uma pessoa. Um toque no botão do WhatsApp conta como toque — o
          sistema não sabe se você chegou a enviar a mensagem.
        </p>
      </Secao>

      <Secao titulo="Seus direitos">
        Titulares de dados podem solicitar acesso, correção ou exclusão das
        suas informações. Basta entrar em contato pelo e-mail abaixo.
      </Secao>

      <Secao titulo="Quem responde pelos dados">
        Para os dados dos eventos, a <b>controladora é a cerimonialista</b>{" "}
        que os cadastrou — é ela quem decide o que coletar e para quê. O eorganizei
        atua como <b>operador</b>, tratando os dados em nome dela e sob as
        instruções desta política. Pedidos de titulares podem ser feitos à
        cerimonialista responsável pelo seu evento ou pelo contato abaixo.
      </Secao>

      <Secao titulo="Termos de uso">
        As condições da assinatura e da licença de uso do sistema estão nos{" "}
        <a href="/termos" style={{ color: "#6E3F5F", fontWeight: 600 }}>
          Termos e Condições
        </a>
        , que valem junto com esta política.
      </Secao>

      <Secao titulo="Medição de visitas e anúncios">
        Em <b>duas páginas</b> — a de planos e a de entrada e criação de conta
        — usamos o <b>Google Analytics</b> e o <b>pixel da Meta</b>, para saber
        quantas pessoas chegam pelos nossos anúncios e quantas criam conta.
        Eles registram a visita e o fato de uma conta ter sido criada;{" "}
        <b>não recebem nome, e-mail nem qualquer dado que você digite</b>.
        <p style={{ marginTop: 10 }}>
          Em nenhuma outra página eles são carregados — nem nas áreas de
          trabalho do sistema, nem no portal da cliente, na confirmação de
          presença, no guia do fornecedor, na recepção ou na proposta. Nessas
          páginas o endereço é a própria credencial de acesso, e ele não sai
          para terceiros.
        </p>
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

function Secao({
  titulo,
  id,
  children,
}: {
  titulo: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px" }}>{titulo}</h2>
      <div style={{ color: "#3D3835" }}>{children}</div>
    </section>
  );
}
