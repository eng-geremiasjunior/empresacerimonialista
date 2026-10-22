"use client";

// O relatório ao casal (22/10/2026, C3 do plano do RSVP): o andamento das
// confirmações numa mensagem, para a família ver o serviço acontecendo.
// Números exatos, pelo código; ela edita o texto e manda pelo WhatsApp
// dela. Nada sai sozinho.

import { useMemo, useState } from "react";
import { textoDoRelatorioAoCasal, type LinhaOperacional } from "@/lib/rsvp-fechamento";
import { linkCompartilharWhatsapp, linkWhatsapp, primeiroNome } from "@/lib/whatsapp-link";

export function RelatorioAoCasal({
  nomeDoEvento,
  dataEvento,
  hoje,
  prazo,
  linhas,
  cliente,
  aoFechar,
}: {
  nomeDoEvento: string;
  dataEvento: string | null;
  hoje: string;
  prazo: string | null;
  linhas: LinhaOperacional[];
  cliente: { nome: string | null; telefone: string | null } | null;
  aoFechar: () => void;
}) {
  const inicial = useMemo(
    () => textoDoRelatorioAoCasal(linhas, { nome: nomeDoEvento, data: dataEvento }, hoje, prazo, primeiroNome(cliente?.nome) || null),
    [linhas, nomeDoEvento, dataEvento, hoje, prazo, cliente?.nome]
  );
  const [texto, setTexto] = useState(inicial);
  const [copiado, setCopiado] = useState(false);
  const direto = linkWhatsapp(cliente?.telefone, texto);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sem permissão da área de transferência: ela seleciona e copia */
    }
  }

  return (
    <>
      <div className="rp-veu" onClick={aoFechar} aria-hidden />
      <div className="rp-modal" role="dialog" aria-modal="true" aria-label="Relatório ao casal">
        <header>
          <h3>Relatório ao casal</h3>
          <button type="button" className="rp-btn" style={{ marginLeft: "auto" }} onClick={aoFechar}>
            Fechar
          </button>
        </header>
        <div className="rp-corpo">
          <textarea
            className="rp-in"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            style={{ height: 260 }}
            aria-label="Texto do relatório"
          />
        </div>
        <footer style={{ flexWrap: "wrap" }}>
          <a
            className="rp-btn p"
            style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
            href={direto ?? linkCompartilharWhatsapp(texto)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {direto ? `Mandar para ${primeiroNome(cliente?.nome) || "a cliente"} no WhatsApp` : "Abrir no WhatsApp"}
          </a>
          <button type="button" className="rp-btn" onClick={() => void copiar()}>
            {copiado ? "Copiado" : "Copiar"}
          </button>
          {texto !== inicial && (
            <button type="button" className="rp-btn" style={{ marginLeft: "auto" }} onClick={() => setTexto(inicial)}>
              Voltar ao texto original
            </button>
          )}
        </footer>
      </div>
    </>
  );
}
