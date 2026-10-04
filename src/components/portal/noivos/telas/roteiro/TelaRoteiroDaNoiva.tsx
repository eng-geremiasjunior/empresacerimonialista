"use client";

// O Roteiro do dia da noiva que abriu a conta sozinha (04/10/2026): o
// mesmo cartão "20 de agosto, hora a hora" da tela de leitura, mas é ela
// quem monta. Primeiro a hora da cerimônia — o roteiro nasce dela —;
// depois o lápis de cada momento muda a hora, o nome e o detalhe, e
// "Acrescentar um momento" põe o que faltar. O horário que ainda é conta
// da hora da cerimônia diz "estimado", como no resto do sistema.

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { MomentoDaNoiva, RoteiroDaNoiva } from "@/lib/supabase/portal-roteiro";
import {
  definirHoraDaCerimonia,
  salvarMomentoDaNoiva,
  tirarMomentoDaNoiva,
} from "@/app/(portal)/portal/[eventoId]/cronograma/noiva-actions";
import { Eyebrow, Icone } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import "./roteiro.css";
import "./roteiro-noiva.css";

type Retorno = { ok: true } | { error: string };

export function TelaRoteiroDaNoiva({
  roteiro,
  dia,
  exemplo,
}: {
  roteiro: RoteiroDaNoiva;
  /** "20 de agosto" */
  dia: string | null;
  exemplo: string;
}) {
  const { eventoId, avisar } = usePortalNoivos();
  const router = useRouter();
  const [enviando, iniciar] = useTransition();

  const [horaCerimonia, setHoraCerimonia] = useState(roteiro.horaCerimonia ?? "");
  const [mudandoCerimonia, setMudandoCerimonia] = useState(false);

  // o momento aberto no lápis
  const [aberto, setAberto] = useState<string | null>(null);
  const [hora, setHora] = useState("");
  const [titulo, setTitulo] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [tirando, setTirando] = useState(false);

  // acrescentar
  const [novo, setNovo] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [novoDetalhe, setNovoDetalhe] = useState("");

  function rodar(acao: () => Promise<Retorno>, aviso: string, depois?: () => void) {
    iniciar(async () => {
      const r = await acao();
      if ("error" in r) {
        avisar(r.error, true);
        return;
      }
      avisar(aviso);
      depois?.();
      router.refresh();
    });
  }

  function salvarCerimonia(e: FormEvent) {
    e.preventDefault();
    if (!horaCerimonia) return avisar("Diga a hora da cerimônia.", true);
    const primeira = roteiro.momentos.length === 0;
    rodar(
      () => definirHoraDaCerimonia(eventoId, horaCerimonia),
      primeira ? "Roteiro montado" : "Hora da cerimônia salva",
      () => setMudandoCerimonia(false)
    );
  }

  function abrir(m: MomentoDaNoiva) {
    setAberto(m.id);
    setHora(m.hora ?? "");
    setTitulo(m.titulo);
    setDetalhe(m.detalhe ?? "");
    setTirando(false);
    setNovo(false);
  }

  function salvar(e: FormEvent, m: MomentoDaNoiva) {
    e.preventDefault();
    rodar(() => salvarMomentoDaNoiva(eventoId, { id: m.id, hora, titulo, detalhe }), "Momento salvo", () => setAberto(null));
  }

  function acrescentar(e: FormEvent) {
    e.preventDefault();
    rodar(
      () => salvarMomentoDaNoiva(eventoId, { id: null, hora: novaHora, titulo: novoTitulo, detalhe: novoDetalhe }),
      "Momento acrescentado",
      () => {
        setNovo(false);
        setNovoTitulo("");
        setNovaHora("");
        setNovoDetalhe("");
      }
    );
  }

  const pedirCerimonia = roteiro.horaCerimonia === null || mudandoCerimonia;

  return (
    <section className="pn-roteiro pn-roteiro-noiva" aria-labelledby="pn-roteiro-titulo">
      <Eyebrow>Roteiro do dia</Eyebrow>
      <h1 id="pn-roteiro-titulo" className="pn-t pn-roteiro-titulo">
        {dia ? `${dia}, hora a hora` : "O dia, hora a hora"}
      </h1>

      {/* a âncora: a hora da cerimônia */}
      {pedirCerimonia ? (
        <form className="pn-rn-cerimonia" onSubmit={salvarCerimonia}>
          <label htmlFor="pn-rn-hora-cerimonia" className="pn-t pn-rn-pergunta">
            A que horas é a cerimônia?
          </label>
          <div className="pn-rn-linha">
            <input
              id="pn-rn-hora-cerimonia"
              type="time"
              className="pn-roteiro-campo hora"
              value={horaCerimonia}
              onChange={(e) => setHoraCerimonia(e.target.value)}
              required
            />
            <button type="submit" className="pn-roteiro-enviar" disabled={enviando || !horaCerimonia}>
              {roteiro.momentos.length === 0 ? "Montar o roteiro" : "Salvar"}
            </button>
            {roteiro.horaCerimonia !== null && (
              <button type="button" className="pn-roteiro-cancelar" onClick={() => setMudandoCerimonia(false)}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="pn-rn-ancora">
          Cerimônia às {roteiro.horaCerimonia} ·{" "}
          <button type="button" className="pn-rn-link" onClick={() => setMudandoCerimonia(true)}>
            Mudar a hora
          </button>
        </p>
      )}

      {roteiro.momentos.length > 0 && (
        <div className="pn-roteiro-lista">
          <span className="pn-roteiro-fio" aria-hidden="true" />
          <ol>
            {roteiro.momentos.map((m, k) => {
              const aqui = aberto === m.id;
              const sub = [m.duracao, m.detalhe].filter(Boolean).join(" · ");
              return (
                <li key={m.id} className="pn-roteiro-linha" style={{ animationDelay: `${k * 0.04}s` }}>
                  <div className={`pn-t pn-roteiro-hora${m.hora ? "" : " sem"}`}>
                    {m.hora ?? "—"}
                    {m.hora && m.estimado && <span className="pn-rn-estimado">estimado</span>}
                  </div>
                  <span className="pn-roteiro-ponto" aria-hidden="true" />
                  <div className="pn-roteiro-texto">
                    <div className="pn-roteiro-oque">{m.titulo}</div>
                    {sub && <div className="pn-roteiro-onde">{sub}</div>}
                  </div>
                  <div className="pn-roteiro-dir">
                    {!aqui && (
                      <button
                        type="button"
                        className="pn-roteiro-sugerir"
                        onClick={() => abrir(m)}
                        aria-label={`Mudar: ${m.titulo}`}
                        title="Mudar"
                      >
                        <Icone nome="edit" tamanho={18} />
                      </button>
                    )}
                  </div>
                  {aqui && (
                    <form className="pn-roteiro-form pn-rn-form" onSubmit={(e) => salvar(e, m)}>
                      <input
                        type="time"
                        className="pn-roteiro-form-hora"
                        value={hora}
                        onChange={(e) => setHora(e.target.value)}
                        aria-label="Hora"
                        required
                      />
                      <span className="pn-roteiro-form-sep" aria-hidden="true" />
                      <input
                        className="pn-roteiro-form-texto"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        aria-label="O que acontece"
                        maxLength={200}
                        required
                      />
                      <input
                        className="pn-roteiro-form-texto pn-rn-detalhe"
                        value={detalhe}
                        onChange={(e) => setDetalhe(e.target.value)}
                        placeholder="Detalhe (opcional)"
                        aria-label="Detalhe"
                        maxLength={300}
                      />
                      <button type="submit" className="pn-roteiro-enviar" disabled={enviando || !hora || !titulo.trim()}>
                        Salvar
                      </button>
                      <button type="button" className="pn-roteiro-fechar" onClick={() => setAberto(null)} aria-label="Cancelar">
                        <Icone nome="close" tamanho={20} />
                      </button>
                      <div className="pn-rn-tirar">
                        {tirando ? (
                          <>
                            <span>Tirar {m.titulo} do roteiro?</span>
                            <button
                              type="button"
                              className="pn-rn-link perigo"
                              disabled={enviando}
                              onClick={() => rodar(() => tirarMomentoDaNoiva(eventoId, m.id), "Momento tirado", () => setAberto(null))}
                            >
                              Tirar
                            </button>
                            <button type="button" className="pn-rn-link" onClick={() => setTirando(false)}>
                              Não
                            </button>
                          </>
                        ) : (
                          <button type="button" className="pn-rn-link" onClick={() => setTirando(true)}>
                            Tirar do roteiro
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* acrescentar um momento (o roteiro também começa assim, sem a hora da cerimônia) */}
      {novo ? (
        <form className="pn-roteiro-pedir-form" onSubmit={acrescentar}>
          <input
            className="pn-roteiro-campo"
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            placeholder={exemplo}
            aria-label="O que acontece"
            maxLength={200}
            required
          />
          <div className="pn-roteiro-campos">
            <input
              type="time"
              className="pn-roteiro-campo hora"
              value={novaHora}
              onChange={(e) => setNovaHora(e.target.value)}
              aria-label="Hora"
              required
            />
            <input
              className="pn-roteiro-campo"
              value={novoDetalhe}
              onChange={(e) => setNovoDetalhe(e.target.value)}
              placeholder="Detalhe (opcional)"
              aria-label="Detalhe"
              maxLength={300}
            />
          </div>
          <div className="pn-roteiro-acoes">
            <button type="submit" className="pn-roteiro-enviar" disabled={enviando || !novoTitulo.trim() || !novaHora}>
              Acrescentar
            </button>
            <button type="button" className="pn-roteiro-cancelar" onClick={() => setNovo(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="pn-roteiro-pedir"
          onClick={() => {
            setNovo(true);
            setAberto(null);
          }}
        >
          <Icone nome="add" tamanho={20} />
          Acrescentar um momento
        </button>
      )}
    </section>
  );
}
