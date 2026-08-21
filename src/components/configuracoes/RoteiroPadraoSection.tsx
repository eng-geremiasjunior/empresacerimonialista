"use client";

// Os deslocamentos do roteiro — o ritmo da casa. Cada cerimonialista tem
// o dela, e ajusta depois de dois casamentos de uso. Falar em tempo
// ("3h antes"), nunca em minutos com sinal.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type ItemRoteiroPadrao = {
  id: string;
  tipoEvento: string;
  titulo: string;
  offsetMin: number;
  duracaoMin: number | null;
  ordem: number;
};

const TIPOS: { key: string; label: string; ancora: string }[] = [
  { key: "casamento", label: "Casamento", ancora: "a cerimônia" },
  { key: "debutante", label: "Debutante", ancora: "a entrada" },
];

function emPalavras(offsetMin: number, ancora: string): string {
  if (offsetMin === 0) return `é ${ancora}`;
  const abs = Math.abs(offsetMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const tempo = h > 0 ? (m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`) : `${m}min`;
  return offsetMin < 0 ? `${tempo} antes` : `${tempo} depois`;
}

export function RoteiroPadraoSection({ itens }: { itens: ItemRoteiroPadrao[] }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("casamento");
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const doTipo = useMemo(
    () => itens.filter((i) => i.tipoEvento === tipo).sort((a, b) => a.ordem - b.ordem),
    [itens, tipo]
  );
  const ancora = TIPOS.find((t) => t.key === tipo)?.ancora ?? "a cerimônia";

  function salvar(id: string, patch: { offset_min?: number; duracao_min?: number | null }) {
    setErro(null);
    iniciar(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("metodo_roteiro_item")
        .update(patch)
        .eq("id", id);
      if (error) setErro("Não deu para salvar. Só a proprietária ajusta o modelo.");
      else router.refresh();
    });
  }

  if (itens.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-6 py-5">
      <h2 className="text-sm font-semibold text-gray-900">Roteiro do dia</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        O horário de cada momento nasce da hora d{ancora === "a entrada" ? "a entrada" : "a cerimônia"} mais estes
        deslocamentos. Evento novo já nasce com o seu ritmo.
      </p>

      <div className="mt-3 flex gap-2">
        {TIPOS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTipo(t.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tipo === t.key
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-gray-100">
        {doTipo.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
              {i.titulo}
            </span>
            <span className="w-24 shrink-0 text-right text-xs text-gray-500">
              {emPalavras(i.offsetMin, ancora)}
            </span>
            <input
              type="number"
              step={15}
              defaultValue={i.offsetMin}
              disabled={pendente}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v !== i.offsetMin) {
                  salvar(i.id, { offset_min: Math.round(v) });
                }
              }}
              aria-label={`Deslocamento de ${i.titulo} em minutos`}
              title="Minutos em relação à âncora (negativo = antes)"
              className="w-20 shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm tabular-nums text-gray-800 focus:border-gray-400 focus:outline-none"
            />
            <input
              type="number"
              step={15}
              min={0}
              defaultValue={i.duracaoMin ?? ""}
              placeholder="—"
              disabled={pendente}
              onBlur={(e) => {
                const bruto = e.target.value.trim();
                const v = bruto === "" ? null : Math.round(Number(bruto));
                if (v !== i.duracaoMin && (v === null || Number.isFinite(v))) {
                  salvar(i.id, { duracao_min: v });
                }
              }}
              aria-label={`Duração de ${i.titulo} em minutos`}
              title="Duração típica, em minutos"
              className="w-16 shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm tabular-nums text-gray-800 focus:border-gray-400 focus:outline-none"
            />
          </li>
        ))}
      </ul>

      <p className="mt-2 text-right text-[11px] text-gray-400">
        minutos em relação à âncora · duração
      </p>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </section>
  );
}
