"use client";

// A faixa do evento de exemplo (174): em toda tela do exemplo, bem à
// vista, diz que é exemplo, marca a tela que ela está vendo e mostra o
// que ainda falta ver. Quando ela passou por todas, o exemplo sai de
// cena na próxima vez que ela abrir Eventos (ou agora, no botão).

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  apagarExemplo,
  marcarExemploVisto,
  trocarModeloDoExemplo,
} from "@/app/(app)/eventos/exemplo-actions";

type Area = { area: string; rotulo: string; caminho: string };

export function FaixaDoExemplo({
  eventId,
  areas,
  visto,
  tipo,
}: {
  eventId: string;
  areas: Area[];
  visto: string[];
  tipo: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [vistas, setVistas] = useState<string[]>(visto);
  const [apagando, iniciar] = useTransition();
  const [trocando, iniciarTroca] = useTransition();
  const outro = tipo === "debutante" ? "casamento" : "debutante";

  // a tela atual: o trecho depois de /eventos/<id>
  const resto = pathname.replace(`/eventos/${eventId}`, "").split("/").filter(Boolean)[0] ?? "";
  const atual = areas.find((a) => a.caminho.replace("/", "") === resto)?.area ?? null;

  useEffect(() => {
    if (!atual || vistas.includes(atual)) return;
    setVistas((v) => [...v, atual]);
    marcarExemploVisto(eventId, atual as never).then(() => router.refresh());
    // só quando muda a tela
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual]);

  const tudo = areas.every((a) => vistas.includes(a.area));

  return (
    <div
      role="note"
      className="rounded-xl border-2 border-[#6E3F5F] bg-[#F7EFF3] px-4 py-3 text-[#3B2233]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span className="rounded bg-[#6E3F5F] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
              Exemplo
            </span>
            Este evento é fictício, para você ver como o eOrganizei fica preenchido.
          </p>
          <p className="mt-1 text-[13px] text-[#5B4452]">
            {tudo
              ? "Você já passou por tudo. O exemplo sai quando você voltar para Eventos."
              : "Ele some sozinho depois que você passar por estas telas:"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {areas.map((a) => {
              const ok = vistas.includes(a.area);
              return (
                <Link
                  key={a.area}
                  href={`/eventos/${eventId}${a.caminho}`}
                  className={
                    ok
                      ? "rounded-full border border-[#C9AFBE] bg-white/60 px-2.5 py-1 text-xs text-[#5B4452] line-through decoration-[#6E3F5F]/40"
                      : "rounded-full border border-[#6E3F5F] bg-white px-2.5 py-1 text-xs font-medium text-[#6E3F5F] hover:bg-[#6E3F5F] hover:text-white"
                  }
                >
                  {ok ? "✓ " : ""}
                  {a.rotulo}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            disabled={apagando || trocando}
            onClick={() => iniciar(() => apagarExemplo())}
            className="rounded-lg border border-[#C9AFBE] bg-white px-3 py-1.5 text-xs font-medium text-[#5B4452] hover:border-[#6E3F5F]"
          >
            {apagando ? "Apagando…" : "Apagar o exemplo"}
          </button>
          <button
            type="button"
            disabled={apagando || trocando}
            onClick={() => iniciarTroca(() => trocarModeloDoExemplo(outro))}
            className="text-xs font-medium text-[#6E3F5F] underline underline-offset-2"
          >
            {trocando
              ? "Trocando…"
              : outro === "debutante"
                ? "Trabalha com 15 anos? Ver o exemplo de debutante"
                : "Ver o exemplo de casamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
