// Os textos da régua de e-mails do teste grátis — sem envio e sem banco.
//
// Separados de email-ativacao.ts para poderem ser lidos (e conferidos)
// sem mandar nada a ninguém.
//
// COMO ESCREVER AQUI (regra dele, 17/09/2026):
//   · quem fala é a EMPRESA. Nada de "aqui é o Geremias, eu construí o
//     eOrganizei" — é CNPJ, não conversa pessoal;
//   · direto ao ponto: uma ou duas frases curtas e o botão. Lenga-lenga
//     não converte;
//   · fala do trabalho dela, nunca da mecânica do sistema, e sem
//     linguagem de jogo.
//
// Todo e-mail tem UM botão com a ação escrita e o endereço por extenso
// embaixo (cliente de e-mail que engole botão). Quem estiver deslogada
// cai no login e volta ao destino (o `?next=` do middleware).
//
// A régua: durante o teste, dia 1, 2, 3, 5 e o fim; depois do teste, 2,
// 7, 14, 21, 30, 45, 60 e 90 dias.

import { appUrl, respostaPara } from "@/lib/email";
import { somarDias, hojeBR } from "@/lib/tempo";
import { RETA_FINAL_DIAS } from "@/lib/guia-vivo";

/**
 * O nome que aparece na caixa de entrada. É a EMPRESA: a pessoa aparece
 * no Instagram, não no e-mail (regra dele, 17/09/2026).
 */
export const REMETENTE = () => process.env.EMAIL_ATIVACAO_ASSINA?.trim() || "eOrganizei";
/** Para onde vai a resposta. Sem isto, o texto aponta o Suporte. */
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
  /** link para sair da régua */
  sair?: string | null;
};

export type EmailPronto = { assunto: string; html: string; destino: string };

/**
 * O teste com cartão (21/09/2026): a cobrança já está agendada na
 * operadora. Com isto, o e-mail diz o dia e o valor em vez de pedir para
 * assinar — e diz onde cancelar, para quem não quiser continuar.
 */
export type CobrancaAgendada = {
  /** o dia da primeira cobrança, YYYY-MM-DD */
  dia: string;
  valor: number;
  /** os quatro últimos dígitos do cartão, quando a operadora devolveu */
  cartao?: string | null;
  /** a escada inteira ("R$ 27,90/mês nos 3 primeiros meses, depois R$ 59,90"); sem ela, só o valor */
  preco?: string | null;
  /** a operadora recusou a primeira cobrança (o webhook anotou) */
  recusada?: boolean;
};

function reaisTexto(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

function noCartao(c: CobrancaAgendada): string {
  return c.cartao ? ` no cartão final ${escapar(c.cartao)}` : " no cartão cadastrado";
}

/** O preço inteiro: a escada quando há promoção, não só o degrau de entrada. */
function precoDaCobranca(c: CobrancaAgendada): string {
  return c.preco ?? `${reaisTexto(c.valor)}/mês`;
}

const PRECO = "R$ 27,90/mês nos 3 primeiros meses, R$ 59,90 depois";

/**
 * A casca dos e-mails.
 *
 * Tabela e estilo em linha, sem folha externa: é o que sobrevive ao
 * Gmail, ao Outlook e ao aplicativo do celular. Cartão branco sobre
 * marfim, título, texto curto, caixa de destaque quando há um número que
 * ela precisa ver, UM botão e o rodapé com a saída da lista.
 */
export function casca(p: {
  titulo: string;
  saudacao: string;
  paragrafos: string[];
  botao: { texto: string; caminho: string };
  destaque?: { rotulo: string; valor: string } | null;
  depois?: string[];
  sair?: string | null;
}): string {
  const base = appUrl();
  const url = `${base}${p.botao.caminho}`;
  const fonte = "font-family:'Segoe UI',system-ui,-apple-system,Helvetica,Arial,sans-serif";
  const par = (t: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3A3430;${fonte}">${t}</p>`;

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
            <td align="right" style="font-size:12px;color:#928A81;${fonte}">seu teste</td>
          </tr>
        </table>
        <div style="height:1px;background:#EFE9E2;margin:18px 0 22px"></div>

        <h1 style="margin:0 0 16px;font-size:23px;line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:#221E1B;${fonte}">${escapar(p.titulo)}</h1>
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

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 12px">
          <tr>
            <td align="center" bgcolor="#6E3F5F" style="border-radius:10px">
              <a href="${url}" style="display:inline-block;padding:15px 30px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;${fonte}">${escapar(p.botao.texto)} &nbsp;›</a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 20px;font-size:12px;line-height:1.5;color:#928A81;word-break:break-all;${fonte}">
          Se o botão não abrir: <a href="${url}" style="color:#8A7C85">${escapar(url)}</a>
        </p>

        ${(p.depois ?? []).map(par).join("")}

        <div style="height:1px;background:#EFE9E2;margin:22px 0 16px"></div>
        <p style="margin:0;font-size:14px;font-weight:600;color:#221E1B;${fonte}">
          <span style="color:#6E3F5F">e</span>organizei
        </p>

      </td>
    </tr>
    <tr>
      <td style="padding:18px 8px 0;text-align:center;font-size:12px;line-height:1.6;color:#9A928A;${fonte}">
        Você recebe este e-mail porque abriu um teste no eOrganizei.${
          p.sair ? `<br><a href="${p.sair}" style="color:#9A928A">Não quero mais receber</a>` : ""
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

const oi = (nome: string) => {
  const n = primeiroNome(nome);
  return `Oi${n ? `, ${escapar(n)}` : ""}!`;
};

/* ------------------------------------------------------------------ */
/* Durante o teste                                                     */
/* ------------------------------------------------------------------ */

export function htmlBoasVindas(
  d: DadosDoEmail & { termina: string | null; eventos3m: string | null; cobranca?: CobrancaAgendada | null }
): EmailPronto {
  const n = primeiroNome(d.nome);
  const destino = "/eventos/novo";
  return {
    destino,
    assunto: n ? `${n}, sua conta está aberta` : "Sua conta está aberta",
    html: casca({
      titulo: "Sua conta está aberta",
      saudacao: oi(d.nome),
      paragrafos: [
        "Comece por um evento que você já está organizando: tipo, data e o nome da cliente. Roteiro, fornecedores e financeiro nascem dentro dele.",
      ],
      destaque: d.termina
        ? d.cobranca
          ? {
              rotulo: "Seu teste vai até",
              valor: `${diaMes(d.termina)} · primeira cobrança ${diaMes(d.cobranca.dia)}, ${reaisTexto(d.cobranca.valor)}`,
            }
          : { rotulo: "Seu teste vai até", valor: `${diaMes(d.termina)}, sem cartão` }
        : null,
      botao: { texto: "Cadastrar meu primeiro evento", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** Dia 1 — não voltou e ainda não tem evento. */
export function htmlDia1(d: DadosDoEmail): EmailPronto {
  const destino = "/eventos/novo";
  return {
    destino,
    assunto: "Sua conta ainda está vazia",
    html: casca({
      titulo: "Dois minutos para começar",
      saudacao: oi(d.nome),
      paragrafos: [
        "Nada acontece antes do primeiro evento: é ele que abre o roteiro do dia, os fornecedores e o financeiro.",
        "São três campos: tipo, data e o nome da cliente.",
      ],
      botao: { texto: "Cadastrar meu primeiro evento", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** Dia 2 — o próximo passo DO evento dela. */
export function htmlDia2(d: DadosDoEmail & { evento: EventoDela | null; hoje: string }): EmailPronto {
  const n = primeiroNome(d.nome);
  const { evento, hoje } = d;

  if (!evento) {
    const destino = "/eventos/novo";
    return {
      destino,
      assunto: n ? `${n}, qual é o seu próximo evento?` : "Qual é o seu próximo evento?",
      html: casca({
        titulo: "Qual é o seu próximo evento?",
        saudacao: oi(d.nome),
        paragrafos: [
          "Sua conta está sem evento nenhum. É num evento de verdade que dá para ver se o sistema serve para você.",
        ],
        botao: { texto: "Cadastrar meu primeiro evento", caminho: destino },
        sair: d.sair,
      }),
    };
  }

  const nomeDoEvento = NOME_DO_EVENTO[evento.type] ?? "o evento";
  const faltam = evento.date ? diasEntre(hoje, evento.date.slice(0, 10)) : null;
  const quando = evento.date ? ` de ${diaMes(evento.date)}` : "";
  const titulo = `${maiuscula(nomeDoEvento)}${quando}`;

  if (faltam !== null && faltam >= 0 && faltam <= RETA_FINAL_DIAS) {
    const destino = `/eventos/${evento.id}/fornecedores`;
    return {
      destino,
      assunto: `${titulo}: o próximo passo`,
      html: casca({
        titulo,
        saudacao: oi(d.nome),
        paragrafos: [
          `Faltam <strong>${prazo(faltam)}</strong>.`,
          "Vincule os fornecedores e mande para cada um o link com a parte dele no roteiro. Mudou um horário, o link já mostra o novo.",
        ],
        botao: { texto: "Abrir os fornecedores do evento", caminho: destino },
        sair: d.sair,
      }),
    };
  }

  if (faltam !== null && faltam > RETA_FINAL_DIAS) {
    // Sem método, o Planejamento é uma tela vazia: aí o passo é a tarefa.
    if (evento.temMetodo === false) {
      const destino = `/eventos/${evento.id}/organizacao`;
      return {
        destino,
        assunto: `${titulo}: o próximo passo`,
        html: casca({
          titulo,
          saudacao: oi(d.nome),
          paragrafos: [
            `Faltam ${prazo(faltam)}.`,
            "Anote o que precisa ser resolvido e até quando. Cada tarefa aparece no dia certo, sem depender de memória.",
          ],
          botao: { texto: "Abrir as tarefas do evento", caminho: destino },
          sair: d.sair,
        }),
      };
    }
    const destino = `/eventos/${evento.id}/planejamento`;
    return {
      destino,
      assunto: `${titulo}: o próximo passo`,
      html: casca({
        titulo,
        saudacao: oi(d.nome),
        paragrafos: [
          `Faltam ${prazo(faltam)} — o tempo em que as decisões se acumulam.`,
          "Cada decisão marcada como tomada vira tarefa com prazo, e o evento mostra sozinho o que está atrasado.",
        ],
        botao: { texto: "Abrir o planejamento do evento", caminho: destino },
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
      saudacao: oi(d.nome),
      paragrafos: [
        "É num evento que ainda vai acontecer que o roteiro do dia, os fornecedores e o financeiro mostram para que servem.",
      ],
      botao: { texto: "Cadastrar o próximo evento", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** Dia 3 — a vitrine: o link que traz cliente novo. */
export function htmlDia3(d: DadosDoEmail & { termina: string | null }): EmailPronto {
  const destino = "/orcamentos/pagina";
  return {
    destino,
    assunto: "Seu endereço para receber pedidos de orçamento",
    html: casca({
      titulo: "Seu endereço para receber pedidos",
      saudacao: oi(d.nome),
      paragrafos: [
        "A <strong>Vitrine profissional</strong> é uma página com o seu nome no endereço, as suas fotos, os seus serviços e um formulário.",
        "O pedido cai na sua Gestão comercial e vira proposta já preenchida.",
      ],
      botao: { texto: "Publicar minha vitrine", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** Dia 5 — faltam 2 dias, e o preço aparece pela primeira vez. */
export function htmlDia5(
  d: DadosDoEmail & { termina: string; hoje: string; evento: EventoDela | null; cobranca?: CobrancaAgendada | null }
): EmailPronto {
  const faltam = diasEntre(d.hoje, d.termina);
  const destino = d.evento ? `/eventos/${d.evento.id}` : "/eventos/novo";
  return {
    destino,
    assunto: `Faltam ${prazo(faltam)} de teste`,
    html: casca({
      titulo: `Faltam ${prazo(faltam)} de teste`,
      saudacao: oi(d.nome),
      paragrafos: d.cobranca
        ? [
            `Seu teste vai até <strong>${diaMes(d.termina)}</strong>. Em ${diaMes(d.cobranca.dia)} sai a primeira cobrança${noCartao(d.cobranca)}, e a conta segue aberta sem você fazer nada.`,
            "Não quer continuar? Cancele em Assinatura antes disso e nada é cobrado.",
          ]
        : [`Seu teste vai até <strong>${diaMes(d.termina)}</strong>. Depois dele, continuar custa:`],
      destaque: d.cobranca
        ? { rotulo: `A partir de ${diaMes(d.cobranca.dia)}`, valor: precoDaCobranca(d.cobranca) }
        : { rotulo: "Depois do teste", valor: PRECO },
      botao: { texto: d.evento ? "Abrir o meu evento" : "Cadastrar meu evento", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** A véspera: amanhã o teste acaba. */
export function htmlFimTeste(
  d: DadosDoEmail & { termina: string; hoje: string; eventos: number; cobranca?: CobrancaAgendada | null }
): EmailPronto {
  const faltam = diasEntre(d.hoje, d.termina);
  const quando = faltam <= 0 ? "hoje" : faltam === 1 ? "amanhã" : `em ${faltam} dias`;
  const destino = "/assinatura";
  if (d.cobranca) {
    // o teste com cartão: não há decisão a tomar, a menos que ela queira
    // sair — e aí o e-mail diz onde
    return {
      destino,
      assunto: `Seu teste termina ${quando}`,
      html: casca({
        titulo: `Seu teste termina ${quando}`,
        saudacao: oi(d.nome),
        paragrafos: [
          `Em ${diaMes(d.cobranca.dia)} sai a primeira cobrança${noCartao(d.cobranca)}, e a conta segue aberta sem você fazer nada${
            d.eventos > 0
              ? `: ${d.eventos === 1 ? "seu evento continua" : `seus ${d.eventos} eventos continuam`} de onde você parou.`
              : "."
          }`,
          `Não quer continuar? Cancele em Assinatura até ${diaMes(d.termina)} e nada é cobrado. Sem fidelidade.`,
        ],
        destaque: { rotulo: `Primeira cobrança em ${diaMes(d.cobranca.dia)}`, valor: precoDaCobranca(d.cobranca) },
        botao: { texto: "Ver minha assinatura", caminho: destino },
        sair: d.sair,
      }),
    };
  }
  return {
    destino,
    assunto: `Seu teste termina ${quando}`,
    html: casca({
      titulo: `Seu teste termina ${quando}`,
      saudacao: oi(d.nome),
      paragrafos: [
        d.eventos > 0
          ? `${d.eventos === 1 ? "Seu evento continua salvo" : `Seus ${d.eventos} eventos continuam salvos`}: assinando, você segue de onde parou.`
          : "Assinando, tudo o que você cadastrar continua com você.",
        "Sem fidelidade, cancela quando quiser.",
      ],
      destaque: { rotulo: "Para continuar", valor: PRECO },
      botao: { texto: "Assinar e continuar", caminho: destino },
      depois: RESPONDER_PARA() ? ["Precisa de mais tempo? Responda este e-mail."] : [],
      sair: d.sair,
    }),
  };
}

/**
 * O DIA do vencimento (20/09/2026).
 *
 * O `fim_teste` acima cai sempre na véspera — a rotina roda de manhã e a
 * condição "falta 1 dia ou menos" já é verdadeira lá. Quem não assinou
 * ficava dois dias sem notícia justamente no dia em que a conta fecha e
 * no seguinte. Este é o e-mail do dia, e ele fala do trabalho que já
 * está lá dentro: é isso que a faz voltar, não o preço.
 */
export function htmlUltimoDia(
  d: DadosDoEmail & { eventos: number; evento: EventoDela | null; cobranca?: CobrancaAgendada | null }
): EmailPronto {
  const destino = "/assinatura";
  if (d.cobranca) {
    return {
      destino,
      assunto: "Seu teste termina hoje",
      html: casca({
        titulo: "Hoje é o último dia do seu teste",
        saudacao: oi(d.nome),
        paragrafos: [
          `Amanhã, ${diaMes(d.cobranca.dia)}, sai a primeira cobrança${noCartao(d.cobranca)}. A conta continua aberta, do jeito que você deixou${
            d.eventos > 0 ? ` — com ${d.eventos === 1 ? "o seu evento" : `os seus ${d.eventos} eventos`}.` : "."
          }`,
          "Para não continuar, cancele hoje em Assinatura. Nada é cobrado.",
        ],
        destaque: { rotulo: `Primeira cobrança em ${diaMes(d.cobranca.dia)}`, valor: precoDaCobranca(d.cobranca) },
        botao: { texto: "Ver minha assinatura", caminho: destino },
        sair: d.sair,
      }),
    };
  }
  const oQue = d.evento ? NOME_DO_EVENTO[d.evento.type] ?? "o evento" : null;
  const primeiro =
    d.eventos > 0
      ? oQue && d.eventos === 1
        ? `${maiuscula(oQue)} que você está organizando continua aqui: o roteiro do dia, os fornecedores, as tarefas e o financeiro, do jeito que você deixou.`
        : `Os seus ${d.eventos} eventos continuam aqui: o roteiro do dia, os fornecedores, as tarefas e o financeiro, do jeito que você deixou.`
      : "A sua conta continua aqui do jeito que você deixou.";
  return {
    destino,
    assunto: "Seu teste termina hoje",
    html: casca({
      titulo: "Hoje é o último dia do seu teste",
      saudacao: oi(d.nome),
      paragrafos: [
        primeiro,
        d.eventos > 0
          ? "Assinando hoje, você não recomeça nada: amanhã abre no mesmo lugar em que parou, com tudo aberto."
          : "Assinando hoje, você segue com a conta aberta e cadastra o seu primeiro evento com calma.",
      ],
      destaque: { rotulo: "Para continuar", valor: PRECO },
      botao: { texto: d.eventos > 0 ? "Assinar e continuar os meus eventos" : "Assinar e continuar", caminho: destino },
      depois: [
        "Sem fidelidade — cancela quando quiser, pela tela de assinatura.",
        ...(RESPONDER_PARA() ? ["Precisa de mais alguns dias? Responda este e-mail."] : []),
      ],
      sair: d.sair,
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Depois do teste                                                     */
/* ------------------------------------------------------------------ */

/** +2 dias: o teste acabou e os dados continuam lá. */
export function htmlPos2(d: DadosDoEmail & { eventos: number; cobranca?: CobrancaAgendada | null }): EmailPronto {
  const destino = "/assinatura";
  // teste com cartão que continua em teste depois do fim: ou a operadora
  // recusou a cobrança (o webhook anotou), ou ainda não confirmou. Só se
  // afirma "não passou" quando a operadora disse isso; os dois se
  // resolvem na tela de assinatura, e não com "assine".
  if (d.cobranca) {
    const recusada = d.cobranca.recusada === true;
    const guardado =
      d.eventos > 0
        ? `${d.eventos === 1 ? "O evento" : `Os ${d.eventos} eventos`} que você cadastrou ${d.eventos === 1 ? "está" : "estão"} do jeito que você deixou.`
        : "Sua conta continua como você deixou.";
    return {
      destino,
      assunto: recusada
        ? "A cobrança não passou — nada foi apagado"
        : "Sua primeira cobrança ainda não foi confirmada",
      html: casca({
        titulo: recusada ? "A cobrança não passou" : "Ainda não confirmamos a sua primeira cobrança",
        saudacao: oi(d.nome),
        paragrafos: [
          recusada
            ? `A cobrança de ${reaisTexto(d.cobranca.valor)}${noCartao(d.cobranca)} não foi aprovada. ${guardado} Assine com outro cartão em Assinatura e a conta reabre na hora.`
            : `A operadora ainda não confirmou a cobrança de ${reaisTexto(d.cobranca.valor)}${noCartao(d.cobranca)}. ${guardado} Se o cartão mudou, assine de novo em Assinatura e a conta reabre na hora.`,
        ],
        botao: { texto: recusada ? "Assinar com outro cartão" : "Ver minha assinatura", caminho: destino },
        sair: d.sair,
      }),
    };
  }
  return {
    destino,
    assunto: "Seu teste terminou — nada foi apagado",
    html: casca({
      titulo: "Nada foi apagado",
      saudacao: oi(d.nome),
      paragrafos: [
        d.eventos > 0
          ? `${d.eventos === 1 ? "O evento" : `Os ${d.eventos} eventos`} que você cadastrou ${d.eventos === 1 ? "está" : "estão"} do jeito que você deixou. Assinando, a conta reabre na hora.`
          : "Sua conta continua como você deixou. Assinando, ela reabre na hora.",
      ],
      destaque: { rotulo: "Para reabrir", valor: PRECO },
      botao: { texto: "Reabrir a minha conta", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** +7 dias: a vitrine, o argumento de cliente novo. */
export function htmlPos7(d: DadosDoEmail): EmailPronto {
  const destino = "/orcamentos/pagina";
  return {
    destino,
    assunto: "O link que traz pedido de orçamento",
    html: casca({
      titulo: "O link que traz pedido de orçamento",
      saudacao: oi(d.nome),
      paragrafos: [
        "A cliente pede pela sua vitrine, o pedido vira proposta em um clique, ela assina pelo celular e o evento nasce do aceite.",
      ],
      botao: { texto: "Ver como fica a minha vitrine", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** +14 dias: a oferta de montar o primeiro evento. */
export function htmlPos14(d: DadosDoEmail & { eventos: number }): EmailPronto {
  const destino = d.eventos > 0 ? "/eventos" : "/eventos/novo";
  return {
    destino,
    assunto: "Quer o seu primeiro evento montado?",
    html: casca({
      titulo: "Quer o seu primeiro evento montado?",
      saudacao: oi(d.nome),
      paragrafos: [
        "Responda com tipo, data e cidade do evento mais próximo. A gente monta na sua conta: fornecedores, roteiro do dia e tarefas com prazo.",
      ],
      botao: { texto: "Abrir a minha conta", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** +21 dias: conteúdo, sem venda. */
export function htmlPos21(d: DadosDoEmail): EmailPronto {
  const destino = "/orcamentos/modelos";
  return {
    destino,
    assunto: "O item esquecido que come a sua margem",
    html: casca({
      titulo: "O item esquecido que come a sua margem",
      saudacao: oi(d.nome),
      paragrafos: [
        "O prejuízo raramente vem do preço do pacote. Vem do que não foi contado: assistente extra, transporte, hora a mais de equipe.",
        "Nos <strong>modelos de preço</strong>, você cadastra o que cobra (fixo ou por convidado) e toda proposta sai com esses números.",
      ],
      botao: { texto: "Ver os modelos de preço", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** +30 dias: a reativação com preço. */
export function htmlPos30(d: DadosDoEmail): EmailPronto {
  const destino = "/assinatura";
  return {
    destino,
    assunto: "A condição de lançamento continua de pé",
    html: casca({
      titulo: "A condição de lançamento continua de pé",
      saudacao: oi(d.nome),
      paragrafos: ["Sua conta continua guardada, com tudo o que você cadastrou."],
      destaque: { rotulo: "Condição de lançamento", valor: PRECO },
      botao: { texto: "Assinar por R$ 27,90", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** +45 dias: o que mudou desde que ela saiu. */
export function htmlPos45(d: DadosDoEmail): EmailPronto {
  const destino = "/eventos/dashboard";
  return {
    destino,
    assunto: "O que entrou no eOrganizei desde o seu teste",
    html: casca({
      titulo: "O que entrou desde o seu teste",
      saudacao: oi(d.nome),
      paragrafos: [
        "Vitrine profissional com pedido de orçamento, proposta que a cliente assina pelo celular, check-in dos convidados por QR code e um assistente que responde sobre o evento.",
      ],
      botao: { texto: "Ver o que mudou", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** +60 dias: uma pergunta, resposta de uma linha. */
export function htmlPos60(d: DadosDoEmail): EmailPronto {
  const destino = "/eventos/dashboard";
  return {
    destino,
    assunto: "O que faltou?",
    html: casca({
      titulo: "O que faltou?",
      saudacao: oi(d.nome),
      paragrafos: [
        "Uma linha já ajuda: preço, falta de tempo, alguma função que não tinha, ou não é para o seu tipo de trabalho?",
      ],
      botao: { texto: "Abrir a minha conta", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** +90 dias: a última, e a porta de saída. */
export function htmlPos90(d: DadosDoEmail): EmailPronto {
  const destino = "/assinatura";
  return {
    destino,
    assunto: "Última mensagem sobre o seu teste",
    html: casca({
      titulo: "Última mensagem sobre o seu teste",
      saudacao: oi(d.nome),
      paragrafos: ["Sua conta continua guardada. Quando quiser, ela reabre no mesmo lugar."],
      destaque: { rotulo: "Quando voltar", valor: PRECO },
      botao: { texto: "Reabrir a minha conta", caminho: destino },
      sair: d.sair,
    }),
  };
}

/** Só para quem quiser ver os textos sem mandar nada (rota de prévia). */
export function previaDosEmails(hoje = hojeBR()) {
  const termina = somarDias(hoje, 4);
  const base: DadosDoEmail = { nome: "Marina Alves", sair: "#" };
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
    ultimo_dia: htmlUltimoDia({ ...base, eventos: 1, evento }),
    ultimo_dia_varios: htmlUltimoDia({ ...base, eventos: 3, evento }),
    ultimo_dia_vazio: htmlUltimoDia({ ...base, eventos: 0, evento: null }),
    pos_2: htmlPos2({ ...base, eventos: 2 }),
    // o teste com cartão, nos dois desfechos de quem ficou em teste
    dia_5_com_cartao: htmlDia5({
      ...base,
      termina,
      hoje,
      evento,
      cobranca: { dia: somarDias(termina, 1), valor: 27.9, cartao: "1234", preco: "R$ 27,90/mês nos 3 primeiros meses, depois R$ 59,90" },
    }),
    pos_2_cobranca_recusada: htmlPos2({
      ...base,
      eventos: 2,
      cobranca: { dia: somarDias(hoje, -2), valor: 27.9, cartao: "1234", recusada: true },
    }),
    pos_2_cobranca_sem_confirmacao: htmlPos2({
      ...base,
      eventos: 2,
      cobranca: { dia: somarDias(hoje, -2), valor: 27.9, cartao: "1234" },
    }),
    pos_7: htmlPos7(base),
    pos_14: htmlPos14({ ...base, eventos: 1 }),
    pos_21: htmlPos21(base),
    pos_30: htmlPos30(base),
    pos_45: htmlPos45(base),
    pos_60: htmlPos60(base),
    pos_90: htmlPos90(base),
  };
}
