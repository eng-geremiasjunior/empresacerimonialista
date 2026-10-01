"use client";

// Aprovar, recusar (com o motivo que a família lê) ou tirar do ar.
// A versão vai junto: se a família mandar outra enquanto o dono revisa,
// o banco recusa e pede para abrir de novo.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decidirSite, tirarSiteDoAr } from "@/app/admin/actions";

const MOTIVOS_PRONTOS = [
  "Uma das fotos não pode ficar no site. Troque e publique de novo.",
  "Há um texto com linguagem ofensiva. Ajuste e publique de novo.",
  "Há conteúdo que não é do evento (propaganda ou links). Tire e publique de novo.",
  "Há dado pessoal de outra pessoa exposto (documento ou telefone). Tire e publique de novo.",
];

export function DecisaoDoSite({
  eventId,
  versao,
  emAnalise,
  noAr,
  semPrevia = 0,
}: {
  eventId: string;
  versao: number;
  emAnalise: boolean;
  noAr: boolean;
  /** fotos da versão pendente sem URL assinada: com alguma, não aprova */
  semPrevia?: number;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [modo, setModo] = useState<"recusar" | "tirar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  function rodar(fn: () => Promise<{ ok?: boolean; error?: string }>, ok: string) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (r.error) {
        setErro(r.error);
        return;
      }
      setFeito(ok);
      setModo(null);
      setMotivo("");
      router.refresh();
    });
  }

  const botao = "rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        {emAnalise && (
          <>
            <button
              type="button"
              disabled={pendente || semPrevia > 0}
              onClick={() => rodar(() => decidirSite(eventId, true, null, versao), "Aprovado: o site está no ar.")}
              className={`${botao} bg-stone-900 text-white hover:bg-stone-700 disabled:hover:bg-stone-900`}
            >
              Aprovar e publicar
            </button>
            {semPrevia > 0 && (
              <span className="text-xs text-red-700">
                {semPrevia === 1 ? "1 foto sem prévia" : `${semPrevia} fotos sem prévia`}
              </span>
            )}
            <button
              type="button"
              disabled={pendente}
              onClick={() => setModo(modo === "recusar" ? null : "recusar")}
              className={`${botao} border border-stone-300 bg-white text-stone-700 hover:bg-stone-50`}
            >
              Recusar
            </button>
          </>
        )}
        {noAr && (
          <button
            type="button"
            disabled={pendente}
            onClick={() => setModo(modo === "tirar" ? null : "tirar")}
            className={`${botao} border border-red-200 bg-white text-red-700 hover:bg-red-50`}
          >
            Tirar do ar
          </button>
        )}
        <span className="text-xs text-stone-500">versão {versao}</span>
      </div>

      {modo && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-stone-700">
            {modo === "recusar" ? "O motivo (a família lê):" : "Por que sai do ar (a família lê):"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS_PRONTOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  motivo === m ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {m.split(".")[0]}
              </button>
            ))}
          </div>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={300}
            rows={2}
            className="w-full rounded-md border border-stone-300 px-2.5 py-1.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none"
            placeholder="Escreva ou escolha um acima"
          />
          <div>
            <button
              type="button"
              disabled={pendente || !motivo.trim()}
              onClick={() =>
                modo === "recusar"
                  ? rodar(() => decidirSite(eventId, false, motivo, versao), "Recusado: a família vê o motivo.")
                  : rodar(() => tirarSiteDoAr(eventId, motivo), "Tirado do ar: só volta com nova aprovação.")
              }
              className={`${botao} ${modo === "recusar" ? "bg-stone-900 text-white hover:bg-stone-700" : "bg-red-700 text-white hover:bg-red-800"}`}
            >
              {modo === "recusar" ? "Recusar com este motivo" : "Tirar do ar agora"}
            </button>
          </div>
        </div>
      )}

      {(erro || feito) && (
        <p className={`text-xs ${erro ? "text-red-700" : "text-stone-600"}`}>{erro ?? feito}</p>
      )}
    </div>
  );
}
