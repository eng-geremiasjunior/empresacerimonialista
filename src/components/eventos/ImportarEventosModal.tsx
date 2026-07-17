"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, X } from "lucide-react";
import {
  importarEventos,
  type ImportarResultado,
} from "@/app/(app)/eventos/actions";

type LinhaCsv = { cliente: string; tipo: string; data: string; local: string };

// Divide uma linha de CSV respeitando aspas. Aceita "," ou ";".
function parseLinha(linha: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') {
        cur += '"';
        i++;
      } else aspas = !aspas;
    } else if (c === sep && !aspas) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(texto: string): LinhaCsv[] {
  const linhas = texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (linhas.length < 2) return [];
  const sep = linhas[0].includes(";") ? ";" : ",";
  const header = parseLinha(linhas[0], sep).map((h) => h.toLowerCase());
  const idx = (nomes: string[]) =>
    header.findIndex((h) => nomes.some((n) => h.includes(n)));
  const iCli = idx(["cliente", "nome"]);
  const iTipo = idx(["tipo"]);
  const iData = idx(["data"]);
  const iLocal = idx(["local", "cidade", "endereço", "endereco"]);

  return linhas.slice(1).map((linha) => {
    const c = parseLinha(linha, sep);
    return {
      cliente: iCli >= 0 ? c[iCli] ?? "" : c[0] ?? "",
      tipo: iTipo >= 0 ? c[iTipo] ?? "" : c[1] ?? "",
      data: iData >= 0 ? c[iData] ?? "" : c[2] ?? "",
      local: iLocal >= 0 ? c[iLocal] ?? "" : c[3] ?? "",
    };
  });
}

export function ImportarEventosModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [linhas, setLinhas] = useState<LinhaCsv[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ImportarResultado | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroArquivo(null);
    setResultado(null);
    const texto = await file.text();
    const parsed = parseCsv(texto);
    if (parsed.length === 0) {
      setErroArquivo("CSV vazio ou sem linhas de dados.");
      setLinhas([]);
      return;
    }
    setNomeArquivo(file.name);
    setLinhas(parsed);
  }

  function importar() {
    startTransition(async () => {
      const r = await importarEventos(linhas);
      setResultado(r);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Importar eventos (CSV)</h3>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          Colunas: <strong>cliente</strong>, <strong>tipo</strong> (ex.:
          Casamento), <strong>data</strong> (AAAA-MM-DD), <strong>local</strong>.
          Cada evento entra como orçamento.
        </p>

        {!resultado && (
          <>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-6 text-sm font-medium text-gray-600 hover:border-gray-400">
              <FileUp size={16} />
              {nomeArquivo ?? "Escolher arquivo CSV"}
              <input type="file" accept=".csv,text/csv" onChange={escolher} className="hidden" />
            </label>
            {erroArquivo && <p className="mt-2 text-sm text-rose-600">{erroArquivo}</p>}

            {linhas.length > 0 && (
              <>
                <p className="mt-3 text-sm text-gray-600">
                  {linhas.length} linha{linhas.length === 1 ? "" : "s"} detectada
                  {linhas.length === 1 ? "" : "s"}. Prévia:
                </p>
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-left text-gray-400">
                      <tr>
                        <th className="px-2 py-1">Cliente</th>
                        <th className="px-2 py-1">Tipo</th>
                        <th className="px-2 py-1">Data</th>
                        <th className="px-2 py-1">Local</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {linhas.slice(0, 8).map((l, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1">{l.cliente}</td>
                          <td className="px-2 py-1">{l.tipo}</td>
                          <td className="px-2 py-1">{l.data}</td>
                          <td className="px-2 py-1 text-gray-500">{l.local}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
                    Cancelar
                  </button>
                  <button
                    onClick={importar}
                    disabled={pending}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                  >
                    {pending ? "Importando…" : `Importar ${linhas.length}`}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {resultado && (
          <div className="mt-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {resultado.criados} evento{resultado.criados === 1 ? "" : "s"}{" "}
              criado{resultado.criados === 1 ? "" : "s"} com sucesso.
            </div>
            {resultado.erros.length > 0 && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">
                  {resultado.erros.length} linha
                  {resultado.erros.length === 1 ? "" : "s"} com problema:
                </p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {resultado.erros.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      Linha {e.linha}: {e.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={onClose} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                Concluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
