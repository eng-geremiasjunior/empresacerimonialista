"use client";

// "Hoje, só uma coisa" (desenho v4, README §6.1; protótipo, template
// 148–168 e lógica 965–977). Uma tarefa da família por vez, de três em
// três: "Pronto, fizemos!" marca pela mesma porta da tela de Tarefas
// (portal_concluir_tarefa para o que a cerimonialista pediu, a própria
// linha para o que a família incluiu), o selo `pop` aparece no centro do
// cartão e a próxima entra. Acabadas as três, as três seguintes; sem
// nenhuma, "Tudo em dia."

import { useEffect, useMemo, useState, useTransition } from "react";
import { marcarTarefa } from "@/app/(portal)/portal/[eventoId]/tarefas/actions";
import { Icone, SeloPop } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import type { TarefaDoDia } from "./montar";

const POR_RODADA = 3;

export function HojeUmaCoisa({
  tarefas,
  podeMarcar,
  quemCuida,
}: {
  tarefas: TarefaDoDia[];
  /** "só leitura" não marca */
  podeMarcar: boolean;
  /** primeiro nome de quem cuida do resto; null na conta de família */
  quemCuida: string | null;
}) {
  const { eventoId, avisar } = usePortalNoivos();
  const [, iniciar] = useTransition();
  // as três "de hoje": ficam paradas enquanto a família anda por elas
  const [rodada, setRodada] = useState<string[]>(() => tarefas.slice(0, POR_RODADA).map((t) => t.id));
  const [feitas, setFeitas] = useState<string[]>([]);
  const [foco, setFoco] = useState<string | null>(() => tarefas[0]?.id ?? null);
  const [selo, setSelo] = useState(0);
  // marcou algo nesta visita: "Tudo em dia" diz que fizeram, e não "nada esperando"
  const [fezAlgo, setFezAlgo] = useState(false);

  const porId = useMemo(() => new Map(tarefas.map((t) => [t.id, t])), [tarefas]);
  const pendentesDaRodada = rodada.filter((id) => !feitas.includes(id) && porId.has(id));
  const restantes = tarefas.filter((t) => !feitas.includes(t.id));

  // o servidor mudou a lista (a cerimonialista marcou, ou chegou tarefa
  // nova): se a rodada esvaziou e ainda há o que fazer, a próxima rodada
  useEffect(() => {
    if (pendentesDaRodada.length > 0 || restantes.length === 0) return;
    const proximas = restantes.slice(0, POR_RODADA).map((t) => t.id);
    setRodada(proximas);
    setFoco(proximas[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarefas]);

  const idAtual = foco && pendentesDaRodada.includes(foco) ? foco : pendentesDaRodada[0] ?? null;
  const atual = idAtual ? porId.get(idAtual) ?? null : null;

  function verAProxima() {
    if (!idAtual || pendentesDaRodada.length < 2) return;
    const k = pendentesDaRodada.indexOf(idAtual);
    setFoco(pendentesDaRodada[(k + 1) % pendentesDaRodada.length]);
  }

  function concluir() {
    if (!atual) return;
    const antes = { rodada, feitas, foco };
    const novasFeitas = [...feitas, atual.id];
    const sobraNaRodada = rodada.filter((id) => !novasFeitas.includes(id) && porId.has(id));
    setFezAlgo(true);
    setFeitas(novasFeitas);
    setSelo((n) => n + 1);
    if (sobraNaRodada.length > 0) {
      // a próxima depois desta, na ordem da rodada
      const k = rodada.indexOf(atual.id);
      const depois = [...rodada.slice(k + 1), ...rodada.slice(0, k)].find((id) => sobraNaRodada.includes(id));
      setFoco(depois ?? sobraNaRodada[0]);
    } else {
      const proximas = tarefas
        .filter((t) => !novasFeitas.includes(t.id))
        .slice(0, POR_RODADA)
        .map((t) => t.id);
      if (proximas.length > 0) {
        setRodada(proximas);
        setFoco(proximas[0]);
      }
    }
    iniciar(async () => {
      const r = await marcarTarefa(eventoId, { id: atual.id, origem: atual.origem }, true);
      if ("error" in r) {
        setRodada(antes.rodada);
        setFeitas(antes.feitas);
        setFoco(antes.foco);
        avisar(r.error, true);
      }
    });
  }

  const pos = idAtual ? rodada.indexOf(idAtual) + 1 : 0;
  const resto = quemCuida ? ` O resto está com ${quemCuida}.` : "";

  const temAcoes = podeMarcar || pendentesDaRodada.length > 1;

  return (
    <div className={`pn-visao-geral-hoje${atual && temAcoes ? "" : " uma-coluna"}`}>
      {atual ? (
        <>
          <div style={{ minWidth: 0 }}>
            <div className="pn-visao-geral-hoje-rotulo">
              <span className="pn-visao-geral-halo" aria-hidden />
              <span className="pn-visao-geral-hoje-eyebrow">Hoje, só uma coisa</span>
              {rodada.length > 1 && (
                <span className="pn-visao-geral-hoje-conta">
                  · {pos} de {rodada.length}
                </span>
              )}
            </div>
            <div className="pn-visao-geral-hoje-tarefa">
              <div className="pn-visao-geral-hoje-icone">
                <Icone nome={atual.icone} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="pn-t pn-visao-geral-hoje-titulo">{atual.titulo}</div>
                {(atual.sub || atual.quando) && (
                  <div className="pn-visao-geral-hoje-sub">
                    {atual.sub}
                    {atual.sub && atual.quando ? " · " : ""}
                    {atual.quando && <span className="quando">{atual.quando}</span>}
                  </div>
                )}
              </div>
            </div>
            {atual.dica && (
              <div className="pn-visao-geral-hoje-dica">
                <Icone nome="lightbulb" tamanho={20} cor="#9a5a34" />
                <span>{atual.dica}</span>
              </div>
            )}
          </div>
          {temAcoes && (
          <div className="pn-visao-geral-hoje-acoes">
            {podeMarcar && (
              <button type="button" className="pn-visao-geral-primario" onClick={concluir}>
                Pronto, fizemos!
              </button>
            )}
            {pendentesDaRodada.length > 1 && (
              <button type="button" className="pn-visao-geral-secundario" onClick={verAProxima}>
                Ver a próxima
              </button>
            )}
          </div>
          )}
        </>
      ) : (
        <div className="pn-visao-geral-hoje-tudo">
          <div className="pn-t pn-visao-geral-hoje-tudo-titulo">Tudo em dia.</div>
          <div className="pn-visao-geral-hoje-tudo-texto">
            {fezAlgo ? "Vocês fizeram tudo o que era para agora." : "Nada esperando por vocês agora."}
            {resto}
          </div>
        </div>
      )}
      {selo > 0 && <SeloPop key={selo} />}
    </div>
  );
}
