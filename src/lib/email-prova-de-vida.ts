// O aviso ao dono do sistema quando um casal cadastra (ou refaz) a conta
// que recebe da lista de presentes (04/10/2026).
//
// Enquanto a Pagar.me não libera para a nossa conta a rota que cria o
// link da prova de vida pela API (401 "IP de origem não autorizado"), quem
// cria o link é ele, no painel da Pagar.me, e quem manda é ele, para a
// pessoa dona do CPF cadastrado. O e-mail diz de que festa, quem cadastrou
// (para ele falar com a pessoa) e o código do recebedor (para achar lá).
// Nada de CPF nem de conta bancária; nada pessoal no assunto.

import "server-only";
import { enviarViaResend } from "@/lib/email";
import { escaparHtml } from "@/lib/email-base";

const TIPO: Record<string, string> = { casamento: "Casamento", debutante: "15 anos" };

function dataBR(iso: string | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

function celularLegivel(digitos: string): string {
  const d = digitos.replace(/\D/g, "");
  if (d.length < 10) return d;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

type DadosDoAviso = {
  festa: string;
  tipoDoEvento: string | null;
  dataDoEvento: string | null;
  /** a conta é da própria noiva (aberta pelo portal) ou de uma cerimonialista */
  daFamilia: boolean;
  cerimonialista: string | null;
  quem: string | null;
  email: string;
  celular: string;
  titular: string;
  recebedorId: string;
  refeito: boolean;
};

/** O assunto e o corpo do aviso (separado do envio para a prova de tela). */
export function montarAvisoDaContaQueRecebe(p: DadosDoAviso): { assunto: string; html: string } {
  const cel = p.celular.replace(/\D/g, "");
  const linha = (rotulo: string, valor: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#928A81;white-space:nowrap;vertical-align:top">${rotulo}</td><td style="padding:4px 0">${valor}</td></tr>`;
  const festa = [p.tipoDoEvento ? TIPO[p.tipoDoEvento] ?? p.tipoDoEvento : null, dataBR(p.dataDoEvento)]
    .filter(Boolean)
    .join(" · ");
  const de = p.daFamilia ? "conta aberta pela própria família, sem cerimonialista" : `da cerimonialista ${p.cerimonialista ?? "—"}`;

  const html = `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#221E1B">
    <p style="color:#928A81;margin:0 0 20px;font-size:13px"><span style="color:#6E3F5F;font-weight:700">e</span>organizei</p>
    <p style="margin:0 0 16px;line-height:1.6">${
      p.refeito ? "Uma conta que recebe da lista de presentes foi <strong>refeita</strong>" : "Uma conta que recebe da lista de presentes foi <strong>cadastrada</strong>"
    } e está esperando a prova de vida.</p>
    <table style="border-collapse:collapse;font-size:14px;line-height:1.5;margin:0 0 18px">
      ${linha("Festa", `${escaparHtml(p.festa)}${festa ? ` (${escaparHtml(festa)})` : ""}`)}
      ${linha("Evento", escaparHtml(de))}
      ${linha("Quem cadastrou", escaparHtml(p.quem ?? "—"))}
      ${linha("E-mail", escaparHtml(p.email))}
      ${linha(
        "Celular",
        cel.length >= 10
          ? `${escaparHtml(celularLegivel(cel))} · <a href="https://wa.me/55${escaparHtml(cel)}" style="color:#6E3F5F">abrir no WhatsApp</a>`
          : "—"
      )}
      ${linha("Titular", escaparHtml(p.titular))}
      ${linha("Recebedor", `<code>${escaparHtml(p.recebedorId)}</code>`)}
    </table>
    <p style="margin:0 0 8px;line-height:1.6">No painel da Pagar.me: <strong>Recebedores</strong> → procure este código → <strong>Criar link</strong>. O link vale 20 minutos e só quem é titular do CPF cadastrado faz a prova: combine a hora com a pessoa antes de gerar.</p>
    <p style="margin:0;line-height:1.6;color:#5c5d63">Quando a Pagar.me aprovar, o portal muda para "Aprovada" sozinho.</p>
  </div>`;

  return { assunto: "Conta que recebe cadastrada: falta a prova de vida", html };
}

export async function avisarDonoDaContaQueRecebe(p: DadosDoAviso): Promise<void> {
  const para = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)[0];
  if (!para) return;
  const { assunto, html } = montarAvisoDaContaQueRecebe(p);
  await enviarViaResend({
    to: para,
    subject: assunto,
    html,
    tags: [{ name: "tipo", value: "prova_de_vida" }],
    tipo: "prova_de_vida",
  }).catch(() => null);
}
