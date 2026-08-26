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

export type ResultadoAdmin = { ok?: boolean; error?: string };

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
    const valor = desmascararDinheiro(String(formData.get("valor") ?? "")) ?? 0;

    await salvarAssinaturaDb({
      empresaId,
      plano: String(formData.get("plano") ?? "piloto").trim() || "piloto",
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
