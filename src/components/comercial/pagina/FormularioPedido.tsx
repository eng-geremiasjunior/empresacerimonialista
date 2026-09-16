"use client";

// O pedido de orçamento, na página pública.
//
// Seis perguntas e uma mensagem. Só nome, WhatsApp e tipo do evento são
// obrigatórios: quem ainda não tem data é justamente quem mais precisa de
// assessoria, e um formulário que exige data manda essa pessoa embora.
//
// O que vai junto, e ninguém vê: a origem da visita (a mesma que o
// contador usou), um campo-isca invisível para pessoas e a hora em que o
// formulário apareceu. Nada de cookie.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { LIMITES_PEDIDO, validarPedido } from "@/lib/comercial/pedidos";
import { textoWhatsappPagina } from "@/lib/comercial/pagina-publica";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { hojeBR } from "@/lib/tempo";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { LinkMedido, chegadaDaAba } from "./MedirPagina";

const campoClass =
  "w-full rounded-xl border border-[color:var(--pg-linha)] bg-[color:var(--pg-papel)] px-4 py-3 text-[15px] text-[color:var(--pg-tinta)] placeholder:text-[color:var(--pg-suave)] focus:border-[color:var(--pg-tinta)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pg-acento-claro)] disabled:opacity-60";
const rotuloClass = "mb-1.5 block text-sm font-medium text-[color:var(--pg-tinta)]";

type Estado =
  | { fase: "preenchendo" }
  | { fase: "enviando" }
  | { fase: "enviado" }
  | { fase: "erro"; texto: string; campo?: string };

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
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<string>(tipos.length === 1 ? tipos[0] : "");
  const [data, setData] = useState("");
  const [semData, setSemData] = useState(false);
  const [cidade, setCidade] = useState("");
  const [convidados, setConvidados] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [site, setSite] = useState(""); // a isca
  const [estado, setEstado] = useState<Estado>({ fase: "preenchendo" });

  // A hora em que o formulário apareceu e o "hoje" do calendário vêm do
  // navegador DEPOIS de montar: lidos no render, divergiriam do servidor
  // e quebrariam a hidratação.
  const abertoEm = useRef<number>(0);
  const [hoje, setHoje] = useState<string | undefined>(undefined);
  useEffect(() => {
    abertoEm.current = Date.now();
    setHoje(hojeBR());
  }, []);

  const wa = linkWhatsapp(whatsappEmpresa, textoWhatsappPagina());
  const erroEm = (campo: string) =>
    estado.fase === "erro" && estado.campo === campo ? estado.texto : null;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (previa || estado.fase === "enviando") return;

    const v = validarPedido(
      {
        nome,
        whatsapp,
        email,
        tipoEvento: tipo,
        dataEvento: semData ? null : data,
        cidade,
        convidados,
        mensagem,
      },
      hojeBR(),
      tipos
    );
    if (!v.ok) {
      setEstado({ fase: "erro", texto: v.erro, campo: v.campo });
      document.getElementById(`pedido-${v.campo}`)?.focus();
      return;
    }

    setEstado({ fase: "enviando" });
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
        setEstado({
          fase: "erro",
          texto: j?.erro ?? "Não foi possível enviar agora. Tente de novo ou fale pelo WhatsApp.",
          campo: j?.campo,
        });
        return;
      }
      setEstado({ fase: "enviado" });
    } catch {
      setEstado({
        fase: "erro",
        texto: "Sem conexão. Tente de novo ou fale pelo WhatsApp.",
      });
    }
  }

  if (estado.fase === "enviado") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-[color:var(--pg-linha)] bg-[color:var(--pg-papel)] p-6 sm:p-8"
      >
        <p className="font-[family-name:var(--font-pagina-titulo)] text-2xl text-[color:var(--pg-tinta)]">
          Pedido enviado.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--pg-suave)]">
          {nomeEmpresa} vai analisar as informações do seu evento e responde pelo
          WhatsApp ou por e-mail.
        </p>
        {wa && (
          <LinkMedido
            href={wa}
            slug={slug}
            tipo="whatsapp_click"
            contar={contar}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--pg-linha)] px-5 py-2.5 text-sm font-medium text-[color:var(--pg-tinta)] transition hover:bg-[color:var(--pg-acento-claro)]"
          >
            <MessageCircle size={16} aria-hidden />
            Adiantar a conversa pelo WhatsApp
          </LinkMedido>
        )}
      </div>
    );
  }

  const enviando = estado.fase === "enviando";

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="space-y-5 rounded-2xl border border-[color:var(--pg-linha)] bg-[color:var(--pg-papel)] p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pedido-nome" className={rotuloClass}>
            Seu nome
          </label>
          <input
            id="pedido-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={LIMITES_PEDIDO.nomeMax}
            autoComplete="name"
            required
            aria-invalid={Boolean(erroEm("nome"))}
            className={campoClass}
          />
        </div>
        <div>
          <label htmlFor="pedido-whatsapp" className={rotuloClass}>
            WhatsApp
          </label>
          <input
            id="pedido-whatsapp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(DDD) número"
            required
            aria-invalid={Boolean(erroEm("whatsapp"))}
            className={campoClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="pedido-email" className={rotuloClass}>
          E-mail <span className="font-normal text-[color:var(--pg-suave)]">(se quiser)</span>
        </label>
        <input
          id="pedido-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={LIMITES_PEDIDO.email}
          autoComplete="email"
          aria-invalid={Boolean(erroEm("email"))}
          className={campoClass}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pedido-tipoEvento" className={rotuloClass}>
            Tipo de evento
          </label>
          <select
            id="pedido-tipoEvento"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            required
            aria-invalid={Boolean(erroEm("tipoEvento"))}
            className={campoClass}
          >
            {tipos.length !== 1 && <option value="">Escolha</option>}
            {tipos.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pedido-dataEvento" className={rotuloClass}>
            Data do evento
          </label>
          <input
            id="pedido-dataEvento"
            type="date"
            value={semData ? "" : data}
            min={hoje}
            onChange={(e) => setData(e.target.value)}
            disabled={semData}
            aria-invalid={Boolean(erroEm("dataEvento"))}
            className={campoClass}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-[color:var(--pg-suave)]">
            <input
              type="checkbox"
              checked={semData}
              onChange={(e) => setSemData(e.target.checked)}
              className="h-4 w-4 rounded border-[color:var(--pg-linha)]"
            />
            Ainda não tenho a data
          </label>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pedido-cidade" className={rotuloClass}>
            Cidade ou local
          </label>
          <input
            id="pedido-cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            maxLength={LIMITES_PEDIDO.cidade}
            autoComplete="address-level2"
            className={campoClass}
          />
        </div>
        <div>
          <label htmlFor="pedido-convidados" className={rotuloClass}>
            Convidados <span className="font-normal text-[color:var(--pg-suave)]">(aproximado)</span>
          </label>
          <input
            id="pedido-convidados"
            value={convidados}
            onChange={(e) => setConvidados(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            aria-invalid={Boolean(erroEm("convidados"))}
            className={campoClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="pedido-mensagem" className={rotuloClass}>
          Conte um pouco do que você imagina{" "}
          <span className="font-normal text-[color:var(--pg-suave)]">(se quiser)</span>
        </label>
        <textarea
          id="pedido-mensagem"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          maxLength={LIMITES_PEDIDO.mensagem}
          rows={4}
          className={campoClass}
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

      {estado.fase === "erro" && (
        <p role="alert" className="text-sm text-[#9B3B2E]">
          {estado.texto}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={enviando || previa}
          className="rounded-full bg-[color:var(--pg-acento)] px-7 py-3 text-[15px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? "Enviando…" : "Pedir orçamento"}
        </button>
        {previa && (
          <p className="text-sm text-[color:var(--pg-suave)]">Na prévia o formulário não envia.</p>
        )}
      </div>

      <p className="text-xs leading-relaxed text-[color:var(--pg-suave)]">
        Seus dados vão só para {nomeEmpresa}, para responder ao seu pedido.{" "}
        <Link href="/privacidade" className="underline hover:text-[color:var(--pg-tinta)]">
          Política de privacidade
        </Link>
      </p>
    </form>
  );
}
