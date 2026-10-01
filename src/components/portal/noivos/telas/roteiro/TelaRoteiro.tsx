"use client";

// Roteiro do dia do portal dos noivos (desenho v4, README §16; protótipo,
// template 690–706 e lógica 1104–1105): o cartão "20 de março, hora a
// hora" com a linha vertical, os pontos pêssego e cada momento entrando
// em sequência (0,04s).
//
// O que o desenho não tem e o sistema já tinha (portal v1 e v2): o casal
// sugere outro horário para um momento e pede um momento novo — quem
// muda o roteiro é a cerimonialista (roteiro_sugestao, RPC
// sugerir_no_cronograma). A sugestão aparece na própria linha, com a
// resposta quando vier; nada é mandado para um vazio: na conta de
// família (sem cerimonialista) não há o que sugerir a ninguém.

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { pedirMomento, sugerirHorario } from "@/app/(portal)/portal/[eventoId]/cronograma/actions";
import { Eyebrow, Icone } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import type { LinhaDoRoteiro, PedidoDeMomento } from "./montar";
import "./roteiro.css";

function maiuscula(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function TelaRoteiro({
  linhas,
  pedidos,
  dia,
  exemplo,
}: {
  linhas: LinhaDoRoteiro[];
  pedidos: PedidoDeMomento[];
  /** "20 de março" */
  dia: string | null;
  /** o exemplo do campo "pedir um momento" */
  exemplo: string;
}) {
  const { eventoId, cerimonialista, daFamilia, avisar } = usePortalNoivos();
  const router = useRouter();
  const [enviando, iniciar] = useTransition();

  // com quem fica a sugestão: o nome dela, ou "a cerimonialista" quando a
  // equipe não tem nome no contato (na conta de família não há sugestão)
  const quem = cerimonialista ?? "a cerimonialista";
  const Quem = maiuscula(quem);
  const podeSugerir = !daFamilia;

  // "sugerir outro horário" de um momento
  const [aberto, setAberto] = useState<string | null>(null);
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");

  // "pedir um momento"
  const [pedindo, setPedindo] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [novoDetalhe, setNovoDetalhe] = useState("");

  function abrir(l: LinhaDoRoteiro) {
    setAberto(l.id);
    setHora(l.hora ?? "");
    setMotivo("");
  }

  function sugerir(e: FormEvent, l: LinhaDoRoteiro) {
    e.preventDefault();
    if (!hora || enviando) return;
    iniciar(async () => {
      const r = await sugerirHorario(eventoId, l.id, hora, motivo.trim());
      if ("error" in r) {
        avisar(r.error, true);
        return;
      }
      setAberto(null);
      avisar(`Sugestão enviada para ${quem}`);
      router.refresh();
    });
  }

  function pedir(e: FormEvent) {
    e.preventDefault();
    if (!novoTitulo.trim() || enviando) return;
    iniciar(async () => {
      const r = await pedirMomento(eventoId, novoTitulo.trim(), novaHora, novoDetalhe.trim());
      if ("error" in r) {
        avisar(r.error, true);
        return;
      }
      setPedindo(false);
      setNovoTitulo("");
      setNovaHora("");
      setNovoDetalhe("");
      avisar(`Pedido enviado para ${quem}`);
      router.refresh();
    });
  }

  return (
    <section className="pn-roteiro" aria-labelledby="pn-roteiro-titulo">
      <Eyebrow>Roteiro do dia</Eyebrow>
      <h1 id="pn-roteiro-titulo" className="pn-t pn-roteiro-titulo">
        {dia ? `${dia}, hora a hora` : "O dia, hora a hora"}
      </h1>

      {linhas.length === 0 ? (
        <p className="pn-roteiro-vazio">
          {daFamilia ? "Nenhum momento no roteiro ainda." : `${Quem} ainda está montando o roteiro.`}
        </p>
      ) : (
        <div className="pn-roteiro-lista">
          <span className="pn-roteiro-fio" aria-hidden="true" />
          <ol>
            {linhas.map((l, k) => {
              const s = l.sugestao;
              const pendente = s?.estado === "pendente";
              const aqui = aberto === l.id;
              let nota: { texto: string; tom: string } | null = null;
              if (s && pendente) {
                nota = {
                  texto: `Vocês sugeriram ${s.hora ?? "outro horário"}${s.mensagem ? ` — ${s.mensagem}` : ""}`,
                  tom: "espera",
                };
              } else if (s?.estado === "aceita") {
                nota = { texto: `${Quem} aceitou ${s.hora ?? "a mudança"}`, tom: "ok" };
              } else if (s?.estado === "recusada") {
                nota = { texto: `${Quem} respondeu: ${s.motivo ?? "fica como está"}`, tom: "" };
              }
              return (
                <li key={l.id} className="pn-roteiro-linha" style={{ animationDelay: `${k * 0.04}s` }}>
                  <div className={`pn-t pn-roteiro-hora${l.hora ? "" : " sem"}`}>{l.hora ?? "—"}</div>
                  <span className="pn-roteiro-ponto" aria-hidden="true" />
                  <div className="pn-roteiro-texto">
                    <div className="pn-roteiro-oque">{l.titulo}</div>
                    {l.sub && <div className="pn-roteiro-onde">{l.sub}</div>}
                    {nota && <div className={`pn-roteiro-nota ${nota.tom}`}>{nota.texto}</div>}
                  </div>
                  <div className="pn-roteiro-dir">
                    {pendente ? (
                      <span className="pn-roteiro-chip">com {quem}</span>
                    ) : podeSugerir && !aqui ? (
                      <button
                        type="button"
                        className="pn-roteiro-sugerir"
                        onClick={() => abrir(l)}
                        aria-label={`Sugerir outro horário para ${l.titulo}`}
                        title="Sugerir outro horário"
                      >
                        <Icone nome="edit" tamanho={18} />
                      </button>
                    ) : null}
                  </div>
                  {aqui && (
                    <form className="pn-roteiro-form" onSubmit={(e) => sugerir(e, l)}>
                      <input
                        type="time"
                        className="pn-roteiro-form-hora"
                        value={hora}
                        onChange={(e) => setHora(e.target.value)}
                        aria-label="Novo horário"
                        required
                        autoFocus
                      />
                      <span className="pn-roteiro-form-sep" aria-hidden="true" />
                      <input
                        className="pn-roteiro-form-texto"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Por quê? (opcional)"
                        aria-label="Por quê?"
                        maxLength={300}
                      />
                      <button type="submit" className="pn-roteiro-enviar" disabled={enviando || !hora}>
                        {enviando ? "Enviando…" : `Enviar para ${quem}`}
                      </button>
                      <button
                        type="button"
                        className="pn-roteiro-fechar"
                        onClick={() => setAberto(null)}
                        aria-label="Cancelar"
                      >
                        <Icone nome="close" tamanho={20} />
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {pedidos.length > 0 && (
        <div className="pn-roteiro-pedidos">
          <Eyebrow>Vocês pediram</Eyebrow>
          <ul>
            {pedidos.map((p) => (
              <li key={p.id} className="pn-roteiro-pedido">
                <div className="pn-roteiro-texto">
                  <div className="pn-roteiro-oque">
                    {p.titulo}
                    {p.hora && <span className="pn-roteiro-pedido-hora"> · {p.hora}</span>}
                  </div>
                  {p.estado === "recusada" && (
                    <div className="pn-roteiro-onde">
                      {p.motivo ? `${Quem}: ${p.motivo}` : `${Quem} respondeu que não dá`}
                    </div>
                  )}
                </div>
                <span
                  className={`pn-roteiro-chip${p.estado === "aceita" ? " ok" : p.estado === "recusada" ? " nao" : ""}`}
                >
                  {p.estado === "pendente" ? `com ${quem}` : p.estado === "aceita" ? "no roteiro" : "não deu"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {podeSugerir &&
        (pedindo ? (
          <form className="pn-roteiro-pedir-form" onSubmit={pedir}>
            <input
              className="pn-roteiro-campo"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder={exemplo}
              aria-label="O que vocês gostariam de incluir"
              maxLength={200}
              required
              autoFocus
            />
            <div className="pn-roteiro-campos">
              <input
                type="time"
                className="pn-roteiro-campo hora"
                value={novaHora}
                onChange={(e) => setNovaHora(e.target.value)}
                aria-label="Horário (opcional)"
              />
              <input
                className="pn-roteiro-campo"
                value={novoDetalhe}
                onChange={(e) => setNovoDetalhe(e.target.value)}
                placeholder="Algum detalhe que ajude (opcional)"
                aria-label="Detalhe (opcional)"
                maxLength={300}
              />
            </div>
            <div className="pn-roteiro-acoes">
              <button type="submit" className="pn-roteiro-enviar" disabled={enviando || !novoTitulo.trim()}>
                {enviando ? "Enviando…" : `Enviar para ${quem}`}
              </button>
              <button type="button" className="pn-roteiro-cancelar" onClick={() => setPedindo(false)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="pn-roteiro-pedir" onClick={() => setPedindo(true)}>
            <Icone nome="add" tamanho={20} />
            Pedir um momento
          </button>
        ))}
    </section>
  );
}
