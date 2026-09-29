// Um bloco do "O que você encontra aqui": foto de 84 px à esquerda, título
// e uma frase. O mesmo nas boas-vindas e no painel de quem já tem evento.

import Image from "next/image";
import Link from "next/link";

export function CartaoDeArea({
  href,
  titulo,
  texto,
  foto,
  posicao = "50% 50%",
  externa = false,
}: {
  href: string;
  titulo: string;
  texto: string;
  foto: string;
  posicao?: string;
  /** capa do Storage: <img>, fora do otimizador do Next */
  externa?: boolean;
}) {
  return (
    <Link
      href={href}
      className="pa-cartao"
      style={{ display: "flex", minHeight: 84, background: "#fff", border: "1px solid #E6E0D8", borderRadius: 12, overflow: "hidden", color: "#221E1B", transition: "border-color 140ms ease" }}
    >
      <span style={{ width: 84, flex: "none", position: "relative", background: "#F2EEE9" }}>
        {externa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: posicao }} />
        ) : (
          <Image src={foto} alt="" fill sizes="84px" style={{ objectFit: "cover", objectPosition: posicao }} />
        )}
      </span>
      <span style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-title), Inter, sans-serif", fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {titulo}
        </span>
        <span style={{ fontSize: 12, lineHeight: 1.4, color: "#57534E" }}>{texto}</span>
      </span>
    </Link>
  );
}
