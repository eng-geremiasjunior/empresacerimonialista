/* eslint-disable @next/next/no-img-element */

// A logo é DA CERIMONIALISTA, carregada por ela no sistema, e aparece só
// dentro do portal (a tela de login é neutra).
//
// Sem arquivo, o certo é o espaço reservado — nunca desenhar uma marca no
// lugar dela.

export function MarcaCerimonialista({
  nome,
  logoUrl,
}: {
  nome: string | null;
  logoUrl: string | null;
}) {
  return (
    <div
      style={{
        padding: "var(--esp-4) var(--portal-padding)",
        borderBottom: "var(--borda-fina)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: 58,
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={nome ?? "Cerimonialista"}
          style={{ height: 30, width: "auto" }}
        />
      ) : (
        <span
          style={{
            width: 132,
            height: 30,
            border: "var(--borda-fina)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--cor-texto-desativado)",
          }}
        >
          logo da cerimonialista
        </span>
      )}
    </div>
  );
}
