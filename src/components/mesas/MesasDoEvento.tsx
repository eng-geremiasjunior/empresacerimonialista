"use client";

// A aba Mesas: croqui em escala + lista de convidados + saúde ao vivo.
//
// Desktop: arrasta mesa no croqui, arrasta convidado da lista para a
// mesa. Celular: o croqui vira leitura e a atribuição é por lista —
// toca no convidado, escolhe a mesa. Grava só no soltar; o movimento é
// estado local.
//
// O que é interno fica interno: o motivo de "não sentar junto" aparece
// SÓ aqui, marcado como anotação sua; restrição alimentar circula por
// categoria (a contagem do buffet) com o detalhe nominal restrito a
// esta tela.

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Armchair, Image as IconePlanta, Plus, Printer, Trash2, UserRound, X } from "lucide-react";
import {
  contadores,
  distanciaEntre,
  pegadaDaMesa,
  NOME_ELEMENTO,
  NOME_RESTRICAO,
  nomeTipoMesa,
  problemasDeCirculacao,
  saudeDaMesa,
  type ConvidadoCroqui,
  type Elemento,
  type Mesa,
  type SaudeMesa,
  type TipoElemento,
  type TipoRestricao,
} from "@/lib/croqui-core";
import type { ConvidadoDaLista, Relacao, Salao } from "@/lib/supabase/mesas";
import { hojeBR } from "@/lib/tempo";
import { Croqui } from "@/components/mesas/Croqui";
import {
  adicionarConvidadoEquipe,
  adicionarConvidadosEmLote,
  ajustarPlanta,
  alocarConvidado,
  atualizarConvidadoCroqui,
  atualizarMesa,
  criarElemento,
  criarMesas,
  marcarPresenca,
  moverElemento,
  moverMesa,
  ordenarMesa,
  removerElemento,
  removerMesa,
  removerPlanta,
  removerRelacao,
  salvarPlanta,
  salvarRelacao,
  salvarSalao,
} from "@/app/(app)/eventos/[id]/mesas/actions";
import { ModalMesa } from "@/components/mesas/ModalMesa";
import { ImportarPlanta } from "@/components/mesas/ImportarPlanta";
import { analisarLista, ROTULO_COLUNA } from "@/lib/convidados-colar";

const TIPOS_ELEMENTO: TipoElemento[] = [
  "pista", "palco", "bar", "praca_alimentacao", "porta", "banheiro", "coluna", "saida_emergencia",
];
const RESTRICOES: TipoRestricao[] = ["vegano", "vegetariano", "sem_gluten", "sem_lactose", "alergia", "outro"];

const campo =
  "rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none";
const botao =
  "rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50";
const botaoForte =
  "rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50";

export function MesasDoEvento({
  eventId,
  tipoEvento,
  eventDate,
  salao,
  mesas: mesasProp,
  elementos: elementosProp,
  convidados: convidadosProp,
  relacoes,
}: {
  eventId: string;
  /** tipo do evento — como esta festa chama a mesa 'noivos' */
  tipoEvento: string;
  /** data do evento (ISO) — a partir dela a lista ganha o toque "chegou" */
  eventDate: string;
  salao: Salao | null;
  mesas: Mesa[];
  elementos: Elemento[];
  convidados: ConvidadoDaLista[];
  relacoes: Relacao[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  // espelho otimista: o arrasto atualiza aqui na hora; o servidor confirma depois
  const [mesas, setMesas] = useState(mesasProp);
  const [convidados, setConvidados] = useState(convidadosProp);
  useEffect(() => setMesas(mesasProp), [mesasProp]);
  useEffect(() => setConvidados(convidadosProp), [convidadosProp]);

  // "hoje" só depois de montar: relógio no 1º render quebra a hidratação
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => setHoje(hojeBR()), []);
  const diaDoEvento = hoje !== null && hoje >= eventDate;

  const [selecionada, setSelecionada] = useState<string | null>(null);

  function rodar(acao: () => Promise<{ error?: string } | { success: true }>) {
    iniciar(async () => {
      const r = await acao();
      if ("error" in r && r.error) setAviso(r.error);
      else {
        setAviso(null);
        router.refresh();
      }
    });
  }

  /* ---------- saúde ao vivo ---------- */

  const relacoesCore = useMemo(
    () => relacoes.map((r) => ({ convidadoA: r.convidadoA, convidadoB: r.convidadoB, tipo: r.tipo })),
    [relacoes]
  );
  const saude = useMemo(() => {
    const m = new Map<string, SaudeMesa>();
    for (const mesa of mesas) m.set(mesa.id, saudeDaMesa(mesa, convidados, relacoesCore));
    return m;
  }, [mesas, convidados, relacoesCore]);

  const circulacao = useMemo(() => problemasDeCirculacao(mesas, []), [mesas]);
  const circulacaoSaida = useMemo(
    () => problemasDeCirculacao(mesas, elementosProp),
    [mesas, elementosProp]
  );
  const sobrepostasIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < mesas.length; i++) {
      for (let j = i + 1; j < mesas.length; j++) {
        if (distanciaEntre(pegadaDaMesa(mesas[i]), pegadaDaMesa(mesas[j])) === 0) {
          ids.add(mesas[i].id);
          ids.add(mesas[j].id);
        }
      }
    }
    return ids;
  }, [mesas]);
  const saidaObstruidaIds = useMemo(
    () =>
      new Set(
        circulacaoSaida.filter((p) => p.tipo === "saida_obstruida").map((p) => (p.tipo === "saida_obstruida" ? p.mesaId : ""))
      ),
    [circulacaoSaida]
  );
  const comProblema = useMemo(
    () => new Set([...saude.entries()].filter(([, s]) => s.problemas.length > 0).map(([id]) => id)),
    [saude]
  );
  const ocupacao = useMemo(() => {
    const m = new Map<string, string>();
    for (const mesa of mesas) {
      const s = saude.get(mesa.id);
      if (s) m.set(mesa.id, mesa.tipo === "bolo" ? "" : `${s.ocupacao}/${mesa.lugares}`);
    }
    return m;
  }, [mesas, saude]);

  const cont = useMemo(() => contadores(convidados), [convidados]);
  // quem chegou, contando gente como `contadores` conta (1 + acompanhantes)
  const chegaram = useMemo(
    () => convidados.filter((c) => c.presenteEm).reduce((s, c) => s + 1 + c.acompanhantes, 0),
    [convidados]
  );
  const rotuloDe = useMemo(() => new Map(mesas.map((m) => [m.id, m.rotulo])), [mesas]);
  const nomeDe = useMemo(() => new Map(convidados.map((c) => [c.id, c.nome])), [convidados]);

  // a planta só entra no croqui depois de calibrada — sem escala ela
  // enganaria mais do que ajudaria
  const plantaNoCroqui = useMemo(() => {
    const p = salao?.planta;
    if (!p?.url || p.larguraCm == null || p.alturaCm == null) return null;
    return {
      url: p.url,
      xCm: p.xCm,
      yCm: p.yCm,
      larguraCm: p.larguraCm,
      alturaCm: p.alturaCm,
      opacidade: p.opacidade,
    };
  }, [salao]);

  const proximoNumero = useMemo(() => {
    const numeros = mesas
      .map((m) => (/^\d+$/.test(m.rotulo) ? Number(m.rotulo) : 0))
      .filter((n) => n > 0);
    return numeros.length > 0 ? Math.max(...numeros) + 1 : mesas.length + 1;
  }, [mesas]);

  /* ---------- movimentos ---------- */

  function moveu(kind: "mesa" | "elemento", id: string, xCm: number, yCm: number) {
    if (kind === "mesa") {
      setMesas((atual) => atual.map((m) => (m.id === id ? { ...m, xCm, yCm } : m)));
      rodar(() => moverMesa(eventId, id, xCm, yCm));
    } else {
      rodar(() => moverElemento(eventId, id, xCm, yCm));
    }
  }

  function alocar(convidadoId: string, mesaId: string | null) {
    setConvidados((atual) =>
      atual.map((c) => (c.id === convidadoId ? { ...c, mesaId, ordemNaMesa: null } : c))
    );
    rodar(() => alocarConvidado(eventId, convidadoId, mesaId));
  }

  function marcarChegada(convidadoId: string, presente: boolean) {
    setConvidados((atual) =>
      atual.map((c) =>
        c.id === convidadoId
          ? { ...c, presenteEm: presente ? new Date().toISOString() : null }
          : c
      )
    );
    rodar(() => marcarPresenca(eventId, convidadoId, presente));
  }

  /* ---------- sem salão ainda: o primeiro passo ---------- */

  if (!salao) {
    return <FormSalao eventId={eventId} aviso={aviso} rodar={rodar} pendente={pendente} />;
  }

  const mesaAtiva = mesas.find((m) => m.id === selecionada) ?? null;

  return (
    <div className="space-y-4">
      {/* contadores fixos + ações */}
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur">
        <p className="text-sm text-gray-600">
          {diaDoEvento && (
            <>
              <b className="text-gray-900">{chegaram}</b> chegaram de{" "}
            </>
          )}
          <b className="text-gray-900">{cont.confirmados}</b> confirmados
          <span className="mx-1.5 text-gray-300">·</span>
          <b className="text-gray-900">{cont.alocados}</b> com mesa
          <span className="mx-1.5 text-gray-300">·</span>
          <b className={cont.semMesa > 0 ? "text-amber-700" : "text-gray-900"}>{cont.semMesa}</b> sem mesa
          {cont.aguardando > 0 && (
            <span className="text-gray-400"> · {cont.aguardando} sem resposta</span>
          )}
        </p>
        <div className="ml-auto flex items-center gap-1.5">
          <MenuImprimir eventId={eventId} />
        </div>
      </div>

      {aviso && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {aviso}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* coluna do croqui */}
        <div className="min-w-0 space-y-3">
          <Ferramentas
            eventId={eventId}
            tipoEvento={tipoEvento}
            salao={salao}
            proximoNumero={proximoNumero}
            rodar={rodar}
            pendente={pendente}
          />

          {/* o croqui arrasta no desktop; no celular é leitura */}
          <div className="hidden md:block">
            <Croqui
              larguraCm={salao.larguraCm}
              alturaCm={salao.alturaCm}
              mesas={mesas}
              elementos={elementosProp}
              ocupacao={ocupacao}
              comProblema={comProblema}
              sobrepostasIds={sobrepostasIds}
              saidaObstruidaIds={saidaObstruidaIds}
              selecionada={selecionada}
              editavel
              planta={plantaNoCroqui}
              aoSelecionar={setSelecionada}
              aoMover={moveu}
              aoSoltarConvidado={(mesaId, convidadoId) => alocar(convidadoId, mesaId)}
            />
          </div>
          <div className="md:hidden">
            <Croqui
              larguraCm={salao.larguraCm}
              alturaCm={salao.alturaCm}
              mesas={mesas}
              elementos={elementosProp}
              ocupacao={ocupacao}
              comProblema={comProblema}
              sobrepostasIds={sobrepostasIds}
              saidaObstruidaIds={saidaObstruidaIds}
              selecionada={selecionada}
              editavel={false}
              planta={plantaNoCroqui}
              aoSelecionar={setSelecionada}
              aoMover={() => undefined}
              aoSoltarConvidado={() => undefined}
            />
            <p className="mt-1 text-xs text-gray-400">
              No celular o croqui é leitura — a mesa de cada convidado você escolhe na lista.
            </p>
          </div>

          <AvisosAoVivo
            circulacao={circulacao}
            circulacaoSaida={circulacaoSaida}
            saude={saude}
            rotuloDe={rotuloDe}
          />

          {mesaAtiva && (
            <PainelMesa
              eventId={eventId}
              tipoEvento={tipoEvento}
              mesa={mesaAtiva}
              convidados={convidados}
              rodar={rodar}
              pendente={pendente}
              aoFechar={() => setSelecionada(null)}
            />
          )}

          <Relacoes
            eventId={eventId}
            relacoes={relacoes}
            convidados={convidados}
            nomeDe={nomeDe}
            rodar={rodar}
            pendente={pendente}
          />
        </div>

        {/* coluna da lista */}
        <ListaLateral
          eventId={eventId}
          tipoEvento={tipoEvento}
          convidados={convidados}
          mesas={mesas}
          rotuloDe={rotuloDe}
          diaDoEvento={diaDoEvento}
          alocar={alocar}
          marcarChegada={marcarChegada}
          rodar={rodar}
          pendente={pendente}
        />
      </div>
    </div>
  );
}

/* ================================================================
 * O primeiro passo: as medidas do espaço
 * ================================================================ */

function FormSalao({
  eventId,
  aviso,
  rodar,
  pendente,
  atual,
  aoFechar,
}: {
  eventId: string;
  aviso: string | null;
  rodar: (a: () => Promise<{ error?: string } | { success: true }>) => void;
  pendente: boolean;
  atual?: Salao;
  aoFechar?: () => void;
}) {
  const [largura, setLargura] = useState(atual ? String(atual.larguraCm / 100) : "20");
  const [altura, setAltura] = useState(atual ? String(atual.alturaCm / 100) : "15");
  const [nome, setNome] = useState(atual?.nome ?? "");

  function salvar() {
    rodar(() =>
      salvarSalao(eventId, {
        nome,
        larguraM: Number(largura.replace(",", ".")),
        alturaM: Number(altura.replace(",", ".")),
      })
    );
    aoFechar?.();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">
        {atual ? "Medidas do espaço" : "Comece pelo espaço"}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Largura e profundidade reais do salão, em metros. É a escala que
        permite medir corredor e imprimir o croqui para a montagem.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-500">
          Largura (m)
          <input
            className={`${campo} mt-1 block w-24`}
            inputMode="decimal"
            value={largura}
            onChange={(e) => setLargura(e.target.value)}
          />
        </label>
        <label className="text-xs text-gray-500">
          Profundidade (m)
          <input
            className={`${campo} mt-1 block w-24`}
            inputMode="decimal"
            value={altura}
            onChange={(e) => setAltura(e.target.value)}
          />
        </label>
        <label className="min-w-40 flex-1 text-xs text-gray-500">
          Nome do espaço (opcional)
          <input
            className={`${campo} mt-1 block w-full`}
            placeholder="Salão principal"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </label>
        <button type="button" className={botaoForte} onClick={salvar} disabled={pendente}>
          Salvar
        </button>
        {aoFechar && (
          <button type="button" className={botao} onClick={aoFechar}>
            Cancelar
          </button>
        )}
      </div>
      {aviso && <p className="mt-2 text-sm text-red-600">{aviso}</p>}
    </section>
  );
}

/* ================================================================
 * Ferramentas: mesas novas, elementos, medidas
 * ================================================================ */

function Ferramentas({
  eventId,
  tipoEvento,
  salao,
  proximoNumero,
  rodar,
  pendente,
}: {
  eventId: string;
  tipoEvento: string;
  salao: Salao;
  proximoNumero: number;
  rodar: (a: () => Promise<{ error?: string } | { success: true }>) => void;
  pendente: boolean;
}) {
  const [elemento, setElemento] = useState<TipoElemento>("pista");
  const [editandoSalao, setEditandoSalao] = useState(false);
  const [modalMesa, setModalMesa] = useState(false);
  const [modalPlanta, setModalPlanta] = useState(false);

  if (editandoSalao) {
    return (
      <FormSalao
        eventId={eventId}
        aviso={null}
        rodar={rodar}
        pendente={pendente}
        atual={salao}
        aoFechar={() => setEditandoSalao(false)}
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={botaoForte}
          disabled={pendente}
          onClick={() => setModalMesa(true)}
        >
          <Plus size={14} className="mr-1 inline" />
          Mesa
        </button>

        <select
          className={campo}
          value={elemento}
          onChange={(e) => setElemento(e.target.value as TipoElemento)}
          aria-label="Elemento do espaço"
        >
          {TIPOS_ELEMENTO.map((t) => (
            <option key={t} value={t}>
              {NOME_ELEMENTO[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={botao}
          disabled={pendente}
          onClick={() => rodar(() => criarElemento(eventId, elemento))}
        >
          <Plus size={14} className="mr-1 inline" />
          Elemento
        </button>

        <button
          type="button"
          className={botao}
          onClick={() => setModalPlanta(true)}
        >
          <IconePlanta size={14} className="mr-1 inline" />
          {salao.planta ? "Planta" : "Importar planta"}
        </button>

        <button
          type="button"
          className="ml-auto text-sm text-gray-500 underline-offset-2 hover:underline"
          onClick={() => setEditandoSalao(true)}
        >
          {salao.nome || "Salão"} · {salao.larguraCm / 100} × {salao.alturaCm / 100} m
        </button>
      </div>

      {/* a planta importada mas sem escala não é confiável: avisa e resolve */}
      {salao.planta && salao.planta.larguraCm == null && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          A planta está sem escala.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => setModalPlanta(true)}
          >
            Calibre a medida
          </button>{" "}
          para o croqui bater com o espaço real.
        </p>
      )}

      {/* opacidade: a planta é guia, não protagonista */}
      {salao.planta?.larguraCm != null && (
        <label className="flex items-center gap-2 text-xs text-gray-500">
          Planta
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            defaultValue={salao.planta.opacidade}
            onChange={(e) => rodar(() => ajustarPlanta(eventId, { opacidade: Number(e.target.value) }))}
            className="w-32 accent-gray-700"
            aria-label="Opacidade da planta"
          />
          <span className="text-gray-400">
            {(salao.planta.larguraCm / 100).toFixed(1)} ×{" "}
            {((salao.planta.alturaCm ?? 0) / 100).toFixed(1)} m
          </span>
        </label>
      )}

      {modalMesa && (
        <ModalMesa
          proximoNumero={proximoNumero}
          tipoEvento={tipoEvento}
          pendente={pendente}
          aoFechar={() => setModalMesa(false)}
          aoSalvar={(input) => {
            rodar(() => criarMesas(eventId, input));
            setModalMesa(false);
          }}
        />
      )}

      {modalPlanta && (
        <ImportarPlanta
          eventId={eventId}
          temPlanta={!!salao.planta}
          pendente={pendente}
          aoFechar={() => setModalPlanta(false)}
          aoSalvar={(input) => {
            rodar(() => salvarPlanta(eventId, input));
            setModalPlanta(false);
          }}
          aoRemover={() => {
            rodar(() => removerPlanta(eventId));
            setModalPlanta(false);
          }}
        />
      )}
    </>
  );
}

/* ================================================================
 * Avisos ao vivo
 * ================================================================ */

function AvisosAoVivo({
  circulacao,
  circulacaoSaida,
  saude,
  rotuloDe,
}: {
  circulacao: ReturnType<typeof problemasDeCirculacao>;
  circulacaoSaida: ReturnType<typeof problemasDeCirculacao>;
  saude: Map<string, SaudeMesa>;
  rotuloDe: Map<string, string>;
}) {
  const linhas: string[] = [];
  for (const p of circulacao) {
    if (p.tipo === "corredor_estreito") {
      linhas.push(
        `Corredor de ${(p.gapCm / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m entre as mesas ${rotuloDe.get(p.mesaA)} e ${rotuloDe.get(p.mesaB)} — o mínimo confortável é 1,5 m.`
      );
    } else if (p.tipo === "cadeiras_encostam") {
      linhas.push(
        `As cadeiras das mesas ${rotuloDe.get(p.mesaA)} e ${rotuloDe.get(p.mesaB)} se esbarram — ninguém consegue sentar assim.`
      );
    }
  }
  for (const p of circulacaoSaida) {
    if (p.tipo === "saida_obstruida") {
      linhas.push(`A mesa ${rotuloDe.get(p.mesaId)} está bloqueando uma saída de emergência.`);
    }
  }
  for (const [mesaId, s] of saude) {
    for (const prob of s.problemas) {
      const rotulo = rotuloDe.get(mesaId);
      if (prob.tipo === "separados_juntos") {
        linhas.push(`${prob.convidadoA} e ${prob.convidadoB} não podem ficar juntos — estão na mesa ${rotulo}.`);
      } else if (prob.tipo === "juntos_separados") {
        linhas.push(`${prob.convidado} (mesa ${rotulo}) deveria estar com ${prob.deveriaEstarCom}.`);
      } else if (prob.tipo === "crianca_sem_responsavel") {
        linhas.push(`${prob.convidado} é criança e está na mesa ${rotulo} sem o responsável.`);
      } else if (prob.tipo === "lotada") {
        linhas.push(`Mesa ${rotulo}: ${prob.ocupacao} pessoas para ${prob.lugares} lugares.`);
      }
    }
  }

  if (linhas.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <ul className="space-y-0.5">
        {linhas.map((l, i) => (
          <li key={i} className="text-xs text-amber-800">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================================================================
 * Painel da mesa selecionada
 * ================================================================ */

function PainelMesa({
  eventId,
  tipoEvento,
  mesa,
  convidados,
  rodar,
  pendente,
  aoFechar,
}: {
  eventId: string;
  tipoEvento: string;
  mesa: Mesa;
  convidados: ConvidadoCroqui[];
  rodar: (a: () => Promise<{ error?: string } | { success: true }>) => void;
  pendente: boolean;
  aoFechar: () => void;
}) {
  const [rotulo, setRotulo] = useState(mesa.rotulo);
  const [lugares, setLugares] = useState(String(mesa.lugares));
  useEffect(() => {
    setRotulo(mesa.rotulo);
    setLugares(String(mesa.lugares));
  }, [mesa.id, mesa.rotulo, mesa.lugares]);

  const naMesa = convidados
    .filter((c) => c.mesaId === mesa.id && c.confirmacao !== "nao_vai")
    .sort((a, b) => (a.ordemNaMesa ?? 99) - (b.ordemNaMesa ?? 99) || a.nome.localeCompare(b.nome, "pt-BR"));
  const [arrastando, setArrastando] = useState<string | null>(null);

  function reordenar(alvoId: string) {
    if (!arrastando || arrastando === alvoId) return;
    const ids = naMesa.map((c) => c.id);
    const de = ids.indexOf(arrastando);
    const para = ids.indexOf(alvoId);
    ids.splice(de, 1);
    ids.splice(para, 0, arrastando);
    rodar(() => ordenarMesa(eventId, mesa.id, ids));
    setArrastando(null);
  }

  return (
    <section className="rounded-xl border border-gray-300 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          Mesa {mesa.rotulo}
          <span className="ml-2 font-normal text-gray-400">{nomeTipoMesa(mesa.tipo, tipoEvento)}</span>
        </h3>
        <button type="button" onClick={aoFechar} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-500">
          Nome
          <input
            className={`${campo} mt-1 block w-36`}
            value={rotulo}
            onChange={(e) => setRotulo(e.target.value)}
            onBlur={() => rotulo !== mesa.rotulo && rodar(() => atualizarMesa(eventId, mesa.id, { rotulo }))}
          />
        </label>
        <label className="text-xs text-gray-500">
          Lugares
          <input
            className={`${campo} mt-1 block w-20`}
            inputMode="numeric"
            value={lugares}
            onChange={(e) => setLugares(e.target.value)}
            onBlur={() =>
              Number(lugares) !== mesa.lugares &&
              rodar(() => atualizarMesa(eventId, mesa.id, { lugares: Number(lugares) }))
            }
          />
        </label>
        <button
          type="button"
          className={botao}
          disabled={pendente}
          onClick={() => rodar(() => atualizarMesa(eventId, mesa.id, { rotacao: (mesa.rotacao + 45) % 360 }))}
        >
          Girar 45°
        </button>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={mesa.assentoMarcado}
            onChange={(e) => rodar(() => atualizarMesa(eventId, mesa.id, { assentoMarcado: e.target.checked }))}
          />
          Lugar marcado
        </label>
        <button
          type="button"
          className="ml-auto rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-red-300 hover:text-red-600"
          title="Remover mesa (quem estava nela volta para a lista)"
          disabled={pendente}
          onClick={() => {
            aoFechar();
            rodar(() => removerMesa(eventId, mesa.id));
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {mesa.assentoMarcado && naMesa.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500">
            A ordem é o lugar, da esquerda para a direita — arraste para trocar.
          </p>
          <ol className="mt-1.5 space-y-1">
            {naMesa.map((c, i) => (
              <li
                key={c.id}
                draggable
                onDragStart={() => setArrastando(c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  reordenar(c.id);
                }}
                className="flex cursor-grab items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-800"
              >
                <span className="w-5 text-xs text-gray-400">{i + 1}º</span>
                {c.nome}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

/* ================================================================
 * Quem senta com quem (e quem não pode)
 * ================================================================ */

function Relacoes({
  eventId,
  relacoes,
  convidados,
  nomeDe,
  rodar,
  pendente,
}: {
  eventId: string;
  relacoes: Relacao[];
  convidados: ConvidadoCroqui[];
  nomeDe: Map<string, string>;
  rodar: (a: () => Promise<{ error?: string } | { success: true }>) => void;
  pendente: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [tipo, setTipo] = useState<"junto" | "separado">("separado");
  const [motivo, setMotivo] = useState("");

  const ordenados = [...convidados].sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Quem senta com quem</h3>
        <button type="button" className={botao} onClick={() => setAberto(!aberto)}>
          {aberto ? "Fechar" : "Nova regra"}
        </button>
      </div>

      {relacoes.length === 0 && !aberto && (
        <p className="mt-1 text-sm text-gray-500">
          &ldquo;Manter juntos&rdquo; ou &ldquo;não sentar com&rdquo; — o croqui avisa quando uma regra é quebrada.
        </p>
      )}

      {aberto && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select className={campo} value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">Quem…</option>
              {ordenados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <select
              className={campo}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "junto" | "separado")}
            >
              <option value="separado">não senta com</option>
              <option value="junto">fica junto de</option>
            </select>
            <select className={campo} value={b} onChange={(e) => setB(e.target.value)}>
              <option value="">…quem</option>
              {ordenados
                .filter((c) => c.id !== a)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </select>
          </div>
          <input
            className={`${campo} w-full`}
            placeholder="Anotação sua (opcional) — não sai em nada impresso ou compartilhado"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <button
            type="button"
            className={botaoForte}
            disabled={pendente || !a || !b}
            onClick={() => {
              rodar(() =>
                salvarRelacao(eventId, { convidadoA: a, convidadoB: b, tipo, motivoInterno: motivo })
              );
              setA("");
              setB("");
              setMotivo("");
              setAberto(false);
            }}
          >
            Salvar regra
          </button>
        </div>
      )}

      {relacoes.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100">
          {relacoes.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 text-sm text-gray-800">
                {nomeDe.get(r.convidadoA)}{" "}
                <span className="text-gray-400">
                  {r.tipo === "separado" ? "não senta com" : "fica junto de"}
                </span>{" "}
                {nomeDe.get(r.convidadoB)}
                {r.motivoInterno && (
                  <p className="truncate text-xs text-gray-400">{r.motivoInterno}</p>
                )}
              </div>
              <button
                type="button"
                className="shrink-0 text-gray-300 hover:text-red-500"
                disabled={pendente}
                onClick={() => rodar(() => removerRelacao(eventId, r.id))}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ================================================================
 * A lista lateral
 * ================================================================ */

function ListaLateral({
  eventId,
  tipoEvento,
  convidados,
  mesas,
  rotuloDe,
  diaDoEvento,
  alocar,
  marcarChegada,
  rodar,
  pendente,
}: {
  eventId: string;
  tipoEvento: string;
  convidados: ConvidadoDaLista[];
  mesas: Mesa[];
  rotuloDe: Map<string, string>;
  diaDoEvento: boolean;
  alocar: (convidadoId: string, mesaId: string | null) => void;
  marcarChegada: (convidadoId: string, presente: boolean) => void;
  rodar: (a: () => Promise<{ error?: string } | { success: true }>) => void;
  pendente: boolean;
}) {
  const [filtro, setFiltro] = useState<"para_sentar" | "sem_mesa" | "nao_vai">("para_sentar");
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState("");
  const [colando, setColando] = useState(false);
  const [loteTexto, setLoteTexto] = useState("");
  const [resumoLote, setResumoLote] = useState<string | null>(null);
  // a mesma leitura do servidor, aqui em memória: o botão já diz quantos
  // nomes vão entrar e quais colunas da planilha foram reconhecidas
  const analiseLote = useMemo(() => analisarLista(loteTexto), [loteTexto]);
  const nomesDoLote = analiseLote.convidados.length;
  const [expandido, setExpandido] = useState<string | null>(null);

  const lista = useMemo(() => {
    let l = convidados;
    if (filtro === "para_sentar") l = l.filter((c) => c.confirmacao !== "nao_vai");
    if (filtro === "sem_mesa") l = l.filter((c) => c.confirmacao !== "nao_vai" && !c.mesaId);
    if (filtro === "nao_vai") l = l.filter((c) => c.confirmacao === "nao_vai");
    const q = busca.trim().toLocaleLowerCase("pt-BR");
    if (q) l = l.filter((c) => c.nome.toLocaleLowerCase("pt-BR").includes(q));
    return [...l].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [convidados, filtro, busca]);

  const mesasOrdenadas = [...mesas].sort(
    (a, b) => a.ordem - b.ordem || a.rotulo.localeCompare(b.rotulo, "pt-BR")
  );

  return (
    <aside
      className="min-w-0 space-y-2 lg:sticky lg:top-14 lg:self-start"
      // soltar um convidado fora de mesa desatribui
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("text/vela-convidado");
        if (id) alocar(id, null);
      }}
    >
      <div className="flex gap-1.5">
        {(
          [
            ["para_sentar", "Para sentar"],
            ["sem_mesa", "Sem mesa"],
            ["nao_vai", "Não vão"],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setFiltro(valor)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
              filtro === valor
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <input
        className={`${campo} w-full`}
        placeholder="Buscar pelo nome"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="flex gap-1.5">
        <input
          className={`${campo} min-w-0 flex-1`}
          placeholder="Adicionar convidado"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && novo.trim()) {
              rodar(() => adicionarConvidadoEquipe(eventId, novo));
              setNovo("");
            }
          }}
        />
        <button
          type="button"
          className={botao}
          disabled={pendente || !novo.trim()}
          onClick={() => {
            rodar(() => adicionarConvidadoEquipe(eventId, novo));
            setNovo("");
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* A lista da noiva chega pronta. Digitar 200 nomes um a um era o
          motivo mais comum para a planilha continuar aberta do lado. */}
      {!colando ? (
        <button
          type="button"
          onClick={() => setColando(true)}
          className="mt-1 self-start text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
        >
          colar uma lista inteira
        </button>
      ) : (
        <div className="mt-1 rounded-xl border border-gray-200 bg-white p-3">
          <textarea
            autoFocus
            rows={6}
            value={loteTexto}
            onChange={(e) => setLoteTexto(e.target.value)}
            placeholder={
              "Um nome por linha — ou a planilha inteira, com o cabeçalho\n\nJoão Silva\nMaria Souza + 2\nAna Lima"
            }
            className="w-full resize-y rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-gray-400"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pendente || nomesDoLote === 0}
              onClick={() =>
                rodar(async () => {
                  const r = await adicionarConvidadosEmLote(eventId, loteTexto);
                  if (!("error" in r)) {
                    setLoteTexto("");
                    setColando(false);
                    setResumoLote(
                      r.repetidos > 0
                        ? `${r.criados} adicionados · ${r.repetidos} já estavam na lista`
                        : `${r.criados} adicionados`
                    );
                  }
                  return r;
                })
              }
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Adicionar {nomesDoLote > 0 ? `${nomesDoLote} ` : ""}
              {nomesDoLote === 1 ? "nome" : "nomes"}
            </button>
            <button
              type="button"
              onClick={() => {
                setColando(false);
                setLoteTexto("");
              }}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              cancelar
            </button>
            <span className="text-xs text-gray-400">
              {analiseLote.modo === "tabela"
                ? `planilha: entram ${analiseLote.colunas
                    .map((c) => ROTULO_COLUNA[c])
                    .join(", ")}${
                    analiseLote.ignoradas.length > 0
                      ? ` · ignoro ${analiseLote.ignoradas.join(", ")}`
                      : ""
                  }`
                : "\"+ 2\" no fim da linha vira acompanhantes · planilha com cabeçalho (nome, grupo, mesa, telefone…) entra com as colunas"}
            </span>
          </div>
        </div>
      )}

      {resumoLote && (
        <p className="text-xs text-gray-500">{resumoLote}</p>
      )}

      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-3">
        {lista.length === 0 && (
          <li className="py-3 text-sm text-gray-400">
            {filtro === "nao_vai" ? "Ninguém recusou." : "Ninguém aqui."}
          </li>
        )}
        {lista.map((c) => (
          <LinhaConvidado
            key={c.id}
            eventId={eventId}
            tipoEvento={tipoEvento}
            convidado={c}
            convidados={convidados}
            mesas={mesasOrdenadas}
            rotuloDe={rotuloDe}
            expandido={expandido === c.id}
            aoExpandir={() => setExpandido(expandido === c.id ? null : c.id)}
            diaDoEvento={diaDoEvento}
            alocar={alocar}
            marcarChegada={marcarChegada}
            rodar={rodar}
            pendente={pendente}
          />
        ))}
      </ul>
      <p className="hidden text-xs text-gray-400 lg:block">
        Arraste o convidado para a mesa no croqui; solte aqui fora para tirar da mesa.
      </p>
    </aside>
  );
}

function LinhaConvidado({
  eventId,
  tipoEvento,
  convidado: c,
  convidados,
  mesas,
  rotuloDe,
  expandido,
  aoExpandir,
  diaDoEvento,
  alocar,
  marcarChegada,
  rodar,
  pendente,
}: {
  eventId: string;
  tipoEvento: string;
  convidado: ConvidadoDaLista;
  convidados: ConvidadoCroqui[];
  mesas: Mesa[];
  rotuloDe: Map<string, string>;
  expandido: boolean;
  aoExpandir: () => void;
  diaDoEvento: boolean;
  alocar: (convidadoId: string, mesaId: string | null) => void;
  marcarChegada: (convidadoId: string, presente: boolean) => void;
  rodar: (a: () => Promise<{ error?: string } | { success: true }>) => void;
  pendente: boolean;
}) {
  const podeSentar = c.confirmacao !== "nao_vai";
  const detalhes = [
    c.mesaId ? `mesa ${rotuloDe.get(c.mesaId)}` : podeSentar ? "sem mesa" : null,
    c.confirmacao === "aguardando" ? "sem resposta" : null,
    c.acompanhantes > 0 ? `+${c.acompanhantes}` : null,
    c.ehCrianca ? "criança" : null,
    ...c.restricaoTipo.map((r) => NOME_RESTRICAO[r]),
    c.acessibilidade?.trim() ? "acessibilidade" : null,
  ].filter(Boolean);

  const adultos = convidados.filter((o) => o.id !== c.id && !o.ehCrianca);

  return (
    <li className="py-2">
      <div
        draggable={podeSentar}
        onDragStart={(e) => e.dataTransfer.setData("text/vela-convidado", c.id)}
        className={`flex items-center justify-between gap-2 ${podeSentar ? "cursor-grab" : "opacity-50"}`}
      >
        <button
          type="button"
          onClick={aoExpandir}
          className="min-w-0 flex-1 text-left"
          title="Detalhes"
        >
          <p className="truncate text-sm text-gray-900">{c.nome}</p>
          {detalhes.length > 0 && (
            <p className="truncate text-xs text-gray-400">{detalhes.join(" · ")}</p>
          )}
        </button>
        {/* no dia, o toque "chegou" — de novo, desfaz */}
        {podeSentar && diaDoEvento && (
          <button
            type="button"
            disabled={pendente}
            onClick={() => marcarChegada(c.id, !c.presenteEm)}
            title={c.presenteEm ? "Desfazer" : "Marcar chegada"}
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
              c.presenteEm
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            chegou
          </button>
        )}
        {podeSentar && (
          <span className="shrink-0 text-gray-300">
            {c.mesaId ? <Armchair size={14} /> : <UserRound size={14} />}
          </span>
        )}
      </div>

      {expandido && (
        <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-2.5">
          {podeSentar && (
            <label className="block text-xs text-gray-500">
              Mesa
              <select
                className={`${campo} mt-1 block w-full`}
                value={c.mesaId ?? ""}
                onChange={(e) => alocar(c.id, e.target.value || null)}
              >
                <option value="">Sem mesa</option>
                {mesas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.rotulo} · {nomeTipoMesa(m.tipo, tipoEvento)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={c.ehCrianca}
              onChange={(e) =>
                rodar(() => atualizarConvidadoCroqui(eventId, c.id, { ehCrianca: e.target.checked }))
              }
            />
            É criança
          </label>

          {c.ehCrianca && (
            <label className="block text-xs text-gray-500">
              Responsável
              <select
                className={`${campo} mt-1 block w-full`}
                value={c.responsavelId ?? ""}
                onChange={(e) =>
                  rodar(() =>
                    atualizarConvidadoCroqui(eventId, c.id, {
                      responsavelId: e.target.value || null,
                    })
                  )
                }
              >
                <option value="">Qualquer adulto da mesa</option>
                {adultos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div>
            <p className="text-xs text-gray-500">Restrição alimentar</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {RESTRICOES.map((r) => {
                const marcada = c.restricaoTipo.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={pendente}
                    onClick={() =>
                      rodar(() =>
                        atualizarConvidadoCroqui(eventId, c.id, {
                          restricaoTipo: marcada
                            ? c.restricaoTipo.filter((x) => x !== r)
                            : [...c.restricaoTipo, r],
                        })
                      )
                    }
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      marcada
                        ? "bg-gray-900 text-white"
                        : "border border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {NOME_RESTRICAO[r]}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              O buffet recebe só a contagem por mesa — nunca o nome de quem tem o quê.
            </p>
          </div>

          <label className="block text-xs text-gray-500">
            Acessibilidade (interno)
            <input
              className={`${campo} mt-1 block w-full`}
              defaultValue={c.acessibilidade ?? ""}
              placeholder="Cadeira de rodas, mesa perto da rampa…"
              onBlur={(e) =>
                e.target.value !== (c.acessibilidade ?? "") &&
                rodar(() =>
                  atualizarConvidadoCroqui(eventId, c.id, { acessibilidade: e.target.value })
                )
              }
            />
          </label>
        </div>
      )}
    </li>
  );
}

/* ================================================================
 * Imprimir
 * ================================================================ */

function MenuImprimir({ eventId }: { eventId: string }) {
  // rota própria, fora do layout do evento: a folha sai limpa
  const base = `/imprimir/mesas/${eventId}`;
  return (
    <div className="flex items-center gap-1.5">
      <Printer size={14} className="text-gray-400" />
      <Link href={`${base}?folha=recepcao`} target="_blank" className={botao}>
        Recepção
      </Link>
      <Link href={`${base}?folha=buffet`} target="_blank" className={botao}>
        Buffet
      </Link>
      <Link href={`${base}?folha=montagem`} target="_blank" className={botao}>
        Montagem
      </Link>
    </div>
  );
}
