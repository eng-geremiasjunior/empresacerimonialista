import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AcessoDaCliente,
  type AcessoLinha,
} from "@/components/evento/AcessoDaCliente";

export const dynamic = "force-dynamic";

// A visão da cerimonialista sobre o que a cliente enxerga deste evento.
// Por ora: quem tem acesso e por onde ela entra. O espaço existe para
// crescer — conferência de blocos preenchidos pela cliente, curadoria das
// opções, fila de sugestões do cronograma. Nada disso é prometido aqui:
// a tela mostra só o que já funciona.
export default async function AreaDoClientePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: evento } = await supabase
    .from("events")
    .select("id, clients(id, name, email)")
    .eq("id", params.id)
    .maybeSingle();

  if (!evento) notFound();

  const { data: acessosData } = await supabase
    .from("evento_acesso")
    .select("id, nome, email, papel, status")
    .eq("event_id", params.id)
    .order("created_at", { ascending: true });

  const acessos = (acessosData ?? []) as AcessoLinha[];
  const ativos = acessos.filter((a) => a.status === "ativo").length;

  // O portal mostra o nome do membro responsável (ou da dona). Enquanto
  // ele for o literal do gatilho de cadastro, a cliente lê
  // "Sua cerimonialista: Proprietária" — avisar aqui, onde o acesso nasce.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: meuMembro } = await supabase
    .from("membros_equipe")
    .select("nome")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const nomePlaceholder =
    meuMembro?.nome === "Proprietária" || meuMembro?.nome === "Proprietaria";

  const cliente = (
    evento as unknown as {
      clients: { id: string; name: string; email: string | null } | null;
    }
  ).clients;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">Área do cliente</h2>
        <p className="mt-1 text-sm text-gray-500">
          {ativos === 0
            ? "Ninguém acompanha este evento pelo portal ainda."
            : ativos === 1
              ? "1 pessoa acompanha este evento pelo portal."
              : `${ativos} pessoas acompanham este evento pelo portal.`}
        </p>
      </div>

      {nomePlaceholder && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          A cliente verá &ldquo;Proprietária&rdquo; como o nome da
          cerimonialista.{" "}
          <Link href="/configuracoes" className="font-medium underline">
            Defina seu nome em Configurações
          </Link>
          .
        </p>
      )}

      <AcessoDaCliente
        eventId={params.id}
        acessos={acessos}
        clienteSugerido={
          cliente
            ? { id: cliente.id, nome: cliente.name, email: cliente.email ?? null }
            : null
        }
      />

      {/* a lista de convidados mora na aba Mesas, junto de onde é usada */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Por onde ela entra
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          O endereço é o mesmo para todas as clientes. Cada uma vê apenas os
          eventos aos quais tem acesso.
        </p>
        <Link
          href="/portal/entrar"
          target="_blank"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          Abrir /portal/entrar
        </Link>
      </section>
    </div>
  );
}
