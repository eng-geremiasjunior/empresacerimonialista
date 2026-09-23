import "server-only";

// O convite para o portal (173). Até aqui o acesso da cliente nascia à
// mão, com uma senha provisória que a cerimonialista precisava repassar —
// e o portal foi aberto UMA vez em 30 dias. Agora:
//   * quando a cliente aceita a proposta, o convite sai sozinho (a
//     cerimonialista desliga em Configurações);
//   * na Área do cliente, "Convidar por e-mail" faz o mesmo com um clique.
// O e-mail sai em nome da empresa dela e a resposta cai na caixa dela;
// o link leva a cliente a CRIAR a própria senha.

import { createClient } from "@supabase/supabase-js";
import { criarAcessoPortal, linkParaCriarSenha, type PapelPortal } from "@/lib/portal-admin";
import { enviarViaResend } from "@/lib/email";
import { publicBase } from "@/lib/app-url";
import { rotuloEventoPossessivo } from "@/lib/papel";

function servico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

function escapar(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type ResultadoConvite =
  | { ok: true; para: string; textoWhatsapp: string }
  | { ok: false; motivo: string };

/**
 * Convida a cliente do evento. `automatico` = veio do aceite: respeita a
 * configuração da empresa e não repete convite já enviado.
 */
export async function convidarClienteDoEvento(
  eventId: string,
  opcoes: { automatico: boolean; email?: string | null; nome?: string | null; papel?: PapelPortal; criadoPor?: string | null }
): Promise<ResultadoConvite> {
  const db = servico();
  if (!db) return { ok: false, motivo: "configuração do servidor incompleta" };

  const { data: ev } = await db
    .from("events")
    .select("id, type, name, empresa_id, client_id, clients(name, email), empresas(nome, convidar_portal_no_aceite)")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev) return { ok: false, motivo: "evento não encontrado" };

  const evento = ev as unknown as {
    id: string;
    type: string;
    name: string | null;
    empresa_id: string;
    client_id: string | null;
    clients: { name: string | null; email: string | null } | null;
    empresas: { nome: string | null; convidar_portal_no_aceite: boolean | null } | null;
  };

  if (opcoes.automatico && evento.empresas?.convidar_portal_no_aceite === false) {
    return { ok: false, motivo: "convite automático desligado" };
  }

  const email = (opcoes.email ?? evento.clients?.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, motivo: "A cliente não tem e-mail cadastrado." };
  }
  const nome = (opcoes.nome ?? evento.clients?.name ?? "").trim() || email.split("@")[0];

  if (opcoes.automatico) {
    const { data: ja } = await db
      .from("evento_acesso")
      .select("id")
      .eq("event_id", eventId)
      .eq("email", email)
      .not("convite_enviado_em", "is", null)
      .maybeSingle();
    if (ja) return { ok: false, motivo: "convite já enviado" };
  }

  const acesso = await criarAcessoPortal({
    eventId,
    empresaId: evento.empresa_id,
    nome,
    email,
    papel: opcoes.papel ?? "outro",
    clientId: evento.client_id,
    criadoPor: opcoes.criadoPor ?? null,
  });
  if ("error" in acesso) return { ok: false, motivo: acesso.error };

  const base = publicBase();
  // quem já é da equipe entra com a senha de sempre
  const link = acesso.ehEquipe ? `${base}/portal` : await linkParaCriarSenha(email, base);
  if (!link) return { ok: false, motivo: "Não foi possível gerar o link agora." };

  // a resposta vai para a dona da empresa
  const { data: dona } = await db
    .from("membros_equipe")
    .select("email")
    .eq("empresa_id", evento.empresa_id)
    .eq("is_owner", true)
    .maybeSingle();

  const empresa = evento.empresas?.nome?.trim() || "Sua cerimonialista";
  const primeiro = nome.split(/\s+/)[0];
  const doEvento = rotuloEventoPossessivo(evento.type);
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#17162A">
      <p style="font-size:15px">Olá, ${escapar(primeiro)}!</p>
      <p style="font-size:15px;line-height:1.6">
        A <strong>${escapar(empresa)}</strong> preparou o portal do ${escapar(doEvento)}.
        Nele você acompanha o que está sendo cuidado, responde o que for preciso e organiza a lista de convidados.
      </p>
      <p style="margin:28px 0">
        <a href="${link}"
           style="background:#17162A;color:#fff;padding:12px 22px;border-radius:9px;text-decoration:none;font-weight:600;display:inline-block">
          ${acesso.ehEquipe ? "Abrir o portal" : "Criar minha senha e entrar"}
        </a>
      </p>
      <p style="font-size:12px;color:#6B6884;line-height:1.5">
        O botão funciona uma vez. Se ele expirar, entre em ${escapar(base.replace(/^https?:\/\//, ""))}/portal
        e use “Esqueci minha senha” com este e-mail.
      </p>
    </div>
  `;

  const envio = await enviarViaResend({
    tipo: "convite_portal",
    to: email,
    subject: `${empresa}: o portal do ${doEvento}`,
    html,
    fromNome: empresa,
    replyTo: (dona?.email as string | null) ?? null,
    tags: [{ name: "finalidade", value: "convite_portal" }],
  });
  if (!envio.ok) return { ok: false, motivo: envio.error };

  await db
    .from("evento_acesso")
    .update({ convite_enviado_em: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("email", email);

  return {
    ok: true,
    para: email,
    textoWhatsapp:
      `Oi, ${primeiro}! Mandei no seu e-mail (${email}) o acesso ao portal do ${doEvento}: ` +
      `é só criar a sua senha pelo botão. Qualquer coisa, me chama aqui.`,
  };
}
