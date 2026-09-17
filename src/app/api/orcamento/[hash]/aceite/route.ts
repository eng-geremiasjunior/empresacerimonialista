// O aceite da proposta acontece AQUI, no servidor.
//
// Antes o navegador chamava registrar_aceite_proposta direto, e por isso
// o aceite era um clique sem documento: IP e navegador não chegavam ao
// banco, nenhum PDF nascia, nenhum e-mail saía. Tudo isso só existe no
// servidor — então a tela manda o que a cliente preencheu para cá, e esta
// rota orquestra.
//
// O hash da URL é a credencial (mesmo molde de /api/rsvp/[hash]): quem
// tem o link aceita, e a RPC devolve só o que é daquela proposta.
//
// Ordem, e o que é obrigatório:
//   1. limite por origem, corpo e validação    (recusa aqui)
//   1b. o contrato que a cliente leu ainda é   (409: recarregar e ler de novo)
//       o modelo vigente
//   2. registrar_aceite_proposta               (o aceite em si; falhou, 4xx/5xx)
//   3. evento, contrato copiado, termo em PDF,  (melhor esforço: um passo que
//      e-mails                                  cai não derruba a resposta — a
//                                               rotina aceites-pendentes
//                                               completa o que faltou)
//
// runtime nodejs porque o @react-pdf não roda no edge; force-dynamic e
// force-no-store porque uma rota pública nova sem isso é cacheada.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TERMOS_ACEITE_VERSAO, termosAceiteTexto } from "@/lib/aceite-termo";
// Só o tipo (apagado na compilação): a resposta desta rota é o que os
// modais recebem em onAceito, e o formato mora com quem consome.
import type { ResultadoAceite } from "@/components/orcamento-publico/ModalAceiteProposta";
import { appUrl } from "@/lib/app-url";
import { enviarEmailAceiteCerimonialista } from "@/lib/email-aceite";
import {
  anexarContratoDoAceite,
  contatoDaEmpresa,
  contratoDoOrcamento,
  criarEventoDoOrcamento,
  emailDaCerimonialista,
  enviarTermoParaCliente,
  gerarEGuardarTermo,
  modeloDeContrato,
  tipoEventoLabel,
} from "@/lib/orcamento-evento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// A rota mais pesada do sistema: RPC do aceite, RPC do evento, logo, QR,
// PDF, balde e dois e-mails com anexo, tudo na mesma requisição. Sem isto
// cai no padrão do plano (10 s no Hobby) e um 504 chega à cliente como
// "não conseguimos registrar" — para um aceite que JÁ foi gravado.
export const maxDuration = 60;

/** Mesmo teto da RPC (101:306-307): acima disso ela recusa a assinatura. */
const TETO_ASSINATURA = 200_000;
const TETO_USER_AGENT = 300;
/** p_pacote_id e p_extras_ids são uuid na RPC: fora do formato o Postgres
 *  levanta 22P02 e a cliente veria um 500 genérico em vez do erro certo. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Memória do processo: some no deploy, e é de propósito — é um
// amortecedor contra rajada, não um contador de verdade.
const ultimos = new Map<string, number[]>();
const JANELA_MS = 60_000;
const MAX_POR_JANELA = 5;

function demaisTentativas(ip: string): boolean {
  const agora = Date.now();
  const anteriores = (ultimos.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  anteriores.push(agora);
  ultimos.set(ip, anteriores);
  if (ultimos.size > 5000) ultimos.clear(); // teto de memória
  return anteriores.length > MAX_POR_JANELA;
}

type Corpo = {
  pacoteId?: unknown;
  convidados?: unknown;
  extrasIds?: unknown;
  formaPagamento?: unknown;
  parcelas?: unknown;
  nome?: unknown;
  nome2?: unknown;
  cpf?: unknown;
  email?: unknown;
  telefone?: unknown;
  assinatura1?: unknown;
  assinatura2?: unknown;
  termosAceitos?: unknown;
  tipoEvento?: unknown;
  dataEvento?: unknown;
  /** SHA-256 do contrato que o modal mostrou; null = a proposta não tinha contrato */
  contratoSha256?: unknown;
};

type Dados = {
  /** null quando o navegador não mandou: o banco decide se precisa (162, item 9) */
  pacoteId: string | null;
  convidados: number | null;
  extrasIds: string[];
  formaPagamento: "vista" | "parcelado";
  parcelas: number | null;
  nome: string;
  nome2: string | null;
  cpf: string;
  email: string;
  telefone: string | null;
  assinatura1: string;
  assinatura2: string | null;
  tipoEvento: string | null;
  dataEvento: string | null;
  contratoSha256: string | null;
};

const texto = (v: unknown, max = 200): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const inteiroOuNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;

function assinaturaOk(v: unknown): v is string {
  return (
    typeof v === "string" &&
    v.startsWith("data:image/") &&
    v.length > 100 &&
    v.length <= TETO_ASSINATURA
  );
}

/** Erros em português: vão direto para a tela da cliente. */
function validar(c: Corpo): { ok: true; dados: Dados } | { ok: false; erro: string } {
  const nome = texto(c.nome);
  if (!nome) return { ok: false, erro: "Informe o nome de quem está aceitando." };

  // CPF (11 dígitos) ou CNPJ (14): a proposta corporativa pede "CPF ou
  // CNPJ" (lib/papel.ts), e empresa assina com CNPJ. O banco guarda só os
  // dígitos nos dois casos.
  const cpf = texto(c.cpf, 30).replace(/\D/g, "");
  if (cpf.length !== 11 && cpf.length !== 14) {
    return {
      ok: false,
      erro: c.tipoEvento === "corporativo" ? "Informe um CPF ou CNPJ válido." : "Informe um CPF válido.",
    };
  }

  const email = texto(c.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, erro: "Informe um e-mail válido: é para ele que vai o termo assinado." };
  }

  if (c.termosAceitos !== true) {
    return { ok: false, erro: "Marque que leu e aceita as condições da proposta." };
  }

  if (!assinaturaOk(c.assinatura1)) {
    return { ok: false, erro: "Desenhe a assinatura antes de confirmar." };
  }
  const nome2 = texto(c.nome2) || null;
  let assinatura2: string | null = null;
  if (c.assinatura2 != null && c.assinatura2 !== "") {
    if (!assinaturaOk(c.assinatura2)) {
      return { ok: false, erro: "A segunda assinatura não pôde ser lida. Desenhe de novo." };
    }
    assinatura2 = c.assinatura2;
  }

  // O pacote é opcional aqui: no modelo de valor único (Maison) com valor
  // próprio o banco usa o valor da proposta e ignora o pacote; nos modelos
  // com calculadora a RPC recusa sem pacote ("escolha um pacote").
  const pacoteBruto = texto(c.pacoteId, 64);
  const pacoteId = UUID.test(pacoteBruto) ? pacoteBruto : null;

  const formaPagamento = c.formaPagamento === "vista" ? "vista" : "parcelado";
  const parcelas = formaPagamento === "parcelado" ? inteiroOuNull(c.parcelas) : null;
  const extrasIds = Array.isArray(c.extrasIds)
    ? c.extrasIds.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 50)
    : [];

  return {
    ok: true,
    dados: {
      pacoteId,
      convidados: inteiroOuNull(c.convidados),
      extrasIds,
      formaPagamento,
      parcelas,
      nome,
      nome2,
      cpf,
      email,
      telefone: texto(c.telefone, 30) || null,
      assinatura1: c.assinatura1,
      assinatura2,
      tipoEvento: texto(c.tipoEvento, 40) || null,
      dataEvento: /^\d{4}-\d{2}-\d{2}$/.test(texto(c.dataEvento, 10)) ? texto(c.dataEvento, 10) : null,
      contratoSha256: /^[0-9a-f]{64}$/.test(texto(c.contratoSha256, 64))
        ? texto(c.contratoSha256, 64)
        : null,
    },
  };
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // Next cacheia fetch GET em route handler; nunca aqui.
      fetch: (i, x) => fetch(i, { ...x, cache: "no-store" }),
    },
  });
}

type RespostaRpc = {
  success?: boolean;
  error?: string;
  recibo?: string;
  aceite_id?: string;
  pacote_nome?: string | null;
  valor_total?: number | string;
  valor_entrada?: number | string | null;
  valor_parcela?: number | string | null;
  sha256_conteudo?: string | null;
  ja_existia?: boolean;
};

const numero = (v: number | string | null | undefined): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "desconhecido";
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, TETO_USER_AGENT);

  if (demaisTentativas(ip)) {
    return NextResponse.json(
      { ok: false, erro: "Muitas tentativas. Aguarde um minuto e tente de novo." },
      { status: 429 }
    );
  }

  let corpo: Corpo;
  try {
    corpo = (await request.json()) as Corpo;
  } catch {
    return NextResponse.json(
      { ok: false, erro: "Não foi possível ler o que foi enviado. Tente de novo." },
      { status: 400 }
    );
  }
  const v = validar(corpo ?? {});
  if (!v.ok) return NextResponse.json({ ok: false, erro: v.erro }, { status: 400 });
  const d = v.dados;

  // Service role, não a chave publicável: a versão de 18 parâmetros da
  // RPC é fechada ao anônimo, porque é ela que grava IP e navegador — e
  // só esta rota tem os dois.
  const supabase = admin();
  if (!supabase) {
    console.error("[eorg:aceite] SUPABASE_SERVICE_ROLE_KEY ausente");
    return NextResponse.json(
      { ok: false, erro: "O aceite está indisponível neste momento. Tente de novo em instantes." },
      { status: 503 }
    );
  }

  // A proposta, antes do aceite: o contrato que vale depende da empresa e
  // do tipo, e o texto que a cliente marcou depende do contrato.
  const { data: orc } = await supabase
    .from("orcamentos")
    .select("id, empresa_id, tipo_evento, data_evento, cerimonialista_responsavel_id, status")
    .eq("hash_publico", params.hash)
    .maybeSingle();
  const orcamento = orc as {
    id: string;
    empresa_id: string;
    tipo_evento: string;
    data_evento: string | null;
    cerimonialista_responsavel_id: string | null;
    status: string;
  } | null;
  const tipoEvento = orcamento?.tipo_evento ?? d.tipoEvento ?? "outro";

  // ---- 1b. o contrato que ela leu ainda é o que vale --------------
  // O modal manda o SHA-256 do contrato que mostrou. Se a cerimonialista
  // trocou, tirou ou pôs um contrato depois que a página abriu, a cliente
  // estaria aceitando um arquivo que não leu: recusa e pede para recarregar.
  // Proposta já aceita não passa por aqui — a RPC devolve o recibo antigo.
  const modelo =
    orcamento && orcamento.status !== "aprovado"
      ? await modeloDeContrato(supabase, orcamento.empresa_id, orcamento.tipo_evento)
      : null;
  if (orcamento && orcamento.status !== "aprovado" && (modelo?.sha256 ?? null) !== d.contratoSha256) {
    return NextResponse.json(
      {
        ok: false,
        erro: modelo
          ? "O contrato desta proposta foi atualizado. Recarregue a página e leia a versão nova antes de aceitar."
          : "O contrato desta proposta foi retirado. Recarregue a página antes de aceitar.",
      },
      { status: 409 }
    );
  }

  // ---- 2. o aceite em si ------------------------------------------
  const base = {
    p_hash: params.hash,
    p_pacote_id: d.pacoteId,
    p_convidados: d.convidados,
    p_extras_ids: d.extrasIds,
    p_forma_pagamento: d.formaPagamento,
    p_parcelas: d.parcelas,
    p_nome_noiva: d.nome,
    p_nome_noivo: d.nome2,
    p_assinatura_noiva: d.assinatura1,
    p_assinatura_noivo: d.assinatura2,
    p_observacoes: null,
    p_cpf: d.cpf,
    p_email: d.email,
    p_telefone: d.telefone,
  };

  let { data, error } = await supabase.rpc("registrar_aceite_proposta", {
    ...base,
    p_ip: ip === "desconhecido" ? null : ip,
    p_user_agent: userAgent || null,
    p_termos_versao: TERMOS_ACEITE_VERSAO,
    // o mesmo texto que o modal mostrou: com contrato, o nome do arquivo
    // entra na frase — e a frase entra no SHA-256 da linha
    p_termos_texto: termosAceiteTexto(modelo?.nome ?? null),
  });

  // Janela de deploy: o código novo no ar antes da 162 ser aplicada, ou o
  // cache de esquema do PostgREST ainda sem a função nova. A de 14
  // parâmetros ainda existe e o aceite não pode esperar — registra por ela
  // e segue. Depois da 162 a de 14 é ponte para a de 18 e devolve o hash;
  // por isso quem decide se o termo sai é a RESPOSTA (sha256_conteudo),
  // não qual das duas atendeu.
  if (error && /could not find the function/i.test(error.message)) {
    console.error(
      "[eorg:aceite] RPC de 18 parâmetros ausente — migração 162 não aplicada ou cache do PostgREST atrasado"
    );
    ({ data, error } = await supabase.rpc("registrar_aceite_proposta", base));
  }

  if (error) {
    console.error(`[eorg:aceite] registrar: ${error.code} ${error.message}`);
    return NextResponse.json(
      { ok: false, erro: "Não foi possível registrar o aceite agora. Tente de novo em instantes." },
      { status: 500 }
    );
  }

  const r = (data ?? {}) as RespostaRpc;
  if (r.error || !r.success || !r.recibo) {
    // as mensagens da RPC vêm em minúscula ("esta proposta expirou")
    const erro = r.error
      ? r.error.charAt(0).toUpperCase() + r.error.slice(1) + (/[.!?]$/.test(r.error) ? "" : ".")
      : "Não foi possível registrar o aceite.";
    return NextResponse.json({ ok: false, erro }, { status: 400 });
  }

  const recibo = r.recibo;
  const aceiteId = r.aceite_id ?? null;
  const jaExistia = r.ja_existia === true;
  // sem hash não há termo (anterior à 162): gerarEGuardarTermo também
  // recusaria, mas assim nem tenta
  const temHash = typeof r.sha256_conteudo === "string" && r.sha256_conteudo.length > 0;

  // ---- 3. melhor esforço ------------------------------------------
  // Daqui para baixo nada derruba a resposta: o aceite já está gravado.

  // (a) o evento — sem data a RPC devolve sem_data e a cerimonialista
  // gera pelo painel; qualquer outro erro só vai para o log
  try {
    await criarEventoDoOrcamento(
      supabase,
      params.hash,
      tipoEvento,
      orcamento?.data_evento ?? d.dataEvento
    );
  } catch (e) {
    console.error("[eorg:aceite] evento:", e instanceof Error ? e.message : e);
  }

  // (a2) o contrato dela vira documento do aceite — ANTES do termo, que
  // cita o contrato pelo nome e pelo SHA-256, e antes do e-mail, que anexa.
  // Aceite repetido só lê: quem anexa é o primeiro (ou a rotina de reenvio),
  // e duas requisições simultâneas copiando dariam dois contratos.
  let contratoNome: string | null = null;
  if (aceiteId && temHash) {
    try {
      const contrato = jaExistia
        ? orcamento
          ? await contratoDoOrcamento(supabase, orcamento.id)
          : null
        : modelo
          ? await anexarContratoDoAceite(supabase, aceiteId, modelo.sha256)
          : null;
      contratoNome = contrato?.nome ?? null;
    } catch (e) {
      console.error("[eorg:aceite] contrato:", e instanceof Error ? e.message : e);
    }
  }

  // (b) o termo em PDF
  let termo: { documentoId: string; pdf: Buffer; sha256: string } | null = null;
  if (aceiteId && temHash) {
    try {
      termo = await gerarEGuardarTermo(supabase, aceiteId);
    } catch (e) {
      console.error("[eorg:aceite] termo:", e instanceof Error ? e.message : e);
    }
  }

  // (c) o comprovante para a cliente — só com o termo em mãos; sem ele a
  // rotina aceites-pendentes gera e manda, uma vez só, em vez de dois
  // e-mails (um sem anexo agora, outro com anexo depois)
  let emailEnviadoPara: string | null = null;
  if (aceiteId && termo) {
    try {
      if (jaExistia) {
        // aceite repetido (recarregou a tela): o comprovante já saiu?
        const { data: doc } = await supabase
          .from("evento_documento")
          .select("enviado_em")
          .eq("id", termo.documentoId)
          .maybeSingle();
        const { data: linha } = await supabase
          .from("orcamento_aceites")
          .select("email")
          .eq("id", aceiteId)
          .maybeSingle();
        const emailDaLinha = (linha as { email?: string | null } | null)?.email ?? null;
        // O comprovante vai (e foi) para o e-mail DA LINHA — de quem
        // aceitou primeiro. Ele só volta para a tela quando é o mesmo que
        // esta pessoa acabou de digitar: quem abre o link depois, com
        // outro e-mail, não vê o de terceiro numa página pública.
        const soSeForOMesmo = (e: string | null) =>
          e && e.trim().toLowerCase() === d.email ? e : null;
        if ((doc as { enviado_em?: string | null } | null)?.enviado_em) {
          emailEnviadoPara = soSeForOMesmo(emailDaLinha);
        } else {
          emailEnviadoPara = soSeForOMesmo(
            (await enviarTermoParaCliente(supabase, aceiteId, termo.pdf)).emailEnviadoPara
          );
        }
      } else {
        emailEnviadoPara = (await enviarTermoParaCliente(supabase, aceiteId, termo.pdf))
          .emailEnviadoPara;
      }
    } catch (e) {
      console.error("[eorg:aceite] comprovante:", e instanceof Error ? e.message : e);
    }
  }

  // (d) o aviso para a cerimonialista — uma vez por aceite
  let whatsapp: string | null = null;
  let emailCerimonialista: string | null = null;
  if (orcamento) {
    try {
      const [contato, destino, empresa] = await Promise.all([
        contatoDaEmpresa(supabase, orcamento.empresa_id, tipoEvento),
        emailDaCerimonialista(
          supabase,
          orcamento.empresa_id,
          tipoEvento,
          orcamento.cerimonialista_responsavel_id
        ),
        supabase.from("empresas").select("nome").eq("id", orcamento.empresa_id).maybeSingle(),
      ]);
      whatsapp = contato.whatsapp;
      emailCerimonialista = destino;

      if (!jaExistia && destino) {
        const envio = await enviarEmailAceiteCerimonialista({
          to: destino,
          replyTo: d.email,
          empresaNome: (empresa.data as { nome?: string } | null)?.nome ?? "eOrganizei",
          clienteNome: d.nome,
          valorTotal: numero(r.valor_total) ?? 0,
          recibo,
          tipoEventoLabel: tipoEventoLabel(tipoEvento),
          linkOrcamento: `${appUrl()}/orcamentos/${orcamento.id}`,
        });
        if (!envio.ok) console.error(`[eorg:aceite] aviso à cerimonialista: ${envio.error}`);
      }
    } catch (e) {
      console.error("[eorg:aceite] aviso:", e instanceof Error ? e.message : e);
    }
  }

  const resultado: ResultadoAceite = {
    recibo,
    valorTotal: numero(r.valor_total) ?? 0,
    valorEntrada: numero(r.valor_entrada),
    valorParcela: numero(r.valor_parcela),
    jaExistia,
    whatsapp,
    emailCerimonialista,
    emailEnviadoPara,
    contratoNome,
    pacoteNome: typeof r.pacote_nome === "string" && r.pacote_nome ? r.pacote_nome : null,
  };

  return NextResponse.json({ ok: true, aceiteId, ...resultado });
}
