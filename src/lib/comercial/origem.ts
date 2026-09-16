// De onde a pessoa chegou à página pública — e só até onde dá para saber.
//
// A pergunta que isto responde é uma só, e é dela: "o link na bio está
// trazendo gente?". Para responder bastam duas coisas — de qual site veio
// e, quando ela anuncia, de qual campanha. Nada aqui identifica ninguém:
// sem cookie, sem impressão digital do navegador, sem identificador de
// visitante. O contador do banco (pagina_publica_metrica, 165) guarda só
// dia + origem + campanha, e não dá para voltar de uma linha a uma pessoa.
//
// O que NÃO se sabe, e a tela não pode fingir que sabe: se a pessoa que
// visitou é a mesma que pediu orçamento; se o clique no WhatsApp virou
// mensagem; quem ela é. A 155 já tinha fixado essa régua para a proposta.

export type OrigemDoAcesso =
  | "instagram"
  | "facebook"
  | "google"
  | "whatsapp"
  | "direto"
  | "outro";

export type Chegada = {
  origem: OrigemDoAcesso;
  campanha: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

/** Lista fechada: o que não casa vira "outro", nunca um host livre. */
function porHost(host: string): OrigemDoAcesso | null {
  const h = host.toLowerCase();
  if (/(^|\.)instagram\.com$|(^|\.)l\.instagram\.com$/.test(h)) return "instagram";
  if (/(^|\.)facebook\.com$|(^|\.)fb\.me$|(^|\.)m\.facebook\.com$/.test(h)) return "facebook";
  if (/(^|\.)google\./.test(h)) return "google";
  if (/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/.test(h)) return "whatsapp";
  return null;
}

function porUtm(fonte: string): OrigemDoAcesso | null {
  const f = fonte.trim().toLowerCase();
  if (f.startsWith("ig") || f.includes("instagram")) return "instagram";
  if (f.startsWith("fb") || f.includes("facebook") || f === "meta") return "facebook";
  if (f.includes("google") || f === "adwords") return "google";
  if (f.includes("whats")) return "whatsapp";
  return null;
}

/**
 * De onde veio esta visita.
 *
 * Ordem: a marca da campanha (utm_source) manda, porque é o que ela
 * configurou; o site de origem entra quando não há campanha; sem os dois,
 * é "direto" — que inclui link colado no WhatsApp, digitado à mão e
 * navegador que não manda referência. "Direto" alto não é erro de
 * medição: é a vida real de um link que circula em conversa.
 *
 * `busca` e `referencia` entram por parâmetro (nada de ler `window` aqui)
 * para o módulo continuar puro e testável.
 */
export function chegadaDaVisita(busca: string, referencia: string, hostProprio?: string): Chegada {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(busca.startsWith("?") ? busca.slice(1) : busca);
  } catch {
    params = new URLSearchParams();
  }

  const utmSource = corta(params.get("utm_source"));
  const utmMedium = corta(params.get("utm_medium"));
  const utmCampaign = corta(params.get("utm_campaign"));

  let origem: OrigemDoAcesso | null = utmSource ? porUtm(utmSource) : null;

  if (!origem && referencia) {
    try {
      const host = new URL(referencia).hostname;
      // A navegação dentro da própria página não é uma chegada nova.
      if (hostProprio && host.toLowerCase() === hostProprio.toLowerCase()) {
        origem = "direto";
      } else {
        origem = porHost(host) ?? "outro";
      }
    } catch {
      origem = null;
    }
  }

  if (!origem && utmSource) origem = "outro";

  return {
    origem: origem ?? "direto",
    campanha: (utmCampaign ?? "").slice(0, 60),
    utmSource,
    utmMedium,
    utmCampaign,
  };
}

function corta(v: string | null): string | null {
  const s = (v ?? "").trim();
  return s ? s.slice(0, 80) : null;
}
