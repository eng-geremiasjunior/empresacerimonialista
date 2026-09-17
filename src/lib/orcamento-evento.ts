import "server-only";

// O que acontece no servidor quando uma proposta é aceita — e que a rota
// do aceite (/api/orcamento/[hash]/aceite) e a rotina de reenvio
// (/api/cron/aceites-pendentes) compartilham.
//
//   - criarEventoDoOrcamento: o miolo que morava em orcamento-para-evento.ts.
//     A server action continua existindo e delega para cá; aqui não há
//     "use server" nem revalidatePath, porque uma rota pública e um cron
//     não têm página em cache para invalidar.
//   - gerarEGuardarTermo: lê a linha imutável do aceite, desenha o PDF do
//     termo, grava no balde e registra em evento_documento.
//   - enviarTermoParaCliente: manda o comprovante para o e-mail DA LINHA
//     DO ACEITE — nunca de orcamentos.ficha_email, que a proposta seguinte
//     sobrescreve. Quem aceitou com um e-mail recebe naquele e-mail.
//
// Tudo roda com a chave de serviço: a cliente aceita sem login, e o cron
// também não tem sessão. Por isso nenhuma função daqui é exposta a
// componente — quem chama é rota ou action, no servidor.

import { createHash, randomUUID } from "node:crypto";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { gerarFasesPorTipo, resolverTemplate } from "@/lib/event-templates";
import { appUrl } from "@/lib/app-url";
import { avisarSeForOPrimeiroEvento } from "@/lib/primeiro-evento";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import {
  contratoCitadoNoTermo,
  nomeDoContratoNoTermo,
  urlVerificacao,
} from "@/lib/aceite-termo";
import { comoDataUri } from "@/lib/pdf-imagens";
import { qrDataUri } from "@/lib/qr";
import {
  gerarPdfTermoAceite,
  type DadosTermoAceite,
} from "@/lib/gerar-pdf-termo-aceite";
import {
  BALDE_CONTRATOS,
  apagarArquivo,
  baixarArquivo,
  caminhoDoDocumento,
  copiarArquivo,
  gravarArquivo,
} from "@/lib/contratos";
import { enviarEmailAceiteCliente } from "@/lib/email-aceite";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { textoWhatsappAceite } from "@/lib/orcamento-publico";

// ------------------------------------------------------------------
// O evento a partir do orçamento aceito
// ------------------------------------------------------------------

export type ResultadoEvento = {
  ok: boolean;
  eventoId: string | null;
  jaExistia: boolean;
  /** a proposta não tem data: o evento fica para a cerimonialista gerar */
  semData: boolean;
  erro: string | null;
};

/**
 * Chama a RPC criar_evento_do_orcamento (112), que faz toda a escrita em
 * uma transação. Os TEMPLATES vêm de lib/event-templates.ts — os mesmos
 * do wizard, sem duplicar regra.
 *
 * O checklist plano foi aposentado (065): o Planejamento é a árvore do
 * método, instanciada por gatilho no insert do evento. p_tasks vai vazio.
 * O roteiro também não é montado aqui: a RPC semeia do Playbook da
 * empresa dentro do SECURITY DEFINER — o navegador da cliente não enxerga
 * (nem deve enxergar) o modelo. p_roteiro vai vazio e é ignorado.
 */
export async function criarEventoDoOrcamento(
  client: SupabaseClient,
  hash: string,
  tipoEvento: string,
  dataEvento: string | null
): Promise<ResultadoEvento> {
  const arquetipo = resolverTemplate(tipoEvento);
  const phases = gerarFasesPorTipo(arquetipo);

  const { data, error } = await client.rpc("criar_evento_do_orcamento", {
    p_hash: hash,
    p_tasks: [],
    p_phases: phases,
    p_data_evento: dataEvento ?? null,
    p_roteiro: [],
  });

  const falhou = (erro: string): ResultadoEvento => ({
    ok: false,
    eventoId: null,
    jaExistia: false,
    semData: false,
    erro,
  });

  if (error) {
    console.error(`[eorg:aceite] criar evento: ${error.code} ${error.message}`);
    return falhou("Não foi possível gerar o evento. Tente novamente.");
  }

  const res = data as {
    success?: boolean;
    evento_id?: string;
    ja_existia?: boolean;
    error?: string;
  } | null;

  if (res?.error === "sem_data") {
    return { ok: false, eventoId: null, jaExistia: false, semData: true, erro: null };
  }
  if (res?.error) return falhou(res.error);
  if (!res?.success || !res.evento_id) {
    return falhou("Não foi possível gerar o evento.");
  }

  await ligarDocumentosAoEvento(hash, res.evento_id);
  // o primeiro evento da conta pode nascer de uma proposta aceita
  if (!res.ja_existia) await avisarSeForOPrimeiroEvento(res.evento_id);

  return {
    ok: true,
    eventoId: res.evento_id,
    jaExistia: Boolean(res.ja_existia),
    semData: false,
    erro: null,
  };
}

/**
 * Proposta aceita sem data não gera evento na hora: o termo (e o contrato)
 * nascem pendurados só no orçamento. Quando o evento nasce depois — pelo
 * painel, com a data — os documentos passam a apontar para ele, senão
 * não aparecem na aba Contratos do evento nem no portal da cliente (a
 * policy do portal lê por event_id). Chave de serviço porque
 * evento_documento não tem policy de UPDATE para sessão nenhuma, de
 * propósito (162). Melhor esforço: falhar aqui não desfaz o evento.
 */
async function ligarDocumentosAoEvento(hash: string, eventoId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const admin = createServiceClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) },
  });
  try {
    const { data: orc } = await admin
      .from("orcamentos")
      .select("id, evento_gerado_id")
      .eq("hash_publico", hash)
      .maybeSingle();
    const o = orc as { id: string; evento_gerado_id: string | null } | null;
    if (!o || o.evento_gerado_id !== eventoId) return;
    const { error } = await admin
      .from("evento_documento")
      .update({ event_id: eventoId })
      .eq("orcamento_id", o.id)
      .is("event_id", null);
    if (error) console.error(`[eorg:aceite] ligar documentos ao evento ${eventoId}: ${error.message}`);
  } catch (e) {
    console.error("[eorg:aceite] ligar documentos:", e instanceof Error ? e.message : e);
  }
}

// ------------------------------------------------------------------
// Leituras que o termo e o e-mail têm em comum
// ------------------------------------------------------------------

type LinhaAceite = {
  id: string;
  orcamento_id: string;
  recibo_codigo: string;
  pacote_nome: string;
  pacote_preco: number | string;
  convidados: number;
  convidados_inclusos: number;
  valor_por_convidado_extra: number | string;
  valor_convidados_extra: number | string | null;
  extras: unknown;
  valor_extras: number | string | null;
  /** 162 item 9: calculadora | proposta | pacote_recomendado; ausente antes dela */
  origem_valor?: string | null;
  itens?: unknown;
  forma_pagamento: string;
  parcelas: number | null;
  desconto_percentual: number | string | null;
  valor_desconto: number | string | null;
  valor_total: number | string;
  valor_entrada: number | string | null;
  valor_parcela: number | string | null;
  nome_noiva: string;
  nome_noivo: string | null;
  assinatura_noiva: string | null;
  assinatura_noivo: string | null;
  ip_origem: string | null;
  user_agent: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  termos_versao: string | null;
  termos_texto: string | null;
  sha256_conteudo: string | null;
  created_at: string;
};

type LinhaOrcamento = {
  id: string;
  empresa_id: string;
  tipo_evento: string;
  data_evento: string | null;
  local_evento: string | null;
  cidade_evento: string | null;
  evento_gerado_id: string | null;
  cerimonialista_responsavel_id: string | null;
  hash_publico: string;
};

type LinhaEmpresa = { id: string; nome: string; logo_url: string | null };

export type LinhaDocumento = {
  id: string;
  storage_path: string;
  nome: string;
  sha256: string | null;
  enviado_em: string | null;
};

type ContextoAceite = {
  aceite: LinhaAceite;
  orcamento: LinhaOrcamento;
  empresa: LinhaEmpresa;
};

/** numeric do Postgres pode chegar como string; o PDF e o e-mail querem número. */
function num(v: number | string | null | undefined): number {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function numOuNull(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export function tipoEventoLabel(tipo: string | null | undefined): string {
  if (!tipo) return "evento";
  return EVENT_TYPE_LABELS[tipo as EventType] ?? tipo;
}

/** `[{nome, preco}]` do jsonb — sem confiar no formato. */
function extrasDe(v: unknown): { nome: string; preco: number }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const o = (x ?? {}) as { nome?: unknown; preco?: unknown };
      return {
        nome: typeof o.nome === "string" ? o.nome : "",
        preco: num(o.preco as number | string | null),
      };
    })
    .filter((x) => x.nome);
}

/** `[{nome, valor}]` dos itens gravados no aceite — sem confiar no formato. */
function itensDe(v: unknown): { nome: string; valor: number }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const o = (x ?? {}) as { nome?: unknown; valor?: unknown };
      return {
        nome: typeof o.nome === "string" ? o.nome : "",
        valor: num(o.valor as number | string | null),
      };
    })
    .filter((x) => x.nome);
}

/** Só o que o @react-pdf consegue desenhar; qualquer outra coisa vira "sem assinatura". */
function assinaturaValida(v: string | null): string | null {
  return v && v.startsWith("data:image/") ? v : null;
}

function absoluta(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${appUrl()}${url}`;
}

function sha256De(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function lerContexto(
  admin: SupabaseClient,
  aceiteId: string
): Promise<ContextoAceite | null> {
  const { data: aceite, error } = await admin
    .from("orcamento_aceites")
    .select("*")
    .eq("id", aceiteId)
    .maybeSingle();
  if (error || !aceite) {
    console.error(`[eorg:aceite] aceite ${aceiteId} não lido: ${error?.message ?? "vazio"}`);
    return null;
  }
  const a = aceite as LinhaAceite;

  const { data: orcamento } = await admin
    .from("orcamentos")
    .select(
      "id, empresa_id, tipo_evento, data_evento, local_evento, cidade_evento, evento_gerado_id, cerimonialista_responsavel_id, hash_publico"
    )
    .eq("id", a.orcamento_id)
    .maybeSingle();
  if (!orcamento) return null;
  const o = orcamento as LinhaOrcamento;

  const { data: empresa } = await admin
    .from("empresas")
    .select("id, nome, logo_url")
    .eq("id", o.empresa_id)
    .maybeSingle();
  if (!empresa) return null;

  return { aceite: a, orcamento: o, empresa: empresa as LinhaEmpresa };
}

async function documentoDoAceite(
  admin: SupabaseClient,
  aceiteId: string,
  categoria: "termo_aceite" | "contrato_prestacao"
): Promise<LinhaDocumento | null> {
  const { data } = await admin
    .from("evento_documento")
    .select("id, storage_path, nome, sha256, enviado_em")
    .eq("orcamento_aceite_id", aceiteId)
    .eq("categoria", categoria)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as LinhaDocumento | null) ?? null;
}

/**
 * O contrato de prestação dela, quando já foi copiado para este
 * orçamento (pelo aceite ou anexado depois). Amarrado ao orçamento, não
 * ao aceite: o contrato é da proposta inteira.
 */
export async function contratoDoOrcamento(
  admin: SupabaseClient,
  orcamentoId: string
): Promise<LinhaDocumento | null> {
  const { data } = await admin
    .from("evento_documento")
    .select("id, storage_path, nome, sha256, enviado_em")
    .eq("orcamento_id", orcamentoId)
    .eq("categoria", "contrato_prestacao")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as LinhaDocumento | null) ?? null;
}

// ------------------------------------------------------------------
// O contrato de prestação dela (163)
// ------------------------------------------------------------------

export type ModeloVigente = {
  caminho: string;
  nome: string;
  sha256: string;
  em: string | null;
};

type LinhaModelo = {
  contrato_modelo_path: string | null;
  contrato_modelo_nome: string | null;
  contrato_modelo_sha256: string | null;
  contrato_modelo_em: string | null;
};

const COLUNAS_MODELO =
  "contrato_modelo_path, contrato_modelo_nome, contrato_modelo_sha256, contrato_modelo_em";

/**
 * O modelo que vale para esta empresa e este tipo: a exceção do tipo; sem
 * ela, o padrão da empresa; sem os dois, null. Antes da 163 as colunas não
 * existem, a leitura volta erro e a resposta é "sem contrato". O caminho
 * só vale dentro da pasta da própria empresa — o CHECK da 163 já garante,
 * e quem assina com a chave de serviço confere de novo.
 */
export async function modeloDeContrato(
  admin: SupabaseClient,
  empresaId: string,
  tipoEvento: string
): Promise<ModeloVigente | null> {
  const [doTipo, daEmpresa] = await Promise.all([
    admin
      .from("empresa_conteudo_institucional")
      .select(COLUNAS_MODELO)
      .eq("empresa_id", empresaId)
      .eq("tipo_evento", tipoEvento)
      .maybeSingle(),
    admin.from("empresas").select(COLUNAS_MODELO).eq("id", empresaId).maybeSingle(),
  ]);
  const valido = (l: LinhaModelo | null): ModeloVigente | null =>
    l?.contrato_modelo_path &&
    l.contrato_modelo_nome &&
    l.contrato_modelo_sha256 &&
    l.contrato_modelo_path.startsWith(`${empresaId}/modelos/`)
      ? {
          caminho: l.contrato_modelo_path,
          nome: l.contrato_modelo_nome,
          sha256: l.contrato_modelo_sha256,
          em: l.contrato_modelo_em,
        }
      : null;
  return (
    valido(doTipo.error ? null : (doTipo.data as LinhaModelo | null)) ??
    valido(daEmpresa.error ? null : (daEmpresa.data as LinhaModelo | null))
  );
}

/**
 * Copia o modelo de contrato para os documentos da cliente e registra em
 * evento_documento, amarrado ao aceite. Convergente: já existe contrato no
 * orçamento, devolve ele.
 *
 * Só anexa o que a cliente aceitou. O texto gravado na linha diz se ela
 * aceitou com contrato e com qual nome de arquivo; o hash diz qual arquivo:
 *   - na rota, `sha256Lido` é o do contrato que o modal mostrou — o modelo
 *     de agora tem de ser esse;
 *   - na rotina de reenvio não há esse hash: só vale o modelo que já
 *     estava lá ANTES do aceite (subiu antes, com o nome citado). Modelo
 *     trocado depois do aceite não é o que ela leu, e não entra.
 * E a cópia é conferida byte a byte pelo SHA-256 antes de valer.
 */
export async function anexarContratoDoAceite(
  admin: SupabaseClient,
  aceiteId: string,
  sha256Lido: string | null
): Promise<LinhaDocumento | null> {
  const ctx = await lerContexto(admin, aceiteId);
  if (!ctx) return null;
  const { aceite, orcamento } = ctx;

  const existente = await contratoDoOrcamento(admin, orcamento.id);
  if (existente) return existente;

  const citado = contratoCitadoNoTermo(aceite.termos_texto);
  if (!citado) return null; // aceitou sem contrato

  const modelo = await modeloDeContrato(admin, orcamento.empresa_id, orcamento.tipo_evento);
  if (!modelo) {
    console.error(`[eorg:aceite] aceite ${aceiteId} cita contrato, mas não há modelo vigente`);
    return null;
  }
  if (sha256Lido) {
    if (modelo.sha256 !== sha256Lido) {
      console.error(`[eorg:aceite] aceite ${aceiteId}: o modelo mudou entre a leitura e o aceite`);
      return null;
    }
  } else {
    const subiuAntes =
      !!modelo.em && new Date(modelo.em).getTime() <= new Date(aceite.created_at).getTime();
    if (!subiuAntes || nomeDoContratoNoTermo(modelo.nome) !== citado) {
      console.error(
        `[eorg:aceite] aceite ${aceiteId}: o modelo de agora não é o que foi aceito; contrato não anexado`
      );
      return null;
    }
  }

  const documentoId = randomUUID();
  const caminho = caminhoDoDocumento(
    orcamento.empresa_id,
    orcamento.evento_gerado_id ?? orcamento.id,
    documentoId,
    modelo.nome
  );
  if (!(await copiarArquivo(admin, BALDE_CONTRATOS, modelo.caminho, caminho))) return null;

  const copia = await baixarArquivo(admin, BALDE_CONTRATOS, caminho);
  const sha256 = copia ? sha256De(copia) : null;
  if (!copia || sha256 !== modelo.sha256) {
    console.error(`[eorg:aceite] aceite ${aceiteId}: a cópia do contrato não confere com o modelo`);
    await apagarArquivo(admin, BALDE_CONTRATOS, caminho);
    return null;
  }

  const { error } = await admin.from("evento_documento").insert({
    id: documentoId,
    empresa_id: orcamento.empresa_id,
    event_id: orcamento.evento_gerado_id,
    orcamento_id: orcamento.id,
    orcamento_aceite_id: aceite.id,
    categoria: "contrato_prestacao",
    storage_path: caminho,
    nome: modelo.nome,
    sha256,
    bytes: copia.length,
    // o arquivo é dela; o sistema só copiou
    origem: "cerimonialista",
  });
  if (error) {
    console.error(`[eorg:aceite] registrar contrato do aceite ${aceiteId}: ${error.message}`);
    await apagarArquivo(admin, BALDE_CONTRATOS, caminho);
    return null;
  }

  return { id: documentoId, storage_path: caminho, nome: modelo.nome, sha256, enviado_em: null };
}

/**
 * O arquivo que a proposta pública abre em "Ler o contrato": o contrato
 * anexado ao aceite, quando há; enquanto a proposta está aberta, o modelo
 * vigente. Devolve o caminho no balde — quem assina é a rota.
 */
export async function contratoParaLer(
  admin: SupabaseClient,
  orcamento: { id: string; empresa_id: string; tipo_evento: string; status: string }
): Promise<string | null> {
  const doc = await contratoDoOrcamento(admin, orcamento.id);
  if (doc) return doc.storage_path.startsWith(`${orcamento.empresa_id}/`) ? doc.storage_path : null;
  if (orcamento.status === "aprovado") return null;
  const modelo = await modeloDeContrato(admin, orcamento.empresa_id, orcamento.tipo_evento);
  return modelo?.caminho ?? null;
}

/**
 * WhatsApp e e-mail de contato da empresa para este tipo de evento. O
 * Catálogo guarda uma linha por tipo; quem preencheu só o de casamento
 * não pode ficar sem botão na proposta de debutante — o primeiro valor de
 * qualquer tipo serve.
 */
export async function contatoDaEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  tipoEvento: string
): Promise<{ whatsapp: string | null; email: string | null }> {
  const { data } = await admin
    .from("empresa_conteudo_institucional")
    .select("tipo_evento, whatsapp_contato, email_contato")
    .eq("empresa_id", empresaId);
  const linhas = (data ?? []) as {
    tipo_evento: string;
    whatsapp_contato: string | null;
    email_contato: string | null;
  }[];
  const doTipo = linhas.find((l) => l.tipo_evento === tipoEvento);
  const limpo = (v: string | null | undefined) => (v ?? "").trim() || null;
  return {
    whatsapp:
      limpo(doTipo?.whatsapp_contato) ??
      linhas.map((l) => limpo(l.whatsapp_contato)).find(Boolean) ??
      null,
    email:
      limpo(doTipo?.email_contato) ??
      linhas.map((l) => limpo(l.email_contato)).find(Boolean) ??
      null,
  };
}

/**
 * Para onde a cerimonialista recebe o aviso do aceite e a resposta da
 * cliente: o e-mail de contato do Catálogo; sem ele, o da responsável
 * pelo orçamento; sem ela, o da proprietária; em último caso, o login da
 * dona da empresa.
 */
export async function emailDaCerimonialista(
  admin: SupabaseClient,
  empresaId: string,
  tipoEvento: string,
  responsavelId: string | null
): Promise<string | null> {
  const contato = await contatoDaEmpresa(admin, empresaId, tipoEvento);
  if (contato.email) return contato.email;

  const { data: membros } = await admin
    .from("membros_equipe")
    .select("id, email, is_owner, status")
    .eq("empresa_id", empresaId)
    .eq("status", "ativo");
  const lista = (membros ?? []) as {
    id: string;
    email: string | null;
    is_owner: boolean;
  }[];
  const limpo = (v: string | null | undefined) => (v ?? "").trim() || null;
  const daResponsavel = responsavelId
    ? limpo(lista.find((m) => m.id === responsavelId)?.email)
    : null;
  if (daResponsavel) return daResponsavel;
  const daProprietaria = limpo(lista.find((m) => m.is_owner)?.email);
  if (daProprietaria) return daProprietaria;

  const { data: empresa } = await admin
    .from("empresas")
    .select("owner_user_id")
    .eq("id", empresaId)
    .maybeSingle();
  const ownerId = (empresa as { owner_user_id?: string } | null)?.owner_user_id;
  if (!ownerId) return null;
  const { data: dona } = await admin.auth.admin.getUserById(ownerId);
  return limpo(dona?.user?.email);
}

/** Os "próximos passos" que a proposta já mostra, na ordem do Catálogo. */
async function proximosPassos(
  admin: SupabaseClient,
  empresaId: string,
  tipoEvento: string
): Promise<string[]> {
  const { data } = await admin
    .from("empresa_proposta_blocos")
    .select("titulo, texto_curto, ordem")
    .eq("empresa_id", empresaId)
    .eq("tipo_evento", tipoEvento)
    .eq("secao", "proximos_passos")
    .order("ordem", { ascending: true });
  return ((data ?? []) as { titulo: string | null; texto_curto: string | null }[])
    .map((b) => [b.titulo, b.texto_curto].map((t) => (t ?? "").trim()).filter(Boolean).join(" — "))
    .filter(Boolean);
}

// ------------------------------------------------------------------
// O termo em PDF
// ------------------------------------------------------------------

/**
 * Gera o termo do aceite, guarda no balde e registra em evento_documento.
 * Convergente: se o documento já existe, devolve o que está guardado; se
 * a linha existe mas o arquivo não abre, regera no mesmo caminho.
 *
 * Devolve null quando não dá para provar nada — aceite sem hash (anterior
 * à 162) ou falha de escrita. O chamador decide: a rota segue sem termo e
 * a rotina de reenvio tenta de novo.
 */
export async function gerarEGuardarTermo(
  admin: SupabaseClient,
  aceiteId: string
): Promise<{ documentoId: string; pdf: Buffer; sha256: string } | null> {
  const ctx = await lerContexto(admin, aceiteId);
  if (!ctx) return null;
  const { aceite, orcamento, empresa } = ctx;

  const existente = await documentoDoAceite(admin, aceiteId, "termo_aceite");
  if (existente) {
    const guardado = await baixarArquivo(admin, BALDE_CONTRATOS, existente.storage_path);
    if (guardado) {
      return {
        documentoId: existente.id,
        pdf: guardado,
        sha256: existente.sha256 ?? sha256De(guardado),
      };
    }
    console.error(`[eorg:aceite] termo ${existente.id} sem arquivo no balde; regerando`);
  }

  if (!aceite.sha256_conteudo) {
    // sem o hash da linha não há QR nem verificação — não é um termo
    console.error(`[eorg:aceite] aceite ${aceiteId} sem sha256_conteudo (anterior à 162)`);
    return null;
  }

  const verificacao = urlVerificacao(appUrl(), aceite.recibo_codigo, aceite.sha256_conteudo);
  const [logoDataUri, qr, contrato] = await Promise.all([
    comoDataUri(absoluta(empresa.logo_url)),
    qrDataUri(verificacao),
    contratoDoOrcamento(admin, orcamento.id),
  ]);

  const dados: DadosTermoAceite = {
    empresa: { nome: empresa.nome, logoDataUri },
    recibo: aceite.recibo_codigo,
    tipoEventoLabel: tipoEventoLabel(orcamento.tipo_evento),
    dataEvento: orcamento.data_evento,
    localEvento:
      [orcamento.local_evento, orcamento.cidade_evento]
        .map((t) => (t ?? "").trim())
        .filter(Boolean)
        .join(" — ") || null,
    snapshot: {
      pacoteNome: aceite.pacote_nome,
      pacotePreco: num(aceite.pacote_preco),
      convidados: aceite.convidados,
      convidadosInclusos: aceite.convidados_inclusos,
      valorPorConvidadoExtra: num(aceite.valor_por_convidado_extra),
      valorConvidadosExtra: num(aceite.valor_convidados_extra),
      extras: extrasDe(aceite.extras),
      valorExtras: num(aceite.valor_extras),
      origemValor: aceite.origem_valor ?? null,
      itens: itensDe(aceite.itens),
      formaPagamento: aceite.forma_pagamento,
      parcelas: aceite.parcelas,
      descontoPercentual: numOuNull(aceite.desconto_percentual),
      valorDesconto: numOuNull(aceite.valor_desconto),
      valorTotal: num(aceite.valor_total),
      valorEntrada: numOuNull(aceite.valor_entrada),
      valorParcela: numOuNull(aceite.valor_parcela),
    },
    assinante1: {
      nome: aceite.nome_noiva,
      cpf: aceite.cpf,
      email: aceite.email,
      telefone: aceite.telefone,
      assinaturaDataUri: assinaturaValida(aceite.assinatura_noiva),
    },
    assinante2: aceite.nome_noivo
      ? {
          nome: aceite.nome_noivo,
          assinaturaDataUri: assinaturaValida(aceite.assinatura_noivo),
        }
      : null,
    aceitoEm: aceite.created_at,
    ip: aceite.ip_origem,
    userAgent: aceite.user_agent,
    termosTexto: aceite.termos_texto ?? "",
    termosVersao: aceite.termos_versao ?? "",
    sha256: aceite.sha256_conteudo,
    contrato:
      contrato && contrato.sha256 ? { nome: contrato.nome, sha256: contrato.sha256 } : null,
    qrDataUri: qr,
    urlVerificacao: verificacao,
  };

  const pdf = await gerarPdfTermoAceite(dados);
  const sha256 = sha256De(pdf);
  const nome = `termo-de-aceite-${aceite.recibo_codigo}.pdf`;
  const documentoId = existente?.id ?? randomUUID();
  const caminho =
    existente?.storage_path ??
    caminhoDoDocumento(
      orcamento.empresa_id,
      orcamento.evento_gerado_id ?? orcamento.id,
      documentoId,
      nome
    );

  const gravou = await gravarArquivo(admin, BALDE_CONTRATOS, caminho, pdf, "application/pdf");
  if (!gravou) return null;

  if (existente) {
    const { error } = await admin
      .from("evento_documento")
      .update({ sha256, bytes: pdf.length })
      .eq("id", existente.id);
    if (error) console.error(`[eorg:aceite] atualizar termo ${existente.id}: ${error.message}`);
  } else {
    const { error } = await admin.from("evento_documento").insert({
      id: documentoId,
      empresa_id: orcamento.empresa_id,
      event_id: orcamento.evento_gerado_id,
      orcamento_id: orcamento.id,
      orcamento_aceite_id: aceite.id,
      categoria: "termo_aceite",
      storage_path: caminho,
      nome,
      sha256,
      bytes: pdf.length,
      origem: "sistema",
    });
    if (error) {
      console.error(`[eorg:aceite] registrar termo do aceite ${aceiteId}: ${error.message}`);
      return null;
    }
  }

  return { documentoId, pdf, sha256 };
}

// ------------------------------------------------------------------
// O comprovante para a cliente
// ------------------------------------------------------------------

/**
 * Manda o e-mail da cliente com o termo (e o contrato dela, quando já
 * existe) em anexo. `pdf` vem de quem acabou de gerar; sem ele, lê o
 * termo guardado. Sem termo em mãos o comprovante NÃO sai: um e-mail
 * "sua proposta foi aceita" sem o documento, marcado como enviado,
 * deixaria a cliente sem o termo para sempre — e a rotina de reenvio
 * nunca mais tentaria. Quando o e-mail sai, marca
 * evento_documento.enviado_em — é essa marca que diz à rotina de reenvio
 * que este já foi.
 */
export async function enviarTermoParaCliente(
  admin: SupabaseClient,
  aceiteId: string,
  pdf: Buffer | null
): Promise<{ ok: boolean; emailEnviadoPara: string | null }> {
  const nada = { ok: false, emailEnviadoPara: null };
  const ctx = await lerContexto(admin, aceiteId);
  if (!ctx) return nada;
  const { aceite, orcamento, empresa } = ctx;

  const email = (aceite.email ?? "").trim();
  if (!email) return nada;
  if (!aceite.sha256_conteudo) {
    console.error(`[eorg:aceite] aceite ${aceiteId} sem hash: comprovante não sai`);
    return nada;
  }

  const termo = await documentoDoAceite(admin, aceiteId, "termo_aceite");
  let termoPdf = pdf;
  if (!termoPdf && termo) {
    termoPdf = await baixarArquivo(admin, BALDE_CONTRATOS, termo.storage_path);
  }
  if (!termoPdf || termoPdf.length === 0) {
    console.error(`[eorg:aceite] aceite ${aceiteId} sem termo em mãos: comprovante não sai`);
    return nada;
  }

  const contratoDoc = await contratoDoOrcamento(admin, orcamento.id);
  let contratoPdf: { nome: string; buffer: Buffer } | null = null;
  if (contratoDoc) {
    const buffer = await baixarArquivo(admin, BALDE_CONTRATOS, contratoDoc.storage_path);
    if (buffer) contratoPdf = { nome: contratoDoc.nome, buffer };
  }

  const tipo = orcamento.tipo_evento;
  const label = tipoEventoLabel(tipo);
  const [contato, emailCerimonialista, passos] = await Promise.all([
    contatoDaEmpresa(admin, orcamento.empresa_id, tipo),
    emailDaCerimonialista(
      admin,
      orcamento.empresa_id,
      tipo,
      orcamento.cerimonialista_responsavel_id
    ),
    proximosPassos(admin, orcamento.empresa_id, tipo),
  ]);

  const envio = await enviarEmailAceiteCliente({
    to: email,
    empresaNome: empresa.nome,
    logoUrl: absoluta(empresa.logo_url),
    recibo: aceite.recibo_codigo,
    tipoEventoLabel: label,
    dataEvento: orcamento.data_evento,
    resumo: {
      pacoteNome: aceite.pacote_nome,
      convidados: aceite.convidados,
      extras: extrasDe(aceite.extras),
      origemValor: aceite.origem_valor ?? null,
      itens: itensDe(aceite.itens),
      formaPagamento: aceite.forma_pagamento,
      parcelas: aceite.parcelas,
      valorEntrada: numOuNull(aceite.valor_entrada),
      valorParcela: numOuNull(aceite.valor_parcela),
      valorTotal: num(aceite.valor_total),
    },
    termoPdf,
    contratoPdf,
    // contrato grande demais para anexo: o mesmo link que a proposta usa em
    // "Ler o contrato" (o hash da proposta é a credencial, e ele já chega
    // à cliente no e-mail do orçamento)
    contratoLink: contratoDoc
      ? `${appUrl()}/api/orcamento/${encodeURIComponent(orcamento.hash_publico)}/contrato`
      : null,
    // a mesma frase do botão da tela de recibo: um texto só nos dois lugares
    whatsappLink: linkWhatsapp(
      contato.whatsapp,
      textoWhatsappAceite(tipo, aceite.recibo_codigo, aceite.nome_noiva)
    ),
    emailCerimonialista,
    proximosPassos: passos,
    linkVerificacao: urlVerificacao(appUrl(), aceite.recibo_codigo, aceite.sha256_conteudo),
  });

  if (!envio.ok) {
    console.error(`[eorg:aceite] comprovante do aceite ${aceiteId}: ${envio.error}`);
    return nada;
  }

  if (termo) {
    const { error } = await admin
      .from("evento_documento")
      .update({ enviado_em: new Date().toISOString() })
      .eq("id", termo.id);
    if (error) {
      // saiu mas não marcou: a rotina manda de novo. Duplicar um
      // comprovante é menos ruim que engolir um — mas precisa aparecer.
      console.error(`[eorg:aceite] marcar termo ${termo.id} enviado: ${error.message}`);
    }
  }

  return { ok: true, emailEnviadoPara: email };
}
