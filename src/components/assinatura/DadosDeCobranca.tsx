"use client";

// Os dados de quem paga.
//
// Eles foram descobertos um a um, no susto: primeiro o gateway recusou
// por falta de documento, depois por falta de telefone. Em vez de
// esperar o próximo campo obrigatório aparecer numa cobrança recusada,
// aqui se pede tudo de uma vez — e o endereço, que o antifraude usa e
// que a nota fiscal vai querer um dia, vem junto.
//
// Nada disto fica no nosso banco: vai para o gateway e acaba. Guardar
// documento e endereço de alguém sem precisar é passivo, não recurso.

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

const campo =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";
const rotulo = "mb-1 block text-xs font-medium text-stone-600";

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
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
        Dados de cobrança
      </p>

      <div>
        <label className={rotulo}>Nome ou razão social de quem paga</label>
        <input
          className={campo}
          disabled={desabilitado}
          value={valor.nome}
          onChange={(e) => set({ nome: e.target.value })}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className={rotulo}>E-mail da cobrança</label>
          <input
            className={campo}
            type="email"
            inputMode="email"
            disabled={desabilitado}
            value={valor.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </div>
        <div>
          <label className={rotulo}>Telefone com DDD</label>
          <input
            className={campo}
            inputMode="numeric"
            placeholder="(33) 99999-9999"
            disabled={desabilitado}
            value={valor.telefone}
            onChange={(e) => set({ telefone: mascararTelefone(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className={rotulo}>CPF ou CNPJ</label>
          <input
            className={campo}
            inputMode="numeric"
            placeholder="000.000.000-00"
            disabled={desabilitado}
            value={valor.documento}
            onChange={(e) => set({ documento: mascararDocumento(e.target.value) })}
          />
        </div>
        <div>
          <label className={rotulo}>
            CEP {buscandoCep && <span className="text-stone-400">buscando…</span>}
          </label>
          <input
            className={campo}
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
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
        <div>
          <label className={rotulo}>Rua</label>
          <input
            className={campo}
            disabled={desabilitado}
            value={valor.rua}
            onChange={(e) => set({ rua: e.target.value })}
          />
        </div>
        <div>
          <label className={rotulo}>Número</label>
          <input
            className={campo}
            disabled={desabilitado}
            value={valor.numero}
            onChange={(e) => set({ numero: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className={rotulo}>Complemento (opcional)</label>
          <input
            className={campo}
            disabled={desabilitado}
            value={valor.complemento}
            onChange={(e) => set({ complemento: e.target.value })}
          />
        </div>
        <div>
          <label className={rotulo}>Bairro</label>
          <input
            className={campo}
            disabled={desabilitado}
            value={valor.bairro}
            onChange={(e) => set({ bairro: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
        <div>
          <label className={rotulo}>Cidade</label>
          <input
            className={campo}
            disabled={desabilitado}
            value={valor.cidade}
            onChange={(e) => set({ cidade: e.target.value })}
          />
        </div>
        <div>
          <label className={rotulo}>Estado</label>
          <select
            className={campo}
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
    </div>
  );
}
