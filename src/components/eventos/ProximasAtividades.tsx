"use client";

// Próximas atividades (Modelo A): as tarefas dos próximos 7 dias, cada
// uma com o círculo de concluir, a data em mono e a etiqueta de onde
// vem. Num evento sem nada montado vira "Para começar": três passos, um
// link para a fase certa em cada um.

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { ProximaTarefa, ResumoEvento } from "@/lib/supabase/resumo-evento";
import { alternarTarefa } from "@/app/(app)/eventos/[id]/organizacao/actions";
import { formatTime } from "@/lib/format";

const cartao: React.CSSProperties = {
  background: "var(--ev-card-bg)",
  border: "1px solid var(--ev-card-border)",
  borderRadius: 14,
  overflow: "hidden",
};

const cabecalho: React.CSSProperties = {
  padding: "16px 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const tituloDoBloco: React.CSSProperties = {
  fontFamily: "var(--font-title)",
  fontSize: 16,
  fontWeight: 600,
  color: "var(--ev-text-strong)",
};

function quando(t: ProximaTarefa, grupo: "hoje" | "amanha" | "depois"): string {
  const hora = t.due_time ? ` · ${formatTime(t.due_time)}` : "";
  if (grupo === "hoje") return `Hoje${hora}`;
  if (grupo === "amanha") return `Amanhã${hora}`;
  const [, m, d] = t.due_date.split("-");
  return `${d}/${m}${hora}`;
}

export type PassoParaComecar = {
  titulo: string;
  descricao: string;
  acao: string;
  seg: string;
  feito: boolean;
};

export function ParaComecar({
  eventId,
  passos,
}: {
  eventId: string;
  passos: PassoParaComecar[];
}) {
  const feitos = passos.filter((p) => p.feito).length;
  // o primeiro passo em aberto é o destacado
  const atual = passos.findIndex((p) => !p.feito);
  return (
    <section style={cartao} aria-label="Para começar">
      <div style={cabecalho}>
        <span style={tituloDoBloco}>Para começar</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ev-text-muted)" }}>
          {feitos} de {passos.length}
        </span>
      </div>
      {passos.map((p, i) => {
        const destaque = i === atual;
        return (
          <div
            key={p.seg}
            style={{
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderTop: "1px solid var(--ev-card-border)",
              background: destaque ? "var(--ev-ok-tint)" : "#fff",
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-title)",
                fontSize: 11,
                fontWeight: 600,
                flex: "none",
                background: p.feito ? "var(--ev-ok)" : destaque ? "var(--ev-ok)" : "var(--ev-nevoa)",
                color: p.feito || destaque ? "#fff" : "var(--ev-text-muted)",
              }}
            >
              {p.feito ? <Check size={12} strokeWidth={3} /> : i + 1}
            </span>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--ev-text-strong)" }}>
                {p.titulo}
              </span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ev-text-muted)" }}>
                {p.descricao}
              </span>
            </span>
            {!p.feito && (
              <Link
                href={`/eventos/${eventId}/${p.seg}`}
                style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "var(--ev-accent)", whiteSpace: "nowrap" }}
              >
                {p.acao} →
              </Link>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function ProximasAtividades({
  eventId,
  proximas,
}: {
  eventId: string;
  proximas: ResumoEvento["proximas"];
}) {
  const router = useRouter();
  const [feitas, setFeitas] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const linhas: { t: ProximaTarefa; grupo: "hoje" | "amanha" | "depois" }[] = [
    ...proximas.hoje.map((t) => ({ t, grupo: "hoje" as const })),
    ...proximas.amanha.map((t) => ({ t, grupo: "amanha" as const })),
    ...proximas.proximos7.map((t) => ({ t, grupo: "depois" as const })),
  ].filter(({ t }) => !feitas.has(t.id));
  const vazio = linhas.length === 0 && !proximas.confirmacaoAgendada;

  function concluir(id: string) {
    setFeitas((s) => new Set(s).add(id));
    startTransition(async () => {
      const r = await alternarTarefa(eventId, id, true);
      if ("error" in r) {
        setFeitas((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        return;
      }
      router.refresh();
    });
  }

  return (
    <section style={cartao} aria-label="Próximas atividades">
      <div style={cabecalho}>
        <span style={tituloDoBloco}>Próximas atividades</span>
        <Link
          href={`/eventos/${eventId}/organizacao`}
          style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ev-text-muted)" }}
        >
          Ver todas →
        </Link>
      </div>

      {vazio ? (
        <p
          style={{
            margin: 0,
            padding: "12px 20px 16px",
            borderTop: "1px solid var(--ev-card-border)",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ev-text-muted)",
          }}
        >
          Nada agendado para os próximos dias.
        </p>
      ) : (
        <>
          {linhas.map(({ t, grupo }) => (
            <div
              key={t.id}
              style={{
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderTop: "1px solid var(--ev-card-border)",
              }}
            >
              <button
                type="button"
                onClick={() => concluir(t.id)}
                aria-label={`Concluir: ${t.title}`}
                title="Concluir"
                className="hover:border-[color:var(--ev-ok)] hover:bg-[color:var(--ev-ok-tint)]"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  border: "1.5px solid var(--ev-text-faint)",
                  background: "transparent",
                  flex: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "background 140ms ease, border-color 140ms ease",
                }}
              />
              <Link
                href={`/eventos/${eventId}/organizacao?tarefa=${t.id}`}
                style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--ev-text-strong)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.title}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ev-text-muted)" }}>
                  {quando(t, grupo)}
                </span>
              </Link>
              <Etiqueta>Organização</Etiqueta>
            </div>
          ))}
          {proximas.confirmacaoAgendada && (
            <div
              style={{
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderTop: "1px solid var(--ev-card-border)",
              }}
            >
              <span aria-hidden style={{ width: 16, height: 16, borderRadius: 999, background: "var(--ev-nevoa)", flex: "none" }} />
              <Link
                href={`/eventos/${eventId}/fornecedores`}
                style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}
              >
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "var(--ev-text-strong)" }}>
                  Convites de confirmação aos fornecedores
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ev-text-muted)" }}>
                  {proximas.confirmacaoAgendada.split("-").reverse().slice(0, 2).join("/")} · envio automático
                </span>
              </Link>
              <Etiqueta>Fornecedores</Etiqueta>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 8px",
        borderRadius: 999,
        background: "var(--ev-nevoa)",
        color: "var(--ev-text-muted)",
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
