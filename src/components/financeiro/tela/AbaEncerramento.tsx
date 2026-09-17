"use client";

// Aba "Encerramento" — conciliação, fechamento e prestação de contas.
//
// Os três estavam competindo com o dia a dia no mesmo scroll. Como aba
// própria, aparecem quando são relevantes: no fim do evento. Cada card
// diz em que passo está e leva ao painel que faz o trabalho.

import { useRef } from "react";
import { money } from "@/lib/financeiro-core";

type Tone = "ok" | "wait" | "neutral";

export function AbaEncerramento({
  conciliacao,
  fechamento,
  prestacao,
  painelConciliacao,
  painelFechamento,
  painelPrestacao,
}: {
  conciliacao: { pendentes: number; ultimoExtrato: string | null };
  fechamento: {
    fechadoEm: string | null;
    depoisDoEvento: boolean;
    verba: number | null;
    contratado: number;
    livre: number | null;
  };
  prestacao: { pagamentos: number; comComprovante: number; entregue: number };
  painelConciliacao: React.ReactNode;
  painelFechamento: React.ReactNode;
  painelPrestacao: React.ReactNode;
}) {
  const refs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  function ir(i: number) {
    const el = refs[i].current;
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 16,
      behavior: "smooth",
    });
  }

  const passos: {
    titulo: string;
    badge: string;
    tone: Tone;
    texto: string;
    dados: string;
    botao: string;
    alvo: number;
  }[] = [
    {
      titulo: "Conciliação bancária",
      badge: conciliacao.pendentes > 0 ? "Pendente" : "Em dia",
      tone: conciliacao.pendentes > 0 ? "wait" : "ok",
      texto:
        "Importe o extrato e case cada saída com o lançamento que ela pagou. O que não casar fica à vista.",
      dados:
        (conciliacao.ultimoExtrato
          ? `último extrato: ${conciliacao.ultimoExtrato}`
          : "nenhum extrato importado") +
        ` · ${conciliacao.pendentes} ${
          conciliacao.pendentes === 1 ? "linha sem par" : "linhas sem par"
        }`,
      botao: "Importar extrato",
      alvo: 0,
    },
    {
      titulo: "Fechamento do evento",
      badge: fechamento.fechadoEm
        ? "Fechado"
        : fechamento.depoisDoEvento
          ? "Pendente"
          : "Após o evento",
      tone: fechamento.fechadoEm
        ? "ok"
        : fechamento.depoisDoEvento
          ? "wait"
          : "neutral",
      texto:
        "O balanço da verba no fim: o que entrou, o que saiu e o que sobrou. Fechar congela os números.",
      dados: [
        fechamento.verba == null ? "sem verba definida" : `verba ${money(fechamento.verba)}`,
        `contratado ${money(fechamento.contratado)}`,
        fechamento.livre == null ? "livre —" : `livre ${money(fechamento.livre)}`,
      ].join(" · "),
      botao: "Ver balanço",
      alvo: 1,
    },
    {
      titulo: "Prestação de contas",
      badge: prestacao.entregue > 0 ? "Entregue" : "Após o fechamento",
      tone: prestacao.entregue > 0 ? "ok" : "neutral",
      texto:
        "O relatório que o casal recebe, com os comprovantes anexados. Entregar congela a versão.",
      dados: `${prestacao.comComprovante} comprovantes anexados de ${prestacao.pagamentos} pagamentos`,
      botao: "Pré-visualizar relatório",
      alvo: 2,
    },
  ];

  return (
    <div style={{ marginTop: 16, animation: "fe-sobe .2s ease" }}>
      <div className="fe-passos">
        {passos.map((p, i) => (
          <div className="fe-card fe-passo" key={p.titulo}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span className="fe-rotulo">Passo {i + 1}</span>
              <span className={`fe-badge ${p.tone}`}>{p.badge}</span>
            </div>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
            <p className="fe-passo-dados">{p.dados}</p>
            <button type="button" className="fe-btn" onClick={() => ir(p.alvo)}>
              {p.botao}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }} ref={refs[0]}>
        {painelConciliacao}
      </div>
      <div style={{ marginTop: 20 }} ref={refs[1]}>
        {painelFechamento}
      </div>
      <div style={{ marginTop: 20 }} ref={refs[2]}>
        {painelPrestacao}
      </div>
    </div>
  );
}
