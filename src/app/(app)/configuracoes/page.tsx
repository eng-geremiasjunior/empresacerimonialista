import { createClient } from "@/lib/supabase/server";
import { ProfileSection } from "@/components/configuracoes/ProfileSection";
import { EmpresaSection } from "@/components/configuracoes/EmpresaSection";
import { SobreNosForm } from "@/components/configuracoes/SobreNosForm";
import { ProcessoEtapasForm } from "@/components/configuracoes/ProcessoEtapasForm";
import { FaqForm } from "@/components/configuracoes/FaqForm";
import { DepoimentosForm } from "@/components/configuracoes/DepoimentosForm";
import { CondicoesPagamentoForm } from "@/components/configuracoes/CondicoesPagamentoForm";
import { PortfolioGaleria } from "@/components/configuracoes/PortfolioGaleria";
import { LandingImagemForm } from "@/components/configuracoes/LandingImagemForm";
import { TemplateVisualForm } from "@/components/configuracoes/TemplateVisualForm";
import { resolverTema } from "@/lib/orcamento-temas";
import type { PortfolioFoto } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

// Bloco de sub-seção do "Conteúdo da Proposta".
function SubSecao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-gray-100 px-6 py-5 first:border-t-0">
      <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
      <p className="mb-4 mt-0.5 text-xs text-gray-500">{descricao}</p>
      {children}
    </div>
  );
}

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

  // Seções da empresa: exclusivas da proprietária (padrão de permissões).
  const { data: cargoData } = await supabase.rpc("meu_cargo");
  const cargo = (cargoData as { empresa_id: string; cargo: string }[] | null)?.[0];
  const proprietaria = cargo?.cargo === "proprietaria";
  // Portfólio é vitrine, não dado sensível: a coordenadora também gerencia.
  const podePortfolio =
    cargo?.cargo === "proprietaria" || cargo?.cargo === "coordenadora";

  let empresa: {
    id: string;
    nome: string;
    logo_url: string | null;
    hero_imagem_url: string | null;
    no_dia_evento_imagem_url: string | null;
    template_orcamento: string | null;
  } | null = null;
  let conteudo: {
    sobre_nos_texto: string | null;
    stat_anos_experiencia: number | null;
    stat_eventos_realizados: number | null;
    stat_dedicacao_percentual: number;
    stat_equipe_texto: string;
    condicao_entrada_percentual: number;
    condicao_parcelas_maximo: number;
    condicao_desconto_a_vista_percentual: number;
    condicao_prazo_parcelas_texto: string;
    whatsapp_contato: string | null;
    email_contato: string | null;
  } | null = null;
  let etapas: { titulo: string; descricao: string | null }[] = [];
  let faq: { pergunta: string; resposta: string; ativo: boolean }[] = [];
  let depoimentos: {
    texto: string;
    autor: string;
    contexto: string | null;
    ativo: boolean;
  }[] = [];
  let faltaMigracao = false;

  if (proprietaria && cargo) {
    const [empresaRes, conteudoRes, etapasRes, faqRes, depoimentosRes] =
      await Promise.all([
      supabase
        .from("empresas")
        .select(
          "id, nome, logo_url, hero_imagem_url, no_dia_evento_imagem_url, template_orcamento"
        )
        .eq("id", cargo.empresa_id)
        .maybeSingle(),
      supabase
        .from("empresa_conteudo_institucional")
        .select("*")
        .eq("empresa_id", cargo.empresa_id)
        .maybeSingle(),
      supabase
        .from("empresa_processo_etapas")
        .select("titulo, descricao")
        .eq("empresa_id", cargo.empresa_id)
        .order("ordem"),
      supabase
        .from("empresa_faq")
        .select("pergunta, resposta, ativo")
        .eq("empresa_id", cargo.empresa_id)
        .order("ordem"),
      supabase
        .from("empresa_depoimentos")
        .select("texto, autor, contexto, ativo")
        .eq("empresa_id", cargo.empresa_id)
        .order("ordem"),
    ]);

    empresa = empresaRes.data;
    conteudo = conteudoRes.data as typeof conteudo;
    etapas = (etapasRes.data ?? []) as typeof etapas;
    faq = (faqRes.data ?? []) as typeof faq;
    depoimentos = (depoimentosRes.data ?? []) as typeof depoimentos;
    // Tabelas ainda não criadas → orienta em vez de quebrar.
    faltaMigracao = Boolean(conteudoRes.error);
  }

  // Busca separada: a coordenadora vê o portfólio sem ver o resto.
  let fotos: PortfolioFoto[] = [];
  let faltaPortfolio = false;
  if (podePortfolio && cargo) {
    const fotosRes = await supabase
      .from("portfolio_fotos")
      .select("id, url, storage_path, legenda, ordem, ativo")
      .eq("empresa_id", cargo.empresa_id)
      .order("ordem")
      .order("created_at");
    fotos = (fotosRes.data ?? []) as PortfolioFoto[];
    faltaPortfolio = Boolean(fotosRes.error);
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

      {podePortfolio && cargo && (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-900">Portfólio</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Fotos que aparecem nas propostas de orçamento para seus clientes.
            </p>
          </div>
          <div className="px-6 py-5">
            {faltaPortfolio ? (
              <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                Galeria ainda não disponível. Execute{" "}
                <code>supabase/migrations/046_portfolio_fotos.sql</code> no SQL
                Editor do Supabase.
              </p>
            ) : (
              <PortfolioGaleria empresaId={cargo.empresa_id} inicial={fotos} />
            )}
          </div>
        </section>
      )}

      {proprietaria && (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-900">
              Conteúdo da Proposta
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Estes textos aparecem em todas as propostas de orçamento
              enviadas aos seus clientes.
            </p>
          </div>

          {faltaMigracao || !conteudo ? (
            <div className="px-6 py-5">
              <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                Conteúdo institucional ainda não disponível. Execute{" "}
                <code>
                  supabase/migrations/045_conteudo_institucional_proposta.sql
                </code>{" "}
                no SQL Editor do Supabase.
              </p>
            </div>
          ) : (
            <>
              <SubSecao
                titulo="Sobre nós"
                descricao="Apresentação da empresa e números que passam confiança."
              >
                <SobreNosForm inicial={conteudo} />
              </SubSecao>

              <SubSecao
                titulo="Como funciona"
                descricao="As etapas do seu processo, na ordem em que o cliente vai ler."
              >
                <ProcessoEtapasForm inicial={etapas} />
              </SubSecao>

              <SubSecao
                titulo="Perguntas frequentes"
                descricao="Responda de antemão as dúvidas mais comuns."
              >
                <FaqForm inicial={faq} />
              </SubSecao>

              <SubSecao
                titulo="Depoimentos"
                descricao="Falas de clientes reais. A seção só aparece na proposta quando houver ao menos um ativo."
              >
                <DepoimentosForm inicial={depoimentos} />
              </SubSecao>

              {empresa && (
                <>
                  <SubSecao
                    titulo="Template Visual"
                    descricao="Paleta de cores da proposta. Vale para todas, inclusive as já enviadas."
                  >
                    <TemplateVisualForm
                      inicial={resolverTema(empresa.template_orcamento)}
                    />
                  </SubSecao>

                  <SubSecao
                    titulo="Imagem de capa (Apresentação)"
                    descricao="Fundo do topo da proposta. Fotos horizontais e claras funcionam melhor."
                  >
                    <LandingImagemForm
                      empresaId={empresa.id}
                      slot="hero"
                      urlInicial={empresa.hero_imagem_url}
                      dica="JPG ou PNG · máx. 20 MB (comprimimos antes de enviar)"
                    />
                  </SubSecao>

                  <SubSecao
                    titulo="Imagem — No dia do evento"
                    descricao="Aparece ao lado da lista de responsabilidades do dia."
                  >
                    <LandingImagemForm
                      empresaId={empresa.id}
                      slot="no_dia_evento"
                      urlInicial={empresa.no_dia_evento_imagem_url}
                      dica="Formato retrato ou quadrado se encaixa melhor aqui"
                    />
                  </SubSecao>
                </>
              )}

              <SubSecao
                titulo="Condições de pagamento e contato"
                descricao="Valores padrão da proposta e o WhatsApp para o cliente falar com você."
              >
                <CondicoesPagamentoForm inicial={conteudo} />
              </SubSecao>
            </>
          )}
        </section>
      )}
    </div>
  );
}
