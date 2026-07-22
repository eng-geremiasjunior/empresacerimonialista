// Casca comum das seções da proposta pública: âncora, espaçamento e
// título serifado. Evita repetir os mesmos valores em nove componentes.

export function Secao({
  id,
  titulo,
  subtitulo,
  children,
}: {
  id: string;
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 pt-12 sm:pt-14">
      <h2
        className="text-[22px] font-medium sm:text-[26px] [font-family:var(--font-playfair)]"
        style={{ color: "#2E2621" }}
      >
        {titulo}
      </h2>
      {subtitulo && (
        <p className="mt-1 text-[12.5px] font-semibold" style={{ color: "#A85950" }}>
          {subtitulo}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

// Card branco padrão (borda e raio dos tokens).
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[14px] border bg-white ${className}`}
      style={{ borderColor: "#ECE0DA" }}
    >
      {children}
    </div>
  );
}
