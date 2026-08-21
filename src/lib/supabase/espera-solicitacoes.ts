// Leitura da caixa de espera — SÓ SERVIDOR, e ÚNICA.
//
// O resumo do Copiloto deriva das MESMAS linhas que a lista mostra
// (resumoEspera sobre o mesmo array). Nada de segunda query "leve" que
// diverge — o sidebar e a lista contam a mesma história por construção.
//
// A visibilidade é da RLS (115): solicitação segue eventos_visiveis() e
// assistente não lê a Central. O events!inner abaixo é defesa de segunda
// linha — linha cujo evento a sessão não enxerga cai fora do resultado.

import { createClient } from "@/lib/supabase/server";
import {
  classificarEspera,
  ordenarEspera,
  agruparPorFornecedor,
  resumoEspera,
  type GrupoEspera,
  type LinhaEspera,
  type ResumoEspera,
  type SolicitacaoEspera,
} from "@/lib/espera-core";

export type Espera = {
  grupos: GrupoEspera[];
  linhas: LinhaEspera[];
  resumo: ResumoEspera;
};

function um<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function getEspera(): Promise<Espera | null> {
  const supabase = createClient();
  const agora = new Date().toISOString();

  const { data: linhasCru, error } = await supabase
    .from("solicitacao_fornecedor")
    .select(
      `id, supplier_id, event_id, tipo, titulo, status, prazo_ate,
       tentativas, enviada_em, reenviada_em, roteiro_item_id, task_id,
       events!inner(name, date, status, cerimonialista_responsavel_id),
       suppliers(name, whatsapp, phone, email),
       batida:batida_id(status, segurada_em)`
    )
    .in("status", ["pendente", "enviada", "reenviada", "expirada"]);

  if (error) return null;
  const cru = linhasCru ?? [];
  if (cru.length === 0) {
    return {
      grupos: [],
      linhas: [],
      resumo: { comOSistema: 0, atencao: 0, precisaDeVoce: 0, saiHoje: 0 },
    };
  }

  const supplierIds = [...new Set(cru.map((l) => l.supplier_id))];
  const taskIds = cru.map((l) => l.task_id).filter(Boolean) as string[];
  const respIds = [
    ...new Set(
      cru
        .map(
          (l) =>
            (um(l.events as never) as {
              cerimonialista_responsavel_id?: string | null;
            } | null)?.cerimonialista_responsavel_id ?? null
        )
        .filter(Boolean)
    ),
  ] as string[];

  const [acessosRes, tarefasRes, membrosRes, batidasEnviadasRes] =
    await Promise.all([
      supabase
        .from("fornecedor_acesso")
        .select("supplier_id, ultima_abertura")
        .in("supplier_id", supplierIds),
      taskIds.length > 0
        ? supabase
            .from("tasks")
            .select("id, status")
            .in("id", taskIds)
        : Promise.resolve({ data: [] as { id: string; status: string }[] }),
      respIds.length > 0
        ? supabase
            .from("membros_equipe")
            .select("id, nome")
            .in("id", respIds)
        : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
      supabase
        .from("batida")
        .select("supplier_id, enviada_em")
        .in("supplier_id", supplierIds)
        .eq("status", "enviada")
        .not("enviada_em", "is", null),
    ]);

  const aberturaPor = new Map(
    (acessosRes.data ?? []).map((a) => [a.supplier_id, a.ultima_abertura])
  );
  const tarefaPendente = new Set(
    (tarefasRes.data ?? [])
      .filter((t) => t.status !== "concluido")
      .map((t) => t.id)
  );
  const nomeMembro = new Map(
    (membrosRes.data ?? []).map((m) => [m.id, m.nome])
  );

  const solicitacoes: SolicitacaoEspera[] = cru.map((l) => {
    const ev = um(l.events as never) as {
      name?: string | null;
      date?: string | null;
      status?: string;
      cerimonialista_responsavel_id?: string | null;
    } | null;
    const forn = um(l.suppliers as never) as {
      name?: string;
      whatsapp?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
    const bat = um(l.batida as never) as {
      status?: "na_fila" | "segurada" | "enviada" | "cancelada";
      segurada_em?: string | null;
    } | null;
    const respId = ev?.cerimonialista_responsavel_id ?? null;
    return {
      id: l.id,
      supplierId: l.supplier_id,
      fornecedorNome: forn?.name ?? "Fornecedor",
      fornecedorTemCanal: Boolean(forn?.whatsapp || forn?.phone || forn?.email),
      eventId: l.event_id,
      eventoNome: ev?.name ?? null,
      eventoData: ev?.date ?? null,
      eventoStatus: ev?.status ?? "confirmado",
      responsavelMembroId: respId,
      responsavelNome: respId ? (nomeMembro.get(respId) ?? null) : null,
      tipo: l.tipo,
      titulo: l.titulo,
      status: l.status,
      prazoAte: l.prazo_ate,
      tentativas: l.tentativas ?? 0,
      enviadaEm: l.enviada_em,
      reenviadaEm: l.reenviada_em ?? null,
      roteiroItemId: l.roteiro_item_id ?? null,
      batidaStatus: bat?.status ?? null,
      batidaSeguradaEm: bat?.segurada_em ?? null,
      linkUltimaAbertura: aberturaPor.get(l.supplier_id) ?? null,
      tarefaPendenteId:
        l.task_id && tarefaPendente.has(l.task_id) ? l.task_id : null,
    };
  });

  const linhas = ordenarEspera(
    solicitacoes
      .map((s) => classificarEspera(s, agora))
      .filter((l): l is LinhaEspera => l !== null)
  );

  const grupos = agruparPorFornecedor(
    linhas,
    (batidasEnviadasRes.data ?? []).map((b) => ({
      supplierId: b.supplier_id,
      enviadaEm: b.enviada_em,
    })),
    agora
  );

  return { grupos, linhas, resumo: resumoEspera(linhas) };
}
