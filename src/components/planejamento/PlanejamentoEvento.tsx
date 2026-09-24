"use client";

// Tela de Planejamento (handoff Celebra Pro — wireframe 1a-1e).
//
// Agora e Caderno NÃO são duas telas: são modos da MESMA tela. O
// cabeçalho, a faixa de contexto e o controle ficam fixos; só o miolo
// troca.
//
// 24/09/2026 — de cinco jeitos de ver as mesmas decisões para dois. Eram
// Foco, Amplo, Caderno (Panorama e Mês a mês) e Mapa mental, e três deles
// eram "por mês": quem tem pouca paciência para aprender o sistema tinha
// de escolher uma visão antes de fazer qualquer coisa. Ficaram:
//   · Agora   — o antigo Foco: o que decidir agora e a jornada;
//   · Caderno — o mês a mês com as anotações dela; o Amplo entrou nele.
// O Mapa mental abre de dentro do Caderno, e "Salvar como meu modelo"
// (coisa de vez em quando) desceu para o rodapé. A faixa da verba abre
// numa linha só, para a decisão da vez aparecer na primeira tela.
//
// Consome o modelo real (5A/5B/5C): campos tipados, valor_previsto por
// objetivo, arquétipo escala×cenário, termômetro e distribuição sugerida.

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Decisao, Planejamento } from "@/lib/supabase/planejamento";
import {
  alternarObjetivoAtivo,
  alternarVisivelPortal,
  conferirDecisao,
  criarCampoProprio,
  criarDecisaoPropria,
  criarObjetivoProprio,
  decidirDecisao,
  definirDataEvento,
  marcarNaoSeAplica,
  reabrirDecisao,
  salvarCampo,
  salvarValorPrevisto,
  sugerirDistribuicao,
  verDiffDecisao,
} from "@/app/(app)/eventos/[id]/planejamento/actions";
import type { TipoCampo, Campo } from "@/lib/supabase/planejamento";
import {
  C,
  F_MONO,
  F_TITLE,
  F_UI,
  monoLabel,
  tituloStyle,
  type Arquetipos,
} from "./celebra";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { inicioDoDiaBR } from "@/lib/tempo";
import { EVENTO_ABRIR_DECISAO } from "@/lib/guia-vivo";
import { FaixaContexto } from "./FaixaContexto";
import { ModoFoco } from "./ModoFoco";
import { MapaMental } from "./MapaMental";
import { SalvarModelo } from "./SalvarModelo";
import { AnotacoesDaDecisao, ModoCaderno } from "./ModoCaderno";
import type { NotaDoCaderno, ReuniaoDoCaderno } from "@/app/(app)/eventos/[id]/planejamento/caderno-actions";
import {
  DrawerDecisao,
  CODIGO_DECISAO_GUIA,
  type SupplierRef,
} from "./DrawerDecisao";
import type { AcoesCuradoria } from "./BlocoCuradoria";
import type { AcoesGuia } from "./BlocoGuiaEstilo";
import type { GuiaDeEstilo } from "@/lib/guia-shared";
import {
  carregarCompartilhamentos,
  carregarGuia,
  carregarPaletas,
  compartilharGuia,
  criarGuia,
  enviarGuiaParaCliente,
  marcarReferenciaNoGuia,
  pararDeCompartilharGuia,
  removerItemGuia,
  salvarCabecalhoGuia,
  salvarItemGuia,
} from "@/app/(app)/eventos/[id]/planejamento/guia-actions";
import type { Curadoria } from "@/lib/supabase/curadoria";
import {
  abrirCuradoria,
  carregarCuradoria,
  despublicarCuradoria,
  fecharComFornecedor,
  marcarRecomendada,
  publicarCuradoria,
  removerOpcao,
  salvarOpcao,
} from "@/app/(app)/eventos/[id]/planejamento/curadoria-actions";

const MESES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function PlanejamentoEvento({
  eventId,
  inicial,
  suppliers,
  decisaoInicial,
  escala,
  cenario,
  arquetipos,
  clienteNome,
  tipoEvento,
  localEvento,
  podeSalvarModelo = false,
  caderno = { notas: [], reunioes: [] },
}: {
  eventId: string;
  inicial: Planejamento;
  suppliers: SupplierRef[];
  decisaoInicial: string | null;
  escala: string | null;
  cenario: string | null;
  /** opções dos chips, lidas de metodo_arquetipo do tipo */
  arquetipos: Arquetipos;
  clienteNome: string | null;
  tipoEvento: string;
  localEvento: string | null;
  /** só a proprietária muda o modelo da empresa (170) */
  podeSalvarModelo?: boolean;
  /** Caderno do evento (172): as anotações dela e as reuniões */
  caderno?: { notas: NotaDoCaderno[]; reunioes: ReuniaoDoCaderno[] };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const plano = inicial;

  // ---- estado de visualização (handoff §12) ----
  const [modo, setModo] = useState<"foco" | "caderno">("foco");
  const [mapaAberto, setMapaAberto] = useState(false);
  const [modeloAberto, setModeloAberto] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(decisaoInicial);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [avisoFechado, setAvisoFechado] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [erroSugerir, setErroSugerir] = useState<string | null>(null);
  const expandidoInicial = useRef(false);

  // modo persiste por evento. Quem deixou o evento no Amplo (que entrou no
  // Caderno em 24/09/2026) volta no Caderno, que é a mesma visão por mês.
  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(`plano-modo-${eventId}`);
      if (salvo === "amplo" || salvo === "caderno") setModo("caderno");
    } catch {
      /* sem armazenamento: começa no Agora */
    }
  }, [eventId]);
  const trocarModo = (m: "foco" | "caderno") => {
    setModo(m);
    try {
      window.localStorage.setItem(`plano-modo-${eventId}`, m);
    } catch {
      /* nada */
    }
  };

  // o objetivo da janela atual já vem aberto
  useEffect(() => {
    if (expandidoInicial.current) return;
    const primeiro = plano.objetivos.find((o) => o.ativo && o.bucket === "agora");
    if (primeiro) {
      setExpandidos(new Set([primeiro.id]));
      expandidoInicial.current = true;
    }
  }, [plano.objetivos]);

  // ---- deep-link do drawer (?decisao=) ----
  const abrirDrawer = useCallback(
    (d: Decisao) => {
      setDrawerId(d.id);
      router.replace(`${pathname}?decisao=${d.id}`, { scroll: false });
    },
    [pathname, router]
  );
  const fecharDrawer = useCallback(() => {
    setDrawerId(null);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  // decisão aberta (dado fresco a cada refresh)
  const drawer = useMemo(() => {
    if (!drawerId) return null;
    for (const o of plano.objetivos) {
      const d = o.decisoes.find((d) => d.id === drawerId);
      if (d) return { decisao: d, objetivoNome: o.nome };
    }
    return null;
  }, [drawerId, plano.objetivos]);

  const refresh = () => startTransition(() => router.refresh());

  // ---- rodada de opções da decisão aberta (092) ----
  // Carrega sob demanda: a maioria das decisões nunca terá uma, e trazer
  // no payload da tela inteira encareceria a leitura de todo mundo.
  const [curadoria, setCuradoria] = useState<Curadoria | null>(null);
  useEffect(() => {
    if (!drawerId) {
      setCuradoria(null);
      return;
    }
    let vivo = true;
    carregarCuradoria(drawerId).then((c) => {
      if (vivo) setCuradoria(c);
    });
    return () => {
      vivo = false;
    };
  }, [drawerId]);

  const recarregarCuradoria = useCallback(async () => {
    if (drawerId) setCuradoria(await carregarCuradoria(drawerId));
  }, [drawerId]);

  // ---- guia de estilo (096) ----
  // Carrega só quando o drawer aberto É a decisão do briefing: o guia é
  // um documento inteiro, e nenhuma outra decisão precisa dele.
  const [guia, setGuia] = useState<GuiaDeEstilo | null>(null);
  const ehDecisaoDoGuia = drawer?.decisao.codigo === CODIGO_DECISAO_GUIA;

  const recarregarGuia = useCallback(async () => {
    setGuia(await carregarGuia(eventId));
  }, [eventId]);

  useEffect(() => {
    if (!ehDecisaoDoGuia) {
      setGuia(null);
      return;
    }
    let vivo = true;
    carregarGuia(eventId).then((g) => {
      if (vivo) setGuia(g);
    });
    return () => {
      vivo = false;
    };
  }, [ehDecisaoDoGuia, eventId]);

  const acoesGuia: AcoesGuia = useMemo(
    () => ({
      onCriar: async (paletaId) => {
        const r = await criarGuia(eventId, drawerId, paletaId);
        await recarregarGuia();
        return "error" in r ? r.error : null;
      },
      onSalvarItem: async (tipo, item) => {
        if (!guia) return "Monte o guia primeiro.";
        const r = await salvarItemGuia(eventId, guia.id, tipo, item);
        await recarregarGuia();
        return "error" in r ? r.error : null;
      },
      onRemoverItem: async (tipo, id) => {
        if (!guia) return;
        await removerItemGuia(eventId, guia.id, tipo, id);
        await recarregarGuia();
      },
      onEnviar: async () => {
        if (!guia) return "Monte o guia primeiro.";
        const r = await enviarGuiaParaCliente(eventId, guia.id);
        await recarregarGuia();
        return "error" in r ? r.error : null;
      },
      onMarcarReferencia: async (referenciaId, noGuia) => {
        if (!guia) return "Monte o guia primeiro.";
        const r = await marcarReferenciaNoGuia(
          eventId,
          guia.id,
          referenciaId,
          noGuia
        );
        await recarregarGuia();
        return "error" in r ? r.error : null;
      },
      onSalvarRestricoes: async (texto) => {
        if (!guia) return "Monte o guia primeiro.";
        const r = await salvarCabecalhoGuia(eventId, guia.id, {
          restricoes: texto,
        });
        await recarregarGuia();
        return "error" in r ? r.error : null;
      },
      onCompartilhar: async (supplierId, secoes) => {
        if (!guia) return "Monte o guia primeiro.";
        const r = await compartilharGuia(eventId, guia.id, supplierId, secoes);
        return "error" in r ? r.error : null;
      },
      onPararCompartilhar: async (supplierId) => {
        if (!guia) return;
        await pararDeCompartilharGuia(eventId, guia.id, supplierId);
      },
      carregarPaletas: () => carregarPaletas(),
      carregarCompartilhamentos: () =>
        guia ? carregarCompartilhamentos(guia.id) : Promise.resolve([]),
    }),
    [eventId, drawerId, guia, recarregarGuia]
  );

  const acoesCuradoria: AcoesCuradoria = useMemo(
    () => ({
      onAbrir: async () => {
        if (!drawerId) return;
        await abrirCuradoria(eventId, drawerId);
        await recarregarCuradoria();
      },
      onSalvarOpcao: async (opcao) => {
        if (!curadoria) return "Abra a seleção primeiro.";
        const r = await salvarOpcao(eventId, curadoria.id, opcao);
        await recarregarCuradoria();
        return "error" in r ? r.error : null;
      },
      onRemoverOpcao: async (opcaoId) => {
        if (!curadoria) return;
        await removerOpcao(eventId, curadoria.id, opcaoId);
        await recarregarCuradoria();
      },
      onRecomendar: async (opcaoId) => {
        if (!curadoria) return;
        await marcarRecomendada(eventId, curadoria.id, opcaoId);
        await recarregarCuradoria();
      },
      onPublicar: async () => {
        if (!curadoria) return "Abra a seleção primeiro.";
        const r = await publicarCuradoria(eventId, curadoria.id);
        await recarregarCuradoria();
        return "error" in r ? r.error : null;
      },
      onDespublicar: async () => {
        if (!curadoria) return;
        await despublicarCuradoria(eventId, curadoria.id);
        await recarregarCuradoria();
      },
      onFechar: async (opcaoId) => {
        if (!drawerId) return null;
        const r = await fecharComFornecedor(eventId, drawerId, opcaoId);
        await recarregarCuradoria();
        refresh();
        return "error" in r ? r.error : null;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventId, drawerId, curadoria, recarregarCuradoria]
  );

  // ---- ações ----
  async function acaoSalvarCampo(
    campo: Campo,
    valor: string | number | boolean | null
  ) {
    // A versão que a tela leu vai junto (091): se a cliente gravou nesse
    // meio-tempo, a RPC recusa e o refresh traz o valor novo — ninguém
    // perde o que a outra escreveu.
    await salvarCampo(
      eventId,
      campo.id,
      campo.tipo,
      campo.codigo,
      valor,
      campo.updatedAt ?? null
    );
    refresh();
  }

  // Grava um campo tipado achando-o pelo código na árvore (verba_total,
  // reserva_pct, escala, cenario) — a faixa de contexto edita esses valores
  // sem a cerimonialista ter de abrir a decisão de origem.
  const campoPorCodigo = useCallback(
    (codigo: string) =>
      plano.objetivos
        .flatMap((o) => o.decisoes)
        .flatMap((d) => d.campos)
        .find((c) => c.codigo === codigo) ?? null,
    [plano.objetivos]
  );

  function salvarCampoPorCodigo(
    codigo: string,
    valor: string | number | boolean | null
  ) {
    const campo = campoPorCodigo(codigo);
    // Sem o campo no método deste tipo, não há onde gravar. A tela já
    // esconde o controle (temVerba/temArquetipo); se algum caminho ainda
    // chegar aqui, some no log — nunca em silêncio, que foi como a verba
    // do show engoliu o clique.
    if (!campo) {
      console.warn("[vela:planejamento] sem campo", codigo, "neste método");
      return;
    }
    startTransition(async () => {
      await salvarCampo(eventId, campo.id, campo.tipo, campo.codigo, valor);
      router.refresh();
    });
  }

  function irParaObjetivo(objetivoId: string) {
    setMapaAberto(false);
    trocarModo("foco");
    setExpandidos((s) => new Set(s).add(objetivoId));
    // espera o modo trocar antes de rolar
    window.setTimeout(() => {
      document
        .getElementById(`objetivo-${objetivoId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  function irParaDecisao(d: Decisao) {
    setMapaAberto(false);
    trocarModo("foco");
    setExpandidos((s) => new Set(s).add(d.objetivoId));
    abrirDrawer(d);
  }

  // O cartão do guia lista decisões que criam tarefa; o clique abre a
  // decisão aqui mesmo, sem recarregar (o ?decisao= só vale na montagem).
  const irParaDecisaoRef = useRef(irParaDecisao);
  irParaDecisaoRef.current = irParaDecisao;
  useEffect(() => {
    const abrir = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      const d = plano.objetivos
        .flatMap((o) => o.decisoes)
        .find((x) => x.id === id);
      if (d) irParaDecisaoRef.current(d);
    };
    window.addEventListener(EVENTO_ABRIR_DECISAO, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_DECISAO, abrir);
  }, [plano.objetivos]);

  // ---- meta do cabeçalho ----
  // o mês de hoje em Brasília: o servidor (UTC) e o navegador têm de
  // escrever o mesmo texto (ver prazoRelativo)
  const hoje = inicioDoDiaBR();
  const mesAtualRotulo = (() => {
    const nome = MESES_PT[hoje.getMonth()];
    if (plano.dataEvento) {
      const [a, m] = plano.dataEvento.split("-").map(Number);
      const meses = (a - hoje.getFullYear()) * 12 + (m - 1 - hoje.getMonth());
      return `${nome} · ${meses} ${meses === 1 ? "mês" : "meses"} para o dia D`;
    }
    return nome;
  })();

  const avisoVisivel = plano.verba.distribuicaoDesatualizada && !avisoFechado;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* cabeçalho da tela: título, progresso e os dois modos (§5, §6) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* o título, o progresso em texto e os dois modos na MESMA linha
            (24/09/2026): a barra de progresso e a linha própria dos modos
            empurravam a decisão da vez para baixo da dobra */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={tituloStyle(22, 28)}>Planejamento</h1>
          <span style={{ fontFamily: F_MONO, fontSize: 11, color: C.meta }}>
            progresso {plano.progressoPct}%
            {plano.diasAteEvento !== null && plano.diasAteEvento >= 0
              ? ` · faltam ${plano.diasAteEvento} ${plano.diasAteEvento === 1 ? "dia" : "dias"}`
              : ""}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            padding: 3,
            border: `1.5px solid ${C.bordaForte}`,
            borderRadius: 9,
            background: C.zona,
            gap: 3,
          }}
        >
          {(["foco", "caderno"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={modo === m && !mapaAberto}
              onClick={() => {
                setMapaAberto(false);
                trocarModo(m);
              }}
              style={{
                height: 34,
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                borderRadius: 6,
                border: "none",
                background: modo === m ? C.tinta : "transparent",
                color: modo === m ? "#fff" : C.secundario,
                fontFamily: F_TITLE,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              {m === "foco" ? "Agora" : "Caderno"}
            </button>
          ))}
        </div>
      </div>

      {/* faixa de contexto: numa linha só nos dois modos ("detalhar" abre) */}
      {/* alvo do passo 2 do guia (160): escala e cenario vivem aqui */}
      <div data-guia="contexto-evento">
      <FaixaContexto
        verba={plano.verba}
        objetivos={plano.objetivos}
        escala={escala}
        cenario={cenario}
        arquetipos={arquetipos}
        placeholders={{
          escala: campoPorCodigo("escala")?.label ?? "Escala",
          cenario: campoPorCodigo("cenario")?.label ?? "Cenário",
        }}
        compacta
        avisoVisivel={avisoVisivel}
        onArquetipo={(eixo, valor) => {
          // grava pelo campo tipado da decisão de estrutura — o action
          // reflete em events e o banco aplica os deltas
          setAvisoFechado(false);
          salvarCampoPorCodigo(eixo, valor);
        }}
        temVerba={campoPorCodigo("verba_total") !== null}
        temArquetipo={
          campoPorCodigo("escala") !== null && arquetipos.escala.length > 0
        }
        tipoRotulo={
          EVENT_TYPE_LABELS[tipoEvento as EventType] ?? tipoEvento
        }
        onSalvarVerba={(valor) => salvarCampoPorCodigo("verba_total", valor)}
        onSalvarReserva={(pct) => salvarCampoPorCodigo("reserva_pct", pct)}
        onSugerir={() => {
          setSugerindo(true);
          setErroSugerir(null);
          startTransition(async () => {
            const r = await sugerirDistribuicao(eventId);
            if ("error" in r) setErroSugerir(r.error);
            else setAvisoFechado(true);
            setSugerindo(false);
            router.refresh();
          });
        }}
        sugerindo={sugerindo}
        erroSugerir={erroSugerir}
        onEditarPrevisto={(objetivoId, valor) => {
          startTransition(async () => {
            await salvarValorPrevisto(eventId, objetivoId, valor);
            router.refresh();
          });
        }}
        onIrParaObjetivo={irParaObjetivo}
        onManterAviso={() => setAvisoFechado(true)}
      />
      </div>

      {modeloAberto && (
        <SalvarModelo
          eventId={eventId}
          tipoRotulo={EVENT_TYPE_LABELS[tipoEvento as EventType] ?? tipoEvento}
          onFechar={() => setModeloAberto(false)}
        />
      )}

      {/* alvo do passo 3 do guia (160): e aqui que se decide */}
      {/* miolo — só ele troca */}
      <div data-guia="mapa-planejamento">
      {mapaAberto ? (
        <MapaMental
          tipoEvento={tipoEvento}
          objetivos={plano.objetivos}
          clienteNome={clienteNome}
          localEvento={localEvento}
          dataEvento={plano.dataEvento}
          diasAteEvento={plano.diasAteEvento}
          escala={escala}
          cenario={cenario}
          arquetipos={arquetipos}
          verba={plano.verba}
          onFechar={() => setMapaAberto(false)}
          onIrParaObjetivo={irParaObjetivo}
          onIrParaDecisao={irParaDecisao}
        />
      ) : modo === "foco" ? (
        <ModoFoco
          tipoEvento={tipoEvento}
          criticas={plano.criticas}
          objetivos={plano.objetivos}
          mesAtualRotulo={mesAtualRotulo}
          suppliers={suppliers}
          objetivosExpandidos={expandidos}
          onToggleObjetivo={(id) =>
            setExpandidos((s) => {
              const n = new Set(s);
              if (n.has(id)) n.delete(id);
              else n.add(id);
              return n;
            })
          }
          onAbrirDecisao={abrirDrawer}
          onNaoSeAplicaDecisao={(d) =>
            startTransition(async () => {
              await marcarNaoSeAplica(eventId, d.id);
              router.refresh();
            })
          }
          onReativarDecisao={(d) =>
            startTransition(async () => {
              await reabrirDecisao(eventId, d.id);
              router.refresh();
            })
          }
          onCriarDecisao={async (objetivoId, titulo) => {
            await criarDecisaoPropria(eventId, objetivoId, titulo);
            refresh();
          }}
          onCriarObjetivo={async (nome) => {
            await criarObjetivoProprio(eventId, nome);
            refresh();
          }}
          onAlternarObjetivo={(objetivoId, ativo) =>
            startTransition(async () => {
              await alternarObjetivoAtivo(eventId, objetivoId, ativo);
              router.refresh();
            })
          }
        />
      ) : modo === "caderno" ? (
        <ModoCaderno
          eventId={eventId}
          objetivos={plano.objetivos}
          dataEvento={plano.dataEvento}
          meta={[
            clienteNome,
            plano.dataEvento
              ? `${(EVENT_TYPE_LABELS[tipoEvento as EventType] ?? tipoEvento).toLowerCase()} ${plano.dataEvento.slice(8, 10)}/${plano.dataEvento.slice(5, 7)}/${plano.dataEvento.slice(0, 4)}`
              : null,
            plano.diasAteEvento !== null && plano.diasAteEvento >= 0
              ? `faltam ${plano.diasAteEvento} ${plano.diasAteEvento === 1 ? "dia" : "dias"}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          notas={caderno.notas}
          reunioes={caderno.reunioes}
          onAbrirDecisao={abrirDrawer}
          onAbrirMapa={() => setMapaAberto(true)}
        />
      ) : null}
      </div>

      {/* Salvar como meu modelo (170): coisa de vez em quando, e só da
          proprietária — por isso no rodapé, e não na barra dos modos,
          disputando atenção com a decisão da vez (24/09/2026). */}
      {podeSalvarModelo && !mapaAberto && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setModeloAberto(true)}
            style={{
              border: "none",
              background: "none",
              padding: "4px 0",
              fontFamily: F_UI,
              fontSize: 13,
              color: C.secundario,
              textDecoration: "underline",
              textUnderlineOffset: 3,
              cursor: "pointer",
            }}
          >
            Salvar este planejamento como meu modelo
          </button>
        </div>
      )}

      {/* drawer da decisão (§10) — a timeline atrás não se move */}
      {drawer && (
        <DrawerDecisao
          tipoEvento={tipoEvento}
          arquetipos={arquetipos}
          decisao={drawer.decisao}
          objetivoNome={drawer.objetivoNome}
          eventId={eventId}
          suppliers={suppliers}
          ehDataDoCasamento={
            drawer.decisao.codigo === "data" ||
            drawer.decisao.codigo === "deb_data"
          }
          dataEvento={plano.dataEvento}
          onFechar={fecharDrawer}
          onSalvarCampo={acaoSalvarCampo}
          onDefinirData={async (data) => {
            await definirDataEvento(eventId, data);
            refresh();
          }}
          onDecidir={() =>
            startTransition(async () => {
              await decidirDecisao(eventId, drawer.decisao.id);
              router.refresh();
            })
          }
          onNaoSeAplica={() =>
            startTransition(async () => {
              await marcarNaoSeAplica(eventId, drawer.decisao.id);
              router.refresh();
            })
          }
          onReabrir={() =>
            startTransition(async () => {
              await reabrirDecisao(eventId, drawer.decisao.id);
              router.refresh();
            })
          }
          onCriarCampo={async (label, tipo: TipoCampo) => {
            await criarCampoProprio(eventId, drawer.decisao.id, label, tipo);
            refresh();
          }}
          onConferir={async () => {
            await conferirDecisao(eventId, drawer.decisao.id);
            refresh();
          }}
          onVerDiff={async () => {
            const r = await verDiffDecisao(drawer.decisao.id);
            return "linhas" in r ? r.linhas : [];
          }}
          onAlternarVisivel={async (campoId, visivel) => {
            await alternarVisivelPortal(eventId, campoId, visivel);
            refresh();
          }}
          curadoria={curadoria}
          acoesCuradoria={acoesCuradoria}
          guia={guia}
          anotacoes={
            <AnotacoesDaDecisao
              eventId={eventId}
              decisaoId={drawer.decisao.id}
              notas={caderno.notas}
            />
          }
          acoesGuia={acoesGuia}
        />
      )}
    </div>
  );
}
