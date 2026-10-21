"use client";

// Reuniões do evento (21/10/2026, fase 3). Enxuto de propósito (pedido do
// dono: nada de tela poluída): a próxima reunião com a pauta; as outras
// numa linha cada. "Registrar o que ficou decidido" abre a caixa da
// conversa (escrita ou áudio) e, depois da leitura, o pacote para conferir.

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MarcaDaIa } from "@/components/MarcaDaIa";
import { AudioParaTexto } from "@/components/AudioParaTexto";
import { linkCompartilharWhatsapp, linkWhatsapp } from "@/lib/whatsapp-link";
import { dataBR } from "@/lib/ia-semana";
import { textoDaAta, type PacoteDaReuniao } from "@/lib/ia-reuniao";
import type { Reuniao } from "@/lib/supabase/ia-reuniao-dados";
import { marcarReuniao } from "@/app/(app)/eventos/[id]/planejamento/caderno-actions";
import { confirmarReuniao, descartarReuniao, desfazerReuniao, guardarPauta } from "@/app/(app)/eventos/[id]/reunioes/ia-actions";

const primario =
  "inline-flex items-center gap-1.5 rounded-[9px] bg-[var(--mo-destaque,#244C50)] px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50";
const secundario =
  "inline-flex items-center gap-1.5 rounded-[9px] border border-stone-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50";
const discreto = "rounded-[9px] px-3 py-1.5 text-[12.5px] font-semibold text-stone-500 hover:bg-stone-100";
const campo = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-[13px] focus:border-stone-500 focus:outline-none";

const quando = (r: Reuniao) => `${dataBR(r.data)}${r.hora ? ` · ${r.hora.slice(0, 5)}` : ""}`;

export function ReunioesDoEvento({
  eventId,
  hoje,
  reunioes,
  proximaId,
  pauta,
  lembrete,
  telefone,
  aviso,
  desfazivel,
}: {
  eventId: string;
  hoje: string;
  reunioes: Reuniao[];
  proximaId: string | null;
  pauta: string[];
  lembrete: string | null;
  telefone: string | null;
  aviso: string | null;
  desfazivel: string | null;
}) {
  const router = useRouter();
  const [registrando, setRegistrando] = useState<{ compromissoId: string | null; data: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [pautaGuardada, setPautaGuardada] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [nova, setNova] = useState({ titulo: "Reunião com a família", data: "", hora: "" });
  const [ultimo, setUltimo] = useState<string | null>(desfazivel);

  const proxima = reunioes.find((r) => r.id === proximaId) ?? null;
  const outras = reunioes.filter((r) => r.id !== proximaId).sort((a, b) => b.data.localeCompare(a.data));

  function guardar() {
    if (!proxima) return;
    iniciar(async () => {
      const r = await guardarPauta(eventId, proxima.id, `Pauta de ${dataBR(proxima.data)}\n${pauta.map((p) => `- ${p}`).join("\n")}`);
      if (r.error) setErro(r.error);
      else setPautaGuardada(true);
    });
  }

  function marcar() {
    iniciar(async () => {
      const r = await marcarReuniao(eventId, { titulo: nova.titulo, data: nova.data, hora: nova.hora || null });
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setMarcando(false);
      router.refresh();
    });
  }

  function desfazer() {
    if (!ultimo || !window.confirm("Desfazer o último registro? A ata sai do Caderno, as decisões voltam a ficar em aberto e as tarefas saem.")) return;
    iniciar(async () => {
      const r = await desfazerReuniao(eventId, ultimo);
      if (r.error) setErro(r.error);
      else {
        setUltimo(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-[880px] pb-12">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[20px] font-semibold tracking-tight text-gray-900">Reuniões</h1>
        <div className="flex flex-wrap items-center gap-2">
          {aviso && <span className="text-[12px] text-stone-500">{aviso}</span>}
          {ultimo && (
            <button onClick={desfazer} disabled={pendente} className={discreto}>
              Desfazer o último registro
            </button>
          )}
          <button onClick={() => setRegistrando({ compromissoId: null, data: hoje })} className={secundario}>
            <MarcaDaIa />
            Registrar uma conversa
          </button>
        </div>
      </header>

      {registrando && (
        <Registro
          eventId={eventId}
          compromissoId={registrando.compromissoId}
          data={registrando.data}
          fechar={() => setRegistrando(null)}
          aoConfirmar={(id) => {
            setUltimo(id);
            setRegistrando(null);
            router.refresh();
          }}
          telefone={telefone}
        />
      )}

      {proxima ? (
        <section className="mb-8">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-stone-500">Próxima</p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[15px] font-semibold text-gray-900">
              {proxima.titulo} <span className="font-normal text-stone-500">· {quando(proxima)}</span>
            </p>
          </div>
          {pauta.length > 0 ? (
            <>
              <ul className="mt-2 space-y-1 text-[13.5px] text-gray-800">
                {pauta.map((p) => (
                  <li key={p}>— {p}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={guardar} disabled={pendente || pautaGuardada} className={secundario}>
                  {pautaGuardada ? "Pauta no Caderno" : "Guardar a pauta no Caderno"}
                </button>
                {lembrete && (
                  <a
                    href={linkWhatsapp(telefone, lembrete) ?? linkCompartilharWhatsapp(lembrete)}
                    target="_blank"
                    rel="noopener"
                    className={secundario}
                  >
                    Lembrete no WhatsApp
                  </a>
                )}
                <button onClick={() => setRegistrando({ compromissoId: proxima.id, data: proxima.data })} className={discreto}>
                  Registrar o que ficou decidido
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-[13px] text-stone-500">Nada em aberto com a família.</p>
          )}
        </section>
      ) : (
        <section className="mb-8">
          {marcando ? (
            <div className="flex flex-wrap items-end gap-2">
              <input value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })} className={`${campo} max-w-[260px]`} />
              <input type="date" value={nova.data} min={hoje} onChange={(e) => setNova({ ...nova, data: e.target.value })} className={`${campo} max-w-[160px]`} />
              <input type="time" value={nova.hora} onChange={(e) => setNova({ ...nova, hora: e.target.value })} className={`${campo} max-w-[120px]`} />
              <button onClick={marcar} disabled={pendente || !nova.data} className={primario}>
                Marcar
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-stone-600">
              Nenhuma reunião marcada.{" "}
              <button onClick={() => setMarcando(true)} className="font-semibold text-[var(--mo-destaque,#244C50)] hover:underline">
                Marcar uma
              </button>
            </p>
          )}
        </section>
      )}

      {outras.length > 0 && (
        <section>
          <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wider text-stone-500">Outras</p>
          <ul className="divide-y divide-stone-100">
            {outras.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-[13.5px] text-gray-900">
                  {r.titulo} <span className="text-stone-500">· {quando(r)}</span>
                  {r.temAta && <span className="ml-2 text-[12px] text-stone-500">com ata</span>}
                </span>
                {r.data <= hoje && !r.temAta && (
                  <button onClick={() => setRegistrando({ compromissoId: r.id, data: r.data })} className={discreto}>
                    Registrar o que ficou decidido
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {erro && <p className="mt-3 text-sm text-rose-600">{erro}</p>}
    </div>
  );
}

function Registro({
  eventId,
  compromissoId,
  data,
  fechar,
  aoConfirmar,
  telefone,
}: {
  eventId: string;
  compromissoId: string | null;
  data: string;
  fechar: () => void;
  aoConfirmar: (trabalhoId: string) => void;
  telefone: string | null;
}) {
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [trabalhoId, setTrabalhoId] = useState<string | null>(null);
  const [pacote, setPacote] = useState<PacoteDaReuniao | null>(null);
  const [ata, setAta] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [verMensagem, setVerMensagem] = useState(false);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [feito, setFeito] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  async function ler() {
    setErro(null);
    setLendo(true);
    try {
      const r = await fetch("/api/ai/reuniao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, compromissoId, texto }),
      });
      const j = (await r.json().catch(() => ({}))) as { trabalhoId?: string; pacote?: PacoteDaReuniao; error?: string };
      if (!r.ok || !j.pacote || !j.trabalhoId) throw new Error(j.error ?? "A leitura não respondeu agora. Tente de novo.");
      setTrabalhoId(j.trabalhoId);
      setPacote(j.pacote);
      setAta(textoDaAta(data, j.pacote.ata, j.pacote.decisoes));
      setMensagem(j.pacote.mensagem?.texto ?? "");
      setMarcadas(
        new Set([...j.pacote.decisoes, ...j.pacote.tarefas, ...j.pacote.roteiro].filter((x) => x.marcada).map((x) => x.chave))
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler.");
    } finally {
      setLendo(false);
    }
  }

  function alternar(chave: string) {
    const s = new Set(marcadas);
    if (s.has(chave)) s.delete(chave);
    else s.add(chave);
    setMarcadas(s);
  }

  function confirmar() {
    if (!trabalhoId) return;
    setErro(null);
    iniciar(async () => {
      const r = await confirmarReuniao(eventId, trabalhoId, Array.from(marcadas), ata);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      const partes = [
        "Ata no Caderno",
        r.feito.decisoes && `${r.feito.decisoes} ${r.feito.decisoes === 1 ? "decisão" : "decisões"}`,
        r.feito.tarefas && `${r.feito.tarefas} ${r.feito.tarefas === 1 ? "tarefa" : "tarefas"}`,
        r.feito.horarios && `${r.feito.horarios} ${r.feito.horarios === 1 ? "horário" : "horários"}`,
      ].filter(Boolean);
      setFeito(`${partes.join(" · ")}.${r.recusadas.length ? ` Ficou de fora: ${r.recusadas.join("; ")}.` : ""}`);
      aoConfirmar(trabalhoId);
    });
  }

  function descartar() {
    if (trabalhoId) void descartarReuniao(eventId, trabalhoId);
    fechar();
  }

  if (feito) return <p className="mb-6 text-[13px] text-stone-700">{feito}</p>;

  return (
    <section className="mb-8 rounded-xl border border-stone-200 bg-[#FAF8F5] p-4">
      {!pacote ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900">O que foi conversado</p>
            <button onClick={fechar} className="text-[12.5px] text-stone-500 hover:underline">
              Fechar
            </button>
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            placeholder={"Escreva do seu jeito, ou grave/mande o áudio\n\nEx.: fechamos o buffet Sabor do Mar, menu 2. A Ana vai mandar a lista final até sexta. A entrada da noiva passa para 10h15."}
            className={`${campo} mt-2`}
          />
          <div className="mt-2">
            <AudioParaTexto onTexto={(t) => setTexto((x) => (x.trim() ? `${x.trim()}\n${t}` : t))} />
          </div>
          <button onClick={() => void ler()} disabled={lendo || texto.trim().length < 20} className={`${primario} mt-3`}>
            <MarcaDaIa naCorDoTexto />
            {lendo ? "Lendo…" : "Ler a conversa"}
          </button>
        </>
      ) : (
        <>
          <Grupo titulo="Ata (vai para o Caderno)">
            <textarea value={ata} onChange={(e) => setAta(e.target.value)} rows={Math.min(14, ata.split("\n").length + 1)} className={campo} />
          </Grupo>
          {pacote.decisoes.length > 0 && (
            <Grupo titulo={`Decisões tomadas (${pacote.decisoes.length})`}>
              {pacote.decisoes.map((d) => (
                <Linha key={d.chave} marcada={marcadas.has(d.chave)} alternar={() => alternar(d.chave)} rodape={d.trecho}>
                  {d.titulo}
                  {d.detalhe && <span className="text-stone-500"> · {d.detalhe}</span>}
                </Linha>
              ))}
            </Grupo>
          )}
          {pacote.tarefas.length > 0 && (
            <Grupo titulo={`Tarefas (${pacote.tarefas.length})`}>
              {pacote.tarefas.map((t) => (
                <Linha key={t.chave} marcada={marcadas.has(t.chave)} alternar={() => alternar(t.chave)} rodape={t.trecho}>
                  {t.titulo}
                  <span className="text-stone-500">
                    {" "}
                    · {t.responsavel === "noivos" ? "família" : "você"} · até {dataBR(t.prazo)}
                  </span>
                </Linha>
              ))}
            </Grupo>
          )}
          {pacote.roteiro.length > 0 && (
            <Grupo titulo={`Horários do dia (${pacote.roteiro.length})`}>
              {pacote.roteiro.map((r) => (
                <Linha key={r.chave} marcada={marcadas.has(r.chave)} alternar={() => alternar(r.chave)} rodape={r.trecho}>
                  {r.titulo}
                  <span className="text-stone-500">
                    {" "}
                    · {r.antes ?? "sem horário"} → {r.depois}
                  </span>
                </Linha>
              ))}
            </Grupo>
          )}
          {pacote.mensagem && (
            <Grupo titulo="Mensagem para a família">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setVerMensagem(!verMensagem)} className="text-[13px] font-semibold text-gray-900 hover:underline">
                  {pacote.mensagem.origem === "ia" && (
                    <span className="mr-1.5">
                      <MarcaDaIa tamanho={12} titulo="Escrita pela inteligência artificial: confira antes de mandar" />
                    </span>
                  )}
                  {verMensagem ? "fechar" : "ver a mensagem"}
                </button>
                <a
                  href={linkWhatsapp(telefone, mensagem) ?? linkCompartilharWhatsapp(mensagem)}
                  target="_blank"
                  rel="noopener"
                  className={secundario}
                >
                  Abrir no WhatsApp
                </a>
              </div>
              {verMensagem && <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={7} className={`${campo} mt-2`} />}
            </Grupo>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={confirmar} disabled={pendente} className={primario}>
              {pendente ? "Gravando…" : "Confirmar"}
            </button>
            <button onClick={descartar} disabled={pendente} className={discreto}>
              Descartar
            </button>
          </div>
        </>
      )}
      {erro && <p className="mt-2 text-sm text-rose-600">{erro}</p>}
    </section>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wider text-stone-500">{titulo}</p>
      <div className="divide-y divide-stone-100">{children}</div>
    </div>
  );
}

function Linha({ marcada, alternar, rodape, children }: { marcada: boolean; alternar: () => void; rodape: string | null; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2">
      <input type="checkbox" checked={marcada} onChange={alternar} className="mt-1 h-4 w-4 shrink-0 accent-[var(--mo-destaque,#244C50)]" />
      <span className="min-w-0 flex-1 text-sm text-gray-900">
        {children}
        {rodape && <span className="block truncate text-[12px] text-stone-400">“{rodape}”</span>}
      </span>
    </label>
  );
}
