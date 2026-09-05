// A porta da recepção fala com o banco por aqui — e SÓ por aqui.
//
// Nenhuma função da porta tem grant para anon nem para authenticated
// (148, decisão 5): todas são service_role. Se a RPC fosse aberta ao
// anônimo, qualquer um chamava o banco direto e o limitador desta rota
// virava decoração — a doutrina da 120, repetida aqui.
//
// O hash do posto na URL é a credencial. Quem tem o link e o posto está
// vivo e na janela (véspera → dia seguinte) opera a porta; fora disso o
// banco levanta posto_invalido/revogado/fora_da_janela e esta rota
// responde 403 com o nome curto — nunca a mensagem crua do Postgres.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CODIGO6, HEX64, UUID, type AcaoRecepcao } from "@/lib/recepcao";

export const dynamic = "force-dynamic";

// Memória do processo: some no deploy, e é de propósito — amortecedor
// contra rajada, não contador de verdade. O teto é alto porque recepção
// de 200 pessoas tem rajada LEGÍTIMA: a fila offline esvaziando de uma
// vez, três operadoras no mesmo Wi-Fi da casa de festas.
const ultimos = new Map<string, number[]>();
const JANELA_MS = 60_000;
const MAX_POR_JANELA = 60;

function demaisTentativas(ip: string): boolean {
  const agora = Date.now();
  const anteriores = (ultimos.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  anteriores.push(agora);
  ultimos.set(ip, anteriores);
  if (ultimos.size > 5000) ultimos.clear(); // teto de memória
  return anteriores.length > MAX_POR_JANELA;
}

// As exceções que o banco levanta e o que cada uma significa para quem
// está na porta. 403 = o POSTO não vale mais (a tela vira "link
// inativo" e a fila esvazia); 400 = este PEDIDO não vale (o item da fila
// é descartado e a vida segue).
const ERROS_DE_POSTO = ["posto_invalido", "posto_revogado", "posto_fora_da_janela"];
const ERROS_DO_PEDIDO = [
  "convidado_de_outro_evento",
  "teto_de_avulsos",
  "teto_de_convidados",
  "nome_invalido",
];

function respostaDeErro(mensagem: string | undefined) {
  const m = mensagem ?? "";
  const posto = ERROS_DE_POSTO.find((e) => m.includes(e));
  if (posto) return NextResponse.json({ erro: posto }, { status: 403 });
  const pedido = ERROS_DO_PEDIDO.find((e) => m.includes(e));
  if (pedido) return NextResponse.json({ erro: pedido }, { status: 400 });
  return NextResponse.json({ erro: "falhou" }, { status: 500 });
}

function invalido(campo: string) {
  return NextResponse.json({ erro: "pedido_invalido", campo }, { status: 400 });
}

// --- validação de formato: nada chega à RPC sem ter a cara certa ---
function ehUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

function textoCurto(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function inteiro(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isInteger(v)) return null;
  return v < min || v > max ? null : v;
}

function dataIso(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 40) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

const ACOES: AcaoRecepcao[] = ["lista", "consultar", "marcar", "desfazer", "avulso"];

export async function POST(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "desconhecido";

  if (demaisTentativas(ip)) {
    return NextResponse.json({ erro: "muitas_tentativas" }, { status: 429 });
  }

  // O posto é sempre minúsculo no banco; a URL pode vir de um teclado
  // que capitalizou. Formato errado nem chega ao banco.
  const postoHash = params.hash.toLowerCase();
  if (!HEX64.test(postoHash)) {
    return NextResponse.json({ erro: "posto_invalido" }, { status: 403 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo_invalido" }, { status: 400 });
  }
  const acao = corpo.acao;
  if (typeof acao !== "string" || !ACOES.includes(acao as AcaoRecepcao)) {
    return invalido("acao");
  }

  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) {
    console.error("[eorganizei:recepcao] SUPABASE_SERVICE_ROLE_KEY ausente");
    return NextResponse.json({ erro: "indisponivel" }, { status: 503 });
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false },
    global: {
      // Next cacheia fetch GET em route handler; nunca aqui.
      fetch: (i, x) => fetch(i, { ...x, cache: "no-store" }),
    },
  });

  // O nome de quem está operando vai no livro (auditoria), limitado como
  // o banco limita (60). É o nome da operadora, não de convidado.
  const operador = textoCurto(corpo.operador, 60);

  switch (acao as AcaoRecepcao) {
    case "lista": {
      const { data, error } = await supabase.rpc("recepcao_lista", {
        p_posto_hash: postoHash,
      });
      if (error) return respostaDeErro(error.message);
      return NextResponse.json(data);
    }

    case "consultar": {
      // 6 caracteres digitados ou o hash inteiro lido do QR; qualquer
      // outra coisa não tem o que consultar.
      const bruto = typeof corpo.codigo === "string" ? corpo.codigo.trim() : "";
      const codigo = bruto.toLowerCase();
      if (!CODIGO6.test(codigo) && !HEX64.test(codigo)) return invalido("codigo");
      const { data, error } = await supabase.rpc("recepcao_consultar", {
        p_posto_hash: postoHash,
        p_codigo: codigo,
      });
      if (error) return respostaDeErro(error.message);
      return NextResponse.json(data);
    }

    case "marcar": {
      if (!ehUuid(corpo.convidadoId)) return invalido("convidadoId");
      const acompanhantes = Array.isArray(corpo.acompanhantes) ? corpo.acompanhantes : [];
      if (acompanhantes.length > 40 || !acompanhantes.every(ehUuid)) {
        return invalido("acompanhantes");
      }
      // null = "confie na contagem do banco" (a via vira 'qr'); número =
      // a porta ajustou ou marcou pela busca (a via vira 'busca').
      let semNome: number | null = null;
      if (corpo.semNome !== undefined && corpo.semNome !== null) {
        semNome = inteiro(corpo.semNome, 0, 40);
        if (semNome === null) return invalido("semNome");
      }
      let em: string | null = null;
      if (corpo.em !== undefined && corpo.em !== null) {
        em = dataIso(corpo.em);
        if (!em) return invalido("em");
      }
      // false = só os acompanhantes listados entram; o titular ainda não
      // chegou. Ausente = true, como o banco.
      let titular = true;
      if (corpo.titular !== undefined && corpo.titular !== null) {
        if (typeof corpo.titular !== "boolean") return invalido("titular");
        titular = corpo.titular;
      }
      // sem o titular e sem ninguém da lista não há o que marcar
      if (!titular && acompanhantes.length === 0) return invalido("acompanhantes");
      const { data, error } = await supabase.rpc("recepcao_marcar", {
        p_posto_hash: postoHash,
        p_convidado_id: corpo.convidadoId,
        p_acompanhantes: acompanhantes,
        p_sem_nome: semNome,
        p_operador: operador,
        p_em: em,
        p_titular: titular,
      });
      if (error) return respostaDeErro(error.message);
      return NextResponse.json(data);
    }

    case "desfazer": {
      if (!ehUuid(corpo.convidadoId)) return invalido("convidadoId");
      const acompanhanteId =
        corpo.acompanhanteId === undefined || corpo.acompanhanteId === null
          ? null
          : corpo.acompanhanteId;
      if (acompanhanteId !== null && !ehUuid(acompanhanteId)) {
        return invalido("acompanhanteId");
      }
      const { data, error } = await supabase.rpc("recepcao_desfazer", {
        p_posto_hash: postoHash,
        p_convidado_id: corpo.convidadoId,
        p_acompanhante_id: acompanhanteId,
        p_operador: operador,
      });
      if (error) return respostaDeErro(error.message);
      return NextResponse.json(data);
    }

    case "avulso": {
      const nome = textoCurto(corpo.nome, 120);
      if (!nome || nome.length < 2) return invalido("nome");
      const pessoas = corpo.pessoas === undefined ? 1 : inteiro(corpo.pessoas, 1, 21);
      if (pessoas === null) return invalido("pessoas");
      const { data, error } = await supabase.rpc("recepcao_avulso", {
        p_posto_hash: postoHash,
        p_nome: nome,
        p_pessoas: pessoas,
        p_operador: operador,
      });
      if (error) return respostaDeErro(error.message);
      return NextResponse.json(data);
    }
  }
}
