// As mesas da noiva que abriu a conta sozinha (04/10/2026): o MESMO
// editor da cerimonialista (croqui em escala, sentar pela mesa ou pelo
// convidado, a saúde de cada mesa, o "chegou" no dia), num cartão do
// portal. Componente de servidor: só a moldura; o editor é o de sempre.

import { MesasDoEvento } from "@/components/mesas/MesasDoEvento";
import type { ConvidadoDaLista, Relacao, Salao } from "@/lib/supabase/mesas";
import type { Elemento, Mesa } from "@/lib/croqui-core";
import { Eyebrow } from "../../primitivas";
import "./mesas.css";

export function MesasDaNoiva(p: {
  eventoId: string;
  tipoEvento: string;
  data: string;
  salao: Salao | null;
  mesas: Mesa[];
  elementos: Elemento[];
  convidados: ConvidadoDaLista[];
  relacoes: Relacao[];
  presentes: number | null;
}) {
  return (
    <section className="pn-mesas" aria-labelledby="pn-mesas-titulo">
      <Eyebrow>Mesas</Eyebrow>
      <h1 id="pn-mesas-titulo" className="pn-t pn-mesas-titulo">
        Quem senta onde
      </h1>
      <div className="pn-mesas-editor">
        <MesasDoEvento
          eventId={p.eventoId}
          tipoEvento={p.tipoEvento}
          eventDate={p.data}
          salao={p.salao}
          mesas={p.mesas}
          elementos={p.elementos}
          convidados={p.convidados}
          relacoes={p.relacoes}
          presentes={p.presentes}
          noPortal={{ convidados: `/portal/${p.eventoId}/convidados` }}
        />
      </div>
    </section>
  );
}
