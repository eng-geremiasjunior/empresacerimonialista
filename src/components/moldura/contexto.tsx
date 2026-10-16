"use client";

// O que as telas de dentro contam à moldura: os fatos da barra de status
// ("faltam 26 dias · 12 horários") e as vistas (Trabalho · Folha · Família).
// A moldura é a casca de todo o app; as telas não a enxergam de outro jeito.

import { createContext, useContext, useEffect, useState } from "react";

export type VistaDaBarra = { label: string; href: string; ativa: boolean; novaAba?: boolean };

type Valor = {
  fatos: string | null;
  setFatos: (f: string | null) => void;
  vistas: VistaDaBarra[] | null;
  setVistas: (v: VistaDaBarra[] | null) => void;
};

const Contexto = createContext<Valor | null>(null);

export function ProvedorDaMoldura({ children }: { children: React.ReactNode }) {
  const [fatos, setFatos] = useState<string | null>(null);
  const [vistas, setVistas] = useState<VistaDaBarra[] | null>(null);
  return (
    <Contexto.Provider value={{ fatos, setFatos, vistas, setVistas }}>{children}</Contexto.Provider>
  );
}

export function useMoldura(): Valor | null {
  return useContext(Contexto);
}

/** Uma tela diz os fatos dela; ao sair, a barra volta ao padrão. */
export function FatosDaBarra({ texto }: { texto: string | null }) {
  const m = useMoldura();
  const setFatos = m?.setFatos;
  useEffect(() => {
    if (!setFatos) return;
    setFatos(texto);
    return () => setFatos(null);
  }, [setFatos, texto]);
  return null;
}

/** As vistas da tela atual na barra de status (computador). */
export function VistasDaBarra({ vistas }: { vistas: VistaDaBarra[] }) {
  const m = useMoldura();
  const setVistas = m?.setVistas;
  const chave = JSON.stringify(vistas);
  useEffect(() => {
    if (!setVistas) return;
    setVistas(JSON.parse(chave) as VistaDaBarra[]);
    return () => setVistas(null);
  }, [setVistas, chave]);
  return null;
}
