"use client";

// O pedido de orçamento, na vitrine (modelo Clássico).
//
// Seis perguntas e uma mensagem. A lógica (campos, validação, envio) mora
// em usePedidoDaVitrine, a mesma do modelo Capítulos; aqui fica só o
// desenho.
//
// Todos os erros aparecem de uma vez, cada um embaixo do seu campo, e
// somem quando o campo é editado. Nada do que a pessoa digitou é apagado.
//
// O tipo escolhido e o "enviado" moram no estado da vitrine: o primeiro
// muda o depoimento em destaque, o segundo troca o botão da barra fixa.
//
// O formulário promete que os dados vão só para ela. Com o pixel da Meta
// dela ligado, quem garante isso é a trava da configuração automática
// (lib/comercial/pixel-vitrine.ts): sem ela, o script da Meta leria os
// campos a cada clique em botão.

import { ChevronDown } from "lucide-react";
import { LIMITES_PEDIDO, type CampoDoPedido } from "@/lib/comercial/pedidos";
import { exemploDeWhatsapp } from "@/lib/comercial/pagina-publica";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { LinkMedido } from "./MedirPagina";
import { AVISO_PERTO_DO_LIMITE, usePedidoDaVitrine } from "./usePedidoDaVitrine";

export function FormularioPedido({
  slug,
  nomeEmpresa,
  tipos,
  whatsappEmpresa,
  contar,
  previa,
}: {
  slug: string;
  nomeEmpresa: string;
  tipos: EventType[];
  whatsappEmpresa: string | null;
  contar: boolean;
  previa: boolean;
}) {
  const {
    tipo,
    escolherTipo,
    enviado,
    nome,
    setNome,
    whatsapp,
    setWhatsapp,
    email,
    setEmail,
    data,
    setData,
    semData,
    setSemData,
    cidade,
    setCidade,
    convidados,
    setConvidados,
    mensagem,
    setMensagem,
    site,
    setSite,
    erros,
    erroGeral,
    enviando,
    travado,
    hoje,
    wa,
    tituloEnviado,
    linhas,
    editar,
    enviar,
    marcasDeErro,
  } = usePedidoDaVitrine({ slug, tipos, whatsappEmpresa, previa });

  if (enviado) {
    return (
      <div className="vt-enviado" role="status">
        <h2 ref={tituloEnviado} tabIndex={-1} className="vt-h2-enviado">
          Pedido enviado
        </h2>
        <p className="vt-corpo">
          {nomeEmpresa} vai analisar as informações do seu evento e responde pelo WhatsApp ou por
          e-mail.
        </p>
        {wa && (
          <LinkMedido
            href={wa}
            slug={slug}
            tipo="whatsapp_click"
            contar={contar}
            className="vt-botao-adiantar"
          >
            Adiantar a conversa pelo WhatsApp
          </LinkMedido>
        )}
      </div>
    );
  }

  const erroDe = (campo: CampoDoPedido) =>
    erros[campo] ? (
      <p id={`pedido-${campo}-erro`} className="vt-erro">
        {erros[campo]}
      </p>
    ) : null;

  return (
    <>
      <form onSubmit={enviar} noValidate className="vt-formulario">
        <h2 className="vt-h2-formulario">Conte sobre o seu evento</h2>

        <div className="vt-campo">
          <label htmlFor="pedido-nome" className="vt-campo-rotulo">
            Seu nome *
          </label>
          <input
            id="pedido-nome"
            type="text"
            className="vt-entrada"
            placeholder="Nome e sobrenome"
            value={nome}
            onChange={(e) => editar("nome", setNome)(e.target.value)}
            maxLength={LIMITES_PEDIDO.nomeMax}
            autoComplete="name"
            required
            disabled={travado}
            {...marcasDeErro("nome")}
          />
          {erroDe("nome")}
        </div>

        <div className="vt-campo">
          <label htmlFor="pedido-whatsapp" className="vt-campo-rotulo">
            WhatsApp *
          </label>
          <input
            id="pedido-whatsapp"
            type="tel"
            className="vt-entrada"
            placeholder={exemploDeWhatsapp(whatsappEmpresa)}
            value={whatsapp}
            onChange={(e) => editar("whatsapp", setWhatsapp)(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            required
            disabled={travado}
            {...marcasDeErro("whatsapp")}
          />
          {erroDe("whatsapp")}
        </div>

        <div className="vt-campo">
          <label htmlFor="pedido-email" className="vt-campo-rotulo">
            E-mail (opcional)
          </label>
          <input
            id="pedido-email"
            type="email"
            className="vt-entrada"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => editar("email", setEmail)(e.target.value)}
            maxLength={LIMITES_PEDIDO.email}
            autoComplete="email"
            disabled={travado}
            {...marcasDeErro("email")}
          />
          {erroDe("email")}
        </div>

        <div className="vt-campo">
          <label htmlFor="pedido-tipoEvento" className="vt-campo-rotulo">
            Tipo de evento *
          </label>
          <div className="vt-selecao-caixa">
            <select
              id="pedido-tipoEvento"
              className="vt-selecao"
              value={tipo}
              onChange={(e) => editar("tipoEvento", escolherTipo)(e.target.value)}
              required
              disabled={travado}
              {...marcasDeErro("tipoEvento")}
            >
              {tipos.length !== 1 && <option value="">Selecione</option>}
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
            <ChevronDown size={16} strokeWidth={2} aria-hidden className="vt-selecao-seta" />
          </div>
          {erroDe("tipoEvento")}
        </div>

        <div className="vt-campo-data">
          <div
            className="vt-data-recolhe"
            data-recolhida={semData ? "" : undefined}
            aria-hidden={semData ? true : undefined}
          >
            <div className="vt-data-dentro">
              <label htmlFor="pedido-dataEvento" className="vt-campo-rotulo">
                Data do evento
              </label>
              <input
                id="pedido-dataEvento"
                type="date"
                className="vt-entrada-data"
                value={semData ? "" : data}
                min={hoje}
                onChange={(e) => editar("dataEvento", setData)(e.target.value)}
                disabled={travado || semData}
                {...marcasDeErro("dataEvento")}
              />
            </div>
          </div>
          {!semData && erroDe("dataEvento")}
          <label className="vt-sem-data">
            <input
              type="checkbox"
              className="vt-caixa"
              checked={semData}
              onChange={(e) => editar("dataEvento", setSemData)(e.target.checked)}
              disabled={travado}
            />
            Ainda não tenho a data
          </label>
        </div>

        <div className="vt-campo">
          <label htmlFor="pedido-cidade" className="vt-campo-rotulo">
            Cidade ou local (opcional)
          </label>
          <input
            id="pedido-cidade"
            type="text"
            className="vt-entrada"
            placeholder="Onde vai ser"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            maxLength={LIMITES_PEDIDO.cidade}
            autoComplete="address-level2"
            disabled={travado}
          />
        </div>

        <div className="vt-campo">
          <label htmlFor="pedido-convidados" className="vt-campo-rotulo">
            Convidados, aproximado (opcional)
          </label>
          <input
            id="pedido-convidados"
            type="text"
            className="vt-entrada"
            placeholder="120"
            value={convidados}
            onChange={(e) =>
              editar("convidados", setConvidados)(e.target.value.replace(/[^0-9]/g, ""))
            }
            inputMode="numeric"
            disabled={travado}
            {...marcasDeErro("convidados")}
          />
          {erroDe("convidados")}
        </div>

        <div className="vt-campo-largo">
          <div className="vt-campo-cabeca">
            <label htmlFor="pedido-mensagem" className="vt-campo-rotulo-largo">
              Conte um pouco do que você imagina (opcional)
            </label>
            <span
              className="vt-contagem"
              data-visivel={mensagem.length ? "" : undefined}
              data-alta={mensagem.length > AVISO_PERTO_DO_LIMITE ? "" : undefined}
              aria-live="polite"
            >
              {mensagem.length} / {LIMITES_PEDIDO.mensagem}
            </span>
          </div>
          <textarea
            id="pedido-mensagem"
            className="vt-area"
            placeholder="Estilo, horário, o que não pode faltar"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value.slice(0, LIMITES_PEDIDO.mensagem))}
            maxLength={LIMITES_PEDIDO.mensagem}
            rows={linhas}
            disabled={travado}
          />
        </div>

        {/* A isca: invisível e fora da ordem de tabulação. Pessoa não preenche. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="pedido-site">Site</label>
          <input
            id="pedido-site"
            name="site"
            tabIndex={-1}
            autoComplete="off"
            value={site}
            onChange={(e) => setSite(e.target.value)}
          />
        </div>

        <div className="vt-envio">
          <button type="submit" className="vt-botao-enviar" disabled={travado}>
            {enviando && <span className="vt-giro" aria-hidden="true" />}
            <span>{enviando ? "Enviando…" : "Pedir orçamento"}</span>
          </button>
          <p className="vt-aviso-dados">
            Seus dados vão só para {nomeEmpresa}, para responder ao seu pedido.{" "}
            {/* página inteira nova: o pixel desta aba não segue para outras telas */}
            <a href="/privacidade#vitrine">Política de privacidade</a>
          </p>
          {erroGeral && (
            <p role="alert" className="vt-erro vt-erro-geral">
              {erroGeral}
            </p>
          )}
        </div>
      </form>
      {previa && (
        <p className="vt-aviso-previa">
          Desativado na prévia. Publique a vitrine para receber pedidos.
        </p>
      )}
    </>
  );
}
