"use client";

// O formulário da página profissional, montado por ela (214, 18/10/2026).
// A base (nome, WhatsApp, tipo, data, cidade) fica fixa porque é ela que
// preenche a proposta e o evento; o resto é dela: a introdução, o que
// liga e desliga, as opções de serviço e até 10 perguntas próprias.

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { salvarFormulario } from "@/app/(app)/orcamentos/pagina/actions";
import {
  LIMITES_DO_FORMULARIO as L,
  TIPOS_DE_PERGUNTA,
  erroDoFormulario,
  novoIdDePergunta,
  type FormularioDaPagina,
  type OpcionalDoFormulario,
  type PerguntaDoFormulario,
  type TipoDePergunta,
} from "@/lib/comercial/formulario";

const caixa = "rounded-xl border border-gray-200 bg-white p-5";
const titulo = "text-sm font-semibold text-gray-900";
const entrada =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none";
const botaoLeve =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40";
const icone =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30";

const OPCIONAIS: { chave: OpcionalDoFormulario; rotulo: string }[] = [
  { chave: "email", rotulo: "E-mail" },
  { chave: "convidados", rotulo: "Número de convidados" },
  { chave: "servico", rotulo: "Que tipo de serviço procura" },
  { chave: "mensagem", rotulo: "Mensagem livre" },
];

const comEscolhas = (t: TipoDePergunta) => t === "escolha" || t === "multipla";

function ListaDeOpcoes({
  opcoes,
  max,
  mudar,
  rotulo,
}: {
  opcoes: string[];
  max: number;
  mudar: (o: string[]) => void;
  rotulo: string;
}) {
  return (
    <div className="space-y-2">
      {opcoes.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={entrada}
            value={o}
            maxLength={L.opcao}
            aria-label={`${rotulo} ${i + 1}`}
            onChange={(e) => mudar(opcoes.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button
            type="button"
            className={icone}
            aria-label={`Tirar a opção ${i + 1}`}
            onClick={() => mudar(opcoes.filter((_, j) => j !== i))}
          >
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
      ))}
      {opcoes.length < max && (
        <button type="button" className={botaoLeve} onClick={() => mudar([...opcoes, ""])}>
          <Plus size={14} aria-hidden /> Opção
        </button>
      )}
    </div>
  );
}

export function EditorDoFormulario({
  inicial,
  enderecoPublico,
}: {
  inicial: FormularioDaPagina;
  /** a página no ar, para "Ver como fica"; nulo se ainda não foi publicada */
  enderecoPublico: string | null;
}) {
  const [f, setF] = useState<FormularioDaPagina>(inicial);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [mudou, setMudou] = useState(false);
  const [pendente, iniciar] = useTransition();

  const mexer = (novo: FormularioDaPagina) => {
    setF(novo);
    setMudou(true);
    setAviso(null);
  };
  const mexerNaPergunta = (i: number, parte: Partial<PerguntaDoFormulario>) =>
    mexer({ ...f, perguntas: f.perguntas.map((p, j) => (j === i ? { ...p, ...parte } : p)) });
  const mover = (i: number, d: -1 | 1) => {
    const lista = [...f.perguntas];
    const [p] = lista.splice(i, 1);
    lista.splice(i + d, 0, p);
    mexer({ ...f, perguntas: lista });
  };

  function salvar() {
    const erro = erroDoFormulario(f);
    if (erro) {
      setAviso({ tipo: "erro", texto: erro });
      return;
    }
    iniciar(async () => {
      const r = await salvarFormulario(f);
      if ("error" in r) setAviso({ tipo: "erro", texto: r.error });
      else {
        setAviso({ tipo: "ok", texto: "Formulário salvo." });
        setMudou(false);
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className={caixa}>
        <h2 className={titulo}>Introdução</h2>
        <div className="mt-3 space-y-3">
          <label className="block text-sm text-gray-700">
            Título
            <input
              className={`${entrada} mt-1`}
              value={f.intro_titulo ?? ""}
              maxLength={L.introTitulo}
              placeholder="Conte sobre o seu evento"
              onChange={(e) => mexer({ ...f, intro_titulo: e.target.value || undefined })}
            />
          </label>
          <label className="block text-sm text-gray-700">
            Texto
            <textarea
              className={`${entrada} mt-1`}
              rows={2}
              value={f.intro_texto ?? ""}
              maxLength={L.introTexto}
              placeholder="Vamos planejar juntos? Conte o que você imagina."
              onChange={(e) => mexer({ ...f, intro_texto: e.target.value || undefined })}
            />
          </label>
        </div>
      </section>

      <section className={caixa}>
        <h2 className={titulo}>Campos</h2>
        <p className="mt-1 text-sm text-gray-500">
          Sempre aparecem: nome, WhatsApp, tipo do evento, data e cidade.
        </p>
        <div className="mt-3 divide-y divide-gray-100">
          {OPCIONAIS.map((o) => (
            <div key={o.chave} className="py-3">
              <label className="flex items-center justify-between gap-3 text-sm text-gray-800">
                {o.rotulo}
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={f.mostrar[o.chave]}
                  onChange={(e) => mexer({ ...f, mostrar: { ...f.mostrar, [o.chave]: e.target.checked } })}
                />
              </label>
              {o.chave === "servico" && f.mostrar.servico && (
                <div className="mt-3">
                  <ListaDeOpcoes
                    opcoes={f.servico_opcoes}
                    max={L.servicoOpcoes}
                    rotulo="Opção de serviço"
                    mudar={(servico_opcoes) => mexer({ ...f, servico_opcoes })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={caixa}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={titulo}>Suas perguntas</h2>
          <span className="text-xs text-gray-500">
            {f.perguntas.length} de {L.perguntas}
          </span>
        </div>
        {f.perguntas.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">Nenhuma pergunta sua ainda.</p>
        )}
        <ol className="mt-3 space-y-3">
          {f.perguntas.map((p, i) => (
            <li key={p.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start gap-2">
                <input
                  className={`${entrada} min-w-0 flex-1`}
                  value={p.titulo}
                  maxLength={L.titulo}
                  placeholder="Ex.: Qual o estilo do evento?"
                  aria-label={`Pergunta ${i + 1}`}
                  onChange={(e) => mexerNaPergunta(i, { titulo: e.target.value })}
                />
                <div className="flex gap-1">
                  <button type="button" className={icone} aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>
                    <ArrowUp size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={icone}
                    aria-label="Descer"
                    disabled={i === f.perguntas.length - 1}
                    onClick={() => mover(i, 1)}
                  >
                    <ArrowDown size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={icone}
                    aria-label={`Apagar a pergunta ${i + 1}`}
                    onClick={() => mexer({ ...f, perguntas: f.perguntas.filter((_, j) => j !== i) })}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              </div>
              <input
                className={`${entrada} mt-2`}
                value={p.descricao ?? ""}
                maxLength={L.descricao}
                placeholder="Explicação curta (opcional)"
                aria-label={`Explicação da pergunta ${i + 1}`}
                onChange={(e) => mexerNaPergunta(i, { descricao: e.target.value || undefined })}
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <select
                  className={`${entrada} w-auto`}
                  value={p.tipo}
                  aria-label={`Tipo de resposta da pergunta ${i + 1}`}
                  onChange={(e) => {
                    const tipo = e.target.value as TipoDePergunta;
                    mexerNaPergunta(i, {
                      tipo,
                      opcoes: comEscolhas(tipo) ? (p.opcoes?.length ? p.opcoes : ["", ""]) : undefined,
                    });
                  }}
                >
                  {TIPOS_DE_PERGUNTA.map((t) => (
                    <option key={t.tipo} value={t.tipo}>
                      {t.rotulo}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!!p.obrigatoria}
                    onChange={(e) => mexerNaPergunta(i, { obrigatoria: e.target.checked })}
                  />
                  Obrigatória
                </label>
              </div>
              {comEscolhas(p.tipo) && (
                <div className="mt-3">
                  <ListaDeOpcoes
                    opcoes={p.opcoes ?? []}
                    max={L.opcoesPorPergunta}
                    rotulo="Opção"
                    mudar={(opcoes) => mexerNaPergunta(i, { opcoes })}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
        {f.perguntas.length < L.perguntas && (
          <button
            type="button"
            className={`${botaoLeve} mt-3`}
            onClick={() =>
              mexer({
                ...f,
                perguntas: [
                  ...f.perguntas,
                  { id: novoIdDePergunta(f.perguntas.map((p) => p.id)), titulo: "", tipo: "texto_curto", obrigatoria: false },
                ],
              })
            }
          >
            <Plus size={14} aria-hidden /> Pergunta
          </button>
        )}
      </section>

      <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={salvar}
          disabled={pendente || !mudou}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
        >
          {pendente ? "Salvando…" : "Salvar o formulário"}
        </button>
        {enderecoPublico && (
          <a href={enderecoPublico} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 underline">
            Ver como fica
          </a>
        )}
        {aviso && (
          <p className={`text-sm ${aviso.tipo === "erro" ? "text-red-700" : "text-gray-700"}`} role="status">
            {aviso.texto}
          </p>
        )}
      </div>
    </div>
  );
}
