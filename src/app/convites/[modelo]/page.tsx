import { notFound } from "next/navigation";
import { ehIdDeConvite } from "@/components/convite-digital/catalogo";
import { ehParDeFonte } from "@/lib/site-pares";
import { ConviteDeExemplo } from "./ConviteDeExemplo";

// O exemplo de cada convite (Clara e Vicente, os textos do desenho), com a
// fonte e a paleta pela URL — a galeria do portal abre aqui. Com ?ao-vivo=1
// ele espera os dados da noiva por postMessage (a prévia do editor): nada
// pessoal passa pela URL.

type Props = {
  params: { modelo: string };
  searchParams: Record<string, string | string[] | undefined>;
};

const um = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default function ExemploDoConvite({ params, searchParams }: Props) {
  if (!ehIdDeConvite(params.modelo)) notFound();
  const fonte = um(searchParams.fonte);
  const paleta = um(searchParams.paleta);
  const forma = um(searchParams.forma);
  return (
    <ConviteDeExemplo
      modelo={params.modelo}
      fonte={ehParDeFonte(fonte) ? fonte : null}
      paleta={paleta && /^[a-z0-9-]{1,30}$/.test(paleta) ? paleta : null}
      forma={forma === "Nota musical" ? forma : null}
      aoVivo={um(searchParams["ao-vivo"]) === "1"}
    />
  );
}
