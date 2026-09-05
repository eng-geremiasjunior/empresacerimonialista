"use server";

// Server actions do painel do dono. O gate roda DENTRO de cada função da
// camada de dados (exigirSuperAdmin) — aqui só traduzimos formulário e
// devolvemos erro legível. Nenhuma action confia no gate da página.

import { revalidatePath } from "next/cache";
import {
  definirBanimentoDb,
  salvarAssinaturaDb,
  salvarGastoDb,
} from "@/lib/supabase/admin-painel";
import { desmascararDinheiro } from "@/lib/format";
import { ehCodigoDoPlano } from "@/lib/planos";

export type ResultadoAdmin = { ok?: boolean; error?: string };

// Os dois planos herdados que a 147 mantém fora do catálogo: 'piloto'
// (quem nunca assinou) e 'cortesia' (conta sem limite, por decisão do
// dono). Junto com os três do catálogo, são o vocabulário inteiro do
// CHECK de assinaturas.plano.
const PLANOS_HERDADOS = ["piloto", "cortesia"];

function planoAceito(plano: string): boolean {
  return ehCodigoDoPlano(plano) || PLANOS_HERDADOS.includes(plano);
}

export async function salvarAssinatura(
  _prev: ResultadoAdmin,
  formData: FormData
): Promise<ResultadoAdmin> {
  try {
    const empresaId = String(formData.get("empresa_id") ?? "");
    const status = String(formData.get("status") ?? "trial");
    if (!empresaId) return { error: "Conta inválida." };
    if (!["trial", "ativa", "pausada", "cancelada"].includes(status)) {
      return { error: "Status inválido." };
    }
    // O CHECK do banco recusaria de todo jeito, mas a mensagem do
    // Postgres não diz ao dono qual era a lista.
    const plano = String(formData.get("plano") ?? "").trim();
    if (!planoAceito(plano)) {
      return {
        error:
          "Plano inválido. Aceitos: essencial, profissional, master, cortesia ou piloto.",
      };
    }
    const valor = desmascararDinheiro(String(formData.get("valor") ?? "")) ?? 0;

    await salvarAssinaturaDb({
      empresaId,
      plano,
      valorMensal: valor,
      status: status as "trial" | "ativa" | "pausada" | "cancelada",
      observacao: String(formData.get("observacao") ?? "").trim() || null,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/contas");
    return { ok: true };
  } catch (e) {
    console.error("[vela:admin] salvarAssinatura:", e);
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
}

export async function salvarGasto(
  _prev: ResultadoAdmin,
  formData: FormData
): Promise<ResultadoAdmin> {
  try {
    const mes = String(formData.get("mes") ?? "");
    if (!/^\d{4}-\d{2}$/.test(mes)) return { error: "Mês inválido." };
    const valor = desmascararDinheiro(String(formData.get("valor") ?? ""));
    if (valor === null) return { error: "Informe o valor gasto." };
    await salvarGastoDb(mes, valor);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    console.error("[vela:admin] salvarGasto:", e);
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
}

export async function definirBanimento(
  empresaId: string,
  banir: boolean
): Promise<ResultadoAdmin & { afetados?: number }> {
  try {
    if (!empresaId) return { error: "Conta inválida." };
    const { afetados } = await definirBanimentoDb(empresaId, banir);
    revalidatePath("/admin/contas");
    return { ok: true, afetados };
  } catch (e) {
    console.error("[vela:admin] definirBanimento:", e);
    return {
      error: e instanceof Error ? e.message : "Não foi possível alterar.",
    };
  }
}
