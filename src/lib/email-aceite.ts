// Os dois e-mails do aceite da proposta.
//
// Server-only: quem chama é a rota /api/orcamento/[hash]/aceite (e a
// rotina que reenvia o que não saiu), nunca a tela. Os anexos passam por
// aqui como Buffer e viram base64 só na hora de sair.
//
// Para a cliente é um comprovante: o que ela fechou, o recibo, o termo
// assinado em anexo e um jeito de conferir depois. Para a cerimonialista
// é um aviso curto com o caminho até o orçamento — sem CPF e sem
// telefone, porque e-mail vaza e a linha do aceite já guarda tudo.
//
// Os dois saem em nome da empresa dela ("<Empresa> via eOrganizei") e a
// resposta cruza: a cliente responde para a cerimonialista, a
// cerimonialista responde para a cliente.

import "server-only";

import { enviarViaResend } from "@/lib/email";
import {
  botaoEmail,
  escaparHtml,
  layoutEmail,
  linhaResumo,
} from "@/lib/email-base";
import { formatBRL } from "@/lib/modelos-precificacao";
import { formatDate } from "@/lib/format";

// Acima disto o Resend ainda aceita (o teto é 40 MB), mas a caixa da
// cliente pode não: o contrato vai como link e o termo continua anexo.
const LIMITE_ANEXO_BYTES = 5 * 1024 * 1024;

type Resultado = { ok: boolean; id?: string | null; error?: string };

/** "2026-10-17" → "17/10/2026"; qualquer outro formato passa como veio. */
function dataLegivel(iso: string | null): string | null {
  if (!iso) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? formatDate(iso.slice(0, 10)) : iso;
}

function formaPagamentoLegivel(forma: string): string {
  if (forma === "vista") return "À vista";
  if (forma === "parcelado") return "Parcelado";
  return forma;
}

/** Nome de arquivo sem caminho nem sinais que o cliente de e-mail rejeita. */
function nomeDeAnexo(nome: string): string {
  const limpo = nome.replace(/[\\/:*?"<>|\r\n]/g, "-").trim() || "contrato";
  return /\.pdf$/i.test(limpo) ? limpo : `${limpo}.pdf`;
}

export async function enviarEmailAceiteCliente(p: {
  to: string;
  empresaNome: string;
  logoUrl: string | null;
  recibo: string;
  tipoEventoLabel: string;
  dataEvento: string | null;
  resumo: {
    pacoteNome: string;
    convidados: number;
    extras: { nome: string; preco: number }[];
    /** 'proposta' = o valor aceito é o da própria proposta (162, item 9) */
    origemValor?: string | null;
    /** os itens da proposta, quando o valor é o dela */
    itens?: { nome: string; valor: number }[];
    formaPagamento: string;
    parcelas: number | null;
    valorEntrada: number | null;
    valorParcela: number | null;
    valorTotal: number;
  };
  termoPdf: Buffer | null;
  contratoPdf: { nome: string; buffer: Buffer } | null;
  contratoLink: string | null;
  whatsappLink: string | null;
  emailCerimonialista: string | null;
  proximosPassos: string[];
  linkVerificacao: string;
}): Promise<Resultado> {
  const empresa = escaparHtml(p.empresaNome);
  const tipo = escaparHtml(p.tipoEventoLabel);
  const data = dataLegivel(p.dataEvento);
  const r = p.resumo;

  // --- anexos: o termo sempre que existir; o contrato só se couber ---
  const anexos: { filename: string; content: string }[] = [];
  const termoAnexado = !!p.termoPdf && p.termoPdf.length > 0;
  if (p.termoPdf && termoAnexado) {
    anexos.push({
      filename: `termo-de-aceite-${p.recibo}.pdf`,
      content: p.termoPdf.toString("base64"),
    });
  }
  const contratoAnexado =
    !!p.contratoPdf &&
    p.contratoPdf.buffer.length > 0 &&
    p.contratoPdf.buffer.length <= LIMITE_ANEXO_BYTES;
  if (p.contratoPdf && contratoAnexado) {
    anexos.push({
      filename: nomeDeAnexo(p.contratoPdf.nome),
      content: p.contratoPdf.buffer.toString("base64"),
    });
  }
  const contratoPorLink = !contratoAnexado && !!p.contratoLink;

  // --- resumo do que ela fechou ---
  const linhas: string[] = [];
  if (r.origemValor === "proposta" && (r.itens ?? []).length > 0) {
    // o valor é o da proposta: o que ela fechou são os itens dela
    linhas.push(
      linhaResumo(
        "Proposta",
        (r.itens ?? [])
          .map((i) => `${escaparHtml(i.nome)} <span style="color:#6B6884">— ${formatBRL(i.valor)}</span>`)
          .join("<br>")
      )
    );
  } else {
    linhas.push(linhaResumo("Pacote", escaparHtml(r.pacoteNome)));
  }
  if (r.convidados > 0) linhas.push(linhaResumo("Convidados", String(r.convidados)));
  if (r.extras.length > 0) {
    linhas.push(
      linhaResumo(
        "Extras",
        r.extras
          .map((e) => `${escaparHtml(e.nome)} <span style="color:#6B6884">— ${formatBRL(e.preco)}</span>`)
          .join("<br>")
      )
    );
  }
  linhas.push(linhaResumo("Forma de pagamento", escaparHtml(formaPagamentoLegivel(r.formaPagamento))));
  if (r.valorEntrada != null && r.valorEntrada > 0) {
    linhas.push(linhaResumo("Entrada", formatBRL(r.valorEntrada)));
  }
  if (r.parcelas && r.parcelas > 0 && r.valorParcela != null) {
    linhas.push(linhaResumo("Parcelas", `${r.parcelas} x ${formatBRL(r.valorParcela)}`));
  }
  linhas.push(linhaResumo("Total", `<strong>${formatBRL(r.valorTotal)}</strong>`));

  const passos = p.proximosPassos.map((s) => s.trim()).filter(Boolean);

  const corpoHtml = `
    <p style="margin:0 0 16px">Você aceitou a proposta de ${tipo} de <strong>${empresa}</strong>${data ? ` para ${escaparHtml(data)}` : ""}.</p>

    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B6884">Recibo</p>
    <p style="margin:0 0 20px;font-size:26px;font-weight:600;letter-spacing:.12em;color:#17162A">${escaparHtml(p.recibo)}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">
      ${linhas.join("")}
    </table>

    ${
      passos.length > 0
        ? `<p style="margin:0 0 6px;font-weight:600">Próximos passos</p>
           <ol style="margin:0 0 20px;padding-left:20px">
             ${passos.map((s) => `<li style="margin:0 0 6px">${escaparHtml(s)}</li>`).join("")}
           </ol>`
        : ""
    }

    ${
      p.whatsappLink
        ? `<p style="margin:0 0 20px">${botaoEmail(p.whatsappLink, `Falar com ${p.empresaNome} no WhatsApp`)}</p>`
        : ""
    }

    ${
      p.emailCerimonialista
        ? `<p style="margin:0 0 20px;font-size:14px;color:#6B6884">Dúvidas? Responda este e-mail: a mensagem chega a ${empresa}.</p>`
        : ""
    }

    ${
      contratoPorLink
        ? `<p style="margin:0 0 12px;font-size:14px">O contrato de prestação de serviço está disponível em <a href="${escaparHtml(p.contratoLink!)}" style="color:#6E3F5F">${escaparHtml(p.contratoLink!)}</a>.</p>`
        : ""
    }

    <p style="margin:0;font-size:14px">Guarde este e-mail: ${
      termoAnexado
        ? "o termo de aceite vai anexo e"
        : "o termo de aceite"
    } pode ser conferido em <a href="${escaparHtml(p.linkVerificacao)}" style="color:#6E3F5F">${escaparHtml(p.linkVerificacao)}</a>.</p>
  `;

  const html = layoutEmail({
    empresaNome: p.empresaNome,
    logoUrl: p.logoUrl,
    titulo: "Sua proposta foi aceita",
    corpoHtml,
  });

  const envio = await enviarViaResend({
    to: p.to,
    subject: `Sua proposta foi aceita — ${p.empresaNome}`,
    html,
    fromNome: p.empresaNome,
    replyTo: p.emailCerimonialista,
    attachments: anexos,
    tags: [{ name: "finalidade", value: "aceite_cliente" }],
  });

  return envio.ok ? { ok: true, id: envio.id } : { ok: false, error: envio.error };
}

export async function enviarEmailAceiteCerimonialista(p: {
  to: string;
  replyTo: string | null;
  empresaNome: string;
  clienteNome: string;
  valorTotal: number;
  recibo: string;
  tipoEventoLabel: string;
  linkOrcamento: string;
}): Promise<Resultado> {
  const cliente = escaparHtml(p.clienteNome);
  const titulo = `${p.clienteNome} aceitou a proposta`;

  const corpoHtml = `
    <p style="margin:0 0 16px">Proposta de ${escaparHtml(p.tipoEventoLabel)}, no valor de <strong>${formatBRL(p.valorTotal)}</strong>. Recibo <strong style="letter-spacing:.08em">${escaparHtml(p.recibo)}</strong>.</p>

    <p style="margin:0 0 20px">${botaoEmail(p.linkOrcamento, "Abrir o orçamento")}</p>

    ${
      p.replyTo
        ? `<p style="margin:0;font-size:14px;color:#6B6884">Responder este e-mail escreve para ${cliente}.</p>`
        : ""
    }
  `;

  const html = layoutEmail({
    empresaNome: p.empresaNome,
    titulo,
    corpoHtml,
    rodapeHtml: `Se o botão não abrir, copie este endereço: ${escaparHtml(p.linkOrcamento)}`,
  });

  const envio = await enviarViaResend({
    to: p.to,
    subject: `${titulo} — ${p.tipoEventoLabel}`,
    html,
    fromNome: p.empresaNome,
    replyTo: p.replyTo,
    tags: [{ name: "finalidade", value: "aceite_cerimonialista" }],
  });

  return envio.ok ? { ok: true, id: envio.id } : { ok: false, error: envio.error };
}
