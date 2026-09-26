"use client";

// Dinheiro (portal v2, 178). Dois lados: o proposto pela cerimonialista
// (a verba do evento, os mesmos números do Financeiro dela) e o "só de
// vocês" (orçamento e gastos que ela não vê). Em cima, o resumo: quanto
// a festa custa, o próximo vencimento e a barra do que já foi pago.
//
// Sem pagamento aqui: a família marca "pago" e anexa o comprovante.

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/components/planejamento/celebra";
import { parseBRL } from "@/lib/financeiro-core";
import { comprimirFoto } from "@/lib/portfolio";
import type {
  DinheiroDoPortal,
  FornecedorDaCarol,
  ParcelaDaCarol,
  PedidoDeDinheiro,
} from "@/lib/supabase/portal-dinheiro";
import {
  adicionarGasto,
  alternarGastoPago,
  apagarGasto,
  desfazerPago,
  enviarGasto,
  marcarPago,
  pedirAjuste,
  salvarOrcamento,
} from "@/app/(portal)/portal/[eventoId]/investimento/dinheiro-actions";

const ES = "cubic-bezier(.2,.8,.2,1)";
const TITULO = "var(--pv2-titulo)";

function diasAte(iso: string, hoje: string): number {
  const a = Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10));
  const b = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function vence(d: number): string {
  if (d < 0) return d === -1 ? "venceu ontem" : `venceu há ${-d} dias`;
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  return `vence em ${d} dias`;
}

const soma = (xs: number[]) => xs.reduce((t, x) => t + x, 0);

type Aberta = ParcelaDaCarol & { fornecedor: string; dias: number };

export function DinheiroV2({
  eventoId,
  dados,
  cerimonialista,
  hoje,
}: {
  eventoId: string;
  dados: DinheiroDoPortal;
  cerimonialista: string;
  hoje: string;
}) {
  const router = useRouter();
  const [lado, setLado] = useState<"carol" | "fam">("carol");
  const [pagando, setPagando] = useState<{ p: ParcelaDaCarol; fornecedor: string } | null>(null);
  const [toast, setToast] = useState<{ texto: string; desfazer?: () => void } | null>(null);
  const [, iniciar] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // pedidos que ainda moram do lado dela
  const gastosEnviados = dados.pedidos.filter((p) => p.tipo === "gasto" && p.estado !== "lancado");
  const ajustes = dados.pedidos.filter((p) => p.tipo === "ajuste");

  // um nome, uma conta: tudo sai daqui
  const totalDoFornecedor = (f: FornecedorDaCarol) =>
    Math.max(f.contratado ?? 0, soma(f.parcelas.map((p) => p.valor)));
  const pendentes = gastosEnviados.filter((g) => g.estado === "aguardando");
  const cTot = soma(dados.fornecedores.map(totalDoFornecedor)) + soma(pendentes.map((g) => g.valor ?? 0));
  const cPago =
    soma(dados.fornecedores.flatMap((f) => f.parcelas.filter((p) => p.pago).map((p) => p.valor))) +
    soma(pendentes.filter((g) => g.pago).map((g) => g.valor ?? 0));
  const fTot = soma(dados.gastos.map((g) => g.valor));
  const fPago = soma(dados.gastos.filter((g) => g.pago).map((g) => g.valor));
  const tot = cTot + fTot;
  const pct = (v: number) => (tot > 0 ? `${((v / tot) * 100).toFixed(2)}%` : "0%");

  const abertas: Aberta[] = dados.fornecedores
    .flatMap((f) =>
      f.parcelas
        .filter((p) => !p.pago && !p.peloCaixa && p.vencimento)
        .map((p) => ({ ...p, fornecedor: f.id === "avulsa" ? p.descricao : f.nome, dias: diasAte(p.vencimento!, hoje) }))
    )
    .sort((a, b) => a.dias - b.dias);
  const prox = abertas[0] ?? null;
  // no trilho, vencimentos a menos de 15 dias um do outro viram um ponto só
  // (senão as etiquetas se atropelam no celular)
  const trilho: (Aberta & { juntos: number; soma: number })[] = [];
  for (const p of abertas.filter((x) => x.dias <= 60)) {
    const ultimo = trilho[trilho.length - 1];
    if (ultimo && Math.max(0, p.dias) - Math.max(0, ultimo.dias) < 15) {
      ultimo.juntos += 1;
      ultimo.soma += p.valor;
    } else {
      trilho.push({ ...p, juntos: 1, soma: p.valor });
    }
  }

  function depois(acao: () => Promise<{ ok: true } | { error: string }>, ok?: () => void) {
    iniciar(async () => {
      const r = await acao();
      if ("error" in r) {
        setToast({ texto: r.error });
        return;
      }
      ok?.();
      router.refresh();
    });
  }

  return (
    <div className="pv2-largura" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 className="pv2-h1" style={{ margin: 0, paddingTop: 8, fontFamily: TITULO, fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>
        Dinheiro
      </h1>

      {/* o resumo */}
      <div
        className="pv2-vidro"
        style={{ padding: 22, borderRadius: 26, display: "flex", flexDirection: "column", gap: 16, animation: `pv2-entrar .6s ${ES} backwards` }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "14px 30px" }}>
          <div>
            <div style={rotulo}>A festa custa</div>
            <div className="pv2-din-total" style={{ fontFamily: TITULO, lineHeight: 1, color: "#2b241f" }}>
              {tot > 0 ? <ContaDinheiro valor={tot} /> : "—"}
            </div>
          </div>
          {prox && (
            <button
              type="button"
              onClick={() => setPagando({ p: prox, fornecedor: prox.fornecedor })}
              style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "8px 16px 8px 8px", border: 0, borderRadius: 18, background: "var(--destaque-fundo)", textAlign: "left", cursor: "pointer" }}
            >
              <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--destaque-texto)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 15, lineHeight: 1 }}>
                {prox.dias === 0 ? (
                  <span style={{ fontSize: 11 }}>hoje</span>
                ) : (
                  <>
                    {Math.abs(prox.dias)}
                    <span style={{ fontSize: 9, fontWeight: 500 }}>{prox.dias < 0 ? "atraso" : prox.dias === 1 ? "dia" : "dias"}</span>
                  </>
                )}
              </span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, color: "#4c443c" }}>{prox.dias < 0 ? "vencido" : "próximo vencimento"}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--destaque-texto)" }}>
                  {prox.fornecedor} · {brl(prox.valor)}
                </span>
              </span>
            </button>
          )}
        </div>
        <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: "#f2eee9" }}>
          <span style={{ width: pct(cPago + fPago), background: "var(--destaque-texto)", transition: `width .8s ${ES}` }} />
          <span style={{ width: pct(cTot - cPago), background: "var(--destaque)", transition: `width .8s ${ES}` }} />
          <span style={{ width: pct(fTot - fPago), background: "repeating-linear-gradient(135deg,var(--destaque-linha) 0 4px,#fff 4px 8px)", transition: `width .8s ${ES}` }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 22px", fontSize: 13, color: "#3a312a" }}>
          <Legenda cor="var(--destaque-texto)">já pago {brl(cPago + fPago)}</Legenda>
          <Legenda cor="var(--destaque)">a pagar com {cerimonialista} {brl(cTot - cPago)}</Legenda>
          <Legenda cor="repeating-linear-gradient(135deg,var(--destaque-linha) 0 3px,#fff 3px 6px)" contorno>
            a pagar só de vocês {brl(fTot - fPago)}
          </Legenda>
        </div>
        {trilho.length > 0 && (
          <div style={{ paddingTop: 14, borderTop: "1px solid rgba(0,0,0,.06)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#776d60" }}>próximos 60 dias</div>
            <div style={{ position: "relative", height: 64 }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 40, height: 2, borderRadius: 1, background: "linear-gradient(90deg,var(--destaque-texto),var(--destaque-linha))" }} />
              <span style={{ position: "absolute", left: 0, top: 34, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 3px var(--destaque-texto)" }} />
              <span style={{ position: "absolute", left: 0, top: 50, fontSize: 11, color: "#4c443c" }}>hoje</span>
              {trilho.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPagando({ p, fornecedor: p.fornecedor })}
                  style={{ position: "absolute", left: `${Math.max(12, Math.min(88, (Math.max(0, p.dias) / 60) * 100))}%`, top: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 44, padding: 0, border: 0, background: "none", cursor: "pointer" }}
                >
                  <span style={{ padding: "3px 8px", borderRadius: 8, background: "var(--destaque-texto)", color: "#fff", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap" }}>{brl(p.soma)}</span>
                  <span style={{ width: 12, height: 12, marginTop: 6, borderRadius: "50%", background: "var(--destaque)", boxShadow: "0 0 0 3px #fff" }} />
                  <span style={{ fontSize: 11, color: "#4c443c", whiteSpace: "nowrap" }}>
                    {p.juntos > 1 ? `${p.juntos} parcelas` : p.fornecedor.split(" ")[0]} · {p.dias < 0 ? "venceu" : p.dias === 0 ? "hoje" : `${p.dias}d`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* celular: um lado de cada vez */}
      <div
        className="pv2-din-alternar"
        style={{ position: "relative", gridTemplateColumns: "1fr 1fr", height: 50, padding: 4, borderRadius: 25, background: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.9)" }}
      >
        <span
          aria-hidden
          style={{ position: "absolute", top: 4, bottom: 4, left: 4, width: "calc(50% - 4px)", borderRadius: 21, background: "var(--destaque-texto)", transform: `translateX(${lado === "carol" ? "0%" : "100%"})`, transition: `transform .45s ${ES}`, boxShadow: "0 10px 20px -12px var(--destaque-texto)" }}
        />
        <button type="button" onClick={() => setLado("carol")} aria-pressed={lado === "carol"} style={{ ...alternar, color: lado === "carol" ? "#fff" : "#3a312a" }}>
          Proposto por {cerimonialista}
        </button>
        <button type="button" onClick={() => setLado("fam")} aria-pressed={lado === "fam"} style={{ ...alternar, color: lado === "fam" ? "#fff" : "#3a312a" }}>
          Só de vocês
        </button>
      </div>

      <div className="pv2-din-lados" data-lado={lado}>
        <LadoDaCarol
          eventoId={eventoId}
          fornecedores={dados.fornecedores}
          gastosEnviados={gastosEnviados}
          ajustes={ajustes}
          cerimonialista={cerimonialista}
          hoje={hoje}
          cPago={cPago}
          cTot={cTot}
          totalDoFornecedor={totalDoFornecedor}
          aoPagar={(p, fornecedor) => setPagando({ p, fornecedor })}
          depois={depois}
        />
        <LadoDaFamilia
          eventoId={eventoId}
          dados={dados}
          cerimonialista={cerimonialista}
          fTot={fTot}
          depois={depois}
          aviso={(texto) => setToast({ texto })}
        />
      </div>

      {pagando && (
        <FolhaPagar
          eventoId={eventoId}
          parcela={pagando.p}
          fornecedor={pagando.fornecedor}
          cerimonialista={cerimonialista}
          hoje={hoje}
          fechar={() => setPagando(null)}
          pronto={() => {
            const id = pagando.p.id;
            setPagando(null);
            router.refresh();
            setToast({
              texto: "Marcado como pago",
              desfazer: () => depois(() => desfazerPago(eventoId, id), () => setToast(null)),
            });
          }}
        />
      )}

      {toast && (
        <div className="pv2-toast" role="status">
          <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: toast.desfazer ? "0 8px 0 18px" : "0 18px", borderRadius: 24, background: "rgba(30,24,28,.92)", color: "#fdfbf7", fontSize: 14, boxShadow: "0 16px 30px -14px rgba(0,0,0,.5)", animation: `pv2-subir .45s ${ES} both` }}>
            {toast.texto}
            {toast.desfazer && (
              <button type="button" onClick={toast.desfazer} style={{ height: 36, padding: "0 12px", border: 0, borderRadius: 18, background: "rgba(255,255,255,.14)", color: "#fdfbf7", fontSize: 13, cursor: "pointer" }}>
                Desfazer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- lado da cerimonialista ---------------- */

type Depois = (acao: () => Promise<{ ok: true } | { error: string }>, ok?: () => void) => void;

function LadoDaCarol({
  eventoId,
  fornecedores,
  gastosEnviados,
  ajustes,
  cerimonialista,
  hoje,
  cPago,
  cTot,
  totalDoFornecedor,
  aoPagar,
  depois,
}: {
  eventoId: string;
  fornecedores: FornecedorDaCarol[];
  gastosEnviados: PedidoDeDinheiro[];
  ajustes: PedidoDeDinheiro[];
  cerimonialista: string;
  hoje: string;
  cPago: number;
  cTot: number;
  totalDoFornecedor: (f: FornecedorDaCarol) => number;
  aoPagar: (p: ParcelaDaCarol, fornecedor: string) => void;
  depois: Depois;
}) {
  const vazio = fornecedores.length === 0 && gastosEnviados.length === 0;
  return (
    <div className="pv2-din-carol" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: "2px 10px" }}>
        <h2 style={h2}>Proposto por {cerimonialista}</h2>
        <span style={{ fontSize: 12.5, color: "#776d60" }}>
          {vazio ? `${cerimonialista} vê o mesmo` : `${brl(cPago)} pago de ${brl(cTot)}`}
        </span>
      </div>
      {vazio && (
        <div style={{ padding: 22, borderRadius: 22, background: "rgba(255,255,255,.6)", fontSize: 15, color: "#4c443c" }}>
          {cerimonialista} ainda não enviou a verba da festa.
        </div>
      )}
      {fornecedores.map((f, i) => (
        <CartaoFornecedor
          key={f.id}
          eventoId={eventoId}
          f={f}
          total={totalDoFornecedor(f)}
          ajustes={ajustes.filter((a) => (a.supplierId ? a.supplierId === f.id : f.id === "avulsa"))}
          cerimonialista={cerimonialista}
          hoje={hoje}
          atraso={i * 80}
          aoPagar={aoPagar}
          depois={depois}
        />
      ))}
      {gastosEnviados.map((g, i) => (
        <div key={g.id} style={{ ...cartao, animation: `pv2-entrar .6s ${ES} ${(fornecedores.length + i) * 80}ms backwards` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <div>
              <div style={{ fontFamily: TITULO, fontSize: 21, color: "#2b241f" }}>{g.rotulo}</div>
              {g.texto && <div style={{ fontSize: 12.5, color: "#776d60" }}>{g.texto}</div>}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#2b241f" }}>{brl(g.valor ?? 0)}</div>
          </div>
          {g.estado === "aguardando" ? (
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--destaque-texto)", paddingBottom: 8 }}>
              enviado por vocês · aguardando {cerimonialista}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#4c443c", paddingBottom: 8 }}>
              {cerimonialista} respondeu{g.resposta ? `: ${g.resposta}` : ""}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CartaoFornecedor({
  eventoId,
  f,
  total,
  ajustes,
  cerimonialista,
  hoje,
  atraso,
  aoPagar,
  depois,
}: {
  eventoId: string;
  f: FornecedorDaCarol;
  total: number;
  ajustes: PedidoDeDinheiro[];
  cerimonialista: string;
  hoje: string;
  atraso: number;
  aoPagar: (p: ParcelaDaCarol, fornecedor: string) => void;
  depois: Depois;
}) {
  const [pedindo, setPedindo] = useState(false);
  const [texto, setTexto] = useState("");
  const aguardando = ajustes.find((a) => a.estado === "aguardando");
  const respondido = [...ajustes].reverse().find((a) => a.estado !== "aguardando");
  const semVencimento = (f.contratado ?? 0) - soma(f.parcelas.map((p) => p.valor));

  return (
    <div style={{ ...cartao, animation: `pv2-entrar .6s ${ES} ${atraso}ms backwards` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: TITULO, fontSize: 21, color: "#2b241f" }}>{f.nome}</div>
          {f.categoria && <div style={{ fontSize: 12.5, color: "#776d60" }}>{f.categoria}</div>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#2b241f", flex: "none" }}>{brl(total)}</div>
      </div>

      {f.parcelas.map((p) => (
        <LinhaParcela key={p.id} eventoId={eventoId} p={p} fornecedor={f.id === "avulsa" ? p.descricao : f.nome} rotulo={semFornecedor(p.descricao, f.nome)} cerimonialista={cerimonialista} hoje={hoje} aoPagar={aoPagar} depois={depois} />
      ))}
      {semVencimento > 0.005 && (
        <div style={{ ...linha, color: "#4c443c", fontSize: 14 }}>
          <span style={{ ...bolinha, background: "transparent" }} />
          {brl(semVencimento)} · sem vencimento ainda
        </div>
      )}

      {respondido && !aguardando && (
        <div style={{ fontSize: 13, color: "#4c443c", paddingTop: 6 }}>
          {cerimonialista} respondeu{respondido.resposta ? `: ${respondido.resposta}` : ""}
        </div>
      )}
      {aguardando ? (
        <div style={{ minHeight: 44, display: "flex", alignItems: "center", fontSize: 13, color: "#4c443c" }}>
          Ajuste pedido · aguardando {cerimonialista}
        </div>
      ) : pedindo ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            maxLength={600}
            autoFocus
            placeholder="O que precisa mudar?"
            style={{ ...campo, height: "auto", padding: 12, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() =>
                depois(
                  () => pedirAjuste(eventoId, { supplierId: f.id === "avulsa" ? null : f.id, rotulo: f.nome, texto }),
                  () => {
                    setPedindo(false);
                    setTexto("");
                  }
                )
              }
              style={botaoForte}
            >
              Pedir ajuste
            </button>
            <button type="button" onClick={() => setPedindo(false)} style={botaoLeve}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setPedindo(true)} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: 0, background: "none", fontSize: 13.5, color: "#6b6259", textDecoration: "underline", cursor: "pointer" }}>
          Pedir ajuste
        </button>
      )}
    </div>
  );
}

/** "Buffet Aurora · sinal" dentro do cartão Buffet Aurora vira "Sinal" */
function semFornecedor(descricao: string, fornecedor: string): string {
  if (!descricao.toLowerCase().startsWith(fornecedor.toLowerCase())) return descricao;
  const resto = descricao.slice(fornecedor.length).replace(/^[\s·:|–—-]+/, "").trim();
  return resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : descricao;
}

function LinhaParcela({
  eventoId,
  p,
  rotulo,
  fornecedor,
  cerimonialista,
  hoje,
  aoPagar,
  depois,
}: {
  eventoId: string;
  p: ParcelaDaCarol;
  rotulo: string;
  fornecedor: string;
  cerimonialista: string;
  hoje: string;
  aoPagar: (p: ParcelaDaCarol, fornecedor: string) => void;
  depois: Depois;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subindo, setSubindo] = useState(false);
  const d = p.vencimento ? diasAte(p.vencimento, hoje) : null;

  const status = p.pago
    ? p.familiaNome
      ? `${p.familiaNome.split(" ")[0]} marcou como pago · ${p.pagoEm ? ddmm(p.pagoEm) : ""}`
      : `pago · ${p.pagoEm ? ddmm(p.pagoEm) : ""}`
    : d === null
      ? "sem vencimento ainda"
      : p.peloCaixa
        ? `${vence(d)} · ${cerimonialista} paga`
        : vence(d);
  const perto = !p.pago && d !== null && d <= 7;

  async function anexar(file: File) {
    setSubindo(true);
    try {
      const sub = await subirComprovante(eventoId, file);
      if (!sub) return;
      depois(() => marcarPago(eventoId, p.id, { pagoEm: null, comprovantePath: sub.path, comprovanteNome: sub.nome }));
    } finally {
      setSubindo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div style={linha}>
      <span
        style={{
          ...bolinha,
          background: p.pago ? "var(--destaque-texto)" : "transparent",
        }}
      >
        {p.pago ? "✓" : ""}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ fontSize: 15, color: "#2b241f" }}>
          {rotulo} · {brl(p.valor)}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: p.pago ? 400 : 600, color: p.pago ? "#4c443c" : perto ? "var(--destaque-texto)" : "#3a312a" }}>
          {status}
        </div>
        {p.pago && p.comprovante && (
          <a href={p.comprovante.url} target="_blank" rel="noopener noreferrer" style={{ alignSelf: "flex-start", fontSize: 12.5, color: "var(--destaque-texto)" }}>
            {p.comprovante.nome}
          </a>
        )}
        {p.pago && !p.comprovante && p.temComprovante && <span style={{ fontSize: 12.5, color: "#776d60" }}>com comprovante</span>}
        {p.pago && !p.temComprovante && (
          <>
            <button
              type="button"
              disabled={subindo}
              onClick={() => entrada.current?.click()}
              style={{ alignSelf: "flex-start", minHeight: 32, padding: 0, border: 0, background: "none", fontSize: 12.5, color: "var(--destaque-texto)", textDecoration: "underline", cursor: "pointer" }}
            >
              {subindo ? "Enviando…" : "Anexar comprovante"}
            </button>
            <input ref={entrada} type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && anexar(e.target.files[0])} />
          </>
        )}
      </div>
      {!p.pago && !p.peloCaixa && (
        <button
          type="button"
          onClick={() => aoPagar(p, fornecedor)}
          style={{ flex: "none", height: 44, padding: "0 14px", border: 0, borderRadius: 14, background: "var(--destaque-fundo)", color: "var(--destaque-texto)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Marcar pago
        </button>
      )}
    </div>
  );
}

/* ---------------- só de vocês ---------------- */

function LadoDaFamilia({
  eventoId,
  dados,
  cerimonialista,
  fTot,
  depois,
  aviso,
}: {
  eventoId: string;
  dados: DinheiroDoPortal;
  cerimonialista: string;
  fTot: number;
  depois: Depois;
  aviso: (t: string) => void;
}) {
  const [orc, setOrc] = useState(dados.orcamento ? dados.orcamento.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "");
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const orcNum = parseBRL(orc) || 0;
  const sobra = orcNum - fTot;

  function salvarOrc() {
    const v = orc.trim() ? parseBRL(orc) : null;
    if (v !== null && !Number.isFinite(v)) return aviso("Confira o valor do orçamento.");
    if (v === (dados.orcamento ?? null)) return;
    depois(() => salvarOrcamento(eventoId, v));
  }

  function adicionar() {
    if (!nome.trim()) return;
    const v = parseBRL(valor || "0") || 0;
    depois(
      () => adicionarGasto(eventoId, { nome, valor: v }),
      () => {
        setNome("");
        setValor("");
      }
    );
  }

  return (
    <div
      className="pv2-din-fam"
      style={{ display: "flex", flexDirection: "column", gap: 12, padding: 18, borderRadius: 26, background: "color-mix(in oklch, var(--destaque-fundo) 75%, #fff)", border: "1.5px dashed var(--destaque-linha)" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <h2 style={h2}>Só de vocês</h2>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#4c443c" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" aria-hidden style={{ strokeWidth: 1.8, strokeLinecap: "round" }}>
            <path d="M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
          </svg>
          {cerimonialista} não vê
        </span>
      </div>
      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 14, color: "#332b24" }}>
        Orçamento de vocês
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#4c443c" }}>
          R$
          <input
            value={orc}
            onChange={(e) => setOrc(e.target.value)}
            onBlur={salvarOrc}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            inputMode="decimal"
            placeholder="0"
            aria-label="Orçamento de vocês"
            style={{ ...campo, width: 120, textAlign: "right" }}
          />
        </span>
      </label>
      <div style={{ fontSize: 13, color: "#4c443c" }}>
        {fTot
          ? `gastos ${brl(fTot)}${orcNum ? (sobra >= 0 ? ` · sobram ${brl(sobra)}` : ` · passou ${brl(-sobra)}`) : ""}`
          : "nenhum gasto ainda"}
      </div>
      {dados.gastos.map((g, i) => (
        <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 16, background: "rgba(255,255,255,.85)", animation: `pv2-entrar .6s ${ES} ${i * 60}ms backwards` }}>
          <button
            type="button"
            role="checkbox"
            aria-checked={g.pago}
            aria-label={`${g.nome}: ${g.pago ? "pago" : "a pagar"}`}
            onClick={() => depois(() => alternarGastoPago(eventoId, g.id, !g.pago))}
            style={{ width: 44, height: 44, flex: "none", margin: "-6px -4px -6px -10px", border: 0, background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <span style={{ width: 24, height: 24, borderRadius: 8, border: `1.5px solid ${g.pago ? "var(--destaque-texto)" : "#b4ada4"}`, background: g.pago ? "var(--destaque-texto)" : "#fff", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .3s" }}>
              {g.pago ? "✓" : ""}
            </span>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#2b241f" }}>{g.nome}</div>
            <div style={{ fontSize: 12.5, color: "#776d60" }}>
              {g.categoria ? `${g.categoria} · ` : ""}
              {g.pago ? "pago" : "a pagar"}
            </div>
          </div>
          <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#2b241f" }}>{brl(g.valor)}</span>
            <span style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => depois(() => enviarGasto(eventoId, g.id))} style={linkPequeno}>
                Enviar para {cerimonialista}
              </button>
              <button type="button" onClick={() => depois(() => apagarGasto(eventoId, g.id))} style={{ ...linkPequeno, color: "#776d60" }} aria-label={`Apagar ${g.nome}`}>
                apagar
              </button>
            </span>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          maxLength={80}
          placeholder="Novo gasto"
          aria-label="Novo gasto"
          style={{ ...campo, flex: "1 1 140px", minWidth: 0, height: 46 }}
        />
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          inputMode="decimal"
          placeholder="R$"
          aria-label="Valor do novo gasto"
          style={{ ...campo, width: 110, height: 46 }}
        />
        <button type="button" onClick={adicionar} style={{ ...botaoForte, height: 46 }}>
          Adicionar
        </button>
      </div>
    </div>
  );
}

/* ---------------- a folha de marcar pago ---------------- */

async function subirComprovante(eventoId: string, file: File): Promise<{ path: string; nome: string } | null> {
  const pdf = file.type === "application/pdf";
  if (!pdf && !file.type.startsWith("image/")) return null;
  const corpo = pdf ? file : await comprimirFoto(file);
  const comprimido = !pdf && corpo !== file;
  const ext = pdf
    ? "pdf"
    : comprimido
      ? "jpg"
      : (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${eventoId}/familia/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from("comprovantes")
    .upload(path, corpo, { contentType: comprimido ? "image/jpeg" : file.type, upsert: false });
  if (error) return null;
  return { path, nome: file.name.slice(0, 120) || "comprovante" };
}

function FolhaPagar({
  eventoId,
  parcela,
  fornecedor,
  cerimonialista,
  hoje,
  fechar,
  pronto,
}: {
  eventoId: string;
  parcela: ParcelaDaCarol;
  fornecedor: string;
  cerimonialista: string;
  hoje: string;
  fechar: () => void;
  pronto: () => void;
}) {
  const [data, setData] = useState(hoje);
  const [comp, setComp] = useState<{ path: string; nome: string } | null>(null);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [fechar]);

  async function anexar(file: File) {
    setErro(null);
    setSubindo(true);
    try {
      const sub = await subirComprovante(eventoId, file);
      if (!sub) setErro("Não foi possível enviar o comprovante. Foto ou PDF, até 10 MB.");
      else setComp(sub);
    } finally {
      setSubindo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  function confirmar() {
    setErro(null);
    iniciar(async () => {
      const r = await marcarPago(eventoId, parcela.id, {
        pagoEm: data || null,
        comprovantePath: comp?.path ?? null,
        comprovanteNome: comp?.nome ?? null,
      });
      if ("error" in r) setErro(r.error);
      else pronto();
    });
  }

  return (
    <>
      <div className="pv2-veu" onClick={fechar} aria-hidden />
      <div className="pv2-folha" role="dialog" aria-modal="true" aria-label={`Marcar como pago: ${fornecedor}`} style={{ padding: "24px 22px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 12.5, color: "#776d60" }}>
          {fornecedor} · {semFornecedor(parcela.descricao, fornecedor)}
        </div>
        <div style={{ fontFamily: TITULO, fontSize: 44, lineHeight: 1, color: "#2b241f" }}>{brl(parcela.valor)}</div>
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 48, padding: "0 6px 0 14px", borderRadius: 14, background: "#fff", border: "1px solid #ede5d9", fontSize: 15, color: "#332b24" }}>
          <span>Pago em</span>
          <input
            type="date"
            value={data}
            max={hoje}
            onChange={(e) => setData(e.target.value)}
            style={{ height: 40, border: 0, background: "none", fontSize: 15, fontWeight: 500, color: "#332b24" }}
          />
        </label>
        <button
          type="button"
          disabled={subindo}
          onClick={() => entrada.current?.click()}
          style={{ minHeight: 92, border: `1.5px dashed ${comp ? "var(--destaque-texto)" : "var(--destaque-linha)"}`, borderRadius: 18, background: comp ? "var(--destaque-fundo)" : "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 14, color: "var(--destaque-texto)", cursor: "pointer", transition: "background .3s", padding: "10px 14px" }}
        >
          <span style={{ fontSize: 22 }} aria-hidden>
            {comp ? "✓" : "+"}
          </span>
          <span style={{ wordBreak: "break-all" }}>
            {subindo ? "Enviando…" : comp ? `${comp.nome} anexado` : "Anexar comprovante (foto ou PDF)"}
          </span>
        </button>
        <input ref={entrada} type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && anexar(e.target.files[0])} />
        {erro && <div style={{ fontSize: 13, color: "#8a2f2f" }}>{erro}</div>}
        <button
          type="button"
          disabled={enviando || subindo}
          onClick={confirmar}
          style={{ minHeight: 52, border: 0, borderRadius: 16, background: "var(--destaque-texto)", color: "#fff", fontSize: 15, fontWeight: 500, cursor: "pointer", boxShadow: "0 14px 28px -14px var(--destaque-texto)", opacity: enviando ? 0.7 : 1 }}
        >
          Marcar como pago
        </button>
        <div style={{ fontSize: 12.5, color: "#776d60", textAlign: "center" }}>
          {cerimonialista} vê o pagamento e o comprovante no financeiro da festa.
        </div>
      </div>
    </>
  );
}

/* ---------------- peças ---------------- */

/** O total que sobe até o valor e, depois, anda até o novo. */
function ContaDinheiro({ valor }: { valor: number }) {
  const [v, setV] = useState(0);
  const de = useRef(0);
  useEffect(() => {
    const ini = de.current;
    const t0 = performance.now();
    const D = 1400;
    let id = 0;
    const passo = () => {
      const k = Math.min(1, (performance.now() - t0) / D);
      const x = ini + (valor - ini) * (1 - Math.pow(1 - k, 4));
      setV(x);
      de.current = x;
      if (k < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [valor]);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{brl(Math.round(v))}</span>;
}

function Legenda({ cor, contorno, children }: { cor: string; contorno?: boolean; children: React.ReactNode }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: cor, boxShadow: contorno ? "inset 0 0 0 1px var(--destaque-linha)" : undefined }} />
      {children}
    </span>
  );
}

const rotulo: CSSProperties = { fontSize: 11, letterSpacing: ".09em", textTransform: "uppercase", color: "#776d60" };
const h2: CSSProperties = { margin: 0, fontFamily: TITULO, fontWeight: 400, fontSize: 24, color: "#332b24" };
const cartao: CSSProperties = {
  padding: "16px 18px 10px",
  borderRadius: 22,
  background: "rgba(255,255,255,.85)",
  WebkitBackdropFilter: "blur(16px)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,.9)",
  boxShadow: "0 18px 36px -30px rgba(50,35,45,.5)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};
const linha: CSSProperties = { display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "6px 0", borderTop: "1px solid rgba(0,0,0,.05)" };
const bolinha: CSSProperties = {
  width: 30,
  height: 30,
  flex: "none",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "inset 0 0 0 1.5px var(--destaque-linha)",
  color: "#fff",
  fontSize: 14,
};
const alternar: CSSProperties = { position: "relative", border: 0, background: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "color .3s" };
const campo: CSSProperties = { height: 44, padding: "0 12px", border: "1px solid rgba(0,0,0,.08)", borderRadius: 12, background: "#fff", fontSize: 15, color: "#332b24" };
const botaoForte: CSSProperties = { height: 44, padding: "0 16px", border: 0, borderRadius: 14, background: "var(--destaque-texto)", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" };
const botaoLeve: CSSProperties = { height: 44, padding: "0 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 14, background: "#fff", color: "#3a312a", fontSize: 14, cursor: "pointer" };
const linkPequeno: CSSProperties = { minHeight: 32, padding: 0, border: 0, background: "none", fontSize: 12.5, color: "var(--destaque-texto)", textDecoration: "underline", cursor: "pointer" };
