"use client";

// A conta que recebe os presentes (182), no desenho do portal dos noivos:
// o mesmo cadastro do portal v2 (as mesmas ações), com as peças da v4. O
// dinheiro de cada presente cai direto nesta conta, pela Pagar.me; os
// dados pessoais e a conta vão direto para ela — aqui fica só o código do
// recebedor, o estado e um resumo.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RecebedorDoEvento } from "@/lib/supabase/portal-presentes";
import { BANCOS, so, type DadosDoRecebedor } from "@/lib/lista-presentes";
import { atualizarRecebedor, cadastrarRecebedor, provaDeVida } from "@/app/(portal)/portal/[eventoId]/presentes/actions";

const VAZIO: DadosDoRecebedor = {
  nome: "", cpf: "", nascimento: "", nomeDaMae: "", profissao: "", rendaMensal: "", celular: "",
  cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  banco: "", agencia: "", agenciaDigito: "", conta: "", contaDigito: "", tipoConta: "checking",
};

function estadoEmPalavras(status: RecebedorDoEvento["status"], cerimonialista: string): string {
  const t: Record<RecebedorDoEvento["status"], string> = {
    registration: "Cadastro enviado. Falta a prova de vida de quem recebe.",
    affiliation: "Falta a prova de vida de quem recebe.",
    active: "Aprovada. A lista pode receber presentes.",
    refused: `A Pagar.me não aprovou este cadastro. Fale com ${cerimonialista}.`,
    suspended: `A conta está suspensa na Pagar.me. Fale com ${cerimonialista}.`,
    blocked: `A conta está bloqueada na Pagar.me. Fale com ${cerimonialista}.`,
    inactive: `A conta está inativa na Pagar.me. Fale com ${cerimonialista}.`,
  };
  return t[status];
}

function mascaraData(v: string): string {
  const d = so(v).slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join("/");
}

export function ContaQueRecebe({
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
  const [abrirForm, setAbrirForm] = useState(false);
  const muda = (c: Partial<DadosDoRecebedor>) => setD((x) => ({ ...x, ...c }));

  async function buscarCep(cep: string) {
    if (so(cep).length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${so(cep)}/json/`);
      const j = (await r.json()) as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean };
      if (!j.erro) muda({ rua: j.logradouro ?? "", bairro: j.bairro ?? "", cidade: j.localidade ?? "", uf: j.uf ?? "" });
    } catch {
      /* sem o CEP, o endereço é digitado */
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
    const aba = window.open("about:blank", "_blank");
    iniciar(async () => {
      const r = await provaDeVida(eventoId);
      if ("error" in r) {
        aba?.close();
        setErro(r.error);
      } else if (aba) aba.location.href = r.url;
      else window.location.href = r.url;
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
    <div className="pn-lista-bloco">
      <h2 className="pn-lista-rotulo">A conta que recebe</h2>

      {recebedor ? (
        <>
          <div className="pn-lista-conta">
            <span className="pn-lista-conta-nome">{recebedor.titular ?? "Responsável"}</span>
            {recebedor.banco && <span className="pn-lista-nota">{recebedor.banco} · transferência todo dia 5</span>}
          </div>
          <p className={`pn-lista-estado${recebedor.status === "active" ? " ok" : ""}`}>
            <span aria-hidden="true" />
            {estadoEmPalavras(recebedor.status, cerimonialista)}
          </p>
          {recebedor.status !== "active" && (
            <div className="pn-lista-acoes">
              {souResponsavel && (recebedor.status === "registration" || recebedor.status === "affiliation") && (
                <button type="button" className="pn-lista-botao" disabled={enviando} onClick={abrirProvaDeVida}>
                  Fazer a prova de vida
                </button>
              )}
              <button type="button" className="pn-lista-botao claro" disabled={enviando} onClick={atualizar}>
                Ver se já foi aprovada
              </button>
            </div>
          )}
        </>
      ) : !souResponsavel ? (
        <p className="pn-lista-nota">Quem cadastra a conta que recebe os presentes é o casal.</p>
      ) : !abrirForm ? (
        <>
          <p className="pn-lista-nota">
            Cada presente cai direto nesta conta. A Pagar.me confere quem recebe; o eOrganizei não guarda CPF nem os
            dados da conta.
          </p>
          <div className="pn-lista-acoes">
            <button type="button" className="pn-lista-botao" onClick={() => setAbrirForm(true)}>
              Cadastrar a conta
            </button>
          </div>
        </>
      ) : (
        <div className="pn-lista-form">
          <fieldset>
            <legend>Quem recebe</legend>
            <Campo rotulo="Nome completo" valor={d.nome} muda={(v) => muda({ nome: v })} max={80} />
            <div className="pn-lista-dupla">
              <Campo rotulo="CPF" valor={d.cpf} muda={(v) => muda({ cpf: v })} modo="numeric" max={14} />
              <Campo
                rotulo="Nascimento"
                valor={d.nascimento}
                muda={(v) => muda({ nascimento: mascaraData(v) })}
                ph="dd/mm/aaaa"
                modo="numeric"
                max={10}
              />
            </div>
            <Campo rotulo="Nome da mãe" valor={d.nomeDaMae} muda={(v) => muda({ nomeDaMae: v })} max={80} />
            <div className="pn-lista-dupla">
              <Campo rotulo="Profissão" valor={d.profissao} muda={(v) => muda({ profissao: v })} max={60} />
              <Campo rotulo="Renda mensal (R$)" valor={d.rendaMensal} muda={(v) => muda({ rendaMensal: v })} modo="numeric" max={12} />
            </div>
            <Campo rotulo="Celular com DDD" valor={d.celular} muda={(v) => muda({ celular: v })} modo="tel" max={16} />
          </fieldset>

          <fieldset>
            <legend>Endereço</legend>
            <div className="pn-lista-dupla">
              <Campo
                rotulo="CEP"
                valor={d.cep}
                muda={(v) => {
                  muda({ cep: v });
                  void buscarCep(v);
                }}
                modo="numeric"
                max={9}
              />
              <Campo rotulo="Número" valor={d.numero} muda={(v) => muda({ numero: v })} max={10} />
            </div>
            <Campo rotulo="Rua" valor={d.rua} muda={(v) => muda({ rua: v })} max={120} />
            <div className="pn-lista-dupla">
              <Campo rotulo="Complemento" valor={d.complemento} muda={(v) => muda({ complemento: v })} max={40} />
              <Campo rotulo="Bairro" valor={d.bairro} muda={(v) => muda({ bairro: v })} max={60} />
            </div>
            <div className="pn-lista-dupla pn-lista-dupla-uf">
              <Campo rotulo="Cidade" valor={d.cidade} muda={(v) => muda({ cidade: v })} max={60} />
              <Campo rotulo="UF" valor={d.uf} muda={(v) => muda({ uf: v.toUpperCase() })} max={2} />
            </div>
          </fieldset>

          <fieldset>
            <legend>A conta (no nome e CPF de quem recebe)</legend>
            <label className="pn-lista-campo">
              <span>Banco</span>
              <select value={d.banco} onChange={(e) => muda({ banco: e.target.value })}>
                <option value="">Escolha o banco</option>
                {BANCOS.map(([c, n]) => (
                  <option key={c} value={c}>
                    {n} ({c})
                  </option>
                ))}
              </select>
            </label>
            <div className="pn-lista-dupla pn-lista-dupla-digito">
              <Campo rotulo="Agência" valor={d.agencia} muda={(v) => muda({ agencia: v })} modo="numeric" max={6} />
              <Campo rotulo="Dígito" valor={d.agenciaDigito} muda={(v) => muda({ agenciaDigito: v })} modo="numeric" max={1} />
            </div>
            <div className="pn-lista-dupla pn-lista-dupla-digito">
              <Campo rotulo="Conta" valor={d.conta} muda={(v) => muda({ conta: v })} modo="numeric" max={13} />
              <Campo rotulo="Dígito" valor={d.contaDigito} muda={(v) => muda({ contaDigito: v })} max={2} />
            </div>
            <div className="pn-lista-segmento" role="radiogroup" aria-label="Tipo de conta">
              {(
                [
                  ["checking", "Corrente"],
                  ["savings", "Poupança"],
                ] as const
              ).map(([v, t]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={d.tipoConta === v}
                  className={d.tipoConta === v ? "on" : ""}
                  onClick={() => muda({ tipoConta: v })}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="pn-lista-acoes">
            <button type="button" className="pn-lista-botao" disabled={enviando} onClick={enviar}>
              {enviando ? "Enviando…" : "Enviar para a Pagar.me"}
            </button>
            <button type="button" className="pn-lista-botao claro" disabled={enviando} onClick={() => setAbrirForm(false)}>
              Agora não
            </button>
          </div>
        </div>
      )}

      {aviso && (
        <p className="pn-lista-nota" role="status">
          {aviso}
        </p>
      )}
      {erro && (
        <p className="pn-lista-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}

function Campo({
  rotulo,
  valor,
  muda,
  max,
  ph,
  modo,
}: {
  rotulo: string;
  valor: string;
  muda: (v: string) => void;
  max: number;
  ph?: string;
  modo?: "numeric" | "tel";
}) {
  return (
    <label className="pn-lista-campo">
      <span>{rotulo}</span>
      <input
        value={valor}
        onChange={(e) => muda(e.target.value)}
        maxLength={max}
        placeholder={ph}
        inputMode={modo}
        autoComplete="off"
      />
    </label>
  );
}
