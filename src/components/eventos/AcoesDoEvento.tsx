"use client";

// "Ações ▾", o botão primário do cabeçalho (Modelo A). O handoff pede o
// botão; o que ele abre são as ações que já existem no evento, cada uma
// levando à tela onde acontece — nada novo, nada que fale pela pessoa.

import Link from "next/link";
import { useRef } from "react";
import {
  ClipboardList,
  ListPlus,
  Pencil,
  Printer,
  StickyNote,
  Truck,
} from "lucide-react";

export function AcoesDoEvento({
  eventId,
  secundario = false,
}: {
  eventId: string;
  /** quando o Modo Evento é o destaque (7 dias ou menos), Ações cede o
   *  primário: um botão escuro por vez */
  secundario?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const base = `/eventos/${eventId}`;
  const fechar = () => {
    if (ref.current) ref.current.open = false;
  };

  const itens: { href: string; label: string; icon: typeof Pencil; novaAba?: boolean }[] = [
    { href: `${base}/editar`, label: "Editar dados do evento", icon: Pencil },
    // ?tarefa=nova abre o drawer de criação direto (OrganizacaoEvento)
    { href: `${base}/organizacao?tarefa=nova`, label: "Nova tarefa", icon: ListPlus },
    { href: `${base}/fornecedores`, label: "Vincular fornecedor", icon: Truck },
    { href: `${base}#observacoes`, label: "Adicionar observação", icon: StickyNote },
    { href: `/imprimir/roteiro/${eventId}`, label: "Imprimir o roteiro", icon: Printer, novaAba: true },
    { href: `/imprimir/separacao/${eventId}`, label: "Lista de separação", icon: ClipboardList, novaAba: true },
  ];

  return (
    <details ref={ref} style={{ position: "relative" }}>
      <summary
        className={`${secundario ? "ev-btn-secundario" : "ev-btn-primario"} ev-foco list-none`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 40,
          padding: "0 16px",
          borderRadius: 10,
          background: secundario ? "var(--ev-card-bg)" : "var(--ev-accent)",
          color: secundario ? "var(--ev-text-strong)" : "#fff",
          border: secundario ? "1px solid var(--ev-card-border)" : "1px solid transparent",
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          fontWeight: 600,
          cursor: "pointer",
          userSelect: "none",
          whiteSpace: "nowrap",
          transition: "background 140ms ease",
        }}
      >
        Ações
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div
        role="menu"
        style={{
          position: "absolute",
          right: 0,
          top: "calc(100% + 6px)",
          zIndex: 20,
          minWidth: 232,
          padding: 6,
          borderRadius: 12,
          border: "1px solid var(--ev-card-border)",
          background: "#fff",
          boxShadow: "0 8px 24px rgba(34,30,27,.10)",
        }}
      >
        {itens.map(({ href, label, icon: Icon, novaAba }) => (
          <Link
            key={label}
            href={href}
            role="menuitem"
            onClick={fechar}
            target={novaAba ? "_blank" : undefined}
            rel={novaAba ? "noopener" : undefined}
            className="hover:bg-[color:var(--ev-marfim)]"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ev-text-strong)",
              whiteSpace: "nowrap",
            }}
          >
            <Icon size={15} strokeWidth={1.7} style={{ color: "var(--ev-text-muted)" }} />
            {label}
          </Link>
        ))}
      </div>
    </details>
  );
}
