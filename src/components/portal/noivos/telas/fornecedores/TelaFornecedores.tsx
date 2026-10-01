"use client";

// A tela Fornecedores do portal dos noivos (desenho v4, README §11;
// protótipo, template 550–565 e lógica 1069–1080): o cabeçalho com
// "N de M confirmados" e a grade de cartões — ícone, situação, categoria,
// nome, o que faz, o aviso e "com quem" + WhatsApp.
//
// O WhatsApp é um link wa.me de verdade: nos da cerimonialista, a
// conversa é com ela (o portal não mostra o contato do fornecedor); nos
// da família, com o telefone que ela mesma escreveu. Sem telefone, sem
// botão. Os da família continuam dela: tocar na situação troca entre
// Conversando e Confirmado, dá para tirar e para adicionar (as ações da
// 181, as mesmas da v2).

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adicionarFornecedorDaFamilia,
  marcarContratado,
  tirarFornecedorDaFamilia,
} from "@/app/(portal)/portal/[eventoId]/fornecedores/actions";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { Icone, Interruptor } from "../../primitivas";
import { comQuem, usePortalNoivos } from "../../contexto";
import type { CartaoDoFornecedor, StatusDoFornecedor } from "./montar";
import "./fornecedores.css";

const ROTULO: Record<StatusDoFornecedor, string> = {
  ok: "Confirmado",
  sinal: "Falta o sinal",
  neg: "Conversando",
  esc: "Escolher",
};

export function TelaFornecedores({
  cartoes,
  whatsCerimonialista,
}: {
  cartoes: CartaoDoFornecedor[];
  whatsCerimonialista: string | null;
}) {
  const { eventoId, base, cerimonialista, avisar } = usePortalNoivos();
  const router = useRouter();
  const [, iniciar] = useTransition();
  // o que a família acabou de trocar/tirar, até o servidor responder
  const [trocados, setTrocados] = useState<Record<string, boolean>>({});
  const [tirados, setTirados] = useState<string[]>([]);
  const [confirmaTirar, setConfirmaTirar] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);

  // dados novos do servidor: o otimista já não faz falta
  useEffect(() => {
    setTrocados({});
    setTirados([]);
  }, [cartoes]);

  // "Tirar?" volta a ser o × se ela não confirmar
  useEffect(() => {
    if (!confirmaTirar) return;
    const t = setTimeout(() => setConfirmaTirar(null), 4000);
    return () => clearTimeout(t);
  }, [confirmaTirar]);

  const visiveis = cartoes
    .filter((c) => !tirados.includes(c.chave))
    .map((c) =>
      c.origem === "familia" && c.chave in trocados
        ? { ...c, status: (trocados[c.chave] ? "ok" : "neg") as StatusDoFornecedor }
        : c
    );
  const total = visiveis.length;
  const ok = visiveis.filter((c) => c.status === "ok").length;

  function trocar(c: CartaoDoFornecedor) {
    const contratado = c.status !== "ok";
    setTrocados((t) => ({ ...t, [c.chave]: contratado }));
    iniciar(async () => {
      const r = await marcarContratado(eventoId, c.id, contratado);
      if ("error" in r) {
        setTrocados((t) => {
          const n = { ...t };
          delete n[c.chave];
          return n;
        });
        avisar(r.error, true);
      }
      router.refresh();
    });
  }

  function tirar(c: CartaoDoFornecedor) {
    if (confirmaTirar !== c.chave) {
      setConfirmaTirar(c.chave);
      return;
    }
    setConfirmaTirar(null);
    setTirados((t) => [...t, c.chave]);
    iniciar(async () => {
      const r = await tirarFornecedorDaFamilia(eventoId, c.id);
      if ("error" in r) {
        setTirados((t) => t.filter((x) => x !== c.chave));
        avisar(r.error, true);
      } else {
        avisar(`${c.nome} saiu da lista`);
      }
      router.refresh();
    });
  }

  return (
    <section className="pn-fornecedores" aria-labelledby="pn-fornecedores-titulo">
      <div className="pn-fornecedores-cabeca">
        <div>
          <div className="pn-eyebrow">Fornecedores</div>
          <h1 id="pn-fornecedores-titulo" className="pn-t pn-fornecedores-titulo">
            Quem vai fazer o dia acontecer
          </h1>
        </div>
        {total > 0 && (
          <div className="pn-fornecedores-conta">
            {ok} de {total} {total === 1 ? "confirmado" : "confirmados"}
          </div>
        )}
      </div>

      <div className="pn-fornecedores-grade">
        {visiveis.map((c, k) => {
          const daEquipe = c.origem !== "familia";
          const com = daEquipe ? comQuem(cerimonialista, true) : c.com ? `com ${c.com}` : comQuem(cerimonialista, false);
          const zap = daEquipe
            ? cerimonialista
              ? linkWhatsapp(whatsCerimonialista, `Oi, ${cerimonialista}! Sobre ${c.assunto}: `)
              : null
            : linkWhatsapp(c.telefone);
          const comQuemFala = daEquipe ? cerimonialista : c.com ?? c.nome;
          return (
            <article
              key={c.chave}
              className="pn-fornecedores-card"
              style={{ animationDelay: `${k * 0.05}s` }}
            >
              <div className="pn-fornecedores-topo">
                <div className="pn-fornecedores-icone">
                  <Icone nome={c.icone} tamanho={24} />
                </div>
                {c.origem === "familia" ? (
                  <button
                    type="button"
                    className={`pn-fornecedores-chip ${c.status}`}
                    aria-pressed={c.status === "ok"}
                    title={c.status === "ok" ? "Marcar como conversando" : "Marcar como confirmado"}
                    onClick={() => trocar(c)}
                  >
                    {ROTULO[c.status]}
                  </button>
                ) : (
                  <span className={`pn-fornecedores-chip ${c.status}`}>{ROTULO[c.status]}</span>
                )}
              </div>

              <div>
                <div className="pn-fornecedores-cat">{c.categoria}</div>
                <div className="pn-t pn-fornecedores-nome">
                  {c.origem === "escolha" ? (
                    <Link href={`${base}/escolhas`} className="pn-fornecedores-link">
                      {c.nome}
                    </Link>
                  ) : (
                    c.nome
                  )}
                </div>
              </div>

              {c.itens.length > 0 && (
                <div className="pn-fornecedores-itens">
                  {c.itens.map((i, j) => (
                    <div key={j} className="pn-fornecedores-item">
                      <Icone nome="check" tamanho={16} />
                      <span>{i}</span>
                    </div>
                  ))}
                  {c.mais && <div className="pn-fornecedores-item mais">{c.mais}</div>}
                </div>
              )}

              <div className="pn-fornecedores-aviso">{c.aviso}</div>

              <div className="pn-fornecedores-pe">
                <div className="pn-fornecedores-com">{com}</div>
                {c.origem === "familia" && (
                  <button
                    type="button"
                    className={`pn-fornecedores-tirar${confirmaTirar === c.chave ? " confirma" : ""}`}
                    aria-label={confirmaTirar === c.chave ? `Confirmar: tirar ${c.nome}` : `Tirar ${c.nome}`}
                    onClick={() => tirar(c)}
                  >
                    {confirmaTirar === c.chave ? "Tirar" : <Icone nome="close" tamanho={16} />}
                  </button>
                )}
                {zap && (
                  <a
                    href={zap}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pn-fornecedores-zap"
                    onClick={() => comQuemFala && avisar(`Abrindo conversa com ${comQuemFala}`)}
                  >
                    <Icone nome="chat" tamanho={16} />
                    WhatsApp
                  </a>
                )}
              </div>
            </article>
          );
        })}

        {novoAberto ? (
          <NovoFornecedor aoFechar={() => setNovoAberto(false)} />
        ) : (
          <button
            type="button"
            className="pn-fornecedores-novo"
            style={{ animationDelay: `${total * 0.05}s` }}
            onClick={() => setNovoAberto(true)}
          >
            <Icone nome="add" tamanho={30} />
            Adicionar fornecedor
          </button>
        )}
      </div>
    </section>
  );
}

/* ---------- o fornecedor que a família chamou ---------- */

function NovoFornecedor({ aoFechar }: { aoFechar: () => void }) {
  const { eventoId, avisar } = usePortalNoivos();
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [nome, setNome] = useState("");
  const [oQueFaz, setOQueFaz] = useState("");
  const [contato, setContato] = useState("");
  const [contratado, setContratado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function salvar() {
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    iniciar(async () => {
      const r = await adicionarFornecedorDaFamilia(eventoId, { nome, oQueFaz, contato, contratado });
      setSalvando(false);
      if ("error" in r) {
        avisar(r.error, true);
        return;
      }
      avisar("Fornecedor adicionado");
      aoFechar();
      router.refresh();
    });
  }

  return (
    <form
      className="pn-fornecedores-form"
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") aoFechar();
      }}
    >
      <div className="pn-t pn-fornecedores-form-titulo">Novo fornecedor</div>
      <label className="pn-fornecedores-campo">
        <Icone nome="storefront" tamanho={20} />
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={80}
          placeholder="Nome"
          aria-label="Nome do fornecedor"
          autoFocus
        />
      </label>
      <label className="pn-fornecedores-campo">
        <Icone nome="tag" tamanho={20} />
        <input
          value={oQueFaz}
          onChange={(e) => setOQueFaz(e.target.value)}
          maxLength={120}
          placeholder="O que faz (ex.: maquiagem)"
          aria-label="O que o fornecedor faz"
        />
      </label>
      <label className="pn-fornecedores-campo">
        <Icone nome="call" tamanho={20} />
        <input
          value={contato}
          onChange={(e) => setContato(e.target.value)}
          maxLength={80}
          placeholder="WhatsApp ou contato"
          aria-label="Contato do fornecedor"
        />
      </label>
      <div className="pn-fornecedores-ja">
        <span>Já contratado</span>
        <Interruptor ligado={contratado} aoTrocar={() => setContratado((v) => !v)} rotulo="Já contratado" />
      </div>
      <div className="pn-fornecedores-acoes">
        <button type="submit" className="pn-fornecedores-salvar" disabled={!nome.trim() || salvando}>
          Adicionar
        </button>
        <button type="button" className="pn-fornecedores-cancelar" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
