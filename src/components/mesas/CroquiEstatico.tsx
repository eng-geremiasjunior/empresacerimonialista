"use client";

// O croqui em modo leitura para páginas servidor (a folha de montagem).
// Existe porque função não cruza a fronteira server→client: os no-ops
// precisam nascer DO LADO client.

import { Croqui } from "@/components/mesas/Croqui";
import type { Elemento, Mesa } from "@/lib/croqui-core";

export function CroquiEstatico({
  larguraCm,
  alturaCm,
  mesas,
  elementos,
  rotuloOcupacao,
}: {
  larguraCm: number;
  alturaCm: number;
  mesas: Mesa[];
  elementos: Elemento[];
  /** mesaId → texto sob o rótulo (ex.: "8 lug.") */
  rotuloOcupacao: [string, string][];
}) {
  return (
    <Croqui
      larguraCm={larguraCm}
      alturaCm={alturaCm}
      mesas={mesas}
      elementos={elementos}
      ocupacao={new Map(rotuloOcupacao)}
      comProblema={new Set()}
      sobrepostasIds={new Set()}
      saidaObstruidaIds={new Set()}
      selecionada={null}
      editavel={false}
      aoSelecionar={() => undefined}
      aoMover={() => undefined}
      aoSoltarConvidado={() => undefined}
    />
  );
}
