"use client";

// O pedido de orçamento, na vitrine.
//
// Seis perguntas e uma mensagem. Só nome, WhatsApp e tipo do evento são
// obrigatórios: quem ainda não tem data é justamente quem mais precisa de
// assessoria, e um formulário que exige data manda essa pessoa embora.
//
// Todos os erros aparecem de uma vez, cada um embaixo do seu campo, e
// somem quando o campo é editado. Nada do que a pessoa digitou é apagado.
//
// O que vai junto, e ninguém vê: a origem da visita (a mesma que o
// contador usou), um campo-isca invisível para pessoas e a hora em que o
// formulário apareceu. Nada de cookie.
//
// O tipo escolhido e o "enviado" moram no estado da vitrine: o primeiro
// muda o depoimento em destaque, o segundo troca o botão da barra fixa.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  CAMPOS_DO_PEDIDO,
  LIMITES_PEDIDO,
  errosDoPedido,
  validarPedido,
  type CampoDoPedido,
} from "@/lib/comercial/pedidos";
import { exemploDeWhatsapp, textoWhatsappPagina } from "@/lib/comercial/pagina-publica";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { hojeBR } from "@/lib/tempo";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { LinkMedido, chegadaDaAba } from "./MedirPagina";
import { useVitrine } from "./VitrineViva";

// o texto livre cresce com o que a pessoa escreve (valores do desenho)
const LINHAS_MIN = 3;
const LINHAS_MAX = 8;
const CARACTERES_POR_LINHA = 120;
const AVISO_PERTO_DO_LIMITE = 460;

type Erros = Partial<Record<CampoDoPedido, string>>;

const ehCampo = (c: unknown): c is CampoDoPedido =>
  typeof c === "string" && (CAMPOS_DO_PEDIDO as readonly string[]).includes(c);

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
  const { tipo, escolherTipo, enviado, marcarEnviado } = useVitrine();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState("");
  const [semData, setSemData] = useState(false);
  const [cidade, setCidade] = useState("");
  const [convidados, setConvidados] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [site, setSite] = useState(""); // a isca
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const tituloEnviado = useRef<HTMLHeadingElement>(null);

  // A hora em que o formulário apareceu e o "hoje" do calendário vêm do
  // navegador DEPOIS de montar: lidos no render, divergiriam do servidor
  // e quebrariam a hidratação.
  const abertoEm = useRef<number>(0);
  const [hoje, setHoje] = useState<string | undefined>(undefined);
  useEffect(() => {
    abertoEm.current = Date.now();
    setHoje(hojeBR());
  }, []);

  // enviado: a confirmação entra no lugar do formulário e recebe o foco
  useEffect(() => {
    if (enviado) tituloEnviado.current?.focus();
  }, [enviado]);

  const wa = linkWhatsapp(whatsappEmpresa, textoWhatsappPagina());
  const travado = enviando || previa;

  /** muda o campo e apaga o erro dele */
  const editar =
    <T,>(campo: CampoDoPedido | null, definir: (v: T) => void) =>
    (valor: T) => {
      definir(valor);
      if (campo && erros[campo]) {
        setErros((e) => {
          const resto = { ...e };
          delete resto[campo];
          return resto;
        });
      }
    };

  function focarPrimeiro(e: Erros) {
    const campo = CAMPOS_DO_PEDIDO.find((c) => e[c]);
    const el = campo ? document.getElementById(`pedido-${campo}`) : null;
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.focus({ preventScroll: true });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (travado) return;
    setErroGeral(null);

    const entrada = {
      nome,
      whatsapp,
      email,
      tipoEvento: tipo,
      dataEvento: semData ? null : data,
      cidade,
      convidados,
      mensagem,
    };
    const achados = errosDoPedido(entrada, hojeBR(), tipos);
    const v = validarPedido(entrada, hojeBR(), tipos);
    if (!v.ok) {
      setErros(achados);
      focarPrimeiro(achados);
      return;
    }

    setErros({});
    setEnviando(true);
    const chegada = chegadaDaAba(slug);
    try {
      const r = await fetch(`/api/pagina/${encodeURIComponent(slug)}/pedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: v.dados.nome,
          whatsapp: v.dados.whatsapp,
          email: v.dados.email,
          tipoEvento: v.dados.tipoEvento,
          dataEvento: v.dados.dataEvento,
          cidade: v.dados.cidade,
          convidados: v.dados.convidados,
          mensagem: v.dados.mensagem,
          site,
          abertoEm: abertoEm.current,
          origem: chegada.origem,
          utmSource: chegada.utmSource,
          utmMedium: chegada.utmMedium,
          utmCampaign: chegada.utmCampaign,
        }),
      });
      const j = (await r.json().catch(() => null)) as
        | { ok?: boolean; erro?: string; campo?: string }
        | null;
      if (!r.ok || !j?.ok) {
        const texto = j?.erro ?? "Não foi possível enviar agora. Tente de novo ou fale pelo WhatsApp.";
        const campo = j?.campo;
        if (ehCampo(campo)) {
          const doServidor: Erros = { [campo]: texto };
          setErros(doServidor);
          focarPrimeiro(doServidor);
        } else {
          setErroGeral(texto);
        }
        return;
      }
      marcarEnviado();
    } catch {
      setErroGeral("Sem conexão. Tente de novo ou fale pelo WhatsApp.");
    } finally {
      setEnviando(false);
    }
  }

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

  const linhas = Math.min(
    LINHAS_MAX,
    LINHAS_MIN + Math.floor(mensagem.length / CARACTERES_POR_LINHA)
  );
  const erroDe = (campo: CampoDoPedido) =>
    erros[campo] ? (
      <p id={`pedido-${campo}-erro`} className="vt-erro">
        {erros[campo]}
      </p>
    ) : null;
  const marcasDeErro = (campo: CampoDoPedido) =>
    erros[campo]
      ? {
          "data-erro": "",
          "aria-invalid": true as const,
          "aria-describedby": `pedido-${campo}-erro`,
        }
      : {};

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
            <Link href="/privacidade">Política de privacidade</Link>
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
