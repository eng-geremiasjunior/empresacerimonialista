// O que a rota do aceite não conseguiu terminar, esta rotina termina.
//
// O aceite em si nunca depende do resto: a linha entra no banco e a
// resposta volta para a cliente mesmo que o PDF, o balde ou o Resend
// falhem naquele segundo. O que ficou para trás aparece aqui, uma vez por
// dia (meia hora depois do despachante diário — o plano da Vercel só
// aceita cron diário), olhando os aceites das últimas 72 h:
//   - aceite sem termo em evento_documento → gera e guarda
//   - termo sem enviado_em, com e-mail na linha do aceite → manda
//
// O e-mail vem da LINHA IMUTÁVEL do aceite, nunca de orcamentos.ficha_email
// (que a próxima proposta sobrescreve).
//
// Rota própria, fora do despachante /api/cron/diario: aquele tem 60 s
// para dez rotinas em sequência, e gerar PDF mais e-mail com anexo não
// cabe ali. Teto de 5 aceites por execução pelo mesmo motivo — o que
// sobrar entra na próxima. runtime nodejs porque o @react-pdf não roda
// no edge.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BALDE_CONTRATOS, baixarArquivo } from "@/lib/contratos";
import {
  anexarContratoDoAceite,
  enviarTermoParaCliente,
  gerarEGuardarTermo,
} from "@/lib/orcamento-evento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// Sem isto cai no padrão do plano (10s no Hobby) e um 504 mata a rotina
// no meio, em silêncio.
export const maxDuration = 60;

const TETO_POR_EXECUCAO = 5;
const JANELA_HORAS = 72;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

type Aceite = {
  id: string;
  email: string | null;
  sha256_conteudo: string | null;
  created_at: string;
};

type Termo = {
  id: string;
  orcamento_aceite_id: string;
  storage_path: string;
  enviado_em: string | null;
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no ambiente" },
      { status: 500 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente" },
      { status: 500 }
    );
  }

  const desde = new Date(Date.now() - JANELA_HORAS * 60 * 60 * 1000).toISOString();

  const { data: linhas, error: erroAceites } = await supabase
    .from("orcamento_aceites")
    .select("id, email, sha256_conteudo, created_at")
    .gte("created_at", desde)
    .order("created_at", { ascending: true });
  if (erroAceites) {
    console.error(`[eorg:aceites-pendentes] leitura falhou: ${erroAceites.message}`);
    return NextResponse.json({ error: erroAceites.message }, { status: 500 });
  }

  // Aceites anteriores à 162 não têm hash: não há termo a gerar deles, e
  // ficariam aqui 72 h aparecendo como pendência.
  const aceites = ((linhas ?? []) as Aceite[]).filter((a) => a.sha256_conteudo);
  if (aceites.length === 0) {
    return NextResponse.json({ ok: true, lidos: 0, tratados: 0, gerados: 0, enviados: 0, falhas: [] });
  }

  const { data: docs, error: erroDocs } = await supabase
    .from("evento_documento")
    .select("id, orcamento_aceite_id, storage_path, enviado_em")
    .eq("categoria", "termo_aceite")
    .in(
      "orcamento_aceite_id",
      aceites.map((a) => a.id)
    );
  if (erroDocs) {
    console.error(`[eorg:aceites-pendentes] documentos falhou: ${erroDocs.message}`);
    return NextResponse.json({ error: erroDocs.message }, { status: 500 });
  }
  const termoPorAceite = new Map<string, Termo>();
  for (const d of (docs ?? []) as Termo[]) {
    if (d.orcamento_aceite_id) termoPorAceite.set(d.orcamento_aceite_id, d);
  }

  let tratados = 0;
  let gerados = 0;
  let enviados = 0;
  const falhas: string[] = [];

  for (const aceite of aceites) {
    if (tratados >= TETO_POR_EXECUCAO) break;

    const termo = termoPorAceite.get(aceite.id) ?? null;
    const precisaGerar = !termo;
    const precisaEnviar = Boolean(aceite.email?.trim()) && (!termo || !termo.enviado_em);
    if (!precisaGerar && !precisaEnviar) continue;
    tratados++;

    let pdf: Buffer | null = null;
    try {
      if (precisaGerar) {
        // o contrato vem antes: o termo cita o contrato anexo pelo nome e
        // pelo SHA-256. Sem o hash que a cliente leu, só entra o modelo que
        // já estava lá antes do aceite (anexarContratoDoAceite decide).
        try {
          await anexarContratoDoAceite(supabase, aceite.id, null);
        } catch (e) {
          console.error(`[eorg:aceites-pendentes] contrato ${aceite.id}:`, e instanceof Error ? e.message : e);
        }
        const r = await gerarEGuardarTermo(supabase, aceite.id);
        if (!r) {
          falhas.push(`termo ${aceite.id}`);
          continue;
        }
        gerados++;
        pdf = r.pdf;
      } else if (termo) {
        pdf = await baixarArquivo(supabase, BALDE_CONTRATOS, termo.storage_path);
      }

      if (precisaEnviar) {
        const e = await enviarTermoParaCliente(supabase, aceite.id, pdf);
        if (e.ok) enviados++;
        else falhas.push(`e-mail ${aceite.id}`);
      }
    } catch (e) {
      // um aceite que explode não pode impedir os outros
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[eorg:aceites-pendentes] ${aceite.id}: ${msg}`);
      falhas.push(`${aceite.id} (${msg.slice(0, 40)})`);
    }
  }

  // 500 quando algo falhou: assim a execução aparece como falha na Vercel
  // e o aviso chega por e-mail, em vez de viver só no Runtime Log.
  if (falhas.length > 0) {
    console.error(`[eorg:aceites-pendentes] ${falhas.length} falharam: ${falhas.join(", ")}`);
    return NextResponse.json(
      { ok: false, lidos: aceites.length, tratados, gerados, enviados, falhas },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    lidos: aceites.length,
    tratados,
    gerados,
    enviados,
    falhas,
  });
}
