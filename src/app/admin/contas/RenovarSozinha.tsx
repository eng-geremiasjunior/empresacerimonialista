"use client";

// A lista do portal se renova sozinha (o "ao vivo" e o uso andam): a cada
// 30 s, só com a aba à vista — a mesma batida do ao vivo da cerimonialista.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RenovarSozinha({ cadaMs = 30_000 }: { cadaMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, cadaMs);
    return () => window.clearInterval(t);
  }, [router, cadaMs]);
  return null;
}
