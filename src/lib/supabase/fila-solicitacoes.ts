// Leitura da fila do dia.
//
// A rotina noturna decide o que agrupar; aqui só montamos o que ela vê:
// uma linha por fornecedor, com o texto exatamente como vai sair. Nada de
// "3 mensagens pendentes" sem mostrar o conteúdo — ela precisa poder ler
// antes de soltar, senão a automação vira aposta.

import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/email";
import { textoDaBatida, type Solicitacao } from "@/lib/solicitacoes-core";

export type ItemDaFila = {
  batidaId: string;
  canal: "whatsapp" | "email";
  status: "na_fila" | "segurada";
  fornecedor: { id: string; nome: string; whatsapp: string | null };
  pendencias: { id: string; titulo: string; evento: string; quando: string | null }[];
  /** o texto pronto, do jeito que chega no celular do fornecedor */
  texto: string;
  /** wa.me já com o texto embutido — o envio em um toque */
  linkWhatsapp: string | null;
  /** para o canal e-mail, o destino que a rotina escolheu */
  email: string | null;
};

function um<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function getFilaDoDia(): Promise<ItemDaFila[]> {
  const supabase = createClient();

  const { data: batidas } = await supabase
    .from("batida")
    .select(
      "id, canal, status, supplier_id, empresa_id, suppliers(name, whatsapp, phone, email), empresas(nome)"
    )
    .in("status", ["na_fila", "segurada"])
    .order("created_at");

  if (!batidas || batidas.length === 0) return [];

  const { data: itens } = await supabase
    .from("solicitacao_fornecedor")
    .select(
      "id, batida_id, supplier_id, event_id, tipo, titulo, status, dispara_em, prazo_ate, tentativas, enviada_em, events(name, date, clients(name))"
    )
    .in(
      "batida_id",
      batidas.map((b) => b.id)
    );

  const { data: acessos } = await supabase
    .from("fornecedor_acesso")
    .select("supplier_id, hash")
    .in(
      "supplier_id",
      batidas.map((b) => b.supplier_id)
    );
  const hashPorFornecedor = new Map(
    (acessos ?? []).map((a) => [a.supplier_id, a.hash])
  );

  const base = appUrl();
  const fila: ItemDaFila[] = [];

  for (const b of batidas) {
    const forn = um(b.suppliers as never) as {
      name?: string;
      whatsapp?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
    const emp = um(b.empresas as never) as { nome?: string | null } | null;
    const hash = hashPorFornecedor.get(b.supplier_id);
    if (!forn || !hash) continue;

    const meus = (itens ?? []).filter((i) => i.batida_id === b.id);
    if (meus.length === 0) continue;

    const comoNucleo: Solicitacao[] = meus.map((i) => {
      const ev = um(i.events as never) as {
        name?: string | null;
        date?: string | null;
        clients?: unknown;
      } | null;
      const cli = um((ev?.clients ?? null) as never) as { name?: string } | null;
      return {
        id: i.id,
        supplierId: i.supplier_id,
        eventId: i.event_id,
        tipo: i.tipo,
        titulo: i.titulo,
        status: i.status,
        disparaEm: i.dispara_em,
        prazoAte: i.prazo_ate,
        tentativas: i.tentativas ?? 0,
        enviadaEm: i.enviada_em,
        reenvioHoras: null,
        eventoNome: ev?.name ?? cli?.name ?? null,
        eventoData: ev?.date ?? null,
      };
    });

    const link = `${base}/fornecedor/${hash}`;
    const texto = textoDaBatida(
      forn.name ?? "fornecedor",
      emp?.nome ?? "a cerimonialista",
      comoNucleo,
      link
    );

    const telefone = forn.whatsapp ?? forn.phone ?? null;
    const digitos = telefone?.replace(/\D/g, "") ?? "";
    const comDDI = digitos.startsWith("55") ? digitos : `55${digitos}`;

    fila.push({
      batidaId: b.id,
      canal: b.canal,
      status: b.status,
      fornecedor: { id: b.supplier_id, nome: forn.name ?? "Fornecedor", whatsapp: telefone },
      pendencias: comoNucleo.map((s) => ({
        id: s.id,
        titulo: s.titulo,
        evento: s.eventoNome ?? "Evento",
        quando: s.eventoData,
      })),
      texto,
      linkWhatsapp:
        digitos.length >= 10
          ? `https://wa.me/${comDDI}?text=${encodeURIComponent(texto)}`
          : null,
      email: forn.email ?? null,
    });
  }

  return fila;
}
