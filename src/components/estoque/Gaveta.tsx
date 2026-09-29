"use client";

// A gaveta à direita das telas do Estoque: fecha no Esc, no fundo e no X.

import { useEffect } from "react";
import { X } from "lucide-react";

export function Gaveta({ children, onFechar, larga }: { children: React.ReactNode; onFechar: () => void; larga?: boolean }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFechar]);
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <button aria-label="Fechar" onClick={onFechar} className="absolute inset-0" style={{ background: "rgba(20,15,12,.28)" }} />
      <div
        className="relative flex h-full w-full flex-col overflow-y-auto"
        style={{ maxWidth: larga ? 640 : 460, background: "var(--marfim, #fff)", boxShadow: "-20px 0 50px -30px rgba(0,0,0,.5)", padding: "20px 20px 32px" }}
      >
        <button onClick={onFechar} aria-label="Fechar" className="absolute right-4 top-4" style={{ color: "var(--cinza)" }}>
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
