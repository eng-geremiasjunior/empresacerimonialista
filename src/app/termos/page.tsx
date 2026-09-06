import type { Metadata } from "next";
import {
  LICENCIANTE,
  TERMOS_ATUALIZADO_EM,
  TERMOS_VERSAO,
} from "@/lib/termos";

export const metadata: Metadata = {
  title: "Termos e Condições — eorganizei",
  description:
    "As condições de uso do eorganizei: a licença, a assinatura mensal, o cancelamento sem custo e o cuidado com os dados.",
};

// Página pública (fora do grupo autenticado), liberada no middleware —
// ela precisa abrir ANTES de existir conta, no link da tela de assinatura.
//
// O texto vive aqui e a VERSÃO vive em src/lib/termos.ts. Mudou o texto,
// muda TERMOS_VERSAO: é essa string que fica gravada em `termos_aceite`
// (149) e é por ela que se prova, depois, qual texto a pessoa aceitou.
//
// Razão social, CNPJ e comarca ainda não estão preenchidos em
// LICENCIANTE. Nada aqui escreve "[preencher]": a frase que precisa
// deles só aparece quando eles existem.
export default function TermosPage() {
  const identificada = Boolean(LICENCIANTE.razaoSocial);
  const foro = LICENCIANTE.comarca
    ? `a comarca de ${LICENCIANTE.comarca}`
    : "a comarca do domicílio da licenciante";

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
      <p style={eyebrow}>eorganizei — gestão para cerimonialistas</p>
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", margin: "8px 0 4px" }}>
        Termos e Condições de Uso
      </h1>
      <p style={{ color: "#6B6259", margin: "0 0 28px" }}>
        Última atualização: {TERMOS_ATUALIZADO_EM}
      </p>

      <Secao id="sobre" titulo="1. Sobre estes termos">
        <p>
          O <b>eorganizei</b> ({LICENCIANTE.site}) é um sistema de gestão para
          quem organiza eventos — casamentos, festas de 15 anos, formaturas,
          shows e eventos de empresa —, do orçamento ao dia da celebração.
          {identificada ? (
            <>
              {" "}
              Ele é oferecido por {LICENCIANTE.razaoSocial}
              {LICENCIANTE.cnpj ? `, CNPJ ${LICENCIANTE.cnpj}` : ""}, aqui
              chamada de <b>licenciante</b>.
            </>
          ) : (
            <> A empresa que o oferece é chamada aqui de <b>licenciante</b>.</>
          )}
        </p>
        <p style={p}>
          Estes termos são o acordo entre nós e <b>você</b>: a profissional ou a
          empresa que abre uma conta e usa o sistema para trabalhar. Eles valem
          junto com a{" "}
          <a href="/privacidade" style={link}>
            Política de Privacidade
          </a>
          . Escrevemos para ser lido — se alguma frase aqui não estiver clara,
          escreva para a gente antes de aceitar.
        </p>
      </Secao>

      <Secao id="aceite" titulo="2. Como o aceite acontece">
        <p>
          Ao concluir a assinatura, você marca a caixa “Li e aceito os Termos e
          Condições”. Nesse momento registramos a data e a hora, a versão deste
          texto, a conta e o e-mail de quem aceitou, o endereço de rede e o
          navegador usados. É o nosso registro de que este acordo foi aceito —
          e de <i>qual</i> texto foi aceito.
        </p>
        <p style={p}>
          Se você usa o sistema no período gratuito, sem assinatura, estes
          termos também valem para esse uso.
        </p>
      </Secao>

      <Secao id="licenca" titulo="3. A licença de uso">
        <p>
          O sistema é nosso: o programa, as telas, os textos, o método de
          organização dos eventos, a marca e tudo o que o compõe pertencem à
          licenciante e são protegidos pelas Leis nº 9.609/1998 e nº 9.610/1998.
          Assinar o eorganizei <b>não é comprar o sistema</b> — é receber uma{" "}
          <b>licença de uso</b>: pessoal, não exclusiva, intransferível e válida
          enquanto a assinatura estiver em dia.
        </p>
        <p style={p}>Dentro dessa licença, você pode usar o sistema para o seu trabalho, com a sua equipe e com os seus clientes, sem limite de uso além dos tetos do plano contratado.</p>
        <p style={p}>O que a licença não permite:</p>
        <ul style={lista}>
          <li>copiar, reproduzir ou distribuir o sistema, no todo ou em parte;</li>
          <li>
            revender, alugar, sublicenciar ou oferecer o sistema como se fosse
            seu, dentro de outro serviço;
          </li>
          <li>
            descompilar, fazer engenharia reversa ou tentar extrair o código,
            salvo no que a lei expressamente autorizar;
          </li>
          <li>
            usar o sistema, o método ou os conteúdos dele para construir um
            produto concorrente;
          </li>
          <li>
            compartilhar um mesmo login com pessoas de fora da sua equipe — cada
            pessoa que trabalha na conta tem o acesso dela.
          </li>
        </ul>
        <p style={p}>
          <b>O que você cadastra continua seu.</b> Seus eventos, clientes,
          fornecedores, convidados, valores e arquivos são seus. Nós os
          guardamos e os tratamos para fazer o sistema funcionar, e não os
          usamos para outra finalidade.
        </p>
      </Secao>

      <Secao id="conta" titulo="4. Sua conta e sua equipe">
        <p>
          A conta é aberta por você e responde por tudo o que acontece dentro
          dela. Guarde a senha, não a compartilhe e avise-nos se desconfiar de
          algum acesso indevido. Os acessos que você cria para a sua equipe são
          sua responsabilidade: quem entra, o que vê e quando o acesso é
          desativado.
        </p>
        <p style={p}>
          O sistema gera links que abrem sem senha — o roteiro do fornecedor, a
          confirmação de presença do convidado, o guia de estilo, a proposta e o
          posto da recepção. <b>Quem decide enviar cada um é você</b>, e quem
          recebe o link vê a parte do evento que aquele link mostra. Envie-os
          apenas a quem precisa.
        </p>
        <p style={p}>
          Você se compromete a usar o sistema dentro da lei: nada de conteúdo
          ilícito, de tentativa de invadir ou sobrecarregar o serviço, nem de
          envio de mensagens a quem não autorizou receber.
        </p>
      </Secao>

      <Secao id="dados" titulo="5. Seus dados e os dados dos seus clientes">
        <p>
          Na linguagem da Lei Geral de Proteção de Dados (Lei nº 13.709/2018),
          em relação aos dados dos eventos — seus clientes, fornecedores e
          convidados — <b>você é a controladora</b> (é você quem decide o que
          coletar e para quê) e o <b>eorganizei é operador</b>: tratamos esses
          dados em seu nome, seguindo estes termos e a{" "}
          <a href="/privacidade" style={link}>
            Política de Privacidade
          </a>
          , que faz parte deste acordo.
        </p>
        <p style={p}>
          Para funcionar, o sistema se apoia em fornecedores de hospedagem,
          banco de dados e armazenamento de arquivos, envio de e-mail e envio de
          mensagens. Eles tratam os dados apenas para prestar esses serviços a
          nós. Não vendemos dados e não os usamos para publicidade.
        </p>
        <p style={p}>
          Depois do cancelamento, mantemos os dados da sua conta por um período
          razoável, para o caso de você voltar e para cumprir obrigações legais;
          passado esse período, podemos excluí-los. Enquanto a conta existir,
          você pode pedir uma cópia dos seus dados ou a exclusão deles pelo
          e-mail no fim desta página.
        </p>
      </Secao>

      <Secao id="planos" titulo="6. Planos, assinatura e pagamento">
        <p>
          A assinatura é <b>mensal e pré-paga</b>: você paga o mês que vai usar
          e ela se renova sozinha a cada ciclo, no cartão de crédito cadastrado,
          até que você cancele.
        </p>
        <p style={p}>
          Há três planos. <b>O sistema é o mesmo e inteiro em todos</b> — nenhuma
          função fica atrás de um plano maior. O que muda é quantos eventos
          podem estar em andamento ao mesmo tempo e quantas pessoas têm acesso.
          Os valores e os limites de cada plano são os que aparecem na tela de
          assinatura no momento da contratação.
        </p>
        <p style={p}>
          <b>Chegar ao limite não apaga nem esconde nada.</b> Tudo o que já
          existe continua acessível; o que o teto impede é criar o próximo
          evento ou o próximo acesso — até que um evento se conclua ou você
          mude de plano. A confirmação de uma proposta pela sua cliente nunca é
          barrada por causa do teto.
        </p>
        <p style={p}>
          Sem assinatura, a conta pode criar um evento para conhecer o sistema.
          Consultar o que já existe continua livre.
        </p>
        <p style={p}>
          Você pode <b>mudar de plano quando quiser</b>, pela própria tela de
          assinatura. O novo valor passa a valer na cobrança seguinte, sem
          cobrança proporcional no meio do ciclo. Descer para um plano com menos
          acessos exige desativar antes os acessos que sobram — essa escolha é
          sua, não nossa.
        </p>
        <p style={p}>
          O pagamento é processado pela <b>Pagar.me</b>. Os dados do seu cartão
          vão do seu navegador direto para a operadora: eles não passam pelos
          nossos servidores nem ficam no nosso banco de dados. Os dados de
          cobrança que você preenche (documento, telefone e endereço) são
          enviados à operadora para emitir a cobrança.
        </p>
        <p style={p}>
          Os preços podem mudar. Uma mudança de preço é avisada com
          antecedência e vale a partir do ciclo seguinte — se você não
          concordar, pode cancelar antes, sem custo.
        </p>
      </Secao>

      <Secao id="cancelamento" titulo="7. Cancelamento">
        <p>
          <b>Você cancela quando quiser, pela própria tela de assinatura, e não
          há multa, taxa de cancelamento nem prazo de fidelidade.</b> Não é
          preciso pedir autorização, ligar ou justificar.
        </p>
        <p style={p}>O que acontece quando você cancela:</p>
        <ul style={lista}>
          <li>a próxima cobrança simplesmente não acontece;</li>
          <li>
            o período que você já pagou continua disponível até o fim dele;
          </li>
          <li>
            sua conta e seus eventos continuam existindo — você volta quando
            quiser, assinando de novo;
          </li>
          <li>
            o mês em curso não é devolvido de forma proporcional, salvo quando a
            lei determinar de outra forma.
          </li>
        </ul>
      </Secao>

      <Secao id="cobranca-recusada" titulo="8. Quando a cobrança não passa">
        <p>
          Se a operadora recusar a cobrança, avisamos na tela e você pode
          atualizar o cartão. Não bloqueamos o que já existe por causa de uma
          cobrança recusada. Se a situação não for regularizada, podemos limitar
          a criação de novos eventos e de novos acessos até que ela seja — e,
          em caso de inadimplência prolongada, encerrar a assinatura, sempre com
          aviso antes.
        </p>
      </Secao>

      <Secao id="disponibilidade" titulo="9. Disponibilidade, suporte e mudanças no sistema">
        <p>
          Trabalhamos para que o sistema esteja disponível e rápido, mas ele
          depende de internet e de serviços de terceiros e, como todo software,
          pode ter interrupções — inclusive paradas programadas para manutenção,
          que procuramos fazer nos horários de menor uso.
        </p>
        <p style={p}>
          O suporte é feito pelo e-mail no fim desta página e respondido no
          menor prazo que conseguirmos.
        </p>
        <p style={p}>
          O sistema evolui: funções são acrescentadas, melhoradas e, quando
          deixam de fazer sentido, retiradas. Se uma mudança afetar de forma
          relevante o modo como você trabalha, avisamos antes.
        </p>
      </Secao>

      <Secao id="responsabilidades" titulo="10. Responsabilidades e limites">
        <p>
          O eorganizei é uma ferramenta de organização. <b>O evento é seu</b>: as
          decisões, os contratos com fornecedores, os valores combinados, o
          cumprimento dos horários e a relação com os seus clientes são de sua
          responsabilidade. Também é sua a responsabilidade pelo conteúdo que
          você cadastra e pelas mensagens que envia pelo sistema.
        </p>
        <p style={p}>
          Fazemos cópias de segurança regulares, mas nenhum sistema é imune a
          falhas: mantenha os documentos essenciais do seu negócio também fora
          daqui.
        </p>
        <p style={p}>
          Na medida em que a lei permitir, a nossa responsabilidade total por
          qualquer questão ligada ao serviço fica limitada ao <b>valor que você
          pagou nos doze meses anteriores</b> ao fato, e não respondemos por
          lucros cessantes, perda de oportunidade ou danos indiretos. Nada aqui
          afasta a responsabilidade por dolo ou por aquilo que a lei não permite
          limitar.
        </p>
      </Secao>

      <Secao id="encerramento" titulo="11. Quando podemos encerrar o acesso">
        <p>
          Podemos suspender ou encerrar o acesso de uma conta que descumpra
          estes termos — uso ilícito, fraude, tentativa de burlar limites,
          revenda do sistema ou compartilhamento de acesso fora da equipe.
          Sempre que for possível, avisamos antes e damos prazo para corrigir; a
          suspensão imediata fica para os casos de risco à segurança do serviço
          ou de outras contas.
        </p>
      </Secao>

      <Secao id="mudancas" titulo="12. Mudanças nestes termos">
        <p>
          Estes termos podem ser atualizados. Quando isso acontecer, publicamos a
          versão nova nesta página, com data e número de versão, e avisamos você
          por e-mail ou dentro do sistema antes de ela valer. Se você não
          concordar com a versão nova, pode cancelar a assinatura sem custo —
          continuar usando depois do aviso significa aceitá-la.
        </p>
      </Secao>

      <Secao id="foro" titulo="13. Lei aplicável e foro">
        <p>
          Estes termos são regidos pelas leis brasileiras. Para qualquer questão
          que não se resolva conversando, fica eleita {foro}, com renúncia a
          qualquer outra, por mais privilegiada que seja.
        </p>
      </Secao>

      <Secao id="contato" titulo="14. Contato">
        <p>
          Dúvidas sobre estes termos, sobre a assinatura ou sobre os seus dados:{" "}
          <a href={`mailto:${LICENCIANTE.email}`} style={{ ...link, fontWeight: 600 }}>
            {LICENCIANTE.email}
          </a>
          .
        </p>
      </Secao>

      <p
        style={{
          marginTop: 36,
          paddingTop: 16,
          borderTop: "1px solid #E6E1DA",
          fontSize: 13,
          color: "#928A81",
        }}
      >
        Versão {TERMOS_VERSAO} ·{" "}
        <a href="/privacidade" style={{ color: "#928A81", textDecoration: "underline" }}>
          Política de Privacidade
        </a>
      </p>
    </main>
  );
}

const eyebrow: React.CSSProperties = {
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#928A81",
  margin: 0,
};

const link: React.CSSProperties = { color: "#6E3F5F", textDecoration: "underline" };

const p: React.CSSProperties = { marginTop: 10 };

const lista: React.CSSProperties = {
  margin: "8px 0 0",
  paddingLeft: 20,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

function Secao({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px" }}>{titulo}</h2>
      <div style={{ color: "#3D3835" }}>{children}</div>
    </section>
  );
}
