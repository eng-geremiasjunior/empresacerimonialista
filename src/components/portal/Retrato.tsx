// O único elemento pessoal do portal (handoff §7.2): foto da cliente ou
// do casal. 56px no hero do celular, 72px na lateral do computador —
// acima de 88px o portal começa a parecer rede social.
//
// Sem foto (nenhuma fonte no schema por ora): iniciais em Cormorant
// itálica, tamanho round(diâmetro × 0.36), cor secundária, sobre
// --cor-card. Círculo é uma das DUAS únicas exceções circulares do
// sistema (a outra é o marcador de 6px da linha do tempo).

function iniciaisDe(nome: string): string {
  const partes = nome
    .split(/\s*(?:&|\be\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length >= 2) {
    return `${partes[0].charAt(0)}&${partes[1].charAt(0)}`.toUpperCase();
  }
  return nome.trim().charAt(0).toUpperCase();
}

export function Retrato({
  nome,
  diametro,
}: {
  nome: string;
  diametro: 56 | 72;
}) {
  const iniciais = iniciaisDe(nome);
  return (
    <span
      aria-hidden
      style={{
        width: diametro,
        height: diametro,
        flex: `0 0 ${diametro}px`,
        borderRadius: "var(--raio-pill)",
        border: "var(--borda-fina)",
        background: "var(--cor-card)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--fonte-titulo)",
        fontStyle: "italic",
        fontSize: Math.round(diametro * 0.36),
        color: "var(--cor-texto-secundario)",
      }}
    >
      {iniciais}
    </span>
  );
}
