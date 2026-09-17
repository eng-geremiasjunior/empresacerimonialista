"use server";

// Server actions do painel do dono. O gate roda DENTRO de cada função da
// camada de dados (exigirSuperAdmin) — aqui só traduzimos formulário e
// devolvemos erro legível. Nenhuma action confia no gate da página.

import { revalidatePath } from "next/cache";
import {
  type AgoraDaConta,
  avisarRespostaPorEmailDb,
  getAgoraDasContas,
  definirBanimentoDb,
  definirContaDaCasaDb,
  responderSuporteDb,
  type ResultadoDoAviso,
  salvarAssinaturaDb,
  salvarGastoDb,
  salvarPortaoDoTesteDb,
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

export async function salvarPortaoDoTeste(
  _prev: ResultadoAdmin,
  formData: FormData
): Promise<ResultadoAdmin> {
  try {
    const aberto = String(formData.get("aberto") ?? "") === "1";
    const dias = Number(String(formData.get("dias") ?? "7").replace(/\D/g, "")) || 7;
    await salvarPortaoDoTesteDb({ aberto, dias });
    revalidatePath("/admin");
    revalidatePath("/planos");
    return { ok: true };
  } catch (e) {
    console.error("[vela:admin] salvarPortaoDoTeste:", e);
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
}

/**
 * A resposta do dono a uma conversa da caixinha de suporte (161). Sai
 * também por e-mail; o que o envio fez volta junto, para a tela dizer.
 */
export async function responderSuporte(
  userId: string,
  texto: string
): Promise<ResultadoAdmin & Partial<ResultadoDoAviso>> {
  try {
    if (!userId) return { error: "Conversa inválida." };
    const aviso = await responderSuporteDb(userId, texto);
    revalidatePath("/admin/suporte");
    return { ok: true, ...aviso };
  } catch (e) {
    console.error("[eorganizei:admin] responderSuporte:", e);
    return { error: e instanceof Error ? e.message : "Não foi possível responder." };
  }
}

/** O aviso por e-mail de uma resposta que ficou sem ele. */
export async function avisarRespostaPorEmail(
  mensagemId: string
): Promise<ResultadoAdmin & Partial<ResultadoDoAviso>> {
  try {
    if (!mensagemId) return { error: "Resposta inválida." };
    const aviso = await avisarRespostaPorEmailDb(mensagemId);
    revalidatePath("/admin/suporte");
    return { ok: true, ...aviso };
  } catch (e) {
    console.error("[eorganizei:admin] avisarRespostaPorEmail:", e);
    return { error: e instanceof Error ? e.message : "Não foi possível avisar." };
  }
}

/** Marca (ou desmarca) uma conta como da casa: fora dos números do painel. */
export async function definirContaDaCasa(
  empresaId: string,
  daCasa: boolean
): Promise<ResultadoAdmin> {
  try {
    if (!empresaId) return { error: "Conta inválida." };
    await definirContaDaCasaDb(empresaId, daCasa);
    revalidatePath("/admin");
    revalidatePath("/admin/contas");
    revalidatePath("/admin/suporte");
    return { ok: true };
  } catch (e) {
    console.error("[eorganizei:admin] definirContaDaCasa:", e);
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
}

/**
 * Quem está no sistema agora, para a tela Contas se atualizar sozinha.
 * Null quando a leitura falha: a tela mantém o que já mostrava, em vez de
 * apagar todo mundo para offline.
 */
export async function agoraDasContas(): Promise<Record<string, AgoraDaConta> | null> {
  try {
    return await getAgoraDasContas();
  } catch (e) {
    console.error("[eorganizei:admin] agoraDasContas:", e instanceof Error ? e.message.slice(0, 120) : e);
    return null;
  }
}
