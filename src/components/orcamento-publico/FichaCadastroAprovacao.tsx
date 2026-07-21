"use client";

// Ficha de cadastro exibida logo após a aprovação, na mesma tela.
// CEP com autocomplete via lib/cep.ts (mesma usada no cadastro de cliente).

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buscarCep } from "@/lib/cep";

const inputClass =
  "w-full rounded-xl border border-[#ECEBF3] bg-white px-3.5 py-2.5 text-[15px] text-[#17162A] focus:border-[#6C5DD3] focus:outline-none";
const labelClass = "mb-1.5 block text-sm font-medium text-[#3D3A52]";

export function FichaCadastroAprovacao({
  hash,
  nomeInicial,
  onConcluido,
}: {
  hash: string;
  nomeInicial: string;
  onConcluido: () => void;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoSairDoCep(valor: string) {
    const dig = valor.replace(/\D/g, "");
    if (dig.length !== 8) return;
    setBuscandoCep(true);
    const res = await buscarCep(dig);
    setBuscandoCep(false);
    if (res) {
      setEndereco(res.endereco);
      setCidade(res.cidade);
    }
  }

  async function enviar() {
    setErro(null);
    if (!nome.trim() || !telefone.trim()) {
      setErro("Nome e telefone são obrigatórios.");
      return;
    }
    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc(
      "preencher_ficha_orcamento_aprovado",
      {
        p_hash: hash,
        p_nome: nome,
        p_telefone: telefone,
        p_whatsapp: whatsapp || null,
        p_email: email || null,
        p_instagram: instagram || null,
        p_cep: cep || null,
        p_endereco: endereco || null,
        p_cidade: cidade || null,
      }
    );
    setEnviando(false);

    const falha = error?.message ?? (data as { error?: string })?.error;
    if (falha) {
      setErro("Não foi possível enviar seus dados. Tente novamente.");
      return;
    }
    onConcluido();
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#ECEBF3] bg-white p-6">
      <h2 className="text-lg font-bold text-[#17162A]">
        Para finalizarmos, complete seus dados
      </h2>
      <p className="mt-1 text-sm text-[#6B6884]">
        Assim conseguimos preparar tudo para o seu evento.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Nome completo *</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Telefone *</label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(33) 90000-0000"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            WhatsApp{" "}
            <span className="font-normal text-[#9A97AE]">(se diferente)</span>
          </label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            Instagram{" "}
            <span className="font-normal text-[#9A97AE]">(opcional)</span>
          </label>
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@seuperfil"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            CEP{" "}
            {buscandoCep && (
              <span className="font-normal text-[#9A97AE]">buscando…</span>
            )}
          </label>
          <input
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            onBlur={(e) => aoSairDoCep(e.target.value)}
            placeholder="00000-000"
            inputMode="numeric"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Cidade</label>
          <input
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Endereço</label>
          <input
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

      <button
        onClick={enviar}
        disabled={enviando}
        className="mt-5 w-full rounded-xl bg-[#17162A] py-3 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {enviando ? "Enviando…" : "Enviar dados"}
      </button>
    </div>
  );
}
