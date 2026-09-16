"use server";

// A página pública: o conteúdo, o endereço e a publicação.
//
// Tudo passa pela sessão da proprietária, e quem decide é o banco: a RLS
// da 165 só deixa a dona ler e escrever `empresa_pagina`, e o gatilho
// valida o que entra (telefone, tipos, serviços, o gate de publicação).
// O endereço vai por função própria porque tem história e reservados; o
// gatilho descarta qualquer endereço gravado por outro caminho.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LIMITES,
  erroDoSlug,
  faltaParaPublicar,
  normalizarInstagram,
  type PaginaEditavel,
} from "@/lib/comercial/pagina-publica";
import { normalizarWhatsapp, whatsappValido } from "@/lib/comercial/pedidos";
import { EVENT_TYPE_LABELS } from "@/lib/types";

type Resultado = { ok: true } | { error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function daDona() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.rpc("meu_cargo");
  const linha = (data as { empresa_id: string; cargo: string }[] | null)?.[0];
  if (!linha || linha.cargo !== "proprietaria") return null;
  return { supabase, userId: user.id, empresaId: linha.empresa_id };
}

function comMaiuscula(frase: string): string {
  const f = frase.trim().replace(/\.$/, "");
  return f.charAt(0).toUpperCase() + f.slice(1) + ".";
}

/**
 * Os `raise exception` da 165 já são frases em português para ela. O que
 * não for um deles é erro técnico: vai para o log (só a mensagem do
 * banco, que aqui não carrega dado de ninguém) e a tela recebe a frase
 * genérica.
 */
const FRASES_DO_BANCO = [
  "WhatsApp inválido",
  "Instagram inválido",
  "tipo de evento inválido",
  "tipos de evento demais",
  "até 6 serviços",
  "todo serviço precisa",
  "serviço com texto longo",
  "até 3 motivos",
  "motivo longo demais",
  "antes de publicar",
];

function fraseDoBanco(mensagem: string | undefined, padrao: string): string {
  if (mensagem && FRASES_DO_BANCO.some((f) => mensagem.includes(f))) {
    return comMaiuscula(mensagem);
  }
  console.error("[eorg:pagina]", (mensagem ?? "sem mensagem").slice(0, 160));
  return padrao;
}

/** O conteúdo da página. Não mexe no endereço nem na publicação. */
export async function salvarPagina(dados: PaginaEditavel): Promise<Resultado> {
  const ctx = await daDona();
  if (!ctx) return { error: "Só a proprietária edita a vitrine." };

  const texto = (v: string | null | undefined, max: number) => {
    const t = (v ?? "").trim();
    return t ? t.slice(0, max) : null;
  };

  const whatsappCru = dados.whatsapp?.trim() || null;
  if (whatsappCru && !whatsappValido(whatsappCru)) {
    return { error: "Confira o WhatsApp: DDD e número." };
  }
  const instagramCru = dados.instagram?.trim() || null;
  const instagram = normalizarInstagram(instagramCru);
  if (instagramCru && !instagram) {
    return { error: "Confira o Instagram: só o nome do perfil." };
  }

  const tipos = Array.from(new Set(dados.tiposAtendidos)).filter(
    (t) => t in EVENT_TYPE_LABELS
  );
  const servicos = dados.servicos
    .map((s) => ({
      nome: (s.nome ?? "").trim().slice(0, LIMITES.servicoNome),
      descricao: (s.descricao ?? "").trim().slice(0, LIMITES.servicoDescricao) || null,
    }))
    .filter((s) => s.nome)
    .slice(0, LIMITES.servicos);
  const motivos = dados.motivos
    .map((m) => m.trim().slice(0, LIMITES.motivo))
    .filter(Boolean)
    .slice(0, LIMITES.motivos);

  const { error } = await ctx.supabase.from("empresa_pagina").upsert(
    {
      empresa_id: ctx.empresaId,
      titulo: texto(dados.titulo, LIMITES.titulo),
      posicionamento: texto(dados.posicionamento, LIMITES.posicionamento),
      para_quem: texto(dados.paraQuem, LIMITES.paraQuem),
      cidade: texto(dados.cidade, LIMITES.cidade),
      tipos_atendidos: tipos,
      servicos,
      motivos,
      whatsapp: whatsappCru ? normalizarWhatsapp(whatsappCru) : null,
      instagram,
      atualizado_por: ctx.userId,
    },
    { onConflict: "empresa_id" }
  );

  if (error) {
    // Com a página no ar, o gate do banco recusa tirar o que ela precisa
    // para funcionar. A frase dele fala em "publicar"; aqui a página já
    // está publicada, então a frase muda.
    if (error.message?.includes("antes de publicar")) {
      return {
        error: comMaiuscula(
          "a vitrine está no ar: " + error.message.replace(" antes de publicar", "")
        ),
      };
    }
    return { error: fraseDoBanco(error.message, "Não foi possível salvar a vitrine.") };
  }

  revalidatePath("/orcamentos/pagina");
  return { ok: true };
}

/** Define ou troca o endereço. O anterior continua levando ao novo. */
export async function definirEndereco(
  slug: string
): Promise<{ ok: true; slug: string } | { error: string }> {
  const ctx = await daDona();
  if (!ctx) return { error: "Só a proprietária define o endereço da vitrine." };

  const s = slug.trim().toLowerCase();
  const erro = erroDoSlug(s);
  if (erro) return { error: erro };

  const { data, error } = await ctx.supabase.rpc("definir_slug_pagina", { p_slug: s });
  if (error) {
    if (error.message?.includes("acabou de ser usado")) {
      return { error: "Este endereço acabou de ser usado. Tente outro." };
    }
    console.error("[eorg:pagina] endereço:", error.code, (error.message ?? "").slice(0, 120));
    return { error: "Não foi possível salvar o endereço." };
  }

  const r = data as { ok?: boolean; slug?: string; error?: string } | null;
  if (r?.error) return { error: comMaiuscula(r.error) };
  if (!r?.ok || !r.slug) return { error: "Não foi possível salvar o endereço." };

  revalidatePath("/orcamentos/pagina");
  return { ok: true, slug: r.slug };
}

/**
 * Publica o que está SALVO. A lista do que falta vem inteira daqui (o
 * gatilho do banco só diz o primeiro problema); o gatilho continua sendo
 * a trava que vale para quem chamar a API direto.
 */
export async function publicarPagina(): Promise<Resultado> {
  const ctx = await daDona();
  if (!ctx) return { error: "Só a proprietária publica a vitrine." };

  const { data: pag } = await ctx.supabase
    .from("empresa_pagina")
    .select("slug, whatsapp, posicionamento, tipos_atendidos")
    .eq("empresa_id", ctx.empresaId)
    .maybeSingle();

  const falta = faltaParaPublicar({
    slug: (pag?.slug as string | null) ?? null,
    whatsapp: (pag?.whatsapp as string | null) ?? null,
    posicionamento: (pag?.posicionamento as string | null) ?? null,
    tiposAtendidos: (pag?.tipos_atendidos as string[] | null) ?? [],
  });
  if (falta.length > 0) return { error: falta.join(" ") };

  const { data, error } = await ctx.supabase
    .from("empresa_pagina")
    .update({ publicada: true, atualizado_por: ctx.userId })
    .eq("empresa_id", ctx.empresaId)
    .select("empresa_id");

  if (error) return { error: fraseDoBanco(error.message, "Não foi possível publicar a vitrine.") };
  if (!data || data.length === 0) return { error: "Salve a vitrine antes de publicar." };

  revalidatePath("/orcamentos/pagina");
  return { ok: true };
}

/** Tira do ar. O endereço continua dela; quem abrir o link vê "página não encontrada". */
export async function despublicarPagina(): Promise<Resultado> {
  const ctx = await daDona();
  if (!ctx) return { error: "Só a proprietária tira a vitrine do ar." };

  const { error } = await ctx.supabase
    .from("empresa_pagina")
    .update({ publicada: false, atualizado_por: ctx.userId })
    .eq("empresa_id", ctx.empresaId);

  if (error) return { error: fraseDoBanco(error.message, "Não foi possível tirar a vitrine do ar.") };
  revalidatePath("/orcamentos/pagina");
  return { ok: true };
}

/**
 * O que vai para a rua: cada foto e cada depoimento é escolha dela (165).
 * Publicar a página não leva nada que não esteja marcado aqui.
 */
export async function marcarNaPagina(
  tipo: "foto" | "depoimento",
  ids: string[],
  valor: boolean
): Promise<Resultado> {
  const ctx = await daDona();
  if (!ctx) return { error: "Só a proprietária escolhe o que aparece na vitrine." };

  const lista = ids.filter((id) => UUID.test(id)).slice(0, 200);
  if (lista.length === 0) return { ok: true };

  const tabela = tipo === "foto" ? "portfolio_fotos" : "empresa_depoimentos";
  const { error } = await ctx.supabase
    .from(tabela)
    .update({ na_pagina: valor })
    .eq("empresa_id", ctx.empresaId)
    .in("id", lista);

  if (error) {
    console.error("[eorg:pagina] marcar:", tipo, error.code, (error.message ?? "").slice(0, 120));
    return { error: "Não foi possível salvar a escolha. Tente de novo." };
  }
  revalidatePath("/orcamentos/pagina");
  return { ok: true };
}
