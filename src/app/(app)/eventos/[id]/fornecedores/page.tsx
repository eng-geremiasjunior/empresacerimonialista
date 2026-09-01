import { getFornecedoresDoEvento } from "@/lib/supabase/fornecedores-evento";
import { createClient } from "@/lib/supabase/server";
import { contratoAnexado } from "@/lib/fornecedores-core";
import { FornecedoresDoEvento } from "@/components/fornecedores/FornecedoresDoEvento";
import { AdicionarFornecedorButton } from "@/components/fornecedores/AdicionarFornecedorButton";
import {
  ExtrairContrato,
  type ContratoParaExtrair,
} from "@/components/fornecedores/ExtrairContrato";
import type { PropostaExtracao } from "@/lib/contrato-extracao-core";

export const dynamic = "force-dynamic";

// A aba Fornecedores do evento. A leitura junta vínculo + cadastro +
// convite; quem decide status, grupo e contagem é fornecedores-core.
export default async function EventoFornecedoresPage({
  params,
}: {
  params: { id: string };
}) {
  const { fornecedores, automacao } = await getFornecedoresDoEvento(params.id);

  // Extração de contrato (138): os PDFs recebidos e o estado da proposta
  // de cada um. Degrada em silêncio se a migração ainda não rodou.
  const supabase = createClient();
  const { data: extRows } = await supabase
    .from("contrato_extracao")
    .select("id, solicitacao_id, status, payload")
    .eq("event_id", params.id);
  const extPorSolicitacao = new Map(
    (extRows ?? []).map((e) => [e.solicitacao_id as string, e])
  );

  const contratos: ContratoParaExtrair[] = [];
  for (const f of fornecedores) {
    const anexo = contratoAnexado(f);
    if (!anexo || !anexo.path.toLowerCase().endsWith(".pdf")) continue;
    const pedido = f.pedidos.find(
      (p) => p.tipo === "contrato" && p.arquivoPath === anexo.path
    );
    if (!pedido) continue;
    const ext = extPorSolicitacao.get(pedido.id);
    // conferida ou descartada: o trabalho acabou, a seção não cobra mais
    if (ext && ext.status !== "proposta") continue;
    contratos.push({
      solicitacaoId: pedido.id,
      supplierId: f.supplierId,
      fornecedorNome: f.nome,
      arquivoPath: anexo.path,
      arquivoNome: anexo.nome,
      itemRoteiroTitulo: f.itemRoteiro?.titulo ?? null,
      extracao: ext
        ? { id: ext.id as string, payload: ext.payload as PropostaExtracao }
        : null,
    });
  }

  return (
    <FornecedoresDoEvento
      eventId={params.id}
      fornecedores={fornecedores}
      automacao={automacao}
      botaoAdicionar={<AdicionarFornecedorButton eventId={params.id} />}
      extracao={<ExtrairContrato eventId={params.id} contratos={contratos} />}
    />
  );
}
