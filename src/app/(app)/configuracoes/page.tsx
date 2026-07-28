import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileSection } from "@/components/configuracoes/ProfileSection";
import { EmpresaSection } from "@/components/configuracoes/EmpresaSection";

export const dynamic = "force-dynamic";

// Perfil e empresa. O conteúdo das propostas (pacotes, textos, fotos,
// imagens) saiu daqui na 057: agora vive em /catalogo, separado por tipo
// de evento, porque um mesmo conjunto não servia para casamento e
// batizado ao mesmo tempo.
export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  const meta = (user?.user_metadata ?? {}) as {
    avatar_url?: string | null;
    display_name?: string | null;
  };
  const name = meta.display_name ?? "";
  const initials = (name || email).slice(0, 2).toUpperCase();

  const { data: cargoData } = await supabase.rpc("meu_cargo");
  const cargo = (cargoData as { empresa_id: string; cargo: string }[] | null)?.[0];
  const proprietaria = cargo?.cargo === "proprietaria";

  let empresa: {
    id: string;
    nome: string;
    logo_url: string | null;
  } | null = null;

  if (proprietaria && cargo) {
    const { data } = await supabase
      .from("empresas")
      .select("id, nome, logo_url")
      .eq("id", cargo.empresa_id)
      .maybeSingle();
    empresa = data;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">
          Seu perfil e preferências da conta
        </p>
      </div>

      <ProfileSection
        initialAvatarUrl={meta.avatar_url ?? null}
        initialName={name}
        email={email}
        initials={initials}
      />

      {empresa && (
        <EmpresaSection
          empresaId={empresa.id}
          empresaNome={empresa.nome}
          initialLogoUrl={empresa.logo_url}
        />
      )}

      {proprietaria && (
        <section className="rounded-xl border border-gray-200 bg-white px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-900">
            Conteúdo das propostas
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Pacotes, textos, fotos e imagens agora ficam no Catálogo, separados
            por tipo de evento.
          </p>
          <Link
            href="/catalogo"
            className="mt-3 inline-block rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Abrir o Catálogo →
          </Link>
        </section>
      )}
    </div>
  );
}
