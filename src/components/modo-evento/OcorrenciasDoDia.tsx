"use client";

// Ocorrências registradas no DIA (139) — mora no bloco de desmontagem
// do checklist. "Ocorrências e avarias registradas" deixa de ser um
// checkbox mudo: aqui ela registra a avaria com duas linhas, de pé, com
// uma mão. A decisão do que o casal vê fica para a revisão da prestação
// de contas, com calma — aqui nada nasce visível.

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ModoTheme } from "@/lib/modo-tema";
import { criarOcorrencia } from "@/app/(app)/eventos/[id]/ocorrencia-actions";
import { TIPOS_OCORRENCIA } from "@/lib/ocorrencia";

const ROTULO: Record<string, string> = {
  avaria: "Avaria",
  perda: "Perda",
  pertence: "Pertence",
  outro: "Outro",
};

type Linha = { id: string; tipo: string; descricao: string };

export function OcorrenciasDoDia({
  eventId,
  t,
}: {
  eventId: string;
  t: ModoTheme;
}) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState("avaria");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  async function carregar() {
    const supabase = createClient();
    const { data } = await supabase
      .from("evento_ocorrencia")
      .select("id, tipo, descricao")
      .eq("event_id", eventId)
      .order("criada_em", { ascending: true });
    setLinhas((data as Linha[] | null) ?? []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function registrar() {
    if (!descricao.trim()) return;
    setErro(null);
    iniciar(async () => {
      const r = await criarOcorrencia(eventId, {
        tipo,
        descricao,
        valor: null,
        supplierId: null,
      });
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setDescricao("");
      await carregar();
    });
  }

  return (
    <div className={`mt-3 rounded-xl border p-3 ${t.panel}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-medium ${t.text}`}>
          Ocorrências
          {linhas && linhas.length > 0 && (
            <span className={`ml-1.5 text-xs ${t.sub}`}>({linhas.length})</span>
          )}
        </span>
        <button
          onClick={() => setAberto(!aberto)}
          className={`min-h-[36px] rounded-full px-3 text-xs font-medium ${t.chip} ${t.text}`}
        >
          {aberto ? "Fechar" : "Registrar"}
        </button>
      </div>

      {linhas && linhas.length > 0 && (
        <ul className={`mt-2 space-y-1 text-sm ${t.sub}`}>
          {linhas.map((l) => (
            <li key={l.id}>
              <span className="font-medium">{ROTULO[l.tipo] ?? l.tipo}</span> ·{" "}
              {l.descricao}
            </li>
          ))}
        </ul>
      )}

      {aberto && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_OCORRENCIA.map((op) => (
              <button
                key={op}
                onClick={() => setTipo(op)}
                className={`min-h-[36px] rounded-full px-3 text-xs font-medium ${
                  tipo === op ? "bg-emerald-600 text-white" : `${t.chip} ${t.text}`
                }`}
              >
                {ROTULO[op]}
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="O que aconteceu?"
            className={`w-full rounded-lg border bg-transparent p-2 text-sm outline-none ${t.border} ${t.text}`}
          />
          {erro && <p className="text-xs text-red-500">{erro}</p>}
          <button
            onClick={registrar}
            disabled={pendente || !descricao.trim()}
            className="min-h-[44px] w-full rounded-lg bg-emerald-600 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pendente ? "Registrando…" : "Registrar ocorrência"}
          </button>
          <p className={`text-[11px] ${t.sub}`}>
            Valor e o que o casal vê você decide depois, na prestação de contas.
          </p>
        </div>
      )}
    </div>
  );
}
