"use server";

// A candidatura de parceira (183). Pública, sem sessão: o servidor valida
// e grava com a chave de serviço. Três defesas contra lixo: o campo
// escondido (robô preenche, gente não vê), o tamanho de cada campo (o
// banco também confere) e três candidaturas por endereço por hora.

import { headers } from "next/headers";
import { ehEnsina, servicoParceiras } from "@/lib/parceiras";

export type ResultadoDaCandidatura = { ok: true } | { ok: false; erro: string };

const limpo = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export async function candidatarParceira(dados: FormData): Promise<ResultadoDaCandidatura> {
  // o campo escondido: quem preencheu não é gente — responde "ok" e não grava
  if (limpo(dados.get("site"), 200)) return { ok: true };

  const nome = limpo(dados.get("nome"), 120);
  const email = limpo(dados.get("email"), 200).toLowerCase();
  const instagram = limpo(dados.get("instagram"), 80).replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/+$/, "");
  const ensina = limpo(dados.get("ensina"), 20);
  const whatsapp = limpo(dados.get("whatsapp"), 30) || null;
  const sobre = limpo(dados.get("sobre"), 600) || null;

  if (nome.length < 2) return { ok: false, erro: "Diga o seu nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: "Confira o e-mail." };
  if (instagram.replace(/^@/, "").length < 2) return { ok: false, erro: "Diga o seu Instagram." };
  if (!ehEnsina(ensina)) return { ok: false, erro: "Escolha o que você ensina." };

  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "desconhecido";

  const db = servicoParceiras();
  const umaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("parceiras")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("criada_em", umaHora);
  if ((count ?? 0) >= 3) return { ok: false, erro: "Recebemos a sua candidatura. Aguarde o nosso contato." };

  const { error } = await db.from("parceiras").insert({
    nome,
    email,
    instagram: instagram.startsWith("@") ? instagram : `@${instagram}`,
    ensina,
    whatsapp,
    sobre,
    ip,
  });
  if (error) {
    console.error("[eorganizei:parceiras] candidatura:", error.code, error.message);
    return { ok: false, erro: "Não foi possível enviar agora. Tente de novo em alguns minutos." };
  }
  return { ok: true };
}
