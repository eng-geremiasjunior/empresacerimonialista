"use client";

// O convite pelo lado do casal.
//
// Três coisas separadas por natureza, na ordem em que a noiva pensa:
// o que ela escreve (texto), como fica (cores e presentes) e o que
// chega durante a festa (fotos, músicas e recados).
//
// Nada do texto vai ao ar sozinho — a cerimonialista publica. Os três
// blocos do convidado, esses sim, ligam e desligam na hora: são a
// festa acontecendo.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  decidirMusica,
  definirBlocos,
  ocultarFoto,
  ocultarRecado,
  salvarConviteCasal,
  salvarSiteCasal,
} from "@/app/(portal)/portal/[eventoId]/site/actions";
import { Cartao, Rotulo } from "./Nucleo";

const campoStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "10px 12px",
  fontSize: "var(--ts-item-desc)",
  fontFamily: "var(--fonte-corpo)",
  color: "var(--cor-texto)",
};

const botaoStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "10px 18px",
  minHeight: "var(--toque-min)",
  fontSize: "var(--ts-botao)",
  color: "var(--cor-texto-secundario)",
  cursor: "pointer",
  fontFamily: "var(--fonte-corpo)",
};

const notaStyle: React.CSSProperties = {
  fontSize: "var(--ts-item-desc)",
  color: "var(--cor-texto-suave)",
  marginTop: 10,
};

export type FotoModeracao = {
  id: string;
  url: string;
  autor: string | null;
  oculta: boolean;
};
export type MusicaModeracao = {
  id: string;
  titulo: string;
  artista: string | null;
  sugerida_por: string | null;
  estado: "sugerida" | "aprovada" | "vetada";
};
export type RecadoModeracao = {
  id: string;
  nome: string | null;
  texto: string;
  oculto: boolean;
};

export function EditorSiteCasal({
  eventoId,
  inicial,
  convite,
  blocos,
  publicado,
  urlSite,
  fotos,
  musicas,
  recados,
}: {
  eventoId: string;
  inicial: { mensagem: string; historia: string; dressCode: string };
  convite: {
    historiaTitulo: string;
    dressCodeTitulo: string;
    corAcento: string;
    corTinta: string;
    corFundo: string;
    presentesTexto: string;
    pixChave: string;
    pixTitular: string;
    presentesLink: string;
  };
  blocos: { album: boolean; playlist: boolean; recados: boolean };
  publicado: boolean;
  urlSite: string | null;
  fotos: FotoModeracao[];
  musicas: MusicaModeracao[];
  recados: RecadoModeracao[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [form, setForm] = useState(inicial);
  const [look, setLook] = useState(convite);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);

  function rodar(fn: () => Promise<{ error?: string }>, aviso?: string) {
    setErro(null);
    setSalvo(null);
    iniciar(async () => {
      const r = await fn();
      if (r.error) {
        setErro(r.error);
        return;
      }
      if (aviso) setSalvo(aviso);
      router.refresh();
    });
  }

  const avisoDePublicacao = publicado
    ? "Vai ao ar quando sua cerimonialista publicar a alteração."
    : "Vai ao ar quando sua cerimonialista publicar o site.";

  const sugeridas = musicas.filter((m) => m.estado === "sugerida");
  const aprovadas = musicas.filter((m) => m.estado === "aprovada");

  return (
    <>
      {publicado && urlSite && (
        <Cartao padding="var(--esp-5) var(--esp-6)">
          <p style={{ margin: 0, fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-secundario)" }}>
            O convite está no ar:{" "}
            <a href={urlSite} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cor-texto)" }}>
              {urlSite}
            </a>
          </p>
        </Cartao>
      )}

      {/* 1. o que vocês escrevem */}
      <Cartao padding="var(--esp-6)">
        <Rotulo>Mensagem aos convidados</Rotulo>
        <textarea
          style={campoStyle}
          rows={3}
          maxLength={2000}
          value={form.mensagem}
          onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
          placeholder="Uma frase de vocês — sai logo abaixo dos nomes."
        />

        <Rotulo style={{ marginTop: "var(--esp-5)" }}>Nossa história</Rotulo>
        <input
          style={campoStyle}
          maxLength={120}
          value={look.historiaTitulo}
          onChange={(e) => setLook({ ...look, historiaTitulo: e.target.value })}
          placeholder="Um título (ex.: Do mesmo mar, sete anos depois)"
        />
        <textarea
          style={{ ...campoStyle, marginTop: 8 }}
          rows={5}
          maxLength={4000}
          value={form.historia}
          onChange={(e) => setForm({ ...form, historia: e.target.value })}
          placeholder="Como vocês se conheceram, o pedido… do jeito de vocês."
        />

        <Rotulo style={{ marginTop: "var(--esp-5)" }}>O que vestir</Rotulo>
        <input
          style={campoStyle}
          maxLength={60}
          value={look.dressCodeTitulo}
          onChange={(e) => setLook({ ...look, dressCodeTitulo: e.target.value })}
          placeholder="Em duas palavras (ex.: Social completo)"
        />
        <textarea
          style={{ ...campoStyle, marginTop: 8 }}
          rows={2}
          maxLength={400}
          value={form.dressCode}
          onChange={(e) => setForm({ ...form, dressCode: e.target.value })}
          placeholder="O detalhe (ex.: cerimônia na grama — evitem salto fino)."
        />

        <p style={notaStyle}>{avisoDePublicacao}</p>
        <div style={{ marginTop: "var(--esp-4)" }}>
          <button
            type="button"
            style={botaoStyle}
            disabled={pendente}
            onClick={() =>
              rodar(async () => {
                const a = await salvarSiteCasal(eventoId, form);
                if (a.error) return a;
                return salvarConviteCasal(eventoId, look);
              }, "Salvo.")
            }
          >
            {pendente ? "Salvando…" : "Salvar textos"}
          </button>
        </div>
      </Cartao>

      {/* 2. como fica */}
      <Cartao padding="var(--esp-6)">
        <Rotulo>As cores do convite</Rotulo>
        <div style={{ display: "flex", gap: "var(--esp-4)", flexWrap: "wrap", marginTop: 8 }}>
          {[
            { k: "corAcento" as const, r: "Detalhes" },
            { k: "corTinta" as const, r: "Texto" },
            { k: "corFundo" as const, r: "Fundo" },
          ].map((c) => (
            <label key={c.k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="color"
                value={look[c.k] || (c.k === "corFundo" ? "#faf6f0" : c.k === "corTinta" ? "#3a342c" : "#b06b4a")}
                onChange={(e) => setLook({ ...look, [c.k]: e.target.value })}
                style={{ width: 42, height: 34, border: "none", background: "none", cursor: "pointer" }}
              />
              <span style={{ fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-secundario)" }}>
                {c.r}
              </span>
            </label>
          ))}
        </div>
        <p style={notaStyle}>
          Três cores desenham o convite inteiro. Se vocês não escolherem, ele
          usa as cores do guia de estilo.
        </p>

        <Rotulo style={{ marginTop: "var(--esp-6)" }}>Presentes</Rotulo>
        <textarea
          style={campoStyle}
          rows={2}
          maxLength={400}
          value={look.presentesTexto}
          onChange={(e) => setLook({ ...look, presentesTexto: e.target.value })}
          placeholder="Sua presença é o nosso maior presente. Se desejar nos presentear…"
        />
        <input
          style={{ ...campoStyle, marginTop: 8 }}
          maxLength={120}
          value={look.pixChave}
          onChange={(e) => setLook({ ...look, pixChave: e.target.value })}
          placeholder="Chave PIX"
        />
        <input
          style={{ ...campoStyle, marginTop: 8 }}
          maxLength={120}
          value={look.pixTitular}
          onChange={(e) => setLook({ ...look, pixTitular: e.target.value })}
          placeholder="Quem recebe (ex.: Lya Dias · Banco Inter)"
        />
        <input
          style={{ ...campoStyle, marginTop: 8 }}
          value={look.presentesLink}
          onChange={(e) => setLook({ ...look, presentesLink: e.target.value })}
          placeholder="Link da lista de presentes (opcional)"
        />
        <p style={notaStyle}>
          O convidado copia a chave e transfere direto para vocês — o dinheiro
          não passa por aqui.
        </p>

        <div style={{ marginTop: "var(--esp-4)" }}>
          <button
            type="button"
            style={botaoStyle}
            disabled={pendente}
            onClick={() => rodar(() => salvarConviteCasal(eventoId, look), "Salvo.")}
          >
            {pendente ? "Salvando…" : "Salvar cores e presentes"}
          </button>
        </div>
      </Cartao>

      {/* 3. o que os convidados mandam */}
      <Cartao padding="var(--esp-6)">
        <Rotulo>Durante a festa</Rotulo>
        <p style={{ ...notaStyle, marginTop: 4 }}>
          Ligue o que quiser receber. Isso vale na hora, sem precisar publicar
          de novo.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "var(--esp-4)" }}>
          {[
            { k: "album" as const, r: "Álbum — os convidados mandam fotos" },
            { k: "playlist" as const, r: "Música — eles sugerem o que tocar" },
            { k: "recados" as const, r: "Recados — o mural de mensagens" },
          ].map((b) => (
            <label key={b.k} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={blocos[b.k]}
                disabled={pendente}
                onChange={(e) => rodar(() => definirBlocos(eventoId, { [b.k]: e.target.checked }))}
              />
              <span style={{ fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-secundario)" }}>
                {b.r}
              </span>
            </label>
          ))}
        </div>
      </Cartao>

      {/* moderação: só aparece quando há o que moderar */}
      {fotos.length > 0 && (
        <Cartao padding="var(--esp-6)">
          <Rotulo>Fotos no álbum ({fotos.filter((f) => !f.oculta).length})</Rotulo>
          <p style={{ ...notaStyle, marginTop: 4 }}>
            Toque numa foto para tirá-la do convite. Ela some do álbum na hora.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
              gap: 8,
              marginTop: "var(--esp-4)",
            }}
          >
            {fotos.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={pendente}
                onClick={() => rodar(() => ocultarFoto(eventoId, f.id, !f.oculta))}
                title={f.oculta ? "Trazer de volta" : `Esconder${f.autor ? ` (de ${f.autor})` : ""}`}
                style={{
                  padding: 0,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  opacity: f.oculta ? 0.32 : 1,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt=""
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6 }}
                />
              </button>
            ))}
          </div>
        </Cartao>
      )}

      {musicas.length > 0 && (
        <Cartao padding="var(--esp-6)">
          <Rotulo>
            Músicas sugeridas ({sugeridas.length} para decidir · {aprovadas.length} na lista)
          </Rotulo>
          <div style={{ marginTop: "var(--esp-4)" }}>
            {musicas
              .filter((m) => m.estado !== "vetada")
              .map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderTop: "1px solid var(--cor-borda-linha)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "var(--ts-item-desc)", color: "var(--cor-texto)" }}>
                      {m.titulo}
                      {m.artista ? ` · ${m.artista}` : ""}
                    </p>
                    {m.sugerida_por && (
                      <p style={{ margin: 0, fontSize: "var(--ts-nota)", color: "var(--cor-texto-suave)" }}>
                        de {m.sugerida_por}
                      </p>
                    )}
                  </div>
                  {m.estado === "aprovada" ? (
                    <span style={{ fontSize: "var(--ts-nota)", color: "var(--cor-texto-suave)" }}>
                      vai para o DJ
                    </span>
                  ) : (
                    <button
                      type="button"
                      style={{ ...botaoStyle, padding: "6px 12px", minHeight: 0 }}
                      disabled={pendente}
                      onClick={() => rodar(() => decidirMusica(eventoId, m.id, "aprovada"))}
                    >
                      Quero
                    </button>
                  )}
                  <button
                    type="button"
                    style={{ ...botaoStyle, padding: "6px 12px", minHeight: 0, border: "none" }}
                    disabled={pendente}
                    onClick={() =>
                      rodar(() =>
                        decidirMusica(eventoId, m.id, m.estado === "aprovada" ? "sugerida" : "vetada")
                      )
                    }
                  >
                    {m.estado === "aprovada" ? "Tirar" : "Não"}
                  </button>
                </div>
              ))}
          </div>
        </Cartao>
      )}

      {recados.length > 0 && (
        <Cartao padding="var(--esp-6)">
          <Rotulo>Recados ({recados.filter((r) => !r.oculto).length})</Rotulo>
          <div style={{ marginTop: "var(--esp-4)" }}>
            {recados.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: "12px 0",
                  borderTop: "1px solid var(--cor-borda-linha)",
                  opacity: r.oculto ? 0.45 : 1,
                }}
              >
                <p style={{ margin: 0, fontSize: "var(--ts-item-desc)", color: "var(--cor-texto)" }}>
                  “{r.texto}”
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
                  <span style={{ fontSize: "var(--ts-nota)", color: "var(--cor-texto-suave)", flex: 1 }}>
                    {r.nome ?? "sem nome"}
                  </span>
                  <button
                    type="button"
                    style={{ ...botaoStyle, padding: "4px 10px", minHeight: 0, border: "none" }}
                    disabled={pendente}
                    onClick={() => rodar(() => ocultarRecado(eventoId, r.id, !r.oculto))}
                  >
                    {r.oculto ? "Mostrar" : "Esconder"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      {(erro || salvo) && (
        <Cartao padding="var(--esp-5) var(--esp-6)">
          <p
            style={{
              margin: 0,
              fontSize: "var(--ts-item-desc)",
              color: erro ? "var(--cor-atencao)" : "var(--cor-texto-suave)",
            }}
          >
            {erro ?? salvo}
          </p>
        </Cartao>
      )}
    </>
  );
}
