// Documentos — contratos e comprovantes, o que espera aprovação e o
// histórico (desenho v4, README §12). Componente de SERVIDOR: lê pela
// sessão da família (a RLS decide o que volta) e entrega à tela só dados
// simples. Nenhum valor em dinheiro atravessa: da parcela vão o nome, a
// data e o link do comprovante; o termo do aceite (valor e CPF) nem é
// pedido — o filtro por `contrato_prestacao` fica aqui também, porque a
// equipe abre o portal e a RLS dela entrega o termo.

import { createClient } from "@/lib/supabase/server";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getEscolhasDoPortal } from "@/lib/supabase/portal-escolhas";
import { getGuiaDoEvento } from "@/lib/supabase/guia-estilo";
import { getDinheiroDoPortal } from "@/lib/supabase/portal-dinheiro";
import { getMeuAcesso } from "@/lib/supabase/portal-estilo";
import { hojeBR } from "@/lib/tempo";
import {
  montarDocumentos,
  montarHistorico,
  montarPendentes,
  type ComprovanteBruto,
  type ContratoBruto,
  type GuiaBruto,
} from "./montar";
import { TelaDocumentos } from "./TelaDocumentos";

export async function DocumentosSecao({ eventoId }: { eventoId: string }) {
  const evento = await getEventoDoPortal(eventoId);
  if (!evento) return null;

  const supabase = createClient();
  const [contratosRes, dinheiro, escolhas, guia, eu] = await Promise.all([
    // o contrato de prestação que a cliente aceitou (163); abre por
    // /api/documento/<id>, que confere de novo pela sessão dela
    supabase
      .from("evento_documento")
      .select("id, orcamento_aceite_id, created_at")
      .eq("event_id", evento.id)
      .eq("categoria", "contrato_prestacao")
      .order("created_at", { ascending: false }),
    getDinheiroDoPortal(evento.id),
    getEscolhasDoPortal(evento.id, evento.data),
    getGuiaDoEvento(evento.id),
    getMeuAcesso(evento.id),
  ]);

  const contratos = (contratosRes.error ? [] : (contratosRes.data ?? [])) as ContratoBruto[];

  // os comprovantes que a família subiu nas parcelas (178)
  const comprovantes: ComprovanteBruto[] = dinheiro.fornecedores.flatMap((f) =>
    f.parcelas
      .filter((p) => p.comprovante)
      .map((p) => ({
        parcelaId: p.id,
        fornecedor: f.nome,
        descricao: p.descricao,
        pagoEm: p.pagoEm,
        url: p.comprovante!.url,
      }))
  );

  // do guia, só o que a tela mostra (nada de veto nem motivo interno)
  const guiaBruto: GuiaBruto | null = guia
    ? {
        id: guia.id,
        nome: guia.nome,
        sensacao: guia.sensacao,
        situacao: guia.situacao,
        cores: guia.cores.map((c) => c.nome),
        historico: guia.historico,
      }
    : null;

  const hoje = hojeBR();
  return (
    <TelaDocumentos
      documentos={montarDocumentos({ contratos, comprovantes, marcaNome: evento.marca?.nome ?? null })}
      pendentes={montarPendentes({ escolhas: escolhas.listadas, guia: guiaBruto, hoje })}
      historico={montarHistorico({ escolhas: escolhas.listadas, guia: guiaBruto })}
      eu={eu.nome?.trim().split(/\s+/)[0] || null}
    />
  );
}
