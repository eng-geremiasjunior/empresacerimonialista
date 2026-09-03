"use client";

// A barra inferior do celular: até cinco destinos, ícone + rótulo de 11px.
// O ativo é dito pela cor (champagne), sem fundo e sem marcador — o
// mesmo vocabulário discreto da sidebar.
//
// 52px de alvo e 20px de respiro embaixo, para a área segura do
// aparelho não comer o último item.

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icones from "./icones";
import { abasCelularDoTipo } from "./destinos";

export function NavPortal({ eventoId, tipo }: { eventoId: string; tipo: string }) {
  const pathname = usePathname();
  const base = `/portal/${eventoId}`;

  return (
    <nav className="portal-abas" aria-label="Navegação do portal">
      {abasCelularDoTipo(tipo).map((d) => {
        const href = d.seg ? `${base}/${d.seg}` : base;
        const ativa =
          d.seg === ""
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(`${base}/${d.seg}`);
        const Ico = (Icones as unknown as Record<string, typeof Icones.Bell>)[d.icone];
        return (
          <Link key={d.rotulo} href={href} className="portal-aba" data-ativa={ativa}>
            {Ico && <Ico size={Icones.TAMANHO} strokeWidth={Icones.TRACO} />}
            {d.rotuloCurto ?? d.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
