"use client";

// O prazo de resposta na aba RSVP (22/10/2026, 221): a data-limite das
// confirmações, definida pela equipe. Sem ele, vale o do site do casal.
// É o prazo que o Fechar a lista e o Relatório ao casal mostram.

import { useState, useTransition } from "react";
import { definirPrazoDoRsvp } from "@/app/(app)/eventos/[id]/rsvp/actions";

const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function PrazoDeResposta({
  eventId,
  dataEvento,
  hoje,
  daEquipe,
  doSite,
  aoFechar,
  aoGravar,
}: {
  eventId: string;
  dataEvento: string | null;
  hoje: string;
  daEquipe: string | null;
  doSite: string | null;
  aoFechar: () => void;
  aoGravar: () => void;
}) {
  const [data, setData] = useState(daEquipe ?? doSite ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const depoisDaFesta = !!(data && dataEvento && data > dataEvento);

  function gravar(valor: string | null) {
    setErro(null);
    iniciar(async () => {
      const r = await definirPrazoDoRsvp(eventId, valor);
      if (r.error) setErro(r.error);
      else aoGravar();
    });
  }

  return (
    <>
      <div className="rp-veu" onClick={aoFechar} aria-hidden />
      <div className="rp-modal" role="dialog" aria-modal="true" aria-label="Prazo de resposta" style={{ width: "min(440px, calc(100vw - 32px))" }}>
        <header>
          <h3>Prazo de resposta</h3>
          <button type="button" className="rp-btn" style={{ marginLeft: "auto" }} onClick={aoFechar}>
            Fechar
          </button>
        </header>
        <div className="rp-corpo">
          <input
            type="date"
            className="rp-in"
            value={data}
            min={hoje}
            max={dataEvento ?? undefined}
            onChange={(e) => setData(e.target.value)}
            aria-label="Data-limite das confirmações"
            style={{ width: 200 }}
          />
          {!daEquipe && doSite && (
            <p className="rp-nota">O site do casal diz {dataBR(doSite)}.</p>
          )}
          {depoisDaFesta && <p className="rp-nota esp">Essa data é depois da festa.</p>}
          {erro && <p className="rp-nota esp">{erro}</p>}
        </div>
        <footer>
          <button type="button" className="rp-btn p" disabled={pendente || !data || data === daEquipe} onClick={() => gravar(data)}>
            {pendente ? "Guardando…" : "Guardar o prazo"}
          </button>
          {daEquipe && (
            <button type="button" className="rp-btn" disabled={pendente} onClick={() => gravar(null)}>
              Tirar o prazo
            </button>
          )}
        </footer>
      </div>
    </>
  );
}
