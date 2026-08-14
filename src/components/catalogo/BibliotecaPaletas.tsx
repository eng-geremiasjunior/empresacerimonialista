"use client";

// A biblioteca de paletas da empresa. Ferramenta de trabalho: a paleta
// se monta uma vez e serve todos os casamentos.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PaletaDaBiblioteca } from "@/lib/guia-shared";
import {
  criarPaleta,
  duplicarPaleta,
  removerPaleta,
} from "@/app/(app)/catalogo/paletas/actions";

const PAPEIS = ["principal", "apoio", "neutro", "acento"] as const;

const LINHA_VAZIA = { nome: "", papel: "apoio" as string, hex: "" };

export function BibliotecaPaletas({ paletas }: { paletas: PaletaDaBiblioteca[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [sensacao, setSensacao] = useState("");
  const [cores, setCores] = useState([
    { ...LINHA_VAZIA, papel: "principal" },
    { ...LINHA_VAZIA },
  ]);
  const [erro, setErro] = useState<string | null>(null);

  const doSistema = paletas.filter((p) => p.doSistema);
  const daEmpresa = paletas.filter((p) => !p.doSistema);

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await criarPaleta(nome, sensacao, cores);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setNome("");
      setSensacao("");
      setCores([{ ...LINHA_VAZIA, papel: "principal" }, { ...LINHA_VAZIA }]);
      setCriando(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Suas paletas</h2>
          {!criando && (
            <button
              type="button"
              onClick={() => setCriando(true)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-gray-400"
            >
              Nova paleta
            </button>
          )}
        </div>

        {criando && (
          <div className="mt-3 rounded-xl border border-gray-300 bg-white p-4 space-y-3">
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Nome da paleta (ex.: Manhã de Campo)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              placeholder="A que casamento ela serve? (a frase que a noiva lê)"
              value={sensacao}
              onChange={(e) => setSensacao(e.target.value)}
            />

            <div className="space-y-2">
              {cores.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="h-8 w-8 shrink-0 rounded-md border border-gray-200"
                    style={{ background: /^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : "#F3F4F5" }}
                  />
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    placeholder="Nome da cor"
                    value={c.nome}
                    onChange={(e) => {
                      const n = [...cores];
                      n[i] = { ...c, nome: e.target.value };
                      setCores(n);
                    }}
                  />
                  <input
                    className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    placeholder="#A9603F"
                    value={c.hex}
                    onChange={(e) => {
                      const n = [...cores];
                      n[i] = { ...c, hex: e.target.value };
                      setCores(n);
                    }}
                  />
                  <select
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    value={c.papel}
                    onChange={(e) => {
                      const n = [...cores];
                      n[i] = { ...c, papel: e.target.value };
                      setCores(n);
                    }}
                  >
                    {PAPEIS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  {cores.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setCores(cores.filter((_, j) => j !== i))}
                      className="px-1 text-gray-400 hover:text-gray-600"
                      title="Remover cor"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {cores.length < 5 && (
                <button
                  type="button"
                  onClick={() => setCores([...cores, { ...LINHA_VAZIA }])}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  + cor
                </button>
              )}
            </div>

            {erro && <p className="text-sm text-red-700">{erro}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={pendente}
                onClick={salvar}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Salvar paleta
              </button>
              <button
                type="button"
                onClick={() => setCriando(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {daEmpresa.length === 0 && !criando ? (
          <p className="mt-3 text-sm text-gray-500">
            Você ainda não montou nenhuma. Pode começar duplicando uma do
            acervo abaixo e ajustando.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {daEmpresa.map((p) => (
              <Cartao
                key={p.id}
                paleta={p}
                pendente={pendente}
                acao={{
                  rotulo: "Remover",
                  fn: () =>
                    iniciar(async () => {
                      await removerPaleta(p.id);
                      router.refresh();
                    }),
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900">Acervo</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Vêm prontas. Para ajustar uma, duplique — a original fica intacta
          para os outros eventos.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {doSistema.map((p) => (
            <Cartao
              key={p.id}
              paleta={p}
              pendente={pendente}
              acao={{
                rotulo: "Duplicar",
                fn: () =>
                  iniciar(async () => {
                    await duplicarPaleta(p.id);
                    router.refresh();
                  }),
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Cartao({
  paleta,
  pendente,
  acao,
}: {
  paleta: PaletaDaBiblioteca;
  pendente: boolean;
  acao: { rotulo: string; fn: () => void };
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{paleta.nome}</h3>
          {paleta.sensacao && (
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
              {paleta.sensacao}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={pendente}
          onClick={acao.fn}
          className="shrink-0 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium hover:border-gray-400 disabled:opacity-50"
        >
          {acao.rotulo}
        </button>
      </div>
      <div className="mt-3 flex gap-1.5">
        {paleta.cores.map((c) => (
          <span
            key={c.id}
            title={`${c.nome} · ${c.papel} · ${c.hex}`}
            className="h-10 flex-1 rounded-md"
            style={{
              background: c.hex,
              boxShadow: "0 0 0 1px rgba(70,56,42,.14) inset",
            }}
          />
        ))}
      </div>
    </div>
  );
}
