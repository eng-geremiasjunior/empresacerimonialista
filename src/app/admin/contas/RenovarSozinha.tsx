"use client";

// A lista do portal se renova sozinha (o "ao vivo" e o uso andam): a cada
// 2 min, só com a aba à vista (era 30 s; CPU da Vercel, 14/10/2026).

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RenovarSozinha({ cadaMs = 120_000 }: { cadaMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, cadaMs);
    return () => window.clearInterval(t);
  }, [router, cadaMs]);
  return null;
}
