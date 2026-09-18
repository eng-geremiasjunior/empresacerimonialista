"use client";

// O pedido de orçamento do modelo Curadoria: campos num cartão claro, grade
// de uma coluna no celular e duas no computador, sem ponto de quebra. O
// rótulo fica sempre acima do campo, nunca só como exemplo dentro dele.
//
// A lógica é a mesma dos outros modelos (usePedidoDaVitrine); aqui ficam o
// desenho e a ordem do desenho: nome, WhatsApp, e-mail, tipo, data, cidade,
// convidados e o texto livre.

import { LIMITES_PEDIDO, type CampoDoPedido } from "@/lib/comercial/pedidos";
import { exemploDeWhatsapp } from "@/lib/comercial/pagina-publica";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { LinkMedido } from "../MedirPagina";
import { AVISO_PERTO_DO_LIMITE, usePedidoDaVitrine } from "../usePedidoDaVitrine";

const ORDEM: readonly CampoDoPedido[] = ["nome", "whatsapp", "email", "tipoEvento", "dataEvento", "convidados"];

export function FichaCuradoria({
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
      <div className="cu-enviado" role="status">
        <p className="cu-rotulo">Recebido</p>
        <h2 ref={f.tituloEnviado} tabIndex={-1} className="cu-h2-ficha">
          Pedido enviado
        </h2>
        <p className="cu-enviado-texto">
          {nomeEmpresa} vai analisar as informações do seu evento e responde pelo WhatsApp ou por
          e-mail.
        </p>
        {f.wa && (
          <LinkMedido
            href={f.wa}
            slug={slug}
            tipo="whatsapp_click"
            contar={contar}
            className="cu-botao-contorno cu-enviado-botao"
          >
            Adiantar a conversa pelo WhatsApp
          </LinkMedido>
        )}
      </div>
    );
  }

  const erroDe = (campo: CampoDoPedido) =>
    f.erros[campo] ? (
      <p id={`pedido-${campo}-erro`} className="cu-erro">
        {f.erros[campo]}
      </p>
    ) : null;

  return (
    <>
      <p className="cu-rotulo">Orçamento</p>
      <h2 className="cu-h2-ficha">Conte sobre o seu evento</h2>
      <p className="cu-intro-ficha">
        Escreva do jeito que preferir. Quanto mais você contar, mais a proposta chega perto do que
        você imagina.
      </p>

      <form onSubmit={f.enviar} noValidate>
        <div className="cu-campos">
          <div className="cu-campo">
            <label htmlFor="pedido-nome" className="cu-campo-rotulo">
              Seu nome *
            </label>
            <input
              id="pedido-nome"
              type="text"
              className="cu-entrada"
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

          <div className="cu-campo">
            <label htmlFor="pedido-whatsapp" className="cu-campo-rotulo">
              WhatsApp *
            </label>
            <input
              id="pedido-whatsapp"
              type="tel"
              className="cu-entrada"
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

          <div className="cu-campo">
            <label htmlFor="pedido-email" className="cu-campo-rotulo">
              E-mail (opcional)
            </label>
            <input
              id="pedido-email"
              type="email"
              className="cu-entrada"
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

          <div className="cu-campo">
            <label htmlFor="pedido-tipoEvento" className="cu-campo-rotulo">
              Tipo de evento *
            </label>
            <select
              id="pedido-tipoEvento"
              className="cu-entrada cu-selecao"
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

          <div className="cu-campo">
            <div
              className="cu-data-recolhe"
              data-recolhida={f.semData ? "" : undefined}
              aria-hidden={f.semData ? true : undefined}
            >
              <div className="cu-data-dentro">
                <label htmlFor="pedido-dataEvento" className="cu-campo-rotulo">
                  Data do evento
                </label>
                <input
                  id="pedido-dataEvento"
                  type="date"
                  className="cu-entrada"
                  value={f.semData ? "" : f.data}
                  min={f.hoje}
                  onChange={(e) => f.editar("dataEvento", f.setData)(e.target.value)}
                  disabled={f.travado || f.semData}
                  {...f.marcasDeErro("dataEvento")}
                />
              </div>
            </div>
            {!f.semData && erroDe("dataEvento")}
            <label className="cu-sem-data">
              <input
                type="checkbox"
                className="cu-caixa"
                checked={f.semData}
                onChange={(e) => f.editar("dataEvento", f.setSemData)(e.target.checked)}
                disabled={f.travado}
              />
              Ainda não tenho a data
            </label>
          </div>

          <div className="cu-campo">
            <label htmlFor="pedido-cidade" className="cu-campo-rotulo">
              Cidade ou local (opcional)
            </label>
            <input
              id="pedido-cidade"
              type="text"
              className="cu-entrada"
              placeholder="Onde vai ser"
              value={f.cidade}
              onChange={(e) => f.setCidade(e.target.value)}
              maxLength={LIMITES_PEDIDO.cidade}
              autoComplete="address-level2"
              disabled={f.travado}
            />
          </div>

          <div className="cu-campo">
            <label htmlFor="pedido-convidados" className="cu-campo-rotulo">
              Convidados, aproximado (opcional)
            </label>
            <input
              id="pedido-convidados"
              type="text"
              className="cu-entrada"
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

          <div className="cu-campo cu-campo-largo">
            <div className="cu-campo-cabeca">
              <label htmlFor="pedido-mensagem" className="cu-campo-rotulo">
                Conte um pouco do que você imagina (opcional)
              </label>
              <span
                className="cu-contagem"
                data-visivel={f.mensagem.length ? "" : undefined}
                data-alta={f.mensagem.length > AVISO_PERTO_DO_LIMITE ? "" : undefined}
                aria-live="polite"
              >
                {f.mensagem.length} / {LIMITES_PEDIDO.mensagem}
              </span>
            </div>
            <textarea
              id="pedido-mensagem"
              className="cu-area"
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

        <div className="cu-ficha-botoes">
          <button type="submit" className="cu-botao-enviar" disabled={f.travado}>
            {f.enviando && <span className="cu-giro" aria-hidden="true" />}
            <span>{f.enviando ? "Enviando…" : "Pedir orçamento"}</span>
          </button>
          {f.wa && (
            <LinkMedido
              href={f.wa}
              slug={slug}
              tipo="whatsapp_click"
              contar={contar}
              className="cu-botao-contorno cu-ficha-whatsapp"
            >
              Conversar no WhatsApp
            </LinkMedido>
          )}
        </div>
        <p className="cu-aviso-dados">
          Seus dados vão só para {nomeEmpresa}, para responder ao seu pedido.{" "}
          {/* página inteira nova: o pixel desta aba não segue para outras telas */}
          <a href="/privacidade#vitrine">Política de privacidade</a>
        </p>
        {f.erroGeral && (
          <p role="alert" className="cu-erro">
            {f.erroGeral}
          </p>
        )}
      </form>
      {previa && (
        <p className="cu-aviso-previa">Desativado na prévia. Publique a vitrine para receber pedidos.</p>
      )}
    </>
  );
}
