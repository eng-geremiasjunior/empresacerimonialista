"use client";

// A tela Inspirações do portal dos noivos (desenho v4, README §13;
// protótipo, template 612–625 e lógica 1095–1096): o cabeçalho e o
// mosaico de 4 colunas (linhas de 120px, fotos de 2 ou 3 linhas), com o
// comentário sobre a foto quando existe e o bloco tracejado no fim.
//
// Subir é o upload de sempre das referências (o da v2 e do guia de
// estilo): comprime no navegador, sobe direto para o balde privado na
// pasta do evento (a policy do balde decide) e registra a linha com
// registrarReferencia. Tirar é removerReferencia (linha e arquivo), só
// nas fotos que vieram da família.

import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirFoto } from "@/lib/portfolio";
import { ASSUNTO_ROTULO } from "@/lib/inspiracoes-shared";
import {
  registrarReferencia,
  removerReferencia,
} from "@/app/(portal)/portal/[eventoId]/guia-estilo/actions";
import { Eyebrow, Icone } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import type { FotoDoMural } from "./dados";
import "./inspiracoes.css";

/** As linhas de cada foto, na ordem do protótipo (lógica 1095), em ciclo. */
const LINHAS = [3, 2, 2, 3, 2, 2, 2];

/** O que o balde `inspiracoes` aceita (092): tipo e tamanho. */
const ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_BALDE = 8 * 1024 * 1024;
const MAX_ORIGINAL = 20 * 1024 * 1024;

function extensao(tipo: string): string {
  if (tipo === "image/jpeg") return "jpg";
  return tipo.split("/")[1] ?? "jpg";
}

export function TelaInspiracoes({
  fotos,
  autor,
  inicialDoCasal,
}: {
  fotos: FotoDoMural[];
  /** o nome de quem está com o portal aberto (autor das fotos que subir) */
  autor: string | null;
  /** a inicial do casal, para a legenda da família sem autor guardado */
  inicialDoCasal: string;
}) {
  const { eventoId, cerimonialista, avisar } = usePortalNoivos();
  const router = useRouter();
  const [atualizando, iniciar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);
  const profundidade = useRef(0);
  const [enviando, setEnviando] = useState<{ feitas: number; total: number } | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [tiradas, setTiradas] = useState<string[]>([]);
  const [confirmaTirar, setConfirmaTirar] = useState<string | null>(null);

  // dados novos do servidor: o otimista já não faz falta
  useEffect(() => {
    setTiradas([]);
  }, [fotos]);

  // "Tirar?" volta a ser o × se ninguém confirmar
  useEffect(() => {
    if (!confirmaTirar) return;
    const t = setTimeout(() => setConfirmaTirar(null), 4000);
    return () => clearTimeout(t);
  }, [confirmaTirar]);

  const ocupado = enviando !== null || atualizando;
  const visiveis = fotos.filter((f) => !tiradas.includes(f.id));

  async function subir(lista: File[]) {
    if (ocupado || lista.length === 0) return;
    const supabase = createClient();
    let guardadas = 0;
    let erro: string | null = null;
    setEnviando({ feitas: 0, total: lista.length });
    try {
      for (let i = 0; i < lista.length; i += 1) {
        const file = lista[i];
        setEnviando({ feitas: i, total: lista.length });
        if (!file.type.startsWith("image/")) {
          erro = "Só fotos entram no mural.";
          continue;
        }
        if (file.size > MAX_ORIGINAL) {
          erro = "Essa foto passa de 20 MB.";
          continue;
        }
        const corpo = await comprimirFoto(file);
        const tipo = corpo !== file ? "image/jpeg" : file.type;
        if (!ACEITOS.includes(tipo)) {
          erro = "Usem fotos em JPG, PNG, WEBP ou HEIC.";
          continue;
        }
        if (corpo.size > MAX_BALDE) {
          erro = "Essa foto passa de 8 MB.";
          continue;
        }
        // o caminho começa pelo evento: é o que a policy do balde lê
        const path = `${eventoId}/ref-${crypto.randomUUID()}.${extensao(tipo)}`;
        const { error } = await supabase.storage
          .from("inspiracoes")
          .upload(path, corpo, { contentType: tipo, upsert: false });
        if (error) {
          erro = "Não foi possível enviar a foto.";
          continue;
        }
        const r = await registrarReferencia(eventoId, path, "geral", "", autor ?? "");
        if ("error" in r) {
          erro = r.error;
          // sem a linha, o arquivo ficaria órfão no balde
          await supabase.storage.from("inspiracoes").remove([path]);
          continue;
        }
        guardadas += 1;
      }
    } finally {
      setEnviando(null);
      if (entrada.current) entrada.current.value = "";
    }
    if (guardadas > 0) iniciar(() => router.refresh());
    if (erro) avisar(erro, true);
    else if (guardadas > 0) avisar(guardadas === 1 ? "Foto guardada no mural" : `${guardadas} fotos guardadas no mural`);
  }

  async function tirar(f: FotoDoMural) {
    setConfirmaTirar(null);
    setTiradas((t) => [...t, f.id]);
    const r = await removerReferencia(eventoId, f.id, f.path);
    if ("error" in r) {
      setTiradas((t) => t.filter((x) => x !== f.id));
      avisar(r.error, true);
      return;
    }
    avisar("Foto tirada do mural");
    router.refresh();
  }

  // arrastar fotos para qualquer ponto do mural
  const temArquivo = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  function aoEntrar(e: DragEvent) {
    if (!temArquivo(e)) return;
    e.preventDefault();
    profundidade.current += 1;
    setArrastando(true);
  }
  function aoPassar(e: DragEvent) {
    if (!temArquivo(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = ocupado ? "none" : "copy";
  }
  function aoSair(e: DragEvent) {
    if (!temArquivo(e)) return;
    profundidade.current = Math.max(0, profundidade.current - 1);
    if (profundidade.current === 0) setArrastando(false);
  }
  function aoSoltar(e: DragEvent) {
    if (!temArquivo(e)) return;
    e.preventDefault();
    profundidade.current = 0;
    setArrastando(false);
    void subir(Array.from(e.dataTransfer.files));
  }

  return (
    <section className="pn-inspiracoes" aria-labelledby="pn-inspiracoes-titulo">
      <div className="pn-inspiracoes-cabeca">
        <div>
          <Eyebrow>Inspirações</Eyebrow>
          <h1 id="pn-inspiracoes-titulo" className="pn-t pn-inspiracoes-titulo">
            O mural de vocês
          </h1>
          <div className="pn-inspiracoes-sub">
            Salvem fotos do que gostam.
            {cerimonialista ? ` ${cerimonialista} usa como referência com os fornecedores.` : ""}
          </div>
        </div>
      </div>

      <div
        className="pn-inspiracoes-mural"
        onDragEnter={aoEntrar}
        onDragOver={aoPassar}
        onDragLeave={aoSair}
        onDrop={aoSoltar}
      >
        {visiveis.map((f, i) => {
          const rotulo = f.assunto !== "geral" ? ASSUNTO_ROTULO[f.assunto] ?? "Inspiração" : "Inspiração";
          const inicial = f.daEquipe
            ? f.inicial ?? cerimonialista?.charAt(0).toUpperCase() ?? "•"
            : f.inicial ?? inicialDoCasal;
          const confirmando = confirmaTirar === f.id;
          return (
            <div
              key={f.id}
              className="pn-inspiracoes-foto"
              style={{ gridRow: `span ${LINHAS[i % LINHAS.length]}` }}
              title={f.legenda ?? undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.legenda ?? rotulo} loading="lazy" decoding="async" />
              {f.legenda && (
                <div className="pn-inspiracoes-nota">
                  <div className={`pn-t pn-inspiracoes-quem${f.daEquipe ? "" : " casal"}`}>{inicial}</div>
                  <div className="pn-inspiracoes-nota-texto">{f.legenda}</div>
                </div>
              )}
              {!f.daEquipe && (
                <button
                  type="button"
                  className={`pn-inspiracoes-tirar${confirmando ? " confirmar" : ""}`}
                  aria-label={confirmando ? "Confirmar: tirar a foto do mural" : "Tirar a foto do mural"}
                  onClick={() => (confirmando ? void tirar(f) : setConfirmaTirar(f.id))}
                >
                  <span>{confirmando ? "Tirar?" : <Icone nome="close" tamanho={18} />}</span>
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className={`pn-inspiracoes-add${arrastando ? " arrastando" : ""}`}
          onClick={() => entrada.current?.click()}
          disabled={ocupado}
          aria-busy={ocupado}
        >
          {ocupado ? (
            <>
              <span className="pn-inspiracoes-giro" aria-hidden="true" />
              {enviando && enviando.total > 1 ? `Enviando ${enviando.feitas + 1} de ${enviando.total}…` : "Enviando…"}
            </>
          ) : (
            <>
              <Icone nome="add_photo_alternate" tamanho={30} />
              <span className="arraste">Arraste uma foto nos espaços</span>
              <span className="toque">Toque para adicionar uma foto</span>
            </>
          )}
        </button>
        <input
          ref={entrada}
          type="file"
          accept={ACEITOS.join(",")}
          multiple
          hidden
          onChange={(e) => void subir(Array.from(e.target.files ?? []))}
        />
      </div>
    </section>
  );
}
