"use client";

// Tela de Planejamento (handoff Celebra Pro — wireframe 1a-1e).
//
// Foco, Amplo e Mapa mental NÃO são três telas: são modos da MESMA tela.
// O cabeçalho, a faixa de contexto e o controle ficam fixos; só o miolo
// troca. Foco/Amplo é um toggle (mesmo eixo, zoom); Mapa mental é botão
// separado, somente leitura.
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
import { FaixaContexto } from "./FaixaContexto";
import { ModoFoco } from "./ModoFoco";
import { ModoAmplo } from "./ModoAmplo";
import { MapaMental } from "./MapaMental";
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
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const plano = inicial;

  // ---- estado de visualização (handoff §12) ----
  const [modo, setModo] = useState<"foco" | "amplo">("foco");
  const [mapaAberto, setMapaAberto] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(decisaoInicial);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [mesExpandido, setMesExpandido] = useState<string | null>(null);
  const [avisoFechado, setAvisoFechado] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [erroSugerir, setErroSugerir] = useState<string | null>(null);
  const expandidoInicial = useRef(false);

  // modo persiste por evento
  useEffect(() => {
    const salvo = window.localStorage.getItem(`plano-modo-${eventId}`);
    if (salvo === "amplo") setModo("amplo");
  }, [eventId]);
  const trocarModo = (m: "foco" | "amplo") => {
    setModo(m);
    window.localStorage.setItem(`plano-modo-${eventId}`, m);
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

  // ---- meta do cabeçalho ----
  const hoje = new Date();
  const mesAtualRotulo = (() => {
    const nome = MESES_PT[hoje.getMonth()];
    if (plano.dataEvento) {
      const [a, m] = plano.dataEvento.split("-").map(Number);
      const meses = (a - hoje.getFullYear()) * 12 + (m - 1 - hoje.getMonth());
      return `${nome} · ${meses} ${meses === 1 ? "mês" : "meses"} para o dia D`;
    }
    return nome;
  })();

  const legendaAmplo = (() => {
    if (!plano.dataEvento) return "defina a data do casamento";
    const prazos = plano.objetivos
      .flatMap((o) => o.decisoes)
      .map((d) => d.prazoPrevisto)
      .filter((p): p is string => p !== null)
      .sort();
    const inicio = prazos[0] ?? plano.dataEvento;
    const [ia, im] = inicio.split("-").map(Number);
    const [ea, em, ed] = plano.dataEvento.split("-").map(Number);
    const meses = (ea - ia) * 12 + (em - im);
    return `${MESES_PT[im - 1].slice(0, 3)}/${ia} → ${String(ed).padStart(2, "0")}/${String(em).padStart(2, "0")}/${ea} · ${meses} meses`;
  })();

  const avisoVisivel = plano.verba.distribuicaoDesatualizada && !avisoFechado;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* cabeçalho da tela + progresso ponderado (§5) */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={tituloStyle(22, 28)}>Planejamento</h1>
          <p
            style={{
              marginTop: 4,
              fontFamily: F_UI,
              fontSize: 13,
              lineHeight: "18px",
              color: C.secundario,
            }}
          >
            Construindo o projeto — nada existe fisicamente ainda.
          </p>
        </div>
        <div
          style={{
            width: 240,
            display: "flex",
            flexDirection: "column",
            gap: 5,
            alignItems: "flex-end",
          }}
        >
          <span style={{ ...monoLabel, color: C.secundario }}>
            progresso {plano.progressoPct}%
          </span>
          <div
            style={{
              width: 240,
              height: 7,
              background: "#E4E6E8",
              border: `1px solid ${C.bordaMedia}`,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${plano.progressoPct}%`,
                height: "100%",
                background: C.ameixa,
              }}
            />
          </div>
          <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.meta }}>
            ponderado por importância
            {plano.diasAteEvento !== null
              ? ` · faltam ${plano.diasAteEvento} dias`
              : ""}
          </span>
        </div>
      </div>

      {/* faixa de contexto (fixa nos dois modos; encolhe no Amplo) */}
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
        compacta={modo === "amplo"}
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

      {/* controle de visualização (§6) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            {(["foco", "amplo"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => trocarModo(m)}
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
                {m === "foco" ? "Foco" : "Amplo"}
              </button>
            ))}
          </div>
          <span style={{ fontFamily: F_MONO, fontSize: 11, color: C.meta }}>
            {modo === "foco" ? "mesmo eixo · zoom" : legendaAmplo}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMapaAberto((a) => !a)}
          style={{
            height: 40,
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: `1.5px solid ${mapaAberto ? C.ameixa : C.bordaForte}`,
            borderRadius: 8,
            background: "#fff",
            fontFamily: F_TITLE,
            fontWeight: 600,
            fontSize: 13,
            color: C.tinta,
            cursor: "pointer",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 15 15"
            fill="none"
            style={{ stroke: C.secundario }}
            strokeWidth="1.2"
          >
            <circle cx="7.5" cy="3" r="2" />
            <circle cx="2.6" cy="12" r="2" />
            <circle cx="12.4" cy="12" r="2" />
            <path d="M6.4 4.8 3.7 10.2M8.6 4.8l2.7 5.4M4.6 12h5.8" />
          </svg>
          Mapa mental
        </button>
      </div>

      {/* miolo — só ele troca */}
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
      ) : (
        <ModoAmplo
          objetivos={plano.objetivos}
          dataEvento={plano.dataEvento}
          diasAteEvento={plano.diasAteEvento}
          mesExpandido={mesExpandido}
          onToggleMes={(chave) => setMesExpandido(chave || null)}
          onAbrirDecisao={abrirDrawer}
        />
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
          acoesGuia={acoesGuia}
        />
      )}
    </div>
  );
}
