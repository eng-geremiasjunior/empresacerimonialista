"use client";

// A caixa de espera: tudo que ela pediu e ainda não voltou, atravessando
// eventos. Leitura com UMA ação — cobrar de novo. A função não é mostrar
// tudo que está pendente: é separar o que está sob controle do que exige
// atenção humana.

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, Phone, Send } from "lucide-react";
import { cobrarDeNovo } from "@/app/(app)/solicitacoes/actions";
import type { GrupoEspera } from "@/lib/espera-core";
import { haDias } from "@/lib/espera-core";

export function EsperaFornecedores({ grupos }: { grupos: GrupoEspera[] }) {
  const [erro, setErro] = useState<string | null>(null);

  const precisam = grupos.filter((g) => g.faixa === "precisa_de_voce");
  const esperando = grupos.filter(
    (g) => g.faixa === "atencao" || g.faixa === "com_o_sistema"
  );

  if (grupos.length === 0) {
    return (
      <section id="espera" className="mt-10">
        <h2 className="text-sm font-semibold text-gray-900">
          Aguardando resposta
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Ninguém te devendo. O que você pedir aparece aqui até voltar.
        </p>
      </section>
    );
  }

  return (
    <section id="espera" className="mt-10 space-y-6">
      {precisam.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Precisa de você
          </h2>
          <div className="mt-3 space-y-3">
            {precisam.map((g) => (
              <CartaoGrupo key={g.supplierId} grupo={g} onErro={setErro} />
            ))}
          </div>
        </div>
      )}

      {esperando.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Aguardando resposta
          </h2>
          <div className="mt-3 space-y-3">
            {esperando.map((g) => (
              <CartaoGrupo key={g.supplierId} grupo={g} onErro={setErro} />
            ))}
          </div>
        </div>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </section>
  );
}

function CartaoGrupo({
  grupo,
  onErro,
}: {
  grupo: GrupoEspera;
  onErro: (e: string | null) => void;
}) {
  const [pendente, iniciar] = useTransition();
  const [cobrada, setCobrada] = useState(false);

  const tomBorda =
    grupo.faixa === "precisa_de_voce"
      ? "border-red-200"
      : grupo.abriuENaoRespondeu
        ? "border-amber-200"
        : "border-gray-200";

  const tarefa = grupo.linhas.find(
    (l) => l.solicitacao.tarefaPendenteId
  )?.solicitacao;

  function cobrar() {
    onErro(null);
    iniciar(async () => {
      const r = await cobrarDeNovo(grupo.supplierId);
      if ("error" in r) onErro(r.error);
      else setCobrada(true);
    });
  }

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${tomBorda}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-gray-900">
          {grupo.fornecedorNome}
        </p>
        {grupo.esperaDias !== null && (
          <span className="text-xs tabular-nums text-gray-500">
            esperando {haDias(grupo.esperaDias)}
          </span>
        )}
      </div>

      <ul className="mt-2 space-y-1">
        {grupo.linhas.map((l) => (
          <li key={l.solicitacao.id} className="text-sm text-gray-600">
            <span>{l.solicitacao.titulo}</span>
            <span className="text-gray-400">
              {" "}
              · {l.solicitacao.eventoNome ?? "evento"}
            </span>
            <span
              className={`block text-xs ${
                l.abriuENaoRespondeu ? "text-amber-700" : "text-gray-400"
              }`}
            >
              {l.abriuENaoRespondeu && (
                <Eye size={11} className="mr-1 inline-block align-[-1px]" />
              )}
              {l.rotulo}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {tarefa?.tarefaPendenteId ? (
          <Link
            href={`/eventos/${tarefa.eventId}/organizacao?tarefa=${tarefa.tarefaPendenteId}`}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
          >
            <Phone size={13} />
            Abrir a tarefa de ligar
          </Link>
        ) : grupo.anexaveisIds.length > 0 ? (
          <button
            onClick={cobrar}
            disabled={pendente || cobrada}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Send size={13} />
            {cobrada
              ? "Na fila de hoje"
              : pendente
                ? "Montando…"
                : "Cobrar de novo"}
          </button>
        ) : null}

        {grupo.ultimaCobrancaDias !== null &&
          grupo.ultimaCobrancaDias < 3 &&
          !cobrada && (
            <span className="text-xs text-gray-400">
              cobrada {haDias(grupo.ultimaCobrancaDias)}
            </span>
          )}
      </div>
    </div>
  );
}
