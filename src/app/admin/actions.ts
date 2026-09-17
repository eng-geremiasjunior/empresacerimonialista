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
import { prorrogarTesteDb, salvarNotaDb } from "@/lib/supabase/admin-contas";
import {
  apagarCustoDb,
  copiarRecorrentesDb,
  marcarCustoPagoDb,
  salvarAjustesDb,
  salvarCustoDb,
  salvarSaldoDb,
} from "@/lib/supabase/admin-receita";
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
    revalidarPainel();
    revalidatePath(`/admin/contas/${empresaId}`);
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
    revalidarPainel();
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
    revalidarPainel();
    revalidatePath(`/admin/contas/${empresaId}`);
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
    revalidarPainel();
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
    revalidarPainel();
    revalidatePath("/admin/suporte");
    revalidatePath(`/admin/contas/${empresaId}`);
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

// ------------------------------------------------------------------
// O painel repaginado (17/09/2026): ficha da conta, custos, caixa e
// ajustes. As funções de dados checam o dono e gravam a auditoria.
// ------------------------------------------------------------------

function revalidarPainel() {
  for (const p of [
    "/admin",
    "/admin/contas",
    "/admin/ativacao",
    "/admin/receita",
    "/admin/sistema",
    "/admin/auditoria",
    "/admin/ajustes",
  ]) {
    revalidatePath(p);
  }
}

export async function prorrogarTeste(
  _prev: ResultadoAdmin & { novoFim?: string },
  formData: FormData
): Promise<ResultadoAdmin & { novoFim?: string }> {
  try {
    const empresaId = String(formData.get("empresa_id") ?? "");
    const dias = Number(String(formData.get("dias") ?? "").replace(/\D/g, ""));
    const motivo = String(formData.get("motivo") ?? "");
    if (!empresaId) return { error: "Conta inválida." };
    const { novoFim } = await prorrogarTesteDb(empresaId, dias, motivo);
    revalidarPainel();
    revalidatePath(`/admin/contas/${empresaId}`);
    return { ok: true, novoFim };
  } catch (e) {
    console.error("[eorganizei:admin] prorrogarTeste:", e instanceof Error ? e.message : e);
    return { error: e instanceof Error ? e.message : "Não foi possível prorrogar." };
  }
}

export async function salvarNota(
  _prev: ResultadoAdmin,
  formData: FormData
): Promise<ResultadoAdmin> {
  try {
    const empresaId = String(formData.get("empresa_id") ?? "");
    if (!empresaId) return { error: "Conta inválida." };
    await salvarNotaDb(empresaId, String(formData.get("texto") ?? ""));
    revalidatePath(`/admin/contas/${empresaId}`);
    revalidatePath("/admin/auditoria");
    return { ok: true };
  } catch (e) {
    console.error("[eorganizei:admin] salvarNota:", e instanceof Error ? e.message : e);
    return { error: e instanceof Error ? e.message : "Não foi possível salvar a nota." };
  }
}

export async function salvarCusto(
  _prev: ResultadoAdmin,
  formData: FormData
): Promise<ResultadoAdmin> {
  try {
    const valor = desmascararDinheiro(String(formData.get("valor") ?? ""));
    if (valor === null) return { error: "Informe o valor." };
    await salvarCustoDb({
      mes: String(formData.get("mes") ?? ""),
      servico: String(formData.get("servico") ?? ""),
      categoria: String(formData.get("categoria") ?? ""),
      valor,
      recorrente: formData.get("recorrente") === "1",
      pago: formData.get("pago") === "1",
      nota: String(formData.get("nota") ?? "") || null,
    });
    revalidarPainel();
    return { ok: true };
  } catch (e) {
    console.error("[eorganizei:admin] salvarCusto:", e instanceof Error ? e.message : e);
    return { error: e instanceof Error ? e.message : "Não foi possível lançar o custo." };
  }
}

export async function apagarCusto(id: string): Promise<ResultadoAdmin> {
  try {
    if (!id) return { error: "Custo inválido." };
    await apagarCustoDb(id);
    revalidarPainel();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível apagar." };
  }
}

export async function marcarCustoPago(id: string, pago: boolean): Promise<ResultadoAdmin> {
  try {
    if (!id) return { error: "Custo inválido." };
    await marcarCustoPagoDb(id, pago);
    revalidarPainel();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
}

export async function copiarRecorrentes(mes: string): Promise<ResultadoAdmin & { copiados?: number }> {
  try {
    const { copiados } = await copiarRecorrentesDb(mes);
    revalidarPainel();
    return { ok: true, copiados };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível copiar." };
  }
}

export async function salvarSaldo(
  _prev: ResultadoAdmin,
  formData: FormData
): Promise<ResultadoAdmin> {
  try {
    const bruto = String(formData.get("valor") ?? "").trim();
    const negativo = bruto.startsWith("-");
    const valor = desmascararDinheiro(bruto.replace(/^-/, ""));
    if (valor === null) return { error: "Informe o saldo." };
    await salvarSaldoDb(
      String(formData.get("dia") ?? ""),
      negativo ? -valor : valor,
      String(formData.get("nota") ?? "") || null
    );
    revalidarPainel();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar o saldo." };
  }
}

export async function salvarAjustes(
  _prev: ResultadoAdmin,
  formData: FormData
): Promise<ResultadoAdmin> {
  try {
    const numero = (campo: string): number | null => {
      const t = String(formData.get(campo) ?? "").trim().replace(",", ".");
      if (!t) return null;
      const n = Number(t);
      if (!Number.isFinite(n)) throw new Error("Use só números nos ajustes.");
      return n;
    };
    await salvarAjustesDb({
      aliquotaImposto: numero("aliquota_imposto"),
      supabaseBancoMb: numero("supabase_banco_mb"),
      supabaseArquivosMb: numero("supabase_arquivos_mb"),
      resendEmailsMes: numero("resend_emails_mes"),
    });
    revalidarPainel();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar os ajustes." };
  }
}
