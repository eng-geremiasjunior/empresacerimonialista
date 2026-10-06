"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { contaDaFestaCriada } from "@/lib/marketing";

// O pixel manda o fato e a tela segue para o portal. A espera é curta e tem
// teto: com bloqueador de anúncio o fbq nunca aparece, e o casal não pode
// ficar parado aqui por causa disso (o servidor já contou a conversão).
export function ContaDaFestaCriada({
  tipo,
  idDoEvento,
}: {
  tipo: "casamento" | "debutante";
  idDoEvento: string;
}) {
  const router = useRouter();

  useEffect(() => {
    let foi = false;
    let seguiu = false;
    const seguir = () => {
      if (seguiu) return;
      seguiu = true;
      router.replace("/portal");
    };
    const inicio = Date.now();
    const espera = window.setInterval(() => {
      if (!foi && window.fbq) {
        foi = true;
        contaDaFestaCriada(tipo, idDoEvento);
        // o tempo de o pixel despachar antes de a página trocar
        window.setTimeout(seguir, 1200);
      }
      if (Date.now() - inicio > 2500) {
        window.clearInterval(espera);
        if (!foi) seguir();
      }
    }, 100);
    return () => window.clearInterval(espera);
  }, [tipo, idDoEvento, router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f1ea",
        color: "#1f2a26",
        fontFamily: "var(--font-ui, system-ui, sans-serif)",
        fontSize: 16,
      }}
    >
      Conta criada. Abrindo o portal…
    </main>
  );
}
