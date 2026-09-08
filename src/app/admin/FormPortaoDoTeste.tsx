"use client";

// O interruptor do teste grátis (154).
//
// Ligar e desligar o cadastro sem cartão é decisão comercial, e por isso
// mora aqui e não no código: o dono fecha a torneira às onze da noite
// sem publicar nada. O que ele muda governa só quem CHEGA — quem já
// está em teste corre os dias dela até o fim.
//
// Estado explícito em vez de botão que alterna: com um botão só, mudar
// o número de dias obrigaria a fechar e reabrir a porta. Aqui ele
// escolhe o estado, escreve os dias e salva as duas coisas de uma vez.

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { salvarPortaoDoTeste, type ResultadoAdmin } from "./actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-[#33343a] px-3.5 py-[7px] text-[12px] font-semibold text-white hover:bg-[#4d4e55] disabled:opacity-50"
    >
      {pending ? "…" : "Salvar"}
    </button>
  );
}

export function FormPortaoDoTeste({
  aberto,
  dias,
}: {
  aberto: boolean;
  dias: number;
}) {
  const [abertoAgora, setAbertoAgora] = useState(aberto);
  const [diasAgora, setDiasAgora] = useState(String(dias));
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(salvarPortaoDoTeste, {});

  return (
    <form action={agir} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="aberto" value={abertoAgora ? "1" : "0"} />

      <label className="flex items-center gap-2 text-[12px] text-[#57534e]">
        Cadastro grátis
        <select
          value={abertoAgora ? "1" : "0"}
          onChange={(e) => setAbertoAgora(e.target.value === "1")}
          className="rounded-md border border-[#e7e5e4] px-2 py-[6px] text-[12px]"
        >
          <option value="1">aberto</option>
          <option value="0">fechado</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-[12px] text-[#57534e]">
        Dias
        <input
          name="dias"
          inputMode="numeric"
          value={diasAgora}
          onChange={(e) => setDiasAgora(e.target.value.replace(/\D/g, "").slice(0, 2))}
          className="w-14 rounded-md border border-[#e7e5e4] px-2 py-[6px] text-[12px]"
        />
      </label>

      <Botao />

      <span className="text-[11px] text-[#a8a29e]">
        {abertoAgora
          ? "A página de vendas oferece criar conta sem cartão."
          : "Os botões da página de vendas voltam ao checkout."}{" "}
        Fechar não corta quem já está em teste.
      </span>

      {estado.error && <span className="text-[12px] text-[#8a3d3d]">{estado.error}</span>}
      {estado.ok && <span className="text-[12px] text-[#3f5c3f]">Salvo.</span>}
    </form>
  );
}
