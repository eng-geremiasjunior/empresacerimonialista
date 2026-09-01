"use client";

// Os dados de quem paga.
//
// Foram descobertos um a um, no susto: primeiro o gateway recusou por
// falta de documento, depois por falta de telefone, depois pelo endereço
// de cobrança do cartão. Aqui se pede tudo de uma vez.
//
// Nada disto fica no nosso banco: vai para o gateway e acaba. Guardar
// documento e endereço de alguém sem precisar é passivo, não recurso.
//
// Visual: usa as classes .subx-* definidas pela AssinaturaTela (este
// componente só é renderizado dentro dela) — labels 12.5px Instrument,
// inputs 44px raio 10, dado técnico (telefone, documento, CEP) em mono.

import { useState } from "react";
import { mascararDocumento } from "@/lib/documento";
import { mascararCep, mascararTelefone, UFS } from "@/lib/contato";

export type Cobranca = {
  nome: string;
  email: string;
  documento: string;
  telefone: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export const COBRANCA_VAZIA: Cobranca = {
  nome: "",
  email: "",
  documento: "",
  telefone: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

const F_UI = "var(--font-ui), 'Instrument Sans', sans-serif";
const label: React.CSSProperties = { font: `500 12.5px ${F_UI}`, color: "#5B6167" };
const grupo: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };

export function DadosDeCobranca({
  valor,
  onChange,
  desabilitado,
}: {
  valor: Cobranca;
  onChange: (c: Cobranca) => void;
  desabilitado?: boolean;
}) {
  const [buscandoCep, setBuscandoCep] = useState(false);
  const set = (p: Partial<Cobranca>) => onChange({ ...valor, ...p });

  /**
   * O CEP preenche o resto. Se o serviço não responder, ela digita à mão
   * — a busca é conveniência, nunca requisito.
   */
  async function buscarCep(cep: string) {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = (await r.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (!j.erro) {
        set({
          cep: mascararCep(d),
          rua: j.logradouro || valor.rua,
          bairro: j.bairro || valor.bairro,
          cidade: j.localidade || valor.cidade,
          estado: (j.uf || valor.estado).toUpperCase(),
        });
      }
    } catch {
      // sem internet ou serviço fora: segue o preenchimento manual
    } finally {
      setBuscandoCep(false);
    }
  }

  return (
    <div className="subx-form-grid" style={{ marginTop: 14 }}>
      <div style={{ ...grupo, gridColumn: "1 / -1" }}>
        <label style={label}>Nome ou razão social de quem paga</label>
        <input
          className="subx-in"
          disabled={desabilitado}
          value={valor.nome}
          onChange={(e) => set({ nome: e.target.value })}
        />
      </div>

      <div style={grupo}>
        <label style={label}>E-mail da cobrança</label>
        <input
          className="subx-in"
          type="email"
          inputMode="email"
          disabled={desabilitado}
          value={valor.email}
          onChange={(e) => set({ email: e.target.value })}
        />
      </div>
      <div style={grupo}>
        <label style={label}>Telefone com DDD</label>
        <input
          className="subx-in subx-in--mono"
          inputMode="numeric"
          placeholder="(33) 99999-9999"
          disabled={desabilitado}
          value={valor.telefone}
          onChange={(e) => set({ telefone: mascararTelefone(e.target.value) })}
        />
      </div>

      <div style={grupo}>
        <label style={label}>CPF ou CNPJ</label>
        <input
          className="subx-in subx-in--mono"
          inputMode="numeric"
          placeholder="000.000.000-00"
          disabled={desabilitado}
          value={valor.documento}
          onChange={(e) => set({ documento: mascararDocumento(e.target.value) })}
        />
      </div>
      <div style={grupo}>
        <label style={label}>
          CEP{" "}
          {buscandoCep && (
            <span style={{ color: "#A9AEB3", fontWeight: 400 }}>buscando…</span>
          )}
        </label>
        <input
          className="subx-in subx-in--mono"
          inputMode="numeric"
          placeholder="00000-000"
          disabled={desabilitado}
          value={valor.cep}
          onChange={(e) => {
            const v = mascararCep(e.target.value);
            set({ cep: v });
            if (v.replace(/\D/g, "").length === 8) void buscarCep(v);
          }}
        />
      </div>

      <div style={grupo}>
        <label style={label}>Rua</label>
        <input
          className="subx-in"
          disabled={desabilitado}
          value={valor.rua}
          onChange={(e) => set({ rua: e.target.value })}
        />
      </div>
      <div style={grupo}>
        <label style={label}>Número</label>
        <input
          className="subx-in subx-in--mono"
          disabled={desabilitado}
          value={valor.numero}
          onChange={(e) => set({ numero: e.target.value })}
        />
      </div>

      <div style={grupo}>
        <label style={label}>Complemento (opcional)</label>
        <input
          className="subx-in"
          disabled={desabilitado}
          value={valor.complemento}
          onChange={(e) => set({ complemento: e.target.value })}
        />
      </div>
      <div style={grupo}>
        <label style={label}>Bairro</label>
        <input
          className="subx-in"
          disabled={desabilitado}
          value={valor.bairro}
          onChange={(e) => set({ bairro: e.target.value })}
        />
      </div>

      <div style={grupo}>
        <label style={label}>Cidade</label>
        <input
          className="subx-in"
          disabled={desabilitado}
          value={valor.cidade}
          onChange={(e) => set({ cidade: e.target.value })}
        />
      </div>
      <div style={grupo}>
        <label style={label}>Estado</label>
        <select
          className="subx-in"
          disabled={desabilitado}
          value={valor.estado}
          onChange={(e) => set({ estado: e.target.value })}
        >
          <option value="">—</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
