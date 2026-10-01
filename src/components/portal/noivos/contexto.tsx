"use client";

// O que toda tela do portal dos noivos precisa sem pedir de novo ao
// servidor: o aviso (toast) e quem é a casa. Um provedor só, na casca.

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Aviso = { msg: string; erro: boolean; k: number };

export type CasaDoPortal = {
  eventoId: string;
  /** /portal/<id> */
  base: string;
  /** a cerimonialista (primeiro nome ou empresa) — null na conta de família */
  cerimonialista: string | null;
  /** o evento é da conta de família (187): sem cerimonialista */
  daFamilia: boolean;
};

type Valor = CasaDoPortal & {
  avisar: (msg: string, erro?: boolean) => void;
};

const Ctx = createContext<Valor | null>(null);

export function ProvedorNoivos({ casa, children }: { casa: CasaDoPortal; children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisar = useCallback((msg: string, erro = false) => {
    if (timer.current) clearTimeout(timer.current);
    setAviso({ msg, erro, k: Date.now() });
    timer.current = setTimeout(() => setAviso(null), 2600);
  }, []);
  return (
    <Ctx.Provider value={{ ...casa, avisar }}>
      {children}
      {aviso && (
        <div key={aviso.k} className={`pn-toast${aviso.erro ? " erro" : ""}`} role={aviso.erro ? "alert" : "status"}>
          <span className="pn-ic">{aviso.erro ? "info" : "check_circle"}</span>
          {aviso.msg}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function usePortalNoivos(): Valor {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortalNoivos fora da casca do portal dos noivos");
  return v;
}

/**
 * "com Geremias" / "com vocês". O desenho escreve "com o Geremias"; sem
 * saber o gênero de quem cuida, o nome vai sem artigo (adaptação dita a
 * ele). Na conta de família não há cerimonialista: tudo é "com vocês".
 */
export function comQuem(cerimonialista: string | null, daEquipe: boolean): string {
  if (!daEquipe || !cerimonialista) return "com vocês";
  return `com ${cerimonialista}`;
}
