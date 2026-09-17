"use client";

// A nota interna do dono sobre uma conta. Só acréscimo: nota errada se
// corrige com outra nota (o histórico é o valor dela).

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { salvarNota, type ResultadoAdmin } from "../../actions";

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-8 self-start rounded-md bg-[#33343a] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#4d4e55] disabled:opacity-50"
    >
      {pending ? "…" : "Guardar nota"}
    </button>
  );
}

export function NotaDaConta({ empresaId }: { empresaId: string }) {
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(salvarNota, {});
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (estado.ok) {
      form.current?.reset();
      router.refresh();
    }
  }, [estado, router]);

  return (
    <form ref={form} action={agir} className="flex flex-col gap-2">
      <input type="hidden" name="empresa_id" value={empresaId} />
      <textarea
        name="texto"
        required
        maxLength={2000}
        rows={3}
        placeholder="O que você quer lembrar sobre esta conta"
        className="w-full rounded-md border border-[#d3d3cf] bg-white px-3 py-2 text-[13px] text-[#1c1d21]"
      />
      <Enviar />
      {estado.error && <p className="text-[12px] text-red-700">{estado.error}</p>}
    </form>
  );
}
