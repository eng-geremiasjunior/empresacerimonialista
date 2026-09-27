"use server";

// As ações da aba Parceiras (183). O gate roda dentro de cada função da
// camada de dados (exigirSuperAdmin).

import { revalidatePath } from "next/cache";
import { aprovarParceiraDb, recusarParceiraDb, salvarReelsDb } from "@/lib/supabase/admin-parceiras";

export type ResultadoParceira = { ok?: boolean; error?: string };

const id = (f: FormData) => String(f.get("id") ?? "");

export async function aprovarParceira(f: FormData): Promise<void> {
  await aprovarParceiraDb(id(f));
  revalidatePath("/admin/parceiras");
}

export async function recusarParceira(f: FormData): Promise<void> {
  await recusarParceiraDb(id(f));
  revalidatePath("/admin/parceiras");
}

export async function salvarReels(_antes: ResultadoParceira, f: FormData): Promise<ResultadoParceira> {
  try {
    await salvarReelsDb(id(f), String(f.get("reels") ?? ""));
    revalidatePath("/admin/parceiras");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
}
