"use client";

// O mural: as imagens que a cliente junta quando a palavra não dá conta.
// Agrupadas por assunto, porque é assim que a conversa acontece —
// "flores", "bolo", "vestido" — não por data de envio.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ASSUNTOS,
  ASSUNTO_ROTULO,
  type Inspiracao,
} from "@/lib/inspiracoes-shared";
import {
  registrarInspiracao,
  removerInspiracao,
} from "@/app/(portal)/portal/[eventoId]/inspiracoes/actions";
import { Cartao, Rotulo } from "./Nucleo";

const campoStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "10px 12px",
  minHeight: "var(--toque-min)",
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
  padding: "9px 14px",
  minHeight: "var(--toque-min)",
  fontSize: "var(--ts-botao)",
  color: "var(--cor-texto-secundario)",
  cursor: "pointer",
  fontFamily: "var(--fonte-corpo)",
};

export function MuralInspiracoes({
  eventoId,
  imagens,
}: {
  eventoId: string;
  imagens: Inspiracao[];
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [assunto, setAssunto] = useState<string>("geral");
  const [legenda, setLegenda] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [removendo, iniciarRemocao] = useTransition();

  async function subir(file: File) {
    setErro(null);
    setEnviando(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      // o caminho começa pelo evento: é o que a policy do bucket lê
      const path = `${eventoId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("inspiracoes")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setErro("Não foi possível enviar a imagem.");
        return;
      }

      const r = await registrarInspiracao(eventoId, path, assunto, legenda);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setLegenda("");
      router.refresh();
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  const grupos = ASSUNTOS.map((a) => ({
    assunto: a,
    lista: imagens.filter((i) => i.assunto === a),
  })).filter((g) => g.lista.length > 0);

  return (
    <>
      <Cartao padding="var(--esp-6)">
        <Rotulo>Guardar uma imagem</Rotulo>
        <div className="portal-grade-2">
          <select
            style={campoStyle}
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
          >
            {ASSUNTOS.map((a) => (
              <option key={a} value={a}>
                {ASSUNTO_ROTULO[a]}
              </option>
            ))}
          </select>
          <input
            style={campoStyle}
            placeholder="O que vocês gostaram nela (opcional)"
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
          />
        </div>
        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) subir(f);
          }}
        />
        <button
          type="button"
          style={{ ...botaoStyle, alignSelf: "flex-start", minWidth: 200 }}
          disabled={enviando}
          onClick={() => entrada.current?.click()}
        >
          {enviando ? "Enviando…" : "Escolher imagem"}
        </button>
        {erro && (
          <p style={{ margin: 0, fontSize: "var(--ts-desc)", color: "var(--cor-atencao)" }}>
            {erro}
          </p>
        )}
      </Cartao>

      {grupos.length === 0 ? (
        <Cartao padding="var(--esp-6)">
          <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
            Guardem aqui o que forem encontrando. A sua cerimonialista vê tudo
            e usa nas conversas com os fornecedores.
          </p>
        </Cartao>
      ) : (
        grupos.map((g) => (
          <Cartao key={g.assunto} padding="var(--esp-6) var(--esp-8)">
            <Rotulo>{ASSUNTO_ROTULO[g.assunto]}</Rotulo>
            <div className="portal-grade-imagens">
              {g.lista.map((i) => (
                <figure key={i.id} style={{ margin: 0 }}>
                  {i.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.url}
                      alt={i.legenda ?? ""}
                      style={{
                        width: "100%",
                        aspectRatio: "3 / 4",
                        objectFit: "cover",
                        borderRadius: "var(--raio-botao)",
                        display: "block",
                      }}
                    />
                  )}
                  {i.legenda && (
                    <figcaption
                      style={{
                        marginTop: "var(--esp-2)",
                        fontSize: "var(--ts-desc)",
                        color: "var(--cor-texto-suave)",
                      }}
                    >
                      {i.legenda}
                    </figcaption>
                  )}
                  {i.origem === "cliente" && (
                    <button
                      type="button"
                      disabled={removendo}
                      onClick={() =>
                        iniciarRemocao(async () => {
                          await removerInspiracao(eventoId, i.id, i.storagePath);
                          router.refresh();
                        })
                      }
                      style={{
                        marginTop: "var(--esp-2)",
                        border: "none",
                        background: "none",
                        padding: 0,
                        fontSize: "var(--ts-desc)",
                        color: "var(--cor-texto-suave)",
                        cursor: "pointer",
                        fontFamily: "var(--fonte-corpo)",
                        textDecoration: "underline",
                        textUnderlineOffset: 3,
                      }}
                    >
                      remover
                    </button>
                  )}
                </figure>
              ))}
            </div>
          </Cartao>
        ))
      )}
    </>
  );
}
