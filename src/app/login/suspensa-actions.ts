"use server";

// O recado de quem tenta entrar numa conta suspensa (07/10/2026). Sem ele,
// a pessoa via "e-mail ou senha incorretos" e tentava de novo. Quando a
// conta foi encerrada por repetir outra (contas semelhantes, no painel do
// dono), o recado diz qual conta ficou ativa — só o e-mail mascarado.
//
// A prova de dono vem antes de qualquer resposta: o Supabase só diz "conta
// suspensa" depois de conferir a senha. Com a senha errada, a resposta é a
// mesma de sempre — isto não serve para descobrir conta de ninguém.

import { createClient as createServico } from "@supabase/supabase-js";

const sem = (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" });

export async function recadoDaContaSuspensa(emailDigitado: string, senha: string): Promise<string | null> {
  const email = emailDigitado.trim().toLowerCase();
  if (!email || !senha) return null;
  try {
    const anon = createServico(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: sem },
    });
    const { data, error } = await anon.auth.signInWithPassword({ email, password: senha });
    if (data?.session) {
      await anon.auth.signOut({ scope: "local" });
      return null;
    }
    if (error?.code !== "user_banned") return null;

    const db = createServico(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: sem },
    });
    let ativa: string | null = null;
    for (let page = 1; page <= 20 && ativa === null; page++) {
      const { data: lote } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      const users = lote?.users ?? [];
      const u = users.find((x) => x.email?.toLowerCase() === email);
      if (u) {
        const marca = (u.app_metadata as { encerrada_por_duplicidade?: { ativa?: string | null } } | undefined)
          ?.encerrada_por_duplicidade;
        ativa = marca ? (marca.ativa ?? "") : "";
        break;
      }
      if (users.length < 1000) break;
    }
    if (ativa) {
      // tom impessoal de propósito (dono, 07/10/2026): é o sistema que
      // identificou, não uma pessoa que acusou
      return (
        "Identificamos várias contas vinculadas ao mesmo usuário. " +
        "Pela política de uso, somente 1 conta é mantida ativa por usuário. " +
        `Esta conta foi encerrada. Conta ativa: ${ativa}.`
      );
    }
    return "Esta conta está suspensa. Fale com o suporte pelo WhatsApp para reativar.";
  } catch {
    return null;
  }
}
