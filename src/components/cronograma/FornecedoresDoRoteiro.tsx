"use client";

// Os fornecedores ao lado do roteiro (04/10/2026). Antes do dia, a coluna
// do lado mostrava "Progresso do dia 0%" e "Nenhum alerta" — números que só
// existem no dia. O que a cerimonialista precisa saber semanas antes é
// outra coisa: quem já recebeu o roteiro e quem confirmou. A conta mais
// ativa marcou 10 de 11 fornecedores como confirmados, um por um, numa
// aba que fica três cliques longe daqui.
//
// "Mandar o roteiro para todos": cada fornecedor com o seu link (ele vê
// só os itens dele) já escrito na mensagem do WhatsApp. O navegador não
// abre cinco conversas de uma vez, então é um toque por fornecedor, na
// mesma lista, e a linha marca "enviado". O "enviado" fica neste
// aparelho (localStorage): é lembrete de quem já foi, não registro.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Send } from "lucide-react";
import { setSupplierConfirmed } from "@/app/(app)/eventos/[id]/fornecedores/actions";
import { linkCompartilharWhatsapp, linkWhatsapp } from "@/lib/whatsapp-link";

export type FornecedorDoRoteiro = {
  supplierId: string;
  nome: string;
  hash: string;
  telefone: string | null;
  confirmado: boolean;
  /** quantos horários do roteiro são dele */
  itens: number;
};

const CHAVE = (eventId: string) => `eorganizei:roteiro-enviado:${eventId}`;

function lerEnviados(eventId: string): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE(eventId)) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function dataCurta(iso: string) {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

export function FornecedoresDoRoteiro({
  eventId,
  fornecedores,
  base,
  eventoNome,
  data,
}: {
  eventId: string;
  fornecedores: FornecedorDoRoteiro[];
  base: string;
  eventoNome: string;
  /** yyyy-MM-dd do evento */
  data: string;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [mandando, setMandando] = useState(false);
  const [enviados, setEnviados] = useState<Record<string, string>>({});
  const [confirmados, setConfirmados] = useState(
    () => new Set(fornecedores.filter((f) => f.confirmado).map((f) => f.supplierId))
  );
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => setEnviados(lerEnviados(eventId)), [eventId]);
  useEffect(
    () => setConfirmados(new Set(fornecedores.filter((f) => f.confirmado).map((f) => f.supplierId))),
    [fornecedores]
  );

  if (fornecedores.length === 0) return null;

  const url = (f: FornecedorDoRoteiro) => `${base}/eventos/${eventId}/roteiro/publico/${f.hash}`;
  const texto = (f: FornecedorDoRoteiro) =>
    `Olá! Segue o roteiro do evento ${eventoNome} (${dataCurta(data)}), com os horários de ${f.nome}. ` +
    `Se algo mudar, a página se atualiza sozinha: ${url(f)}`;

  function marcarEnviado(f: FornecedorDoRoteiro) {
    const hoje = new Date().toISOString();
    const novos = { ...lerEnviados(eventId), [f.supplierId]: hoje };
    setEnviados(novos);
    try {
      window.localStorage.setItem(CHAVE(eventId), JSON.stringify(novos));
    } catch {
      /* sem armazenamento: o "enviado" só vale nesta visita */
    }
  }

  async function copiar(f: FornecedorDoRoteiro) {
    await navigator.clipboard.writeText(texto(f));
    marcarEnviado(f);
    setCopiado(f.supplierId);
    setTimeout(() => setCopiado(null), 2000);
  }

  function alternarConfirmado(f: FornecedorDoRoteiro) {
    const vai = !confirmados.has(f.supplierId);
    setConfirmados((s) => {
      const n = new Set(s);
      if (vai) n.add(f.supplierId);
      else n.delete(f.supplierId);
      return n;
    });
    iniciar(async () => {
      await setSupplierConfirmed(eventId, f.supplierId, vai);
      router.refresh();
    });
  }

  const nConfirmados = fornecedores.filter((f) => confirmados.has(f.supplierId)).length;
  const nEnviados = fornecedores.filter((f) => enviados[f.supplierId]).length;
  const ordenados = [...fornecedores].sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <section
      aria-label="Fornecedores do roteiro"
      className="rounded-[14px] border border-[#E9E8F1] bg-white p-4 print:hidden"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-bold text-[#17162A]">Fornecedores</h3>
        <span className="text-[12.5px] text-[#6B6884]">
          {nConfirmados === fornecedores.length
            ? "todos confirmaram"
            : `${nConfirmados} de ${fornecedores.length} confirmaram`}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setMandando((v) => !v)}
        aria-expanded={mandando}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-[9px] px-3 py-2.5 text-[13px] font-bold transition-opacity ${
          mandando
            ? "border border-stone-300 bg-white text-stone-700"
            : "bg-[#17162A] text-white hover:opacity-90"
        }`}
      >
        {mandando ? (
          <>Pronto · {nEnviados} de {fornecedores.length} enviados</>
        ) : (
          <>
            <Send size={14} /> Mandar o roteiro para todos
          </>
        )}
      </button>

      <ul className="mt-3">
        {ordenados.map((f) => {
          const conf = confirmados.has(f.supplierId);
          const enviado = enviados[f.supplierId];
          const zap = linkWhatsapp(f.telefone, texto(f)) ?? linkCompartilharWhatsapp(texto(f));
          return (
            <li key={f.supplierId} className="border-t border-[#F1F0F5] py-2.5 first:border-t-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-[#17162A]">{f.nome}</p>
                  <p className="text-[12px] text-[#9A97AE]">
                    {f.itens === 0
                      ? "sem horário no roteiro"
                      : `${f.itens} ${f.itens === 1 ? "horário" : "horários"}`}
                    {enviado && ` · enviado ${dataCurta(enviado)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alternarConfirmado(f)}
                  title={conf ? "Desmarcar a confirmação" : "Marcar como confirmado"}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                    conf
                      ? "bg-[#EAF6EE] text-[#17803D]"
                      : "border border-dashed border-stone-300 text-stone-500 hover:border-stone-400"
                  }`}
                >
                  {conf ? (
                    <>
                      <Check size={12} strokeWidth={3} /> confirmou
                    </>
                  ) : (
                    "confirmou?"
                  )}
                </button>
              </div>
              {mandando && (
                <div className="mt-2 flex gap-2">
                  <a
                    href={zap}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => marcarEnviado(f)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-[8px] px-2 py-1.5 text-[12.5px] font-semibold ${
                      enviado
                        ? "border border-stone-200 text-stone-500"
                        : "bg-[#25D366] text-white hover:opacity-90"
                    }`}
                  >
                    {enviado ? "Mandar de novo" : "Mandar no WhatsApp"}
                  </a>
                  <button
                    type="button"
                    onClick={() => copiar(f)}
                    aria-label={`Copiar a mensagem para ${f.nome}`}
                    className="flex items-center gap-1 rounded-[8px] border border-stone-200 px-2 py-1.5 text-[12.5px] text-stone-600 hover:border-stone-300"
                  >
                    {copiado === f.supplierId ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
