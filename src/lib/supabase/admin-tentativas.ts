// As tentativas barradas (207), no painel do dono: o bloqueio por IP e as
// recusas do cadastro, contados por hora. Só porta, motivo, IP e hora.

import "server-only";
import { exigirSuperAdmin, servico, tabelaAusente } from "@/lib/supabase/admin-painel";
import { IPS_BLOQUEADOS } from "@/lib/ips-bloqueados";
import type { MotivoBarrado, PortaBarrada } from "@/lib/tentativas-barradas";

export type TentativaBarrada = {
  hora: string;
  porta: PortaBarrada;
  motivo: MotivoBarrado;
  ip: string;
  /** um dos IPs da lista de bloqueio (o de quem abriu contas em série) */
  ipDaLista: boolean;
  vezes: number;
  ultimaEm: string;
};

export async function getTentativasBarradas(desdeIso: string): Promise<{ tentativas: TentativaBarrada[]; tabela: boolean }> {
  await exigirSuperAdmin();
  const { data, error } = await servico()
    .from("tentativa_barrada")
    .select("hora, porta, motivo, ip, vezes, ultima_em")
    .gte("hora", desdeIso)
    .order("ultima_em", { ascending: false })
    .limit(500);
  if (error) return { tentativas: [], tabela: !tabelaAusente(error) };
  return {
    tabela: true,
    tentativas: (data ?? []).map((t) => ({
      hora: t.hora as string,
      porta: t.porta as PortaBarrada,
      motivo: t.motivo as MotivoBarrado,
      ip: (t.ip as string) ?? "",
      ipDaLista: IPS_BLOQUEADOS.has((t.ip as string) ?? ""),
      vezes: Number(t.vezes ?? 1),
      ultimaEm: t.ultima_em as string,
    })),
  };
}
