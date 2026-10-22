"use client";

// Fechar a lista (21/10/2026, RSVP como prioridade): o que o buffet e a
// equipe precisam — quantas pessoas, adultos e crianças, restrições,
// acessibilidade e o que mudou desde o último fechamento. A planilha sai
// sem telefone nem e-mail; o texto vai ao buffet pelo WhatsApp dela; e o
// fechamento fica registrado no Caderno (é a data que o próximo compara).

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  planilhaDaLista,
  resumoDaLista,
  textoDoFechamento,
  type LinhaOperacional,
} from "@/lib/rsvp-fechamento";
import { registrarFechamento } from "@/app/(app)/eventos/[id]/rsvp/actions";

const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function FecharLista({
  eventId,
  nomeDoEvento,
  dataEvento,
  hoje,
  linhas,
  ultimoFechamento,
  prazo,
  aoFechar,
}: {
  eventId: string;
  nomeDoEvento: string;
  dataEvento: string | null;
  hoje: string;
  linhas: LinhaOperacional[];
  /** quando foi o último fechamento registrado; null = nunca */
  ultimoFechamento: string | null;
  /** o prazo de resposta do site do casal, quando houver */
  prazo: string | null;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const r = useMemo(() => resumoDaLista(linhas, ultimoFechamento), [linhas, ultimoFechamento]);
  const texto = useMemo(() => textoDoFechamento(r, { nome: nomeDoEvento, data: dataEvento }, hoje), [r, nomeDoEvento, dataEvento, hoje]);
  const [registrado, setRegistrado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function baixar() {
    const blob = new Blob([planilhaDaLista(linhas)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista-${nomeDoEvento.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}-${hoje}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function registrar() {
    setErro(null);
    iniciar(async () => {
      const res = await registrarFechamento(eventId, texto);
      if (res.error) setErro(res.error);
      else {
        setRegistrado(true);
        router.refresh();
      }
    });
  }

  const falta = prazo ? Math.round((Date.parse(`${prazo}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000) : null;

  return (
    <>
      <div className="rp-veu" onClick={aoFechar} aria-hidden />
      <div className="rp-modal" role="dialog" aria-modal="true" aria-label="Fechar a lista">
        <header>
          <h3>Fechar a lista</h3>
          {prazo && (
            <span className="rp-mono" style={{ fontSize: 12, color: "var(--cinza)" }}>
              prazo de resposta {dataBR(prazo)}
              {falta !== null && (falta > 0 ? ` · faltam ${falta} dias` : falta === 0 ? " · é hoje" : " · já passou")}
            </span>
          )}
          <button type="button" className="rp-btn" style={{ marginLeft: "auto" }} onClick={aoFechar}>
            Fechar
          </button>
        </header>

        <div className="rp-corpo">
          <div>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 600, color: "var(--tinta)", letterSpacing: "-0.02em" }}>
              {r.pessoas} {r.pessoas === 1 ? "pessoa" : "pessoas"}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--tinta)" }}>
              {r.adultos} {r.adultos === 1 ? "adulto" : "adultos"} e {r.criancas} {r.criancas === 1 ? "criança" : "crianças"}
            </p>
            <p className="rp-mono" style={{ margin: "6px 0 0", fontSize: 12, color: "var(--cinza)" }}>
              {r.confirmados} confirmados · {r.naoVao} não vão · {r.aguardando} sem resposta
              {r.semContato > 0 ? ` (${r.semContato} sem contato)` : ""}
            </p>
          </div>

          {r.restricoes.length > 0 && (
            <div>
              <span className="rp-rot" style={{ padding: 0 }}>Restrições alimentares</span>
              <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--tinta)" }}>
                {r.restricoes.map((x) => `${x.texto} (${x.n})`).join(" · ")}
              </p>
            </div>
          )}

          {r.acessibilidade.length > 0 && (
            <div>
              <span className="rp-rot" style={{ padding: 0 }}>Acessibilidade</span>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13.5, color: "var(--tinta)" }}>
                {r.acessibilidade.map((x) => (
                  <li key={x.nome}>
                    {x.nome}: {x.texto}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <span className="rp-rot" style={{ padding: 0 }}>
              {ultimoFechamento ? `Desde o último fechamento (${dataBR(ultimoFechamento.slice(0, 10))})` : "Primeiro fechamento"}
            </span>
            {ultimoFechamento ? (
              r.novas.length ? (
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13.5, color: "var(--tinta)" }}>
                  {r.novas.slice(0, 30).map((n) => (
                    <li key={n.nome}>
                      {n.nome}: {n.confirmacao === "confirmado" ? `confirmou${n.pessoas > 1 ? ` (${n.pessoas} pessoas)` : ""}` : "não vai"}
                    </li>
                  ))}
                  {r.novas.length > 30 && <li>e mais {r.novas.length - 30}</li>}
                </ul>
              ) : (
                <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--cinza)" }}>Nenhuma resposta nova.</p>
              )
            ) : null}
          </div>

          <div className="rp-par" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="rp-btn" onClick={baixar}>
              Baixar a planilha
            </button>
            <a className="rp-btn" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }} href={`/imprimir/evento/${eventId}`} target="_blank" rel="noopener noreferrer">
              Folha para imprimir
            </a>
            <a
              className="rp-btn"
              style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
              href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mandar ao buffet no WhatsApp
            </a>
            <button type="button" className="rp-btn p" onClick={registrar} disabled={pendente || registrado}>
              {registrado ? "Registrado no Caderno" : pendente ? "Registrando…" : "Registrar o fechamento"}
            </button>
          </div>
          {erro && <p style={{ margin: 0, fontSize: 13, color: "#9a3412" }}>{erro}</p>}
        </div>
      </div>
    </>
  );
}
