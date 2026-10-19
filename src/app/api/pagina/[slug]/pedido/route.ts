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
import { lerFormulario, validarRespostas } from "@/lib/comercial/formulario";
import type { PaginaPublica } from "@/lib/comercial/pagina-publica";
import { emailDoAvisoDePedido } from "@/lib/comercial/email-do-aviso";
import {
  enviarEmailConfirmacaoPedido,
  enviarEmailPedidoParaCerimonialista,
} from "@/lib/email-pedido";
import { hojeBR } from "@/lib/tempo";
import { registrarErroDoServidor } from "@/lib/registro-do-sistema";

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
// cabe a base, a mensagem e as 10 perguntas dela (214) com folga
const TETO_CORPO = 24_000;

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
  /** quanto tempo o formulário ficou aberto, medido no aparelho (ms) */
  tempoAbertoMs?: unknown;
  origem?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  /** "que tipo de serviço procura" (214) */
  servico?: unknown;
  /** as respostas às perguntas dela: { [id]: texto | lista } (214) */
  respostas?: unknown;
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
  //
  // O tempo aberto vem MEDIDO NO APARELHO de quem pede (19/10/2026): antes
  // a rota subtraía a hora do aparelho da hora do servidor, e um relógio
  // adiantado (o do dono estava 3min41s à frente) fazia todo pedido parecer
  // "rápido demais" e sumir calado, com "Pedido enviado" na tela. A conta
  // antiga só vale para quem ainda tem a página velha aberta.
  const tempoAberto =
    typeof corpo.tempoAbertoMs === "number" && Number.isFinite(corpo.tempoAbertoMs)
      ? corpo.tempoAbertoMs
      : Date.now() - Number(corpo.abertoEm);
  const isca = (texto(corpo.site) ?? "").trim() !== "";
  if (isca || !Number.isFinite(tempoAberto) || tempoAberto < TEMPO_MINIMO_MS) {
    // nunca calado de novo: o descarte fica no log (sem nada do que foi digitado)
    console.warn("[eorg:pedido] descartado:", isca ? "isca" : `tempo ${Math.round(tempoAberto)}ms`);
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

  // O formulário DELA (214): o serviço e as perguntas conferidos contra o
  // que a página mostra — id desconhecido some, opção fora da lista é 400.
  // Campo opcional que ela desligou não é gravado, mesmo se vier.
  const formulario = lerFormulario(pagina.formulario);
  const extras = validarRespostas(formulario, corpo.servico, corpo.respostas);
  if (!extras.ok) {
    return NextResponse.json({ ok: false, erro: extras.erro, campo: extras.campo }, { status: 400 });
  }
  const dados = {
    ...v.dados,
    email: formulario.mostrar.email ? v.dados.email : null,
    convidados: formulario.mostrar.convidados ? v.dados.convidados : null,
    mensagem: formulario.mostrar.mensagem ? v.dados.mensagem : null,
  };

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
    p_nome: dados.nome,
    p_whatsapp: dados.whatsapp,
    p_email: dados.email,
    p_tipo: dados.tipoEvento,
    p_data: dados.dataEvento,
    p_cidade: dados.cidade,
    p_convidados: dados.convidados,
    p_mensagem: dados.mensagem,
    p_origem: texto(corpo.origem) ?? "direto",
    p_utm_source: texto(corpo.utmSource),
    p_utm_medium: texto(corpo.utmMedium),
    p_utm_campaign: texto(corpo.utmCampaign),
  });

  if (error) {
    // só o código e a mensagem do banco: nada do que a pessoa digitou
    console.error("[eorg:pedido] rpc:", error.code, (error.message ?? "").slice(0, 120));
    await registrarErroDoServidor({ area: "Pedido de orçamento", codigo: error.code ?? "rpc" });
    return NextResponse.json(
      { ok: false, erro: "Não foi possível enviar agora. Fale pelo WhatsApp." },
      { status: 500 }
    );
  }

  const r = data as {
    ok?: boolean;
    error?: string;
    anexado?: boolean;
    pedido_id?: string;
    nome_empresa?: string;
  } | null;
  if (!r?.ok) {
    const frase = (r?.error ?? "não foi possível enviar agora").trim();
    return NextResponse.json(
      { ok: false, erro: frase.charAt(0).toUpperCase() + frase.slice(1) + "." },
      { status: 400 }
    );
  }

  // O serviço e as respostas (214), já conferidos acima. Vão por um
  // segundo passo, pela chave de serviço e pelo id que a função devolveu:
  // a função pública do pedido não muda. Só preenche o que está VAZIO —
  // a mesma régua da 165 para o reenvio: quem sabe o telefone de alguém
  // anexa ao pedido dela, mas não apaga o que ela respondeu. Falhar aqui
  // não desfaz o pedido.
  if (r.pedido_id) {
    const preencher = async (coluna: "servico_desejado" | "respostas", valor: unknown) => {
      const { error: erroExtras } = await admin
        .from("pedido_orcamento")
        .update({ [coluna]: valor })
        .eq("id", r.pedido_id as string)
        .is(coluna, null);
      if (erroExtras) {
        console.error("[eorg:pedido] respostas:", erroExtras.code, (erroExtras.message ?? "").slice(0, 120));
      }
    };
    if (extras.servico) await preencher("servico_desejado", extras.servico);
    if (extras.respostas.length > 0) await preencher("respostas", extras.respostas);
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
      ? await emailDoAvisoDePedido(admin, empresaId, dados.tipoEvento, {
          usarLoginDaDona: true,
        })
      : null;

    const envios: Promise<unknown>[] = [];
    if (avisoPara) {
      envios.push(
        enviarEmailPedidoParaCerimonialista({
          to: avisoPara,
          nomeEmpresa,
          pedido: { ...dados, repetido: Boolean(r.anexado) },
        })
      );
    }
    // A confirmação sai só no PRIMEIRO envio: o destino é digitado por
    // quem preenche, e reenvios repetidos virariam um jeito de fazer o
    // nosso domínio mandar vários e-mails para um terceiro.
    if (dados.email && !r.anexado) {
      envios.push(
        enviarEmailConfirmacaoPedido({
          to: dados.email,
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
