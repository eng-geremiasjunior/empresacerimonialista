import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { EditorDoModelo, type AssuntoDoModelo } from "@/components/modelo/EditorDoModelo";

export const dynamic = "force-dynamic";

// Meu modelo (23/09/2026): o planejamento com que cada evento nasce, por
// tipo. Ela monta, edita e importa o checklist que já usa (planilha, Word,
// PDF ou texto colado). O que já existe no método é somado, nunca
// substituído — decisão do dono.

// "outro" não tem modelo: não é um tipo de evento, é a falta dele
const TIPOS = (Object.keys(EVENT_TYPE_LABELS) as EventType[]).filter((t) => t !== "outro");

export default async function MeuModeloPage({
  searchParams,
}: {
  searchParams?: { tipo?: string };
}) {
  const tipo = (TIPOS as string[]).includes(searchParams?.tipo ?? "")
    ? (searchParams!.tipo as EventType)
    : "casamento";
  const supabase = createClient();
  const { data: cargoData } = await supabase.rpc("meu_cargo").maybeSingle();
  const cargo = cargoData as { empresa_id: string; cargo: string } | null;
  const proprietaria = cargo?.cargo === "proprietaria";

  const { data } = cargo
    ? await supabase
        .from("metodo_objetivo")
        .select(
          "id, nome, ordem, ativo_padrao, proprio, metodo_decisao(id, titulo, responsavel, offset_ideal_dias, fora_do_modelo, proprio, ordem)"
        )
        .eq("empresa_id", cargo.empresa_id)
        .eq("tipo_evento", tipo)
        .order("ordem")
    : { data: [] };

  const assuntos: AssuntoDoModelo[] = (
    (data ?? []) as {
      id: string;
      nome: string;
      ordem: number;
      ativo_padrao: boolean;
      proprio: boolean;
      metodo_decisao: {
        id: string;
        titulo: string;
        responsavel: "noivos" | "cerimonialista" | "ambos";
        offset_ideal_dias: number | null;
        fora_do_modelo: boolean;
        proprio: boolean;
        ordem: number;
      }[];
    }[]
  ).map((o) => ({
    id: o.id,
    nome: o.nome,
    ligadoSempre: o.ativo_padrao,
    proprio: o.proprio,
    decisoes: [...o.metodo_decisao]
      .sort((a, b) => a.ordem - b.ordem)
      .map((d) => ({
        id: d.id,
        titulo: d.titulo,
        responsavel: d.responsavel,
        diasAntes: d.offset_ideal_dias,
        fora: d.fora_do_modelo,
        proprio: d.proprio,
      })),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/configuracoes" className="text-sm text-gray-500 hover:text-gray-800">
          ← Configurações
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">Meu modelo de planejamento</h1>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Tipo de evento">
        {TIPOS.map((t) => (
          <Link
            key={t}
            href={`/configuracoes/modelo?tipo=${t}`}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              t === tipo
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            {EVENT_TYPE_LABELS[t]}
          </Link>
        ))}
      </nav>

      <EditorDoModelo tipo={tipo} assuntos={assuntos} podeEditar={proprietaria} />
    </div>
  );
}
