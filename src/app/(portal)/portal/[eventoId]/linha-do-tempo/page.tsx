import { notFound } from "next/navigation";
import { getEventoDoPortal, getLinhaDoTempo } from "@/lib/supabase/portal";
import { brl } from "@/components/planejamento/celebra";
import { Divisor, Rotulo } from "@/components/portal/Nucleo";
import { ItemLinhaDoTempo } from "@/components/portal/Linhas";
import { dataCurta } from "@/components/portal/datas";

export const dynamic = "force-dynamic";

// Linha do tempo (handoff §8.5): do mais recente para o mais antigo —
// aceite da proposta, contratações e os compromissos em que vocês
// comparecem. Marcador cheio = aconteceu; vazado = previsto.
export default async function PortalLinhaDoTempoPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const itens = await getLinhaDoTempo(evento.id);
  const agora = new Date().toISOString();

  const descricaoDe = (item: (typeof itens)[number]): string | null => {
    if (item.tipo === "contratacao") {
      const partes = [item.detalhe, item.valor ? brl(item.valor) : null].filter(
        Boolean
      );
      return partes.length ? `${partes.join(", ")}.` : null;
    }
    if (item.tipo === "aceite") {
      return item.detalhe ? `${item.detalhe}.` : null;
    }
    return item.detalhe; // compromisso: o local, quando existe
  };

  const tituloDe = (item: (typeof itens)[number]): string =>
    item.tipo === "contratacao" ? `Decidido: ${item.titulo}` : item.titulo;

  return (
    <>
      <Rotulo>Linha do tempo</Rotulo>
      <h1
        style={{
          margin: "var(--esp-4) 0 0",
          fontFamily: "var(--fonte-titulo)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: "var(--ts-titulo)",
          lineHeight: "var(--el-titulo)",
          color: "var(--cor-texto-principal)",
        }}
      >
        O que já aconteceu
      </h1>

      {itens.length === 0 ? (
        <p
          style={{
            marginTop: "var(--esp-5)",
            maxWidth: 520,
            fontSize: "var(--ts-corpo-p)",
            lineHeight: "var(--el-corpo-p)",
            color: "var(--cor-texto-secundario)",
            textWrap: "pretty",
          }}
        >
          Os passos do seu evento vão aparecer aqui: contratações, escolhas
          suas e os compromissos marcados.
        </p>
      ) : (
        <>
          <Divisor />
          <div>
            {itens.map((item, i) => (
              <ItemLinhaDoTempo
                key={`${item.tipo}-${i}`}
                data={item.quando ? dataCurta(item.quando) : "—"}
                titulo={tituloDe(item)}
                descricao={descricaoDe(item)}
                concluido={item.quando !== null && item.quando <= agora}
                ultimo={i === itens.length - 1}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
