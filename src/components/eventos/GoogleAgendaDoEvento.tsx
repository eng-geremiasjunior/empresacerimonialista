// Google Agenda no Resumo (Modelo A): só aparece quando a pessoa logada
// conectou a agenda (168). O chip é o dia do evento; a linha diz se a
// conexão está de pé; "Abrir agenda" abre o dia do evento no Google.

import { ExternalLink } from "lucide-react";

export function GoogleAgendaDoEvento({
  dataEvento,
  falha,
}: {
  /** yyyy-MM-dd */
  dataEvento: string;
  /** 'token' | 'agenda' | null — a coluna falha da conexão */
  falha: string | null;
}) {
  const [ano, mes, dia] = dataEvento.split("-");
  const href = `https://calendar.google.com/calendar/r/day/${ano}/${Number(mes)}/${Number(dia)}`;
  const ok = !falha;

  return (
    <section
      aria-label="Google Agenda"
      style={{
        background: "var(--ev-card-bg)",
        border: "1px solid var(--ev-card-border)",
        borderRadius: 14,
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "1px solid var(--ev-card-border)",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--ev-text-muted)",
          flex: "none",
        }}
      >
        {Number(dia)}
      </span>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--ev-text-strong)" }}>
          Google Agenda
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: ok ? "#5e7355" : "var(--ev-late)" }}>
          {ok ? "● Sincronizado" : "● Precisa conectar de novo"}
        </span>
      </span>
      <a
        href={ok ? href : "/configuracoes"}
        target={ok ? "_blank" : undefined}
        rel={ok ? "noopener" : undefined}
        className="ev-btn-secundario ev-foco"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 32,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid var(--ev-card-border)",
          background: "#fff",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--ev-text-strong)",
          whiteSpace: "nowrap",
          transition: "background 140ms ease, border-color 140ms ease",
        }}
      >
        {ok ? "Abrir agenda" : "Conectar"}
        {ok && <ExternalLink size={12} />}
      </a>
    </section>
  );
}
