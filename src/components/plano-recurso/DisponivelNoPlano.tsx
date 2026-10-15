// O aviso único de recurso fora do plano (09/10/2026): o mesmo em toda
// tela travada, no molde do da impressão. Diz o que é, a partir de qual
// plano, e leva à assinatura.

import Link from "next/link";
import { NOME_DO_PLANO, NOME_DO_RECURSO, PLANO_MINIMO, type Recurso } from "@/lib/recursos-do-plano";

export function DisponivelNoPlano({ recurso }: { recurso: Recurso }) {
  const plano = PLANO_MINIMO[recurso];
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{NOME_DO_RECURSO[recurso]}</p>
      <h1 className="mt-2 text-xl font-semibold text-stone-900">
        {plano === "essencial" ? "Disponível nos planos pagos" : `Disponível no plano ${NOME_DO_PLANO[plano]}`}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        {plano === "essencial"
          ? "O plano gratuito é para conhecer o sistema. Assine um plano para usar este recurso."
          : `Este recurso faz parte do plano ${NOME_DO_PLANO[plano]}${plano === "profissional" ? " e do Master" : ""}.`}
      </p>
      <Link
        href="/assinatura"
        className="mt-5 inline-block rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800"
      >
        Ver os planos
      </Link>
    </div>
  );
}
