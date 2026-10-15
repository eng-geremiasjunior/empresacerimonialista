import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicBase } from "@/lib/app-url";
import { tem } from "@/lib/capacidades";
import { getConvidados } from "@/lib/supabase/portal-pessoas";
import { lerPainel } from "@/app/(app)/eventos/[id]/recepcao-actions";
import { qrSvg } from "@/lib/qr";
import { paraFormatoMeta } from "@/lib/whatsapp";
import { RsvpPrograma, type ConvidadoNaFicha } from "@/components/rsvp/RsvpPrograma";
import type { ChegadasProps } from "@/components/operacao/ChegadasAoVivo";

export const dynamic = "force-dynamic";
export const metadata = { title: "RSVP" };

/**
 * A ABA RSVP — a jornada inteira do convidado, num lugar só.
 *
 * Antes ela estava espalhada: a lista morava só no portal da cliente, o
 * link do evento também, e a porta da recepção só abria de dentro do
 * Modo Evento — no dia, e escondida. O dono resumiu o problema: a
 * cerimonialista "não fica na portaria", e ele não quer "algo que precise
 * ficar indo de tela em tela".
 *
 * A ordem da tela é a ordem em que as coisas acontecem:
 *
 *   quantos vão → o link do evento → a lista → a porta → as chegadas
 *
 * A MESMA LISTA DO PORTAL. Nada aqui copia convidado: a cliente e a
 * cerimonialista leem e escrevem `evento_convidado`. Ver actions.ts.
 */
// As colunas da ficha, da mais nova para a mais antiga: sem a 208 (o que
// a equipe já mandou), a leitura degrada em vez de derrubar a aba.
const COLUNAS_DA_FICHA = [
  "id, presente_em, email_confirmacao_enviado_em, entrada_enviada_em, entrada_enviada_via, pedido_enviado_em, pedido_enviado_via",
  "id, presente_em, email_confirmacao_enviado_em",
];

type Extra = {
  id: string;
  presente_em: string | null;
  email_confirmacao_enviado_em: string | null;
  entrada_enviada_em?: string | null;
  entrada_enviada_via?: "whatsapp" | "email" | null;
  pedido_enviado_em?: string | null;
  pedido_enviado_via?: "whatsapp" | "email" | null;
};

/** O telefone como gente lê: (11) 98765-4321. */
function telefoneLegivel(t: string | null): string | null {
  if (!t) return null;
  const d = t.replace(/D/g, "").replace(/^55(?=d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t.trim();
}

export const maxDuration = 60;

export default async function RsvpPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const supabase = createClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, type, name, date, time, rsvp_hash, rsvp_aberto, clients(name)")
    .eq("id", eventId)
    .maybeSingle();

  if (!ev) notFound();
  // Sumir do menu não basta: o endereço digitado à mão abriria a lista
  // nominal para um show de 5.000 pessoas — a escala em que ela não se
  // sustenta. Mesma trava do portal.
  if (!tem(ev.type, "listaNominal")) notFound();

  const lerExtras = async (): Promise<Extra[]> => {
    for (const colunas of COLUNAS_DA_FICHA) {
      const { data, error } = await supabase.from("evento_convidado").select(colunas).eq("event_id", eventId);
      if (!error) return (data ?? []) as unknown as Extra[];
    }
    return [];
  };
  const [convidados, painel, extras] = await Promise.all([getConvidados(eventId), lerPainel(eventId), lerExtras()]);
  const extraDe = new Map(extras.map((x) => [x.id, x]));

  const base = publicBase();
  const cliente = (ev.clients as unknown as { name?: string } | null)?.name ?? null;
  const nomeDoEvento = ev.name || cliente || "o evento";

  // O WhatsApp de cada convidado é montado AQUI, no servidor: a mensagem
  // precisa do endereço público, e `paraFormatoMeta` é só de servidor.
  // Isto NÃO usa a API da Meta — abre o WhatsApp DA PRÓPRIA cerimonialista
  // com a mensagem escrita, e ela aperta enviar.
  const lista: ConvidadoNaFicha[] = convidados.map((c) => {
    const link = `${base}/confirmar/${c.hash}`;
    const telefone = c.telefone ? paraFormatoMeta(c.telefone) : null;
    const x = extraDe.get(c.id);
    const wa = (texto: string) => (telefone ? `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}` : null);
    // A entrada (o QR): quem confirmou pelo próprio link já viu; quem
    // recebeu o e-mail de confirmação tem o link; o resto, só se a equipe
    // mandou.
    const entrada: ConvidadoNaFicha["entrada"] = x?.presente_em
      ? { estado: "entrou", em: x.presente_em }
      : x?.entrada_enviada_em
        ? { estado: x.entrada_enviada_via === "email" ? "email" : "whatsapp", em: x.entrada_enviada_em }
        : c.confirmadoVia === "link" || c.origem === "autocadastro"
          ? { estado: "viu", em: null }
          : x?.email_confirmacao_enviado_em
            ? { estado: "email", em: x.email_confirmacao_enviado_em }
            : { estado: "sem", em: null };
    return {
      id: c.id,
      nome: c.nome,
      grupo: c.grupo,
      lado: c.lado,
      confirmacao: c.confirmacao,
      acompanhantes: c.acompanhantes,
      criancas: c.criancas,
      restricao: c.restricaoAlimentar,
      origem: c.origem,
      telefone: telefoneLegivel(c.telefone),
      email: c.email,
      link,
      whatsEntrada: wa(`Olá, ${c.nome}! Este é o seu acesso de entrada para ${nomeDoEvento}. Apresente o QR Code na recepção: ${link}`),
      whatsPedido: wa(`Olá, ${c.nome}! Confirme sua presença em ${nomeDoEvento} por este link: ${link}`),
      entrada,
      pedido: x?.pedido_enviado_em ? { via: x.pedido_enviado_via ?? "whatsapp", em: x.pedido_enviado_em } : null,
    };
  });

  // A porta: o QR de cada posto vivo desenhado no servidor. Nulo quando a
  // 148 não está no banco — o resto da aba segue.
  let chegadas: ChegadasProps | null = null;
  if (painel) {
    const linkBase = `${base}/recepcao/`;
    const vivos = painel.postos.filter((p) => p.revogado_em === null);
    const svgs = await Promise.all(vivos.map((p) => qrSvg(`${linkBase}${p.hash}`)));
    const qrPorPosto: Record<string, string> = {};
    vivos.forEach((p, i) => {
      qrPorPosto[p.id] = svgs[i];
    });
    chegadas = { eventId, painel, qrPorPosto, linkBase, dataEvento: ev.date };
  }

  return (
    <RsvpPrograma
      eventId={eventId}
      nomeDoEvento={nomeDoEvento}
      dataEvento={ev.date}
      horaEvento={(ev.time as string | null) ?? null}
      linkDoEvento={ev.rsvp_hash ? `${base}/confirmar/evento/${ev.rsvp_hash}` : null}
      confirmacoesAbertas={ev.rsvp_aberto !== false}
      convidados={lista}
      chegadas={chegadas}
    />
  );
}
