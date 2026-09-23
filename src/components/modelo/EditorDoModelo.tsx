"use client";

// O editor do modelo dela (23/09/2026): o planejamento com que cada
// evento de um tipo nasce. Três jeitos de chegar ao modelo certo:
//   * importar o checklist que ela já usa (planilha, Word, PDF ou texto
//     colado) — a leitura propõe, ela confere e salva;
//   * editar aqui: nome, prazo, quem faz, tirar e voltar;
//   * a partir de um evento, pelo "Salvar como meu modelo" (170).
// Nada apaga: tirar é "fora do modelo" — nasce "não se aplica".

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarAssunto,
  adicionarDecisao,
  alternarNoModelo,
  importarNoModelo,
  mudarPrazo,
  mudarResponsavel,
  renomearAssunto,
  renomearDecisao,
} from "@/app/(app)/configuracoes/modelo/actions";
import { PRAZOS, prazoEmTexto, type PropostaDoModelo, type Responsavel } from "@/lib/modelo-proprio";
import { ACEITOS, textoDoArquivo } from "@/lib/ler-checklist";
import { rotuloResponsavelTitulo } from "@/lib/papel";

export type AssuntoDoModelo = {
  id: string;
  nome: string;
  /** false = liga conforme o cenário do evento (ex.: cerimônia religiosa) */
  ligadoSempre: boolean;
  proprio: boolean;
  decisoes: {
    id: string;
    titulo: string;
    responsavel: Responsavel;
    diasAntes: number | null;
    fora: boolean;
    proprio: boolean;
  }[];
};

const RESPONSAVEIS: Responsavel[] = ["cerimonialista", "noivos", "ambos"];
const campo =
  "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none";

export function EditorDoModelo({
  tipo,
  assuntos,
  podeEditar,
}: {
  tipo: string;
  assuntos: AssuntoDoModelo[];
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ id: string; texto: string; tipo: "assunto" | "decisao" } | null>(null);
  const [novaEm, setNovaEm] = useState<string | null>(null);
  const [novaTexto, setNovaTexto] = useState("");
  const [novoAssunto, setNovoAssunto] = useState("");

  const rotulo = (r: Responsavel) => (r === "noivos" ? rotuloResponsavelTitulo("noivos", tipo) : r === "ambos" ? "Juntos" : "Cerimonialista");

  function rodar(f: () => Promise<{ error: string } | { success: true }>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await f();
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      depois?.();
      router.refresh();
    });
  }

  const total = assuntos.reduce((s, a) => s + a.decisoes.length, 0);
  const fora = assuntos.reduce((s, a) => s + a.decisoes.filter((d) => d.fora).length, 0);

  return (
    <div className="space-y-5">
      {podeEditar ? (
        <ImportarChecklist tipo={tipo} rotulo={rotulo} />
      ) : (
        <p className="text-sm text-gray-500">Só a proprietária da conta muda o modelo.</p>
      )}

      <p className="text-sm text-gray-500">
        {total === 0
          ? "Este tipo ainda não tem modelo."
          : `${total} ${total === 1 ? "decisão" : "decisões"} em ${assuntos.length} ${assuntos.length === 1 ? "assunto" : "assuntos"}${
              fora ? ` · ${fora} fora do modelo` : ""
            }`}
      </p>

      <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
        {assuntos.map((a) => (
          <section key={a.id} className="px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-2">
              {editando?.id === a.id ? (
                <input
                  autoFocus
                  className={`${campo} font-semibold`}
                  value={editando.texto}
                  onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
                  onBlur={() => setEditando(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") rodar(() => renomearAssunto(a.id, editando.texto), () => setEditando(null));
                    if (e.key === "Escape") setEditando(null);
                  }}
                />
              ) : (
                <h2
                  className={`text-[15px] font-semibold text-gray-900 ${podeEditar ? "cursor-text" : ""}`}
                  onClick={() => podeEditar && setEditando({ id: a.id, texto: a.nome, tipo: "assunto" })}
                >
                  {a.nome}
                </h2>
              )}
              {!a.ligadoSempre && <span className="text-xs text-gray-500">liga conforme o cenário do evento</span>}
            </div>

            <ul className="mt-2 space-y-1">
              {a.decisoes.map((d) => (
                <li
                  key={d.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5 hover:bg-gray-50 ${d.fora ? "opacity-50" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    {editando?.id === d.id ? (
                      <input
                        autoFocus
                        className={`${campo} w-full`}
                        value={editando.texto}
                        onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
                        onBlur={() => setEditando(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") rodar(() => renomearDecisao(d.id, editando.texto), () => setEditando(null));
                          if (e.key === "Escape") setEditando(null);
                        }}
                      />
                    ) : (
                      <span
                        className={`text-sm text-gray-900 ${d.fora ? "line-through" : ""} ${podeEditar ? "cursor-text" : ""}`}
                        onClick={() => podeEditar && !d.fora && setEditando({ id: d.id, texto: d.titulo, tipo: "decisao" })}
                      >
                        {d.titulo}
                      </span>
                    )}
                  </span>
                  {podeEditar && !d.fora ? (
                    <>
                      <select
                        aria-label="Prazo"
                        className={campo}
                        value={d.diasAntes === null ? "" : String(d.diasAntes)}
                        disabled={pendente}
                        onChange={(e) => rodar(() => mudarPrazo(d.id, e.target.value === "" ? null : Number(e.target.value)))}
                      >
                        {(PRAZOS.includes(d.diasAntes) ? PRAZOS : [...PRAZOS, d.diasAntes]).map((p) => (
                          <option key={String(p)} value={p === null ? "" : String(p)}>
                            {prazoEmTexto(p)}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Quem faz"
                        className={campo}
                        value={d.responsavel}
                        disabled={pendente}
                        onChange={(e) => rodar(() => mudarResponsavel(d.id, e.target.value as Responsavel))}
                      >
                        {RESPONSAVEIS.map((r) => (
                          <option key={r} value={r}>
                            {rotulo(r)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="text-xs text-gray-500 hover:text-gray-900"
                        disabled={pendente}
                        onClick={() => rodar(() => alternarNoModelo(d.id, true))}
                      >
                        tirar
                      </button>
                    </>
                  ) : (
                    <span className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{d.fora ? "fora do modelo" : `${prazoEmTexto(d.diasAntes)} · ${rotulo(d.responsavel)}`}</span>
                      {podeEditar && d.fora && (
                        <button
                          type="button"
                          className="font-medium text-gray-700 hover:text-gray-900"
                          disabled={pendente}
                          onClick={() => rodar(() => alternarNoModelo(d.id, false))}
                        >
                          voltar
                        </button>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {podeEditar &&
              (novaEm === a.id ? (
                <form
                  className="mt-2 flex gap-2 px-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    rodar(() => adicionarDecisao(a.id, novaTexto, null, "ambos"), () => {
                      setNovaTexto("");
                      setNovaEm(null);
                    });
                  }}
                >
                  <input
                    autoFocus
                    className={`${campo} flex-1`}
                    placeholder="Nova decisão"
                    value={novaTexto}
                    onChange={(e) => setNovaTexto(e.target.value)}
                  />
                  <button type="submit" disabled={pendente || !novaTexto.trim()} className="rounded-lg bg-gray-900 px-3 text-sm font-medium text-white disabled:opacity-40">
                    Adicionar
                  </button>
                  <button type="button" className="px-2 text-sm text-gray-500" onClick={() => setNovaEm(null)}>
                    Cancelar
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="mt-1 px-2 text-sm text-gray-500 hover:text-gray-900"
                  onClick={() => {
                    setNovaEm(a.id);
                    setNovaTexto("");
                  }}
                >
                  + decisão
                </button>
              ))}
          </section>
        ))}

        {podeEditar && (
          <form
            className="flex gap-2 px-5 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              rodar(() => adicionarAssunto(tipo, novoAssunto), () => setNovoAssunto(""));
            }}
          >
            <input
              className={`${campo} flex-1`}
              placeholder="Novo assunto (ex.: Lembrancinhas)"
              value={novoAssunto}
              onChange={(e) => setNovoAssunto(e.target.value)}
            />
            <button type="submit" disabled={pendente || !novoAssunto.trim()} className="rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-800 disabled:opacity-40">
              + assunto
            </button>
          </form>
        )}
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Importar o checklist que ela já usa                                 */
/* ------------------------------------------------------------------ */

function ImportarChecklist({ tipo, rotulo }: { tipo: string; rotulo: (r: Responsavel) => string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [proposta, setProposta] = useState<PropostaDoModelo | null>(null);
  // chave "assunto:decisao" das marcadas
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [feito, setFeito] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  async function escolher(f: File | undefined) {
    if (!f) return;
    setErro(null);
    setArquivo(f.name);
    try {
      setTexto(await textoDoArquivo(f));
    } catch (e) {
      setArquivo(null);
      setErro(e instanceof Error ? e.message : "Não consegui abrir esse arquivo.");
    }
  }

  async function ler() {
    setErro(null);
    setLendo(true);
    setProposta(null);
    try {
      const r = await fetch("/api/ai/modelo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, texto }),
      });
      const j = (await r.json()) as { proposta?: PropostaDoModelo; error?: string };
      if (!r.ok || !j.proposta) {
        setErro(j.error ?? "Não consegui ler agora.");
        return;
      }
      setProposta(j.proposta);
      const todas = new Set<string>();
      j.proposta.assuntos.forEach((a, i) =>
        a.decisoes.forEach((d, k) => {
          if (!d.jaExiste) todas.add(`${i}:${k}`);
        })
      );
      setMarcadas(todas);
    } catch {
      setErro("Não consegui ler agora. Tente de novo.");
    } finally {
      setLendo(false);
    }
  }

  function salvar() {
    if (!proposta) return;
    const assuntos = proposta.assuntos
      .map((a, i) => ({
        nome: a.nome,
        objetivoId: a.objetivoId,
        decisoes: a.decisoes
          .filter((_, k) => marcadas.has(`${i}:${k}`))
          .map((d) => ({ titulo: d.titulo, diasAntes: d.diasAntes, responsavel: d.responsavel })),
      }))
      .filter((a) => a.decisoes.length > 0);
    setErro(null);
    iniciar(async () => {
      const r = await importarNoModelo(tipo, assuntos);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setFeito(
        `${r.decisoes} ${r.decisoes === 1 ? "decisão entrou" : "decisões entraram"} no seu modelo` +
          (r.assuntos ? `, em ${r.assuntos} ${r.assuntos === 1 ? "assunto novo" : "assuntos novos"}.` : ".")
      );
      setProposta(null);
      setTexto("");
      setArquivo(null);
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setAberto(true);
            setFeito(null);
          }}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Importar meu checklist
        </button>
        <span className="text-sm text-gray-500">planilha, Word, PDF ou texto colado</span>
        {feito && <span className="text-sm font-medium text-gray-900">{feito}</span>}
      </div>
    );
  }

  const nMarcadas = marcadas.size;

  return (
    <section className="rounded-xl border border-gray-300 bg-white px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-gray-900">Importar meu checklist</h2>
        <button type="button" className="text-sm text-gray-500" onClick={() => setAberto(false)}>
          Fechar
        </button>
      </div>

      {!proposta ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={entrada}
              type="file"
              accept={ACEITOS}
              className="hidden"
              onChange={(e) => escolher(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => entrada.current?.click()}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:border-gray-500"
            >
              Escolher arquivo
            </button>
            <span className="text-sm text-gray-500">{arquivo ?? ".xlsx, .docx, .pdf — ou cole abaixo"}</span>
          </div>
          <textarea
            className={`${campo} mt-3 h-40 w-full font-mono text-[13px]`}
            placeholder={"12 meses antes\n- Definir a data\n- Contratar o espaço\n\n6 meses antes\n- Degustação do buffet"}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={lendo || texto.trim().length < 20}
              onClick={ler}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {lendo ? "Lendo…" : "Ler o checklist"}
            </button>
          </div>
        </>
      ) : (
        <>
          <ul className="mt-3 space-y-4">
            {proposta.assuntos.map((a, i) => (
              <li key={i}>
                <p className="text-sm font-semibold text-gray-900">
                  {a.nome}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {a.objetivoId ? "assunto que você já tem" : "assunto novo"}
                  </span>
                </p>
                <ul className="mt-1 space-y-1">
                  {a.decisoes.map((d, k) => {
                    const chave = `${i}:${k}`;
                    return (
                      <li key={k}>
                        <label className={`flex items-start gap-2.5 text-sm ${d.jaExiste ? "text-gray-400" : "text-gray-900"}`}>
                          <input
                            type="checkbox"
                            disabled={d.jaExiste}
                            checked={marcadas.has(chave)}
                            onChange={(e) => {
                              const novo = new Set(marcadas);
                              if (e.target.checked) novo.add(chave);
                              else novo.delete(chave);
                              setMarcadas(novo);
                            }}
                            className="mt-0.5"
                          />
                          <span>
                            {d.titulo}
                            <span className="text-xs text-gray-500">
                              {d.jaExiste
                                ? " · já está no seu modelo"
                                : ` · ${prazoEmTexto(d.diasAntes)} · ${rotulo(d.responsavel)}`}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={salvando || nMarcadas === 0}
              onClick={salvar}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {salvando ? "Salvando…" : `Salvar ${nMarcadas} no modelo`}
            </button>
            <button type="button" className="text-sm text-gray-500" onClick={() => setProposta(null)}>
              Voltar ao texto
            </button>
          </div>
        </>
      )}

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
    </section>
  );
}
