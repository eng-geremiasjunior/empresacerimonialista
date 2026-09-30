"use server";

// A conta da família (187): a noiva, ou o pai, a mãe ou o responsável da
// debutante, cria a conta sozinha, sem convite de cerimonialista.
//
// A ORDEM:
//  1. o LOGIN, já confirmado (a mesma decisão do cadastro da
//     cerimonialista: link na caixa de entrada é onde a maioria some), com
//     `portal: true` no app_metadata — é o que prende a conta ao portal, e
//     só o servidor escreve ali. O gatilho de cadastro (104) vê a marca de
//     portal e NÃO cria empresa;
//  2. a CONTA DA FAMÍLIA, numa função do banco que só a chave de serviço
//     executa: empresa de família, a dona, a cliente, o evento, o acesso ao
//     portal e o aceite dos termos, numa transação. Falhou, o login é
//     apagado — não sobra login sem evento;
//  3. a SESSÃO, entrando com a senha que ela acabou de escolher.
//
// E-mail já cadastrado para no passo 1 e manda entrar pela porta: conferir
// senha aqui transformaria um endereço público num provador de senhas.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createServico } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { TERMOS_VERSAO } from "@/lib/termos";

export type TipoDaFesta = "casamento" | "debutante";
export type PapelDaFamilia = "noiva" | "noivo" | "mae" | "pai" | "outro";

export type DadosDaFamilia = {
  tipo: TipoDaFesta;
  papel: PapelDaFamilia;
  festa: string;
  data: string;
  cidade: string;
  nome: string;
  email: string;
  senha: string;
  /** no 15 anos: "sou pai, mãe ou responsável legal pela debutante" */
  responsavel: boolean;
  termos: boolean;
  /** campo escondido: gente não preenche, robô preenche */
  site?: string;
};

export type ResultadoDaFamilia = { error: string; jaTemConta?: boolean };

function servico() {
  return createServico(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
    }
  );
}

// Amortecedor contra rajada (o mesmo molde do cadastro da cerimonialista):
// memória do processo, some no deploy, e é de propósito.
const JANELA_MS = 10 * 60 * 1000;
const MAX_POR_JANELA = 5;
const ultimas = new Map<string, number[]>();
function demaisTentativas(ip: string): boolean {
  const agora = Date.now();
  const anteriores = (ultimas.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  anteriores.push(agora);
  ultimas.set(ip, anteriores);
  if (ultimas.size > 5000) ultimas.clear();
  return anteriores.length > MAX_POR_JANELA;
}

const PAPEIS: Record<TipoDaFesta, PapelDaFamilia[]> = {
  casamento: ["noiva", "noivo"],
  debutante: ["mae", "pai", "outro"],
};

/** Hoje no horário de Brasília, em AAAA-MM-DD (a data do evento é local). */
function hojeBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function conferir(d: DadosDaFamilia): { error: string } | null {
  if (d.tipo !== "casamento" && d.tipo !== "debutante") return { error: "Escolha a festa." };
  if (!PAPEIS[d.tipo].includes(d.papel)) return { error: "Diga quem você é na festa." };
  const festa = d.festa?.trim() ?? "";
  if (festa.length < 2 || festa.length > 80) {
    return { error: d.tipo === "casamento" ? "Escreva os nomes do casal." : "Escreva o nome da debutante." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data ?? "") || d.data < hojeBR()) {
    return { error: "Confira a data da festa." };
  }
  if ((d.cidade?.trim() ?? "").length > 80) return { error: "A cidade passou do tamanho." };
  const nome = d.nome?.trim() ?? "";
  if (nome.length < 2 || nome.length > 80) return { error: "Escreva o seu nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email?.trim() ?? "")) return { error: "Confira o e-mail digitado." };
  if ((d.senha ?? "").length < 8) return { error: "A senha precisa de pelo menos 8 caracteres." };
  if (d.tipo === "debutante" && !d.responsavel) {
    return { error: "A conta dos 15 anos é aberta pelo pai, pela mãe ou pelo responsável." };
  }
  if (!d.termos) return { error: "Para criar a conta, aceite os termos." };
  return null;
}

export async function criarContaDaFamilia(d: DadosDaFamilia): Promise<ResultadoDaFamilia> {
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "desconhecido";

  // robô: responde como se tivesse dado certo e não cria nada
  if (d.site && d.site.trim()) redirect("/portal/entrar");
  if (demaisTentativas(ip)) {
    return { error: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo." };
  }
  const problema = conferir(d);
  if (problema) return problema;

  const email = d.email.trim().toLowerCase();
  const db = servico();

  // 1) o login
  const { data: criada, error: erroCriar } = await db.auth.admin.createUser({
    email,
    password: d.senha,
    email_confirm: true,
    // `name` e `portal` são as chaves que o gatilho de cadastro lê; a
    // marca de autoridade é a do app_metadata (só o servidor escreve)
    user_metadata: { name: d.nome.trim(), portal: true, familia: true },
    app_metadata: { portal: true, familia: true },
  });
  const userId = criada?.user?.id ?? null;
  if (erroCriar || !userId) {
    const jaExiste =
      erroCriar?.code === "email_exists" ||
      /already been registered|already exists/i.test(erroCriar?.message ?? "");
    if (jaExiste) {
      return { error: "Já existe uma conta com este e-mail. Entre com a sua senha.", jaTemConta: true };
    }
    // só o código: a mensagem do Supabase repete o e-mail digitado
    console.error("[eorganizei:familia] criar login:", erroCriar?.code ?? "sem código");
    return { error: "Não foi possível criar a conta agora. Tente de novo em alguns instantes." };
  }

  // 2) a conta da família, numa transação
  const { data: eventoId, error: erroConta } = await db.rpc("criar_conta_da_familia", {
    p_user: userId,
    p_nome: d.nome.trim(),
    p_papel: d.papel,
    p_tipo: d.tipo,
    p_data: d.data,
    p_festa: d.festa.trim(),
    p_cidade: (d.cidade ?? "").trim(),
    p_termos_versao: TERMOS_VERSAO,
    p_ip: ip === "desconhecido" ? null : ip,
    p_user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (erroConta || typeof eventoId !== "string") {
    console.error("[eorganizei:familia] criar conta:", erroConta?.code ?? "sem código");
    const { error: erroApagar } = await db.auth.admin.deleteUser(userId);
    if (erroApagar) console.error("[eorganizei:familia] desfazer login:", erroApagar.code ?? "sem código");
    return { error: "Não foi possível criar a conta agora. Tente de novo em alguns instantes." };
  }

  // 3) a sessão
  const supabase = createClient();
  const { error: erroEntrar } = await supabase.auth.signInWithPassword({ email, password: d.senha });
  if (erroEntrar) {
    console.error("[eorganizei:familia] entrar:", erroEntrar.code ?? "sem código");
    redirect("/portal/entrar");
  }
  redirect(`/portal/${eventoId}`);
}
