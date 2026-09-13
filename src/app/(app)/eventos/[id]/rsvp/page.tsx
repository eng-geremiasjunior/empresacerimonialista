import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicBase } from "@/lib/app-url";
import { tem, rotuloPublico } from "@/lib/capacidades";
import { getConvidados, resumirConvidados } from "@/lib/supabase/portal-pessoas";
import { lerPainel } from "@/app/(app)/eventos/[id]/recepcao-actions";
import { qrSvg } from "@/lib/qr";
import { paraFormatoMeta } from "@/lib/whatsapp";
import { RsvpDoEvento, type ConvidadoNaAba } from "@/components/rsvp/RsvpDoEvento";
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
export default async function RsvpPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const supabase = createClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, type, name, date, rsvp_hash, rsvp_aberto, clients(name)")
    .eq("id", eventId)
    .maybeSingle();

  if (!ev) notFound();
  // Sumir do menu não basta: o endereço digitado à mão abriria a lista
  // nominal para um show de 5.000 pessoas — a escala em que ela não se
  // sustenta. Mesma trava do portal.
  if (!tem(ev.type, "listaNominal")) notFound();

  const [convidados, painel, chegou] = await Promise.all([
    getConvidados(eventId),
    lerPainel(eventId),
    // Quem já passou pela porta. Leitura à parte, e não um campo a mais em
    // getConvidados: aquela função serve o portal da cliente, e o tipo
    // dela não precisa carregar o que só a cerimonialista usa no dia.
    supabase.from("evento_convidado").select("id, presente_em").eq("event_id", eventId),
  ]);
  const entrouEm = new Map(
    ((chegou.data ?? []) as { id: string; presente_em: string | null }[]).map((c) => [c.id, c.presente_em])
  );

  const base = publicBase();
  const cliente = (ev.clients as unknown as { name?: string } | null)?.name ?? null;
  const nomeDoEvento = ev.name || cliente || "o evento";

  // O link do WhatsApp de cada convidado é montado AQUI, no servidor, e
  // desce pronto. Dois motivos: `paraFormatoMeta` mora num módulo que é
  // só de servidor (ele guarda o token da Meta), e a mensagem precisa do
  // endereço público, que também é resolvido aqui.
  //
  // Isto NÃO usa a API da Meta — abre o WhatsApp DA PRÓPRIA cerimonialista
  // com a mensagem escrita, e ela aperta enviar. Não custa nada por
  // mensagem, não precisa de template aprovado nem de consentimento
  // prévio: é ela falando com a pessoa, do número dela. É a ponte até o
  // RSVP pela API existir.
  const lista: ConvidadoNaAba[] = convidados.map((c) => {
    const link = `${base}/confirmar/${c.hash}`;
    const telefone = c.telefone ? paraFormatoMeta(c.telefone) : null;
    // Quem já confirmou recebe o QR; quem não, o pedido de confirmação.
    // O mesmo link serve aos dois: a página mostra o formulário para
    // quem está aguardando e o QR de entrada para quem confirmou.
    const texto =
      c.confirmacao === "confirmado"
        ? `Olá, ${c.nome}! Este é o seu acesso de entrada para ${nomeDoEvento}. Apresente o QR Code na recepção: ${link}`
        : `Olá, ${c.nome}! Confirme sua presença em ${nomeDoEvento} por este link: ${link}`;
    return {
      id: c.id,
      nome: c.nome,
      grupo: c.grupo,
      confirmacao: c.confirmacao,
      acompanhantes: c.acompanhantes,
      criancas: c.criancas,
      restricaoAlimentar: c.restricaoAlimentar,
      origem: c.origem,
      entrouEm: entrouEm.get(c.id) ?? null,
      link,
      whatsapp: telefone
        ? `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`
        : null,
    };
  });

  // A porta: o mesmo bloco do Modo Evento, com o QR de cada posto vivo
  // desenhado no servidor. Nulo quando a 148 não está no banco — o resto
  // da aba segue.
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
    <RsvpDoEvento
      eventId={eventId}
      tipo={ev.type}
      publico={rotuloPublico(ev.type)}
      dataEvento={ev.date}
      resumo={resumirConvidados(convidados)}
      nomeDoEvento={nomeDoEvento}
      linkDoEvento={ev.rsvp_hash ? `${base}/confirmar/evento/${ev.rsvp_hash}` : null}
      confirmacoesAbertas={ev.rsvp_aberto !== false}
      convidados={lista}
      chegadas={chegadas}
    />
  );
}
