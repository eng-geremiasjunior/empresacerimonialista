"use client";

// O mapa mental na página de vendas — o COMPONENTE REAL, não uma cópia.
//
// `MapaMental` é o mesmo que a cerimonialista abre dentro do Planejamento:
// o evento no centro, os objetivos em volta, as linhas traçando junto com
// a cascata de entrada, o Copiloto narrando ao lado. Aqui ele recebe um
// evento fictício montado a partir do método real (demo-metodo.ts) — se
// a tela do sistema mudar, esta muda junto, sozinha. Nada de banco, nada
// de IA: tudo nasce no navegador.
//
// Os cliques que no app levam a uma decisão aqui não levam a lugar
// nenhum: é vitrine, não ferramenta.

import { useEffect, useState } from "react";
import { MapaMental } from "@/components/planejamento/MapaMental";
import type { Decisao, Objetivo } from "@/lib/supabase/planejamento";
import { METODO_DA_DEMO, type TipoDaDemo } from "@/components/planos/demo-metodo";

const F_TITLE = "var(--font-title), Inter, system-ui, sans-serif";
const F_MONO = "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace";

function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const x = new Date(Date.UTC(a, m - 1, d));
  x.setUTCDate(x.getUTCDate() + dias);
  return x.toISOString().slice(0, 10);
}

/**
 * O evento fictício, no formato que o Planejamento entrega ao mapa. Os
 * objetivos e as decisões são os do método real; verba, valores por
 * objetivo e o que já foi decidido são cenário — um casamento a oito
 * meses, com a estrutura e o espaço já resolvidos, para o mapa ter luz e
 * sombra em vez de nascer todo cinza.
 */
function eventoFicticio(tipo: TipoDaDemo, dataEvento: string, hojeIso: string) {
  const m = METODO_DA_DEMO[tipo];
  const verbaTotal = tipo === "casamento" ? 80000 : 45000;
  const ativos = m.objetivos.filter((o) => o.ativo);
  // alocação de referência: proporcional ao número de decisões, que é o
  // peso que o método dá a cada assunto
  const somaDecisoes = ativos.reduce((s, o) => s + o.total, 0);

  const objetivos: Objetivo[] = m.objetivos.map((o, i) => {
    const resolvidas = i < 2 ? o.total : i < 4 ? Math.floor(o.total / 2) : 0;
    const decisoes: Decisao[] = o.decisoes.map((d, j) => {
      const decidida = j < (i < 2 ? o.decisoes.length : i < 4 ? 1 : 0);
      return {
        id: `d-${i}-${j}`,
        objetivoId: `o-${i}`,
        codigo: null,
        titulo: d.titulo,
        descricao: null,
        responsavel:
          d.resp === "cliente" ? "noivos" : d.resp === "ambos" ? "ambos" : "cerimonialista",
        offsetIdealDias: d.dias,
        offsetMinDias: null,
        offsetMaxDias: null,
        prazoPrevisto: somarDias(dataEvento, -d.dias),
        prioridade: 100 - j,
        ordem: j,
        estado: decidida ? "decidida" : "pendente",
        campos: [],
        camposPreenchidos: 0,
        aguardamConferencia: 0,
        gerariaTarefas: [],
      };
    });
    const maisCedo = Math.max(...o.decisoes.map((d) => d.dias));
    const faltam =
      Math.round(
        (new Date(somarDias(dataEvento, -maisCedo)).getTime() - new Date(hojeIso).getTime()) /
          86400000
      );
    return {
      id: `o-${i}`,
      nome: o.nome,
      descricao: null,
      ordem: i,
      ativo: o.ativo,
      valorPrevisto: o.ativo ? Math.round((verbaTotal * 0.9 * o.total) / somaDecisoes) : null,
      faixaPctMin: null,
      faixaPctIdeal: null,
      faixaPctMax: null,
      responsavelDominante:
        o.decisoes[0]?.resp === "cliente" ? "noivos" : o.decisoes[0]?.resp === "ambos" ? "ambos" : "cerimonialista",
      decisoes,
      decididas: resolvidas,
      aplicaveis: o.total,
      janelaDias: maisCedo,
      bucket: resolvidas >= o.total ? "concluido" : faltam <= 0 ? "agora" : faltam <= 60 ? "proximas" : "depois",
      faltamDias: faltam,
    };
  });

  const comprometido = objetivos.reduce((s, o) => s + (o.valorPrevisto ?? 0), 0);
  return {
    objetivos,
    verba: {
      total: verbaTotal,
      reservaPct: 10,
      reservaValor: verbaTotal * 0.1,
      comprometido,
      saldo: verbaTotal - comprometido - verbaTotal * 0.1,
      distribuicaoDesatualizada: false,
    },
  };
}

export function DemoMapaMental() {
  const [tipo, setTipo] = useState<TipoDaDemo>("casamento");
  // relógio só depois da hidratação (Date no primeiro render quebra a
  // hidratação em produção); enquanto isso o mapa não monta
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => setHoje(new Date().toISOString().slice(0, 10)), []);
  const dataEvento = hoje ? somarDias(hoje, 240) : null;
  const dados = hoje && dataEvento ? eventoFicticio(tipo, dataEvento, hoje) : null;
  const nome = tipo === "casamento" ? "Marina e Téo" : "Helena";
  const local = tipo === "casamento" ? "Espaço Villa Real" : "Casa Bardot";
  const noop = () => {};

  return (
    <section
      style={{
        maxWidth: "1080px",
        margin: "clamp(56px,7vw,88px) auto 0",
        padding: "0 clamp(20px,4vw,28px)",
      }}
    >
      <span style={{ display: "block", margin: "0 0 10px", fontFamily: F_MONO, fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
        Planejamento · mapa mental
      </span>
      <h2 style={{ margin: "0 0 12px", maxWidth: "26ch", fontFamily: F_TITLE, fontWeight: "600", fontSize: "clamp(23px,3.2vw,34px)", lineHeight: "1.15", letterSpacing: "-0.028em", textWrap: "pretty" }}>
        O evento inteiro numa olhada.
      </h2>
      <p style={{ margin: "0", maxWidth: "60ch", fontSize: "16.5px", lineHeight: "1.6", color: "#6B6259" }}>
        Cada objetivo em volta do evento, com quanto já foi decidido e quanto está
        previsto. As linhas se acendem na ordem em que a cerimonialista precisa
        olhar, e o Copiloto lê o mapa em voz alta — com números, não com opinião.
      </p>

      <div style={{ display: "flex", gap: "8px", margin: "20px 0 14px" }}>
        {(["casamento", "debutante"] as TipoDaDemo[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            style={{
              height: "34px",
              padding: "0 14px",
              borderRadius: "999px",
              border: `1px solid ${tipo === t ? "#6E3F5F" : "#E7E5E4"}`,
              background: tipo === t ? "#6E3F5F" : "#FFFFFF",
              color: tipo === t ? "#FAF8F5" : "#3D3835",
              fontFamily: "inherit",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {METODO_DA_DEMO[t].rotulo}
          </button>
        ))}
      </div>

      {dados && dataEvento && (
        // key no tipo: trocar o evento refaz a cascata de entrada, como
        // quando se abre o mapa de outro evento
        <div key={tipo} data-mapa-demo="1" style={{ fontFamily: "var(--font-ui), 'Instrument Sans', sans-serif" }}>
          <MapaMental
            tipoEvento={tipo}
            objetivos={dados.objetivos}
            clienteNome={nome}
            localEvento={local}
            dataEvento={dataEvento}
            diasAteEvento={240}
            escala={null}
            cenario={null}
            arquetipos={{ escala: [], cenario: [] }}
            verba={dados.verba}
            onFechar={noop}
            onIrParaObjetivo={noop}
            onIrParaDecisao={noop}
          />
        </div>
      )}
    </section>
  );
}
