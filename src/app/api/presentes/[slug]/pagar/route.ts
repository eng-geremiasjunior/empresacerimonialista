import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { eventoEDoCatalogo } from "@/lib/catalogo-vivo";
import { problemaNoConvidado, so, valoresDoPresente } from "@/lib/lista-presentes";
import { criarPedidoPix, emTeste, lerPedido } from "@/lib/pagarme-lista";
import { qrSvg } from "@/lib/qr";
import { hojeBR } from "@/lib/tempo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

// O convidado escolheu um presente da lista (/c/<endereço>/presentes) e
// pede o Pix. Tudo que vale dinheiro sai do BANCO, nunca do navegador: o
// preço, quem paga a taxa, o recebedor da família. O pedido na Pagar.me
// leva o split (a família recebe a parte dela direto; a plataforma, a
// taxa). O CPF e o celular do convidado vão só para a Pagar.me.
//
// Enquanto o Pix vale (20 min), o presente fica reservado: o último item
// de uma quantidade não é pago por duas pessoas — quem gravou depois, na
// mesma corrida, recebe "alguém acabou de escolher".
//
// Os freios valem no banco, não na memória de uma instância:
//   · por pessoa (a origem: um código do IP embaralhado com uma chave do
//     servidor e o dia — o IP em si nunca é gravado): 2 Pix abertos e 6
//     pedidos por hora em cada lista;
//   · por lista, um disjuntor alto (Pix abertos ao mesmo tempo), que só
//     conta o que pode virar dinheiro — tentativa que falhou não trava
//     ninguém.
// O mesmo convidado (e-mail) pedindo de novo o mesmo presente recebe o
// mesmo Pix, enquanto ele vale.

const PIX_VALE_SEGUNDOS = 20 * 60;
const ABERTOS_POR_ORIGEM = 2;
const PEDIDOS_POR_ORIGEM_HORA = 6;
const ABERTOS_POR_LISTA = 80;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,80}$/;

function servico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) },
  });
}

/** A origem do pedido: o IP do dia, embaralhado (não dá para voltar ao IP). */
function origemDo(request: NextRequest): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "?";
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "eorganizei")
    .update(`${ip}|${hojeBR()}`)
    .digest("hex")
    .slice(0, 32);
}

const erro = (mensagem: string, status: number) =>
  NextResponse.json({ ok: false, erro: mensagem }, { status, headers: { "Cache-Control": "no-store" } });

const txt = (v: unknown) => (typeof v === "string" ? v : "");

async function respostaDoPix(id: string, qrCode: string, expiraEm: string, totalCentavos: number) {
  const svg = await qrSvg(qrCode);
  return NextResponse.json(
    {
      ok: true,
      id,
      copiaECola: qrCode,
      qr: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      expiraEm,
      totalCentavos,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  const slug = (params.slug ?? "").toLowerCase();
  if (!SLUG.test(slug)) return erro("Lista não encontrada.", 404);

  const bruto = await request.text();
  if (bruto.length > 4000) return erro("Pedido inválido.", 413);
  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(bruto) as Record<string, unknown>;
  } catch {
    return erro("Pedido inválido.", 400);
  }
  const presenteId = txt(corpo.presenteId);
  const convidado = {
    quem: txt(corpo.quem).trim(),
    email: txt(corpo.email).trim(),
    cpf: txt(corpo.cpf),
    celular: txt(corpo.celular),
    recado: txt(corpo.recado).trim(),
  };
  if (!UUID.test(presenteId)) return erro("Escolha um presente.", 400);
  const problema = problemaNoConvidado(convidado);
  if (problema) return erro(problema, 400);
  const email = convidado.email.toLowerCase();

  const db = servico();

  // a lista: o site no ar, a lista publicada, o presente dela
  const { data: s } = await db.from("site_slugs").select("event_id").eq("slug", slug).maybeSingle();
  const eventId = (s as { event_id?: string } | null)?.event_id;
  if (!eventId) return erro("Lista não encontrada.", 404);
  // o evento de exemplo do catálogo nunca gera Pix de verdade (quem vem pela
  // vitrine só olha); com a chave de TESTE, sim — é nele que a prova roda
  if (!emTeste() && (await eventoEDoCatalogo(eventId))) {
    return erro("Esta lista é um exemplo: o Pix não é gerado.", 409);
  }
  const [{ data: site }, { data: lista }, { data: presente }, { data: recebedor }] = await Promise.all([
    db.from("evento_site").select("publicado").eq("event_id", eventId).maybeSingle(),
    db.from("evento_lista").select("publicada, taxa_do_casal").eq("event_id", eventId).maybeSingle(),
    db
      .from("evento_presente")
      .select("id, titulo, valor_centavos, quantidade, removido")
      .eq("id", presenteId)
      .eq("event_id", eventId)
      .maybeSingle(),
    db.from("evento_recebedor").select("status, pagarme_recipient_id").eq("event_id", eventId).maybeSingle(),
  ]);
  const l = lista as { publicada?: boolean; taxa_do_casal?: boolean } | null;
  const pr = presente as { id: string; titulo: string; valor_centavos: number; quantidade: number; removido: boolean } | null;
  const rc = recebedor as { status?: string; pagarme_recipient_id?: string } | null;
  if (!(site as { publicado?: boolean } | null)?.publicado || !l?.publicada) return erro("Lista não encontrada.", 404);
  if (!pr || pr.removido) return erro("Este presente saiu da lista.", 404);
  if (rc?.status !== "active" || !rc.pagarme_recipient_id) return erro("A lista ainda não recebe presentes.", 409);

  const agoraIso = new Date().toISOString();
  const origem = origemDo(request);

  // o mesmo convidado pedindo de novo o mesmo presente: o mesmo Pix, se ainda vale
  const { data: aberto } = await db
    .from("presente_pagamento")
    .select("id, pagarme_order_id, expira_em, total_centavos")
    .eq("presente_id", pr.id)
    .eq("status", "aguardando")
    .eq("email", email)
    .gt("expira_em", new Date(Date.now() + 2 * 60_000).toISOString())
    .not("pagarme_order_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const a = aberto as { id: string; pagarme_order_id: string; expira_em: string; total_centavos: number } | null;
  if (a) {
    const r = await lerPedido(a.pagarme_order_id);
    const qr = r.ok && r.dados.status === "pending" ? r.dados.charges?.[0]?.last_transaction?.qr_code : null;
    if (qr) return respostaDoPix(a.id, qr, a.expira_em, a.total_centavos);
  }

  // os freios
  const [{ count: daOrigemAbertos }, { count: daOrigemNaHora }, { count: abertosNaLista }] = await Promise.all([
    db
      .from("presente_pagamento")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("origem", origem)
      .eq("status", "aguardando")
      .gt("expira_em", agoraIso),
    db
      .from("presente_pagamento")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("origem", origem)
      .gt("created_at", new Date(Date.now() - 3600_000).toISOString()),
    db
      .from("presente_pagamento")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "aguardando")
      .gt("expira_em", agoraIso),
  ]);
  if ((daOrigemAbertos ?? 0) >= ABERTOS_POR_ORIGEM) {
    return erro("Você já tem Pix esperando pagamento nesta lista. Pague um deles ou espere alguns minutos.", 429);
  }
  if ((daOrigemNaHora ?? 0) >= PEDIDOS_POR_ORIGEM_HORA || (abertosNaLista ?? 0) >= ABERTOS_POR_LISTA) {
    return erro("Muitos pedidos agora. Tente de novo em alguns minutos.", 429);
  }

  const v = valoresDoPresente(pr.valor_centavos, !!l.taxa_do_casal);
  const expiraEm = new Date(Date.now() + PIX_VALE_SEGUNDOS * 1000).toISOString();
  const { data: novo, error: erroNovo } = await db
    .from("presente_pagamento")
    .insert({
      event_id: eventId,
      presente_id: pr.id,
      titulo: pr.titulo.slice(0, 80),
      valor_presente_centavos: pr.valor_centavos,
      taxa_centavos: v.taxa,
      total_centavos: v.total,
      taxa_do_casal: !!l.taxa_do_casal,
      quem: convidado.quem.slice(0, 80),
      recado: convidado.recado ? convidado.recado.slice(0, 500) : null,
      email,
      origem,
      status: "aguardando",
      expira_em: expiraEm,
    })
    .select("id, created_at")
    .single();
  if (erroNovo || !novo) {
    console.error("[eorganizei:lista] pagamento: não gravou", erroNovo?.code ?? "");
    return erro("Não foi possível gerar o Pix agora. Tente de novo em instantes.", 500);
  }
  const pagamentoId = (novo as { id: string }).id;

  // esgotado: pagos + Pix ainda valendo, contados DEPOIS de gravar o meu —
  // na corrida, os dois pedidos se enxergam e só os primeiros da fila
  // (por hora de criação) ficam com o presente
  const { data: fila } = await db
    .from("presente_pagamento")
    .select("id, status, email, created_at")
    .eq("presente_id", pr.id)
    .or(`status.eq.pago,and(status.eq.aguardando,expira_em.gt."${agoraIso}")`)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  // um Pix antigo do MESMO convidado (o que já ia vencer) não segura o novo
  const ordem = ((fila ?? []) as { id: string; status: string; email: string | null }[]).filter(
    (x) => x.id === pagamentoId || x.status === "pago" || x.email !== email
  );
  const pagos = ordem.filter((x) => x.status === "pago").length;
  const naFrente = ordem.filter((x) => x.status === "aguardando").findIndex((x) => x.id === pagamentoId);
  if (naFrente < 0 || pagos + naFrente >= pr.quantidade) {
    await db.from("presente_pagamento").update({ status: "falhou", updated_at: new Date().toISOString() }).eq("id", pagamentoId);
    return erro("Alguém acabou de escolher este presente. Escolha outro.", 409);
  }

  const r = await criarPedidoPix({
    pagamentoId,
    eventoId: eventId,
    titulo: pr.titulo,
    presenteId: pr.id,
    total: v.total,
    familia: v.familia,
    plataforma: v.plataforma,
    recebedorDaFamilia: rc.pagarme_recipient_id,
    convidado: { nome: convidado.quem, email, cpf: so(convidado.cpf), celular: so(convidado.celular) },
    expiraEmSegundos: PIX_VALE_SEGUNDOS,
  });
  const cobranca = r.ok ? r.dados.charges?.[0] : undefined;
  const pix = cobranca?.last_transaction;
  if (!r.ok || !pix?.qr_code) {
    if (r.ok) {
      // o pedido existe mas a cobrança falhou: o estado e a mensagem do
      // gateway (nunca o corpo, que tem o CPF do convidado)
      const motivo = (pix?.gateway_response?.errors ?? []).map((e) => e.message).filter(Boolean).join(" · ");
      console.error("[eorganizei:lista] pedido sem QR", r.dados.status, cobranca?.status ?? "", motivo.slice(0, 160));
    }
    await db.from("presente_pagamento").update({ status: "falhou", updated_at: new Date().toISOString() }).eq("id", pagamentoId);
    return erro("Não foi possível gerar o Pix agora. Tente de novo em instantes.", 502);
  }
  const expira = pix.expires_at ? new Date(pix.expires_at).toISOString() : expiraEm;
  const { error: erroLigar } = await db
    .from("presente_pagamento")
    .update({
      pagarme_order_id: r.dados.id,
      pagarme_charge_id: cobranca?.id ?? null,
      expira_em: expira,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pagamentoId);
  if (erroLigar) {
    // sem o pedido gravado, ninguém confirmaria este Pix: melhor não mostrá-lo
    console.error("[eorganizei:lista] pagamento: pedido não ligado", erroLigar.code ?? "");
    await db.from("presente_pagamento").update({ status: "falhou", updated_at: new Date().toISOString() }).eq("id", pagamentoId);
    return erro("Não foi possível gerar o Pix agora. Tente de novo em instantes.", 502);
  }

  return respostaDoPix(pagamentoId, pix.qr_code, expira, v.total);
}
