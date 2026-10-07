import "server-only";

// Contas semelhantes no painel do dono (07/10/2026): a leitura dos grupos e
// o botão "Manter esta e encerrar as outras". A regra que agrupa é pura e
// mora em lib/contas-semelhantes.ts.
//
// Encerrar = a mesma suspensão do painel (todos os logins da empresa, por
// tempo indeterminado, sessões derrubadas, NADA apagado) e, em cada login
// encerrado, a marca de duplicidade com a conta que ficou — é ela que o
// login mostra a quem tentar entrar ("a sua conta ativa é i***@gmail.com").

import {
  definirBanimentoDb,
  exigirSuperAdmin,
  idsDaCasa,
  lerTudo,
  registrarAcaoAdmin,
  servico,
} from "./admin-painel";
import {
  agruparSemelhantes,
  emailMascarado,
  type ContaParaComparar,
  type GrupoSemelhante,
} from "@/lib/contas-semelhantes";

export async function getContasSemelhantes(): Promise<GrupoSemelhante[]> {
  await exigirSuperAdmin();
  const db = servico();

  const [empresas, origens, donas, uso, casa] = await Promise.all([
    lerTudo<{ id: string; nome: string | null; owner_user_id: string | null; created_at: string; tipo: string | null }>(
      (de, ate) => db.from("empresas").select("id, nome, owner_user_id, created_at, tipo").order("id").range(de, ate),
      "as empresas"
    ),
    lerTudo<{ empresa_id: string; fbp: string | null; ga_client_id: string | null; ip: string | null }>(
      (de, ate) =>
        db.from("origem_do_clique").select("empresa_id, fbp, ga_client_id, ip").order("empresa_id").range(de, ate),
      "a origem do clique"
    ).catch(() => []),
    lerTudo<{ empresa_id: string; whatsapp: string | null }>(
      (de, ate) =>
        db.from("membros_equipe").select("empresa_id, whatsapp").eq("is_owner", true).order("empresa_id").range(de, ate),
      "as donas"
    ),
    lerTudo<{ empresa_id: string; minutos: number | null }>(
      (de, ate) => db.from("uso_diario").select("empresa_id, minutos").order("empresa_id").range(de, ate),
      "o uso"
    ).catch(() => []),
    idsDaCasa(db),
  ]);

  const usuarios = new Map<string, { email?: string; nome: string | null; banidaAte: string | null }>();
  for (let page = 1; page <= 20; page++) {
    const { data: lote } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const users = lote?.users ?? [];
    for (const u of users) {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      usuarios.set(u.id, {
        email: u.email,
        nome: typeof meta.name === "string" ? meta.name : null,
        banidaAte: (u as unknown as { banned_until?: string | null }).banned_until ?? null,
      });
    }
    if (users.length < 1000) break;
  }

  const origemPor = new Map(origens.map((o) => [o.empresa_id, o]));
  const zapPor = new Map(donas.map((d) => [d.empresa_id, d.whatsapp]));
  const minutosPor = new Map<string, number>();
  for (const u of uso) minutosPor.set(u.empresa_id, (minutosPor.get(u.empresa_id) ?? 0) + (u.minutos ?? 0));
  const agora = Date.now();

  const contas: ContaParaComparar[] = empresas
    .filter((e) => !casa.has(e.id) && e.tipo !== "familia" && e.owner_user_id)
    .map((e) => {
      const dona = usuarios.get(e.owner_user_id!);
      const o = origemPor.get(e.id);
      return {
        empresaId: e.id,
        nome: e.nome ?? "(sem nome)",
        email: dona?.email ?? null,
        dona: dona?.nome ?? null,
        criadaEm: e.created_at,
        minutos: minutosPor.get(e.id) ?? 0,
        banida: Boolean(dona?.banidaAte && new Date(dona.banidaAte).getTime() > agora),
        fbp: o?.fbp ?? null,
        gaClientId: o?.ga_client_id ?? null,
        ip: o?.ip ?? null,
        whatsapp: zapPor.get(e.id) ?? null,
      };
    });

  return agruparSemelhantes(contas);
}

/**
 * Mantém uma conta e encerra as outras do grupo. O grupo é LIDO DE NOVO
 * aqui: a lista que veio da tela só diz qual manter, e só sai do ar o que
 * de fato está no mesmo grupo dela agora.
 */
export async function encerrarSemelhantesDb(manter: string): Promise<{ encerradas: number }> {
  const quem = await exigirSuperAdmin();
  const db = servico();
  const grupo = (await getContasSemelhantes()).find((g) => g.contas.some((c) => c.empresaId === manter));
  if (!grupo) throw new Error("Este grupo não existe mais — recarregue a página.");

  const mantida = grupo.contas.find((c) => c.empresaId === manter)!;
  const ativa = emailMascarado(mantida.email);
  const outras = grupo.contas.filter((c) => c.empresaId !== manter && !c.banida);

  let encerradas = 0;
  for (const c of outras) {
    await definirBanimentoDb(c.empresaId, true);
    // a marca que o login lê: qual conta ficou (só o e-mail mascarado)
    const { data: membros } = await db.from("membros_equipe").select("user_id").eq("empresa_id", c.empresaId);
    const { data: emp } = await db.from("empresas").select("owner_user_id").eq("id", c.empresaId).single();
    const ids = new Set<string>((membros ?? []).map((m) => m.user_id as string).filter(Boolean));
    if (emp?.owner_user_id) ids.add(emp.owner_user_id as string);
    for (const id of ids) {
      const { data: u } = await db.auth.admin.getUserById(id);
      await db.auth.admin.updateUserById(id, {
        app_metadata: {
          ...(u?.user?.app_metadata ?? {}),
          encerrada_por_duplicidade: { ativa, em: new Date().toISOString() },
        },
      });
    }
    encerradas++;
  }

  await registrarAcaoAdmin(db, quem, {
    acao: "contas_semelhantes_encerradas",
    empresaId: manter,
    depois: {
      mantida: mantida.nome,
      encerradas: outras.map((c) => c.nome),
      motivos: grupo.motivos,
    },
  });
  return { encerradas };
}
