// O formulário da página pública chega AQUI, no servidor.
//
// A função que grava o pedido (registrar_pedido_publico, 165) só aceita a
// chave de serviço: quem grava dado pessoal de terceiro é o servidor,
// depois dos freios desta rota. O navegador nunca a alcança.
//
// Ordem, e o que cada passo recusa:
//   1. teto por endereço de rede         (429 — freio de rajada, memória do processo)
//   2. corpo, isca e tempo mínimo         (200 calado — robô não aprende o que o pegou;
//                                          antes de qualquer consulta ao banco)
//   3. a página existe e está publicada   (404)
//   4. validação dos campos               (400 com a frase e o campo)
//   5. a função do banco                  (teto diário, deduplicação, sino)
//   6. os dois e-mails                    (melhor esforço: falhar aqui não
//                                          desfaz o pedido, que já está gravado)
//
// A resposta NUNCA diz se o pedido foi anexado a outro ou criado agora, e
// nunca devolve o que a pessoa digitou: quem envia vê sempre a mesma
// confirmação. Dizer "já havia um pedido seu" seria contar a um estranho
// que aquele telefone está negociando com esta cerimonialista.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clienteAnonimoPublico } from "@/lib/supabase/anon-publico";
import { validarPedido } from "@/lib/comercial/pedidos";
import type { PaginaPublica } from "@/lib/comercial/pagina-publica";
import { emailDoAvisoDePedido } from "@/lib/comercial/email-do-aviso";
import {
  enviarEmailConfirmacaoPedido,
  enviarEmailPedidoParaCerimonialista,
} from "@/lib/email-pedido";
import { hojeBR } from "@/lib/tempo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

// Memória do processo: some no deploy e não é compartilhada entre
// instâncias. É amortecedor de rajada, não contador; o teto que vale de
// verdade é o diário, dentro do banco.
const JANELA_MS = 10 * 60_000;
const MAX_POR_JANELA = 3;
const ultimos = new Map<string, number[]>();

function demaisEnvios(chave: string): boolean {
  const agora = Date.now();
  const anteriores = (ultimos.get(chave) ?? []).filter((t) => agora - t < JANELA_MS);
  anteriores.push(agora);
  ultimos.set(chave, anteriores);
  if (ultimos.size > 5000) ultimos.clear();
  return anteriores.length > MAX_POR_JANELA;
}

/** Abaixo disto, quem preencheu o formulário não foi uma pessoa. */
const TEMPO_MINIMO_MS = 3000;
const TETO_CORPO = 16_000;

type Corpo = {
  nome?: unknown;
  whatsapp?: unknown;
  email?: unknown;
  tipoEvento?: unknown;
  dataEvento?: unknown;
  cidade?: unknown;
  convidados?: unknown;
  mensagem?: unknown;
  /** a isca: campo invisível para pessoas */
  site?: unknown;
  /** quando o formulário foi aberto (ms), para o tempo mínimo */
  abertoEm?: unknown;
  origem?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
};

const texto = (v: unknown): string | null => (typeof v === "string" ? v : null);

function servico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) },
  });
}

const recebido = () =>
  NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "desconhecido";

  if (demaisEnvios(ip)) {
    return NextResponse.json(
      { ok: false, erro: "Muitos envios seguidos. Aguarde alguns minutos ou fale pelo WhatsApp." },
      { status: 429 }
    );
  }

  const bruto = await request.text();
  if (bruto.length > TETO_CORPO) {
    return NextResponse.json({ ok: false, erro: "Mensagem longa demais." }, { status: 413 });
  }
  let corpo: Corpo;
  try {
    corpo = JSON.parse(bruto) as Corpo;
  } catch {
    return NextResponse.json({ ok: false, erro: "Envio inválido." }, { status: 400 });
  }

  // Isca preenchida ou envio rápido demais: responde como se tivesse dado
  // certo e não grava nada. Robô que recebe erro aprende a desviar.
  const abertoEm = Number(corpo.abertoEm);
  if (
    (texto(corpo.site) ?? "").trim() !== "" ||
    !Number.isFinite(abertoEm) ||
    Date.now() - abertoEm < TEMPO_MINIMO_MS
  ) {
    return recebido();
  }

  const slug = String(params.slug ?? "").trim().toLowerCase();

  // A página, pela mesma leitura pública que a tela usa: se não está
  // publicada, não há para quem entregar.
  const { data: paginaCrua } = await clienteAnonimoPublico().rpc("pagina_publica", {
    p_ref: slug,
  });
  const pagina = paginaCrua as PaginaPublica | null;
  if (!pagina) {
    return NextResponse.json({ ok: false, erro: "Página não encontrada." }, { status: 404 });
  }

  const v = validarPedido(
    {
      nome: texto(corpo.nome),
      whatsapp: texto(corpo.whatsapp),
      email: texto(corpo.email),
      tipoEvento: texto(corpo.tipoEvento),
      dataEvento: texto(corpo.dataEvento),
      cidade: texto(corpo.cidade),
      convidados:
        typeof corpo.convidados === "number" || typeof corpo.convidados === "string"
          ? corpo.convidados
          : null,
      mensagem: texto(corpo.mensagem),
    },
    hojeBR(),
    pagina.tipos_atendidos
  );
  if (!v.ok) {
    return NextResponse.json({ ok: false, erro: v.erro, campo: v.campo }, { status: 400 });
  }

  const admin = servico();
  if (!admin) {
    console.error("[eorg:pedido] chave de serviço ausente");
    return NextResponse.json(
      { ok: false, erro: "Não foi possível enviar agora. Fale pelo WhatsApp." },
      { status: 503 }
    );
  }

  const { data, error } = await admin.rpc("registrar_pedido_publico", {
    p_ref: slug,
    p_nome: v.dados.nome,
    p_whatsapp: v.dados.whatsapp,
    p_email: v.dados.email,
    p_tipo: v.dados.tipoEvento,
    p_data: v.dados.dataEvento,
    p_cidade: v.dados.cidade,
    p_convidados: v.dados.convidados,
    p_mensagem: v.dados.mensagem,
    p_origem: texto(corpo.origem) ?? "direto",
    p_utm_source: texto(corpo.utmSource),
    p_utm_medium: texto(corpo.utmMedium),
    p_utm_campaign: texto(corpo.utmCampaign),
  });

  if (error) {
    // só o código e a mensagem do banco: nada do que a pessoa digitou
    console.error("[eorg:pedido] rpc:", error.code, (error.message ?? "").slice(0, 120));
    return NextResponse.json(
      { ok: false, erro: "Não foi possível enviar agora. Fale pelo WhatsApp." },
      { status: 500 }
    );
  }

  const r = data as {
    ok?: boolean;
    error?: string;
    anexado?: boolean;
    nome_empresa?: string;
  } | null;
  if (!r?.ok) {
    const frase = (r?.error ?? "não foi possível enviar agora").trim();
    return NextResponse.json(
      { ok: false, erro: frase.charAt(0).toUpperCase() + frase.slice(1) + "." },
      { status: 400 }
    );
  }

  // Os e-mails. Melhor esforço: o pedido já está gravado e já tocou o sino.
  try {
    const { data: endereco } = await admin
      .from("empresa_pagina_slug")
      .select("empresa_id")
      .eq("slug", slug)
      .maybeSingle();
    const empresaId = (endereco as { empresa_id?: string } | null)?.empresa_id;
    const nomeEmpresa = r.nome_empresa ?? pagina.nome_empresa ?? "";
    const avisoPara = empresaId
      ? await emailDoAvisoDePedido(admin, empresaId, v.dados.tipoEvento, {
          usarLoginDaDona: true,
        })
      : null;

    const envios: Promise<unknown>[] = [];
    if (avisoPara) {
      envios.push(
        enviarEmailPedidoParaCerimonialista({
          to: avisoPara,
          nomeEmpresa,
          pedido: { ...v.dados, repetido: Boolean(r.anexado) },
        })
      );
    }
    // A confirmação sai só no PRIMEIRO envio: o destino é digitado por
    // quem preenche, e reenvios repetidos virariam um jeito de fazer o
    // nosso domínio mandar vários e-mails para um terceiro.
    if (v.dados.email && !r.anexado) {
      envios.push(
        enviarEmailConfirmacaoPedido({
          to: v.dados.email,
          nomeEmpresa,
          replyTo: avisoPara,
        })
      );
    }
    const resultados = await Promise.allSettled(envios);
    for (const res of resultados) {
      if (res.status === "rejected") {
        console.error("[eorg:pedido] e-mail:", String(res.reason).slice(0, 120));
      } else {
        const valor = res.value as { ok?: boolean; error?: string } | undefined;
        if (valor && valor.ok === false) {
          console.error("[eorg:pedido] e-mail recusado:", (valor.error ?? "").slice(0, 120));
        }
      }
    }
  } catch (e) {
    console.error("[eorg:pedido] e-mails:", String(e).slice(0, 120));
  }

  return recebido();
}
