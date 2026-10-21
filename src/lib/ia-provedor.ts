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
  | "rede";

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

/** o gpt-oss pensa antes de responder; "low" basta para extrair */
const extraDo = (modelo: string) => (modelo.includes("gpt-oss") ? { reasoning_effort: "low" } : {});

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
}): Promise<RespostaDaIa> {
  const cfg = configuracaoDa(p.tarefa ?? "texto");
  if (!cfg.apiKey) {
    console.error(`[eorg:ia:${p.rota}] chave ausente no ambiente desta implantação`);
    return { ok: false, motivo: "sem_chave" };
  }

  const corpo = JSON.stringify({
    model: cfg.modelo,
    temperature: p.temperatura ?? 0,
    ...extraDo(cfg.modelo),
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
      const conteudo = String(data?.choices?.[0]?.message?.content ?? "").trim();
      return conteudo ? { ok: true, conteudo } : { ok: false, motivo: "provedor" };
    }
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
