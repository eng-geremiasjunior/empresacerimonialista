"use client";

// "A cara da festa" (desenho v2): a cor da festa, o topo do Início (com o
// retrato) e o fundo do portal. Cada toque vale na hora, na tela, e é
// gravado em seguida (176); o nome de quem mudou volta do banco.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  FUNDOS,
  PALETAS,
  tokensDaCor,
  type EstiloDoPortal,
  type Fundo,
} from "@/lib/cor-da-festa";
import { salvarEstilo, type MudancaDeEstilo } from "@/app/(portal)/portal/[eventoId]/estilo-actions";

const PREVIA: Record<Fundo, string> = {
  festa: "radial-gradient(90% 60% at 20% 0%,var(--destaque),transparent 70%),linear-gradient(180deg,var(--destaque-fundo),#f7f3ed)",
  seda: "radial-gradient(70% 50% at 10% 10%,var(--destaque),transparent 70%),radial-gradient(70% 60% at 100% 40%,var(--destaque-linha),transparent 70%),#fbf7f1",
  noite: "radial-gradient(14px 14px at 72% 18%,#fffaf0 60%,transparent 70%),linear-gradient(180deg,var(--destaque-profundo),var(--destaque-profundo) 55%,#f7f3ed)",
  jardim: "radial-gradient(circle at 50% 100%,transparent 16px,var(--destaque-linha) 17px 18px,transparent 19px) 0 0/38px 30px,#f9f5ee",
  papel: "linear-gradient(#f8f4ec,#f8f4ec) padding-box,linear-gradient(var(--destaque-linha),var(--destaque-linha)) border-box",
};

const rotulo = {
  fontSize: 11,
  letterSpacing: ".09em",
  textTransform: "uppercase" as const,
  color: "#776d60",
};

function haQuanto(iso: string | null): string {
  if (!iso) return "";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

export function FolhaCaraDaFesta({
  eventoId,
  estilo,
  pessoa,
  aoMudar,
  aoFechar,
}: {
  eventoId: string;
  estilo: EstiloDoPortal;
  pessoa: string | null;
  aoMudar: (novo: EstiloDoPortal) => void;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const deQuem = pessoa ? `da ${pessoa}` : "dela";

  function gravar(novo: EstiloDoPortal, m: MudancaDeEstilo) {
    setErro(null);
    aoMudar(novo);
    iniciar(async () => {
      const r = await salvarEstilo(eventoId, m);
      if ("error" in r) setErro(r.error);
      else router.refresh();
    });
  }

  async function subirRetrato(file: File) {
    setErro(null);
    setEnviando(true);
    try {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${eventoId}/retrato-${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient()
        .storage.from("inspiracoes")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setErro("Não foi possível enviar a foto.");
        return;
      }
      const r = await salvarEstilo(eventoId, { retratoPath: path, topo: "retrato" });
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      aoMudar({ ...estilo, topo: "retrato", retratoPath: path, retratoUrl: URL.createObjectURL(file) });
      router.refresh();
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  const autor = estilo.autor ? `${estilo.autor.split(" ")[0]} escolheu · ${haQuanto(estilo.atualizadoEm)}` : null;

  return (
    <>
      <div className="pv2-veu" onClick={aoFechar} aria-hidden />
      <div className="pv2-folha" role="dialog" aria-label="A cara da festa" style={{ padding: "22px 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--pv2-titulo)", fontSize: 26, color: "#332b24" }}>A cara da festa</div>
            {autor && <div style={{ fontSize: 13, color: "#4c443c" }}>{autor}</div>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            style={{ height: 44, padding: "0 14px", border: 0, borderRadius: 22, background: "var(--destaque-texto)", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            Pronto
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "14px 6px" }}>
          {PALETAS.map((p) => {
            const on = estilo.cor.h === p.h && estilo.cor.l === p.l && estilo.cor.c === p.c;
            const base = tokensDaCor(p)["--destaque"];
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const cor = { nome: p.nome, l: p.l, c: p.c, h: p.h };
                  gravar({ ...estilo, cor }, { cor });
                }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minHeight: 72, border: 0, background: "none", cursor: "pointer" }}
              >
                <span
                  style={{
                    width: 46, height: 46, borderRadius: "50%", background: base, transition: "box-shadow .3s",
                    boxShadow: on ? `0 0 0 3px #fdfbf7,0 0 0 5px ${base}` : "inset 0 0 0 1px rgba(0,0,0,.06)",
                  }}
                />
                <span style={{ fontSize: 11.5, lineHeight: 1.2, color: "#3a312a", fontWeight: on ? 600 : 400 }}>{p.nome}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={rotulo}>Topo do Início</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(
              [
                ["padrao", "Padrão", "o topo com a luz do fundo"],
                ["retrato", `Retrato ${deQuem}`, "a foto dela abre o portal"],
              ] as const
            ).map(([id, rot, sub]) => {
              const on = estilo.topo === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => gravar({ ...estilo, topo: id }, { topo: id })}
                  style={{
                    minHeight: 60, padding: "10px 12px", border: 0, borderRadius: 16, textAlign: "left", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 2, transition: "background .3s",
                    background: on ? "var(--destaque-texto)" : "#fff", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: on ? "#fff" : "#3a312a" }}>{rot}</span>
                  <span style={{ fontSize: 12, color: on ? "rgba(255,255,255,.8)" : "#776d60" }}>{sub}</span>
                </button>
              );
            })}
          </div>
          {estilo.topo === "retrato" && (
            <button
              type="button"
              onClick={() => entrada.current?.click()}
              disabled={enviando}
              style={{
                position: "relative", height: 180, borderRadius: 16, overflow: "hidden", cursor: "pointer",
                border: 0, padding: 0, boxShadow: "inset 0 0 0 1.5px var(--destaque-linha)",
                background: estilo.retratoUrl ? "#221e1b" : "var(--destaque-fundo)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {estilo.retratoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={estilo.retratoUrl} alt={`Retrato ${deQuem}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
              <span
                style={{
                  position: "relative", minHeight: 40, padding: "0 16px", display: "flex", alignItems: "center",
                  borderRadius: 20, background: "rgba(255,255,255,.88)", fontSize: 14, color: "var(--destaque-texto)",
                }}
              >
                {enviando ? "Enviando…" : estilo.retratoUrl ? "Trocar a foto" : `Escolher a foto ${deQuem}`}
              </span>
            </button>
          )}
          {estilo.retratoPath && (
            // o convite sai para fora da família: quem liga é o responsável
            // (a 180 ignora o toque da debutante)
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, fontSize: 14, color: "#332b24", cursor: "pointer" }}>
              Usar a foto no convite dos convidados
              <input
                type="checkbox"
                checked={estilo.retratoNoConvite}
                onChange={(e) => gravar({ ...estilo, retratoNoConvite: e.target.checked }, { retratoNoConvite: e.target.checked })}
                style={{ width: 22, height: 22, accentColor: "var(--destaque-texto)" }}
              />
            </label>
          )}
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void subirRetrato(f);
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={rotulo}>Fundo do portal</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "4px 2px 6px" }}>
            {FUNDOS.map((f) => {
              const on = estilo.fundo === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => gravar({ ...estilo, fundo: f.id }, { fundo: f.id })}
                  style={{ flex: "none", width: 76, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: 0, border: 0, background: "none", cursor: "pointer" }}
                >
                  <span
                    style={{
                      width: 76, height: 96, borderRadius: 14, background: PREVIA[f.id], transition: "box-shadow .3s",
                      border: f.id === "papel" ? "6px solid transparent" : undefined,
                      boxShadow: on
                        ? "0 0 0 2px #fdfbf7,0 0 0 4px var(--destaque-texto)"
                        : "inset 0 0 0 1px rgba(0,0,0,.08)",
                    }}
                  />
                  <span style={{ fontSize: 11, lineHeight: 1.2, color: "#3a312a", fontWeight: on ? 600 : 400 }}>{f.rotulo}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, height: 36, borderRadius: 12, overflow: "hidden" }} aria-hidden>
          <span style={{ flex: 3, background: "var(--destaque)" }} />
          <span style={{ flex: 2, background: "var(--destaque-linha)" }} />
          <span style={{ flex: 2, background: "var(--destaque-fundo)" }} />
          <span style={{ flex: 1, background: "#b39662" }} />
          <span style={{ flex: 1, background: "#fdfbf7", boxShadow: "inset 0 0 0 1px #ede5d9" }} />
        </div>

        {erro && (
          <p role="alert" style={{ fontSize: 13.5, color: "#96605a" }}>
            {erro}
          </p>
        )}
      </div>
    </>
  );
}
