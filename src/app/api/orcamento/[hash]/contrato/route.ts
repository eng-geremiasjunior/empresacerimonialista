// "Ler o contrato" na proposta pública.
//
// A cliente declara, na caixa do aceite, que leu o contrato de prestação
// da cerimonialista — então precisa conseguir abrir o arquivo antes de
// assinar. O hash da proposta é a credencial, como na própria página e na
// rota do aceite: quem tem o link lê o contrato daquela proposta.
//
// Qual arquivo abre:
//   - proposta aceita: a cópia anexada ao aceite (a que ela assinou),
//     mesmo que a cerimonialista tenha trocado o modelo depois;
//   - proposta aberta: o modelo vigente (o do tipo, senão o padrão).
//
// O balde é privado: a resposta é um redirecionamento para uma URL
// assinada de poucos minutos. Nenhum caminho de arquivo sai daqui.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BALDE_CONTRATOS, urlParaLerDe } from "@/lib/contratos";
import { contratoParaLer } from "@/lib/orcamento-evento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// amortecedor contra rajada (memória do processo, como na rota do aceite)
const ultimos = new Map<string, number[]>();
const JANELA_MS = 60_000;
const MAX_POR_JANELA = 20;

function demaisTentativas(ip: string): boolean {
  const agora = Date.now();
  const anteriores = (ultimos.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  anteriores.push(agora);
  ultimos.set(ip, anteriores);
  if (ultimos.size > 5000) ultimos.clear();
  return anteriores.length > MAX_POR_JANELA;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i, x) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

const naoEncontrado = () =>
  new NextResponse("Contrato não encontrado.", {
    status: 404,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "desconhecido";
  if (demaisTentativas(ip)) {
    return new NextResponse("Muitas tentativas. Aguarde um minuto.", { status: 429 });
  }
  if (!/^[0-9a-f]{16,128}$/i.test(params.hash)) return naoEncontrado();

  const supabase = admin();
  if (!supabase) return new NextResponse("Indisponível agora.", { status: 503 });

  const { data } = await supabase
    .from("orcamentos")
    .select("id, empresa_id, tipo_evento, status")
    .eq("hash_publico", params.hash)
    .maybeSingle();
  const orcamento = data as {
    id: string;
    empresa_id: string;
    tipo_evento: string;
    status: string;
  } | null;
  if (!orcamento) return naoEncontrado();

  const caminho = await contratoParaLer(supabase, orcamento);
  if (!caminho) return naoEncontrado();

  const url = await urlParaLerDe(supabase, BALDE_CONTRATOS, caminho, 300);
  if (!url) return naoEncontrado();

  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}
