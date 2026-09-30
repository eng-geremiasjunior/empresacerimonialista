import Link from "next/link";

// No início do portal, só no evento da conta de família (187/188): a
// porta para convidar a cerimonialista. Some sozinha depois que ela
// aceita (o evento sai da conta de família). Provisória até o desenho
// do portal novo da noiva.
export function ChamadaDaCerimonialista({
  eventoId,
  pedidoDe,
}: {
  eventoId: string;
  /** quem pediu para organizar (o nome do negócio), esperando resposta */
  pedidoDe?: string | null;
}) {
  return (
    <div className="portal-tela" style={{ paddingBottom: 0 }}>
      <Link
        href={`/portal/${eventoId}/cerimonialista`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--esp-4)",
          padding: "14px 18px",
          border: "1px solid var(--cor-borda)",
          borderRadius: "var(--raio-card)",
          background: "var(--cor-card)",
          color: "var(--cor-texto)",
          fontSize: "var(--ts-desc)",
          textDecoration: "none",
        }}
      >
        <span>
          {pedidoDe
            ? `${pedidoDe} pediu para organizar a festa com você.`
            : "Tem cerimonialista? Convide para organizar com você."}
        </span>
        <span style={{ color: "var(--cor-ouro-texto)", whiteSpace: "nowrap" }}>
          {pedidoDe ? "Responder →" : "Convidar →"}
        </span>
      </Link>
    </div>
  );
}
