// Os textos dos três e-mails do teste grátis — sem envio e sem banco.
//
// Separados de email-ativacao.ts para poderem ser lidos (e conferidos)
// sem mandar nada a ninguém. A regra da casa vale aqui: fala do trabalho
// dela, nunca da mecânica do sistema, e sem linguagem de jogo.

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

/** A casca dos três: mesma família visual dos outros e-mails do sistema. */
function casca(p: {
  saudacao: string;
  paragrafos: string[];
  botao: { texto: string; url: string };
  depois?: string[];
}): string {
  const responde = RESPONDER_PARA();
  const ajuda = responde
    ? "Se travar em qualquer ponto, é só responder este e-mail — quem lê sou eu."
    : "Se travar em qualquer ponto, fale com a gente pelo Suporte, no menu do sistema.";
  const par = (t: string) => `<p style="margin:0 0 14px;line-height:1.6">${t}</p>`;
  return `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#221E1B">
    <p style="color:#928A81;margin:0 0 20px;font-size:13px"><span style="color:#6E3F5F;font-weight:700">e</span>organizei</p>
    ${par(p.saudacao)}
    ${p.paragrafos.map(par).join("")}
    <p style="margin:22px 0">
      <a href="${p.botao.url}" style="display:inline-block;background:#6E3F5F;color:#FAF8F5;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escapar(p.botao.texto)}</a>
    </p>
    ${(p.depois ?? []).map(par).join("")}
    ${par(ajuda)}
    <p style="margin:18px 0 0;line-height:1.6">${escapar(ASSINA())}<br><span style="color:#928A81">quem construiu o eOrganizei</span></p>
    <p style="margin:28px 0 0;color:#928A81;font-size:12px;line-height:1.5">Você recebe este e-mail porque abriu um teste grátis no eOrganizei. São só três mensagens durante o teste.</p>
  </div>`;
}


export function htmlBoasVindas(nome: string, termina: string | null, eventos3m: string | null): { assunto: string; html: string } {
  const n = primeiroNome(nome);
  const semEvento = eventos3m === "nenhum";
  const base = appUrl();
  return {
    assunto: n ? `${n}, sua conta no eOrganizei está aberta` : "Sua conta no eOrganizei está aberta",
    html: casca({
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}! Aqui é o ${escapar(ASSINA())}, eu construí o eOrganizei.`,
      paragrafos: [
        `Seu teste vai até <strong>${termina ? diaMes(termina) : "o fim da semana"}</strong>, sem cartão e sem cobrança no fim.`,
        semEvento
          ? "Comece pelo próximo evento que você for fechar — mesmo ainda em orçamento. Tipo, data e o nome da cliente bastam; o resto nasce dentro dele."
          : "Comece por um evento que você já está organizando. Se ele acontece nas próximas semanas, o que mais economiza tempo é o roteiro do dia: cada fornecedor recebe um link com a parte dele, no celular.",
      ],
      botao: { texto: "Cadastrar meu evento", url: `${base}/eventos/novo` },
    }),
  };
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

export function htmlDia2(nome: string, evento: EventoDela | null, hoje: string): { assunto: string; html: string } {
  const n = primeiroNome(nome);
  const base = appUrl();
  const oi = `Oi${n ? `, ${escapar(n)}` : ""}!`;

  if (!evento) {
    return {
      assunto: n ? `${n}, qual é o seu próximo evento?` : "Qual é o seu próximo evento?",
      html: casca({
        saudacao: oi,
        paragrafos: [
          "Faz dois dias que você abriu a conta, e ela ainda está sem nenhum evento.",
          "Cadastrar um leva dois minutos: tipo, data e o nome da cliente. Fornecedores, roteiro do dia e financeiro nascem dentro dele — é com um evento de verdade que dá para ver se o sistema serve para você.",
        ],
        botao: { texto: "Cadastrar meu primeiro evento", url: `${base}/eventos/novo` },
      }),
    };
  }

  const nomeDoEvento = NOME_DO_EVENTO[evento.type] ?? "o evento";
  const faltam = evento.date ? diasEntre(hoje, evento.date.slice(0, 10)) : null;
  const quando = evento.date ? ` de ${diaMes(evento.date)}` : "";
  const assunto = `${maiuscula(nomeDoEvento)}${quando}: o próximo passo`;

  if (faltam !== null && faltam >= 0 && faltam <= RETA_FINAL_DIAS) {
    return {
      assunto,
      html: casca({
        saudacao: oi,
        paragrafos: [
          `Faltam <strong>${prazo(faltam)}</strong> para ${escapar(nomeDoEvento)}${quando}.`,
          "Nessa reta, o que mais tira mensagem do seu WhatsApp é o roteiro do dia: vincule os fornecedores do evento, diga quem faz cada horário e mande para cada um o link com a parte dele. Mudou um horário? O link dele já mostra o novo.",
        ],
        botao: { texto: "Abrir os fornecedores do evento", url: `${base}/eventos/${evento.id}/fornecedores` },
      }),
    };
  }

  if (faltam !== null && faltam > RETA_FINAL_DIAS) {
    // Sem método, o Planejamento é uma tela vazia — o mesmo beco que o
    // guia já teve (PASSOS_SEM_METODO). Aí o passo é a tarefa com prazo.
    if (evento.temMetodo === false) {
      return {
        assunto,
        html: casca({
          saudacao: oi,
          paragrafos: [
            `Faltam ${prazo(faltam)} para ${escapar(nomeDoEvento)}${quando}.`,
            "Anote o que precisa ser resolvido e até quando: cada tarefa ganha prazo e aparece para você no dia certo, sem depender de memória.",
          ],
          botao: { texto: "Abrir as tarefas do evento", url: `${base}/eventos/${evento.id}/organizacao` },
        }),
      };
    }
    return {
      assunto,
      html: casca({
        saudacao: oi,
        paragrafos: [
          `Faltam ${prazo(faltam)} para ${escapar(nomeDoEvento)}${quando} — é o tempo em que as decisões se acumulam.`,
          "No Planejamento, cada decisão que você marca como tomada vira tarefa com prazo, e o evento mostra sozinho o que está atrasado. Comece pelo que você já resolveu com a cliente.",
        ],
        botao: { texto: "Abrir o planejamento do evento", url: `${base}/eventos/${evento.id}/planejamento` },
      }),
    };
  }

  // evento que já passou, ou sem data
  return {
    assunto: n ? `${n}, qual é o seu próximo evento?` : "Qual é o seu próximo evento?",
    html: casca({
      saudacao: oi,
      paragrafos: [
        "Vi que você já cadastrou um evento por aqui.",
        "Se tem outro pela frente, cadastre também: é num evento que ainda vai acontecer que o roteiro do dia, os fornecedores e o financeiro mostram para que servem.",
      ],
      botao: { texto: "Cadastrar o próximo evento", url: `${base}/eventos/novo` },
    }),
  };
}

export function htmlFimTeste(nome: string, termina: string, hoje: string, eventos: number): { assunto: string; html: string } {
  const n = primeiroNome(nome);
  const base = appUrl();
  const faltam = diasEntre(hoje, termina);
  const quando = faltam <= 0 ? "hoje" : faltam === 1 ? "amanhã" : `em ${faltam} dias`;
  const responde = RESPONDER_PARA();
  return {
    assunto: `Seu teste do eOrganizei termina ${quando}`,
    html: casca({
      saudacao: `Oi${n ? `, ${escapar(n)}` : ""}!`,
      paragrafos: [
        `Seu teste vai até <strong>${diaMes(termina)}</strong>. Depois disso o sistema pede a assinatura para continuar — nada é cobrado sem você escolher um plano.`,
        eventos > 0
          ? `O que você cadastrou (${eventos} ${eventos === 1 ? "evento" : "eventos"}) continua salvo: se assinar, segue exatamente de onde parou.`
          : "Se você assinar, tudo o que cadastrar continua com você.",
      ],
      botao: { texto: "Ver os planos", url: `${base}/assinatura` },
      depois: responde
        ? ["Não deu tempo de testar com um evento de verdade? Responda este e-mail que eu estendo o seu teste."]
        : [],
    }),
  };
}

/** Só para quem quiser ver o texto sem mandar nada (rota de prévia). */
export function previaDosEmails(hoje = hojeBR()) {
  const termina = somarDias(hoje, 4);
  return {
    boas_vindas: htmlBoasVindas("Marina Alves", termina, "3-5"),
    dia_2_sem_evento: htmlDia2("Marina Alves", null, hoje),
    dia_2_reta_final: htmlDia2("Marina Alves", { id: "EVENTO", type: "casamento", date: somarDias(hoje, 10) }, hoje),
    dia_2_distante: htmlDia2("Marina Alves", { id: "EVENTO", type: "debutante", date: somarDias(hoje, 120), temMetodo: true }, hoje),
    dia_2_distante_sem_metodo: htmlDia2("Marina Alves", { id: "EVENTO", type: "aniversario", date: somarDias(hoje, 60), temMetodo: false }, hoje),
    fim_teste: htmlFimTeste("Marina Alves", somarDias(hoje, 2), hoje, 2),
  };
}
