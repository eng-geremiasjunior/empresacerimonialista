"use client";

// Landing page pública da proposta (Etapa 9). Substitui o cartão simples da
// Etapa 5 por uma peça de conversão com identidade visual própria — é o que
// o cliente final vê, não o painel administrativo.
//
// O fluxo de aprovação das Etapas 5/6 continua inteiro por baixo:
// responder_orcamento -> ficha de cadastro -> criação do evento.

import { useState } from "react";
import { FileDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { criarEventoAPartirDoOrcamento } from "@/lib/orcamento-para-evento";
import { FichaCadastroAprovacao } from "@/components/orcamento-publico/FichaCadastroAprovacao";
import { SidebarAncoras } from "@/components/orcamento-publico/SidebarAncoras";
import { HeroApresentacao } from "@/components/orcamento-publico/HeroApresentacao";
import { SobreNos } from "@/components/orcamento-publico/SobreNos";
import { OQueEstaIncluso } from "@/components/orcamento-publico/OQueEstaIncluso";
import { ComoFunciona } from "@/components/orcamento-publico/ComoFunciona";
import { NoDiaDoEvento } from "@/components/orcamento-publico/NoDiaDoEvento";
import { PosEvento } from "@/components/orcamento-publico/PosEvento";
import { Investimento } from "@/components/orcamento-publico/Investimento";
import { FaqAccordion } from "@/components/orcamento-publico/FaqAccordion";
import { EventosRealizados } from "@/components/orcamento-publico/EventosRealizados";
import { CtaFinal } from "@/components/orcamento-publico/CtaFinal";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { formatDateBR } from "@/lib/orcamentos";
import {
  dataResposta,
  expirado,
  type InstitucionalPublico,
  type OrcamentoPublicoData,
} from "@/lib/orcamento-publico";

// Usado quando a empresa ainda não tem conteúdo institucional (migração 045
// não rodada): a proposta continua legível, só sem as seções de marca.
const CONDICOES_PADRAO: InstitucionalPublico = {
  sobre_nos_texto: null,
  stat_anos_experiencia: null,
  stat_eventos_realizados: null,
  stat_dedicacao_percentual: 100,
  stat_equipe_texto: "Equipe Especializada",
  condicao_entrada_percentual: 30,
  condicao_parcelas_maximo: 7,
  condicao_desconto_a_vista_percentual: 5,
  condicao_prazo_parcelas_texto: "até 5 dias antes do evento",
  whatsapp_contato: null,
  email_contato: null,
  responsabilidades_dia_evento: [],
  pos_evento_cards: [],
};

export function OrcamentoPublico({
  hash,
  inicial,
}: {
  hash: string;
  inicial: OrcamentoPublicoData;
}) {
  const [dados, setDados] = useState(inicial);
  const [fichaEnviada, setFichaEnviada] = useState(inicial.ficha_preenchida);
  const [eventoCriado, setEventoCriado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const venceu = expirado(dados);
  const podeResponder = dados.status === "enviado" && !venceu;

  const inst = dados.institucional ?? CONDICOES_PADRAO;
  const etapas = dados.etapas ?? [];
  const faq = dados.faq ?? [];
  const fotos = dados.fotos ?? [];
  const itens = dados.itens ?? [];

  const tipo =
    EVENT_TYPE_LABELS[dados.tipo_evento as EventType] ?? dados.tipo_evento;
  const tituloDia =
    dados.tipo_evento === "casamento"
      ? "No dia do casamento"
      : "No dia do evento";

  // Se a RPC ainda for a versão da 043, dias_restantes não vem — calcula.
  const diasRestantes =
    dados.dias_restantes ??
    Math.max(
      0,
      Math.ceil(
        (new Date(dados.data_validade).getTime() - Date.now()) / 86_400_000
      )
    );

  const whatsapp = inst.whatsapp_contato?.replace(/\D/g, "") || null;
  // TODO (Etapa 10): modal de texto livre + registro da solicitação.
  // Até lá o botão leva ao WhatsApp em vez de não fazer nada.
  const linkAlteracoes = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `Olá! Sou ${dados.nome_contato} e gostaria de solicitar alterações na proposta.`
      )}`
    : null;

  const secoesVisiveis = [
    "apresentacao",
    dados.institucional ? "sobre-nos" : null,
    itens.length > 0 ? "incluso" : null,
    etapas.length > 0 ? "como-funciona" : null,
    inst.responsabilidades_dia_evento.length > 0 ? "dia-evento" : null,
    inst.pos_evento_cards.length > 0 ? "pos-evento" : null,
    "investimento",
    faq.length > 0 ? "faq" : null,
    fotos.length > 0 ? "eventos" : null,
  ].filter(Boolean) as string[];

  async function aceitar() {
    setErro(null);
    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("responder_orcamento", {
      p_hash: hash,
      p_status: "aprovado",
    });
    setEnviando(false);

    const falha = error?.message ?? (data as { error?: string })?.error;
    if (falha) {
      setErro(
        typeof falha === "string" && falha.includes("expirou")
          ? "Esta proposta expirou."
          : "Não foi possível registrar sua resposta. Atualize a página e tente novamente."
      );
      return;
    }

    setDados((d) => ({
      ...d,
      status: "aprovado",
      respondido_em: new Date().toISOString(),
    }));
    document
      .getElementById("resposta")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const botaoHero = podeResponder ? (
    <button
      onClick={aceitar}
      disabled={enviando}
      className="whitespace-nowrap rounded-[10px] px-6 py-3 text-[13.5px] font-semibold text-white disabled:opacity-60"
      style={{ background: "#A85950" }}
    >
      {enviando ? "Enviando…" : "Aceitar proposta →"}
    </button>
  ) : null;

  return (
    <div style={{ background: "#FAF6F2", color: "#2E2621" }}>
      <SidebarAncoras
        nomeEmpresa={dados.nome_empresa}
        logoUrl={dados.logo_url}
        whatsapp={inst.whatsapp_contato}
        secoesVisiveis={secoesVisiveis}
      />

      <main className="mx-auto max-w-[1000px] px-5 pb-12 pt-6 sm:px-10 lg:ml-[250px] lg:mr-0">
        <HeroApresentacao
          nome={dados.nome_contato}
          tipoEvento={dados.tipo_evento}
          tipoLabel={tipo}
          dataEvento={dados.data_evento}
          convidados={dados.numero_convidados}
          local={dados.local_evento}
          cidade={dados.cidade_evento}
          diasRestantes={diasRestantes}
          cta={botaoHero}
        />

        {dados.institucional && <SobreNos dados={inst} />}
        <OQueEstaIncluso itens={itens} />
        <ComoFunciona etapas={etapas} />
        <NoDiaDoEvento
          titulo={tituloDia}
          itens={inst.responsabilidades_dia_evento}
          foto={fotos[0] ?? null}
        />
        <PosEvento cards={inst.pos_evento_cards} />
        <Investimento
          valorTotal={Number(dados.valor_total)}
          convidados={dados.numero_convidados}
          itens={itens}
          condicoes={inst}
        />
        <FaqAccordion itens={faq} />
        <EventosRealizados fotos={fotos} />

        <CtaFinal
          podeResponder={podeResponder}
          enviando={enviando}
          onAceitar={aceitar}
          linkAlteracoes={linkAlteracoes}
          mensagem={
            venceu
              ? `Esta proposta expirou em ${formatDateBR(dados.data_validade)}. Fale com a gente para uma nova.`
              : undefined
          }
        />

        {/* Estado da resposta + ficha de cadastro (Etapas 5 e 6) */}
        <div id="resposta" className="scroll-mt-6">
          {erro && (
            <p className="mt-5 text-sm font-medium text-red-700">{erro}</p>
          )}

          {dados.status === "aprovado" && (
            <div
              className="mt-6 rounded-2xl px-6 py-5"
              style={{ background: "#F6E9E6" }}
            >
              <p
                className="text-[17px] font-medium [font-family:var(--font-playfair)]"
                style={{ color: "#A85950" }}
              >
                Proposta aceita!
              </p>
              <p className="mt-1 text-sm" style={{ color: "#5B4A43" }}>
                {dados.respondido_em
                  ? `Confirmado em ${dataResposta(dados.respondido_em)}. `
                  : ""}
                {fichaEnviada
                  ? gerando
                    ? "Registrando seu evento…"
                    : eventoCriado
                      ? "Seu evento foi registrado — em breve entraremos em contato."
                      : "Recebemos seus dados — em breve entraremos em contato."
                  : "Complete seus dados abaixo para seguirmos."}
              </p>
            </div>
          )}

          {dados.status === "recusado" && (
            <div
              className="mt-6 rounded-2xl px-6 py-5"
              style={{ background: "#F1EDE9" }}
            >
              <p className="font-semibold" style={{ color: "#5B4A43" }}>
                Esta proposta foi recusada
                {dados.respondido_em
                  ? ` em ${dataResposta(dados.respondido_em)}`
                  : ""}
                .
              </p>
              <p className="mt-1 text-sm" style={{ color: "#8A7B73" }}>
                Se mudar de ideia, fale com {dados.nome_empresa}.
              </p>
            </div>
          )}

          {dados.status === "rascunho" && (
            <p className="mt-6 text-sm" style={{ color: "#8A7B73" }}>
              Esta proposta ainda está sendo preparada.
            </p>
          )}

          {dados.status === "aprovado" && !fichaEnviada && (
            <div className="mt-4">
              <FichaCadastroAprovacao
                hash={hash}
                nomeInicial={dados.nome_contato}
                onConcluido={async () => {
                  setFichaEnviada(true);
                  setGerando(true);
                  const res = await criarEventoAPartirDoOrcamento(
                    hash,
                    dados.tipo_evento,
                    dados.data_evento
                  );
                  setGerando(false);
                  if ("success" in res) setEventoCriado(true);
                  // semData/erro: a cerimonialista é notificada e finaliza
                  // pelo painel. Os dados do cliente já estão salvos.
                }}
              />
            </div>
          )}
        </div>

        <footer
          className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-8"
          style={{ borderColor: "#ECE0DA" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-sm [font-family:var(--font-playfair)]"
              style={{ color: "#A6824F" }}
            >
              {dados.nome_empresa.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-xs" style={{ color: "#8A7B73" }}>
              {dados.nome_empresa}
            </span>
          </div>
          <div className="text-xs" style={{ color: "#8A7B73" }}>
            {[inst.whatsapp_contato, inst.email_contato]
              .filter(Boolean)
              .join(" · ")}
          </div>
          <a
            href={`/orcamento/${hash}/pdf`}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold"
            style={{ borderColor: "#ECE0DA", color: "#5B4A43" }}
          >
            <FileDown size={14} /> Baixar PDF
          </a>
        </footer>
      </main>
    </div>
  );
}
