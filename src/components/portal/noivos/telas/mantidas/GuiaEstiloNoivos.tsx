// Guia de estilo no portal dos noivos (README §22: mantida). Componente
// de SERVIDOR: as mesmas leituras e os mesmos componentes do ramo de
// sempre (guia-estilo/page.tsx), com o cabeçalho do desenho no lugar do
// TopoInterno. O guia.css continua vindo da página.

import { createClient } from "@/lib/supabase/server";
import { getGuiaDoEvento } from "@/lib/supabase/guia-estilo";
import { rotuloEventoDe } from "@/lib/papel";
import { GuiaDeEstilo } from "@/components/portal/GuiaDeEstilo";
import { AdicionarReferencia } from "@/components/portal/AdicionarReferencia";
import { TelaMantida } from "./TelaMantida";

export async function GuiaEstiloNoivos({ eventoId, tipo }: { eventoId: string; tipo: string }) {
  const supabase = createClient();
  const [guia, { data: acesso }] = await Promise.all([
    getGuiaDoEvento(eventoId),
    supabase.from("evento_acesso").select("nome").eq("event_id", eventoId).maybeSingle(),
  ]);

  // Sem guia ainda: as referências podem ir chegando (como no ramo de
  // sempre).
  if (!guia) {
    return (
      <TelaMantida
        eyebrow="Guia de estilo"
        titulo="Cores, flores e clima"
        sub={`A identidade visual ${rotuloEventoDe(tipo)} reunida num lugar só — paleta, flores, materiais, trajes e as referências de vocês.`}
      >
        <div className="guia-raiz">
          <div className="guia-veto">
            <p style={{ margin: 0, fontSize: 14, color: "var(--g-corpo)" }}>
              Sua cerimonialista ainda vai montar o guia com vocês. Enquanto isso, podem ir guardando as imagens
              que gostarem — elas entram como referência.
            </p>
          </div>
          <div style={{ marginTop: 16 }}>
            <AdicionarReferencia eventoId={eventoId} nomeSugerido={acesso?.nome ?? null} />
          </div>
        </div>
      </TelaMantida>
    );
  }

  // A segunda tranca de sempre: quem aprova é a CLIENTE (a RPC recusa
  // qualquer outro de todo jeito).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: souCliente } = await supabase.rpc("sou_cliente_do_evento", { p_event_id: eventoId });
  const ehCliente = Boolean(souCliente) && Boolean(user);

  return (
    <TelaMantida
      eyebrow="Guia de estilo"
      titulo="Cores, flores e clima"
      sub={`A identidade visual ${rotuloEventoDe(tipo)} de vocês. Depois de aprovado, é o que cada fornecedor recebe.`}
    >
      <GuiaDeEstilo eventoId={eventoId} tipo={tipo} guia={guia} ehCliente={ehCliente} />
      {ehCliente && (
        <div className="guia-raiz" style={{ marginTop: 20 }}>
          <AdicionarReferencia eventoId={eventoId} nomeSugerido={acesso?.nome ?? null} />
        </div>
      )}
    </TelaMantida>
  );
}
