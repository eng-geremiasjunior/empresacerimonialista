"use client";

// Convidados (RSVP) — portal dos noivos, desenho v4 (README §10;
// protótipo: template 329–548, lógica 1016–1068). Alta fidelidade.
//
//   1. o painel escuro (o anel de quem vem, os lados, os envios) e
//      "Chegando agora" (as respostas mais recentes);
//   2. o convite digital (ConviteDigital): o celular é uma PRÉVIA do que
//      o convidado vê, com os dados do casal, sem gravar nada;
//   3. a lista com filtros e o mapa de mesas — SÓ LEITURA: quem senta os
//      convidados é a cerimonialista (sentar pelo casal é outra fase).
//
// Sem lista ainda, no lugar do painel entra "Começar a lista" (colar os
// nomes do WhatsApp), a mesma porta do portal v2.

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adicionarConvidado, adicionarVarios } from "@/app/(portal)/portal/[eventoId]/convidados/actions";
import { Eyebrow, Icone } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import type {
  ConvidadoDaLista,
  DadosConvidados,
  EnvioDoConvite,
  MesaDoMapa,
  RespostaDoFeed,
  StatusConvidado,
} from "./montar";
import { ConviteDigital } from "./ConviteDigital";
import "./convidados.css";

export function TelaConvidados({ dados, linkMesas = null }: { dados: DadosConvidados; linkMesas?: string | null }) {
  const temLista = dados.convites > 0;
  const sub = temLista
    ? `${dados.convites} ${dados.convites === 1 ? "convite" : "convites"} na lista${
        dados.lugaresNoSalao ? ` · ${dados.lugaresNoSalao} lugares no salão` : ""
      }`
    : "A lista começa aqui.";

  return (
    <div className="pn-convidados">
      <div className="pn-convidados-topo">
        <div>
          <Eyebrow>Confirmação de presença</Eyebrow>
          <h1 className="pn-t pn-convidados-titulo">Quem vem celebrar com vocês</h1>
          <div className="pn-convidados-sub">{sub}</div>
        </div>
        {!dados.rsvpAberto && <span className="pn-convidados-selo">Respostas encerradas</span>}
      </div>

      {temLista ? (
        <div className="pn-convidados-linha1">
          <Painel anel={dados.anel} lados={dados.lados} envios={dados.envios} prazo={dados.prazo} />
          <Chegando feed={dados.feed} agoraServidor={dados.agoraServidor} />
        </div>
      ) : (
        <ComecarLista eventoId={dados.eventoId} />
      )}

      <ConviteDigital
        eventoId={dados.eventoId}
        convite={dados.convite}
        contagens={dados.contagens}
        musicas={dados.musicas}
        confirmados={dados.anel.sim}
      />

      {temLista && <ListaEMesas eventoId={dados.eventoId} lista={dados.lista} mesas={dados.mesas} linkMesas={linkMesas} />}
    </div>
  );
}

/* ---------------- 1. o painel ---------------- */

function Painel({
  anel,
  lados,
  envios,
  prazo,
}: {
  anel: DadosConvidados["anel"];
  lados: DadosConvidados["lados"];
  envios: EnvioDoConvite[];
  prazo: string | null;
}) {
  // o anel parte de zero ao entrar na tela (transição de 1.4s)
  const [r, setR] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setR(1), 80);
    return () => clearTimeout(t);
  }, []);

  const { sim, pen, nao, total } = anel;
  const base = Math.max(1, total);
  const p1 = (sim / base) * 100 * r;
  const p2 = (pen / base) * 100 * r;
  const p3 = (nao / base) * 100 * r;
  const arco = (p: number) => {
    const a = Math.max(0, p - 0.8);
    return `${a} ${100 - a}`;
  };
  const pct = total ? Math.round((sim / total) * 100) : 0;

  const n = envios.length;
  const ultimoFeito = envios.reduce((k, e, i) => (e.feito ? i : k), -1);

  return (
    <div className="pn-convidados-painel">
      <div className="pn-convidados-anel">
        <svg width="260" height="260" viewBox="0 0 260 260" aria-hidden="true">
          <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="22" />
          <circle
            className="arco"
            cx="130"
            cy="130"
            r="110"
            fill="none"
            stroke="#e9ae88"
            strokeWidth="22"
            pathLength={100}
            style={{ strokeDasharray: arco(p1), strokeDashoffset: 0 }}
          />
          <circle
            className="arco"
            cx="130"
            cy="130"
            r="110"
            fill="none"
            stroke="#7f978a"
            strokeWidth="22"
            pathLength={100}
            style={{ strokeDasharray: arco(p2), strokeDashoffset: -p1 }}
          />
          <circle
            className="arco"
            cx="130"
            cy="130"
            r="110"
            fill="none"
            stroke="#3d5146"
            strokeWidth="22"
            pathLength={100}
            style={{ strokeDasharray: arco(p3), strokeDashoffset: -(p1 + p2) }}
          />
        </svg>
        <div className="pn-convidados-anel-centro">
          <div className="pn-t num">{sim}</div>
          <div className="de">
            de {total} {total === 1 ? "convidado" : "convidados"}
            <br />
            já confirmaram
          </div>
          <div className="pct">{pct}% de sim</div>
        </div>
      </div>

      <div className="pn-convidados-painel-dir">
        <div className="pn-convidados-legenda">
          <div>
            <div className="rot">
              <span className="bola" style={{ background: "#e9ae88" }} />
              Vêm
            </div>
            <div className="pn-t num">{sim}</div>
          </div>
          <div>
            <div className="rot">
              <span className="bola" style={{ background: "#7f978a" }} />
              Sem resposta
            </div>
            <div className="pn-t num">{pen}</div>
          </div>
          <div>
            <div className="rot">
              <span className="bola" style={{ background: "#3d5146", boxShadow: "0 0 0 1px #7f978a" }} />
              Não vêm
            </div>
            <div className="pn-t num">{nao}</div>
          </div>
        </div>

        {lados.length > 0 && (
          <div className="pn-convidados-lados">
            {lados.map((l) => (
              <div key={l.n}>
                <div className="topo">
                  <span>{l.n}</span>
                  <span>
                    {l.s} de {l.t}
                  </span>
                </div>
                <div className="barra">
                  <div style={{ width: `${(l.s / Math.max(1, l.t)) * 100 * r}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {(n > 0 || prazo) && (
          <div className="pn-convidados-envios">
            <div className="cab">
              <span className="rot">Envios</span>
              {prazo && <span className="prazo">respostas até {prazo}</span>}
            </div>
            {n > 0 && (
              <div className="nos" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                {n > 1 && <div className="base" style={{ left: `${50 / n}%`, right: `${50 / n}%` }} />}
                {n > 1 && ultimoFeito > 0 && (
                  <div className="feito" style={{ left: `${50 / n}%`, width: `${(ultimoFeito / n) * 100}%` }} />
                )}
                {envios.map((e) => (
                  <div key={e.t} className="no">
                    <span className={`bola${e.feito ? " ok" : ""}`}>
                      {e.feito && <Icone nome="check" tamanho={13} />}
                    </span>
                    <div className="t">{e.t}</div>
                    <div className="d">{e.d}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- 1b. chegando agora ---------------- */

function haQuanto(iso: string, agora: number): string {
  const min = Math.floor((agora - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

function Chegando({ feed, agoraServidor }: { feed: RespostaDoFeed[]; agoraServidor: number }) {
  // o relógio começa no do servidor (sem erro de hidratação)
  const [agora, setAgora] = useState(agoraServidor);
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const [top, ...resto] = feed;

  return (
    <div className="pn-convidados-chegando">
      <div className="cab">
        <span className="ponto" />
        <span className="pn-t titulo">Chegando agora</span>
      </div>

      {top ? (
        <div key={top.chave} className="pn-convidados-destaque">
          <div className="linha">
            <div className="avatar">{top.ini}</div>
            <div className="meio">
              <div className="quem">
                <b>{top.nome}</b> {top.verbo}
              </div>
              {top.detalhe && <div className="det">{top.detalhe}</div>}
            </div>
            <span className="quando">{haQuanto(top.em, agora)}</span>
          </div>
          {top.recado && <div className="pn-t recado">“{top.recado}”</div>}
        </div>
      ) : (
        <div className="pn-convidados-vazio">Ninguém respondeu ainda.</div>
      )}

      {resto.length > 0 && (
        <div className="pn-convidados-resto">
          {resto.map((x) => (
            <div key={x.chave} className="item">
              <div className="avatar">{x.ini}</div>
              <div className="meio">
                <div className="quem">
                  <b>{x.nome}</b> {x.verbo}
                </div>
                {x.detalhe && <div className="det">{x.detalhe}</div>}
              </div>
              <span className="quando">{haQuanto(x.em, agora)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- sem lista: começar ---------------- */

function ComecarLista({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const { avisar } = usePortalNoivos();
  const [cola, setCola] = useState("");
  const [pendente, iniciar] = useTransition();
  const n = cola.split("\n").filter((l) => l.trim()).length;

  function organizar() {
    if (!n || pendente) return;
    iniciar(async () => {
      const r = await adicionarVarios(eventoId, cola.split("\n"));
      if (r.error) {
        avisar(r.error, true);
        return;
      }
      setCola("");
      avisar(r.quantos === 1 ? "1 nome na lista" : `${r.quantos ?? n} nomes na lista`);
      router.refresh();
    });
  }

  return (
    <div className="pn-convidados-comecar">
      <div className="pn-t titulo">Começar a lista</div>
      <textarea
        value={cola}
        onChange={(e) => setCola(e.target.value)}
        rows={6}
        placeholder="Cole os nomes do WhatsApp, um por linha"
        aria-label="Nomes dos convidados, um por linha"
      />
      <button type="button" className="organizar" onClick={organizar} disabled={!n || pendente}>
        {n ? `Organizar ${n} ${n === 1 ? "nome" : "nomes"}` : "Organizar os nomes"}
      </button>
    </div>
  );
}

/* ---------------- 3. lista + mapa de mesas ---------------- */

const FILTROS: [string, StatusConvidado | null][] = [
  ["Todos", null],
  ["Confirmados", "sim"],
  ["Aguardando", "pen"],
  ["Não vão", "nao"],
];

const CHIP: Record<StatusConvidado, string> = {
  sim: "Confirmado",
  pen: "Aguardando",
  nao: "Não vai",
};

function ListaEMesas({
  eventoId,
  lista,
  mesas,
  linkMesas,
}: {
  eventoId: string;
  lista: ConvidadoDaLista[];
  mesas: MesaDoMapa[];
  /** só na conta da noiva que abriu sozinha: quem senta é ela */
  linkMesas: string | null;
}) {
  const [filtro, setFiltro] = useState<StatusConvidado | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const temMesas = mesas.length > 0;

  const visiveis = useMemo(() => (filtro ? lista.filter((c) => c.status === filtro) : lista), [lista, filtro]);
  const escolhido = sel ? lista.find((c) => c.id === sel) ?? null : null;
  const mesaDoEscolhido = escolhido?.mesaId ? mesas.find((m) => m.id === escolhido.mesaId) ?? null : null;

  const confirmados = lista.filter((c) => c.status === "sim");
  const comMesa = confirmados.filter((c) => c.mesaId).length;
  const primeiro = escolhido?.nome.trim().split(/\s+/)[0] ?? "";
  const dica = escolhido
    ? mesaDoEscolhido
      ? `A mesa de ${primeiro}: ${mesaDoEscolhido.rotulo}`
      : `${primeiro} ainda não tem mesa`
    : confirmados.length
      ? `${comMesa} de ${confirmados.length} confirmados já têm mesa`
      : "";

  return (
    <div className={`pn-convidados-linha3${temMesas ? "" : " so-lista"}`}>
      <div className="pn-convidados-lista">
        <div className="filtros" role="group" aria-label="Filtrar a lista">
          {FILTROS.map(([rotulo, f]) => (
            <button
              key={rotulo}
              type="button"
              aria-pressed={filtro === f}
              className={filtro === f ? "on" : undefined}
              onClick={() => setFiltro(f)}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <div className="linhas">
          {visiveis.length === 0 && <div className="pn-convidados-vazio">Ninguém aqui.</div>}
          {visiveis.map((c) => {
            const conteudo = (
              <>
                <div className="avatar">{c.ini}</div>
                <div className="meio">
                  <div className="nome">{c.nome}</div>
                  {c.sub && <div className="sub">{c.sub}</div>}
                </div>
                <span className={`pn-convidados-status ${c.status}`}>{CHIP[c.status]}</span>
              </>
            );
            return temMesas ? (
              <button
                key={c.id}
                type="button"
                className={`linha${sel === c.id ? " sel" : ""}`}
                aria-pressed={sel === c.id}
                onClick={() => setSel(sel === c.id ? null : c.id)}
              >
                {conteudo}
              </button>
            ) : (
              <div key={c.id} className="linha">
                {conteudo}
              </div>
            );
          })}
        </div>
        <IncluirConvidado eventoId={eventoId} />
        {linkMesas && !temMesas && (
          <Link href={linkMesas} className="pn-convidados-sentar">
            <Icone nome="restaurant" tamanho={18} />
            Sentar nas mesas
          </Link>
        )}
      </div>

      {temMesas && (
        <div className="pn-convidados-mapa">
          <div className="cab">
            <div>
              <Eyebrow>Mapa de mesas</Eyebrow>
              <div className="pn-t titulo">Onde cada um senta</div>
            </div>
            <div className="cab-dir">
              {dica && <div className="dica">{dica}</div>}
              {linkMesas && (
                <Link href={linkMesas} className="pn-convidados-mudar">
                  Mudar as mesas
                </Link>
              )}
            </div>
          </div>
          <div className="mesas">
            {mesas.map((m) => (
              <Mesa key={m.id} mesa={m} destaque={mesaDoEscolhido?.id === m.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Mesa({ mesa, destaque }: { mesa: MesaDoMapa; destaque: boolean }) {
  const n = Math.max(1, mesa.lugares);
  // até 16 cadeiras cabem com 22px no círculo de raio 64; mais que isso, encolhem
  const tam = n <= 16 ? 22 : Math.max(10, Math.floor(((2 * Math.PI * 64) / n) * 0.8));
  const ocupadas = Math.min(n, mesa.ocupados);
  return (
    <div className={`pn-convidados-mesa${destaque ? " destaque" : ""}`}>
      <div className="disco" aria-label={`${mesa.rotulo}: ${mesa.ocupados} de ${mesa.lugares} lugares`}>
        {Array.from({ length: n }, (_, k) => {
          const ang = (k / n) * Math.PI * 2 - Math.PI / 2;
          const cheia = k < ocupadas;
          return (
            <span
              key={k}
              className={`cadeira${cheia ? " cheia" : ""}`}
              style={{
                left: `${50 + (64 / 150) * 100 * Math.cos(ang)}%`,
                top: `${50 + (64 / 150) * 100 * Math.sin(ang)}%`,
                width: tam,
                height: tam,
                margin: `${-tam / 2}px 0 0 ${-tam / 2}px`,
              }}
            />
          );
        })}
        <div className="centro">
          <div>
            {mesa.honra ? (
              <Icone nome="favorite" tamanho={22} cheio cor="#e9ae88" />
            ) : (
              <div className="pn-t n">{mesa.centro}</div>
            )}
            <div className="conta">
              {mesa.ocupados}/{mesa.lugares}
            </div>
          </div>
        </div>
      </div>
      <div className="nome">{mesa.rotulo}</div>
      <div className="quem">{mesa.quem || "mesa livre"}</div>
    </div>
  );
}

function IncluirConvidado({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const { avisar } = usePortalNoivos();
  const [nome, setNome] = useState("");
  const [pendente, iniciar] = useTransition();

  function incluir(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n || pendente) return;
    iniciar(async () => {
      const r = await adicionarConvidado(eventoId, { nome: n });
      if (r.error) {
        avisar(r.error, true);
        return;
      }
      setNome("");
      avisar(`${n.split(/\s+/)[0]} entrou na lista`);
      router.refresh();
    });
  }

  return (
    <form className="pn-convidados-incluir" onSubmit={incluir}>
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={120}
        placeholder="Nome de mais um convidado"
        aria-label="Nome de mais um convidado"
      />
      <button type="submit" disabled={!nome.trim() || pendente}>
        <Icone nome="person_add" tamanho={19} />
        Incluir
      </button>
    </form>
  );
}
