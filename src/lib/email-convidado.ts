// O e-mail que o convidado recebe depois de se cadastrar pelo link.
//
// Server-only: a chave do Resend nunca vai ao navegador. Quem chama é a
// rota /api/rsvp, nunca a tela.
//
// O e-mail leva o link INDIVIDUAL dele — é assim que ele muda de ideia
// depois, reusando a mesma tela de confirmação.

import { appUrl, enviarViaResend } from "@/lib/email";
import { inicioDoDiaBR } from "@/lib/tempo";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dataLonga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

export type EmailConvidado = {
  para: string;
  nome: string;
  anfitrioes: string;
  convitePara: string;
  data: string;
  hora: string | null;
  local: string | null;
  cidade: string | null;
  confirmado: boolean;
  pessoas: number;
  /** hash individual: o caminho para mudar a resposta depois */
  hash: string;
};

/** Quanto falta, em palavras — "é amanhã" cabe melhor que "em 1 dia". */
function faltam(dataIso: string): string {
  const hoje = inicioDoDiaBR().getTime();
  const alvo = new Date(`${dataIso}T00:00:00`).getTime();
  const dias = Math.round((alvo - hoje) / 86_400_000);
  if (dias <= 0) return "é hoje";
  if (dias === 1) return "é amanhã";
  if (dias <= 30) return `faltam ${dias} dias`;
  return `faltam ${dias} dias`;
}

/**
 * O lembrete que a cliente agenda — sai uma vez, por convidado.
 *
 * Duas cartas, porque são duas situações: quem já confirmou recebe um
 * "falta pouco" com os detalhes na mão; quem não respondeu recebe um
 * empurrão gentil. Nenhuma das duas cobra.
 */
export async function enviarLembreteConvidado(
  d: EmailConvidado
): Promise<{ ok: boolean; error?: string }> {

  const link = `${appUrl()}/confirmar/${d.hash}`;
  const quando = dataLonga(d.data) + (d.hora ? ` · ${d.hora.slice(0, 5)}` : "");
  const onde = [d.local, d.cidade].filter(Boolean).join(" · ");
  const quanto = faltam(d.data);

  const assunto = d.confirmado
    ? `${quanto.charAt(0).toUpperCase() + quanto.slice(1)} — ${d.convitePara} ${d.anfitrioes}`
    : `Ainda dá tempo de confirmar — ${d.convitePara} ${d.anfitrioes}`;

  const miolo = d.confirmado
    ? `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#463E36">
         ${quanto.charAt(0).toUpperCase() + quanto.slice(1)}! Passando só para lembrar
         dos detalhes${d.pessoas > 1 ? ` — sua reserva é para ${d.pessoas} pessoas` : ""}.
         Será uma alegria ter você lá.
       </p>`
    : `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#463E36">
         ${quanto.charAt(0).toUpperCase() + quanto.slice(1)} para ${d.convitePara}
         <strong>${d.anfitrioes}</strong>, e ainda não recebemos sua resposta.
         Se puder avisar, ajuda muito na organização — e adoraríamos ter você lá.
       </p>`;

  const html = `
  <div style="font-family:'Jost',system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#332B24;background:#FDFBF7">
    <p style="margin:0 0 28px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#776D60">
      ${d.confirmado ? "Falta pouco" : "Um lembrete"}
    </p>

    <p style="margin:0 0 6px;font-size:15px">Olá, ${d.nome}!</p>
    ${miolo}

    <div style="border:1px solid #E3D3B7;border-radius:12px;background:linear-gradient(135deg,#FDFAF4,#F8F1E4);padding:20px 22px;margin:0 0 24px">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#776D60">Quando e onde</p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#332B24">
        ${quando}${onde ? `<br/>${onde}` : ""}
      </p>
    </div>

    <p style="margin:0 0 28px">
      <a href="${link}" style="display:inline-block;border:1px solid #E2D6C2;border-radius:8px;background:#FDFBF7;color:#6E5533;text-decoration:none;padding:12px 20px;font-size:13px">
        ${d.confirmado ? "Ver ou alterar minha resposta" : "Confirmar presença"}
      </a>
    </p>

    <p style="margin:0;font-size:11px;line-height:1.6;color:#8B8072">
      Se o botão não abrir, copie este endereço:<br/>${link}
    </p>
  </div>`;

  return enviarViaResend({ to: d.para, subject: assunto, html });
}

export async function enviarEmailConvidado(
  d: EmailConvidado
): Promise<{ ok: boolean; error?: string }> {

  const link = `${appUrl()}/confirmar/${d.hash}`;
  const quando = dataLonga(d.data) + (d.hora ? ` · ${d.hora.slice(0, 5)}` : "");
  const onde = [d.local, d.cidade].filter(Boolean).join(" · ");

  const assunto = d.confirmado
    ? `Presença confirmada — ${d.convitePara} ${d.anfitrioes}`
    : `Recebemos sua resposta — ${d.convitePara} ${d.anfitrioes}`;

  // Tom do portal, sem virar peça de marketing: quem recebe já foi
  // convidado, então isto é um comprovante, não um convite.
  const html = `
  <div style="font-family:'Jost',system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#332B24;background:#FDFBF7">
    <p style="margin:0 0 28px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#776D60">
      ${d.confirmado ? "Presença confirmada" : "Resposta registrada"}
    </p>

    <p style="margin:0 0 6px;font-size:15px">Olá, ${d.nome}!</p>

    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#463E36">
      ${
        d.confirmado
          ? `Sua presença está confirmada${d.pessoas > 1 ? ` para ${d.pessoas} pessoas` : ""} ${d.convitePara} <strong>${d.anfitrioes}</strong>.`
          : `Recebemos seu aviso de que não poderá comparecer ${d.convitePara} <strong>${d.anfitrioes}</strong>. Obrigado por responder.`
      }
    </p>

    ${
      d.confirmado
        ? `<div style="border:1px solid #E3D3B7;border-radius:12px;background:linear-gradient(135deg,#FDFAF4,#F8F1E4);padding:20px 22px;margin:0 0 24px">
             <p style="margin:0 0 8px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#776D60">Quando e onde</p>
             <p style="margin:0;font-size:15px;line-height:1.7;color:#332B24">
               ${quando}${onde ? `<br/>${onde}` : ""}
             </p>
           </div>`
        : ""
    }

    <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#4C443C">
      Precisa mudar alguma coisa? É só abrir o endereço abaixo — vale até o dia do evento.
    </p>
    <p style="margin:0 0 28px">
      <a href="${link}" style="display:inline-block;border:1px solid #E2D6C2;border-radius:8px;background:#FDFBF7;color:#6E5533;text-decoration:none;padding:12px 20px;font-size:13px">
        ${d.confirmado ? "Alterar minha resposta" : "Mudei de ideia, quero ir"}
      </a>
    </p>

    <p style="margin:0;font-size:11px;line-height:1.6;color:#8B8072">
      Se o botão não abrir, copie este endereço:<br/>${link}
    </p>
  </div>`;

  return enviarViaResend({ to: d.para, subject: assunto, html });
}
