import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Marca } from "@/components/marca/Marca";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";

// A página que o QR do termo de aceite abre: /aceite/<recibo>?v=<12 hex>.
//
// Pública, sem login — quem tem o PDF na mão (a cliente, a
// cerimonialista, um advogado daqui a dois anos) aponta a câmera e vê
// que o documento existe, de quem é e que não mudou. O que aparece é só
// o que prova: empresa, tipo, data, primeiro nome, quantos assinaram e
// os hashes. Nunca CPF, valor, e-mail nem a assinatura — a RPC nem os
// devolve (162, item 8).
//
// O verificador `v` são os 12 primeiros hex do hash do conteúdo. Sem
// ele, o recibo de 6 hex seria força bruta viável; com ele, qualquer
// endereço que não case volta nulo — e esta tela nem consulta o banco
// quando o formato já está errado.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verificação do aceite",
  // é o comprovante de um contrato entre duas pessoas: fora do índice
  robots: { index: false, follow: false },
};

type AceitePublico = {
  valido: boolean;
  empresa: string | null;
  tipo_evento: string | null;
  aceito_em: string | null;
  primeiro_nome: string | null;
  assinantes: number | null;
  sha256_conteudo: string | null;
  sha256_pdf: string | null;
};

const FUSO = "America/Sao_Paulo";

/** "14/09/2026 às 10:32", em Brasília — o servidor roda em UTC. */
function quandoBR(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const data = d.toLocaleDateString("pt-BR", { timeZone: FUSO });
  const hora = d.toLocaleTimeString("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${data} às ${hora}`;
}

export default async function VerificarAceitePage({
  params,
  searchParams,
}: {
  params: { recibo: string };
  searchParams: { [chave: string]: string | string[] | undefined };
}) {
  const recibo = decodeURIComponent(params.recibo).trim().toUpperCase();
  const v = (typeof searchParams.v === "string" ? searchParams.v : "")
    .trim()
    .toLowerCase();

  let aceite: AceitePublico | null = null;
  // Só o formato: recibo "XX-A1B2C3" e verificador de 12 hex. Fora
  // disso a resposta é a mesma de um recibo inexistente — sem consulta.
  if (/^[0-9a-f]{12}$/.test(v) && /^[A-Z0-9-]{3,20}$/.test(recibo)) {
    const { data } = await createClient().rpc("consultar_aceite_publico", {
      p_recibo: recibo,
      p_verificador: v,
    });
    const d = (data as AceitePublico | null) ?? null;
    aceite = d && d.valido === true ? d : null;
  }

  const tipo = aceite?.tipo_evento
    ? (EVENT_TYPE_LABELS[aceite.tipo_evento as EventType] ?? aceite.tipo_evento)
    : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-10">
      <div className="mb-10">
        <Marca tamanho={18} />
      </div>

      {aceite ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Aceite válido
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-snug text-stone-900">
            Proposta{tipo ? ` de ${tipo}` : ""} aceita
            {aceite.primeiro_nome ? ` por ${aceite.primeiro_nome}` : ""}
          </h1>
          <p className="mt-1 text-stone-600">
            {[aceite.empresa ? `Emitida por ${aceite.empresa}` : "", quandoBR(aceite.aceito_em)]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="text-xs text-stone-500">Recibo</dt>
              <dd className="font-mono text-stone-900">{recibo}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Assinaturas</dt>
              <dd className="text-stone-900">
                {aceite.assinantes === 2 ? "Duas pessoas assinaram" : "Uma pessoa assinou"}
              </dd>
            </div>
            {aceite.sha256_conteudo && (
              <div>
                <dt className="text-xs text-stone-500">Hash do conteúdo (SHA-256)</dt>
                <dd className="break-all font-mono text-xs text-stone-900">
                  {aceite.sha256_conteudo}
                </dd>
              </div>
            )}
            {aceite.sha256_pdf && (
              <div>
                <dt className="text-xs text-stone-500">Hash do termo em PDF (SHA-256)</dt>
                <dd className="break-all font-mono text-xs text-stone-900">
                  {aceite.sha256_pdf}
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-10 text-sm leading-relaxed text-stone-500">
            Este registro confirma que a proposta foi aceita eletronicamente. Os
            valores e dados pessoais ficam apenas com as partes.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold leading-snug text-stone-900">
            Não encontramos um aceite com este código.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Confira o link ou aponte a câmera de novo para o código QR do termo — o
            endereço precisa vir inteiro, com o verificador.
          </p>
        </>
      )}
    </main>
  );
}
