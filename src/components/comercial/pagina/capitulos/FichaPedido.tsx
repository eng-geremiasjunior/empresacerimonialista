"use client";

// 05 — a ficha: o pedido de orçamento do modelo Capítulos.
//
// Sem cartão e sem caixa: cada campo é uma linha de pauta numerada de 01
// a 08, o rótulo em caixa alta sobre a pauta e o valor escrito sobre o
// fio. A numeração é enfeite (aria-hidden): o nome do campo continua
// sendo o <label>.
//
// A lógica é a mesma do modelo Clássico (usePedidoDaVitrine); aqui fica
// só o desenho e a ordem do desenho (o tipo vem logo depois do WhatsApp).

import { LIMITES_PEDIDO, type CampoDoPedido } from "@/lib/comercial/pedidos";
import { exemploDeWhatsapp } from "@/lib/comercial/pagina-publica";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { LinkMedido } from "../MedirPagina";
import { AVISO_PERTO_DO_LIMITE, usePedidoDaVitrine } from "../usePedidoDaVitrine";

const ORDEM: readonly CampoDoPedido[] = ["nome", "whatsapp", "tipoEvento", "email", "dataEvento", "convidados"];

/** "01 · SEU NOME *": o número é enfeite, o rótulo é o nome do campo. */
function Cabeca({
  n,
  para,
  children,
  depois,
}: {
  n: string;
  para?: string;
  children: React.ReactNode;
  depois?: React.ReactNode;
}) {
  return (
    <div className="cp-campo-cabeca">
      <span className="cp-campo-n" aria-hidden="true">
        {n}
      </span>
      {para ? (
        <label htmlFor={para} className="cp-campo-rotulo">
          {children}
        </label>
      ) : (
        <span className="cp-campo-rotulo">{children}</span>
      )}
      {depois}
    </div>
  );
}

export function FichaPedido({
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
  const f = usePedidoDaVitrine({ slug, tipos, whatsappEmpresa, previa, ordemDosCampos: ORDEM });

  if (f.enviado) {
    return (
      <div className="cp-enviado" role="status">
        <h2 ref={f.tituloEnviado} tabIndex={-1} className="cp-h2-ficha">
          Pedido enviado
        </h2>
        <span className="cp-enviado-fio" aria-hidden="true" />
        <p className="cp-enviado-texto">
          {nomeEmpresa} vai analisar as informações do seu evento e responde pelo WhatsApp ou por
          e-mail.
        </p>
        {f.wa && (
          <LinkMedido
            href={f.wa}
            slug={slug}
            tipo="whatsapp_click"
            contar={contar}
            className="cp-botao-contorno cp-enviado-botao"
          >
            Adiantar a conversa pelo WhatsApp
          </LinkMedido>
        )}
      </div>
    );
  }

  const erroDe = (campo: CampoDoPedido) =>
    f.erros[campo] ? (
      <p id={`pedido-${campo}-erro`} className="cp-erro">
        {f.erros[campo]}
      </p>
    ) : null;

  return (
    <>
      <h2 className="cp-h2-ficha">Conte sobre o seu evento</h2>
      <p className="cp-intro cp-intro-ficha">
        Oito linhas. As três primeiras bastam para {nomeEmpresa} responder.
      </p>

      <form onSubmit={f.enviar} noValidate>
        <div className="cp-ficha" data-travada={f.travado ? "" : undefined}>
          <div className="cp-campo">
            <Cabeca n="01" para="pedido-nome">
              Seu nome *
            </Cabeca>
            <input
              id="pedido-nome"
              type="text"
              className="cp-entrada"
              placeholder="Nome e sobrenome"
              value={f.nome}
              onChange={(e) => f.editar("nome", f.setNome)(e.target.value)}
              maxLength={LIMITES_PEDIDO.nomeMax}
              autoComplete="name"
              required
              disabled={f.travado}
              {...f.marcasDeErro("nome")}
            />
            {erroDe("nome")}
          </div>

          <div className="cp-campo">
            <Cabeca n="02" para="pedido-whatsapp">
              WhatsApp *
            </Cabeca>
            <input
              id="pedido-whatsapp"
              type="tel"
              className="cp-entrada"
              placeholder={exemploDeWhatsapp(whatsappEmpresa)}
              value={f.whatsapp}
              onChange={(e) => f.editar("whatsapp", f.setWhatsapp)(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              required
              disabled={f.travado}
              {...f.marcasDeErro("whatsapp")}
            />
            {erroDe("whatsapp")}
          </div>

          <div className="cp-campo">
            <Cabeca n="03" para="pedido-tipoEvento">
              Tipo de evento *
            </Cabeca>
            <select
              id="pedido-tipoEvento"
              className="cp-entrada cp-selecao"
              value={f.tipo}
              onChange={(e) => f.editar("tipoEvento", f.escolherTipo)(e.target.value)}
              required
              disabled={f.travado}
              {...f.marcasDeErro("tipoEvento")}
            >
              {tipos.length !== 1 && <option value="">Selecione</option>}
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
            {erroDe("tipoEvento")}
          </div>

          <div className="cp-campo">
            <Cabeca n="04" para="pedido-email">
              E-mail (opcional)
            </Cabeca>
            <input
              id="pedido-email"
              type="email"
              className="cp-entrada"
              placeholder="voce@email.com"
              value={f.email}
              onChange={(e) => f.editar("email", f.setEmail)(e.target.value)}
              maxLength={LIMITES_PEDIDO.email}
              autoComplete="email"
              disabled={f.travado}
              {...f.marcasDeErro("email")}
            />
            {erroDe("email")}
          </div>

          <div className="cp-campo">
            <Cabeca n="05" para={f.semData ? undefined : "pedido-dataEvento"}>
              Data do evento
            </Cabeca>
            <div
              className="cp-data-recolhe"
              data-recolhida={f.semData ? "" : undefined}
              aria-hidden={f.semData ? true : undefined}
            >
              <input
                id="pedido-dataEvento"
                type="date"
                className="cp-entrada"
                value={f.semData ? "" : f.data}
                min={f.hoje}
                onChange={(e) => f.editar("dataEvento", f.setData)(e.target.value)}
                disabled={f.travado || f.semData}
                {...f.marcasDeErro("dataEvento")}
              />
            </div>
            {!f.semData && erroDe("dataEvento")}
            <label className="cp-sem-data">
              <input
                type="checkbox"
                className="cp-caixa"
                checked={f.semData}
                onChange={(e) => f.editar("dataEvento", f.setSemData)(e.target.checked)}
                disabled={f.travado}
              />
              Ainda não tenho a data
            </label>
          </div>

          <div className="cp-campo">
            <Cabeca n="06" para="pedido-cidade">
              Cidade ou local (opcional)
            </Cabeca>
            <input
              id="pedido-cidade"
              type="text"
              className="cp-entrada"
              placeholder="Onde vai ser"
              value={f.cidade}
              onChange={(e) => f.setCidade(e.target.value)}
              maxLength={LIMITES_PEDIDO.cidade}
              autoComplete="address-level2"
              disabled={f.travado}
            />
          </div>

          <div className="cp-campo">
            <Cabeca n="07" para="pedido-convidados">
              Convidados, aproximado (opcional)
            </Cabeca>
            <input
              id="pedido-convidados"
              type="text"
              className="cp-entrada"
              placeholder="120"
              value={f.convidados}
              onChange={(e) =>
                f.editar("convidados", f.setConvidados)(e.target.value.replace(/[^0-9]/g, ""))
              }
              inputMode="numeric"
              disabled={f.travado}
              {...f.marcasDeErro("convidados")}
            />
            {erroDe("convidados")}
          </div>

          <div className="cp-campo cp-campo-largo">
            <Cabeca
              n="08"
              para="pedido-mensagem"
              depois={
                <span
                  className="cp-contagem"
                  data-visivel={f.mensagem.length ? "" : undefined}
                  data-alta={f.mensagem.length > AVISO_PERTO_DO_LIMITE ? "" : undefined}
                  aria-live="polite"
                >
                  {f.mensagem.length} / {LIMITES_PEDIDO.mensagem}
                </span>
              }
            >
              Conte um pouco do que você imagina (opcional)
            </Cabeca>
            <textarea
              id="pedido-mensagem"
              className="cp-area"
              placeholder="Estilo, horário, o que não pode faltar"
              value={f.mensagem}
              onChange={(e) => f.setMensagem(e.target.value.slice(0, LIMITES_PEDIDO.mensagem))}
              maxLength={LIMITES_PEDIDO.mensagem}
              rows={f.linhas}
              disabled={f.travado}
            />
          </div>
        </div>

        {/* A isca: invisível e fora da ordem de tabulação. Pessoa não preenche. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="pedido-site">Site</label>
          <input
            id="pedido-site"
            name="site"
            tabIndex={-1}
            autoComplete="off"
            value={f.site}
            onChange={(e) => f.setSite(e.target.value)}
          />
        </div>

        <span className="cp-ficha-fio" aria-hidden="true" />

        <div className="cp-ficha-botoes">
          <button type="submit" className="cp-botao-enviar" disabled={f.travado}>
            {f.enviando && <span className="cp-giro" aria-hidden="true" />}
            <span>{f.enviando ? "Enviando…" : "Pedir orçamento"}</span>
          </button>
          {f.wa && (
            <LinkMedido
              href={f.wa}
              slug={slug}
              tipo="whatsapp_click"
              contar={contar}
              className="cp-botao-contorno cp-ficha-whatsapp"
            >
              Conversar no WhatsApp
            </LinkMedido>
          )}
        </div>
        <p className="cp-aviso-dados">
          Seus dados vão só para {nomeEmpresa}, para responder ao seu pedido.{" "}
          {/* página inteira nova: o pixel desta aba não segue para outras telas */}
          <a href="/privacidade#vitrine">Política de privacidade</a>
        </p>
        {f.erroGeral && (
          <p role="alert" className="cp-erro">
            {f.erroGeral}
          </p>
        )}
      </form>
      {previa && (
        <p className="cp-aviso-previa">Desativado na prévia. Publique a vitrine para receber pedidos.</p>
      )}
    </>
  );
}
