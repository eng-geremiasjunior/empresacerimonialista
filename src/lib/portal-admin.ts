// Criação e gestão do acesso ao Portal da Cliente via Admin API.
// SERVER-SIDE APENAS: nunca importar deste módulo em componente client —
// a SUPABASE_SERVICE_ROLE_KEY não pode chegar ao navegador.
//
// Mesmo padrão de cerimonialistas-admin.ts (o precedente de criar login
// para outra pessoa), com uma diferença que importa: as flags do portal
// vão em app_metadata, não user_metadata. user_metadata é editável pela
// própria usuária via auth.updateUser — ela poderia remover a marca de
// "sou do portal" e cair no app profissional. app_metadata só muda por
// service role.

import { createClient } from "@supabase/supabase-js";

export type PapelPortal =
  | "noiva"
  | "noivo"
  | "debutante"
  | "mae"
  | "pai"
  | "outro";

export const PAPEL_PORTAL_LABELS: Record<PapelPortal, string> = {
  noiva: "Noiva",
  noivo: "Noivo",
  debutante: "Debutante",
  mae: "Mãe",
  pai: "Pai",
  outro: "Outro",
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // Next.js cacheia fetches GET em contexto server; sempre no-store.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

// Senha provisória legível ao telefone: a cerimonialista dita para a
// cliente pelo WhatsApp. Sem caracteres ambíguos (0/O, 1/l/I) e sem
// símbolos, porque ela vai ser digitada uma vez e trocada em seguida.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITOS = "23456789";

export function gerarSenhaProvisoria(): string {
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  const letras = Array.from({ length: 6 }, (_, i) =>
    ALFABETO[bytes[i] % ALFABETO.length]
  ).join("");
  const numeros = Array.from({ length: 4 }, (_, i) =>
    DIGITOS[bytes[6 + i] % DIGITOS.length]
  ).join("");
  return `${letras}${numeros}`;
}

export type ResultadoAcesso =
  | { error: string }
  | {
      success: true;
      /** Ausente quando o login já existia e a senha não foi tocada. */
      senhaProvisoria?: string;
      jaTinhaLogin: boolean;
      /** O login também é de alguém da equipe (ex.: a própria dona testando). */
      ehEquipe: boolean;
    };

/**
 * Cria (ou reaproveita) o login da cliente e vincula ao evento.
 *
 * A autorização NÃO acontece aqui: quem chama é a server action, que já
 * confirmou pela sessão que a usuária pode editar o evento. Este módulo
 * roda com service role e portanto passa por cima da RLS — por isso ele
 * nunca é chamado direto de uma rota.
 */
export async function criarAcessoPortal(params: {
  eventId: string;
  empresaId: string;
  nome: string;
  email: string;
  papel: PapelPortal;
  clientId?: string | null;
  criadoPor?: string | null;
}): Promise<ResultadoAcesso> {
  const admin = adminClient();
  if (!admin) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente" };
  }

  const email = params.email.trim().toLowerCase();
  const senha = gerarSenhaProvisoria();

  // O login já existe? (a mesma pessoa pode ter outro evento com a
  // cerimonialista, ou já ser da equipe — no Supabase um e-mail é UMA
  // conta.)
  const { data: lista } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const existente = lista?.users.find(
    (u) => (u.email ?? "").toLowerCase() === email
  );

  // ------------------------------------------------------------------
  // Equipe e cliente não podem ser a MESMA conta.
  //
  // No Supabase um e-mail é uma conta só, e o navegador guarda uma sessão
  // por domínio. Se a cerimonialista também for cliente, entrar no portal
  // derruba a sessão dela do sistema, e as duas permissões passam a valer
  // ao mesmo tempo na mesma sessão — ela vira equipe e cliente conforme a
  // tela que abrir. Confuso de usar e ruim de auditar.
  //
  // Barrar aqui é mais barato que desfazer depois: quem precisa dos dois
  // papéis usa dois e-mails.
  // ------------------------------------------------------------------
  if (existente) {
    const { data: membro } = await admin
      .from("membros_equipe")
      .select("nome, cargo")
      .eq("user_id", existente.id)
      .maybeSingle();

    if (membro) {
      return {
        error:
          `Este e-mail já é da sua equipe (${membro.nome} · ${membro.cargo}). ` +
          `Use outro e-mail para o acesso da cliente — a mesma conta não pode ser as duas coisas.`,
      };
    }
  }

  const vinculo = {
    event_id: params.eventId,
    empresa_id: params.empresaId,
    client_id: params.clientId ?? null,
    nome: params.nome.trim(),
    email,
    papel: params.papel,
    status: "ativo",
    criado_por: params.criadoPor ?? null,
  };

  // ------------------------------------------------------------------
  // Caminho A — login novo: o CONVITE VEM ANTES DO LOGIN.
  //
  // O gatilho de signup (024) provisiona empresa para todo login novo.
  // Marcar app_metadata não resolve: o GoTrue insere a linha em auth.users
  // primeiro e grava o metadata depois, então o gatilho não enxerga a
  // marca (foi medido — a empresa nascia mesmo assim). O que ele enxerga
  // é o e-mail. Por isso o vínculo nasce aqui com user_id nulo, e o
  // gatilho o liga (088).
  // ------------------------------------------------------------------
  if (!existente) {
    const { error: conviteError } = await admin
      .from("evento_acesso")
      .insert({ ...vinculo, user_id: null });

    if (conviteError) {
      return {
        error: `Não foi possível preparar o convite: ${conviteError.message}`,
      };
    }

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { name: params.nome },
        // portal: o middleware roteia por esta marca;
        // senha_provisoria: força a troca no primeiro acesso.
        app_metadata: { portal: true, senha_provisoria: true },
      });

    if (authError || !authData?.user) {
      await admin
        .from("evento_acesso")
        .delete()
        .eq("event_id", params.eventId)
        .is("user_id", null)
        .eq("email", email);
      return {
        error: `Não foi possível criar o acesso: ${authError?.message ?? ""}`,
      };
    }

    const userId = authData.user.id;

    // O gatilho deveria ter ligado o convite. Se ele não estiver
    // instalado (auth.users pertence ao supabase_auth_admin no Supabase
    // hospedado), ligamos aqui — e desfazemos a empresa que tenha
    // nascido nesse caminho. A cliente não pode ser proprietária de nada.
    await admin
      .from("evento_acesso")
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq("event_id", params.eventId)
      .is("user_id", null)
      .eq("email", email);

    const { data: empresaOrfa } = await admin
      .from("empresas")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (empresaOrfa) {
      await admin.from("membros_equipe").delete().eq("user_id", userId);
      await admin.from("empresas").delete().eq("id", empresaOrfa.id);
    }

    return {
      success: true,
      senhaProvisoria: senha,
      jaTinhaLogin: false,
      ehEquipe: false,
    };
  }

  // ------------------------------------------------------------------
  // Caminho B — o login já existe.
  //
  // Se também é de alguém da equipe (a própria dona testando, ou uma
  // cerimonialista que vai se casar), o vínculo é criado mas a senha NÃO
  // é tocada: trocá-la derrubaria a pessoa do sistema, e marcar "senha
  // provisória" a prenderia na tela de primeiro acesso. Também não entra
  // a marca de portal, que a expulsaria da área profissional.
  // ------------------------------------------------------------------
  const userId = existente.id;
  const { data: membro } = await admin
    .from("membros_equipe")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  const ehEquipe = !!membro;

  if (!ehEquipe) {
    const { error: upErr } = await admin.auth.admin.updateUserById(userId, {
      password: senha,
      app_metadata: {
        ...(existente.app_metadata ?? {}),
        portal: true,
        senha_provisoria: true,
      },
    });
    if (upErr) {
      return { error: `Não foi possível preparar o acesso: ${upErr.message}` };
    }
  }

  const { error: vinculoError } = await admin
    .from("evento_acesso")
    .upsert(
      { ...vinculo, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "event_id,user_id" }
    );

  if (vinculoError) {
    return {
      error: `Não foi possível vincular ao evento: ${vinculoError.message}`,
    };
  }

  return {
    success: true,
    senhaProvisoria: ehEquipe ? undefined : senha,
    jaTinhaLogin: true,
    ehEquipe,
  };
}

/** Nova senha provisória para um acesso que já existe. */
export async function regerarSenhaProvisoria(
  userId: string
): Promise<{ senhaProvisoria?: string; error?: string }> {
  const admin = adminClient();
  if (!admin) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente" };
  }
  const senha = gerarSenhaProvisoria();
  const { data: user } = await admin.auth.admin.getUserById(userId);
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: senha,
    app_metadata: {
      ...(user?.user?.app_metadata ?? {}),
      portal: true,
      senha_provisoria: true,
    },
  });
  if (error) return { error: `Não foi possível gerar a senha: ${error.message}` };
  return { senhaProvisoria: senha };
}

/** Limpa a flag depois que a cliente escolheu a senha dela. */
export async function limparSenhaProvisoria(
  userId: string
): Promise<{ error?: string }> {
  const admin = adminClient();
  if (!admin) return { error: "Ambiente sem service role" };
  const { data: user } = await admin.auth.admin.getUserById(userId);
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(user?.user?.app_metadata ?? {}),
      portal: true,
      senha_provisoria: false,
    },
  });
  if (error) return { error: error.message };
  return {};
}
