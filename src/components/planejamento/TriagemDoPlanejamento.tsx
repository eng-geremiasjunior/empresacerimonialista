"use client";

// A triagem do Planejamento (16/10/2026; desenho 6k/6l do handoff
// design_handoff_eorganizei). Os itens que venceram antes do cadastro, por
// assunto, cada um com a sugestão pela data já marcada; ela confirma tudo,
// um grupo ou troca item a item. A caixa de cima lê um resumo dela com a
// IA e só ajusta as marcações — gravar é sempre o botão dela.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ROTULO_DA_ESCOLHA,
  agruparTriagem,
  vencidoEmPalavras,
  type EscolhaDaTriagem,
  type ItemDaTriagem,
} from "@/lib/triagem";
import { gravarTriagem } from "@/app/(app)/eventos/[id]/planejamento/triagem-actions";

const CSS = `
.tg{--tg-tinta:var(--mo-tinta,#221E1B);--tg-c1:var(--mo-cinza-1,#6B6259);--tg-c2:var(--mo-cinza-2,#928A81);
  --tg-linha:var(--mo-linha,#E6E0D8);--tg-nevoa:var(--mo-nevoa,#F2EEE9);--tg-ameixa:var(--mo-ameixa,#6E3F5F);
  border-top:1px solid var(--tg-tinta);border-bottom:1px solid var(--tg-tinta);padding:22px 0;margin:0 0 28px;
  font-family:var(--font-ui),"Instrument Sans",sans-serif;color:var(--tg-tinta)}
.tg h2{margin:0;font-family:var(--font-title),Inter,sans-serif;font-size:20px;font-weight:600;letter-spacing:-0.01em}
.tg-topo{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-top:6px}
.tg-sub{font-size:14px;color:var(--tg-c1)}
.tg-btn{border-radius:4px;padding:7px 14px;font-size:14px;font-weight:500;cursor:pointer;border:1px solid var(--tg-linha);
  background:var(--tg-nevoa);color:var(--tg-tinta)}
.tg-btn:hover{border-color:var(--tg-c2)}
.tg-btn:disabled{opacity:.55;cursor:default}
.tg-prim{background:var(--tg-ameixa);border-color:var(--tg-ameixa);color:#fff;font-weight:600}
.tg-prim:hover{border-color:var(--tg-ameixa);filter:brightness(1.08)}
.tg-ia{margin:18px 0 6px;padding:14px 0 0;border-top:1px solid var(--tg-linha)}
.tg-ia label{display:block;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--tg-c2);margin-bottom:6px}
.tg-ia textarea{width:100%;min-height:72px;resize:vertical;border:1px solid var(--tg-linha);border-radius:4px;padding:10px 12px;
  font:inherit;font-size:14px;color:var(--tg-tinta);background:#fff}
.tg-ia textarea:focus{outline:none;border-color:var(--tg-ameixa)}
.tg-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.tg-chip{border:1px solid var(--tg-linha);background:transparent;border-radius:4px;padding:4px 9px;font-size:13px;color:var(--tg-c1);cursor:pointer}
.tg-chip:hover{color:var(--tg-tinta);border-color:var(--tg-c2)}
.tg-ia-linha{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.tg-aviso{font-size:13px;color:var(--tg-c1)}
.tg-lido{margin-top:12px;padding:12px 14px;border:1px solid var(--tg-ameixa);border-radius:4px;background:#F3EBF0}
.tg-lido-titulo{margin:0 0 6px;font-size:14px;font-weight:600}
.tg-lido ul{margin:0 0 10px;padding-left:18px;font-size:14px;line-height:1.6}
.tg-lido b{font-weight:600}
.tg-pelo{margin-left:8px;font-size:11.5px;font-weight:600;color:var(--tg-ameixa)}
.tg-aviso a{color:var(--tg-tinta);font-weight:600;text-underline-offset:3px}
.tg-grupo{margin-top:22px}
.tg-grupo-topo{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:1px solid var(--tg-linha)}
.tg-grupo-nome{font-family:var(--font-title),Inter,sans-serif;font-size:16px;font-weight:600;background:none;border:0;padding:0;color:var(--tg-tinta);cursor:pointer;text-align:left}
.tg-conta{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:12px;color:var(--tg-c2);font-weight:400;margin-left:8px}
.tg-item{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:16px;padding:9px 0;border-bottom:1px solid var(--tg-linha)}
.tg-titulo{font-size:15px}
.tg-venceu{font-size:13px;color:var(--tg-c1);white-space:nowrap}
.tg-seg{display:inline-flex;border:1px solid var(--tg-linha);border-radius:4px;overflow:hidden}
.tg-seg button{border:0;border-left:1px solid var(--tg-linha);background:#fff;padding:6px 11px;font-size:13px;color:var(--tg-c1);cursor:pointer;white-space:nowrap}
.tg-seg button:first-child{border-left:0}
.tg-seg button[aria-pressed="true"]{background:var(--tg-nevoa);color:var(--tg-tinta);font-weight:600;box-shadow:inset 0 0 0 1px var(--tg-tinta)}
.tg-mais{margin-top:8px;border:0;background:none;padding:0;font-size:13px;color:var(--tg-c1);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.tg-erro{margin-top:10px;font-size:13px;color:#8a2f2f}
@media (max-width:760px){
  .tg-item{grid-template-columns:1fr auto;gap:6px 10px}
  .tg-seg{grid-column:1 / -1;width:100%}
  .tg-seg button{flex:1;padding:10px 4px}
}
`;

const PERGUNTAS = [
  "O que já está contratado?",
  "A cerimônia é religiosa, civil ou simbólica?",
  "O que ainda falta fechar?",
  "O que este evento não vai ter?",
];

const ESCOLHAS: EscolhaDaTriagem[] = ["ja_resolvido", "nao_se_aplica", "ainda_falta"];
const VISIVEIS = 3;

export function TriagemDoPlanejamento({
  eventId,
  itens,
  leituraLiberada,
}: {
  eventId: string;
  itens: ItemDaTriagem[];
  /** o plano tem a leitura por IA (leitura_ia) */
  leituraLiberada: boolean;
}) {
  const router = useRouter();
  const grupos = useMemo(() => agruparTriagem(itens), [itens]);
  const [escolhas, setEscolhas] = useState<Record<string, EscolhaDaTriagem>>(() =>
    Object.fromEntries(itens.map((i) => [i.id, i.sugestao]))
  );
  const [abertos, setAbertos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(grupos.map((g, n) => [g.nome, n < 2]))
  );
  const [inteiros, setInteiros] = useState<Record<string, boolean>>({});
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState(false);
  // o que a leitura do resumo marcou: aparece em lista, com o botão de gravar ao lado
  const [lidas, setLidas] = useState<{ id: string; escolha: EscolhaDaTriagem }[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, iniciar] = useTransition();

  if (itens.length === 0) return null;

  const gravar = (lista: ItemDaTriagem[]) => {
    setErro(null);
    iniciar(async () => {
      const r = await gravarTriagem(
        eventId,
        lista.map((i) => ({ id: i.id, escolha: escolhas[i.id] ?? i.sugestao, etapas: i.etapas }))
      );
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      router.refresh();
    });
  };

  const ler = async () => {
    setErro(null);
    setLendo(true);
    try {
      const res = await fetch("/api/ai/triagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, texto }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        marcacoes?: { id: string; escolha: EscolhaDaTriagem }[];
        error?: string;
      };
      if (!res.ok || !j.marcacoes) {
        setErro(j.error ?? "A leitura não respondeu agora. Tente de novo.");
        return;
      }
      const marcadas = j.marcacoes;
      setEscolhas((atual) => {
        const novo = { ...atual };
        for (const m of marcadas) novo[m.id] = m.escolha;
        return novo;
      });
      // abre os grupos que a leitura mexeu, para ela conferir
      const mexidos = new Set(marcadas.map((m) => itens.find((i) => i.id === m.id)?.grupo));
      setAbertos((a) => ({ ...a, ...Object.fromEntries([...mexidos].filter(Boolean).map((g) => [g as string, true])) }));
      setLidas(marcadas);
    } finally {
      setLendo(false);
    }
  };

  return (
    <section className="tg" aria-label="Triagem do planejamento">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h2>Antes de você entrar, isto já estava resolvido?</h2>
      <div className="tg-topo">
        <span className="tg-sub">
          {itens.length} {itens.length === 1 ? "item venceu" : "itens venceram"} antes do cadastro
        </span>
        <button type="button" className="tg-btn tg-prim" disabled={gravando} onClick={() => gravar(itens)}>
          {gravando ? "Gravando…" : "Confirmar todas"}
        </button>
      </div>

      <div className="tg-ia">
        <label htmlFor="tg-resumo">Em poucas palavras</label>
        <textarea
          id="tg-resumo"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: buffet e foto fechados, falta decoração e bolo, cerimônia civil na praia"
        />
        <div className="tg-chips">
          {PERGUNTAS.map((p) => (
            <button
              key={p}
              type="button"
              className="tg-chip"
              onClick={() => setTexto((t) => `${t}${t && !t.endsWith("\n") ? "\n" : ""}${p} `)}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="tg-ia-linha">
          {leituraLiberada ? (
            <button type="button" className="tg-btn" disabled={lendo || texto.trim().length < 3} onClick={ler}>
              {lendo ? "Lendo…" : "Ler o resumo"}
            </button>
          ) : (
            <span className="tg-aviso">
              A leitura do resumo é dos planos pagos. <Link href="/assinatura">Ver os planos</Link>
            </span>
          )}
          {lidas !== null && lidas.length === 0 && (
            <span className="tg-aviso">O resumo não falou de nenhum item da lista abaixo.</span>
          )}
        </div>
        {lidas !== null && lidas.length > 0 && (
          <div className="tg-lido">
            <p className="tg-lido-titulo">
              A leitura marcou {lidas.length} {lidas.length === 1 ? "item" : "itens"}:
            </p>
            <ul>
              {lidas.map((m) => {
                const item = itens.find((i) => i.id === m.id);
                return item ? (
                  <li key={m.id}>
                    <b>{item.titulo}</b> → {ROTULO_DA_ESCOLHA[escolhas[m.id] ?? m.escolha]}
                  </li>
                ) : null;
              })}
            </ul>
            <div className="tg-ia-linha">
              <button type="button" className="tg-btn tg-prim" disabled={gravando} onClick={() => gravar(itens)}>
                {gravando ? "Gravando…" : "Gravar"}
              </button>
              <span className="tg-aviso">
                Grava estas marcações e a sugestão dos outros {itens.length - lidas.length} itens. Para trocar algum, mude na lista abaixo antes.
              </span>
            </div>
          </div>
        )}
      </div>

      {grupos.map((g) => {
        const aberto = abertos[g.nome];
        const lista = inteiros[g.nome] ? g.itens : g.itens.slice(0, VISIVEIS);
        return (
          <div key={g.nome} className="tg-grupo">
            <div className="tg-grupo-topo">
              <button
                type="button"
                className="tg-grupo-nome"
                aria-expanded={aberto}
                onClick={() => setAbertos((a) => ({ ...a, [g.nome]: !a[g.nome] }))}
              >
                {aberto ? "" : "▸ "}
                {g.nome}
                <span className="tg-conta">{g.itens.length} {g.itens.length === 1 ? "item" : "itens"}</span>
              </button>
              <button type="button" className="tg-btn" disabled={gravando} onClick={() => gravar(g.itens)}>
                Confirmar as sugestões
              </button>
            </div>
            {aberto && (
              <>
                {lista.map((i) => (
                  <div key={i.id} className="tg-item">
                    <span className="tg-titulo">
                      {i.titulo}
                      {lidas?.some((m) => m.id === i.id) && <span className="tg-pelo">pelo resumo</span>}
                    </span>
                    <span className="tg-venceu">{vencidoEmPalavras(i.vencidoHaDias)}</span>
                    <span className="tg-seg" role="group" aria-label={`Resposta para ${i.titulo}`}>
                      {ESCOLHAS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          aria-pressed={(escolhas[i.id] ?? i.sugestao) === e}
                          onClick={() => setEscolhas((a) => ({ ...a, [i.id]: e }))}
                        >
                          {ROTULO_DA_ESCOLHA[e]}
                        </button>
                      ))}
                    </span>
                  </div>
                ))}
                {!inteiros[g.nome] && g.itens.length > VISIVEIS && (
                  <button type="button" className="tg-mais" onClick={() => setInteiros((a) => ({ ...a, [g.nome]: true }))}>
                    mostrar os outros {g.itens.length - VISIVEIS}
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
      {erro && <p className="tg-erro">{erro}</p>}
    </section>
  );
}
