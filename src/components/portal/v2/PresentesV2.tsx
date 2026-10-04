"use client";

// Lista de presentes (portal v2), etapa 1 (182): a conta que recebe. O
// dinheiro de cada presente cai direto na conta do responsável, pela
// Pagar.me; o cadastro pede o que a Pagar.me exige para validar quem
// recebe, e a validação termina com a prova de vida no celular. Os
// presentes em si chegam na etapa 2.

import { useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { RecebedorDoEvento } from "@/lib/supabase/portal-presentes";
import { BANCOS, TAXA_DA_LISTA, so, type DadosDoRecebedor } from "@/lib/lista-presentes";
import { atualizarRecebedor, cadastrarRecebedor, provaDeVida } from "@/app/(portal)/portal/[eventoId]/presentes/actions";

const ES = "cubic-bezier(.2,.8,.2,1)";
const TITULO = "var(--pv2-titulo)";

const VAZIO: DadosDoRecebedor = {
  nome: "", cpf: "", nascimento: "", nomeDaMae: "", profissao: "", rendaMensal: "", celular: "",
  cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  banco: "", agencia: "", agenciaDigito: "", conta: "", contaDigito: "", tipoConta: "checking",
};

export function PresentesV2({
  eventoId,
  recebedor,
  souResponsavel,
  meuNome,
  cerimonialista,
}: {
  eventoId: string;
  recebedor: RecebedorDoEvento | null;
  souResponsavel: boolean;
  meuNome: string | null;
  cerimonialista: string;
}) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [d, setD] = useState<DadosDoRecebedor>({ ...VAZIO, nome: meuNome ?? "" });
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const muda = (c: Partial<DadosDoRecebedor>) => setD((x) => ({ ...x, ...c }));
  const taxa = `${(TAXA_DA_LISTA * 100).toFixed(2).replace(".", ",")}%`;

  async function buscarCep(cep: string) {
    if (so(cep).length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${so(cep)}/json/`);
      const j = (await r.json()) as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean };
      if (!j.erro) muda({ rua: j.logradouro ?? "", bairro: j.bairro ?? "", cidade: j.localidade ?? "", uf: j.uf ?? "" });
    } catch {
      /* sem o CEP, ela digita o endereço */
    }
  }

  function enviar() {
    setErro(null);
    iniciar(async () => {
      const r = await cadastrarRecebedor(eventoId, d);
      if ("error" in r) setErro(r.error);
      else {
        setD(VAZIO);
        router.refresh();
      }
    });
  }

  function abrirProvaDeVida() {
    setErro(null);
    setAviso(null);
    const aba = window.open("about:blank", "_blank");
    iniciar(async () => {
      const r = await provaDeVida(eventoId);
      if ("url" in r) {
        if (aba) aba.location.href = r.url;
        else window.location.href = r.url;
        return;
      }
      aba?.close();
      // por enquanto o link chega por fora (o dono do sistema manda): é aviso, não erro
      if ("manual" in r) setAviso(r.manual);
      else setErro(r.error);
    });
  }

  function atualizar() {
    setAviso(null);
    setErro(null);
    iniciar(async () => {
      const r = await atualizarRecebedor(eventoId);
      if ("error" in r) setErro(r.error);
      else setAviso("Atualizado.");
      router.refresh();
    });
  }

  return (
    <div className="pv2-largura" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ paddingTop: 8 }}>
        <h1 className="pv2-h1" style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>Lista de presentes</h1>
        <div style={{ fontSize: 14, color: "#4c443c" }}>
          {recebedor?.status === "active" ? "a conta está pronta para receber" : "primeiro, a conta que recebe"}
        </div>
      </div>

      {recebedor ? (
        <div className="pv2-vidro" style={{ padding: 20, borderRadius: 24, display: "flex", flexDirection: "column", gap: 10, animation: `pv2-entrar .6s ${ES} backwards` }}>
          <div style={rotulo}>A conta que recebe</div>
          <div style={{ fontFamily: TITULO, fontSize: 24, color: "#2b241f" }}>{recebedor.titular ?? "Responsável"}</div>
          {recebedor.banco && <div style={{ fontSize: 14, color: "#4c443c" }}>{recebedor.banco} · transferência todo dia 5</div>}
          <Estado status={recebedor.status} cerimonialista={cerimonialista} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {souResponsavel && (recebedor.status === "registration" || recebedor.status === "affiliation") && (
              <button type="button" disabled={enviando} onClick={abrirProvaDeVida} style={botaoForte}>
                Fazer a prova de vida
              </button>
            )}
            {recebedor.status !== "active" && (
              <button type="button" disabled={enviando} onClick={atualizar} style={botaoLeve}>
                Ver se já foi aprovado
              </button>
            )}
          </div>
          {aviso && <div role="status" style={{ fontSize: 13, color: "#4c443c" }}>{aviso}</div>}
          {erro && <div role="alert" style={{ fontSize: 13, color: "#8a2f2f" }}>{erro}</div>}
        </div>
      ) : !souResponsavel ? (
        <div style={{ padding: "18px 20px", borderRadius: 22, background: "rgba(255,255,255,.7)", fontSize: 15, color: "#4c443c" }}>
          Quem cadastra a conta que recebe os presentes é o responsável pelo evento.
        </div>
      ) : (
        <div className="pv2-vidro" style={{ padding: 18, borderRadius: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, color: "#3a312a" }}>
            Cada presente cai direto nesta conta, com taxa de {taxa}. A Pagar.me valida quem recebe; o eOrganizei não guarda CPF nem os dados da conta.
          </div>

          <Grupo titulo="Quem recebe">
            <Campo rotulo="Nome completo" valor={d.nome} muda={(v) => muda({ nome: v })} max={80} />
            <Campo rotulo="CPF" valor={d.cpf} muda={(v) => muda({ cpf: v })} modo="numeric" max={14} />
            <Campo rotulo="Data de nascimento" valor={d.nascimento} muda={(v) => muda({ nascimento: mascaraData(v) })} ph="dd/mm/aaaa" modo="numeric" max={10} />
            <Campo rotulo="Nome da mãe" valor={d.nomeDaMae} muda={(v) => muda({ nomeDaMae: v })} max={80} />
            <Campo rotulo="Profissão" valor={d.profissao} muda={(v) => muda({ profissao: v })} max={60} />
            <Campo rotulo="Renda mensal (R$)" valor={d.rendaMensal} muda={(v) => muda({ rendaMensal: v })} modo="numeric" max={12} />
            <Campo rotulo="Celular com DDD" valor={d.celular} muda={(v) => muda({ celular: v })} modo="tel" max={16} />
          </Grupo>

          <Grupo titulo="Endereço">
            <Campo rotulo="CEP" valor={d.cep} muda={(v) => { muda({ cep: v }); void buscarCep(v); }} modo="numeric" max={9} />
            <Campo rotulo="Rua" valor={d.rua} muda={(v) => muda({ rua: v })} max={120} />
            <div style={{ display: "flex", gap: 8 }}>
              <Campo rotulo="Número" valor={d.numero} muda={(v) => muda({ numero: v })} max={10} />
              <Campo rotulo="Complemento" valor={d.complemento} muda={(v) => muda({ complemento: v })} max={40} />
            </div>
            <Campo rotulo="Bairro" valor={d.bairro} muda={(v) => muda({ bairro: v })} max={60} />
            <div style={{ display: "flex", gap: 8 }}>
              <Campo rotulo="Cidade" valor={d.cidade} muda={(v) => muda({ cidade: v })} max={60} />
              <Campo rotulo="UF" valor={d.uf} muda={(v) => muda({ uf: v.toUpperCase() })} max={2} largura={72} />
            </div>
          </Grupo>

          <Grupo titulo="A conta (no nome e CPF de quem recebe)">
            <label style={rotuloCampo}>
              Banco
              <select value={d.banco} onChange={(e) => muda({ banco: e.target.value })} style={campo}>
                <option value="">Escolha o banco</option>
                {BANCOS.map(([c, n]) => (
                  <option key={c} value={c}>
                    {n} ({c})
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <Campo rotulo="Agência" valor={d.agencia} muda={(v) => muda({ agencia: v })} modo="numeric" max={6} />
              <Campo rotulo="Dígito" valor={d.agenciaDigito} muda={(v) => muda({ agenciaDigito: v })} modo="numeric" max={1} largura={80} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Campo rotulo="Conta" valor={d.conta} muda={(v) => muda({ conta: v })} modo="numeric" max={13} />
              <Campo rotulo="Dígito" valor={d.contaDigito} muda={(v) => muda({ contaDigito: v })} max={2} largura={80} />
            </div>
            <div role="group" aria-label="Tipo de conta" style={{ display: "flex", gap: 6 }}>
              {([["checking", "Corrente"], ["savings", "Poupança"]] as const).map(([v, t]) => (
                <button key={v} type="button" aria-pressed={d.tipoConta === v} onClick={() => muda({ tipoConta: v })} style={chip(d.tipoConta === v)}>
                  {t}
                </button>
              ))}
            </div>
          </Grupo>

          {erro && <div role="alert" style={{ fontSize: 13, color: "#8a2f2f" }}>{erro}</div>}
          <button type="button" disabled={enviando} onClick={enviar} style={{ ...botaoForte, minHeight: 52 }}>
            {enviando ? "Enviando…" : "Enviar para a Pagar.me"}
          </button>
        </div>
      )}
    </div>
  );
}

function Estado({ status, cerimonialista }: { status: RecebedorDoEvento["status"]; cerimonialista: string }) {
  const t: Record<RecebedorDoEvento["status"], string> = {
    registration: "Cadastro enviado. Falta a prova de vida de quem recebe.",
    affiliation: "Falta a prova de vida de quem recebe.",
    active: "Aprovado. A lista já pode receber presentes.",
    refused: `A Pagar.me não aprovou este cadastro. Fale com ${cerimonialista}.`,
    suspended: `A conta está suspensa na Pagar.me. Fale com ${cerimonialista}.`,
    blocked: `A conta está bloqueada na Pagar.me. Fale com ${cerimonialista}.`,
    inactive: `A conta está inativa na Pagar.me. Fale com ${cerimonialista}.`,
  };
  const ok = status === "active";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: ok ? "var(--destaque-texto)" : "#3a312a" }}>
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: ok ? "var(--destaque-texto)" : "var(--destaque-linha)" }} />
      {t[status]}
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ margin: 0, padding: 0, border: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <legend style={{ ...rotulo, marginBottom: 6 }}>{titulo}</legend>
      {children}
    </fieldset>
  );
}

function Campo({ rotulo: r, valor, muda, max, ph, modo, largura }: { rotulo: string; valor: string; muda: (v: string) => void; max: number; ph?: string; modo?: "numeric" | "tel"; largura?: number }) {
  return (
    <label style={{ ...rotuloCampo, flex: largura ? "none" : 1, width: largura }}>
      {r}
      <input value={valor} onChange={(e) => muda(e.target.value)} maxLength={max} placeholder={ph} inputMode={modo} autoComplete="off" style={campo} />
    </label>
  );
}

function mascaraData(v: string): string {
  const d = so(v).slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join("/");
}

const rotulo: CSSProperties = { fontSize: 11, letterSpacing: ".09em", textTransform: "uppercase", color: "#776d60" };
const rotuloCampo: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, minWidth: 0, fontSize: 13, color: "#4c443c" };
const campo: CSSProperties = { width: "100%", minWidth: 0, height: 46, padding: "0 12px", border: "1px solid #e7dfd2", borderRadius: 14, background: "#fff", fontSize: 15, color: "#332b24" };
const botaoForte: CSSProperties = { height: 46, padding: "0 16px", border: 0, borderRadius: 14, background: "var(--destaque-texto)", color: "#fff", fontSize: 15, fontWeight: 500, cursor: "pointer" };
const botaoLeve: CSSProperties = { height: 46, padding: "0 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 14, background: "#fff", color: "#3a312a", fontSize: 14, cursor: "pointer" };
function chip(on: boolean): CSSProperties {
  return { height: 40, padding: "0 14px", border: `1px solid ${on ? "var(--destaque-texto)" : "#e7dfd2"}`, borderRadius: 20, background: on ? "var(--destaque-texto)" : "#fff", color: on ? "#fff" : "#3a312a", fontSize: 14, cursor: "pointer" };
}
