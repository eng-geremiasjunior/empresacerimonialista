import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPaletas } from "@/lib/supabase/guia-estilo";
import { BibliotecaPaletas } from "@/components/catalogo/BibliotecaPaletas";

export const dynamic = "force-dynamic";

// A biblioteca de paletas é configuração da EMPRESA: a mesma serve todos
// os casamentos. Por isso mora aqui, no Catálogo, e não dentro do
// evento — lá ela seria remontada do zero a cada casal.
export default async function PaletasPage() {
  const supabase = createClient();
  const { data: cargoData } = await supabase.rpc("meu_cargo");
  const cargo = (cargoData as { empresa_id: string; cargo: string }[] | null)?.[0];

  if (cargo?.cargo !== "proprietaria") {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold text-gray-900">Paletas</h1>
        <p className="mt-4 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Só a proprietária edita a biblioteca de paletas.
        </p>
      </div>
    );
  }

  const paletas = await getPaletas();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/catalogo"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Catálogo
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">Paletas</h1>
        <p className="text-sm text-gray-500">
          As combinações de cor que você usa nos guias de estilo
        </p>
      </div>

      <BibliotecaPaletas paletas={paletas} />
    </div>
  );
}
