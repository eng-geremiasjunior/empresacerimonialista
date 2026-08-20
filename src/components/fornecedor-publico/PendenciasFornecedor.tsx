"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, MapPin, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import type {
  PendenciaPublica,
  PendenciasData,
} from "@/app/fornecedor/[hash]/page";

type Resposta = Record<string, unknown>;

export function PendenciasFornecedor({
  hash,
  initial,
}: {
  hash: string;
  initial: PendenciasData;
}) {
  const [itens, setItens] = useState<PendenciaPublica[]>(initial.pendencias);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // O prazo é contado a partir de agora, e "agora" no servidor não é o
  // mesmo "agora" do celular do fornecedor. Calcular no primeiro render
  // quebra a hidratação em produção — por isso só depois de montar.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  async function responder(id: string, resposta: Resposta) {
    setEnviando(id);
    setErro(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("responder_solicitacao", {
      p_hash: hash,
      p_solicitacao_id: id,
      p_resposta: resposta,
    });
    setEnviando(null);
    if (error || (data as { error?: string })?.error) {
      setErro("Não deu para registrar sua resposta. Tente de novo.");
      return;
    }
    setItens((atual) =>
      atual.map((i) =>
        i.id === id
          ? { ...i, status: "respondida", respondida_em: new Date().toISOString() }
          : i
      )
    );
  }

  // Um evento por bloco, na ordem em que acontecem: é assim que o
  // fornecedor pensa o trabalho dele.
  const porEvento = useMemo(() => {
    const grupos: { chave: string; ev: PendenciaPublica["evento"]; itens: PendenciaPublica[] }[] = [];
    for (const i of itens) {
      const chave = `${i.evento.nome ?? ""}|${i.evento.data ?? ""}`;
      const achado = grupos.find((g) => g.chave === chave);
      if (achado) achado.itens.push(i);
      else grupos.push({ chave, ev: i.evento, itens: [i] });
    }
    return grupos;
  }, [itens]);

  const abertas = itens.filter((i) => i.status !== "respondida").length;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {initial.empresa.nome ?? "Vela"}
        </p>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">
          Olá, {initial.fornecedor.nome}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {abertas === 0
            ? "Nada pendente com você por aqui."
            : abertas === 1
              ? "Tem uma coisa esperando você."
              : `Tem ${abertas} coisas esperando você.`}
        </p>

        {porEvento.length === 0 && (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">
              Quando a cerimonialista precisar de algo, aparece aqui neste
              mesmo link.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {porEvento.map((g) => (
            <section key={g.chave}>
              <div className="px-1">
                <h2 className="text-sm font-semibold text-gray-900">
                  {g.ev.nome ?? "Evento"}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  {g.ev.data && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400" />
                      {formatDate(g.ev.data)}
                    </span>
                  )}
                  {g.ev.local && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-gray-400" />
                      {g.ev.local}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {g.itens.map((i) => (
                  <ItemPendencia
                    key={i.id}
                    item={i}
                    enviando={enviando === i.id}
                    montado={montado}
                    onResponder={(r) => responder(i.id, r)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {erro && <p className="mt-4 text-center text-sm text-red-600">{erro}</p>}

        <p className="mt-8 text-center text-xs text-gray-400">
          Guarde este link: ele vale para todos os eventos que você faz com{" "}
          {initial.empresa.nome ?? "esta cerimonialista"}.
        </p>
      </div>
    </main>
  );
}

function ItemPendencia({
  item,
  enviando,
  montado,
  onResponder,
}: {
  item: PendenciaPublica;
  enviando: boolean;
  montado: boolean;
  onResponder: (r: Resposta) => void;
}) {
  const [nota, setNota] = useState("");
  const [notaAberta, setNotaAberta] = useState(false);

  if (item.status === "respondida") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <Check size={16} className="shrink-0" />
        <span>{item.titulo} — respondido, obrigado.</span>
      </div>
    );
  }

  const extra = nota.trim() ? { observacao: nota.trim() } : {};

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">{item.titulo}</p>
      {item.prazo_ate && montado && (
        <p className="mt-1 text-xs text-gray-500">{prazoEmPalavras(item.prazo_ate)}</p>
      )}

      {notaAberta && (
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          placeholder="Ex.: chego 14h, não 13h"
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
        />
      )}

      {item.tipo === "confirmacao" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => onResponder({ confirmado: true, ...extra })}
            disabled={enviando}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <Check size={16} />
            {enviando ? "Enviando…" : "Confirmo"}
          </button>
          <button
            onClick={() => onResponder({ confirmado: false, ...extra })}
            disabled={enviando}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <X size={16} />
            Não poderei
          </button>
        </div>
      ) : (
        <button
          onClick={() => onResponder({ feito: true, ...extra })}
          disabled={enviando}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          <Check size={16} />
          {enviando ? "Enviando…" : "Já enviei"}
        </button>
      )}

      {!notaAberta && (
        <button
          onClick={() => setNotaAberta(true)}
          className="mt-2 w-full text-center text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700"
        >
          Quer avisar alguma coisa?
        </button>
      )}
    </div>
  );
}

// Prazo em tempo, não em data: "vence hoje" decide mais rápido que "31/08".
function prazoEmPalavras(prazo: string): string {
  const dias = Math.ceil((Date.parse(prazo) - Date.now()) / 86_400_000);
  if (dias < 0) return "prazo vencido";
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `vence em ${dias} dias`;
}
