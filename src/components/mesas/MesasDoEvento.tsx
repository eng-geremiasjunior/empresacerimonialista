"use client";

// A aba Mesas: croqui em escala + lista de convidados + saúde ao vivo.
//
// Refeita para o celular em 30/09/2026 (referências do dono: as iniciais
// em volta da mesa, e a mesa andando junto com o convidado). O mesmo
// croqui no computador e no celular: tocar marca a peça, a folha da peça
// diz quem senta, e sentar não depende de arrastar — pela mesa ("Sentar",
// várias pessoas de uma vez) ou pelo convidado (as mesas onde ele cabe,
// ou "Ver no salão" e tocar na mesa). No computador o arrasto continua:
// mesa no croqui e convidado da lista para a mesa. Grava só no soltar; o
// movimento é estado local.
//
// O que é interno fica interno: o motivo de "não sentar junto" aparece
// SÓ aqui, marcado como anotação sua; restrição alimentar circula por
// categoria (a contagem do buffet) com o detalhe nominal restrito a
// esta tela.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Armchair,
  ChevronDown,
  ChevronUp,
  Image as IconePlanta,
  Plus,
  Printer,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  cadeirasOcupadas,
  caixaDaMesa,
  contadores,
  distanciaEntre,
  naMesaEmOrdem,
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
  alocarVarios,
  atualizarConvidadoCroqui,
  atualizarElemento,
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

/** "04" vira "Mesa 04"; "Família da noiva" fica como ela escreveu */
const nomeDaMesa = (rotulo: string) => (/^\d+$/.test(rotulo.trim()) ? `Mesa ${rotulo}` : rotulo);

function livresEmPalavras(livres: number): string {
  if (livres > 1) return `${livres} lugares livres`;
  if (livres === 1) return "1 lugar livre";
  if (livres === 0) return "completa";
  return `${-livres} ${livres === -1 ? "pessoa" : "pessoas"} a mais que os lugares`;
}

export function MesasDoEvento({
  eventId,
  tipoEvento,
  eventDate,
  salao,
  mesas: mesasProp,
  elementos: elementosProp,
  convidados: convidadosProp,
  relacoes,
  presentes,
  noPortal,
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
  /** quantos chegaram, contados pelo banco (148) — nulo se a migração não rodou */
  presentes: number | null;
  /**
   * No portal da noiva que abriu a conta sozinha (04/10/2026): quem está
   * logada só navega pelo /portal — a lista de convidados é a do portal, e
   * as folhas impressas (rota do app) ficam de fora.
   */
  noPortal?: { convidados: string };
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  // espelho otimista: o arrasto atualiza aqui na hora; o servidor confirma depois
  const [mesas, setMesas] = useState(mesasProp);
  const [elementos, setElementos] = useState(elementosProp);
  const [convidados, setConvidados] = useState(convidadosProp);
  useEffect(() => setMesas(mesasProp), [mesasProp]);
  useEffect(() => setElementos(elementosProp), [elementosProp]);
  useEffect(() => setConvidados(convidadosProp), [convidadosProp]);

  // "Ver no salão": o convidado na mão, esperando o toque numa mesa
  const [naMao, setNaMao] = useState<string | null>(null);
  // a mesa aberta no "Sentar" (várias pessoas de uma vez)
  const [sentandoNa, setSentandoNa] = useState<string | null>(null);
  const croquiRef = useRef<HTMLDivElement>(null);

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
    () => problemasDeCirculacao(mesas, elementos),
    [mesas, elementos]
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

  // o que vai escrito em cada cadeira, e quantos já sentam em cada mesa
  const ocupantes = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const mesa of mesas) m.set(mesa.id, cadeirasOcupadas(naMesaEmOrdem(mesa.id, convidados)));
    return m;
  }, [mesas, convidados]);
  const ocupacaoDe = useMemo(
    () => new Map([...saude.entries()].map(([id, s]) => [id, s.ocupacao])),
    [saude]
  );

  // sentando alguém pelo salão: as mesas onde ele não cabe ficam apagadas
  const convidadoNaMao = naMao ? convidados.find((c) => c.id === naMao) ?? null : null;
  const semLugarParaQuemEstaNaMao = useMemo(() => {
    if (!convidadoNaMao) return undefined;
    const precisa = 1 + convidadoNaMao.acompanhantes;
    return new Set(
      mesas
        .filter(
          (m) =>
            m.tipo === "bolo" ||
            m.lugares - (ocupacaoDe.get(m.id) ?? 0) + (convidadoNaMao.mesaId === m.id ? precisa : 0) < precisa
        )
        .map((m) => m.id)
    );
  }, [convidadoNaMao, mesas, ocupacaoDe]);

  const cont = useMemo(() => contadores(convidados), [convidados]);
  // "chegaram" NÃO se soma aqui: vem de presentes_do_evento (148), a
  // mesma fórmula da porta, do Modo Evento e da prestação de contas. A
  // soma local (1 + acompanhantes, sem crianças) era a terceira versão
  // do mesmo número. O toque "chegou" atualiza a linha na hora e o
  // refresh traz o total certo.
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
      setElementos((atual) => atual.map((el) => (el.id === id ? { ...el, xCm, yCm } : el)));
      rodar(() => moverElemento(eventId, id, xCm, yCm));
    }
  }

  function alocar(convidadoId: string, mesaId: string | null) {
    setConvidados((atual) =>
      atual.map((c) => (c.id === convidadoId ? { ...c, mesaId, ordemNaMesa: null } : c))
    );
    rodar(() => alocarConvidado(eventId, convidadoId, mesaId));
  }

  function sentarVarios(convidadoIds: string[], mesaId: string) {
    const ids = new Set(convidadoIds);
    setConvidados((atual) =>
      atual.map((c) => (ids.has(c.id) ? { ...c, mesaId, ordemNaMesa: null } : c))
    );
    rodar(() => alocarVarios(eventId, convidadoIds, mesaId));
  }

  // o toque no croqui: com alguém na mão, a mesa tocada é onde ele senta
  function tocou(id: string | null) {
    if (naMao) {
      // mesa apagada é aviso, não trava: lotar é escolha dela (a saúde avisa)
      if (id && mesas.some((m) => m.id === id && m.tipo !== "bolo")) {
        alocar(naMao, id);
        setNaMao(null);
        setSelecionada(id);
      }
      return;
    }
    setSelecionada(id);
  }

  function verNoSalao(convidadoId: string) {
    setSelecionada(null);
    setNaMao(convidadoId);
    croquiRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    return (
      <InicioDasMesas
        eventId={eventId}
        convidados={convidados.length}
        linkConvidados={noPortal?.convidados ?? `/eventos/${eventId}/rsvp`}
        aviso={aviso}
        rodar={rodar}
        pendente={pendente}
      />
    );
  }

  const mesaAtiva = mesas.find((m) => m.id === selecionada) ?? null;
  const elementoAtivo = elementos.find((el) => el.id === selecionada) ?? null;
  const mesaSentando = mesas.find((m) => m.id === sentandoNa) ?? null;

  return (
    <div className="space-y-4">
      {/* contadores fixos + ações */}
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur">
        <p className="text-sm text-gray-600">
          {diaDoEvento && presentes !== null && (
            <>
              <b className="text-gray-900">{presentes}</b> chegaram de{" "}
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
        {!noPortal && (
          <div className="ml-auto flex items-center gap-1.5">
            <MenuImprimir eventId={eventId} />
          </div>
        )}
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

          {/* o mesmo croqui no computador e no celular: abre com o salão
              inteiro e aproxima para mexer */}
          <div ref={croquiRef} className="scroll-mt-40 space-y-2">
            {convidadoNaMao && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">
                <span className="min-w-0 flex-1 truncate">
                  Sentando <b className="font-semibold">{convidadoNaMao.nome}</b>
                  {convidadoNaMao.acompanhantes > 0 ? ` +${convidadoNaMao.acompanhantes}` : ""} · toque na mesa
                </span>
                <button
                  type="button"
                  onClick={() => setNaMao(null)}
                  className="shrink-0 text-gray-300 underline-offset-2 hover:text-white hover:underline"
                >
                  Cancelar
                </button>
              </div>
            )}
            <Croqui
              larguraCm={salao.larguraCm}
              alturaCm={salao.alturaCm}
              mesas={mesas}
              elementos={elementos}
              ocupacao={ocupacao}
              comProblema={comProblema}
              sobrepostasIds={sobrepostasIds}
              saidaObstruidaIds={saidaObstruidaIds}
              selecionada={selecionada}
              editavel
              arrastavel={!naMao}
              navegavel
              ocupantes={ocupantes}
              apagadas={semLugarParaQuemEstaNaMao}
              planta={plantaNoCroqui}
              aoSelecionar={tocou}
              aoMover={moveu}
              aoSoltarConvidado={(mesaId, convidadoId) => alocar(convidadoId, mesaId)}
            />
          </div>

          <AvisosAoVivo
            circulacao={circulacao}
            circulacaoSaida={circulacaoSaida}
            saude={saude}
            rotuloDe={rotuloDe}
          />

          {(mesaAtiva || elementoAtivo) && (
            <PainelDaSelecao
              key={selecionada ?? ""}
              eventId={eventId}
              tipoEvento={tipoEvento}
              mesa={mesaAtiva}
              elemento={elementoAtivo}
              convidados={convidados}
              ocupacao={mesaAtiva ? ocupacaoDe.get(mesaAtiva.id) ?? 0 : 0}
              alocar={alocar}
              rodar={rodar}
              pendente={pendente}
              aoSentar={() => mesaAtiva && setSentandoNa(mesaAtiva.id)}
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
          ocupacaoDe={ocupacaoDe}
          diaDoEvento={diaDoEvento}
          alocar={alocar}
          aoVerNoSalao={verNoSalao}
          marcarChegada={marcarChegada}
          rodar={rodar}
          pendente={pendente}
        />
      </div>

      {/* no celular a folha da peça marcada cobre o fim da tela: sobra
          espaço para a lista continuar alcançável */}
      {(mesaAtiva || elementoAtivo) && <div aria-hidden className="h-[45vh] md:hidden" />}

      {mesaSentando && (
        <SentarNaMesa
          mesa={mesaSentando}
          convidados={convidados}
          ocupacao={ocupacaoDe.get(mesaSentando.id) ?? 0}
          aoSentar={(ids) => {
            sentarVarios(ids, mesaSentando.id);
            setSentandoNa(null);
          }}
          aoFechar={() => setSentandoNa(null)}
        />
      )}
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
 * O começo, sem salão (24/09/2026): quem clica em "Mesas" quer montar
 * mesas e sentar convidados — não ser recebida por um formulário de
 * metros. O salão padrão entra num clique e as medidas se ajustam depois,
 * em "Medidas do espaço".
 * ================================================================ */

function InicioDasMesas({
  eventId,
  convidados,
  linkConvidados,
  aviso,
  rodar,
  pendente,
}: {
  eventId: string;
  convidados: number;
  /** a lista de convidados: a do app ou a do portal */
  linkConvidados: string;
  aviso: string | null;
  rodar: (a: () => Promise<{ error?: string } | { success: true }>) => void;
  pendente: boolean;
}) {
  const [medidas, setMedidas] = useState(false);
  if (medidas) {
    return (
      <FormSalao eventId={eventId} aviso={aviso} rodar={rodar} pendente={pendente} aoFechar={() => setMedidas(false)} />
    );
  }
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-base font-semibold text-gray-900">Mapa de mesas</h3>
      <p className="mt-1 text-sm text-gray-500">
        Monte as mesas e sente os convidados.{" "}
        {convidados > 0
          ? `${convidados} ${convidados === 1 ? "convidado está" : "convidados estão"} na lista.`
          : "A lista de convidados ainda está vazia."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={botaoForte}
          disabled={pendente}
          onClick={() => rodar(() => salvarSalao(eventId, { nome: "", larguraM: 20, alturaM: 15 }))}
        >
          {pendente ? "Um instante…" : "Começar a montar as mesas"}
        </button>
        <button type="button" className={botao} onClick={() => setMedidas(true)}>
          Informar as medidas do salão
        </button>
        {convidados === 0 && (
          <Link href={linkConvidados} className="text-sm font-medium text-gray-700 underline underline-offset-4 hover:text-gray-900">
            Adicionar convidados
          </Link>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-400">O salão começa com 20 × 15 m; dá para ajustar as medidas a qualquer momento.</p>
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
 * A peça marcada: a folha da mesa (ou do elemento)
 * ================================================================ */

/** No celular, folha presa ao pé da tela; no computador, o painel
 *  debaixo do croqui. Mesa: quem senta (tirar com o ×), Sentar, Girar e
 *  Editar. Elemento: Girar e Remover. */
function PainelDaSelecao({
  eventId,
  tipoEvento,
  mesa,
  elemento,
  convidados,
  ocupacao,
  alocar,
  rodar,
  pendente,
  aoSentar,
  aoFechar,
}: {
  eventId: string;
  tipoEvento: string;
  mesa: Mesa | null;
  elemento: Elemento | null;
  convidados: ConvidadoDaLista[];
  ocupacao: number;
  alocar: (convidadoId: string, mesaId: string | null) => void;
  rodar: (a: () => Promise<{ error?: string } | { success: true }>) => void;
  pendente: boolean;
  aoSentar: () => void;
  aoFechar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [rotulo, setRotulo] = useState(mesa?.rotulo ?? "");
  const [lugares, setLugares] = useState(String(mesa?.lugares ?? ""));
  useEffect(() => {
    setRotulo(mesa?.rotulo ?? "");
    setLugares(String(mesa?.lugares ?? ""));
  }, [mesa?.rotulo, mesa?.lugares]);

  const folha =
    "fixed inset-x-0 bottom-0 z-40 max-h-[65vh] overflow-y-auto rounded-t-2xl border-t border-gray-300 bg-white px-4 pb-5 pt-2 shadow-[0_-10px_30px_rgba(28,25,23,0.10)] md:static md:z-auto md:max-h-none md:overflow-visible md:rounded-xl md:border md:border-gray-300 md:p-4 md:shadow-none";
  const pega = <div aria-hidden className="mx-auto mb-2 h-1 w-8 rounded-full bg-gray-300 md:hidden" />;
  const fechar = (
    <button type="button" onClick={aoFechar} aria-label="Fechar" className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-700">
      <X size={16} />
    </button>
  );

  if (elemento) {
    return (
      <section className={folha} aria-label={NOME_ELEMENTO[elemento.tipo]}>
        {pega}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {NOME_ELEMENTO[elemento.tipo]}
            {elemento.rotulo?.trim() ? <span className="ml-2 font-normal text-gray-400">{elemento.rotulo}</span> : null}
          </h3>
          {fechar}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            className={botao}
            disabled={pendente}
            onClick={() => rodar(() => atualizarElemento(eventId, elemento.id, { rotacao: (elemento.rotacao + 90) % 360 }))}
          >
            Girar
          </button>
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:border-red-300 hover:text-red-600"
            disabled={pendente}
            onClick={() => {
              aoFechar();
              rodar(() => removerElemento(eventId, elemento.id));
            }}
          >
            <Trash2 size={14} />
            Remover
          </button>
        </div>
      </section>
    );
  }

  if (!mesa) return null;
  const naMesa = naMesaEmOrdem(mesa.id, convidados);
  const redonda = caixaDaMesa(mesa).raio != null;
  const livres = mesa.lugares - ocupacao;

  function mover(id: string, passo: -1 | 1) {
    if (!mesa) return;
    const ids = naMesa.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + passo;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    rodar(() => ordenarMesa(eventId, mesa.id, ids));
  }

  return (
    <section className={folha} aria-label={nomeDaMesa(mesa.rotulo)}>
      {pega}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900">{nomeDaMesa(mesa.rotulo)}</h3>
          <p className="text-xs text-gray-500">
            {mesa.tipo === "bolo" ? nomeTipoMesa(mesa.tipo, tipoEvento) : livresEmPalavras(livres)}
          </p>
        </div>
        {fechar}
      </div>

      {mesa.tipo !== "bolo" &&
        (naMesa.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {naMesa.map((c) => (
              <li
                key={c.id}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200 bg-gray-50 py-0.5 pl-2.5 pr-1 text-xs text-gray-800"
              >
                <span className="truncate">{c.nome}</span>
                {c.acompanhantes > 0 && <span className="shrink-0 text-gray-400">+{c.acompanhantes}</span>}
                <button
                  type="button"
                  aria-label={`Tirar ${c.nome} da mesa`}
                  onClick={() => alocar(c.id, null)}
                  className="shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-gray-400">Ninguém sentado ainda.</p>
        ))}

      <div className="mt-3 flex items-center gap-2">
        {mesa.tipo !== "bolo" && (
          <button type="button" className={`${botaoForte} flex-1 md:flex-none`} onClick={aoSentar}>
            Sentar
          </button>
        )}
        {!redonda && (
          <button
            type="button"
            className={botao}
            disabled={pendente}
            onClick={() => rodar(() => atualizarMesa(eventId, mesa.id, { rotacao: (mesa.rotacao + 45) % 360 }))}
          >
            Girar
          </button>
        )}
        <button
          type="button"
          className={`${botao} inline-flex items-center gap-1`}
          aria-expanded={editando}
          onClick={() => setEditando((v) => !v)}
        >
          Editar
          {editando ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {editando && (
        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-gray-500">
              Nome ou número
              <input
                className={`${campo} mt-1 block w-44`}
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
            <label className="flex items-center gap-1.5 pb-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={mesa.assentoMarcado}
                onChange={(e) => rodar(() => atualizarMesa(eventId, mesa.id, { assentoMarcado: e.target.checked }))}
              />
              Lugar marcado
            </label>
          </div>

          {mesa.assentoMarcado && naMesa.length > 1 && (
            <ol className="space-y-1">
              {naMesa.map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm text-gray-800"
                >
                  <span className="w-6 text-xs text-gray-400">{i + 1}º</span>
                  <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                  <button
                    type="button"
                    aria-label={`${c.nome} um lugar antes`}
                    disabled={pendente || i === 0}
                    onClick={() => mover(c.id, -1)}
                    className="rounded p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`${c.nome} um lugar depois`}
                    disabled={pendente || i === naMesa.length - 1}
                    onClick={() => mover(c.id, 1)}
                    className="rounded p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                </li>
              ))}
            </ol>
          )}

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:border-red-300 hover:text-red-600"
            disabled={pendente}
            onClick={() => {
              aoFechar();
              rodar(() => removerMesa(eventId, mesa.id));
            }}
          >
            <Trash2 size={14} />
            Remover mesa
          </button>
        </div>
      )}
    </section>
  );
}

/* ================================================================
 * Sentar na mesa: várias pessoas de uma vez
 * ================================================================ */

function SentarNaMesa({
  mesa,
  convidados,
  ocupacao,
  aoSentar,
  aoFechar,
}: {
  mesa: Mesa;
  convidados: ConvidadoDaLista[];
  ocupacao: number;
  aoSentar: (ids: string[]) => void;
  aoFechar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  // quem ainda não tem lugar (e não recusou)
  const semMesa = useMemo(
    () =>
      convidados
        .filter((c) => c.confirmacao !== "nao_vai" && !c.mesaId)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [convidados]
  );
  const q = busca.trim().toLocaleLowerCase("pt-BR");
  const lista = q ? semMesa.filter((c) => c.nome.toLocaleLowerCase("pt-BR").includes(q)) : semMesa;

  const pessoas = semMesa.filter((c) => marcados.has(c.id)).reduce((s, c) => s + 1 + c.acompanhantes, 0);
  const sobram = mesa.lugares - ocupacao - pessoas;

  function alternar(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center md:p-6"
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Sentar na ${nomeDaMesa(mesa.rotulo)}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full flex-col rounded-t-2xl bg-white shadow-xl md:max-w-md md:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900">Sentar na {nomeDaMesa(mesa.rotulo)}</h3>
            <p className={`text-xs ${sobram < 0 ? "text-amber-700" : "text-gray-500"}`}>
              {pessoas === 0
                ? livresEmPalavras(mesa.lugares - ocupacao)
                : sobram >= 0
                  ? `sobram ${sobram} ${sobram === 1 ? "lugar" : "lugares"}`
                  : `passa ${-sobram} ${sobram === -1 ? "lugar" : "lugares"}`}
            </p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded p-1 text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pt-3">
          <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-2.5 py-1.5 focus-within:border-gray-500">
            <Search size={14} className="shrink-0 text-gray-400" />
            <input
              className="min-w-0 flex-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              placeholder="Buscar pelo nome"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          {lista.length === 0 && (
            <li className="py-6 text-center text-sm text-gray-400">
              {semMesa.length === 0 ? "Todo mundo já tem mesa." : "Ninguém com esse nome sem mesa."}
            </li>
          )}
          {lista.map((c) => {
            const marcado = marcados.has(c.id);
            return (
              <li key={c.id} className="border-b border-gray-100 last:border-0">
                <label className="flex cursor-pointer items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(c.id)}
                    className="h-4 w-4 shrink-0 accent-gray-900"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
                    {c.nome}
                    {c.acompanhantes > 0 && <span className="text-gray-400"> +{c.acompanhantes}</span>}
                    {c.confirmacao === "aguardando" && <span className="text-xs text-gray-400"> · sem resposta</span>}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-gray-400">
                    {1 + c.acompanhantes} {c.acompanhantes > 0 ? "lugares" : "lugar"}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            className={`${botaoForte} w-full py-2.5`}
            disabled={marcados.size === 0}
            onClick={() => aoSentar([...marcados])}
          >
            {pessoas === 0 ? "Sentar" : `Sentar ${pessoas} ${pessoas === 1 ? "pessoa" : "pessoas"}`}
          </button>
        </div>
      </div>
    </div>
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
  ocupacaoDe,
  diaDoEvento,
  alocar,
  aoVerNoSalao,
  marcarChegada,
  rodar,
  pendente,
}: {
  eventId: string;
  tipoEvento: string;
  convidados: ConvidadoDaLista[];
  mesas: Mesa[];
  rotuloDe: Map<string, string>;
  /** mesaId → pessoas sentadas (com acompanhantes) */
  ocupacaoDe: Map<string, number>;
  diaDoEvento: boolean;
  alocar: (convidadoId: string, mesaId: string | null) => void;
  aoVerNoSalao: (convidadoId: string) => void;
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
    // busca pelo nome ou pela mesa ("mesa 4", "04", "família da noiva"):
    // a mesa anda junto com o convidado
    const q = busca.trim().toLocaleLowerCase("pt-BR");
    if (q) {
      const daMesa = q.replace(/^mesa\s+/, "");
      const semZero = (t: string) => t.replace(/^0+(?=\d)/, "");
      l = l.filter((c) => {
        if (c.nome.toLocaleLowerCase("pt-BR").includes(q)) return true;
        const r = c.mesaId ? (rotuloDe.get(c.mesaId) ?? "").toLocaleLowerCase("pt-BR") : "";
        if (!r) return false;
        return semZero(r) === semZero(daMesa) || (daMesa.length > 2 && r.includes(daMesa));
      });
    }
    return [...l].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [convidados, filtro, busca, rotuloDe]);

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
        placeholder="Buscar nome ou mesa"
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
            ocupacaoDe={ocupacaoDe}
            expandido={expandido === c.id}
            aoExpandir={() => setExpandido(expandido === c.id ? null : c.id)}
            diaDoEvento={diaDoEvento}
            alocar={alocar}
            aoVerNoSalao={aoVerNoSalao}
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
  ocupacaoDe,
  expandido,
  aoExpandir,
  diaDoEvento,
  alocar,
  aoVerNoSalao,
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
  ocupacaoDe: Map<string, number>;
  expandido: boolean;
  aoExpandir: () => void;
  diaDoEvento: boolean;
  alocar: (convidadoId: string, mesaId: string | null) => void;
  aoVerNoSalao: (convidadoId: string) => void;
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

  // "pelo convidado": as mesas com os lugares que sobram para ele
  const precisa = 1 + c.acompanhantes;
  const opcoes = mesas
    .filter((m) => m.tipo !== "bolo")
    .map((m) => {
      const atual = c.mesaId === m.id;
      const livres = m.lugares - (ocupacaoDe.get(m.id) ?? 0) + (atual ? precisa : 0);
      return { m, livres, cabe: livres >= precisa, atual };
    })
    .sort(
      (a, b) =>
        // a mesa dos noivos não é sugestão para convidado: vai para o fim
        Number(a.m.tipo === "noivos") - Number(b.m.tipo === "noivos") ||
        Number(b.cabe) - Number(a.cabe) ||
        (a.cabe ? a.livres - b.livres : b.livres - a.livres) ||
        a.m.ordem - b.m.ordem
    );

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
            <div>
              <p className="text-xs text-gray-500">
                Mesa
                {c.acompanhantes > 0 && <span className="text-gray-400"> · precisa de {precisa} lugares</span>}
              </p>
              {/* as mesas onde cabe primeiro, a mais cheia antes; as que
                  não cabem vêm apagadas, mas ainda tocáveis */}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {opcoes.map(({ m, livres, cabe, atual }) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={pendente}
                    onClick={() => {
                      if (!atual) alocar(c.id, m.id);
                      aoExpandir();
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs ${
                      atual
                        ? "bg-gray-900 text-white"
                        : cabe
                          ? "border border-gray-300 bg-white text-gray-800 hover:border-gray-400"
                          : "border border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {m.rotulo} · {atual ? "aqui" : livres <= 0 ? "lotada" : livres === 1 ? "1 livre" : `${livres} livres`}
                  </button>
                ))}
                {c.mesaId && (
                  <button
                    type="button"
                    disabled={pendente}
                    onClick={() => {
                      alocar(c.id, null);
                      aoExpandir();
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:border-gray-300"
                  >
                    Tirar da mesa
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    aoVerNoSalao(c.id);
                    aoExpandir();
                  }}
                  className="rounded-lg px-2.5 py-1 text-xs text-gray-600 underline underline-offset-2 hover:text-gray-900"
                >
                  Ver no salão
                </button>
              </div>
            </div>
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
