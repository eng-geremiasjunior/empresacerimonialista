"use client";

// O pedido de orçamento da vitrine, sem o desenho: o estado dos campos, a
// validação, o envio e o que volta dele. Os dois modelos da vitrine
// (FormularioPedido no Clássico, FichaPedido no Capítulos) desenham os
// campos cada um do seu jeito e usam esta mesma lógica — um conserto aqui
// vale para os dois.
//
// Só nome, WhatsApp e tipo do evento são obrigatórios: quem ainda não tem
// data é justamente quem mais precisa de assessoria.
//
// O que vai junto, e ninguém vê: a origem da visita (a mesma que o
// contador usou), um campo-isca invisível para pessoas e a hora em que o
// formulário apareceu. Nada de cookie.

import { useEffect, useRef, useState } from "react";
import {
  CAMPOS_DO_PEDIDO,
  errosDoPedido,
  validarPedido,
  type CampoDoPedido,
} from "@/lib/comercial/pedidos";
import { textoWhatsappPagina } from "@/lib/comercial/pagina-publica";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { hojeBR } from "@/lib/tempo";
import { eventoDoPixel } from "@/lib/comercial/pixel-vitrine";
import type { EventType } from "@/lib/types";
import { chegadaDaAba } from "./MedirPagina";
import { useVitrine } from "./VitrineViva";

// o texto livre cresce com o que a pessoa escreve (valores do desenho)
const LINHAS_MIN = 3;
const LINHAS_MAX = 8;
const CARACTERES_POR_LINHA = 120;
export const AVISO_PERTO_DO_LIMITE = 460;

export type ErrosDoPedido = Partial<Record<CampoDoPedido, string>>;

const ehCampo = (c: unknown): c is CampoDoPedido =>
  typeof c === "string" && (CAMPOS_DO_PEDIDO as readonly string[]).includes(c);

export function usePedidoDaVitrine({
  slug,
  tipos,
  whatsappEmpresa,
  previa,
  ordemDosCampos = CAMPOS_DO_PEDIDO,
}: {
  slug: string;
  tipos: EventType[];
  whatsappEmpresa: string | null;
  previa: boolean;
  /** a ordem em que os campos aparecem: o primeiro com erro recebe o foco */
  ordemDosCampos?: readonly CampoDoPedido[];
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
  const [erros, setErros] = useState<ErrosDoPedido>({});
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

  function focarPrimeiro(e: ErrosDoPedido) {
    const campo = ordemDosCampos.find((c) => e[c]);
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
          const doServidor: ErrosDoPedido = { [campo]: texto };
          setErros(doServidor);
          focarPrimeiro(doServidor);
        } else {
          setErroGeral(texto);
        }
        return;
      }
      marcarEnviado();
      // o pixel dela, se a pessoa permitiu: só o fato, sem dado nenhum
      eventoDoPixel("Lead");
    } catch {
      setErroGeral("Sem conexão. Tente de novo ou fale pelo WhatsApp.");
    } finally {
      setEnviando(false);
    }
  }

  const linhas = Math.min(LINHAS_MAX, LINHAS_MIN + Math.floor(mensagem.length / CARACTERES_POR_LINHA));

  /** as marcas de acessibilidade de um campo com erro */
  const marcasDeErro = (campo: CampoDoPedido) =>
    erros[campo]
      ? {
          "data-erro": "",
          "aria-invalid": true as const,
          "aria-describedby": `pedido-${campo}-erro`,
        }
      : {};

  return {
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
  };
}
