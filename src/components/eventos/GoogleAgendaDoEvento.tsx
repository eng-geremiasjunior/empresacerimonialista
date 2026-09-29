"use client";

// Google Agenda na Visão geral do evento (Modelo A + pedido de 29/09/2026:
// "é ali que a pessoa chega mexendo"). A mesma conexão de Configurações,
// por pessoa: conectar daqui volta para este evento; conectada, o botão
// abre o dia do evento no Google.
//
// Os três estados, em tempo e consequência — nunca "status: ativo":
//   · sem conexão → o que ganha e o botão Conectar;
//   · o Google deixou de aceitar → desde quando, e Conectar de novo;
//   · sincronizada → Abrir agenda, e Desconectar em tom menor.

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { desconectarGoogle } from "@/app/(app)/configuracoes/google-actions";
import {
  AVISOS_GOOGLE,
  diaMes,
  urlDeConectar,
  type ConexaoGoogleNaTela,
} from "@/lib/google/na-tela";

const botao: React.CSSProperties = {
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
  cursor: "pointer",
  transition: "background 140ms ease, border-color 140ms ease",
};

export function GoogleAgendaDoEvento({
  eventId,
  dataEvento,
  conexao,
  aviso,
  motivo,
}: {
  eventId: string;
  /** yyyy-MM-dd */
  dataEvento: string;
  conexao: ConexaoGoogleNaTela | null;
  /** o que a volta do Google disse (?google=) */
  aviso: string | null;
  /** o código curto de onde a volta falhou (?motivo=) */
  motivo: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const caixa = useRef<HTMLElement>(null);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  // a frase da volta do Google fica na tela; a URL é limpa, para um F5
  // não repetir "Conectado"
  const [recado] = useState(aviso && AVISOS_GOOGLE[aviso] ? aviso : null);

  useEffect(() => {
    if (!recado) return;
    caixa.current?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    router.replace(pathname, { scroll: false });
    // só na chegada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [ano, mes, dia] = dataEvento.split("-");
  const noGoogle = `https://calendar.google.com/calendar/r/day/${ano}/${Number(mes)}/${Number(dia)}`;
  const conectar = urlDeConectar(`/eventos/${eventId}`);
  const falhou = conexao?.falha === "token";

  function desconectar() {
    if (!confirm("Desconectar? A agenda eOrganizei é apagada do seu Google. Suas outras agendas não mudam.")) return;
    iniciar(async () => {
      setErro(null);
      const r = await desconectarGoogle();
      if (r.error) {
        setErro(r.error);
        return;
      }
      router.refresh();
    });
  }

  const linha = !conexao
    ? { texto: "O dia deste evento no seu Google e no celular", cor: "var(--ev-text-muted)" }
    : falhou
      ? {
          texto: `● O Google deixou de aceitar${conexao.falha_em ? ` em ${diaMes(conexao.falha_em)}` : ""}`,
          cor: "var(--ev-late)",
        }
      : {
          texto: `● Sincronizado${conexao.google_email ? ` · ${conexao.google_email}` : ""}`,
          cor: "#5e7355",
        };

  return (
    <section
      ref={caixa}
      aria-label="Google Agenda"
      style={{
        background: "var(--ev-card-bg)",
        border: "1px solid var(--ev-card-border)",
        borderRadius: 14,
        padding: "14px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          <span
            title={linha.texto}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: linha.cor,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {linha.texto}
          </span>
        </span>
        {conexao && !falhou ? (
          <a href={noGoogle} target="_blank" rel="noopener" className="ev-btn-secundario ev-foco" style={botao}>
            Abrir agenda
            <ExternalLink size={12} />
          </a>
        ) : (
          <a href={conectar} className="ev-btn-secundario ev-foco" style={botao}>
            {falhou ? "Conectar de novo" : "Conectar"}
          </a>
        )}
      </div>

      {recado && (
        <p
          role="status"
          style={{
            margin: 0,
            padding: "8px 12px",
            borderRadius: 10,
            background: "var(--ev-marfim)",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            lineHeight: 1.45,
            color: "var(--ev-text-body)",
          }}
        >
          {AVISOS_GOOGLE[recado]}
          {recado === "erro" && motivo ? ` (código: ${motivo})` : ""}
        </p>
      )}
      {erro && (
        <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "var(--ev-late)" }}>
          {erro}
        </p>
      )}

      {conexao && (
        <button
          type="button"
          onClick={desconectar}
          disabled={pendente}
          className="hover:!text-[color:var(--ev-text-strong)]"
          style={{
            alignSelf: "flex-start",
            padding: 0,
            border: "none",
            background: "transparent",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ev-text-muted)",
            cursor: "pointer",
          }}
        >
          {pendente ? "Desconectando…" : "Desconectar"}
        </button>
      )}
    </section>
  );
}
