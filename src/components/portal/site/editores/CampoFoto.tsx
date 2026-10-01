"use client";

// Um espaço de foto do modelo no editor: o EspacoDeFoto em modo prévia,
// que vira o botão de envio.
//
// Tocar → escolher a foto → comprimirFoto (1600 px, 0,82, o mesmo do
// portfólio e do álbum) → pedirEnvio(eventoId), a server action que
// confere o nível e o teto e devolve a URL de envio assinada para
// {evento}/{uuid}.jpg → uploadToSignedUrl no balde 'site' → onChange com
// o caminho. "Trocar" e "Tirar" só mudam o caminho no rascunho: o arquivo
// antigo fica, porque pode estar na versão que está no ar (o balde não
// tem update nem delete).
//
// A foto recém-enviada ainda não tem URL assinada (quem assina é o
// servidor, no próximo carregamento): até lá ela aparece pela URL local
// do próprio arquivo, guardada em fotosEnviadas — a prévia do site pode
// juntar esse mapa às urls (useFotosEnviadas).
//
// Sem pedirEnvio, o espaço só mostra: nenhum botão que finge.

import { createContext, useContext, useRef, useState, useSyncExternalStore } from "react";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { ContextoDoSite } from "@/components/site/pecas/contexto";
import { comprimirFoto, validarArquivo } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/client";
import { MODELOS, PROPORCAO_TELA, type EspacoDeFoto as Espaco, type FormaDoEspaco, type ModeloId } from "@/lib/site-modelos";
import { botaoLeve, nota } from "./pecas";

export type ResultadoDoPedidoDeEnvio = { ok: true; caminho: string; token: string } | { ok: false; erro: string };
export type PedirEnvio = (eventoId: string) => Promise<ResultadoDoPedidoDeEnvio>;

/** o teto do balde 'site' (191) */
const TETO_BYTES = 3 * 1024 * 1024;
const TIPOS_DO_BALDE = ["image/jpeg", "image/webp"];

// ------------------------------------------------ as fotos recém-enviadas

const locais = new Map<string, string>();
let retrato: Record<string, string> = {};
const ouvintes = new Set<() => void>();

function guardarLocal(caminho: string, blob: Blob) {
  locais.set(caminho, URL.createObjectURL(blob));
  retrato = Object.fromEntries(locais);
  ouvintes.forEach((f) => f());
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

const VAZIO: Record<string, string> = {};

/** caminho → URL local das fotos enviadas nesta aba (para a prévia
 *  mostrar antes da URL assinada chegar) */
export function useFotosEnviadas(): Record<string, string> {
  return useSyncExternalStore(
    assinar,
    () => retrato,
    () => VAZIO
  );
}

// ------------------------------------------------ o teto da estrutura

/** Quantas fotos ainda cabem no site (a 191 aceita 60 na estrutura
 *  inteira). Em zero, o espaço vazio não envia: acrescentar seria recusado
 *  no Salvar. Trocar continua (não muda a conta). Sem Provider, sem teto. */
export const CabemFotos = createContext<number>(Number.POSITIVE_INFINITY);

const SEM_LUGAR = "O site já tem 60 fotos.";

// ------------------------------------------------ a forma de cada espaço

const PADRAO: Espaco = { forma: "retangulo", proporcao: "4/3" };

/** O espaço n do bloco no desenho do modelo (os que se repetem voltam ao
 *  começo); fora dos modelos novos, um retângulo 4/3. */
export function espacoDoModelo(modelo: ModeloId, tipo: string, n = 0): Espaco {
  if (modelo === "convite") return PADRAO;
  const lista = MODELOS[modelo].espacos[tipo];
  if (!lista || lista.length === 0) return PADRAO;
  return lista[n % lista.length];
}

/** O espaço de cada item é por item (marco, presente, par) no desenho? */
export function temFotoPorItem(modelo: ModeloId, tipo: string): boolean {
  if (modelo === "convite") return true;
  return MODELOS[modelo].espacos[tipo]?.some((e) => e.porItem) ?? false;
}

// ------------------------------------------------------------- o campo

export function CampoFoto({
  caminho,
  onChange,
  eventoId,
  urls,
  modelo = "convite",
  forma,
  proporcao,
  pedirEnvio,
  desabilitado,
  rotulo = "a foto",
  largura = 240,
  vazioSome,
  semTirar,
}: {
  caminho: string | null;
  /** o caminho novo; null = tirar */
  onChange: (caminho: string | null) => void;
  eventoId: string;
  /** caminho → URL assinada (MidiaDoSite.urls) */
  urls: Record<string, string>;
  modelo?: ModeloId;
  forma: FormaDoEspaco;
  proporcao: string;
  pedirEnvio?: PedirEnvio;
  desabilitado?: boolean;
  /** para o leitor de tela: "a foto da capa", "a foto 3" */
  rotulo?: string;
  /** largura máxima do espaço no editor, em px */
  largura?: number;
  /** o espaço vazio que só serve para acrescentar some sem envio */
  vazioSome?: boolean;
  /** nas listas de fotos, tirar é com o X do item */
  semTirar?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const enviadas = useFotosEnviadas();
  const cabem = useContext(CabemFotos);
  const semLugar = !caminho && cabem <= 0;
  // o envio demora: na volta, vale o onChange da tela de AGORA (com o que
  // foi digitado enquanto a foto subia), não o do toque
  const aoMudar = useRef(onChange);
  aoMudar.current = onChange;

  const podeEnviar = !!pedirEnvio && !desabilitado && !enviando && !semLugar;
  const url = caminho ? enviadas[caminho] ?? urls[caminho] ?? null : null;

  if (!caminho && vazioSome && !pedirEnvio) return null;
  if (vazioSome && semLugar && !enviando) return <p style={nota}>{SEM_LUGAR}</p>;

  async function enviar(arquivo: File) {
    if (!pedirEnvio) return;
    setErro(null);
    const invalido = validarArquivo(arquivo);
    if (invalido) {
      setErro(`Essa foto não serve: ${invalido}.`);
      return;
    }
    setEnviando(true);
    try {
      const blob = await comprimirFoto(arquivo);
      if (!TIPOS_DO_BALDE.includes(blob.type)) {
        setErro("Use uma foto em JPG.");
        return;
      }
      if (blob.size > TETO_BYTES) {
        setErro("A foto passou de 3 MB. Tente outra.");
        return;
      }
      const pedido = await pedirEnvio(eventoId);
      if (!pedido.ok) {
        setErro(pedido.erro || "Não deu para enviar agora.");
        return;
      }
      const envio = await createClient()
        .storage.from("site")
        .uploadToSignedUrl(pedido.caminho, pedido.token, blob, { contentType: blob.type });
      if (envio.error) {
        setErro("Não deu para enviar a foto. Tente de novo.");
        return;
      }
      guardarLocal(pedido.caminho, blob);
      aoMudar.current(pedido.caminho);
    } catch {
      setErro("Não deu para enviar agora.");
    } finally {
      setEnviando(false);
    }
  }

  const escolher = () => {
    if (podeEnviar) entrada.current?.click();
  };

  // "tela" é do contêiner do modelo; no editor, retrato de celular
  const proporcaoNoEditor = proporcao === PROPORCAO_TELA ? "3/4" : proporcao;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", maxWidth: largura }}>
      <ContextoDoSite.Provider value={{ modo: "previa", modelo, urls }}>
        <div
          style={{
            color: "var(--cor-texto-suave)",
            fontSize: "var(--ts-nota)",
            opacity: enviando ? 0.5 : 1,
          }}
        >
          {caminho && !url ? (
            // guardada, mas sem URL nesta tela (chega no próximo carregamento)
            <div
              className={`sm-foto sm-foto--${forma} sm-foto-vazia`}
              style={{ aspectRatio: proporcaoNoEditor.replace("/", " / ") }}
            >
              Foto guardada
            </div>
          ) : (
            <EspacoDeFoto
              caminho={caminho}
              url={url}
              forma={forma}
              proporcao={proporcaoNoEditor}
              alt=""
              aoTocar={podeEnviar && !caminho ? escolher : undefined}
            />
          )}
        </div>
      </ContextoDoSite.Provider>

      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/webp,image/png,image/heic,image/heif"
        hidden
        aria-label={`Escolher ${rotulo}`}
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = "";
          if (arquivo) void enviar(arquivo);
        }}
      />

      {enviando ? (
        <p style={nota}>Enviando…</p>
      ) : caminho ? (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {pedirEnvio && (
            <button type="button" style={botaoLeve} disabled={!podeEnviar} onClick={escolher} aria-label={`Trocar ${rotulo}`}>
              Trocar
            </button>
          )}
          {!semTirar && (
            <button
              type="button"
              style={botaoLeve}
              disabled={desabilitado}
              onClick={() => onChange(null)}
              aria-label={`Tirar ${rotulo}`}
            >
              Tirar
            </button>
          )}
        </div>
      ) : null}
      {semLugar && pedirEnvio && !enviando && <p style={nota}>{SEM_LUGAR}</p>}
      {erro && <p style={{ ...nota, color: "var(--cor-atencao)" }}>{erro}</p>}
    </div>
  );
}
