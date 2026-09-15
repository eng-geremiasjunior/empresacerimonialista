// O layout único dos e-mails que saem em nome da cerimonialista.
//
// Até aqui cada e-mail montava o próprio <div>, com três identidades
// visuais e nenhum deles com a logo dela (empresas.logo_url existia desde
// a 041 e nunca chegou a um e-mail). Os e-mails novos passam por aqui: a
// logo quando houver, o nome da empresa sempre, e o rodapé dizendo quem
// mandou de fato — "Enviado por eOrganizei em nome de <empresa>", porque o
// remetente é o nosso domínio e a cliente merece saber.
//
// Estilos inline e tabela de uma célula: é o que cliente de e-mail
// entende (o Gmail descarta <style>, o Outlook ignora max-width em div).
// Sem emoji, sem fonte externa — system-ui cai bem em todo lugar.

const COR_TEXTO = "#17162A";
const COR_APAGADA = "#6B6884";
const COR_LINHA = "#E6E3EC";
const COR_FUNDO = "#F4F2F6";
const COR_MARCA = "#6E3F5F";

/** Texto de gente vira HTML: nome de cliente, de pacote, de extra. */
export function escaparHtml(texto: string | null | undefined): string {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Um botão que sobrevive ao Gmail e ao Outlook: link com padding, sem div. */
export function botaoEmail(href: string, rotulo: string, destaque = true): string {
  const cores = destaque
    ? `background:${COR_TEXTO};color:#ffffff;border:1px solid ${COR_TEXTO}`
    : `background:#ffffff;color:${COR_TEXTO};border:1px solid ${COR_LINHA}`;
  return `<a href="${escaparHtml(href)}" style="display:inline-block;${cores};text-decoration:none;padding:12px 22px;border-radius:9px;font-weight:600;font-size:14px">${escaparHtml(rotulo)}</a>`;
}

/** Uma linha "rótulo — valor" do resumo; o valor já vem em HTML. */
export function linhaResumo(rotulo: string, valorHtml: string): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid ${COR_LINHA};font-size:13px;color:${COR_APAGADA};vertical-align:top;width:42%">${escaparHtml(rotulo)}</td>
    <td style="padding:8px 0;border-bottom:1px solid ${COR_LINHA};font-size:14px;color:${COR_TEXTO};vertical-align:top">${valorHtml}</td>
  </tr>`;
}

/** A marca, sem imagem: o "e" na cor da identidade e o resto no cinza. */
function marcaTexto(): string {
  return `<span style="font-weight:600;color:${COR_APAGADA}"><span style="color:${COR_MARCA}">e</span>organizei</span>`;
}

export function layoutEmail(p: {
  empresaNome: string;
  logoUrl?: string | null;
  titulo: string;
  corpoHtml: string;
  rodapeHtml?: string;
}): string {
  const empresa = escaparHtml(p.empresaNome);
  const logo = p.logoUrl?.trim();
  // só http(s): um caminho relativo ou data URI não abre no cliente de
  // e-mail, e a linha quebrada da imagem fica pior que o nome em texto
  const cabecalho = logo && /^https?:\/\//i.test(logo)
    ? `<img src="${escaparHtml(logo)}" alt="${empresa}" height="48" style="display:block;max-height:48px;max-width:220px;height:48px;width:auto;border:0">`
    : `<p style="margin:0;font-size:18px;font-weight:600;color:${COR_TEXTO}">${empresa}</p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escaparHtml(p.titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${COR_FUNDO};-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COR_FUNDO}">
  <tr>
    <td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${COR_TEXTO}">
        <tr>
          <td style="padding:28px 28px 0">
            ${cabecalho}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 0">
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:600;color:${COR_TEXTO}">${escaparHtml(p.titulo)}</h1>
            <div style="font-size:15px;line-height:1.6;color:${COR_TEXTO}">
              ${p.corpoHtml}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 28px">
            <hr style="border:0;border-top:1px solid ${COR_LINHA};margin:0 0 16px">
            ${p.rodapeHtml ? `<div style="font-size:12px;line-height:1.6;color:${COR_APAGADA};margin:0 0 12px">${p.rodapeHtml}</div>` : ""}
            <p style="margin:0;font-size:12px;line-height:1.6;color:${COR_APAGADA}">Enviado por ${marcaTexto()} em nome de ${empresa}.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
