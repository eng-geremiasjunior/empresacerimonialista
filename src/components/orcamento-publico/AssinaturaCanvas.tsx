"use client";

// Campo de assinatura à mão (dedo no celular, mouse no desktop).
//
// Dois cuidados que não são óbvios:
//  * o canvas é dimensionado em pixels FÍSICOS (devicePixelRatio) e
//    escalado no contexto — sem isso o traço sai serrilhado em tela
//    retina, que é justamente onde a maioria vai assinar;
//  * touchmove entra com passive:false e preventDefault, senão o gesto
//    de assinar rola a página junto e o traço sai picotado.

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

export function AssinaturaCanvas({
  rotulo,
  onChange,
}: {
  rotulo: string;
  onChange: (dataUrl: string | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const temTraco = useRef(false);
  const [vazio, setVazio] = useState(true);

  const preparar = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = box.width * dpr;
    canvas.height = box.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#3C2415";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    preparar();
    // Redimensionar zera o bitmap; reprepara e limpa, para não deixar
    // meia assinatura esticada na tela.
    const aoRedimensionar = () => {
      preparar();
      temTraco.current = false;
      setVazio(true);
      onChange(null);
    };
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, [preparar, onChange]);

  const posicao = (e: MouseEvent | TouchEvent) => {
    const canvas = ref.current!;
    const box = canvas.getBoundingClientRect();
    const p = "touches" in e ? e.touches[0] : e;
    return { x: p.clientX - box.left, y: p.clientY - box.top };
  };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const inicio = (e: MouseEvent | TouchEvent) => {
      desenhando.current = true;
      const { x, y } = posicao(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const mover = (e: MouseEvent | TouchEvent) => {
      if (!desenhando.current) return;
      if ("touches" in e) e.preventDefault(); // não rolar a página ao assinar
      const { x, y } = posicao(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!temTraco.current) {
        temTraco.current = true;
        setVazio(false);
      }
    };
    const fim = () => {
      if (!desenhando.current) return;
      desenhando.current = false;
      onChange(temTraco.current ? canvas.toDataURL("image/png") : null);
    };

    canvas.addEventListener("mousedown", inicio);
    canvas.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", fim);
    canvas.addEventListener("touchstart", inicio, { passive: true });
    canvas.addEventListener("touchmove", mover, { passive: false });
    canvas.addEventListener("touchend", fim);

    return () => {
      canvas.removeEventListener("mousedown", inicio);
      canvas.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", fim);
      canvas.removeEventListener("touchstart", inicio);
      canvas.removeEventListener("touchmove", mover);
      canvas.removeEventListener("touchend", fim);
    };
  }, [onChange]);

  function limpar() {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    temTraco.current = false;
    setVazio(true);
    onChange(null);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span
          className="text-[11px] font-semibold uppercase tracking-[1px]"
          style={{ color: "var(--cor-texto-terciario)" }}
        >
          {rotulo}
        </span>
        {!vazio && (
          <button
            type="button"
            onClick={limpar}
            className="flex items-center gap-1 text-[11px]"
            style={{ color: "var(--cor-texto-terciario)" }}
          >
            <Eraser size={12} /> Limpar
          </button>
        )}
      </div>
      <div
        className="relative rounded-lg border"
        style={{
          borderColor: "var(--cor-borda)",
          background: "#FFFFFF",
        }}
      >
        <canvas
          ref={ref}
          className="block h-[110px] w-full cursor-crosshair touch-none rounded-lg"
        />
        {vazio && (
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs"
            style={{ color: "var(--cor-texto-terciario)" }}
          >
            Assine aqui com o dedo ou o mouse
          </span>
        )}
      </div>
    </div>
  );
}
