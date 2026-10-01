// Escolhas do casal no portal dos noivos (README §22: mantida).
// Componente de SERVIDOR: as mesmas leituras e os mesmos componentes do
// ramo de sempre (escolhas/page.tsx) — as opções que a cerimonialista
// publicou —, com o cabeçalho do desenho no lugar do TopoInterno.

import { getContatoCerimonialista } from "@/lib/supabase/portal";
import { getCuradoriasDoPortal } from "@/lib/supabase/curadoria";
import { Cartao } from "@/components/portal/Nucleo";
import { SelecaoCurada } from "@/components/portal/SelecaoCurada";
import { TelaMantida } from "./TelaMantida";

export async function EscolhasNoivos({ eventoId }: { eventoId: string }) {
  const [curadorias, contato] = await Promise.all([
    getCuradoriasDoPortal(eventoId),
    getContatoCerimonialista(eventoId),
  ]);

  const abertas = curadorias.filter((c) => c.estado === "publicada");
  const respondidas = curadorias.filter((c) => c.estado !== "publicada");

  // o subtítulo é o apoio de sempre; o título diz se há o que escolher
  const sub =
    abertas.length > 0
      ? "O que já foi pesquisado para vocês. Escolham com calma — e se nada agradar, é só dizer."
      : curadorias.length > 0
        ? "Tudo respondido. Quando houver opções novas, elas aparecem aqui."
        : `Quando ${contato.nome?.split(" ")[0] ?? "sua cerimonialista"} separar opções para vocês, elas aparecem aqui — com foto, valor e o que está incluído.`;

  return (
    <TelaMantida
      eyebrow="Escolhas do casal"
      titulo={abertas.length > 0 ? "Para vocês escolherem" : "O que vocês já decidiram"}
      sub={sub}
    >
      {abertas.map((c) => (
        <SelecaoCurada key={c.id} eventoId={eventoId} curadoria={c} cerimonialista={contato.nome} />
      ))}

      {respondidas.length > 0 && (
        <>
          {abertas.length > 0 && <div style={{ height: 1, background: "var(--cor-borda-linha)" }} />}
          {respondidas.map((c) => (
            <SelecaoCurada key={c.id} eventoId={eventoId} curadoria={c} cerimonialista={contato.nome} />
          ))}
        </>
      )}

      {curadorias.length === 0 && (
        <Cartao padding="var(--esp-6)">
          <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>Nada para escolher agora.</p>
        </Cartao>
      )}
    </TelaMantida>
  );
}
