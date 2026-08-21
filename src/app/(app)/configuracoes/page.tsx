import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileSection } from "@/components/configuracoes/ProfileSection";
import { EmpresaSection } from "@/components/configuracoes/EmpresaSection";
import {
  RoteiroPadraoSection,
  type ItemRoteiroPadrao,
} from "@/components/configuracoes/RoteiroPadraoSection";
import { whatsappConfigurado } from "@/lib/whatsapp";
import { CalendarClock } from "lucide-react";

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
  };

  // Nome e WhatsApp vêm de membros_equipe — fonte única, e a mesma que o
  // portal da cliente lê. O auth guarda só a foto.
  const { data: membro } = await supabase
    .from("membros_equipe")
    .select("nome, whatsapp, avisar_whatsapp")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const name = membro?.nome ?? "";
  const whatsapp = membro?.whatsapp ?? "";
  const avisarWhatsapp = membro?.avisar_whatsapp === true;
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

  // Os deslocamentos do roteiro (112). RLS: todos leem, só a
  // proprietária escreve — a seção só aparece para quem pode mexer.
  let roteiroPadrao: ItemRoteiroPadrao[] = [];
  if (proprietaria) {
    const { data } = await supabase
      .from("metodo_roteiro_item")
      .select("id, tipo_evento, titulo, offset_min, duracao_min, ordem")
      .order("ordem");
    roteiroPadrao = (
      (data ?? []) as {
        id: string;
        tipo_evento: string;
        titulo: string;
        offset_min: number;
        duracao_min: number | null;
        ordem: number;
      }[]
    ).map((i) => ({
      id: i.id,
      tipoEvento: i.tipo_evento,
      titulo: i.titulo,
      offsetMin: i.offset_min,
      duracaoMin: i.duracao_min,
      ordem: i.ordem,
    }));
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
        initialWhatsapp={whatsapp}
        initialAvisarWhatsapp={avisarWhatsapp}
        transporteWhatsappAtivo={whatsappConfigurado()}
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

      {proprietaria && <RoteiroPadraoSection itens={roteiroPadrao} />}

      {/* A grade completa (dias, slots, buffer, exceções) foi promovida
          para a Agenda de Fornecedores; aqui fica só o atalho. */}
      <section className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <CalendarClock size={15} className="text-gray-500" />
          Grade de horários
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Seus dias de atendimento a fornecedores, duração das reuniões e
          exceções agora vivem na Agenda de Fornecedores.
        </p>
        <Link
          href="/agenda?tab=grade"
          className="mt-3 inline-block rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Abrir minha grade →
        </Link>
      </section>

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
