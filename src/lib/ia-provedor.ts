import "server-only";

// A porta única para os provedores de IA (21/10/2026, fase 0 do plano
// "IA que trabalha"). Antes, cada uma das 7 rotas repetia a URL, o
// modelo, o fetch, o registro de uso e a leitura do JSON.
//
// Um modelo por TAREFA, por variável de ambiente:
//   IA_TEXTO_BASE_URL / IA_TEXTO_API_KEY / IA_TEXTO_MODEL   (e VISAO, AUDIO, ESCRITA)
// Sem a variável da tarefa, vale a de hoje (LLAMA_*), e sem ela a Groq.
// Trocar de provedor é mudar a variável e rodar as provas, sem código.
// Todos falam o formato /chat/completions (Groq, OpenAI, Gemini).
//
// O que volta é dado não confiável: quem chama passa pela allowlist.
// Nada da pergunta nem da resposta vai para o log; só status e contagem.

import { registrarUsoDaIa } from "@/lib/registro-do-sistema";

export type TarefaDaIa = "texto" | "visao" | "audio" | "escrita";

export type MensagemDaIa = { role: "system" | "user" | "assistant"; content: string };

export type MotivoDaFalha =
  /** a chave não está no ambiente desta implantação */
  | "sem_chave"
  /** o provedor recusou por limite de uso (mesmo depois de esperar) */
  | "limite"
  /** o modelo configurado não existe mais no provedor */
  | "modelo"
  /** a chave foi rejeitada */
  | "chave"
  /** outro erro do provedor, ou a resposta veio vazia */
  | "provedor"
  /** a chamada nem chegou (rede, tempo esgotado) */
  | "rede"
  /** a resposta passou do tamanho máximo e veio cortada no meio */
  | "cortada";

export type RespostaDaIa = { ok: true; conteudo: string } | { ok: false; motivo: MotivoDaFalha };

type Configuracao = { baseUrl: string; apiKey: string | undefined; modelo: string };

const PADRAO_URL = "https://api.groq.com/openai/v1";
const PADRAO_MODELO = "openai/gpt-oss-120b";
/** espera máxima antes de tentar de novo depois de um 429 */
const ESPERA_MAXIMA_MS = 8000;
const TEMPO_MAXIMO_MS = 50_000;

export function configuracaoDa(tarefa: TarefaDaIa): Configuracao {
  const p = `IA_${tarefa.toUpperCase()}_`;
  return {
    baseUrl: process.env[`${p}BASE_URL`] || process.env.LLAMA_BASE_URL || PADRAO_URL,
    apiKey: process.env[`${p}API_KEY`] || process.env.LLAMA_API_KEY,
    modelo: process.env[`${p}MODEL`] || process.env.LLAMA_MODEL || PADRAO_MODELO,
  };
}

const extraDo = (modelo: string, raciocinio: Raciocinio) => (modelo.includes("gpt-oss") ? { reasoning_effort: raciocinio } : {});

/** quanto o modelo pensa antes de responder: "low" basta para extrair; montar pede mais */
export type Raciocinio = "low" | "medium" | "high";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

function motivoDoStatus(status: number, detalhe: string): MotivoDaFalha {
  if (status === 404 || detalhe.includes("model_not_found")) return "modelo";
  if (status === 429) return "limite";
  if (status === 401 || status === 403) return "chave";
  return "provedor";
}

export async function chamarModelo(p: {
  /** o nome no registro de uso (ia_uso.rota) */
  rota: string;
  userId: string;
  mensagens: MensagemDaIa[];
  temperatura?: number;
  tarefa?: TarefaDaIa;
  raciocinio?: Raciocinio;
  /** teto da resposta (o raciocínio do gpt-oss conta junto). Na Groq
   *  gratuita o teto entra na conta do limite por minuto: não exagerar. */
  maxTokens?: number;
}): Promise<RespostaDaIa> {
  const cfg = configuracaoDa(p.tarefa ?? "texto");
  if (!cfg.apiKey) {
    console.error(`[eorg:ia:${p.rota}] chave ausente no ambiente desta implantação`);
    return { ok: false, motivo: "sem_chave" };
  }

  const corpo = JSON.stringify({
    model: cfg.modelo,
    temperature: p.temperatura ?? 0,
    ...extraDo(cfg.modelo, p.raciocinio ?? "low"),
    ...(p.maxTokens ? { max_completion_tokens: p.maxTokens } : {}),
    messages: p.mensagens,
  });

  try {
    // uma segunda tentativa só para o limite, e só se a espera pedida for curta
    for (let tentativa = 1; ; tentativa++) {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        body: corpo,
        signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
      });

      if (!res.ok) {
        const detalhe = await res.text().catch(() => "");
        const esperaPedida = Number(res.headers.get("retry-after")) * 1000;
        if (res.status === 429 && tentativa === 1 && esperaPedida > 0 && esperaPedida <= ESPERA_MAXIMA_MS) {
          await espera(esperaPedida);
          continue;
        }
        await registrarUsoDaIa({ userId: p.userId, rota: p.rota, ok: false });
        console.error(`[eorg:ia:${p.rota}] provedor respondeu ${res.status} — ${detalhe.slice(0, 300)}`);
        return { ok: false, motivo: motivoDoStatus(res.status, detalhe) };
      }

      const data = await res.json();
      // só a contagem que o provedor devolve; nada da pergunta nem da resposta
      await registrarUsoDaIa({
        userId: p.userId,
        rota: p.rota,
        ok: true,
        tokensEntrada: Number(data?.usage?.prompt_tokens) || 0,
        tokensSaida: Number(data?.usage?.completion_tokens) || 0,
      });
      if (data?.choices?.[0]?.finish_reason === "length") return { ok: false, motivo: "cortada" };
      const conteudo = String(data?.choices?.[0]?.message?.content ?? "").trim();
      return conteudo ? { ok: true, conteudo } : { ok: false, motivo: "provedor" };
    }
  } catch (e) {
    await registrarUsoDaIa({ userId: p.userId, rota: p.rota, ok: false });
    console.error(`[eorg:ia:${p.rota}] a chamada falhou —`, String(e).slice(0, 200));
    return { ok: false, motivo: "rede" };
  }
}

/**
 * Áudio → texto (Whisper, na Groq por padrão). O áudio passa pela memória
 * do servidor e vai ao provedor; não é guardado em lugar nenhum. O modelo
 * de áudio é outro: IA_AUDIO_MODEL, senão o Whisper turbo.
 */
export async function transcreverAudio(p: {
  rota: string;
  userId: string;
  arquivo: Blob;
  nome: string;
}): Promise<RespostaDaIa> {
  const cfg = configuracaoDa("audio");
  if (!cfg.apiKey) {
    console.error(`[eorg:ia:${p.rota}] chave ausente no ambiente desta implantação`);
    return { ok: false, motivo: "sem_chave" };
  }
  const forma = new FormData();
  forma.append("file", p.arquivo, p.nome);
  forma.append("model", process.env.IA_AUDIO_MODEL || "whisper-large-v3-turbo");
  forma.append("language", "pt");
  forma.append("response_format", "json");
  forma.append("temperature", "0");
  try {
    const res = await fetch(`${cfg.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      body: forma,
      signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
    });
    if (!res.ok) {
      const detalhe = await res.text().catch(() => "");
      await registrarUsoDaIa({ userId: p.userId, rota: p.rota, ok: false });
      console.error(`[eorg:ia:${p.rota}] provedor respondeu ${res.status} — ${detalhe.slice(0, 300)}`);
      return { ok: false, motivo: motivoDoStatus(res.status, detalhe) };
    }
    const data = (await res.json()) as { text?: string };
    await registrarUsoDaIa({ userId: p.userId, rota: p.rota, ok: true });
    const conteudo = String(data?.text ?? "").trim();
    return { ok: true, conteudo };
  } catch (e) {
    await registrarUsoDaIa({ userId: p.userId, rota: p.rota, ok: false });
    console.error(`[eorg:ia:${p.rota}] a chamada falhou —`, String(e).slice(0, 200));
    return { ok: false, motivo: "rede" };
  }
}

/** o JSON da resposta, sem a cerca de markdown; null quando não é JSON */
export function lerJsonDaIa(conteudo: string): unknown | null {
  const cru = conteudo
    .replace(/^```(?:json)?/m, "")
    .replace(/```\s*$/m, "")
    .trim();
  try {
    return JSON.parse(cru);
  } catch {
    return null;
  }
}
