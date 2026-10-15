"use client";

// A portaria na aba RSVP (ficha em três painéis, 13/10/2026): o link de
// quem fica na porta e quantos já chegaram. A mesma porta do Modo Evento
// (148) — as ações e o painel são os de recepcao-actions; aqui muda só a
// roupa, no visual da ficha.

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  abrirPosto,
  encerrarPorta,
  lerPainel,
  revogarPosto,
  type Painel,
  type PostoDoPainel,
} from "@/app/(app)/eventos/[id]/recepcao-actions";
import type { ChegadasProps } from "@/components/operacao/ChegadasAoVivo";

const POLL_MS = 15_000;

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}
function diaCurto(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}
function diaBR(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}
function hojeBR() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
function vespera(data: string) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function PortariaDoRsvp({ eventId, painel: painelProp, qrPorPosto, linkBase, dataEvento }: ChegadasProps) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [painel, setPainel] = useState<Painel>(painelProp);
  const [aviso, setAviso] = useState<string | null>(null);
  const [qrAberto, setQrAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [abrindo, setAbrindo] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  // o dia de hoje decidido depois da montagem (servidor em UTC, celular no
  // fuso do país: perto da meia-noite seriam dias diferentes)
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => setHoje(hojeBR()), []);

  useEffect(() => setPainel(painelProp), [painelProp]);

  const atualizar = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const p = await lerPainel(eventId);
    if (p) setPainel(p);
  }, [eventId]);

  useEffect(() => {
    const id = setInterval(atualizar, POLL_MS);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [atualizar]);

  function rodar(acao: () => Promise<{ error?: string } | { success: true }>) {
    iniciar(async () => {
      const r = await acao();
      if ("error" in r && r.error) {
        setAviso(r.error);
        return;
      }
      setAviso(null);
      router.refresh();
      await atualizar();
    });
  }

  const vivos = painel.postos.filter((p) => p.revogado_em === null);
  const principal: PostoDoPainel | undefined = vivos[0];
  const outras = vivos.slice(1);
  // o link nasceu para outra data (o evento mudou de dia depois): a
  // janela dele não cobre a festa
  const deOutraData = !!(principal && dataEvento && diaBR(principal.vale_de) !== vespera(dataEvento));
  const encerrada = painel.porta_encerrada_em !== null;
  const podeFechar = !!hoje && (!dataEvento || hoje >= dataEvento);

  const texto = (p: PostoDoPainel) =>
    `Olá! Este é o link da portaria do evento. Abra no seu celular na hora de receber os convidados — ele funciona de ${diaCurto(p.vale_de)} a ${diaCurto(p.vale_ate)}: ${linkBase}${p.hash}`;

  async function copiar(p: PostoDoPainel) {
    await navigator.clipboard?.writeText(`${linkBase}${p.hash}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const detalhe = [
    painel.sem_confirmar > 0 ? `${painel.sem_confirmar} sem ter confirmado` : null,
    painel.avulsos > 0 ? `${painel.avulsos} fora da lista` : null,
    encerrada ? `contagem fechada às ${hora(painel.porta_encerrada_em!)}` : null,
  ].filter(Boolean);

  return (
    <div className="rp-port">
      <div className="rp-cab">
        <span className="rp-rot" style={{ padding: 0 }}>Portaria</span>
        {principal && (
          <span className={`rp-ativo${principal.aberto ? "" : " off"}`}>
            {principal.aberto ? "link ativo" : `funciona de ${diaCurto(principal.vale_de)} a ${diaCurto(principal.vale_ate)}`}
          </span>
        )}
      </div>

      <div className="rp-cont">
        <b>{painel.presentes}</b>
        <span>/ {painel.esperados} chegaram</span>
      </div>
      {detalhe.length > 0 && <p className="rp-nota">{detalhe.join(" · ")}</p>}

      {aviso && <p className="rp-nota esp">{aviso}</p>}

      {!principal ? (
        <>
          <p className="rp-nota">
            Quem trabalha na porta abre o link no celular e lê o QR de cada convidado — ou busca pelo nome. Funciona sem internet.
          </p>
          <div className="rp-botoes">
            <button type="button" className="rp-btn" disabled={pendente} onClick={() => rodar(() => abrirPosto(eventId, "Recepção"))}>
              Criar o link da portaria
            </button>
          </div>
        </>
      ) : deOutraData ? (
        <>
          <p className="rp-nota esp">O link foi criado quando o evento tinha outra data.</p>
          <div className="rp-botoes">
            <button
              type="button"
              className="rp-btn"
              disabled={pendente}
              onClick={() =>
                rodar(async () => {
                  const r = await revogarPosto(eventId, principal.id);
                  if ("error" in r) return r;
                  return abrirPosto(eventId, principal.nome);
                })
              }
            >
              Refazer o link
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="rp-nota">
            Quem trabalha na porta abre o link no celular e lê o QR de cada convidado — ou busca pelo nome. Funciona sem internet.
          </p>
          <div className="rp-botoes">
            <a className="rp-btn" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }} href={`https://wa.me/?text=${encodeURIComponent(texto(principal))}`} target="_blank" rel="noopener noreferrer">
              Enviar no WhatsApp
            </a>
            <button type="button" className="rp-btn" onClick={() => copiar(principal)}>
              {copiado ? "Copiado" : "Copiar link"}
            </button>
            {qrPorPosto[principal.id] && (
              <button type="button" className="rp-btn" aria-pressed={qrAberto} onClick={() => setQrAberto((v) => !v)}>
                QR
              </button>
            )}
          </div>
          {qrAberto && qrPorPosto[principal.id] && (
            <div className="rp-qr">
              <div dangerouslySetInnerHTML={{ __html: qrPorPosto[principal.id] }} />
            </div>
          )}
          <p className="rp-nota">
            {principal.aberturas === 0 ? "Ninguém abriu o link ainda." : `Aberto ${principal.aberturas} ${principal.aberturas === 1 ? "vez" : "vezes"}.`}{" "}
            <button
              type="button"
              className="rp-link"
              disabled={pendente}
              onClick={() => {
                if (!window.confirm("Desligar este link? Ele para de funcionar na hora, inclusive no celular de quem já está com ele.")) return;
                rodar(() => revogarPosto(eventId, principal.id));
              }}
            >
              Desligar
            </button>
          </p>
        </>
      )}

      {outras.map((p) => (
        <p key={p.id} className="rp-nota">
          {p.nome} · {p.aberto ? "link ativo" : `de ${diaCurto(p.vale_de)} a ${diaCurto(p.vale_ate)}`} ·{" "}
          <button type="button" className="rp-link a" onClick={() => copiar(p)}>copiar</button>{" "}
          <button
            type="button"
            className="rp-link"
            onClick={() => {
              if (!window.confirm(`Desligar o link "${p.nome}"?`)) return;
              rodar(() => revogarPosto(eventId, p.id));
            }}
          >
            desligar
          </button>
        </p>
      ))}

      {principal &&
        (abrindo ? (
          <form
            className="rp-par"
            onSubmit={(e) => {
              e.preventDefault();
              rodar(() => abrirPosto(eventId, nomeNovo.trim() || "Segunda porta"));
              setAbrindo(false);
              setNomeNovo("");
            }}
          >
            <input className="rp-in" style={{ flex: 1 }} autoFocus maxLength={60} value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} placeholder="Entrada lateral" aria-label="Nome da porta" />
            <button type="submit" className="rp-btn" disabled={pendente}>Criar</button>
            <button type="button" className="rp-btn" onClick={() => setAbrindo(false)}>Cancelar</button>
          </form>
        ) : (
          <button type="button" className="rp-link a" onClick={() => setAbrindo(true)}>
            + Outra porta de entrada
          </button>
        ))}

      {painel.ultimas.length > 0 && (
        <ul className="rp-ultimas">
          {painel.ultimas.slice(0, 6).map((u, i) => (
            <li key={i}>
              <span className="rp-mono">{hora(u.em)}</span> {u.nome}
            </li>
          ))}
        </ul>
      )}

      {podeFechar && (painel.presentes > 0 || encerrada) && (
        <button type="button" className="rp-link a" disabled={pendente} onClick={() => rodar(() => encerrarPorta(eventId, !encerrada))}>
          {encerrada ? "Reabrir a contagem" : "Fechar a contagem da porta"}
        </button>
      )}
    </div>
  );
}
