import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SobreNosForm } from "@/components/configuracoes/SobreNosForm";
import { ProcessoEtapasForm } from "@/components/configuracoes/ProcessoEtapasForm";
import { FaqForm } from "@/components/configuracoes/FaqForm";
import {
  BlocosPropostaForm,
  CitacaoHeroForm,
} from "@/components/configuracoes/BlocosPropostaForm";
import {
  BLOCOS_INCLUSO_CLASSICO,
  BLOCOS_NO_DIA_CLASSICO,
  BLOCOS_PROXIMOS_CLASSICO,
  CITACAO_CLASSICO,
} from "@/lib/proposta-classico-conteudo";
import { DepoimentosForm } from "@/components/configuracoes/DepoimentosForm";
import { CondicoesPagamentoForm } from "@/components/configuracoes/CondicoesPagamentoForm";
import { PortfolioGaleria } from "@/components/configuracoes/PortfolioGaleria";
import { LandingImagemForm } from "@/components/configuracoes/LandingImagemForm";
import { VideoTeaserForm } from "@/components/configuracoes/VideoTeaserForm";
import { PacotesForm } from "@/components/configuracoes/PacotesForm";
import { ExtrasForm } from "@/components/configuracoes/ExtrasForm";
import { RegraConvidadosForm } from "@/components/configuracoes/RegraConvidadosForm";
import {
  tipoValido,
  rotuloTipo,
  TIPO_EMOJI,
  CONTEUDO_PADRAO,
} from "@/lib/catalogo";
import type { PortfolioFoto } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

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

// Conteúdo da proposta de UM tipo de evento. Tudo o que esta tela grava
// leva o tipo junto: mexer aqui não toca na proposta dos outros tipos.
export default async function CatalogoTipoPage({
  params,
}: {
  params: { tipo: string };
}) {
  const tipo = tipoValido(params.tipo);
  if (!tipo) notFound();

  const supabase = createClient();
  const { data: cargoData } = await supabase.rpc("meu_cargo");
  const cargo = (cargoData as { empresa_id: string; cargo: string }[] | null)?.[0];

  if (cargo?.cargo !== "proprietaria") {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold text-gray-900">
          {rotuloTipo(tipo)}
        </h1>
        <p className="mt-4 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Só a proprietária edita o conteúdo das propostas.
        </p>
      </div>
    );
  }

  const [
    empresaRes,
    conteudoRes,
    etapasRes,
    faqRes,
    depoimentosRes,
    pacotesRes,
    extrasRes,
    fotosRes,
    blocosRes,
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, nome")
      .eq("id", cargo.empresa_id)
      .maybeSingle(),
    supabase
      .from("empresa_conteudo_institucional")
      .select("*")
      .eq("empresa_id", cargo.empresa_id)
      .eq("tipo_evento", tipo)
      .maybeSingle(),
    supabase
      .from("empresa_processo_etapas")
      .select("titulo, descricao")
      .eq("empresa_id", cargo.empresa_id)
      .eq("tipo_evento", tipo)
      .order("ordem"),
    supabase
      .from("empresa_faq")
      .select("pergunta, resposta, ativo")
      .eq("empresa_id", cargo.empresa_id)
      .eq("tipo_evento", tipo)
      .order("ordem"),
    supabase
      .from("empresa_depoimentos")
      .select("texto, autor, contexto, ativo")
      .eq("empresa_id", cargo.empresa_id)
      .eq("tipo_evento", tipo)
      .order("ordem"),
    supabase
      .from("empresa_pacotes")
      .select("nome, subtitulo, preco, inclui, nao_inclui, recomendado, ativo")
      .eq("empresa_id", cargo.empresa_id)
      .eq("tipo_evento", tipo)
      .order("ordem"),
    supabase
      .from("empresa_extras")
      .select("nome, descricao, preco, ativo")
      .eq("empresa_id", cargo.empresa_id)
      .eq("tipo_evento", tipo)
      .order("ordem"),
    supabase
      .from("portfolio_fotos")
      .select("id, url, storage_path, legenda, ordem, ativo")
      .eq("empresa_id", cargo.empresa_id)
      .eq("tipo_evento", tipo)
      .order("ordem")
      .order("created_at"),
    supabase
      .from("empresa_proposta_blocos")
      .select("secao, icone, titulo, texto_curto, texto_longo")
      .eq("empresa_id", cargo.empresa_id)
      .eq("tipo_evento", tipo)
      .order("secao")
      .order("ordem"),
  ]);

  // A coluna tipo_evento só existe depois da 057: sem ela toda consulta
  // acima falha, e orientar é melhor que mostrar tela vazia.
  const faltaMigracao = Boolean(pacotesRes.error || conteudoRes.error);

  const empresa = empresaRes.data;
  // Tipo ainda não configurado não tem linha: os formulários abrem nos
  // mesmos defaults que o banco usaria, e o primeiro salvar faz o insert.
  const conteudo = {
    ...CONTEUDO_PADRAO,
    ...(conteudoRes.data ?? {}),
  } as typeof CONTEUDO_PADRAO;
  const etapas = (etapasRes.data ?? []) as {
    titulo: string;
    descricao: string | null;
  }[];
  // 101 — pode vir erro se a migração ainda não rodou; degrada para vazio
  const blocos = (blocosRes.data ?? []) as {
    secao: "incluso" | "no_dia" | "proximos_passos";
    icone: string | null;
    titulo: string;
    texto_curto: string | null;
    texto_longo: string | null;
  }[];
  const blocosDe = (s: "incluso" | "no_dia" | "proximos_passos") =>
    blocos.filter((b) => b.secao === s);

  const faq = (faqRes.data ?? []) as {
    pergunta: string;
    resposta: string;
    ativo: boolean;
  }[];
  const depoimentos = (depoimentosRes.data ?? []) as {
    texto: string;
    autor: string;
    contexto: string | null;
    ativo: boolean;
  }[];
  const pacotes = (pacotesRes.data ?? []) as {
    nome: string;
    subtitulo: string | null;
    preco: number;
    inclui: string[];
    nao_inclui: string[];
    recomendado: boolean;
    ativo: boolean;
  }[];
  const extras = (extrasRes.data ?? []) as {
    nome: string;
    descricao: string | null;
    preco: number;
    ativo: boolean;
  }[];
  const fotos = (fotosRes.data ?? []) as PortfolioFoto[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/catalogo"
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          ← Catálogo
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-gray-900">
          <span aria-hidden>{TIPO_EMOJI[tipo]}</span>
          {rotuloTipo(tipo)}
        </h1>
        <p className="text-sm text-gray-500">
          Este conteúdo aparece só nas propostas de {rotuloTipo(tipo).toLowerCase()}.
        </p>
      </div>

      {faltaMigracao ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Catálogo por tipo de evento ainda não disponível. Execute{" "}
          <code>supabase/migrations/057_catalogo_por_tipo_evento.sql</code> no
          SQL Editor do Supabase.
        </p>
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="text-sm font-semibold text-gray-900">
                Conteúdo da Proposta
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Textos, pacotes e imagens das propostas de{" "}
                {rotuloTipo(tipo).toLowerCase()} enviadas aos seus clientes.
              </p>
            </div>

            <SubSecao
              titulo="Pacotes"
              descricao="As opções que o cliente escolhe na proposta. O destacado aparece com o selo de mais escolhido."
            >
              <PacotesForm tipoEvento={tipo} inicial={pacotes} />
            </SubSecao>

            <SubSecao
              titulo="Extras opcionais"
              descricao="Itens que o cliente pode somar ao pacote."
            >
              <ExtrasForm tipoEvento={tipo} inicial={extras} />
            </SubSecao>

            <SubSecao
              titulo="Convidados"
              descricao="Faixa do seletor e cobrança por convidado acima do incluso."
            >
              <RegraConvidadosForm tipoEvento={tipo} inicial={conteudo} />
            </SubSecao>

            <SubSecao
              titulo="Sobre nós"
              descricao="Apresentação da empresa e números que passam confiança."
            >
              <SobreNosForm tipoEvento={tipo} inicial={conteudo} />
            </SubSecao>

            <SubSecao
              titulo="Citação de abertura"
              descricao="A frase em itálico no topo da proposta."
            >
              <CitacaoHeroForm
                tipoEvento={tipo}
                inicial={conteudo.citacao_hero ?? null}
                padrao={CITACAO_CLASSICO}
              />
            </SubSecao>

            <SubSecao
              titulo="O que está incluso"
              descricao="Os cartões de serviço da proposta. Texto curto no cartão; o longo abre no ver detalhes."
            >
              <BlocosPropostaForm
                tipoEvento={tipo}
                secao="incluso"
                inicial={blocosDe("incluso")}
                padrao={BLOCOS_INCLUSO_CLASSICO}
              />
            </SubSecao>

            <SubSecao
              titulo="No dia do evento"
              descricao="Os cartões do que a sua equipe garante no dia."
            >
              <BlocosPropostaForm
                tipoEvento={tipo}
                secao="no_dia"
                inicial={blocosDe("no_dia")}
                padrao={BLOCOS_NO_DIA_CLASSICO}
              />
            </SubSecao>

            <SubSecao
              titulo="Próximos passos"
              descricao="Os passos do fechamento, na ordem em que o casal lê."
            >
              <BlocosPropostaForm
                tipoEvento={tipo}
                secao="proximos_passos"
                inicial={blocosDe("proximos_passos")}
                padrao={BLOCOS_PROXIMOS_CLASSICO}
              />
            </SubSecao>

            <SubSecao
              titulo="Como funciona"
              descricao="As etapas do seu processo, na ordem em que o cliente vai ler."
            >
              <ProcessoEtapasForm tipoEvento={tipo} inicial={etapas} />
            </SubSecao>

            <SubSecao
              titulo="Perguntas frequentes"
              descricao="Responda de antemão as dúvidas mais comuns."
            >
              <FaqForm tipoEvento={tipo} inicial={faq} />
            </SubSecao>

            <SubSecao
              titulo="Depoimentos"
              descricao="Falas de clientes reais. A seção só aparece na proposta quando houver ao menos um ativo."
            >
              <DepoimentosForm tipoEvento={tipo} inicial={depoimentos} />
            </SubSecao>

            {empresa && (
              <>
                <SubSecao
                  titulo="Imagem de capa (Apresentação)"
                  descricao="Aparece ao lado do título, no topo da proposta. Fotos horizontais funcionam melhor — o nome do cliente entra sobre a parte de baixo."
                >
                  <LandingImagemForm
                    empresaId={empresa.id}
                    tipoEvento={tipo}
                    slot="hero"
                    urlInicial={conteudo.hero_imagem_url}
                    dica="JPG ou PNG · máx. 20 MB (comprimimos antes de enviar)"
                  />
                </SubSecao>

                <SubSecao
                  titulo="Vídeo teaser (opcional)"
                  descricao="Se preenchido, a capa ganha um botão de play que abre o vídeo."
                >
                  <VideoTeaserForm
                    tipoEvento={tipo}
                    urlInicial={conteudo.video_url}
                  />
                </SubSecao>

                <SubSecao
                  titulo="Imagem — No dia do evento"
                  descricao="Aparece ao lado da lista de responsabilidades do dia."
                >
                  <LandingImagemForm
                    empresaId={empresa.id}
                    tipoEvento={tipo}
                    slot="no_dia_evento"
                    urlInicial={conteudo.no_dia_evento_imagem_url}
                    dica="Formato retrato ou quadrado se encaixa melhor aqui"
                  />
                </SubSecao>
              </>
            )}

            <SubSecao
              titulo="Condições de pagamento e contato"
              descricao="Valores padrão da proposta e o WhatsApp para o cliente falar com você."
            >
              <CondicoesPagamentoForm tipoEvento={tipo} inicial={conteudo} />
            </SubSecao>
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="text-sm font-semibold text-gray-900">Portfólio</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Fotos de {rotuloTipo(tipo).toLowerCase()} que aparecem nestas
                propostas.
              </p>
            </div>
            <div className="px-6 py-5">
              <PortfolioGaleria
                empresaId={cargo.empresa_id}
                tipoEvento={tipo}
                inicial={fotos}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
