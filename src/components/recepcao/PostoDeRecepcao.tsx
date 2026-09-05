"use client";

// O posto da recepção — a tela que fica na mão de quem está na porta.
//
// É a noite do evento que manda aqui, não a beleza: fila na porta, luz
// baixa, Wi-Fi da casa de festas caindo, três recepcionistas com o mesmo
// link. Por isso:
//
//   * A lista desce UMA vez e mora na memória da aba. Nunca no
//     localStorage: o link expira (148) e a lista de nomes não pode
//     sobreviver a ele no celular de quem trabalhou uma noite.
//   * A câmera fica aberta e contínua — ninguém aperta "escanear" com
//     uma família esperando. O QR abre o grupo inteiro; um toque marca.
//   * A busca pelo nome fica sempre visível, porque câmera falha: lente
//     suja, permissão negada, brilho do celular do convidado no mínimo.
//   * Toda marcação é otimista e vai para uma fila no localStorage —
//     SEM nome de ninguém, só ids e contagens (o formato é ItemFila, em
//     lib/recepcao). A fila esvazia sozinha quando o sinal volta.
//   * Nunca alterna. Escanear duas vezes diz "já entrou às 20:14" — a
//     decisão 4 da migração. Desfazer é um botão separado, só sobre a
//     última marcação, dentro da janela do servidor.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BUSCA_MIN_CHARS,
  CODIGO6,
  FILA_MAX_HORAS,
  JANELA_DESFAZER_MIN,
  chaveFila,
  chaveOperador,
  codigoDoHash,
  extrairCheckinHash,
  normalizarBusca,
  type ConvidadoDaPorta,
  type ItemFila,
  type ListaRecepcao,
  type PostoPublico,
  type RespostaAvulso,
  type RespostaConsultar,
  type RespostaDesfazer,
  type RespostaMarcar,
} from "@/lib/recepcao";

// ------------------------------------------------------------
// Tipos internos desta tela
// ------------------------------------------------------------

/** Por onde o grupo foi aberto. Pelo QR sem ajuste, o servidor confia na
 *  contagem do banco (via 'qr'); pelo nome ou pelo código digitado, a
 *  porta manda o número (via 'busca'). */
type Origem = "qr" | "codigo" | "busca";

type Grupo = { convidadoId: string; origem: Origem };

/** O item da fila como ESTA tela o guarda. Dois campos a mais do que o
 *  formato compartilhado (lib/recepcao), ambos opcionais e ambos lidos
 *  com o padrão que vale quando faltam:
 *    tentado — já foi ao servidor ao menos uma vez (mesmo que a resposta
 *              não tenha voltado). Desfazer um item tentado tem de ir ao
 *              servidor; um nunca tentado sai da fila e pronto.
 *    titular — false = só os acompanhantes listados entram (a esposa
 *              chegou antes do marido). Ausente = true. */
type ItemFilaLocal =
  | (Extract<ItemFila, { acao: "marcar" }> & { tentado?: boolean; titular?: boolean })
  | (Extract<ItemFila, { acao: "desfazer" }> & { tentado?: boolean });

type ItemMarcar = Extract<ItemFilaLocal, { acao: "marcar" }>;

/** A última marcação, para o botão "desfazer". Guarda o que foi marcado
 *  para virar um 'desfazer' por pessoa se já tiver ido ao servidor. */
type Ultima = {
  nome: string;
  pessoas: number;
  /** ms do toque */
  em: number;
  /** id do item na fila enquanto ele não foi ao servidor: desfazer é
   *  só tirá-lo de lá, sem escrever nada */
  itemFilaId: string | null;
  convidadoId: string;
  titular: boolean;
  semNome: number;
  acompanhantes: string[];
};

type EstadoCamera = "pedindo" | "ligada" | "negada" | "indisponivel";

type Resposta<T> = { ok: true; dados: T } | { ok: false; status: number; erro: string };

// ------------------------------------------------------------
// Falar com a rota
// ------------------------------------------------------------

/** Wi-Fi de casa de festas não recusa: fica pendurado. Sem isto, um
 *  pedido que nunca responde prende enviandoRef e a fila inteira atrás
 *  dele. Estourar o tempo cai no mesmo caminho de "sem sinal". */
const TEMPO_MAXIMO_MS = 15_000;

function sinalDeTempo(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal === "undefined") return undefined;
  if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms);
  // Safari anterior ao 16 não tem AbortSignal.timeout
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function chamarPorta<T>(
  hash: string,
  corpo: Record<string, unknown>
): Promise<Resposta<T>> {
  try {
    const r = await fetch(`/api/recepcao/${hash}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      cache: "no-store",
      signal: sinalDeTempo(TEMPO_MAXIMO_MS),
    });
    const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) {
      return { ok: false, status: r.status, erro: String(json.erro ?? "falhou") };
    }
    return { ok: true, dados: json as T };
  } catch {
    // fetch só rejeita sem rede, ou quando o tempo estourou: sem sinal,
    // fica para a próxima
    return { ok: false, status: 0, erro: "sem_sinal" };
  }
}

const ERROS_DE_POSTO = new Set(["posto_invalido", "posto_revogado", "posto_fora_da_janela"]);

/** 403 = o POSTO morreu (revogado, fora da janela). A tela vira "link
 *  inativo" e a fila é descartada — não há mais para onde mandar. */
function ehErroDePosto(r: { status: number; erro: string }): boolean {
  return r.status === 403 || ERROS_DE_POSTO.has(r.erro);
}

const AVISO_CONSULTA: Record<string, string> = {
  ambiguo: "Este código serve para mais de uma pessoa. Busque pelo nome.",
  nao_encontrado: "Não encontramos este convite.",
  codigo_invalido: "Código inválido.",
};

const AVISO_DESFAZER: Record<string, string> = {
  nada_a_desfazer: "Não havia o que desfazer.",
  marcado_por_outra_porta: "Foi marcado por outra porta — só ela desfaz.",
  janela_passou: "Passou o tempo de desfazer por aqui.",
};

// ------------------------------------------------------------
// Ajudantes puros
// ------------------------------------------------------------

function hora(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function novoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function vibrar(ms = 60) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* sem motor de vibração: silêncio */
  }
}

/** Lê a fila do celular descartando o que é velho demais: o servidor
 *  prende a hora a [agora − 12h, agora] e uma chegada de ontem enviada
 *  hoje seria mentira com carimbo. */
function lerFila(hash: string): ItemFilaLocal[] {
  try {
    const bruto = localStorage.getItem(chaveFila(hash));
    if (!bruto) return [];
    const itens = JSON.parse(bruto) as unknown;
    if (!Array.isArray(itens)) return [];
    const limite = Date.now() - FILA_MAX_HORAS * 3_600_000;
    return (itens as ItemFilaLocal[]).filter(
      (i) => i && typeof i.em === "string" && Date.parse(i.em) > limite
    );
  } catch {
    return [];
  }
}

function gravarFila(hash: string, itens: ItemFilaLocal[]) {
  try {
    if (itens.length === 0) localStorage.removeItem(chaveFila(hash));
    else localStorage.setItem(chaveFila(hash), JSON.stringify(itens));
  } catch {
    /* modo privado sem armazenamento: a fila vive só na memória da aba */
  }
}

/** Quantas pessoas a fila ainda vai somar (ou tirar) do que o servidor
 *  conta. É o que mantém "84 de 210" certo entre uma resposta e outra. */
function pendentesNaFila(itens: ItemFila[]): number {
  return itens.reduce((n, i) => n + (i.acao === "marcar" ? i.pessoas : -i.pessoas), 0);
}

function trocarConvidado(
  lista: ListaRecepcao,
  id: string,
  fn: (c: ConvidadoDaPorta) => ConvidadoDaPorta
): ListaRecepcao {
  return {
    ...lista,
    convidados: lista.convidados.map((c) => (c.id === id ? fn(c) : c)),
  };
}

/** A marcação otimista na lista local: titular (se ainda não entrou e
 *  se o item o inclui) e os acompanhantes escolhidos ganham a hora do
 *  toque. */
function aplicarMarcacao(lista: ListaRecepcao, item: ItemMarcar): ListaRecepcao {
  const comTitular = item.titular !== false;
  return trocarConvidado(lista, item.convidadoId, (c) => ({
    ...c,
    presente_em: comTitular ? c.presente_em ?? item.em : c.presente_em,
    sem_nome: comTitular ? item.semNome ?? c.sem_nome : c.sem_nome,
    acompanhantes: c.acompanhantes.map((a) =>
      item.acompanhantes.includes(a.id) && !a.presente_em ? { ...a, presente_em: item.em } : a
    ),
  }));
}

/** O que a fila ainda não entregou continua valendo na tela — as
 *  marcações E os desfazeres, na ordem em que foram tocados. Idempotente:
 *  reaplicar sobre uma lista que já os tem não muda nada. */
function reaplicarFila(lista: ListaRecepcao, itens: ItemFilaLocal[]): ListaRecepcao {
  return itens.reduce<ListaRecepcao>(
    (l, i) =>
      i.acao === "marcar"
        ? aplicarMarcacao(l, i)
        : desfazerNaLista(
            l,
            i.convidadoId,
            i.acompanhanteId === null,
            i.acompanhanteId === null ? [] : [i.acompanhanteId]
          ),
    lista
  );
}

function desfazerNaLista(
  lista: ListaRecepcao,
  convidadoId: string,
  titular: boolean,
  acompanhantes: string[]
): ListaRecepcao {
  return trocarConvidado(lista, convidadoId, (c) => ({
    ...c,
    presente_em: titular ? null : c.presente_em,
    acompanhantes: c.acompanhantes.map((a) =>
      acompanhantes.includes(a.id) ? { ...a, presente_em: null } : a
    ),
  }));
}

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

// ------------------------------------------------------------
// A tela do link morto — sem nome de evento, de propósito (148)
// ------------------------------------------------------------

/** `pendentes` = chegadas que estavam na fila deste aparelho quando o
 *  posto morreu. Elas não têm mais para onde ir — e quem está na porta
 *  precisa saber disso antes de largar o celular. Sem nomes: a fila não
 *  os tem, de propósito. */
export function LinkInativo({ pendentes = 0 }: { pendentes?: number }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-marfim px-6 text-tinta">
      <div className="max-w-xs text-center">
        <p className="text-lg font-medium">Este link não está mais ativo.</p>
        <p className="mt-2 text-base text-cinza2">Peça outro à cerimonialista do evento.</p>
        {pendentes > 0 && (
          <p className="mt-6 text-base text-[--state-wait]" role="alert">
            {pendentes === 1
              ? "1 chegada deste aparelho não foi registrada"
              : `${pendentes} chegadas deste aparelho não foram registradas`}{" "}
            — avise a cerimonialista.
          </p>
        )}
      </div>
    </main>
  );
}

// ------------------------------------------------------------
// O posto
// ------------------------------------------------------------

export function PostoDeRecepcao({ hash, posto }: { hash: string; posto: PostoPublico }) {
  // --- quem opera e o que a aba sabe ---
  const [pronto, setPronto] = useState(false);
  const [operador, setOperador] = useState("");
  const operadorRef = useRef("");
  const [lista, setLista] = useState<ListaRecepcao | null>(null);
  const listaRef = useRef<ListaRecepcao | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [inativo, setInativo] = useState(false);
  /** chegadas que estavam na fila quando o posto morreu */
  const [perdidas, setPerdidas] = useState(0);
  const [presentes, setPresentes] = useState(0);

  // --- a fila offline ---
  const [fila, setFila] = useState<ItemFilaLocal[]>([]);
  const filaRef = useRef<ItemFilaLocal[]>([]);
  const enviandoRef = useRef(false);
  /** id do item que está no ar neste instante: desfazer sobre ele não
   *  pode só tirá-lo da fila, porque o servidor pode já ter gravado */
  const emVooRef = useRef<string | null>(null);

  // --- o que está na tela ---
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  /** o titular entra com este toque? Desmarcado = só os acompanhantes
   *  escolhidos (a esposa chegou antes do marido) */
  const [titularMarcado, setTitularMarcado] = useState(true);
  const [semNome, setSemNome] = useState(0);
  const [semNomeAjustado, setSemNomeAjustado] = useState(false);
  const [busca, setBusca] = useState("");
  const [codigo, setCodigo] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [avulsoAberto, setAvulsoAberto] = useState(false);
  const [avulsoNome, setAvulsoNome] = useState("");
  const [avulsoPessoas, setAvulsoPessoas] = useState(1);
  const [enviandoAvulso, setEnviandoAvulso] = useState(false);
  const [ultima, setUltima] = useState<Ultima | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // --- câmera ---
  const [camera, setCamera] = useState<EstadoCamera>("pedindo");
  const [tentativaCamera, setTentativaCamera] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** enquanto um grupo está aberto (ou uma consulta no ar) a câmera não
   *  lê: senão o mesmo QR reabre o cartão que acabou de fechar */
  const pausadoRef = useRef(false);
  const ultimoLidoRef = useRef<{ texto: string; em: number }>({ texto: "", em: 0 });
  const aoLerQrRef = useRef<(texto: string) => void>(() => {});

  const avisar = useCallback((texto: string) => setAviso(texto), []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  // ---------- fila: só por estas duas mãos ----------
  const definirFila = useCallback(
    (itens: ItemFilaLocal[]) => {
      filaRef.current = itens;
      setFila(itens);
      gravarFila(hash, itens);
    },
    [hash]
  );

  const enfileirar = useCallback(
    (...itens: ItemFilaLocal[]) => definirFila([...filaRef.current, ...itens]),
    [definirFila]
  );

  const removerDaFila = useCallback(
    (id: string) => definirFila(filaRef.current.filter((i) => i.id !== id)),
    [definirFila]
  );

  const atualizarLista = useCallback((fn: (l: ListaRecepcao) => ListaRecepcao) => {
    if (!listaRef.current) return;
    const nova = fn(listaRef.current);
    listaRef.current = nova;
    setLista(nova);
  }, []);

  /** O posto morreu: nada mais tem para onde ir. Antes de largar a fila,
   *  conta as chegadas que ela ainda segurava — a tela do link morto
   *  avisa quem está na porta. */
  const encerrar = useCallback(() => {
    setPerdidas(filaRef.current.filter((i) => i.acao === "marcar").length);
    definirFila([]);
    setInativo(true);
  }, [definirFila]);

  // ---------- esvaziar a fila ----------
  const esvaziarFila = useCallback(async () => {
    if (enviandoRef.current || inativo) return;
    // sem o nome de quem opera, o livro receberia operador '' — justamente
    // nas chegadas que ficaram na fila de uma sessão anterior
    if (!operadorRef.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    enviandoRef.current = true;
    try {
      while (filaRef.current.length > 0) {
        const item = filaRef.current[0];
        // a partir daqui o servidor PODE ter recebido: desfazer este item
        // nunca mais é só tirá-lo da fila
        if (!item.tentado) {
          definirFila(
            filaRef.current.map((i) => (i.id === item.id ? { ...i, tentado: true } : i))
          );
        }
        emVooRef.current = item.id;
        const r =
          item.acao === "marcar"
            ? await chamarPorta<RespostaMarcar>(hash, {
                acao: "marcar",
                convidadoId: item.convidadoId,
                acompanhantes: item.acompanhantes,
                semNome: item.semNome,
                em: item.em,
                titular: item.titular !== false,
                operador: operadorRef.current,
              })
            : await chamarPorta<RespostaDesfazer>(hash, {
                acao: "desfazer",
                convidadoId: item.convidadoId,
                acompanhanteId: item.acompanhanteId,
                operador: operadorRef.current,
              });
        emVooRef.current = null;

        if (!r.ok) {
          if (ehErroDePosto(r)) {
            encerrar();
            return;
          }
          if (r.status === 400) {
            // este PEDIDO não vale (convidado de outro evento, formato):
            // descarta e devolve o que o contador tinha somado
            removerDaFila(item.id);
            setPresentes((p) => p - (item.acao === "marcar" ? item.pessoas : -item.pessoas));
            continue;
          }
          // sem sinal, 429, 5xx: fica para a próxima tentativa
          return;
        }

        removerDaFila(item.id);
        const restante = filaRef.current;

        if (item.acao === "marcar") {
          const d = r.dados as RespostaMarcar;
          if (d.ja_entrou_em) {
            // o servidor já tinha o titular: a hora que vale é a dele
            const ja = d.ja_entrou_em;
            atualizarLista((l) =>
              trocarConvidado(l, item.convidadoId, (c) => ({ ...c, presente_em: ja }))
            );
            // Se a hora dele é a hora DESTE toque, foi esta mesma marcação
            // que chegou lá numa tentativa cuja resposta se perdeu — não
            // é "outra porta", e não há o que avisar. A folga é larga (5
            // min) porque o servidor prende a hora em least(toque, now()):
            // celular adiantado grava a hora do servidor, não a do toque.
            // E numa marcação só de acompanhante (titular já dentro),
            // ja_entrou_em é a hora antiga do TITULAR — não diz nada sobre
            // este toque, então não se avisa.
            const mesmoToque =
              item.titular === false ||
              Math.abs(Date.parse(ja) - Date.parse(item.em)) <= 5 * 60_000;
            if (d.marcados === 0 && !mesmoToque) {
              const nome =
                listaRef.current?.convidados.find((c) => c.id === item.convidadoId)?.nome ??
                "Este grupo";
              avisar(`${nome} já tinha entrado às ${hora(ja)}.`);
              setUltima((u) => (u && u.itemFilaId === item.id ? null : u));
            }
          }
          setUltima((u) => (u && u.itemFilaId === item.id ? { ...u, itemFilaId: null } : u));
          setPresentes(d.presentes + pendentesNaFila(restante));
        } else {
          const d = r.dados as RespostaDesfazer;
          if ("erro" in d) {
            // não desfez: a pessoa continua dentro, e a tela volta a dizer isso
            avisar(AVISO_DESFAZER[d.erro] ?? "Não deu para desfazer.");
            atualizarLista((l) =>
              trocarConvidado(l, item.convidadoId, (c) =>
                item.acompanhanteId === null
                  ? { ...c, presente_em: c.presente_em ?? item.em }
                  : {
                      ...c,
                      acompanhantes: c.acompanhantes.map((a) =>
                        a.id === item.acompanhanteId ? { ...a, presente_em: a.presente_em ?? item.em } : a
                      ),
                    }
              )
            );
            setPresentes((p) => p + item.pessoas);
          } else {
            // desfez: a lista diz o mesmo que o servidor — e o que ainda
            // está na fila (uma nova marcação da mesma pessoa, por exemplo)
            // continua valendo por cima
            atualizarLista((l) =>
              reaplicarFila(
                desfazerNaLista(
                  l,
                  item.convidadoId,
                  item.acompanhanteId === null,
                  item.acompanhanteId === null ? [] : [item.acompanhanteId]
                ),
                restante
              )
            );
            setPresentes(d.presentes + pendentesNaFila(restante));
          }
        }
      }
    } finally {
      emVooRef.current = null;
      enviandoRef.current = false;
    }
  }, [hash, inativo, encerrar, definirFila, removerDaFila, atualizarLista, avisar]);

  // ---------- baixar a lista ----------
  const carregarLista = useCallback(async (): Promise<boolean> => {
    setErroLista(null);
    const r = await chamarPorta<ListaRecepcao>(hash, { acao: "lista" });
    if (!r.ok) {
      if (ehErroDePosto(r)) {
        encerrar();
        return false;
      }
      setErroLista(
        r.status === 0 ? "Sem sinal. A lista precisa baixar uma vez." : "Não deu para baixar a lista."
      );
      return false;
    }
    // o que a fila ainda não entregou continua valendo na tela — as
    // marcações e os desfazeres
    const filaAtual = filaRef.current;
    const nova = reaplicarFila(r.dados, filaAtual);
    listaRef.current = nova;
    setLista(nova);
    setPresentes(r.dados.presentes + pendentesNaFila(filaAtual));
    return true;
  }, [hash, encerrar]);

  // ---------- arranque: quem opera, o que ficou na fila ----------
  useEffect(() => {
    let nome = "";
    try {
      nome = sessionStorage.getItem(chaveOperador(hash)) ?? "";
    } catch {
      /* sem sessionStorage: pergunta de novo */
    }
    const guardada = lerFila(hash);
    filaRef.current = guardada;
    setFila(guardada);
    gravarFila(hash, guardada); // regrava já sem os itens velhos
    operadorRef.current = nome;
    setOperador(nome);
    setPronto(true);
  }, [hash]);

  useEffect(() => {
    if (pronto && operador && !lista && !inativo) void carregarLista();
  }, [pronto, operador, lista, inativo, carregarLista]);

  // a lista acabou de chegar com coisa na fila: tenta entregar já
  useEffect(() => {
    if (lista && filaRef.current.length > 0) void esvaziarFila();
  }, [lista, esvaziarFila]);

  // temporizador e volta do sinal
  useEffect(() => {
    if (inativo) return;
    const t = setInterval(() => {
      if (filaRef.current.length > 0) void esvaziarFila();
    }, 10_000);
    const online = () => {
      if (!listaRef.current && operadorRef.current) void carregarLista();
      else void esvaziarFila();
    };
    window.addEventListener("online", online);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", online);
    };
  }, [inativo, esvaziarFila, carregarLista]);

  // a janela de desfazer fecha sozinha
  useEffect(() => {
    if (!ultima) return;
    const resta = ultima.em + JANELA_DESFAZER_MIN * 60_000 - Date.now();
    if (resta <= 0) {
      setUltima(null);
      return;
    }
    const t = setTimeout(() => setUltima(null), resta);
    return () => clearTimeout(t);
  }, [ultima]);

  useEffect(() => {
    pausadoRef.current = grupo !== null || avulsoAberto || consultando;
  }, [grupo, avulsoAberto, consultando]);

  // ---------- abrir um grupo ----------
  const abrirGrupo = useCallback((convidadoId: string, origem: Origem) => {
    const c = listaRef.current?.convidados.find((x) => x.id === convidadoId);
    if (!c) return;
    setSelecionados(new Set(c.acompanhantes.filter((a) => !a.presente_em).map((a) => a.id)));
    setTitularMarcado(true);
    setSemNome(c.sem_nome);
    setSemNomeAjustado(false);
    setGrupo({ convidadoId, origem });
    setCodigo("");
  }, []);

  /** Fecha a folha (Voltar, toque fora, ou a chegada confirmada). O
   *  mesmo QR ainda parado na frente da lente não pode reabri-la: a
   *  janela de 4s da leitura recomeça agora, não na leitura aceita. */
  const fecharGrupo = useCallback(() => {
    ultimoLidoRef.current = { texto: ultimoLidoRef.current.texto, em: Date.now() };
    setGrupo(null);
  }, []);

  const consultar = useCallback(
    async (codigoOuHash: string, origem: Origem) => {
      setConsultando(true);
      const r = await chamarPorta<RespostaConsultar>(hash, {
        acao: "consultar",
        codigo: codigoOuHash,
        operador: operadorRef.current,
      });
      setConsultando(false);
      if (!r.ok) {
        if (ehErroDePosto(r)) return encerrar();
        avisar(r.status === 0 ? "Sem sinal. Busque pelo nome." : "Não deu para consultar agora.");
        return;
      }
      if ("erro" in r.dados) {
        avisar(AVISO_CONSULTA[r.dados.erro] ?? "Não encontramos este convite.");
        return;
      }
      const id = r.dados.id;
      if (!listaRef.current?.convidados.some((c) => c.id === id)) {
        // entrou na lista depois que a porta abriu: baixa de novo
        const ok = await carregarLista();
        if (!ok || !listaRef.current?.convidados.some((c) => c.id === id)) {
          avisar("Este convite não está na lista deste evento.");
          return;
        }
      }
      abrirGrupo(id, origem);
    },
    [hash, encerrar, avisar, carregarLista, abrirGrupo]
  );

  /** Pelo hash inteiro (QR): os 6 últimos caracteres resolvem na lista
   *  local; ambíguo ou ausente vai ao servidor com o hash inteiro. */
  const abrirPorHash = useCallback(
    async (h: string, origem: Origem) => {
      const cod = codigoDoHash(h);
      const candidatos = listaRef.current?.convidados.filter((c) => c.codigo === cod) ?? [];
      if (candidatos.length === 1) {
        abrirGrupo(candidatos[0].id, origem);
        return;
      }
      await consultar(h, origem);
    },
    [abrirGrupo, consultar]
  );

  // O laço da câmera vive num efeito de vida longa; ele chama a versão
  // mais recente deste tratador pela ref, sem reabrir a câmera a cada render.
  useEffect(() => {
    aoLerQrRef.current = (texto: string) => {
      const agora = Date.now();
      const anterior = ultimoLidoRef.current;
      // o mesmo QR parado na frente da lente dispara dezenas de leituras
      if (texto === anterior.texto && agora - anterior.em < 4000) return;
      ultimoLidoRef.current = { texto, em: agora };
      const h = extrairCheckinHash(texto);
      if (!h) {
        avisar("Este QR não é de entrada.");
        return;
      }
      vibrar();
      void abrirPorHash(h, "qr");
    };
  }, [avisar, abrirPorHash]);

  // ---------- a câmera ----------
  useEffect(() => {
    if (!lista || !operador || inativo) return;
    let ativo = true;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ultimoScan = 0;
    setCamera("pedindo");

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera("indisponivel");
        return;
      }
      let jsQR: (typeof import("jsqr"))["default"];
      try {
        jsQR = (await import("jsqr")).default;
      } catch {
        setCamera("indisponivel");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch {
        if (ativo) setCamera("negada");
        return;
      }
      const video = videoRef.current;
      if (!ativo || !video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        /* autoplay recusado: o <video muted playsInline> quase sempre passa */
      }
      if (!ativo) return;
      setCamera("ligada");

      const canvas = canvasRef.current ?? document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setCamera("indisponivel");
        return;
      }

      // ~8 leituras por segundo bastam e poupam a bateria de uma noite
      // inteira; a imagem cai para 640px de largura pelo mesmo motivo.
      const loop = (t: number) => {
        if (!ativo) return;
        raf = requestAnimationFrame(loop);
        if (pausadoRef.current || t - ultimoScan < 120 || video.readyState < 2) return;
        ultimoScan = t;
        const escala = Math.min(1, 640 / (video.videoWidth || 640));
        const w = Math.round(video.videoWidth * escala);
        const h = Math.round(video.videoHeight * escala);
        if (!w || !h) return;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const qr = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
        if (qr?.data) aoLerQrRef.current(qr.data);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      ativo = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // `lista` só importa como "já existe"; `tentativaCamera` reabre a
    // câmera depois de uma permissão negada e depois concedida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista !== null, operador, inativo, tentativaCamera]);

  // ---------- marcar ----------
  const convidadoAtual = useMemo(
    () => (grupo && lista ? lista.convidados.find((c) => c.id === grupo.convidadoId) ?? null : null),
    [grupo, lista]
  );

  const totalMarcar = useMemo(() => {
    if (!convidadoAtual) return 0;
    const titular = convidadoAtual.presente_em || !titularMarcado ? 0 : 1 + semNome;
    const acomp = convidadoAtual.acompanhantes.filter(
      (a) => !a.presente_em && selecionados.has(a.id)
    ).length;
    return titular + acomp;
  }, [convidadoAtual, titularMarcado, semNome, selecionados]);

  /** quantos do grupo ainda podem entrar — separa "todos já entraram" de
   *  "ninguém escolhido" no botão */
  const faltamEntrar = convidadoAtual
    ? (convidadoAtual.presente_em ? 0 : 1) +
      convidadoAtual.acompanhantes.filter((a) => !a.presente_em).length
    : 0;

  function confirmarChegada() {
    if (!grupo || !convidadoAtual || totalMarcar === 0) return;
    const c = convidadoAtual;
    const titularEntra = !c.presente_em && titularMarcado;
    const acompanhantes = c.acompanhantes
      .filter((a) => !a.presente_em && selecionados.has(a.id))
      .map((a) => a.id);
    // sem o titular não há "sem nome" a contar: eles entram com ele
    const semNomeEnvio = !titularEntra
      ? null
      : grupo.origem === "qr" && !semNomeAjustado
        ? null
        : semNome;
    const em = new Date().toISOString();
    const item: ItemMarcar = {
      id: novoId(),
      acao: "marcar",
      convidadoId: c.id,
      acompanhantes,
      semNome: semNomeEnvio,
      pessoas: totalMarcar,
      em,
      titular: titularEntra,
    };
    atualizarLista((l) => aplicarMarcacao(l, item));
    setPresentes((p) => p + totalMarcar);
    setUltima({
      nome: c.nome,
      pessoas: totalMarcar,
      em: Date.now(),
      itemFilaId: item.id,
      convidadoId: c.id,
      titular: titularEntra,
      semNome: titularEntra ? semNome : 0,
      acompanhantes,
    });
    enfileirar(item);
    fecharGrupo();
    setBusca(""); // a próxima família já está na frente da lente
    vibrar(30);
    void esvaziarFila();
  }

  function desfazerUltima() {
    const u = ultima;
    if (!u) return;
    const naFila =
      u.itemFilaId === null ? undefined : filaRef.current.find((i) => i.id === u.itemFilaId);
    // Só um item que NUNCA foi ao servidor pode ser desfeito tirando-o da
    // fila. Um tentado (mesmo sem resposta) pode já estar no livro: fica
    // na fila e o desfazer vai atrás dele.
    const nuncaTentado =
      naFila !== undefined && naFila.tentado !== true && emVooRef.current !== u.itemFilaId;
    if (nuncaTentado && u.itemFilaId) {
      removerDaFila(u.itemFilaId);
    } else {
      const em = new Date().toISOString();
      const itens: ItemFilaLocal[] = [];
      if (u.titular) {
        itens.push({
          id: novoId(),
          acao: "desfazer",
          convidadoId: u.convidadoId,
          acompanhanteId: null,
          pessoas: 1 + u.semNome,
          em,
        });
      }
      for (const a of u.acompanhantes) {
        itens.push({
          id: novoId(),
          acao: "desfazer",
          convidadoId: u.convidadoId,
          acompanhanteId: a,
          pessoas: 1,
          em,
        });
      }
      enfileirar(...itens);
    }
    atualizarLista((l) => desfazerNaLista(l, u.convidadoId, u.titular, u.acompanhantes));
    setPresentes((p) => p - u.pessoas);
    setUltima(null);
    void esvaziarFila();
  }

  // ---------- quem não está na lista ----------
  async function registrarAvulso() {
    const nome = avulsoNome.trim();
    if (nome.length < 2 || enviandoAvulso) return;
    setEnviandoAvulso(true);
    const r = await chamarPorta<RespostaAvulso>(hash, {
      acao: "avulso",
      nome,
      pessoas: avulsoPessoas,
      operador: operadorRef.current,
    });
    setEnviandoAvulso(false);
    if (!r.ok) {
      if (ehErroDePosto(r)) return encerrar();
      avisar(
        r.status === 0
          ? "Sem sinal. Tente de novo quando voltar."
          : r.erro === "teto_de_avulsos"
            ? "Este posto já registrou o máximo de pessoas fora da lista."
            : "Não deu para registrar agora."
      );
      return;
    }
    const em = new Date().toISOString();
    const novo: ConvidadoDaPorta = {
      id: r.dados.id,
      codigo: "",
      nome,
      confirmacao: "confirmado",
      presente_em: em,
      sem_nome: avulsoPessoas - 1,
      acompanhantes: [],
    };
    atualizarLista((l) => ({ ...l, convidados: [...l.convidados, novo] }));
    setPresentes(r.dados.presentes + pendentesNaFila(filaRef.current));
    setUltima({
      nome,
      pessoas: avulsoPessoas,
      em: Date.now(),
      itemFilaId: null,
      convidadoId: r.dados.id,
      titular: true,
      semNome: avulsoPessoas - 1,
      acompanhantes: [],
    });
    setAvulsoAberto(false);
    setAvulsoNome("");
    setAvulsoPessoas(1);
    vibrar(30);
  }

  // ---------- busca e código ----------
  const termo = normalizarBusca(busca);
  const resultados = useMemo(() => {
    if (!lista || termo.length < BUSCA_MIN_CHARS) return [];
    const achados: { c: ConvidadoDaPorta; com: string | null }[] = [];
    for (const c of lista.convidados) {
      if (normalizarBusca(c.nome).includes(termo)) {
        achados.push({ c, com: null });
      } else {
        const a = c.acompanhantes.find((x) => normalizarBusca(x.nome).includes(termo));
        if (a) achados.push({ c, com: a.nome });
      }
      if (achados.length >= 40) break;
    }
    return achados;
  }, [lista, termo]);

  function digitarCodigo(valor: string) {
    const limpo = valor.replace(/[^0-9a-z]/gi, "").toUpperCase().slice(0, 6);
    setCodigo(limpo);
    if (limpo.length === 6 && CODIGO6.test(limpo)) {
      const candidatos = listaRef.current?.convidados.filter((c) => c.codigo === limpo) ?? [];
      if (candidatos.length === 1) abrirGrupo(candidatos[0].id, "codigo");
      else void consultar(limpo, "codigo");
    }
  }

  function comecar(nome: string) {
    const n = nome.trim().slice(0, 60);
    if (!n) return;
    try {
      sessionStorage.setItem(chaveOperador(hash), n);
    } catch {
      /* sem sessionStorage: vale só até fechar */
    }
    operadorRef.current = n;
    setOperador(n);
  }

  function trocarOperador() {
    try {
      sessionStorage.removeItem(chaveOperador(hash));
    } catch {
      /* idem */
    }
    operadorRef.current = "";
    setOperador("");
  }

  // ============================================================
  // Render
  // ============================================================

  if (inativo) return <LinkInativo pendentes={perdidas} />;

  // antes do primeiro efeito, o servidor e o cliente desenham o mesmo
  if (!pronto) {
    return (
      <main className="min-h-dvh bg-marfim px-5 pt-6 text-tinta">
        <p className="text-sm text-cinza">{posto.evento_nome}</p>
        <p className="text-xl font-semibold">{posto.posto_nome}</p>
      </main>
    );
  }

  if (!operador) {
    return <PerguntaOperador posto={posto} aoComecar={comecar} />;
  }

  if (!lista) {
    return (
      <main className="flex min-h-dvh flex-col bg-marfim px-5 pt-6 text-tinta">
        <p className="text-sm text-cinza">{posto.evento_nome}</p>
        <p className="text-xl font-semibold">{posto.posto_nome}</p>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          {erroLista ? (
            <>
              <p className="text-lg text-cinza2">{erroLista}</p>
              <button type="button" className={BOTAO_SECUNDARIO} onClick={() => void carregarLista()}>
                Tentar de novo
              </button>
            </>
          ) : (
            <p className="text-lg text-cinza2">Baixando a lista…</p>
          )}
        </div>
      </main>
    );
  }

  const esperados = lista.esperados;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-marfim pb-28 text-tinta">
      {/* ---------- topo: o número que importa ---------- */}
      <header className="sticky top-0 z-10 border-b border-linha bg-marfim/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm text-cinza">{lista.evento.nome}</p>
          <button
            type="button"
            onClick={trocarOperador}
            className="min-h-11 shrink-0 text-sm text-cinza2 underline-offset-2 hover:underline"
          >
            {operador}
          </button>
        </div>
        <p className="text-xl font-semibold">
          {posto.posto_nome} ·{" "}
          <span className="tabular-nums">
            {presentes} de {esperados}
          </span>{" "}
          chegaram
        </p>
        {fila.length > 0 && (
          <p className="mt-1 flex items-center gap-2 text-sm text-[--state-wait]" role="status">
            <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse motion-reduce:animate-none" />
            {plural(fila.length, "chegada esperando sinal", "chegadas esperando sinal")}
          </p>
        )}
      </header>

      {/* ---------- a câmera ---------- */}
      <section className="relative h-56 w-full overflow-hidden bg-tinta">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
        />
        <canvas ref={canvasRef} hidden />
        {camera === "ligada" && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 m-auto h-40 w-40 rounded-xl border-2 border-white/80"
          />
        )}
        {consultando && (
          <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white/90">Conferindo…</p>
        )}
        {camera !== "ligada" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
            {camera === "pedindo" ? (
              <p className="text-base text-white/80">Abrindo a câmera…</p>
            ) : (
              <>
                <p className="text-base">Sem câmera. Busque pelo nome ou digite o código.</p>
                <button
                  type="button"
                  onClick={() => setTentativaCamera((n) => n + 1)}
                  className="min-h-11 rounded-lg border border-white/50 px-4 text-sm text-white"
                >
                  Tentar a câmera
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {/* ---------- busca e código: sempre à mão ---------- */}
      <section className="flex gap-2 px-4 pt-4">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pelo nome"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Buscar pelo nome"
          className={`${CAMPO} flex-1`}
        />
        <input
          type="text"
          value={codigo}
          onChange={(e) => digitarCodigo(e.target.value)}
          placeholder="Código"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={6}
          aria-label="Código de entrada"
          className={`${CAMPO} w-28 font-mono uppercase tracking-widest`}
        />
      </section>

      {/* ---------- resultados ---------- */}
      {termo.length >= BUSCA_MIN_CHARS && (
        <ul className="mt-2 divide-y divide-[--linha-suave] px-2">
          {resultados.length === 0 && (
            <li className="px-3 py-4 text-base text-cinza2">Ninguém com esse nome na lista.</li>
          )}
          {resultados.map(({ c, com }) => {
            const dentro = Boolean(c.presente_em);
            const faltam = c.acompanhantes.filter((a) => !a.presente_em).length;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => abrirGrupo(c.id, "busca")}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-lg">{c.nome}</span>
                    {com && <span className="block truncate text-sm text-cinza">com {com}</span>}
                  </span>
                  <span className="shrink-0 text-sm text-cinza2">
                    {dentro
                      ? faltam > 0
                        ? `entrou · faltam ${faltam}`
                        : `entrou às ${hora(c.presente_em)}`
                      : c.sem_nome + c.acompanhantes.length > 0
                        ? `+${c.sem_nome + c.acompanhantes.length}`
                        : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={() => setAvulsoAberto(true)}
          className="min-h-11 text-base text-ameixa underline-offset-2 hover:underline"
        >
          Não está na lista
        </button>
      </div>

      {/* ---------- a última marcação, com o desfazer ---------- */}
      {ultima && (
        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-md items-center justify-between gap-3 border-t border-linha bg-white px-5 py-3">
          <p className="min-w-0 text-base">
            <span className="block truncate font-medium">{ultima.nome}</span>
            <span className="text-sm text-cinza2">
              {plural(ultima.pessoas, "pessoa", "pessoas")} · {hora(new Date(ultima.em).toISOString())}
            </span>
          </p>
          <button type="button" onClick={desfazerUltima} className={BOTAO_SECUNDARIO}>
            Desfazer
          </button>
        </div>
      )}

      {/* ---------- o aviso curto ---------- */}
      {aviso && (
        <p
          role="status"
          className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-lg bg-tinta px-4 py-3 text-center text-base text-white shadow-lg"
        >
          {aviso}
        </p>
      )}

      {/* ---------- o grupo ---------- */}
      {convidadoAtual && grupo && (
        <Folha aoFechar={fecharGrupo} titulo={convidadoAtual.nome}>
          {convidadoAtual.presente_em && (
            <p className="text-base text-cinza2">já entrou às {hora(convidadoAtual.presente_em)}</p>
          )}
          {convidadoAtual.confirmacao !== "confirmado" && (
            <p className="text-base text-[--state-wait]">não tinha confirmado</p>
          )}

          {convidadoAtual.acompanhantes.length > 0 && (
            <ul className="mt-3 divide-y divide-[--linha-suave] border-y border-[--linha-suave]">
              {/* O titular é uma linha como as outras: quem chegou entra,
                  quem ainda não chegou fica de fora. Só faz sentido quando
                  há acompanhantes com nome para escolher — sozinho, a única
                  alternativa seria "ninguém". */}
              {!convidadoAtual.presente_em && (
                <li>
                  <LinhaMarcavel
                    nome={convidadoAtual.nome}
                    marcado={titularMarcado}
                    aoAlternar={() => setTitularMarcado((v) => !v)}
                  />
                </li>
              )}
              {convidadoAtual.acompanhantes.map((a) => {
                const dentro = Boolean(a.presente_em);
                return (
                  <li key={a.id}>
                    {dentro ? (
                      <p className="flex min-h-14 items-center justify-between gap-3 px-1 text-lg text-cinza2">
                        <span className="truncate">{a.nome}</span>
                        <span className="shrink-0 text-sm">entrou às {hora(a.presente_em)}</span>
                      </p>
                    ) : (
                      <LinhaMarcavel
                        nome={a.nome}
                        detalhe={a.crianca ? "criança" : undefined}
                        marcado={selecionados.has(a.id)}
                        aoAlternar={() =>
                          setSelecionados((s) => {
                            const n = new Set(s);
                            if (n.has(a.id)) n.delete(a.id);
                            else n.add(a.id);
                            return n;
                          })
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {!convidadoAtual.presente_em && titularMarcado && (
            <div className="mt-3 flex min-h-14 items-center justify-between gap-3 px-1">
              <span className="text-lg">
                +{semNome} sem nome
              </span>
              <Passos
                valor={semNome}
                min={0}
                max={40}
                aoMudar={(v) => {
                  setSemNome(v);
                  setSemNomeAjustado(true);
                }}
              />
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={confirmarChegada}
              disabled={totalMarcar === 0}
              className={BOTAO_PRIMARIO}
            >
              {faltamEntrar === 0
                ? "Todos já entraram"
                : totalMarcar === 0
                  ? "Marque quem chegou"
                  : totalMarcar === 1
                    ? "Chegou"
                    : `Chegaram (${totalMarcar})`}
            </button>
            <button type="button" onClick={fecharGrupo} className={BOTAO_SECUNDARIO}>
              Voltar
            </button>
          </div>
        </Folha>
      )}

      {/* ---------- quem não está na lista ---------- */}
      {avulsoAberto && (
        <Folha aoFechar={() => setAvulsoAberto(false)} titulo="Não está na lista">
          <input
            type="text"
            value={avulsoNome}
            onChange={(e) => setAvulsoNome(e.target.value)}
            placeholder="Nome"
            autoFocus
            autoComplete="off"
            maxLength={120}
            aria-label="Nome"
            className={`${CAMPO} mt-3 w-full`}
          />
          <div className="mt-3 flex min-h-14 items-center justify-between gap-3 px-1">
            <span className="text-lg">{plural(avulsoPessoas, "pessoa", "pessoas")}</span>
            <Passos valor={avulsoPessoas} min={1} max={21} aoMudar={setAvulsoPessoas} />
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void registrarAvulso()}
              disabled={avulsoNome.trim().length < 2 || enviandoAvulso}
              className={BOTAO_PRIMARIO}
            >
              {enviandoAvulso ? "Registrando…" : "Registrar entrada"}
            </button>
            <button type="button" onClick={() => setAvulsoAberto(false)} className={BOTAO_SECUNDARIO}>
              Voltar
            </button>
          </div>
        </Folha>
      )}
    </main>
  );
}

// ------------------------------------------------------------
// Peças
// ------------------------------------------------------------

const CAMPO =
  "min-h-12 rounded-lg border border-linha bg-white px-3 text-lg text-tinta placeholder:text-cinza focus:border-ameixa focus:outline-none focus:ring-2 focus:ring-ameixa/20";

const BOTAO_PRIMARIO =
  "min-h-14 w-full rounded-xl bg-ameixa px-4 text-lg font-medium text-white transition-colors motion-reduce:transition-none active:bg-[--ameixa-800] disabled:bg-linha disabled:text-cinza";

const BOTAO_SECUNDARIO =
  "min-h-12 shrink-0 rounded-xl border border-linha bg-white px-4 text-base text-tinta transition-colors motion-reduce:transition-none active:bg-nevoa";

/** Uma vez por turno: quem está na porta. Vai no livro como `operador`. */
function PerguntaOperador({
  posto,
  aoComecar,
}: {
  posto: PostoPublico;
  aoComecar: (nome: string) => void;
}) {
  const [nome, setNome] = useState("");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 bg-marfim px-5 pt-6 text-tinta">
      <div>
        <p className="text-sm text-cinza">{posto.evento_nome}</p>
        <p className="text-xl font-semibold">{posto.posto_nome}</p>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          aoComecar(nome);
        }}
      >
        <label htmlFor="operador" className="text-2xl font-semibold">
          Quem está na porta?
        </label>
        <input
          id="operador"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome"
          autoFocus
          autoComplete="name"
          maxLength={60}
          className={`${CAMPO} w-full`}
        />
        <button type="submit" disabled={!nome.trim()} className={BOTAO_PRIMARIO}>
          Abrir a lista
        </button>
      </form>
    </main>
  );
}

/** A folha que sobe de baixo: o grupo, o avulso. Toque fora fecha. */
function Folha({
  titulo,
  aoFechar,
  children,
}: {
  titulo: string;
  aoFechar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-tinta/40" onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-5 pb-8 pt-5"
      >
        <h2 className="text-2xl font-semibold leading-tight">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

/** Uma pessoa do grupo que ainda não entrou: toque marca, toque desmarca. */
function LinhaMarcavel({
  nome,
  detalhe,
  marcado,
  aoAlternar,
}: {
  nome: string;
  detalhe?: string;
  marcado: boolean;
  aoAlternar: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcado}
      onClick={aoAlternar}
      className="flex min-h-14 w-full items-center gap-3 px-1 text-left text-lg"
    >
      <span
        aria-hidden
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 ${
          marcado ? "border-ameixa bg-ameixa text-white" : "border-linha bg-white"
        }`}
      >
        {marcado ? "✓" : ""}
      </span>
      <span className="truncate">{nome}</span>
      {detalhe && <span className="shrink-0 text-sm text-cinza">{detalhe}</span>}
    </button>
  );
}

/** Menos / mais, com alvo de 44px em cada lado. */
function Passos({
  valor,
  min,
  max,
  aoMudar,
}: {
  valor: number;
  min: number;
  max: number;
  aoMudar: (v: number) => void;
}) {
  const botao =
    "flex h-11 w-11 items-center justify-center rounded-lg border border-linha bg-white text-2xl leading-none text-tinta active:bg-nevoa disabled:text-linha";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="menos"
        disabled={valor <= min}
        onClick={() => aoMudar(Math.max(min, valor - 1))}
        className={botao}
      >
        −
      </button>
      <span className="w-8 text-center text-lg tabular-nums">{valor}</span>
      <button
        type="button"
        aria-label="mais"
        disabled={valor >= max}
        onClick={() => aoMudar(Math.min(max, valor + 1))}
        className={botao}
      >
        +
      </button>
    </div>
  );
}
