"use client";

// Os três blocos que o convidado alimenta durante a festa: o álbum, a
// playlist e o mural de recados. Cada um fala com uma função do banco
// que tem o hash do evento como credencial — nenhuma tabela é aberta.
//
// O álbum sobe pelo mesmo caminho do contrato do fornecedor: a rota
// confere o hash e devolve um token para UM arquivo; o navegador manda
// direto para o Storage. Antes disso, comprime — 300 convidados × foto
// de celular é a primeira feature cujo custo cresce com gente de fora.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_LADO = 1600;
const QUALIDADE = 0.82;
const MAX_ORIGINAL = 25 * 1024 * 1024;

async function comprimir(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALIDADE)
  );
  return blob ?? file;
}

export function AlbumDoConvite({
  hash,
  fotos,
}: {
  hash: string;
  fotos: { url: string; autor: string | null }[];
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviadas, setEnviadas] = useState(0);
  const [autor, setAutor] = useState("");

  async function subir(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    setErro(null);
    setEnviando(true);
    let ok = 0;
    try {
      for (const file of Array.from(lista).slice(0, 10)) {
        if (file.size > MAX_ORIGINAL) continue;
        const blob = await comprimir(file);

        const permissao = await fetch(`/api/album/${hash}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ autor: autor.trim() || null }),
        }).then((r) => r.json());

        if (!permissao?.ok) {
          setErro(
            permissao?.erro === "cheio"
              ? "O álbum está cheio — mostre a foto ao casal por outro caminho."
              : permissao?.erro === "muitas_tentativas"
                ? "Muitas fotos seguidas. Aguarde um minuto."
                : "Não deu para enviar agora."
          );
          break;
        }

        const supabase = createClient();
        const envio = await supabase.storage
          .from("album")
          .uploadToSignedUrl(permissao.caminho, permissao.token, blob, {
            contentType: "image/jpeg",
          });
        if (envio.error) {
          setErro("Não deu para enviar a foto. Tente de novo.");
          break;
        }

        const registro = await fetch(`/api/album/${hash}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caminho: permissao.caminho, autor: autor.trim() || null }),
        }).then((r) => r.json());
        if (registro?.ok) ok += 1;
      }
    } catch {
      setErro("Não deu para enviar agora.");
    }
    setEnviando(false);
    setEnviadas((n) => n + ok);
  }

  return (
    <section className="cv-album">
      <div className="cv-eyebrow">Álbum da festa</div>
      <h2 className="cv-titulo">As fotos de quem esteve aqui</h2>

      <div className="cv-album-envio">
        <input
          className="cv-campo"
          style={{ maxWidth: 320, margin: "0 auto 16px", textAlign: "center" }}
          placeholder="Seu nome (opcional)"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
        />
        <label className="cv-botao" style={{ display: "inline-block", cursor: "pointer" }}>
          {enviando ? "Enviando…" : "Enviar minhas fotos"}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={enviando}
            onChange={(e) => subir(e.target.files)}
          />
        </label>
        {enviadas > 0 && (
          <p className="cv-nota">
            {enviadas === 1 ? "Foto enviada" : `${enviadas} fotos enviadas`}. Obrigado!
          </p>
        )}
        {erro && <p className="cv-erro">{erro}</p>}
      </div>

      {fotos.length > 0 ? (
        <div className="cv-album-grade">
          {fotos.map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={f.url}
              alt={f.autor ? `Foto de ${f.autor}` : "Foto da festa"}
              className="cv-album-foto"
              loading="lazy"
            />
          ))}
        </div>
      ) : (
        <p className="cv-album-vazio">
          Ainda não há fotos. Seja o primeiro — as suas aparecem aqui na hora.
        </p>
      )}
    </section>
  );
}

export function MusicaDoConvite({ hash }: { hash: string }) {
  const [titulo, setTitulo] = useState("");
  const [artista, setArtista] = useState("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    if (!titulo.trim()) return;
    setEnviando(true);
    setErro(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("sugerir_musica", {
      p_hash: hash,
      p_titulo: titulo,
      p_artista: artista || null,
      p_nome: nome || null,
    });
    setEnviando(false);
    const r = data as { ok?: boolean; erro?: string } | null;
    if (error || !r?.ok) {
      setErro(
        r?.erro === "cheio"
          ? "A lista está cheia."
          : "Não deu para enviar agora. Tente de novo."
      );
      return;
    }
    setTitulo("");
    setArtista("");
    setPronto(true);
  }

  return (
    <section className="cv-musica">
      <div className="cv-eyebrow">Pista</div>
      <h2 className="cv-titulo">Qual música não pode faltar?</h2>
      <p className="cv-nota">O casal escolhe as que vão para o DJ.</p>

      <div className="cv-musica-form">
        <input
          className="cv-campo"
          placeholder="Nome da música"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <input
          className="cv-campo"
          placeholder="Artista (opcional)"
          value={artista}
          onChange={(e) => setArtista(e.target.value)}
        />
      </div>
      <input
        className="cv-campo"
        style={{ marginTop: 14 }}
        placeholder="Seu nome (opcional)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
      {erro && <p className="cv-erro">{erro}</p>}
      {pronto && !erro && <p className="cv-nota">Anotada! Pode sugerir outra.</p>}
      <button
        type="button"
        className="cv-botao"
        style={{ marginTop: 20 }}
        onClick={enviar}
        disabled={enviando || !titulo.trim()}
      >
        {enviando ? "Enviando…" : "Sugerir música"}
      </button>
    </section>
  );
}

export function RecadosDoConvite({
  hash,
  recados,
}: {
  hash: string;
  recados: { nome: string | null; texto: string }[];
}) {
  const [nome, setNome] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    setErro(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("deixar_recado", {
      p_hash: hash,
      p_nome: nome || null,
      p_texto: texto,
    });
    setEnviando(false);
    const r = data as { ok?: boolean } | null;
    if (error || !r?.ok) {
      setErro("Não deu para enviar agora. Tente de novo.");
      return;
    }
    setTexto("");
    setPronto(true);
  }

  return (
    <section className="cv-escuro">
      <div className="cv-eyebrow">Recados</div>
      <h2 className="cv-escuro-titulo">Deixe uma palavra para nós</h2>

      <div style={{ maxWidth: 560, margin: "30px auto 0" }}>
        <input
          className="cv-campo"
          style={{ color: "var(--cv-fundo)", borderBottomColor: "rgba(255,255,255,.25)" }}
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <textarea
          className="cv-campo"
          style={{
            color: "var(--cv-fundo)",
            borderBottomColor: "rgba(255,255,255,.25)",
            marginTop: 12,
            resize: "vertical",
          }}
          rows={3}
          placeholder="Seu recado"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {erro && <p className="cv-erro">{erro}</p>}
        {pronto && !erro && (
          <p className="cv-escuro-texto" style={{ marginTop: 12 }}>
            Recebido — obrigado!
          </p>
        )}
        <button
          type="button"
          className="cv-botao"
          style={{ marginTop: 18 }}
          onClick={enviar}
          disabled={enviando || !texto.trim()}
        >
          {enviando ? "Enviando…" : "Enviar recado"}
        </button>
      </div>

      {recados.length > 0 && (
        <div style={{ maxWidth: 620, margin: "44px auto 0", textAlign: "left" }}>
          {recados.map((r, i) => (
            <div key={i} style={{ padding: "18px 0", borderTop: "1px solid rgba(255,255,255,.12)" }}>
              <p className="cv-escuro-texto" style={{ margin: 0, maxWidth: "none" }}>
                “{r.texto}”
              </p>
              {r.nome && (
                <p className="cv-eyebrow" style={{ marginTop: 8 }}>
                  {r.nome}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
