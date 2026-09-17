// Os textos da régua de e-mails do teste grátis — sem envio e sem banco.
//
// Separados de email-ativacao.ts para poderem ser lidos (e conferidos)
// sem mandar nada a ninguém. A regra da casa vale aqui: fala do trabalho
// dela, nunca da mecânica do sistema, e sem linguagem de jogo.
//
// TODO e-mail tem UM botão com a ação escrita ("Abrir o casamento",
// "Cadastrar meu primeiro evento", "Assinar e continuar"), o endereço por
// extenso embaixo (aplicativo de e-mail que engole botão) e, quando o
// servidor conseguir gerar, a linha "entrar sem senha" — o link que abre
// a sessão dela e cai na tela certa.
//
// A régua (17/09/2026): durante o teste, dia 1, 2, 3, 5 e o fim; depois
// do teste, 2, 7, 14, 21, 30, 45, 60 e 90 dias.

import { appUrl, respostaPara } from "@/lib/email";
import { somarDias, hojeBR } from "@/lib/tempo";
import { RETA_FINAL_DIAS } from "@/lib/guia-vivo";

/** Quem assina. O endereço de envio continua o do domínio verificado. */
export const ASSINA = () => process.env.EMAIL_ATIVACAO_ASSINA?.trim() || "Geremias";
/** Para onde vai a resposta: ele lê. Sem isto, o texto aponta o Suporte. */
export const RESPONDER_PARA = () =>
  process.env.EMAIL_ATIVACAO_RESPONDER_PARA?.trim() || respostaPara();

function escapar(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function primeiroNome(nome: string | null | undefined): string {
  const p = (nome ?? "").trim().split(/\s+/)[0] ?? "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

/** 19/09 */
function diaMes(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

export function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

export function diaBR(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** O que cada e-mail precisa saber para montar o botão e o texto. */
export type DadosDoEmail = {
  nome: string;
  /** o caminho do sistema para onde o botão leva (começa com /) */
  destino?: string;
  /** link que abre a sessão dela direto na tela certa (sem senha) */
  entrarSemSenha?: string | null;
  /** link para sair da régua */
  sair?: string | null;
};

export type EmailPronto = { assunto: string; html: string; destino: string };

/**
 * A casca dos e-mails.
 *
 * Tabela e estilo em linha, sem folha externa: é o que sobrevive ao
 * Gmail, ao Outlook e ao aplicativo do celular. O desenho é o da marca —
 * marfim, tinta e ameixa (identidade-visual-eorganizei) —, com um cartão
 * branco no centro, o título em destaque, UM botão com a ação escrita, o
 * endereço por extenso embaixo (cliente que engole botão) e o rodapé com
 * a razão do envio e a saída da lista.
 */
function casca(p: {
  titulo: string;
  saudacao: string;
  paragrafos: string[];
  botao: { texto: string; caminho: string };
  /** caixa de destaque acima do botão: o número que ela precisa ver */
  destaque?: { rotulo: string; valor: string } | null;
  depois?: string[];
  entrarSemSenha?: string | null;
  sair?: string | null;
}): string {
  const base = appUrl();
  const url = `${base}${p.botao.caminho}`;
  const responde = RESPONDER_PARA();
  const ajuda = responde
    ? "Se travar em qualquer ponto, é só responder este e-mail — quem lê sou eu."
    : "Se travar em qualquer ponto, fale com a gente pelo Suporte, no menu do sistema.";
  const fonte = "font-family:'Segoe UI',system-ui,-apple-system,Helvetica,Arial,sans-serif";
  const par = (t: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#3A3430;${fonte}">${t}</p>`;

  return `
<div style="background:#F1ECE6;padding:28px 12px;${fonte}">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto">
    <tr>
      <td style="background:#FFFFFF;border:1px solid #E7E0D8;border-radius:16px;padding:32px 32px 28px">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-size:17px;font-weight:700;letter-spacing:-0.02em;color:#221E1B;${fonte}">
              <span style="color:#6E3F5F">e</span>organizei
            </td>
            <td align="right" style="font-size:12px;color:#928A81;${fonte}">teste grátis</td>
          </tr>
        </table>
        <div style="height:1px;background:#EFE9E2;margin:18px 0 22px"></div>

        <h1 style="margin:0 0 18px;font-size:23px;line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:#221E1B;${fonte}">${escapar(p.titulo)}</h1>
        ${par(p.saudacao)}
        ${p.paragrafos.map(par).join("")}
        ${
          p.destaque
            ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px">
                 <tr><td style="background:#F6F1F4;border:1px solid #E7D9E3;border-radius:12px;padding:16px 18px">
                   <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8A7C85;${fonte}">${escapar(p.destaque.rotulo)}</div>
                   <div style="margin-top:4px;font-size:18px;font-weight:700;color:#6E3F5F;${fonte}">${escapar(p.destaque.valor)}</div>
                 </td></tr>
               </table>`
            : ""
        }

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 14px">
          <tr>
            <td align="center" bgcolor="#6E3F5F" style="border-radius:10px">
              <a href="${url}" style="display:inline-block;padding:15px 30px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;${fonte}">${escapar(p.botao.texto)} &nbsp;›</a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 ${p.entrarSemSenha ? "8px" : "20px"};font-size:12px;line-height:1.5;color:#928A81;word-break:break-all;${fonte}">
          Ou copie e cole no navegador: <a href="${url}" style="color:#8A7C85">${escapar(url)}</a>
        </p>
        ${
          p.entrarSemSenha
            ? `<p style="margin:0 0 20px;font-size:13px;line-height:1.5;${fonte}"><a href="${p.entrarSemSenha}" style="color:#6E3F5F;font-weight:600">Entrar sem digitar senha</a> <span style="color:#928A81">— link só seu, some depois de algumas horas</span></p>`
            : ""
        }

        ${(p.depois ?? []).map(par).join("")}
        ${par(ajuda)}

        <div style="height:1px;background:#EFE9E2;margin:22px 0 18px"></div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width:40px;height:40px;background:#F6F1F4;border-radius:999px;text-align:center;font-size:15px;font-weight:700;color:#6E3F5F;${fonte}">${escapar((ASSINA()[0] ?? "G").toUpperCase())}</td>
            <td style="padding-left:12px;${fonte}">
              <div style="font-size:15px;font-weight:600;color:#221E1B">${escapar(ASSINA())}</div>
              <div style="font-size:13px;color:#928A81">quem construiu o eOrganizei</div>
            </td>
          </tr>
        </table>

      </td>
    </tr>
    <tr>
      <td style="padding:18px 8px 0;text-align:center;font-size:12px;line-height:1.6;color:#9A928A;${fonte}">
        Você recebe este e-mail porque abriu um teste grátis no eOrganizei.${
          p.sair ? `<br><a href="${p.sair}" style="color:#9A928A">Não quero mais receber estes e-mails</a>` : ""
        }
      </td>
    </tr>
  </table>
</div>`;
}

export type EventoDela = {
  id: string;
  type: string;
  date: string | null;
  /** nasceu com Planejamento? Sem ele, a tela de planejamento é vazia */
  temMetodo?: boolean;
};

// Como o evento se chama numa frase. "O seu debutante" não serve —
// debutante é a pessoa —, e nem todo tipo é masculino singular.
const NOME_DO_EVENTO: Record<string, string> = {
  casamento: "o casamento",
  debutante: "os 15 anos",
  formatura: "a formatura",
  aniversario: "o aniversário",
  corporativo: "o evento corporativo",
  cha_revelacao: "o chá revelação",
  batizado: "o batizado",
  bodas: "as bodas",
  show: "o show",
  outro: "o evento",
};

function maiuscula(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function prazo(d: number): string {
  return d === 0 ? "horas" : `${d} ${d === 1 ? "dia" : "dias"}`;
}

/** "o casamento de 12/06" */
function comoChamar(evento: EventoDela | null): string {
  if (!evento) return "o seu evento";
  const nome = NOME_DO_EVENTO[evento.type] ?? "o evento";
  return evento.date ? `${nome} de ${diaMes(evento.date)}` : nome;
}

/* ------------------------------------------------------------------ */
/* Durante o teste                                                     */
/* ------------------------------------------------------------------ */

export function htmlBoasVindas(
  d: DadosDoEmail & { termina: string | null; eventos3m: string | null }
): EmailPronto {
  const n = primeiroNome(d.nome);
  const semEvento = d.eventos3m === "nenhum";
  const destino = "/eventos/novo";
  return {
    destino,
    assunto: n ? `${n}, sua conta no eOrganizei está aberta` : "Sua conta no eOrganizei está aberta",
    html: casca({
      titulo: "Sua conta está aberta",
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}! Aqui é o ${escapar(ASSINA())}, eu construí o eOrganizei.`,
      paragrafos: [
        `Seu teste vai até <strong>${d.termina ? diaMes(d.termina) : "o fim da semana"}</strong>, sem cartão e sem cobrança no fim.`,
        semEvento
          ? "Comece pelo próximo evento que você for fechar — mesmo ainda em orçamento. Tipo, data e o nome da cliente bastam; o resto nasce dentro dele."
          : "Comece por um evento que você já está organizando. Se ele acontece nas próximas semanas, o que mais economiza tempo é o roteiro do dia: cada fornecedor recebe um link com a parte dele, no celular.",
      ],
      destaque: d.termina ? { rotulo: "Seu teste vai até", valor: diaMes(d.termina) } : null,
      botao: { texto: "Cadastrar meu primeiro evento", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** Dia 1 — não voltou e ainda não tem evento. */
export function htmlDia1(d: DadosDoEmail): EmailPronto {
  const n = primeiroNome(d.nome);
  const destino = "/eventos/novo";
  return {
    destino,
    assunto: n ? `${n}, dois minutos e o sistema começa a trabalhar` : "Dois minutos e o sistema começa a trabalhar",
    html: casca({
      titulo: "Dois minutos e o sistema começa a trabalhar",
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        "Você abriu a conta ontem e ela ainda está vazia. Nada acontece antes do primeiro evento — é ele que abre o roteiro do dia, os fornecedores e o financeiro.",
        "São três campos: tipo, data e o nome da cliente. Dois minutos, e dá para usar um evento que você já está organizando.",
      ],
      botao: { texto: "Cadastrar meu primeiro evento", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** Dia 2 — o próximo passo DO evento dela. */
export function htmlDia2(d: DadosDoEmail & { evento: EventoDela | null; hoje: string }): EmailPronto {
  const n = primeiroNome(d.nome);
  const oi = `Oi${n ? `, ${escapar(n)}` : ""}!`;
  const { evento, hoje } = d;

  if (!evento) {
    const destino = "/eventos/novo";
    return {
      destino,
      assunto: n ? `${n}, qual é o seu próximo evento?` : "Qual é o seu próximo evento?",
      html: casca({
        titulo: "Qual é o seu próximo evento?",
        saudacao: oi,
        paragrafos: [
          "Faz dois dias que você abriu a conta, e ela ainda está sem nenhum evento.",
          "Cadastrar um leva dois minutos: tipo, data e o nome da cliente. Fornecedores, roteiro do dia e financeiro nascem dentro dele — é com um evento de verdade que dá para ver se o sistema serve para você.",
        ],
        botao: { texto: "Cadastrar meu primeiro evento", caminho: destino },
        entrarSemSenha: d.entrarSemSenha,
        sair: d.sair,
      }),
    };
  }

  const nomeDoEvento = NOME_DO_EVENTO[evento.type] ?? "o evento";
  const faltam = evento.date ? diasEntre(hoje, evento.date.slice(0, 10)) : null;
  const quando = evento.date ? ` de ${diaMes(evento.date)}` : "";
  const assunto = `${maiuscula(nomeDoEvento)}${quando}: o próximo passo`;

  if (faltam !== null && faltam >= 0 && faltam <= RETA_FINAL_DIAS) {
    const destino = `/eventos/${evento.id}/fornecedores`;
    return {
      destino,
      assunto,
      html: casca({
        titulo: `${maiuscula(nomeDoEvento)}${quando}`,
        saudacao: oi,
        paragrafos: [
          `Faltam <strong>${prazo(faltam)}</strong> para ${escapar(nomeDoEvento)}${quando}.`,
          "Nessa reta, o que mais tira mensagem do seu WhatsApp é o roteiro do dia: vincule os fornecedores do evento, diga quem faz cada horário e mande para cada um o link com a parte dele. Mudou um horário? O link dele já mostra o novo.",
        ],
        botao: { texto: "Abrir os fornecedores do evento", caminho: destino },
        entrarSemSenha: d.entrarSemSenha,
        sair: d.sair,
      }),
    };
  }

  if (faltam !== null && faltam > RETA_FINAL_DIAS) {
    // Sem método, o Planejamento é uma tela vazia — o mesmo beco que o
    // guia já teve (PASSOS_SEM_METODO). Aí o passo é a tarefa com prazo.
    if (evento.temMetodo === false) {
      const destino = `/eventos/${evento.id}/organizacao`;
      return {
        destino,
        assunto,
        html: casca({
          titulo: `${maiuscula(nomeDoEvento)}${quando}`,
          saudacao: oi,
          paragrafos: [
            `Faltam ${prazo(faltam)} para ${escapar(nomeDoEvento)}${quando}.`,
            "Anote o que precisa ser resolvido e até quando: cada tarefa ganha prazo e aparece para você no dia certo, sem depender de memória.",
          ],
          botao: { texto: "Abrir as tarefas do evento", caminho: destino },
          entrarSemSenha: d.entrarSemSenha,
          sair: d.sair,
        }),
      };
    }
    const destino = `/eventos/${evento.id}/planejamento`;
    return {
      destino,
      assunto,
      html: casca({
        titulo: `${maiuscula(nomeDoEvento)}${quando}`,
        saudacao: oi,
        paragrafos: [
          `Faltam ${prazo(faltam)} para ${escapar(nomeDoEvento)}${quando} — é o tempo em que as decisões se acumulam.`,
          "No Planejamento, cada decisão que você marca como tomada vira tarefa com prazo, e o evento mostra sozinho o que está atrasado. Comece pelo que você já resolveu com a cliente.",
        ],
        botao: { texto: "Abrir o planejamento do evento", caminho: destino },
        entrarSemSenha: d.entrarSemSenha,
        sair: d.sair,
      }),
    };
  }

  // evento que já passou, ou sem data
  const destino = "/eventos/novo";
  return {
    destino,
    assunto: n ? `${n}, qual é o seu próximo evento?` : "Qual é o seu próximo evento?",
    html: casca({
      titulo: "Qual é o seu próximo evento?",
      saudacao: oi,
      paragrafos: [
        "Vi que você já cadastrou um evento por aqui.",
        "Se tem outro pela frente, cadastre também: é num evento que ainda vai acontecer que o roteiro do dia, os fornecedores e o financeiro mostram para que servem.",
      ],
      botao: { texto: "Cadastrar o próximo evento", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** Dia 3 — a vitrine: o link que traz cliente novo. */
export function htmlDia3(d: DadosDoEmail & { termina: string | null }): EmailPronto {
  const n = primeiroNome(d.nome);
  const destino = "/orcamentos/pagina";
  return {
    destino,
    assunto: n ? `${n}, seu endereço para receber pedidos de orçamento` : "Seu endereço para receber pedidos de orçamento",
    html: casca({
      titulo: "O seu endereço para receber pedidos",
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        "Tem uma parte do sistema que trabalha por fora: a sua <strong>Vitrine profissional</strong>. É uma página com o seu nome no endereço, com as suas fotos, os seus serviços e um formulário de orçamento.",
        "Quem pede orçamento por ali cai direto na sua Gestão comercial, e você responde com a proposta já preenchida — sem digitar de novo o que a pessoa escreveu.",
        d.termina ? `Publicar leva uns minutos, e o teste vai até <strong>${diaMes(d.termina)}</strong>.` : "Publicar leva uns minutos.",
      ],
      botao: { texto: "Publicar minha vitrine", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** Dia 5 — faltam 2 dias, e o preço aparece pela primeira vez. */
export function htmlDia5(d: DadosDoEmail & { termina: string; hoje: string; evento: EventoDela | null }): EmailPronto {
  const n = primeiroNome(d.nome);
  const faltam = diasEntre(d.hoje, d.termina);
  const destino = d.evento ? `/eventos/${d.evento.id}` : "/eventos/novo";
  return {
    destino,
    assunto: `Faltam ${prazo(faltam)} de teste — e o que vem depois`,
    html: casca({
      titulo: `Faltam ${prazo(faltam)} de teste`,
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        `Seu teste vai até <strong>${diaMes(d.termina)}</strong>. Depois dele, continuar custa <strong>R$ 27,90 por mês nos três primeiros meses</strong> e R$ 59,90 a partir do quarto. Sem fidelidade: cancela quando quiser.`,
        d.evento
          ? `Antes disso, aproveite os dias que faltam em ${escapar(comoChamar(d.evento))} — é usando num evento de verdade que dá para decidir.`
          : "Antes disso, cadastre um evento que você já está organizando: é o que mostra, em minutos, se o sistema serve para você.",
      ],
      destaque: { rotulo: "Depois do teste", valor: "R$ 27,90/mês nos 3 primeiros meses" },
      botao: { texto: d.evento ? "Abrir o meu evento" : "Cadastrar meu evento", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** O último dia do teste: o convite para assinar. */
export function htmlFimTeste(d: DadosDoEmail & { termina: string; hoje: string; eventos: number }): EmailPronto {
  const n = primeiroNome(d.nome);
  const faltam = diasEntre(d.hoje, d.termina);
  const quando = faltam <= 0 ? "hoje" : faltam === 1 ? "amanhã" : `em ${faltam} dias`;
  const responde = RESPONDER_PARA();
  const destino = "/assinatura";
  return {
    destino,
    assunto: `Seu teste do eOrganizei termina ${quando}`,
    html: casca({
      titulo: `Seu teste termina ${quando}`,
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        `Seu teste vai até <strong>${diaMes(d.termina)}</strong>. Para continuar, são <strong>R$ 27,90 por mês nos três primeiros meses</strong> e R$ 59,90 a partir do quarto, sem fidelidade e com cancelamento em um clique.`,
        d.eventos > 0
          ? `O que você cadastrou (${d.eventos} ${d.eventos === 1 ? "evento" : "eventos"}) continua salvo: assinando, você segue exatamente de onde parou.`
          : "Tudo o que você cadastrar continua com você.",
      ],
      destaque: { rotulo: "Para continuar", valor: "R$ 27,90/mês nos 3 primeiros meses" },
      botao: { texto: "Assinar e continuar", caminho: destino },
      depois: responde
        ? ["Não deu tempo de testar com um evento de verdade? Responda este e-mail que eu estendo o seu teste."]
        : [],
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Depois do teste                                                     */
/* ------------------------------------------------------------------ */

/** +2 dias: o teste acabou e os dados continuam lá. */
export function htmlPos2(d: DadosDoEmail & { eventos: number }): EmailPronto {
  const n = primeiroNome(d.nome);
  const destino = "/assinatura";
  return {
    destino,
    assunto: n ? `${n}, seus eventos continuam guardados` : "Seus eventos continuam guardados",
    html: casca({
      titulo: "Seus eventos continuam guardados",
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        "Seu teste terminou. Nada foi apagado: " +
          (d.eventos > 0
            ? `${d.eventos === 1 ? "o evento" : `os ${d.eventos} eventos`} que você cadastrou ${d.eventos === 1 ? "está" : "estão"} exatamente como você deixou.`
            : "sua conta continua do jeito que você deixou."),
        "Assinando, a porta reabre na hora: R$ 27,90 por mês nos três primeiros meses, R$ 59,90 depois, sem fidelidade.",
      ],
      botao: { texto: "Reabrir a minha conta", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** +7 dias: a vitrine, o argumento de cliente novo. */
export function htmlPos7(d: DadosDoEmail): EmailPronto {
  const n = primeiroNome(d.nome);
  const destino = "/orcamentos/pagina";
  return {
    destino,
    assunto: "O link que traz pedido de orçamento enquanto você trabalha",
    html: casca({
      titulo: "O link que traz pedido enquanto você trabalha",
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        "Uma coisa que talvez você não tenha visto no teste: a <strong>Vitrine profissional</strong>. Um endereço com o seu nome, com as suas fotos, os seus serviços e um formulário.",
        "O pedido que chega por ali vira proposta pronta em um clique, e a cliente aceita e assina pelo celular. O evento nasce do aceite, já com data e contrato.",
      ],
      botao: { texto: "Ver como fica a minha vitrine", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** +14 dias: ajuda de gente, não de sistema. */
export function htmlPos14(d: DadosDoEmail & { eventos: number }): EmailPronto {
  const n = primeiroNome(d.nome);
  const destino = d.eventos > 0 ? "/eventos" : "/eventos/novo";
  return {
    destino,
    assunto: n ? `${n}, quer que eu monte o seu primeiro evento com você?` : "Quer que eu monte o seu primeiro evento com você?",
    html: casca({
      titulo: "Quer que eu monte o seu primeiro evento?",
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        "Sei que parar para aprender sistema novo no meio da temporada é difícil.",
        "Me responda com o evento mais próximo que você tem — tipo, data e cidade — e eu deixo ele montado na sua conta: fornecedores, roteiro do dia e as tarefas com prazo. Você entra e vê pronto.",
      ],
      botao: { texto: "Abrir a minha conta", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** +21 dias: conteúdo, sem venda. */
export function htmlPos21(d: DadosDoEmail): EmailPronto {
  const n = primeiroNome(d.nome);
  const destino = "/orcamentos/modelos";
  return {
    destino,
    assunto: "Como fechar orçamento sem perder dinheiro no 'por convidado'",
    html: casca({
      titulo: "O item esquecido que come a sua margem",
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        "Hoje sem venda nenhuma, só uma coisa que ajuda: a maior parte do prejuízo de cerimonialista não vem do preço do pacote, vem do que não foi contado — assistente extra, transporte, hora a mais de equipe.",
        "No eOrganizei existe um lugar para isso: os <strong>modelos de preço</strong>. Você cadastra o que cobra (valor fixo ou por convidado) e cada proposta sai com esses números, sem calculadora e sem esquecer item.",
      ],
      botao: { texto: "Ver os modelos de preço", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** +30 dias: a reativação com prazo. */
export function htmlPos30(d: DadosDoEmail): EmailPronto {
  const n = primeiroNome(d.nome);
  const destino = "/assinatura";
  return {
    destino,
    assunto: n ? `${n}, a condição de lançamento ainda está de pé` : "A condição de lançamento ainda está de pé",
    html: casca({
      titulo: "A condição de lançamento ainda está de pé",
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        "Faz um mês que o seu teste terminou, e a sua conta continua aqui, com tudo o que você cadastrou.",
        "A condição de lançamento — <strong>R$ 27,90 por mês nos três primeiros meses</strong>, R$ 59,90 depois — vale para as primeiras cerimonialistas que entrarem. Enquanto ela estiver de pé, é assim que a sua conta reabre.",
      ],
      destaque: { rotulo: "Condição de lançamento", valor: "R$ 27,90/mês nos 3 primeiros meses" },
      botao: { texto: "Assinar por R$ 27,90", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** +45 dias: o que mudou desde que ela saiu. */
export function htmlPos45(d: DadosDoEmail): EmailPronto {
  const n = primeiroNome(d.nome);
  const destino = "/eventos/dashboard";
  return {
    destino,
    assunto: "O que entrou no eOrganizei desde que você testou",
    html: casca({
      titulo: "O que entrou desde que você testou",
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        "O sistema não parou: entraram a <strong>Vitrine profissional</strong> com pedido de orçamento, a proposta que a cliente assina pelo celular, o check-in dos convidados por QR code e um assistente que responde sobre o evento (\"quanto falta receber?\", \"o que vence esta semana?\").",
        "Se alguma dessas era o que faltava para você, vale uma segunda olhada — a sua conta está do jeito que você deixou.",
      ],
      botao: { texto: "Ver o que mudou", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** +60 dias: uma pergunta, resposta de uma linha. */
export function htmlPos60(d: DadosDoEmail): EmailPronto {
  const n = primeiroNome(d.nome);
  const destino = "/eventos/dashboard";
  return {
    destino,
    assunto: n ? `${n}, o que faltou?` : "O que faltou?",
    html: casca({
      titulo: "O que faltou?",
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        "Você testou o eOrganizei e não continuou. Eu queria saber por quê — e uma linha já me ajuda: preço, faltou tempo, faltou alguma função, ou não é para o seu tipo de trabalho?",
        "É só responder este e-mail. Quem lê sou eu, e o que você disser entra na lista do que eu construo.",
      ],
      botao: { texto: "Abrir a minha conta", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** +90 dias: a última, e a porta de saída. */
export function htmlPos90(d: DadosDoEmail): EmailPronto {
  const n = primeiroNome(d.nome);
  const destino = "/assinatura";
  return {
    destino,
    assunto: "Última mensagem sobre o seu teste",
    html: casca({
      titulo: "Última mensagem sobre o seu teste",
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        "Esta é a última mensagem que eu mando sobre o seu teste — não quero ocupar a sua caixa de entrada.",
        "Sua conta continua guardada. Se um dia a temporada apertar e você quiser tudo num lugar só, é só assinar: R$ 27,90 nos três primeiros meses e R$ 59,90 depois, sem fidelidade.",
      ],
      botao: { texto: "Reabrir a minha conta", caminho: destino },
      entrarSemSenha: d.entrarSemSenha,
      sair: d.sair,
    }),
  };
}

/** Só para quem quiser ver os textos sem mandar nada (rota de prévia). */
export function previaDosEmails(hoje = hojeBR()) {
  const termina = somarDias(hoje, 4);
  const base: DadosDoEmail = { nome: "Marina Alves", entrarSemSenha: "#", sair: "#" };
  const evento: EventoDela = { id: "EVENTO", type: "casamento", date: somarDias(hoje, 10) };
  return {
    boas_vindas: htmlBoasVindas({ ...base, termina, eventos3m: "3-5" }),
    dia_1: htmlDia1(base),
    dia_2_sem_evento: htmlDia2({ ...base, evento: null, hoje }),
    dia_2_reta_final: htmlDia2({ ...base, evento, hoje }),
    dia_2_distante: htmlDia2({ ...base, evento: { id: "EVENTO", type: "debutante", date: somarDias(hoje, 120), temMetodo: true }, hoje }),
    dia_3: htmlDia3({ ...base, termina }),
    dia_5: htmlDia5({ ...base, termina, hoje, evento }),
    fim_teste: htmlFimTeste({ ...base, termina: somarDias(hoje, 1), hoje, eventos: 2 }),
    pos_2: htmlPos2({ ...base, eventos: 2 }),
    pos_7: htmlPos7(base),
    pos_14: htmlPos14({ ...base, eventos: 1 }),
    pos_21: htmlPos21(base),
    pos_30: htmlPos30(base),
    pos_45: htmlPos45(base),
    pos_60: htmlPos60(base),
    pos_90: htmlPos90(base),
  };
}
