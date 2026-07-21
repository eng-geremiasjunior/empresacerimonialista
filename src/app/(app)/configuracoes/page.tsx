import { createClient } from "@/lib/supabase/server";
import { ProfileSection } from "@/components/configuracoes/ProfileSection";
import { EmpresaSection } from "@/components/configuracoes/EmpresaSection";

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

  // Minha Empresa: seção exclusiva da proprietária (padrão de permissões).
  const { data: cargoData } = await supabase.rpc("meu_cargo");
  const cargo = (cargoData as { empresa_id: string; cargo: string }[] | null)?.[0];
  let empresa: { id: string; nome: string; logo_url: string | null } | null =
    null;
  if (cargo?.cargo === "proprietaria") {
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
    </div>
  );
}
